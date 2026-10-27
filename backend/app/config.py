import os

class Settings:
    PROJECT_NAME: str = "Vaccine Distribution & Cold Storage Thermal Tracking Hub"
    API_V1_STR: str = "/api"
   SECRET_KEY: str = os.environ.get("SECRET_KEY", "dev-only-change-me")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days for easy demo
    
    # SQLite Database File
    BASE_DIR: str = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    DATABASE_URL: str = f"sqlite:///{os.path.join(BASE_DIR, 'vaccine_system.db')}"

settings = Settings()
