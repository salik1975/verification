from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.base import BaseWithCustomPK

class Tenant(BaseWithCustomPK):
    __tablename__ = "tenant"
    
    tenant_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True, index=True)
    license_info = Column(Text)  # JSON field for license information
    
    # Subscription fields
    subscription_tier_id = Column(Integer, ForeignKey("subscription_tiers.tier_id"), nullable=True)
    subscription_service_id = Column(Integer, ForeignKey("subscription_services.service_id"), nullable=True)
    onboarding_date = Column(DateTime(timezone=True), nullable=True)
    subscription_start_date = Column(DateTime(timezone=True), nullable=True)
    subscription_end_date = Column(DateTime(timezone=True), nullable=True)
    reports_used = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    
    # Relationships
    subscription_tier = relationship("SubscriptionTier", back_populates="tenants")
    subscription_service = relationship("SubscriptionService", back_populates="tenants")
