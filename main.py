import os
import threading
import time
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from sqlalchemy.orm import Session

from app import models, services
from app.database import SessionLocal, engine, Base
from app.models import ApplicationStatus as S
from app.schemas import ApplicationCreate, ClarificationRequest, RecommendationRequest
from seed import seed_products

BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIST = Path(os.getenv("FRONTEND_DIST", BASE_DIR / "frontend" / "credit-cabinet" / "dist"))
WORKER_INTERVAL = float(os.getenv("WORKER_INTERVAL_SECONDS", "2"))


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def processing_worker():
    auto_statuses = [S.SUBMITTED, S.DATA_CHECK, S.EXTERNAL_CHECK, S.SCORING, S.DECISION]
    while True:
        db = SessionLocal()
        try:
            applications = db.query(models.Application).filter(models.Application.status.in_(auto_statuses)).all()
            for application in applications:
                services.advance_application(db, application)
            db.commit()
        except Exception as exc:
            db.rollback()
            print("Ошибка конвейера:", exc, flush=True)
        finally:
            db.close()
        time.sleep(WORKER_INTERVAL)


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    if os.getenv("SEED_PRODUCTS", "true").lower() == "true":
        seed_products()
    if os.getenv("ENABLE_WORKER", "true").lower() == "true":
        threading.Thread(target=processing_worker, daemon=True, name="credit-conveyor").start()
    yield


app = FastAPI(
    title="Умный кредитный кабинет предпринимателя",
    description="Сквозной прототип персонального подбора и обработки кредитной заявки для МСБ.",
    version="1.0.0",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:7100,http://127.0.0.1:7100").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


def product_dict(product: models.Product, match_score=None, reason=None):
    result = {
        "id": product.id,
        "name": product.name,
        "bank": product.bank,
        "min_amount": product.min_amount,
        "max_amount": product.max_amount,
        "min_term_months": product.min_term_months,
        "max_term_months": product.max_term_months,
        "base_rate": product.base_rate,
        "description": product.description,
        "tags": [tag for tag in product.tags.split(",") if tag],
        "approval": product.approval,
        "preapproved": product.approval >= 85,
    }
    if match_score is not None:
        result.update(match_score=match_score, reason=reason)
    return result


def application_dict(application: models.Application, db: Session):
    history = (
        db.query(models.StatusHistory)
        .filter(models.StatusHistory.application_id == application.id)
        .order_by(models.StatusHistory.changed_at, models.StatusHistory.id)
        .all()
    )
    return {
        "id": application.id,
        "status": application.status.value,
        "amount": application.amount,
        "term_months": application.term_months,
        "purpose": application.purpose,
        "score": application.score,
        "offer_rate": application.offer_rate,
        "decision_comment": application.decision_comment,
        "created_at": application.created_at.isoformat(),
        "company": {"name": application.company.name, "inn": application.company.inn},
        "product": product_dict(application.product),
        "history": [
            {
                "from": item.from_status.value if item.from_status else None,
                "to": item.to_status.value,
                "at": item.changed_at.isoformat(),
                "comment": item.comment,
            }
            for item in history
        ],
    }


@app.get("/health", tags=["system"])
def health(db=Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"status": "ok", "service": "credit-conveyor"}


@app.get("/products", tags=["catalog"])
def get_products(db=Depends(get_db)):
    return [product_dict(p) for p in db.query(models.Product).order_by(models.Product.id).all()]


@app.post("/recommendations", tags=["catalog"])
def get_recommendations(payload: RecommendationRequest, db=Depends(get_db)):
    products = db.query(models.Product).all()
    ranked = services.recommend_products(
        products, payload.amount, payload.term_months, payload.purpose, payload.revenue
    )
    return {
        "items": [product_dict(item["product"], item["match_score"], item["reason"]) for item in ranked],
        "message": "Рекомендации рассчитаны локально по прозрачным правилам" if ranked else "Нет продуктов с такими лимитами. Измените сумму или срок.",
    }


@app.get("/applications", tags=["applications"])
def list_applications(inn: str = Query(pattern=r"^\d{10}$|^\d{12}$"), db=Depends(get_db)):
    applications = (
        db.query(models.Application)
        .join(models.Company)
        .filter(models.Company.inn == inn)
        .order_by(models.Application.created_at.desc(), models.Application.id.desc())
        .all()
    )
    return [application_dict(application, db) for application in applications]


@app.post("/applications", status_code=201, tags=["applications"])
def create_application(payload: ApplicationCreate, db=Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == payload.product_id).first()
    if product is None:
        raise HTTPException(status_code=404, detail=f"Продукт с id={payload.product_id} не найден")
    company = db.query(models.Company).filter(models.Company.inn == payload.inn).first()
    if company is None:
        company = models.Company(name=payload.company_name, inn=payload.inn, revenue=payload.revenue, age_years=payload.age_years)
        db.add(company)
        db.flush()
    else:
        company.name = payload.company_name
        company.revenue = payload.revenue
        company.age_years = payload.age_years
    application = models.Application(
        company_id=company.id,
        product_id=product.id,
        amount=payload.amount,
        term_months=payload.term_months,
        purpose=payload.purpose,
        status=S.SUBMITTED,
    )
    db.add(application)
    db.flush()
    services.move_to(db, application, S.SUBMITTED, "Заявка создана клиентом")
    db.commit()
    return application_dict(application, db)


@app.get("/applications/{application_id}", tags=["applications"])
def get_application(application_id: int, db=Depends(get_db)):
    application = db.get(models.Application, application_id)
    if application is None:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    return application_dict(application, db)


@app.post("/applications/{application_id}/sign", tags=["applications"])
def sign_application(application_id: int, db=Depends(get_db)):
    application = db.get(models.Application, application_id)
    if application is None:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    if application.status != S.SIGNING:
        raise HTTPException(status_code=409, detail=f"Подписание недоступно в статусе '{application.status.value}'")
    services.move_to(db, application, S.ISSUED, "Договор подписан клиентом, выдача средств смоделирована")
    db.commit()
    return application_dict(application, db)


@app.post("/applications/{application_id}/clarify", tags=["applications"])
def clarify_application(application_id: int, payload: ClarificationRequest, db=Depends(get_db)):
    application = db.get(models.Application, application_id)
    if application is None:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    if application.status != S.CLARIFICATION:
        raise HTTPException(status_code=409, detail=f"Уточнение недоступно в статусе '{application.status.value}'")
    services.move_to(db, application, S.EXTERNAL_CHECK, f"Клиент предоставил уточнения: {payload.comment}")
    db.commit()
    return application_dict(application, db)


# В production backend отдаёт собранный SPA, поэтому весь продукт доступен на одном порту.
if FRONTEND_DIST.is_dir():
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=False)
