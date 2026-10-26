import os
from pathlib import Path

os.environ["DATABASE_URL"] = "sqlite:///./test-credit.db"
os.environ["ENABLE_WORKER"] = "false"

from fastapi.testclient import TestClient
from app import services
from app.database import Base, SessionLocal, engine
from main import app
from app.models import Application, ApplicationStatus


def payload(inn="7701234567", product_id=1):
    return {
        "company_name": "ООО Ромашка",
        "inn": inn,
        "revenue": 24_000_000,
        "age_years": 7,
        "product_id": product_id,
        "amount": 2_000_000,
        "term_months": 24,
        "purpose": "Пополнение оборотных средств",
    }


def advance(application_id):
    db = SessionLocal()
    try:
        application = db.get(Application, application_id)
        services.advance_application(db, application)
        db.commit()
    finally:
        db.close()


def test_catalog_and_personal_recommendations():
    Base.metadata.drop_all(engine)
    with TestClient(app) as client:
        products = client.get("/products")
        assert products.status_code == 200
        assert len(products.json()) == 5
        response = client.post("/recommendations", json=payload())
        assert response.status_code == 200
        items = response.json()["items"]
        assert items
        assert items[0]["match_score"] >= items[-1]["match_score"]
        assert items[0]["reason"]


def test_full_successful_credit_path_and_persistence():
    Base.metadata.drop_all(engine)
    with TestClient(app) as client:
        created = client.post("/applications", json=payload())
        assert created.status_code == 201
        application_id = created.json()["id"]
        for status in ["data_check", "external_check", "scoring", "decision", "signing"]:
            advance(application_id)
            current = client.get(f"/applications/{application_id}")
            assert current.status_code == 200
            assert current.json()["status"] == status
        signed = client.post(f"/applications/{application_id}/sign")
        assert signed.status_code == 200
        assert signed.json()["status"] == "issued"
        assert signed.json()["offer_rate"] == 17.4
        saved = client.get("/applications", params={"inn": "7701234567"})
        assert saved.status_code == 200
        assert saved.json()[0]["id"] == application_id
        assert len(saved.json()[0]["history"]) == 7


def test_rejected_company_has_explained_result():
    Base.metadata.drop_all(engine)
    with TestClient(app) as client:
        rejected_payload = payload(inn="7707654321")
        rejected_payload["company_name"] = "ООО Лютик"
        application_id = client.post("/applications", json=rejected_payload).json()["id"]
        advance(application_id)
        advance(application_id)
        advance(application_id)
        result = client.get(f"/applications/{application_id}").json()
        assert result["status"] == "rejected"
        assert "ликвидирована" in result["decision_comment"]


def test_validation_and_spa_delivery():
    Base.metadata.drop_all(engine)
    with TestClient(app) as client:
        invalid = payload()
        invalid["inn"] = "abc"
        assert client.post("/applications", json=invalid).status_code == 422
        assert client.post("/applications", json=payload(product_id=999)).status_code == 404
        page = client.get("/")
        assert page.status_code == 200
        assert '<div id="root"></div>' in page.text


def teardown_module():
    engine.dispose()
    Path("test-credit.db").unlink(missing_ok=True)
