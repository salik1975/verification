from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any

from app.db.session import get_db
from app.crud import crud_subscription
from app.schemas.subscription import (
    SubscriptionTierCreate, SubscriptionTierUpdate, SubscriptionTierResponse,
    SubscriptionServiceCreate, SubscriptionServiceUpdate, SubscriptionServiceResponse,
    SubscriptionPricingCreate, SubscriptionPricingUpdate, SubscriptionPricingResponse,
    SubscriptionPlanResponse, PricingPlanResponse,
    MainFeatureResponse, SubFeatureResponse
)

router = APIRouter()

# ============================================================================
# SUBSCRIPTION PLANS (Public endpoints for frontend)
# ============================================================================

@router.get("/plans", response_model=SubscriptionPlanResponse)
def get_subscription_plans(db: Session = Depends(get_db)):
    """
    Get all subscription plans with pricing matrix for frontend display.
    This endpoint is used by SubscriptionPlanSelector component.
    """
    try:
        plans = crud_subscription.get_subscription_plans(db)
        return SubscriptionPlanResponse(**plans)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch subscription plans: {str(e)}")

@router.get("/pricing/{tier_id}/{service_id}")
def get_pricing_for_plan(tier_id: int, service_id: int, db: Session = Depends(get_db)):
    """
    Get pricing for a specific tier-service combination.
    """
    try:
        pricing = crud_subscription.get_pricing_for_plan(db, tier_id, service_id)
        if pricing is None:
            raise HTTPException(status_code=404, detail="Pricing not found for this combination")
        return {"price": float(pricing)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch pricing: {str(e)}")

# ============================================================================
# SUBSCRIPTION TIERS (Admin endpoints)
# ============================================================================

@router.get("/tiers", response_model=List[SubscriptionTierResponse])
def get_subscription_tiers(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """Get all subscription tiers"""
    try:
        tiers = crud_subscription.get_subscription_tiers(db, skip=skip, limit=limit)
        return tiers
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch subscription tiers: {str(e)}")

@router.get("/tiers/{tier_id}", response_model=SubscriptionTierResponse)
def get_subscription_tier(tier_id: int, db: Session = Depends(get_db)):
    """Get a specific subscription tier"""
    try:
        tier = crud_subscription.get_subscription_tier(db, tier_id)
        if not tier:
            raise HTTPException(status_code=404, detail="Subscription tier not found")
        return tier
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch subscription tier: {str(e)}")

@router.post("/tiers", response_model=SubscriptionTierResponse)
def create_subscription_tier(tier: SubscriptionTierCreate, db: Session = Depends(get_db)):
    """Create a new subscription tier"""
    try:
        # Check if tier name already exists
        existing_tier = crud_subscription.get_subscription_tier_by_name(db, tier.tier_name)
        if existing_tier:
            raise HTTPException(status_code=400, detail="Tier name already exists")
        
        return crud_subscription.create_subscription_tier(db, tier)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create subscription tier: {str(e)}")

@router.put("/tiers/{tier_id}", response_model=SubscriptionTierResponse)
def update_subscription_tier(tier_id: int, tier: SubscriptionTierUpdate, db: Session = Depends(get_db)):
    """Update a subscription tier"""
    try:
        updated_tier = crud_subscription.update_subscription_tier(db, tier_id, tier)
        if not updated_tier:
            raise HTTPException(status_code=404, detail="Subscription tier not found")
        return updated_tier
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update subscription tier: {str(e)}")

@router.delete("/tiers/{tier_id}")
def delete_subscription_tier(tier_id: int, db: Session = Depends(get_db)):
    """Delete a subscription tier"""
    try:
        # Check if tier exists
        tier = crud_subscription.get_subscription_tier(db, tier_id)
        if not tier:
            raise HTTPException(status_code=404, detail="Subscription tier not found")

        # Protect default tiers (Bronze=1, Silver=2, Gold=3) from deletion
        DEFAULT_TIER_IDS = [1, 2, 3]
        DEFAULT_TIER_NAMES = ['Bronze', 'Silver', 'Gold']
        if tier_id in DEFAULT_TIER_IDS or tier.tier_name in DEFAULT_TIER_NAMES:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot delete default tier '{tier.tier_name}'. Default tiers (Bronze, Silver, Gold) are protected."
            )

        # Check if any tenants are using this tier
        from app.models.tenant import Tenant
        tenant_count = db.query(Tenant).filter(Tenant.subscription_tier_id == tier_id).count()
        if tenant_count > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot delete tier '{tier.tier_name}'. {tenant_count} tenant(s) are currently using this tier."
            )

        # Check if any pricing plans reference this tier
        from app.models.subscription_pricing import SubscriptionPricing
        pricing_count = db.query(SubscriptionPricing).filter(SubscriptionPricing.tier_id == tier_id).count()
        if pricing_count > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot delete tier '{tier.tier_name}'. {pricing_count} pricing plan(s) reference this tier. Delete the pricing plans first."
            )

        success = crud_subscription.delete_subscription_tier(db, tier_id)
        if not success:
            raise HTTPException(status_code=404, detail="Subscription tier not found")
        return {"message": "Subscription tier deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete subscription tier: {str(e)}")

