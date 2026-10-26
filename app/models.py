import enum
from datetime import UTC, datetime

from sqlalchemy import Column, DateTime, Enum, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.database import Base


class ApplicationStatus(str, enum.Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    DATA_CHECK = "data_check"
    EXTERNAL_CHECK = "external_check"
    SCORING = "scoring"
    DECISION = "decision"
    SIGNING = "signing"
    ISSUED = "issued"
    REJECTED = "rejected"
    CLARIFICATION = "clarification"


class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    inn = Column(String(12), unique=True, nullable=False, index=True)
    revenue = Column(Float, nullable=False)
    age_years = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(UTC))


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    bank = Column(String, nullable=False, default="Альфа-Банк")
    min_amount = Column(Float, nullable=False)
    max_amount = Column(Float, nullable=False)
    min_term_months = Column(Integer, nullable=False)
    max_term_months = Column(Integer, nullable=False)
    base_rate = Column(Float, nullable=False)
    description = Column(String, nullable=False, default="")
    tags = Column(String, nullable=False, default="")
    approval = Column(Integer, nullable=False, default=70)


class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    amount = Column(Float, nullable=False)
    term_months = Column(Integer, nullable=False)
    purpose = Column(String, nullable=False)
    status = Column(Enum(ApplicationStatus), default=ApplicationStatus.DRAFT, nullable=False, index=True)
    score = Column(Integer, nullable=True)
    offer_rate = Column(Float, nullable=True)
    decision_comment = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(UTC))
    updated_at = Column(DateTime, default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC))

    company = relationship("Company")
    product = relationship("Product")


class StatusHistory(Base):
    __tablename__ = "status_history"

    id = Column(Integer, primary_key=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False, index=True)
    from_status = Column(Enum(ApplicationStatus), nullable=True)
    to_status = Column(Enum(ApplicationStatus), nullable=False)
    changed_at = Column(DateTime, default=lambda: datetime.now(UTC))
    comment = Column(String, nullable=True)
