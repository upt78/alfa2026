from app.database import Base, SessionLocal, engine
from app import models


PRODUCTS = [
    dict(name="Оборотный кредит", min_amount=100_000, max_amount=10_000_000,
         min_term_months=3, max_term_months=36, base_rate=18.9, approval=82,
         tags="Без залога,Решение за 15 минут,Оборотные средства",
         description="На закупку товара и пополнение оборотных средств."),
    dict(name="Кредит на развитие бизнеса", min_amount=500_000, max_amount=50_000_000,
         min_term_months=12, max_term_months=84, base_rate=16.5, approval=68,
         tags="Инвестиции,Под залог,Оборудование",
         description="На оборудование, ремонт, расширение и модернизацию бизнеса."),
    dict(name="Овердрафт", min_amount=50_000, max_amount=3_000_000,
         min_term_months=1, max_term_months=12, base_rate=21.0, approval=88,
         tags="К расчётному счёту,Без залога,Быстрое решение",
         description="Лимит для кассовых разрывов; проценты начисляются на использованную сумму."),
    dict(name="Экспресс-кредит", min_amount=50_000, max_amount=500_000,
         min_term_months=3, max_term_months=12, base_rate=22.0, approval=90,
         tags="Без залога,Решение за 5 минут",
         description="Небольшая сумма на срочные расходы с упрощённым пакетом данных."),
    dict(name="Сезонный рост", min_amount=500_000, max_amount=5_000_000,
         min_term_months=6, max_term_months=24, base_rate=17.4, approval=74,
         tags="Без залога,График под сезон,Закупка товара",
         description="Финансирование закупки товара к сезону с учётом цикла продаж."),
]


def seed_products():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(models.Product).count() == 0:
            db.add_all([models.Product(bank="Альфа-Банк", **data) for data in PRODUCTS])
            db.commit()
            print(f"Добавлено продуктов: {len(PRODUCTS)}")
        else:
            print("Продукты уже есть, пропускаем")
    finally:
        db.close()


if __name__ == "__main__":
    seed_products()