# ============================================================================
# SUBSCRIPTION SERVICES (Admin endpoints)
# ============================================================================

@router.get("/services", response_model=List[SubscriptionServiceResponse])
def get_subscription_services(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """Get all subscription services"""
    try:
        services = crud_subscription.get_subscription_services(db, skip=skip, limit=limit)
        return services
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch subscription services: {str(e)}")

@router.get("/services/{service_id}", response_model=SubscriptionServiceResponse)
def get_subscription_service(service_id: int, db: Session = Depends(get_db)):
    """Get a specific subscription service"""
    try:
        service = crud_subscription.get_subscription_service(db, service_id)
        if not service:
            raise HTTPException(status_code=404, detail="Subscription service not found")
        return service
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch subscription service: {str(e)}")

@router.post("/services", response_model=SubscriptionServiceResponse)
def create_subscription_service(service: SubscriptionServiceCreate, db: Session = Depends(get_db)):
    """Create a new subscription service"""
    try:
        # Check if service name already exists
        existing_service = crud_subscription.get_subscription_service_by_name(db, service.service_name)
        if existing_service:
            raise HTTPException(status_code=400, detail="Service name already exists")
        
        return crud_subscription.create_subscription_service(db, service)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create subscription service: {str(e)}")

@router.put("/services/{service_id}", response_model=SubscriptionServiceResponse)
def update_subscription_service(service_id: int, service: SubscriptionServiceUpdate, db: Session = Depends(get_db)):
    """Update a subscription service"""
    try:
        updated_service = crud_subscription.update_subscription_service(db, service_id, service)
        if not updated_service:
            raise HTTPException(status_code=404, detail="Subscription service not found")
        return updated_service
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update subscription service: {str(e)}")

@router.delete("/services/{service_id}")
def delete_subscription_service(service_id: int, db: Session = Depends(get_db)):
    """Delete a subscription service"""
    try:
        # Check if service exists
        from app.models.subscription_service import SubscriptionService
        service = db.query(SubscriptionService).filter(SubscriptionService.service_id == service_id).first()
        if not service:
            raise HTTPException(status_code=404, detail="Subscription service not found")

        # Protect default services (IDs 1, 2, 3) from deletion
        DEFAULT_SERVICE_IDS = [1, 2, 3]
        DEFAULT_SERVICE_NAMES = ['Document Verification', 'SMS & Email Verification', 'Complete Bundle']
        if service_id in DEFAULT_SERVICE_IDS or service.service_name in DEFAULT_SERVICE_NAMES:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot delete default service '{service.service_name}'. Default services are protected."
            )

        # Check if any tenants are using this service
        from app.models.tenant import Tenant
        tenant_count = db.query(Tenant).filter(Tenant.subscription_service_id == service_id).count()
        if tenant_count > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot delete service '{service.service_name}'. {tenant_count} tenant(s) are currently using this service."
            )

        # Check if any pricing plans reference this service
        from app.models.subscription_pricing import SubscriptionPricing
        pricing_count = db.query(SubscriptionPricing).filter(SubscriptionPricing.service_id == service_id).count()
        if pricing_count > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot delete service '{service.service_name}'. {pricing_count} pricing plan(s) reference this service. Delete the pricing plans first."
            )

        # Delete feature mappings first (cascade)
        from app.models.subscription_feature_mapping import SubscriptionFeatureMapping
        db.query(SubscriptionFeatureMapping).filter(SubscriptionFeatureMapping.service_id == service_id).delete()

        # Now delete the service
        db.delete(service)
        db.commit()

        return {"message": "Subscription service deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete subscription service: {str(e)}")

