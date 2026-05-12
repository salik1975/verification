from sqlalchemy import Column, Integer, String, ForeignKey
from app.db.base import BaseWithCustomPK

class AppUser(BaseWithCustomPK):
    __tablename__ = "app_user"
    
    user_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    username = Column(String(50), nullable=False, unique=True, index=True)
    email = Column(String(100), nullable=False, unique=True, index=True)
    password_hash = Column(String(255), nullable=False)
    tenant_id = Column(Integer, ForeignKey("tenant.tenant_id"), nullable=True)
