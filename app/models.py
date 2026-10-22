from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from app.database import Base


# Перечисление статусов заявки — это наша диаграмма состояний в коде.
# Заявка может находиться только в одном из этих состояний.
class ApplicationStatus(str, enum.Enum):
    DRAFT = "draft"                    # черновик — клиент заполняет
    SUBMITTED = "submitted"            # отправлена в банк
    DATA_CHECK = "data_check"          # банк проверяет полноту данных
    EXTERNAL_CHECK = "external_check"  # проверка ЕГРЮЛ / БКИ
    SCORING = "scoring"                # скоринговая оценка
    DECISION = "decision"              # принято решение
    SIGNING = "signing"                # клиент подписывает документы
    ISSUED = "issued"                  # деньги выданы
    REJECTED = "rejected"              # отказ
    CLARIFICATION = "clarification"    # запрошено уточнение у клиента


class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True)             # уникальный номер, генерируется сам
    name = Column(String, nullable=False)              # название, обязательное
    inn = Column(String, unique=True, nullable=False)  # ИНН, обязательный и неповторяющийся
    revenue = Column(Float)                            # годовая выручка, млн руб.
    age_years = Column(Integer)                        # возраст бизнеса в годах
    created_at = Column(DateTime, default=datetime.now)  # когда записали в базу


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    min_amount = Column(Float, nullable=False)         # минимальная сумма кредита
    max_amount = Column(Float, nullable=False)         # максимальная
    min_term_months = Column(Integer, nullable=False)  # минимальный срок
    max_term_months = Column(Integer, nullable=False)  # максимальный
    base_rate = Column(Float, nullable=False)          # базовая ставка, % годовых


class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    amount = Column(Float, nullable=False)             # запрошенная сумма
    term_months = Column(Integer, nullable=False)      # запрошенный срок
    purpose = Column(String)                           # цель кредита
    status = Column(Enum(ApplicationStatus), default=ApplicationStatus.DRAFT)
    score = Column(Integer, nullable=True)             # балл скоринга, появится позже
    created_at = Column(DateTime, default=datetime.now)

    # relationship — НЕ колонка, а удобная связь на уровне Python:
    # через application.company мы получим объект Company целиком,
    # не делая второй запрос вручную.
    company = relationship("Company")
    product = relationship("Product")


class StatusHistory(Base):
    __tablename__ = "status_history"

    id = Column(Integer, primary_key=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False)
    from_status = Column(Enum(ApplicationStatus), nullable=True)  # None — самое начало
    to_status = Column(Enum(ApplicationStatus), nullable=False)
    changed_at = Column(DateTime, default=datetime.now)
    comment = Column(String, nullable=True)  # например: "найдена просрочка в БКИ"