import threading
import time

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from app.database import engine, Base, SessionLocal
from app import models, services  # импорт models обязателен ДО create_all
from app.models import ApplicationStatus as S
from app.schemas import ApplicationCreate, ClarificationRequest

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Кредитный конвейер для МСБ")


# Middleware, которая добавляет charset=utf-8 ко всем JSON-ответам.
class ForceUTF8Middleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        if response.headers.get("content-type", "").startswith("application/json"):
            response.headers["content-type"] = "application/json; charset=utf-8"
        return response


app.add_middleware(ForceUTF8Middleware)

# Разрешаем фронтенду (любому origin на время разработки) обращаться к API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# Функция-помощник: даёт endpoint'у готовую сессию и гарантирует,
# что она закроется после ответа — даже если была ошибка.
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ============================================================
# ФОНОВЫЙ КОНВЕЙЕР
# daemon=True: поток умрёт вместе с сервером, не мешая остановке.
# Каждые 4 секунды подхватывает заявки в "автоматических" статусах
# и продвигает каждую на один этап — так видно движение заявки.
# ============================================================

def processing_worker():
    auto_statuses = [S.SUBMITTED, S.DATA_CHECK, S.EXTERNAL_CHECK, S.SCORING, S.DECISION]
    while True:
        db = SessionLocal()
        try:
            applications = (
                db.query(models.Application)
                .filter(models.Application.status.in_(auto_statuses))
                .all()
            )
            for application in applications:
                services.advance_application(db, application)
            db.commit()
        except Exception as exc:
            print("Ошибка конвейера:", exc)
        finally:
            db.close()
        time.sleep(4)


threading.Thread(target=processing_worker, daemon=True).start()


@app.get("/health")
def health():
    return {"status": "ok", "service": "credit-conveyor"}


@app.get("/products")
def get_products(db=Depends(get_db)):
    products = db.query(models.Product).all()
    return [
        {
            "id": p.id,
            "name": p.name,
            "min_amount": p.min_amount,
            "max_amount": p.max_amount,
            "min_term_months": p.min_term_months,
            "max_term_months": p.max_term_months,
            "base_rate": p.base_rate,
        }
        for p in products
    ]


@app.post("/applications", status_code=201)
def create_application(payload: ApplicationCreate, db=Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == payload.product_id).first()
    if product is None:
        raise HTTPException(status_code=404, detail=f"Продукт с id={payload.product_id} не найден")

    company = db.query(models.Company).filter(models.Company.inn == payload.inn).first()
    if company is None:
        company = models.Company(
            name=payload.company_name,
            inn=payload.inn,
            revenue=payload.revenue,
            age_years=payload.age_years,
        )
        db.add(company)
        db.flush()

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

    return {
        "application_id": application.id,
        "status": application.status.value,
        "company_id": company.id,
        "message": "Заявка принята в обработку",
    }


@app.get("/applications/{application_id}")
def get_application(application_id: int, db=Depends(get_db)):
    application = db.query(models.Application).filter(models.Application.id == application_id).first()
    if application is None:
        raise HTTPException(status_code=404, detail="Заявка не найдена")

    history = (
        db.query(models.StatusHistory)
        .filter(models.StatusHistory.application_id == application_id)
        .order_by(models.StatusHistory.changed_at)
        .all()
    )

    return {
        "id": application.id,
        "status": application.status.value,
        "amount": application.amount,
        "term_months": application.term_months,
        "purpose": application.purpose,
        "score": application.score,
        "company": {
            "name": application.company.name,
            "inn": application.company.inn,
        },
        "product": {
            "name": application.product.name,
            "base_rate": application.product.base_rate,
        },
        "history": [
            {
                "from": h.from_status.value if h.from_status else None,
                "to": h.to_status.value,
                "at": h.changed_at.isoformat(),
                "comment": h.comment,
            }
            for h in history
        ],
    }


@app.post("/applications/{application_id}/sign")
def sign_application(application_id: int, db=Depends(get_db)):
    """Клиент подписывает договор (смоделировано, как разрешено в кейсе)."""
    application = db.query(models.Application).filter(models.Application.id == application_id).first()
    if application is None:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    if application.status != S.SIGNING:
        raise HTTPException(status_code=409, detail=f"Подписание недоступно в статусе '{application.status.value}'")

    services.move_to(db, application, S.ISSUED, "Договор подписан клиентом, средства выданы")
    db.commit()
    return {"application_id": application.id, "status": application.status.value}


@app.post("/applications/{application_id}/clarify")
def clarify_application(application_id: int, payload: "ClarificationRequest", db=Depends(get_db)):
    """Клиент отвечает на запрос уточнения — заявка возвращается на конвейер."""
    application = db.query(models.Application).filter(models.Application.id == application_id).first()
    if application is None:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    if application.status != S.CLARIFICATION:
        raise HTTPException(status_code=409, detail=f"Уточнение недоступно в статусе '{application.status.value}'")

    services.move_to(db, application, S.EXTERNAL_CHECK, f"Клиент предоставил уточнения: {payload.comment}")
    db.commit()
    return {"application_id": application.id, "status": application.status.value}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)