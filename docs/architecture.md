# Архитектура и модель процесса

## Компоненты

```mermaid
flowchart LR
    U[Предприниматель] --> SPA[React SPA]
    SPA -->|REST /products, /recommendations| API[FastAPI]
    SPA -->|REST /applications| API
    API --> REC[Правила персонального подбора]
    API --> DB[(PostgreSQL 16)]
    API --> W[Фоновый кредитный worker]
    W --> REG[Мок ЕГРЮЛ / ЕГРИП]
    W --> BKI[Мок БКИ]
    W --> SCORE[Балльный скоринг и решение]
    W --> DB
    SPA -->|polling каждые 2 с| API
```

В production-контейнере FastAPI также отдаёт собранный SPA. В режиме разработки Vite работает на `7100`, а `/api` проксируется на backend. В Docker PostgreSQL запускается до приложения благодаря healthcheck. Данные сохраняются в volume.

## Состояния заявки

```mermaid
stateDiagram-v2
    [*] --> submitted: клиент отправил заявку
    submitted --> data_check: регистрация
    data_check --> clarification: ошибки лимитов / неполные данные
    data_check --> external_check: данные корректны
    external_check --> rejected: бизнес не найден / ликвидирован
    external_check --> scoring: реестр и БКИ проверены
    scoring --> decision: скоринг ≥ 70
    scoring --> clarification: скоринг 40–69
    scoring --> rejected: скоринг < 40
    clarification --> external_check: клиент ответил
    decision --> signing: договор сформирован
    signing --> issued: локальное подписание
    issued --> [*]
    rejected --> [*]
```

Автоматические переходы выполняет worker каждые 2 секунды. `clarification` и `signing` ждут действия клиента. Каждый переход пишется в `status_history`; интерфейс показывает комментарий и время.

## Модель данных

```mermaid
erDiagram
    COMPANIES ||--o{ APPLICATIONS : создаёт
    PRODUCTS ||--o{ APPLICATIONS : выбран
    APPLICATIONS ||--o{ STATUS_HISTORY : имеет

    COMPANIES {
        int id PK
        string inn UK
        string name
        float revenue
        int age_years
        datetime created_at
    }
    PRODUCTS {
        int id PK
        string name
        string bank
        float min_amount
        float max_amount
        int min_term_months
        int max_term_months
        float base_rate
        string description
        string tags
        int approval
    }
    APPLICATIONS {
        int id PK
        int company_id FK
        int product_id FK
        float amount
        int term_months
        string purpose
        enum status
        int score
        float offer_rate
        string decision_comment
        datetime created_at
        datetime updated_at
    }
    STATUS_HISTORY {
        int id PK
        int application_id FK
        enum from_status
        enum to_status
        datetime changed_at
        string comment
    }
```

## Логика рекомендаций и решения

Рекомендации — не LLM и не вероятность одобрения. Сначала отбрасываются продукты с неподходящими суммой или сроком. Затем базовый рейтинг продукта корректируется по отношению суммы к выручке и соответствию цели. Возвращаются до трёх предложений с объяснением.

Скоринг начинается с 50 баллов и учитывает выручку, возраст бизнеса, долю запрошенной суммы в выручке, просрочки, число кредитов и долговую нагрузку. Решение отделено от скоринга: возможны одобрение, уточнение и отказ. При одобрении рассчитывается ставка предложения.

## Надёжность и ограничения

Healthcheck проверяет соединение с БД. Worker откатывает неудачную транзакцию и продолжает работу. Для MVP используется один процесс и встроенный поток; горизонтальное масштабирование потребует отдельного worker и блокировок/очереди. Схема создаётся `create_all`; изменения существующих production-схем потребуют миграций Alembic.
