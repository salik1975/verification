from sqlalchemy import Column, Integer, String, DateTime, Boolean, Numeric, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.base import BaseWithCustomPK

class SubscriptionPricing(BaseWithCustomPK):
    __tablename__ = "subscription_pricing"

    pricing_id = Column(Integer, primary_key=True, index=True)
    tier_id = Column(Integer, ForeignKey("subscription_tiers.tier_id"), nullable=False)
    service_id = Column(Integer, ForeignKey("subscription_services.service_id"), nullable=False)
    price_usd = Column(Numeric(10, 2), nullable=False)
    created_on = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, default=True)
    
    # Relationships
    tier = relationship("SubscriptionTier", back_populates="pricing")
    service = relationship("SubscriptionService", back_populates="pricing")
    
    # Unique constraint
    __table_args__ = (
        UniqueConstraint('tier_id', 'service_id', name='UQ_tier_service'),
    )
