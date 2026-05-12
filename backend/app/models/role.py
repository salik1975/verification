from sqlalchemy import Column, Integer, String
from app.db.base import BaseWithCustomPK

class Role(BaseWithCustomPK):
    __tablename__ = "role"
    
    role_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(50), nullable=False, unique=True, index=True)
    description = Column(String(255))
