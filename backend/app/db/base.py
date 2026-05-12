from sqlalchemy.orm import DeclarativeBase, declared_attr
from sqlalchemy import Column, Integer
from typing import Any


class Base(DeclarativeBase):
    __allow_unmapped__ = True
    
    # Generate __tablename__ automatically based on class name
    @declared_attr.directive
    def __tablename__(cls) -> str:
        return cls.__name__.lower()
    
    # Common id field for all tables
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)


class BaseWithCustomPK(DeclarativeBase):
    __allow_unmapped__ = True
    
    # This base class doesn't have an automatic id field
    # Use this for models that need custom primary keys


# Import all models here so SQLAlchemy can discover them
from app.models.user import User
from app.models.app_user import AppUser
from app.models.tenant import Tenant
from app.models.role import Role
from app.models.user_role_access import UserRoleAccess
from app.models.document_type import DocumentType
from app.models.document_detail import DocumentDetail
from app.models.verification_log import VerificationLog
from app.models.subscription_tier import SubscriptionTier
from app.models.subscription_service import SubscriptionService
from app.models.subscription_pricing import SubscriptionPricing
from app.models.main_feature_mapping import MainFeatureMapping
from app.models.subscription_feature_mapping import SubscriptionFeatureMapping
from app.models.user_session import UserSession