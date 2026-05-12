from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from decimal import Decimal

# Subscription Tier Schemas
class SubscriptionTierBase(BaseModel):
    tier_name: str
    max_reports: int
    is_active: bool = True

class SubscriptionTierCreate(SubscriptionTierBase):
    pass

class SubscriptionTierUpdate(BaseModel):
    tier_name: Optional[str] = None
    max_reports: Optional[int] = None
    is_active: Optional[bool] = None

class SubscriptionTierResponse(SubscriptionTierBase):
    tier_id: int
    created_on: Optional[datetime] = None

    class Config:
        from_attributes = True

# Feature Schemas
class SubFeatureBase(BaseModel):
    sub_feature_key: str
    sub_feature_description: Optional[str] = None
    main_feature_key: str

class SubFeatureResponse(SubFeatureBase):
    class Config:
        from_attributes = True

class MainFeatureBase(BaseModel):
    main_feature_key: str
    sub_features: List[SubFeatureResponse]

class MainFeatureResponse(MainFeatureBase):
    class Config:
        from_attributes = True

# Subscription Service Schemas
class SubscriptionServiceBase(BaseModel):
    service_name: str
    service_description: Optional[str] = None
    is_active: bool = True

class SubscriptionServiceCreate(SubscriptionServiceBase):
    sub_feature_keys: Optional[List[str]] = None

class SubscriptionServiceUpdate(BaseModel):
    service_name: Optional[str] = None
    service_description: Optional[str] = None
    is_active: Optional[bool] = None
    sub_feature_keys: Optional[List[str]] = None

class SubscriptionServiceResponse(SubscriptionServiceBase):
    service_id: int
    created_on: Optional[datetime] = None
    sub_features: Optional[List[SubFeatureResponse]] = None

    class Config:
        from_attributes = True

# Subscription Pricing Schemas
class SubscriptionPricingBase(BaseModel):
    tier_id: int
    service_id: int
    price_usd: Decimal
    is_active: bool = True

class SubscriptionPricingCreate(SubscriptionPricingBase):
    pass

class SubscriptionPricingUpdate(BaseModel):
    price_usd: Optional[Decimal] = None
    is_active: Optional[bool] = None

class SubscriptionPricingResponse(SubscriptionPricingBase):
    pricing_id: int
    created_on: Optional[datetime] = None
    tier: Optional[SubscriptionTierResponse] = None
    service: Optional[SubscriptionServiceResponse] = None

    class Config:
        from_attributes = True

# Feature Mapping Schemas
class MainFeatureMappingBase(BaseModel):
    main_feature_key: str
    sub_feature_key: str
    sub_feature_description: Optional[str] = None

class MainFeatureMappingCreate(MainFeatureMappingBase):
    pass

class MainFeatureMappingResponse(MainFeatureMappingBase):
    mapping_id: int
    created_on: Optional[datetime] = None

    class Config:
        from_attributes = True

class SubscriptionFeatureMappingBase(BaseModel):
    service_id: int
    main_feature_key: str

class SubscriptionFeatureMappingCreate(SubscriptionFeatureMappingBase):
    pass

class SubscriptionFeatureMappingResponse(SubscriptionFeatureMappingBase):
    mapping_id: int
    created_on: Optional[datetime] = None
    service: Optional[SubscriptionServiceResponse] = None

    class Config:
        from_attributes = True

# Combined Response Schemas for Frontend
class SubscriptionPlanResponse(BaseModel):
    tiers: List[SubscriptionTierResponse]
    services: List[SubscriptionServiceResponse]
    pricing_matrix: dict  # {tier_id: {service_id: price}}

class PricingPlanResponse(BaseModel):
    tier: SubscriptionTierResponse
    service: SubscriptionServiceResponse
    total_price: Decimal
