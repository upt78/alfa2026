from pydantic import BaseModel, Field


# Описывает тело запроса на создание заявки.
# FastAPI по этому классу: 1) сгенерирует форму в /docs,
# 2) провалидирует входящий JSON, 3) подсветит ошибки клиенту.
class ApplicationCreate(BaseModel):
    # --- данные компании ---
    company_name: str = Field(min_length=2, description="Название компании")
    inn: str = Field(min_length=10, max_length=12, description="ИНН: 10 цифр для ООО, 12 для ИП")
    revenue: float = Field(gt=0, description="Годовая выручка, руб.")
    age_years: int = Field(ge=0, description="Возраст бизнеса, лет")

    # --- параметры заявки ---
    product_id: int = Field(description="ID кредитного продукта из /products")
    amount: float = Field(gt=0, description="Запрошенная сумма, руб.")
    term_months: int = Field(ge=1, le=120, description="Срок, месяцев")
    purpose: str = Field(min_length=5, description="Цель кредита")

class ClarificationRequest(BaseModel):
    comment: str = Field(min_length=3, description="Пояснения клиента по запросу банка")