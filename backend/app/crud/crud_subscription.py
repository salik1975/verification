from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List, Optional, Dict, Any
from decimal import Decimal

# We'll import models dynamically in functions to avoid circular imports
from app.schemas.subscription import (
    SubscriptionTierCreate, SubscriptionTierUpdate,
    SubscriptionServiceCreate, SubscriptionServiceUpdate,
    SubscriptionPricingCreate, SubscriptionPricingUpdate
)

# Subscription Tier CRUD
def create_subscription_tier(db: Session, tier: SubscriptionTierCreate):
    from app.models.subscription_tier import SubscriptionTier
    db_tier = SubscriptionTier(**tier.dict())
    db.add(db_tier)
    db.commit()
    db.refresh(db_tier)
    return db_tier

def get_subscription_tier(db: Session, tier_id: int):
    from app.models.subscription_tier import SubscriptionTier
    return db.query(SubscriptionTier).filter(SubscriptionTier.tier_id == tier_id).first()

def get_subscription_tier_by_name(db: Session, tier_name: str):
    from app.models.subscription_tier import SubscriptionTier
    return db.query(SubscriptionTier).filter(SubscriptionTier.tier_name == tier_name).first()

def get_subscription_tiers(db: Session, skip: int = 0, limit: int = 100):
    from app.models.subscription_tier import SubscriptionTier
    query = db.query(SubscriptionTier)
    return query.order_by(SubscriptionTier.tier_id).all()

def update_subscription_tier(db: Session, tier_id: int, tier: SubscriptionTierUpdate):
    from app.models.subscription_tier import SubscriptionTier
    db_tier = get_subscription_tier(db, tier_id)
    if db_tier:
        update_data = tier.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_tier, field, value)
        db.commit()
        db.refresh(db_tier)
    return db_tier

def delete_subscription_tier(db: Session, tier_id: int) -> bool:
    from app.models.subscription_tier import SubscriptionTier
    db_tier = get_subscription_tier(db, tier_id)
    if db_tier:
        db.delete(db_tier)
        db.commit()
        return True
    return False

# Subscription Service CRUD
def create_subscription_service(db: Session, service: SubscriptionServiceCreate):
    from app.models.subscription_service import SubscriptionService
    from app.models.subscription_feature_mapping import SubscriptionFeatureMapping
    from app.models.main_feature_mapping import MainFeatureMapping
    
    # Extract sub_feature_keys from the service data
    service_data = service.dict()
    sub_feature_keys = service_data.pop('sub_feature_keys', [])
    
    # Create the service
    db_service = SubscriptionService(**service_data)
    db.add(db_service)
    db.commit()
    db.refresh(db_service)
    
    # Create main feature mappings based on sub-feature keys
    if sub_feature_keys:
        # Get unique main feature keys for the provided sub-features
        # Exclude ENABLE_COMPLETE_BUNDLE as it's redundant and causes duplicates
        main_feature_keys = db.query(MainFeatureMapping.main_feature_key).filter(
            MainFeatureMapping.sub_feature_key.in_(sub_feature_keys),
            MainFeatureMapping.main_feature_key != 'ENABLE_COMPLETE_BUNDLE'
        ).distinct().all()
        
        # Create subscription feature mappings
        for (main_feature_key,) in main_feature_keys:
            mapping = SubscriptionFeatureMapping(
                service_id=db_service.service_id,
                main_feature_key=main_feature_key
            )
            db.add(mapping)
        db.commit()
        db.refresh(db_service)

    return get_subscription_service(db, db_service.service_id)

def get_subscription_service(db: Session, service_id: int):
    from app.models.subscription_service import SubscriptionService
    from app.models.subscription_feature_mapping import SubscriptionFeatureMapping
    from app.models.main_feature_mapping import MainFeatureMapping
    
    service = db.query(SubscriptionService).filter(SubscriptionService.service_id == service_id).first()
    
    if service:
        # Get main feature mappings for this service
        main_feature_mappings = db.query(SubscriptionFeatureMapping).filter(
            SubscriptionFeatureMapping.service_id == service.service_id
        ).all()
        
        # Get all sub-features for the main features (with deduplication)
        # Exclude ENABLE_COMPLETE_BUNDLE to avoid duplicates since it contains all sub-features
        sub_features = []
        seen_keys = set()
        for mapping in main_feature_mappings:
            # Skip ENABLE_COMPLETE_BUNDLE as it's redundant and causes duplicates
            if mapping.main_feature_key == 'ENABLE_COMPLETE_BUNDLE':
                continue
                
            sub_features_for_main = db.query(MainFeatureMapping).filter(
                MainFeatureMapping.main_feature_key == mapping.main_feature_key
            ).all()
            
            for sub_feature in sub_features_for_main:
                if sub_feature.sub_feature_key not in seen_keys:
                    sub_features.append({
                        'sub_feature_key': sub_feature.sub_feature_key,
                        'sub_feature_description': sub_feature.sub_feature_description,
                        'main_feature_key': sub_feature.main_feature_key
                    })
                    seen_keys.add(sub_feature.sub_feature_key)
        
        service.sub_features = sub_features
    
    return service