# ============================================================================
# SUBSCRIPTION PRICING (Admin endpoints)
# ============================================================================

@router.get("/pricing", response_model=List[SubscriptionPricingResponse])
def get_subscription_pricing(
    db: Session = Depends(get_db)
):
    """Get all subscription pricing"""
    try:
        pricing_list = crud_subscription.get_all_pricing(db)
        return pricing_list
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch subscription pricing: {str(e)}")

@router.get("/pricing/{pricing_id}", response_model=SubscriptionPricingResponse)
def get_subscription_pricing_by_id(pricing_id: int, db: Session = Depends(get_db)):
    """Get a specific subscription pricing"""
    try:
        pricing = crud_subscription.get_subscription_pricing(db, pricing_id)
        if not pricing:
            raise HTTPException(status_code=404, detail="Subscription pricing not found")
        return pricing
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch subscription pricing: {str(e)}")

@router.post("/pricing", response_model=SubscriptionPricingResponse)
def create_subscription_pricing(pricing: SubscriptionPricingCreate, db: Session = Depends(get_db)):
    """Create a new subscription pricing"""
    try:
        # Check if pricing already exists for this tier-service combination
        existing_pricing = crud_subscription.get_pricing_by_tier_service(db, pricing.tier_id, pricing.service_id)
        if existing_pricing:
            raise HTTPException(status_code=400, detail="Pricing already exists for this tier-service combination")
        
        return crud_subscription.create_subscription_pricing(db, pricing)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create subscription pricing: {str(e)}")

@router.put("/pricing/{pricing_id}", response_model=SubscriptionPricingResponse)
def update_subscription_pricing(pricing_id: int, pricing: SubscriptionPricingUpdate, db: Session = Depends(get_db)):
    """Update a subscription pricing"""
    try:
        updated_pricing = crud_subscription.update_subscription_pricing(db, pricing_id, pricing)
        if not updated_pricing:
            raise HTTPException(status_code=404, detail="Subscription pricing not found")
        return updated_pricing
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update subscription pricing: {str(e)}")

@router.delete("/pricing/{pricing_id}")
def delete_subscription_pricing(pricing_id: int, db: Session = Depends(get_db)):
    """Delete a subscription pricing"""
    try:
        success = crud_subscription.delete_subscription_pricing(db, pricing_id)
        if not success:
            raise HTTPException(status_code=404, detail="Subscription pricing not found")
        return {"message": "Subscription pricing deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete subscription pricing: {str(e)}")

# ============================================================================
# SUBSCRIPTION USAGE STATISTICS (Admin endpoints)
# ============================================================================

