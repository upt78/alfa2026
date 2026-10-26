# Умный кредитный кабинет предпринимателя

Веб-прототип сквозного кредитного конвейера для малого и микробизнеса с персональным подбором кредита. Клиент заполняет профиль, получает объяснимые рекомендации, создаёт заявку и видит её движение от проверки данных до решения, подписания и смоделированной выдачи.

Все клиенты, компании и финансовые показатели синтетические. ЕГРЮЛ/ЕГРИП, БКИ, вход, подписание и выдача смоделированы локально. Платные API, корпоративные системы и внешние LLM не требуются.

## Быстрый запуск на macOS

Требуется только установленный и запущенный **Docker Desktop** (Apple Silicon и Intel поддерживаются).

```bash
git clone https://github.com/upt78/alfa2026.git
cd alfa2026
docker compose up --build
```

Открыть:

- Web-интерфейс: http://localhost:8001
- Swagger UI: http://localhost:8001/docs
- OpenAPI JSON: http://localhost:8001/openapi.json
- Healthcheck: http://localhost:8001/health

Первый запуск скачивает базовые образы и зависимости, поэтому занимает несколько минут. Frontend собирается внутри Docker, Node.js и Python на Mac устанавливать не нужно. PostgreSQL и приложение запускаются вместе; база сохраняется в Docker volume `pgdata`.

Порт `8001` выбран по умолчанию, чтобы не конфликтовать с backend на `8000`. Другой порт:

```bash
APP_PORT=8080 docker compose up --build
```

Остановка: `Ctrl+C`, затем `docker compose down`. Полный сброс **с удалением синтетических заявок**: `docker compose down -v`.

## Быстрый запуск на Windows 10/11

Требуются **Docker Desktop для Windows** и **Git for Windows**. Во время установки Docker Desktop оставьте включённой опцию использования **WSL 2**, перезагрузите компьютер, если установщик этого попросит, затем запустите Docker Desktop и дождитесь готовности Docker Engine.

1. Установите [Docker Desktop](https://www.docker.com/products/docker-desktop/) и [Git for Windows](https://git-scm.com/download/win).
2. Откройте **PowerShell** в папке, куда хотите скачать проект.
3. Выполните по очереди:

```powershell
git clone https://github.com/upt78/alfa2026.git
cd alfa2026
docker compose up --build
```

При первом запуске разрешите Docker Desktop доступ к сети, если Windows покажет системный запрос. Дождитесь сообщения о запуске приложения, затем откройте http://localhost:8001. Swagger UI доступен по адресу http://localhost:8001/docs. Отдельно устанавливать Node.js, Python или PostgreSQL не нужно.

Если порт `8001` уже занят, запустите проект на другом порту, например `8080`:

```powershell
$env:APP_PORT="8080"; docker compose up --build
```

Тогда интерфейс будет доступен по адресу http://localhost:8080. Настройка действует только в текущем окне PowerShell; чтобы вернуть порт по умолчанию, выполните `Remove-Item Env:APP_PORT`.

Остановка: нажмите `Ctrl+C` в окне PowerShell, затем выполните `docker compose down`. Полный сброс **с удалением синтетических заявок**: `docker compose down -v`.

## Сценарий проверки

1. На экране «Профиль» нажмите «Продолжить», введите любой четырёхзначный локальный код.
2. Оставьте ИНН `7701234567`, нажмите «Найти», выберите оборот и цель, создайте кабинет.
3. В «Советнике» нажмите «Подобрать кредит», выберите `1 млн ₽` и `24 мес`. Backend вернёт ранжированные предложения и объяснение.
4. Нажмите «Оформить», задайте параметры, подтвердите данные и отправьте заявку с любым четырёхзначным кодом.
5. В «Заявках» наблюдайте переходы: `submitted → data_check → external_check → scoring → decision → signing`.
6. Откройте заявку в статусе «Подписание» и нажмите «Подписать и смоделировать выдачу». Итоговый статус — «Выдан».
7. Перезапустите страницу или контейнер приложения: заявка и история останутся в PostgreSQL.

Негативный сценарий: выйдите из кабинета и создайте профиль с ИНН `7707654321`. После внешней проверки заявка получит объяснённый отказ, поскольку компания в моке ликвидирована. Дополнительный синтетический ИНН: `501234567890`.

## Архитектура

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Radix UI/shadcn-ui. SPA в production отдаётся FastAPI с того же origin.
- **Backend:** FastAPI, SQLAlchemy, Pydantic. REST API, прозрачные правила рекомендаций, балльный скоринг, статусная машина и фоновый worker.
- **Данные:** PostgreSQL 16 в Docker; SQLite по умолчанию для локальной backend-разработки.
- **Интеграции:** детерминированные локальные моки реестра и БКИ в `app/services.py`.

Подробнее: [архитектура, модель данных и статусы](docs/architecture.md), [API](docs/api.md), [OpenAPI](docs/openapi.json), [HTTP-коллекция](docs/collection.http), [тестовые сценарии](docs/test-scenarios.md), [сторонние компоненты](THIRD_PARTY_NOTICES).

## Локальная разработка без Docker

### Backend

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
uvicorn main:app --host 127.0.0.1 --port 8001
```

По умолчанию создаётся `credit.db` (SQLite). Для PostgreSQL задайте `DATABASE_URL`.

### Frontend

Во втором терминале:

```bash
cd frontend/credit-cabinet
npm ci
npm run dev
```

Vite доступен на http://localhost:7100 и проксирует `/api/*` на `http://127.0.0.1:8001`. Адрес backend можно изменить через `API_TARGET` при запуске Vite. Для отдельного origin frontend использует `VITE_API_URL`.

## Переменные окружения

| Переменная | Значение по умолчанию | Назначение |
|---|---|---|
| `APP_PORT` | `8001` | Внешний порт Docker-приложения |
| `DATABASE_URL` | `sqlite:///./credit.db` | SQLAlchemy URL базы; в Compose задан PostgreSQL |
| `SEED_PRODUCTS` | `true` | Добавить каталог при первом запуске |
| `ENABLE_WORKER` | `true` | Запускать фоновый конвейер |
| `WORKER_INTERVAL_SECONDS` | `2` | Пауза между автоматическими этапами |
| `CORS_ORIGINS` | `http://localhost:7100,http://127.0.0.1:7100` | Origins для разработки |
| `FRONTEND_DIST` | локальный `frontend/credit-cabinet/dist` | Каталог собранного SPA |
| `API_TARGET` | `http://127.0.0.1:8001` | Backend для Vite proxy |
| `VITE_API_URL` | пусто | Явный URL API при раздельном размещении |

Пример: `.env.example`. Секреты не нужны.

## Проверки

```bash
# Backend: каталог, рекомендации, успешный путь, отказ, валидация, SPA
source .venv/bin/activate
pytest -q

# Frontend
cd frontend/credit-cabinet
npm run lint
npm run build

# Сквозной тест уже запущенного Docker-стека
cd ../..
python3 scripts/e2e_smoke.py
```

## Границы прототипа и развитие

Это демонстрационный MVP, а не промышленная банковская система. Не реализованы production-аутентификация и авторизация, роли сотрудников банка, миграции БД, очередь с повторной доставкой, реальные подпись/платежи и внешние реестры. Для production потребуются отдельный worker/брокер, миграции, секреты, аудит, мониторинг, шифрование и юридически значимые интеграции. Текущие упрощения явно отображены в интерфейсе и не скрывают границы процесса.
