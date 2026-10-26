from app import models
from app.models import ApplicationStatus as S


# Локальные детерминированные моки: внешние сервисы и платные API не нужны.
EGRUL_DATABASE = {
    "7701234567": {"name": "ООО Ромашка", "status": "active", "okved": "47.11"},
    "7707654321": {"name": "ООО Лютик", "status": "liquidated", "okved": "56.10"},
    "501234567890": {"name": "ИП Смирнов Алексей Викторович", "status": "active", "okved": "47.11"},
}


def mock_egrul(inn: str) -> dict:
    return EGRUL_DATABASE.get(inn, {"name": None, "status": "not_found", "okved": None})


def mock_bki(inn: str) -> dict:
    seed = int(inn) % 100
    return {
        "active_credits": seed % 5,
        "overdue_count": (seed // 7) % 3,
        "debt_load_percent": 10 + seed % 40,
    }


def calc_score(application, bki: dict) -> int:
    score = 50
    company = application.company
    if company.revenue >= 50_000_000:
        score += 15
    elif company.revenue >= 10_000_000:
        score += 10
    if company.age_years >= 5:
        score += 10
    elif company.age_years >= 2:
        score += 5
    if application.amount <= company.revenue * 0.5:
        score += 10
    elif application.amount <= company.revenue:
        score += 5
    score -= bki["overdue_count"] * 15
    score -= bki["active_credits"] * 3
    if bki["debt_load_percent"] > 40:
        score -= 10
    return max(0, min(100, score))


def recommend_products(products, amount: float, term: int, purpose: str, revenue: float):
    """Прозрачный персональный подбор: только подходящие лимиты и понятные факторы ранжирования."""
    purpose_lower = purpose.lower()
    ranked = []
    for product in products:
        if not (product.min_amount <= amount <= product.max_amount):
            continue
        if not (product.min_term_months <= term <= product.max_term_months):
            continue
        match = product.approval
        reasons = ["сумма и срок соответствуют лимитам"]
        if amount <= revenue * 0.5:
            match += 5
            reasons.append("сумма умеренна относительно годовой выручки")
        else:
            match -= 10
        keywords = {
            "оборот": ["оборот", "товар", "сезон"],
            "инвест": ["оборудован", "ремонт", "развит"],
            "овердрафт": ["кассов", "разрыв"],
        }
        for key, words in keywords.items():
            if key in product.name.lower() and any(word in purpose_lower for word in words):
                match += 7
                reasons.append("продукт соответствует цели финансирования")
        ranked.append({
            "product": product,
            "match_score": max(10, min(98, match)),
            "reason": "; ".join(reasons).capitalize(),
        })
    ranked.sort(key=lambda item: (item["match_score"], -item["product"].base_rate), reverse=True)
    return ranked[:3]


def move_to(db, application, to_status: S, comment: str):
    record = models.StatusHistory(
        application_id=application.id,
        from_status=application.status,
        to_status=to_status,
        comment=comment,
    )
    application.status = to_status
    application.decision_comment = comment
    db.add(record)


def advance_application(db, application):
    status = application.status
    if status == S.SUBMITTED:
        move_to(db, application, S.DATA_CHECK, "Заявка зарегистрирована, начата проверка данных")
    elif status == S.DATA_CHECK:
        product = application.product
        problems = []
        if not product.min_amount <= application.amount <= product.max_amount:
            problems.append(f"сумма вне лимитов продукта ({product.min_amount:.0f}–{product.max_amount:.0f})")
        if not product.min_term_months <= application.term_months <= product.max_term_months:
            problems.append("срок вне допустимого диапазона")
        if problems:
            move_to(db, application, S.CLARIFICATION, "Нужно уточнение: " + "; ".join(problems))
        else:
            move_to(db, application, S.EXTERNAL_CHECK, "Полнота и корректность данных подтверждены")
    elif status == S.EXTERNAL_CHECK:
        egrul = mock_egrul(application.company.inn)
        if egrul["status"] != "active":
            move_to(db, application, S.REJECTED, "Компания отсутствует в моке ЕГРЮЛ/ЕГРИП или ликвидирована")
            return
        bki = mock_bki(application.company.inn)
        application.score = calc_score(application, bki)
        move_to(
            db,
            application,
            S.SCORING,
            f"Реестр: бизнес действующий. БКИ: просрочек — {bki['overdue_count']}, "
            f"активных кредитов — {bki['active_credits']}, долговая нагрузка — {bki['debt_load_percent']}%",
        )
    elif status == S.SCORING:
        score = application.score or 0
        if score >= 70:
            application.offer_rate = round(application.product.base_rate - 1.5, 1)
            move_to(db, application, S.DECISION, f"Одобрено. Ставка {application.offer_rate}% годовых, скоринг {score}/100")
        elif score >= 40:
            move_to(db, application, S.CLARIFICATION, f"Требуется уточнение финансовых показателей (скоринг {score}/100)")
        else:
            move_to(db, application, S.REJECTED, f"Отказ по результатам скоринга (балл {score}/100)")
    elif status == S.DECISION:
        move_to(db, application, S.SIGNING, "Кредитный договор сформирован, ожидается подписание клиентом")