@router.get("/usage/statistics", response_model=Dict[str, Any])
def get_subscription_usage_statistics(
    days_back: int = Query(30, ge=1, le=365, description="Days of data to retrieve"),
    db: Session = Depends(get_db)
):
    """
    Get overall subscription usage statistics across all tiers and services
    """
    try:
        from datetime import datetime, timedelta
        import pyodbc
        import os
        from dotenv import load_dotenv
        
        # Calculate date range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days_back)
        
        # Load env vars for DB connection
        load_dotenv()
        db_server = os.getenv('DB_SERVER')
        db_name = os.getenv('DB_NAME')
        db_user = os.getenv('DB_USER')
        db_password = os.getenv('DB_PASSWORD')
        
        conn = pyodbc.connect(
            f"DRIVER={{ODBC Driver 18 for SQL Server}};"
            f"SERVER={db_server};"
            f"DATABASE={db_name};"
            f"UID={db_user};"
            f"PWD={db_password};"
            "TrustServerCertificate=yes;"
            "Connection Timeout=20;"
        )
        cursor = conn.cursor()
        
        # Get overall usage statistics
        cursor.execute("""
            SELECT 
                COUNT(*) as total_reports,
                SUM(CASE WHEN DocumentVerification = 1 THEN 1 ELSE 0 END) as document_reports,
                SUM(CASE WHEN PhoneVerification = 1 THEN 1 ELSE 0 END) as sms_reports,
                SUM(CASE WHEN EmailVerification = 1 THEN 1 ELSE 0 END) as email_reports
            FROM VerificationLog 
            WHERE CreatedOn >= ? AND CreatedOn <= ?
            AND IsActive = 1
        """, start_date, end_date)
        
        stats_row = cursor.fetchone()
        overall_stats = {
            "total_reports": stats_row.total_reports or 0,
            "document_reports": stats_row.document_reports or 0,
            "sms_reports": stats_row.sms_reports or 0,
            "email_reports": stats_row.email_reports or 0,
            "period_days": days_back
        }
        
        # Calculate weekly average
        if days_back >= 7:
            overall_stats["weekly_average"] = round((overall_stats["total_reports"] * 7) / days_back, 2)
        else:
            overall_stats["weekly_average"] = overall_stats["total_reports"]
        
        conn.close()
        
        return {
            "status": "success",
            "overall_stats": overall_stats,
            "period": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "days_back": days_back
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch usage statistics: {str(e)}")

@router.get("/usage/tiers", response_model=Dict[str, Any])
def get_tier_usage_statistics(
    days_back: int = Query(30, ge=1, le=365, description="Days of data to retrieve"),
    db: Session = Depends(get_db)
):
    """
    Get usage statistics grouped by subscription tiers
    """
    try:
        from datetime import datetime, timedelta
        import pyodbc
        import os
        from dotenv import load_dotenv
        
        # Calculate date range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days_back)
        
        # Load env vars for DB connection
        load_dotenv()
        db_server = os.getenv('DB_SERVER')
        db_name = os.getenv('DB_NAME')
        db_user = os.getenv('DB_USER')
        db_password = os.getenv('DB_PASSWORD')
        
        conn = pyodbc.connect(
            f"DRIVER={{ODBC Driver 18 for SQL Server}};"
            f"SERVER={db_server};"
            f"DATABASE={db_name};"
            f"UID={db_user};"
            f"PWD={db_password};"
            "TrustServerCertificate=yes;"
            "Connection Timeout=20;"
        )
        cursor = conn.cursor()
        
        # Get tier usage statistics
        cursor.execute("""
            SELECT 
                st.tier_name,
                st.tier_id,
                COUNT(DISTINCT t.tenant_id) as active_tenants,
                (SELECT COUNT(*) FROM VerificationLog WHERE CreatedOn >= ? AND CreatedOn <= ? AND IsActive = 1) as total_reports,
                COUNT(DISTINCT CASE WHEN t.onboarding_date >= DATEADD(day, -30, GETDATE()) THEN t.tenant_id END) as this_month_reports
            FROM subscription_tiers st
            LEFT JOIN tenant t ON st.tier_id = t.subscription_tier_id AND t.is_active = 1
            WHERE st.is_active = 1
            GROUP BY st.tier_id, st.tier_name
            ORDER BY st.tier_id
        """, start_date, end_date)
        
        tier_stats = []
        for row in cursor.fetchall():
            tier_stats.append({
                "tier_id": row.tier_id,
                "tier_name": row.tier_name,
                "total_reports": row.total_reports or 0,
                "active_tenants": row.active_tenants or 0,
                "this_month_reports": row.this_month_reports or 0
            })
        
        conn.close()
        
        return {
            "status": "success",
            "tier_statistics": tier_stats,
            "period": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "days_back": days_back
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch tier usage statistics: {str(e)}")

@router.get("/usage/services", response_model=Dict[str, Any])
def get_service_usage_statistics(
    days_back: int = Query(30, ge=1, le=365, description="Days of data to retrieve"),
    db: Session = Depends(get_db)
):
    """
    Get usage statistics grouped by subscription services
    """
    try:
        from datetime import datetime, timedelta
        import pyodbc
        import os
        from dotenv import load_dotenv
        
        # Calculate date range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days_back)
        
        # Load env vars for DB connection
        load_dotenv()
        db_server = os.getenv('DB_SERVER')
        db_name = os.getenv('DB_NAME')
        db_user = os.getenv('DB_USER')
        db_password = os.getenv('DB_PASSWORD')
        
        conn = pyodbc.connect(
            f"DRIVER={{ODBC Driver 18 for SQL Server}};"
            f"SERVER={db_server};"
            f"DATABASE={db_name};"
            f"UID={db_user};"
            f"PWD={db_password};"
            "TrustServerCertificate=yes;"
            "Connection Timeout=20;"
        )
        cursor = conn.cursor()
        
        # Get service usage statistics
        cursor.execute("""
            SELECT 
                ss.service_name,
                ss.service_id,
                COUNT(DISTINCT t.tenant_id) as active_tenants,
                (SELECT COUNT(*) FROM VerificationLog WHERE CreatedOn >= ? AND CreatedOn <= ? AND IsActive = 1) as total_reports,
                COUNT(DISTINCT CASE WHEN t.onboarding_date >= DATEADD(day, -30, GETDATE()) THEN t.tenant_id END) as this_month_reports
            FROM subscription_services ss
            LEFT JOIN tenant t ON ss.service_id = t.subscription_service_id AND t.is_active = 1
            WHERE ss.is_active = 1
            GROUP BY ss.service_id, ss.service_name
            ORDER BY ss.service_id
        """, start_date, end_date)
        
        service_stats = []
        for row in cursor.fetchall():
            service_stats.append({
                "service_id": row.service_id,
                "service_name": row.service_name,
                "total_reports": row.total_reports or 0,
                "active_tenants": row.active_tenants or 0,
                "this_month_reports": row.this_month_reports or 0
            })
        
        conn.close()
        
        return {
            "status": "success",
            "service_statistics": service_stats,
            "period": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "days_back": days_back
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch service usage statistics: {str(e)}")

# ============================================================================
# FEATURE MANAGEMENT (Admin endpoints)
# ============================================================================

@router.get("/features", response_model=List[MainFeatureResponse])
def get_all_features(db: Session = Depends(get_db)):
    """Get all main features with their sub-features"""
    try:
        features = crud_subscription.get_all_features(db)
        return features
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch features: {str(e)}")

@router.get("/features/main", response_model=List[MainFeatureResponse])
def get_main_features(db: Session = Depends(get_db)):
    """Get all main features with their sub-features"""
    try:
        features = crud_subscription.get_main_features(db)
        return features
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch main features: {str(e)}")

@router.get("/features/sub/{main_feature_key}", response_model=List[SubFeatureResponse])
def get_sub_features(main_feature_key: str, db: Session = Depends(get_db)):
    """Get sub-features for a specific main feature"""
    try:
        sub_features = crud_subscription.get_sub_features(db, main_feature_key)
        return sub_features
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch sub features: {str(e)}")
