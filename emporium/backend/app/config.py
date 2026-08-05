from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")
    
    # App settings
    app_name: str = "Emporium API"
    debug: bool = False
    
    # Security
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # Database
    database_url: str = "sqlite:///./emporium.db"
    
    # Payment settings
    payment_provider: str = "mock"  # Options: mock, stripe
    
    # Stripe settings
    stripe_secret_key: Optional[str] = None


settings = Settings()
