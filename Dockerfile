FROM node:22-alpine AS frontend-build
WORKDIR /build
COPY frontend/credit-cabinet/package.json frontend/credit-cabinet/package-lock.json ./
RUN npm ci
COPY frontend/credit-cabinet/ ./
RUN npm run build

FROM python:3.13-slim AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    FRONTEND_DIST=/app/frontend/dist
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY main.py seed.py ./
COPY app ./app
COPY --from=frontend-build /build/dist ./frontend/dist
RUN addgroup --system app && adduser --system --ingroup app app && chown -R app:app /app
USER app
EXPOSE 8000
HEALTHCHECK --interval=10s --timeout=3s --retries=5 CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health')" || exit 1
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
