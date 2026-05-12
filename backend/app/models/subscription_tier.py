from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.base import BaseWithCustomPK

class SubscriptionTier(BaseWithCustomPK):
    __tablename__ = "subscription_tiers"

    tier_id = Column(Integer, primary_key=True, index=True)
    tier_name = Column(String(50), unique=True, nullable=False, index=True)
    max_reports = Column(Integer, nullable=False)
    created_on = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, default=True)
    
    # Relationships
    pricing = relationship("SubscriptionPricing", back_populates="tier")
    tenants = relationship("Tenant", back_populates="subscription_tier")
