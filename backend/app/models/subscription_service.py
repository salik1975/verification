from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.base import BaseWithCustomPK

class SubscriptionService(BaseWithCustomPK):
    __tablename__ = "subscription_services"

    service_id = Column(Integer, primary_key=True, index=True)
    service_name = Column(String(100), unique=True, nullable=False, index=True)
    service_description = Column(Text, nullable=True)
    created_on = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, default=True)
    
    # Relationships
    pricing = relationship("SubscriptionPricing", back_populates="service")
    tenants = relationship("Tenant", back_populates="subscription_service")
    feature_mappings = relationship("SubscriptionFeatureMapping", back_populates="service")
