import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Адрес базы читаем из переменной окружения.
# Если её нет (локальная разработка) — используем SQLite-файл.
# В Docker compose мы передаём DATABASE_URL с PostgreSQL.
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./credit.db")

# Аргумент нужен только SQLite; для PostgreSQL передаём пустой набор
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)

# Фабрика сессий. Сессия — это один "разговор" с базой:
# открыл → сделал операции → сохранил → закрыл.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Базовый класс. Все наши таблицы будут от него наследоваться —
# так SQLAlchemy понимает, какие классы являются таблицами.
Base = declarative_base()