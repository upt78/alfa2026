from pydantic import BaseModel, Field


class CompanyData(BaseModel):
    company_name: str = Field(min_length=2, max_length=200)
    inn: str = Field(pattern=r"^\d{10}$|^\d{12}$", description="ИНН: 10 цифр для ООО, 12 для ИП")
    revenue: float = Field(gt=0, description="Годовая выручка, руб.")
    age_years: int = Field(ge=0, le=200, description="Возраст бизнеса, лет")


class ApplicationCreate(CompanyData):
    product_id: int = Field(gt=0)
    amount: float = Field(gt=0, le=1_000_000_000)
    term_months: int = Field(ge=1, le=120)
    purpose: str = Field(min_length=3, max_length=300)


class RecommendationRequest(CompanyData):
    amount: float = Field(gt=0, le=1_000_000_000)
    term_months: int = Field(ge=1, le=120)
    purpose: str = Field(min_length=3, max_length=300)


class ClarificationRequest(BaseModel):
    comment: str = Field(min_length=3, max_length=2000)
