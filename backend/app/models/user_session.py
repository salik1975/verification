from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.db.base import BaseWithCustomPK

class UserSession(BaseWithCustomPK):
    """
    Database-backed session store for user authentication.
    This replaces the in-memory session_store to persist sessions across
    server restarts and support load-balanced deployments.
    """
    __tablename__ = "user_session"

    session_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    token = Column(String(36), unique=True, nullable=False, index=True)  # UUID token
    user_id = Column(Integer, ForeignKey("app_user.user_id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)  # Optional expiration
    last_accessed = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
