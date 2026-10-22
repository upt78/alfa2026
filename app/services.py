from app import models
from app.models import ApplicationStatus as S

# ============================================================
# МОКИ ВНЕШНИХ СИСТЕМ
# В реальности банк ходил бы в сервисы ФНС и бюро кредитных
# историй. Мы воспроизводим их ответы локально, но СМЫСЛ
# интеграции сохраняем: по ИНН получаем данные и принимаем
# решения на их основе.
# ============================================================

EGRUL_DATABASE = {
    "7701234567": {"name": "ООО Ромашка", "status": "active", "okved": "47.11"},
    "7707654321": {"name": "ООО Лютик", "status": "liquidated", "okved": "56.10"},
}


def mock_egrul(inn: str) -> dict:
    """Эмуляция ЕГРЮЛ/ФНС «Прозрачный бизнес»: возвращает регистрационные данные по ИНН."""
    return EGRUL_DATABASE.get(inn, {"name": None, "status": "not_found", "okved": None})


def mock_bki(inn: str) -> dict:
    """Эмуляция бюро кредитных историй.
    Данные детерминированы (зависят только от ИНН) — один и тот же
    клиент всегда получает одну и ту же кредитную историю,
    как и в реальном БКИ."""
    seed = int(inn) % 100
    return {
        "active_credits": seed % 5,               # число действующих кредитов
        "overdue_count": (seed // 7) % 3,         # число просрочек за 3 года
        "debt_load_percent": 10 + seed % 40,      # доля дохода на платежи по кредитам
    }


# ============================================================
# СКОРИНГ — балльная модель (явно описанная, как разрешено в кейсе)
# ============================================================

def calc_score(application, bki: dict) -> int:
    """Простая прозрачная модель: стартуем с 50 баллов,
    факторы кредитоспособности добавляют или убавляют."""
    score = 50
    company = application.company

    # Финансовое положение
    if company.revenue >= 50_000_000:
        score += 15
    elif company.revenue >= 10_000_000:
        score += 10

    # Стабильность бизнеса
    if company.age_years >= 5:
        score += 10
    elif company.age_years >= 2:
        score += 5

    # Нагрузка: сумма заявки относительно выручки
    if application.amount <= company.revenue * 0.5:
        score += 10
    elif application.amount <= company.revenue:
        score += 5

    # Кредитная история
    score -= bki["overdue_count"] * 15      # просрочки бьют сильнее всего
    score -= bki["active_credits"] * 3      # уже есть обязательства
    if bki["debt_load_percent"] > 40:
        score -= 10

    return max(0, min(100, score))


# ============================================================
# СТАТУСНАЯ МАШИНА — один шаг конвейера
# ============================================================

def move_to(db, application, to_status: S, comment: str):
    """Перевод заявки в новый статус + запись в историю."""
    record = models.StatusHistory(
        application_id=application.id,
        from_status=application.status,
        to_status=to_status,
        comment=comment,
    )
    application.status = to_status
    db.add(record)


def advance_application(db, application):
    """Выполняет ровно ОДИН этап обработки заявки.
    Фоновый воркер вызывает это снова и снова — так заявка
    «движется» по конвейеру."""
    status = application.status

    if status == S.SUBMITTED:
        move_to(db, application, S.DATA_CHECK, "Заявка зарегистрирована, начата проверка данных")

    elif status == S.DATA_CHECK:
        product = application.product
        problems = []
        if not (product.min_amount <= application.amount <= product.max_amount):
            problems.append(f"сумма вне лимитов продукта ({product.min_amount:.0f}–{product.max_amount:.0f})")
        if not (product.min_term_months <= application.term_months <= product.max_term_months):
            problems.append("срок вне допустимого диапазона")
        if problems:
            move_to(db, application, S.CLARIFICATION, "Нужно уточнение: " + "; ".join(problems))
        else:
            move_to(db, application, S.EXTERNAL_CHECK, "Полнота и корректность данных подтверждены")

    elif status == S.EXTERNAL_CHECK:
        egrul = mock_egrul(application.company.inn)
        if egrul["status"] != "active":
            move_to(db, application, S.REJECTED, "Компания отсутствует в ЕГРЮЛ или ликвидирована")
            return
        bki = mock_bki(application.company.inn)
        application.score = calc_score(application, bki)
        move_to(
            db, application, S.SCORING,
            f"ЕГРЮЛ: компания действующая. БКИ: просрочек — {bki['overdue_count']}, "
            f"активных кредитов — {bki['active_credits']}, долговая нагрузка — {bki['debt_load_percent']}%",
        )

    elif status == S.SCORING:
        score = application.score or 0
        if score >= 70:
            rate = round(application.product.base_rate - 1.5, 1)
            move_to(db, application, S.DECISION, f"Одобрено. Ставка {rate}% годовых, скоринг {score}/100")
        elif score >= 40:
            move_to(db, application, S.CLARIFICATION, f"Требуется уточнение финансовых показателей (скоринг {score}/100)")
        else:
            move_to(db, application, S.REJECTED, f"Отказ по результатам скоринга (балл {score}/100)")

    elif status == S.DECISION:
        move_to(db, application, S.SIGNING, "Кредитный договор сформирован, ожидается подписание клиентом")

    # SIGNING, ISSUED, REJECTED, CLARIFICATION — конечные или ждут действия клиента