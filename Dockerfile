FROM ubuntu:latest
LABEL authors="upt78"

ENTRYPOINT ["top", "-b"]

# Базовый образ: Python 3.13 на минимальной Linux-системе
FROM python:3.13-slim

# Рабочая папка внутри контейнера
WORKDIR /code

# Сначала копируем requirements и ставим зависимости.
# Это важный приём: пока requirements.txt не меняется,
# Docker переиспользует готовый слой и сборка идёт за секунды.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Теперь копируем весь код проекта
COPY . .

# Порт, который "слушает" приложение внутри контейнера
EXPOSE 8000

# Команда запуска (uvicorn напрямую, main:app — файл и переменная)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]