"""
Configuration management for BharatConnect AI Backend
Loads settings from environment variables with sensible defaults
"""
from pydantic_settings import BaseSettings
from pydantic import Field
from typing import List


class Settings(BaseSettings):
    # Server Configuration
    host: str = "0.0.0.0"
    port: int = 8000

    # Google Gemini Configuration (Optional)
    google_api_key: str | None = None
    gemini_model: str = "gemini-pro"

    # Twilio Configuration (Optional)
    twilio_account_sid: str | None = None
    twilio_auth_token: str | None = None
    twilio_phone_number: str | None = None

    # Session Configuration
    session_timeout_minutes: int = 30

    # CORS Configuration
    cors_origins: List[str] = Field(
        default=[
            "http://localhost:5173",
            "http://localhost:3000",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:3000"
        ]
    )

    class Config:
        env_file = ".env"
        case_sensitive = False


# Global settings instance
settings = Settings()
