# Frontend кредитного кабинета

React + TypeScript + Vite. Общий запуск, архитектура и сценарий проверки описаны в корневом `README.md`.

## Разработка

Из корня репозитория сначала запустите backend на порту `8001`, затем:

```bash
cd frontend/credit-cabinet
npm ci
npm run dev
```

Интерфейс: http://localhost:7100. Vite проксирует `/api/*` на `API_TARGET` (по умолчанию `http://127.0.0.1:8001`).

```bash
npm run lint
npm run build
```

В Docker frontend собирается автоматически и отдаётся FastAPI на общем порту `8001`.