def get_subscription_service_by_name(db: Session, service_name: str):
    from app.models.subscription_service import SubscriptionService
    return db.query(SubscriptionService).filter(SubscriptionService.service_name == service_name).first()

def get_subscription_services(db: Session, skip: int = 0, limit: int = 100):
    from app.models.subscription_service import SubscriptionService
    from app.models.subscription_feature_mapping import SubscriptionFeatureMapping
    from app.models.main_feature_mapping import MainFeatureMapping
    
    query = db.query(SubscriptionService)
    services = query.order_by(SubscriptionService.service_id).all()
    
    # Add sub-features to each service
    for service in services:
        # Get main feature mappings for this service
        main_feature_mappings = db.query(SubscriptionFeatureMapping).filter(
            SubscriptionFeatureMapping.service_id == service.service_id
        ).all()
        
        # Get all sub-features for the main features (with deduplication)
        # Exclude ENABLE_COMPLETE_BUNDLE to avoid duplicates since it contains all sub-features
        sub_features = []
        seen_keys = set()
        for mapping in main_feature_mappings:
            # Skip ENABLE_COMPLETE_BUNDLE as it's redundant and causes duplicates
            if mapping.main_feature_key == 'ENABLE_COMPLETE_BUNDLE':
                continue
                
            sub_features_for_main = db.query(MainFeatureMapping).filter(
                MainFeatureMapping.main_feature_key == mapping.main_feature_key
            ).all()
            
            for sub_feature in sub_features_for_main:
                if sub_feature.sub_feature_key not in seen_keys:
                    sub_features.append({
                        'sub_feature_key': sub_feature.sub_feature_key,
                        'sub_feature_description': sub_feature.sub_feature_description,
                        'main_feature_key': sub_feature.main_feature_key
                    })
                    seen_keys.add(sub_feature.sub_feature_key)
        
        service.sub_features = sub_features
    
    return services

def update_subscription_service(db: Session, service_id: int, service: SubscriptionServiceUpdate):
    from app.models.subscription_service import SubscriptionService
    from app.models.subscription_feature_mapping import SubscriptionFeatureMapping
    from app.models.main_feature_mapping import MainFeatureMapping
    
    db_service = get_subscription_service(db, service_id)
    if db_service:
        update_data = service.dict(exclude_unset=True)
        sub_feature_keys = update_data.pop('sub_feature_keys', None)
        
        # Update basic service fields
        for field, value in update_data.items():
            setattr(db_service, field, value)
        
        # Update main feature mappings if provided
        if sub_feature_keys is not None:
            # Delete existing mappings
            db.query(SubscriptionFeatureMapping).filter(
                SubscriptionFeatureMapping.service_id == service_id
            ).delete()
            
            # Create new mappings based on sub-feature keys
            if sub_feature_keys:
                # Get unique main feature keys for the provided sub-features
                # Exclude ENABLE_COMPLETE_BUNDLE as it's redundant and causes duplicates
                main_feature_keys = db.query(MainFeatureMapping.main_feature_key).filter(
                    MainFeatureMapping.sub_feature_key.in_(sub_feature_keys),
                    MainFeatureMapping.main_feature_key != 'ENABLE_COMPLETE_BUNDLE'
                ).distinct().all()
                
                # Create subscription feature mappings
                for (main_feature_key,) in main_feature_keys:
                    mapping = SubscriptionFeatureMapping(
                        service_id=service_id,
                        main_feature_key=main_feature_key
                    )
                    db.add(mapping)
        
        db.commit()
        db.refresh(db_service)
        return get_subscription_service(db, service_id)
    return db_service

def delete_subscription_service(db: Session, service_id: int) -> bool:
    from app.models.subscription_service import SubscriptionService
    db_service = get_subscription_service(db, service_id)
    if db_service:
        db.delete(db_service)
        db.commit()
        return True
    return False

# Subscription Pricing CRUD
def create_subscription_pricing(db: Session, pricing: SubscriptionPricingCreate):
    from app.models.subscription_pricing import SubscriptionPricing
    db_pricing = SubscriptionPricing(**pricing.dict())
    db.add(db_pricing)
    db.commit()
    db.refresh(db_pricing)
    return db_pricing

def get_subscription_pricing(db: Session, pricing_id: int):
    from app.models.subscription_pricing import SubscriptionPricing
    return db.query(SubscriptionPricing).filter(SubscriptionPricing.pricing_id == pricing_id).first()

