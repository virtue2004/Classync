"""
Central configuration, loaded from environment variables / .env file.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./academy_share.db"

    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE_MB: int = 200
    MAX_UPLOAD_BATCH_SIZE_MB: int = 500
    MAX_FILES_PER_SHARE: int = 50
    # Required to appoint or recover the server owner. Generate a long random
    # value during installation and keep it on the host machine only.
    OWNER_SETUP_KEY: str = ""
    CORS_ORIGINS: str = ""

    INSTANCE_NAME: str = "My Academy"
    BACKEND_PORT: int = 8000
    FRONTEND_PORT: int = 5500

    # File types explicitly blocked regardless of who uploads them.
    # Extend this list rather than relying on extension checks alone —
    # actual content is verified separately via magic bytes in file_validation.py.
    BLOCKED_EXTENSIONS: set[str] = {
        ".exe", ".bat", ".cmd", ".sh", ".ps1", ".msi", ".apk",
        ".jar", ".vbs", ".scr", ".com", ".dll", ".app",
    }

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
