from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.base import BaseWithCustomPK

class SubscriptionFeatureMapping(BaseWithCustomPK):
    __tablename__ = "subscription_feature_mapping"

    mapping_id = Column(Integer, primary_key=True, index=True)
    service_id = Column(Integer, ForeignKey("subscription_services.service_id"), nullable=False)
    main_feature_key = Column(String(100), nullable=False, index=True)
    created_on = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    service = relationship("SubscriptionService", back_populates="feature_mappings")