def get_pricing_by_tier_service(db: Session, tier_id: int, service_id: int):
    from app.models.subscription_pricing import SubscriptionPricing
    return db.query(SubscriptionPricing).filter(
        and_(
            SubscriptionPricing.tier_id == tier_id,
            SubscriptionPricing.service_id == service_id,
            SubscriptionPricing.is_active == True
        )
    ).first()

def get_all_pricing(db: Session):
    from app.models.subscription_pricing import SubscriptionPricing
    query = db.query(SubscriptionPricing)
    return query.order_by(SubscriptionPricing.pricing_id).all()

def update_subscription_pricing(db: Session, pricing_id: int, pricing: SubscriptionPricingUpdate):
    from app.models.subscription_pricing import SubscriptionPricing
    db_pricing = get_subscription_pricing(db, pricing_id)
    if db_pricing:
        update_data = pricing.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_pricing, field, value)
        db.commit()
        db.refresh(db_pricing)
    return db_pricing

def delete_subscription_pricing(db: Session, pricing_id: int) -> bool:
    from app.models.subscription_pricing import SubscriptionPricing
    db_pricing = get_subscription_pricing(db, pricing_id)
    if db_pricing:
        db.delete(db_pricing)
        db.commit()
        return True
    return False

# Feature Management CRUD
def get_main_feature_mappings(db: Session, main_feature_key: Optional[str] = None):
    from app.models.main_feature_mapping import MainFeatureMapping
    query = db.query(MainFeatureMapping)
    if main_feature_key:
        query = query.filter(MainFeatureMapping.main_feature_key == main_feature_key)
    return query.all()

def get_subscription_feature_mappings(db: Session, service_id: Optional[int] = None):
    from app.models.subscription_feature_mapping import SubscriptionFeatureMapping
    query = db.query(SubscriptionFeatureMapping)
    if service_id:
        query = query.filter(SubscriptionFeatureMapping.service_id == service_id)
    return query.all()

def get_all_features(db: Session) -> List[Dict[str, Any]]:
    """Get all main features with their sub-features"""
    from app.models.main_feature_mapping import MainFeatureMapping
    
    # Get all main feature keys, excluding ENABLE_COMPLETE_BUNDLE as it's redundant
    main_feature_keys = db.query(MainFeatureMapping.main_feature_key).filter(
        MainFeatureMapping.main_feature_key != 'ENABLE_COMPLETE_BUNDLE'
    ).distinct().all()
    
    features = []
    for (main_feature_key,) in main_feature_keys:
        # Get all sub-features for this main feature
        sub_features = db.query(MainFeatureMapping).filter(
            MainFeatureMapping.main_feature_key == main_feature_key
        ).all()
        
        features.append({
            'main_feature_key': main_feature_key,
            'sub_features': [
                {
                    'sub_feature_key': sf.sub_feature_key,
                    'sub_feature_description': sf.sub_feature_description,
                    'main_feature_key': sf.main_feature_key
                }
                for sf in sub_features
            ]
        })
    
    return features

def get_main_features(db: Session) -> List[Dict[str, Any]]:
    """Get all main features with their sub-features"""
    return get_all_features(db)

def get_sub_features(db: Session, main_feature_key: str) -> List[Dict[str, Any]]:
    """Get sub-features for a specific main feature"""
    from app.models.main_feature_mapping import MainFeatureMapping
    
    sub_features = db.query(MainFeatureMapping).filter(
        MainFeatureMapping.main_feature_key == main_feature_key
    ).all()
    
    return [
        {
            'sub_feature_key': sf.sub_feature_key,
            'sub_feature_description': sf.sub_feature_description,
            'main_feature_key': sf.main_feature_key
        }
        for sf in sub_features
    ]

# Combined functions for frontend
def get_subscription_plans(db: Session) -> Dict[str, Any]:
    """Get all subscription plans with pricing matrix for frontend"""
    tiers = get_subscription_tiers(db)
    services = get_subscription_services(db)
    pricing_list = get_all_pricing(db)
    
    # Build pricing matrix
    pricing_matrix = {}
    for pricing in pricing_list:
        if pricing.tier_id not in pricing_matrix:
            pricing_matrix[pricing.tier_id] = {}
        pricing_matrix[pricing.tier_id][pricing.service_id] = float(pricing.price_usd)
    
    return {
        "tiers": tiers,
        "services": services,
        "pricing_matrix": pricing_matrix
    }

def get_pricing_for_plan(db: Session, tier_id: int, service_id: int):
    """Get pricing for a specific tier-service combination"""
    pricing = get_pricing_by_tier_service(db, tier_id, service_id)
    return pricing.price_usd if pricing else None
