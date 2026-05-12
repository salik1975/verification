from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str
    
    # Legacy database fields (preserved for compatibility)
    DB_SERVER: str
    DB_NAME: str
    DB_USER: str
    DB_PASSWORD: str
    
    # Security
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # API
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "AcuFi Backend API"
    
    # Microservice
    MICROSERVICE_URL: str
    
    # Feature flags for file storage
    STORE_ID_AND_LICENSE_PHOTO: bool = True
    STORE_VIDEO: bool = True
    STORE_EXTRACTED_FACES: bool = True
    
    SENDER_EMAIL: str = ""
    SENDER_EMAIL_APP_PASS: str = ""
    
    # Twilio SMS Configuration
    TWILIO_ACCOUNT_SID: Optional[str] = None
    TWILIO_AUTH_TOKEN: Optional[str] = None
    TWILIO_NUMBER: Optional[str] = None
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()