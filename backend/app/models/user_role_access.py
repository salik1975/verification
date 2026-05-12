from sqlalchemy import Column, Integer, ForeignKey, PrimaryKeyConstraint
from app.db.base import BaseWithCustomPK

class UserRoleAccess(BaseWithCustomPK):
    __tablename__ = "user_role_access"
    
    user_id = Column(Integer, ForeignKey("app_user.user_id"), nullable=False)
    role_id = Column(Integer, ForeignKey("role.role_id"), nullable=False)
    
    __table_args__ = (
        PrimaryKeyConstraint('user_id', 'role_id'),
    )
