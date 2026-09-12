from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.config import settings

connect_args = {"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}
engine = create_engine(settings.DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def run_migrations() -> None:
    """Small, idempotent migration for installations created before tokens."""
    inspector = inspect(engine)
    if "devices" not in inspector.get_table_names():
        return
    columns = {column["name"] for column in inspector.get_columns("devices")}
    if "device_token" not in columns:
        # Nullable keeps existing installations intact. Owners can use the
        # setup key once to recover ownership on a newly secured client.
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE devices ADD COLUMN device_token VARCHAR(128)"))

    file_columns = {column["name"] for column in inspector.get_columns("files")} if "files" in inspector.get_table_names() else set()
    with engine.begin() as connection:
        if "sha256" not in file_columns:
            connection.execute(text("ALTER TABLE files ADD COLUMN sha256 VARCHAR(64) NOT NULL DEFAULT ''"))
        if "scan_status" not in file_columns:
            connection.execute(text("ALTER TABLE files ADD COLUMN scan_status VARCHAR(20) NOT NULL DEFAULT 'unscanned'"))
        if "scan_message" not in file_columns:
            connection.execute(text("ALTER TABLE files ADD COLUMN scan_message VARCHAR(255) NOT NULL DEFAULT 'Uploaded before safety scanning was enabled'"))


def get_db():
    """FastAPI dependency: yields a DB session and always closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
