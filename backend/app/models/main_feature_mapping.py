from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.sql import func
from app.db.base import BaseWithCustomPK

class MainFeatureMapping(BaseWithCustomPK):
    __tablename__ = "main_feature_mapping"

    mapping_id = Column(Integer, primary_key=True, index=True)
    main_feature_key = Column(String(100), nullable=False, index=True)
    sub_feature_key = Column(String(100), nullable=False, index=True)
    sub_feature_description = Column(Text, nullable=True)
    created_on = Column(DateTime(timezone=True), server_default=func.now())
