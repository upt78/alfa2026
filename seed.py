from app.database import SessionLocal, engine, Base
from app import models

Base.metadata.create_all(bind=engine)

db = SessionLocal()

if db.query(models.Product).count() == 0:
    products = [
        models.Product(
            name="Оборотный кредит",
            min_amount=100_000, max_amount=10_000_000,
            min_term_months=3, max_term_months=12,
            base_rate=18.9
        ),
        models.Product(
            name="Кредит на развитие бизнеса",
            min_amount=500_000, max_amount=50_000_000,
            min_term_months=12, max_term_months=60,
            base_rate=16.5
        ),
        models.Product(
            name="Овердрафт",
            min_amount=50_000, max_amount=3_000_000,
            min_term_months=1, max_term_months=6,
            base_rate=21.0
        ),
    ]
    db.add_all(products)
    db.commit()
    print("Добавлено продуктов:", len(products))
else:
    print("Продукты уже есть, пропускаем")

db.close()