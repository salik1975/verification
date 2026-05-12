from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
import os

# Import base to ensure all models are registered
from app.db import base

# Create SQLAlchemy engine with optimized settings
engine = create_engine(
    settings.DATABASE_URL,
    echo=False,  # Set to False for production performance
    pool_pre_ping=True,
    pool_recycle=300,
    pool_size=20,  # Increased pool size for better concurrency
    max_overflow=30,  # Allow up to 30 additional connections
    pool_timeout=30,  # Connection timeout
    connect_args={
        "connect_timeout": 30,
        "command_timeout": 60,
    }
)

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()