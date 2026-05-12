from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import Dict, Any, List, Optional
import json
import bcrypt
from datetime import datetime, timedelta
from sqlalchemy import func
import logging

logger = logging.getLogger(__name__)

from app.db.session import get_db
from app.models.app_user import AppUser as User
from app.models.tenant import Tenant
from app.models.role import Role
from app.models.user_role_access import UserRoleAccess
from app.models.subscription_tier import SubscriptionTier
from app.models.subscription_service import SubscriptionService
from app.models.subscription_pricing import SubscriptionPricing
from app.schemas.tenant import TenantOnboardingRequest, TenantOnboardingResponse, TenantOnboardingValidationError, TenantOnboardingValidationResponse

router = APIRouter()

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def hash_password_bcrypt(password: str) -> str:
    """Hash password with bcrypt"""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def get_tenant_usage_analytics(db: Session, tenant_id: int, days_back: int = 30) -> Dict[str, Any]:
    """
    Get usage analytics for a tenant from VerificationLog
    """
    try:
        # Calculate date range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days_back)
        
        # Get total verification counts by type
        # Note: Using raw SQL for compatibility with existing database structure
        import pyodbc
        import os
        from dotenv import load_dotenv
        
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
        
        # Get daily usage data for charts - filtered by tenant
        cursor.execute("""
            SELECT
                CAST(vl.CreatedOn AS DATE) as usage_date,
                COUNT(*) as report_count,
                SUM(CASE WHEN vl.DocumentVerification = 1 THEN 1 ELSE 0 END) as document_reports,
                SUM(CASE WHEN vl.PhoneVerification = 1 THEN 1 ELSE 0 END) as sms_reports,
                SUM(CASE WHEN vl.EmailVerification = 1 THEN 1 ELSE 0 END) as email_reports
            FROM VerificationLog vl
            INNER JOIN app_user au ON vl.UserID = au.user_id
            WHERE vl.CreatedOn >= ? AND vl.CreatedOn <= ?
            AND vl.IsActive = 1
            AND au.tenant_id = ?
            GROUP BY CAST(vl.CreatedOn AS DATE)
            ORDER BY usage_date DESC
        """, start_date, end_date, tenant_id)
        
        daily_usage = []
        for row in cursor.fetchall():
            daily_usage.append({
                "date": row.usage_date.isoformat(),
                "reports": row.report_count,
                "document_reports": row.document_reports,
                "sms_reports": row.sms_reports,
                "email_reports": row.email_reports
            })
        
        # Get overall usage statistics - filtered by tenant
        cursor.execute("""
            SELECT
                COUNT(*) as total_reports,
                SUM(CASE WHEN vl.DocumentVerification = 1 THEN 1 ELSE 0 END) as document_reports,
                SUM(CASE WHEN vl.PhoneVerification = 1 THEN 1 ELSE 0 END) as sms_reports,
                SUM(CASE WHEN vl.EmailVerification = 1 THEN 1 ELSE 0 END) as email_reports
            FROM VerificationLog vl
            INNER JOIN app_user au ON vl.UserID = au.user_id
            WHERE vl.CreatedOn >= ? AND vl.CreatedOn <= ?
            AND vl.IsActive = 1
            AND au.tenant_id = ?
        """, start_date, end_date, tenant_id)
        
        stats_row = cursor.fetchone()
        usage_stats = {
            "total_reports": stats_row.total_reports or 0,
            "document_reports": stats_row.document_reports or 0,
            "sms_reports": stats_row.sms_reports or 0,
            "email_reports": stats_row.email_reports or 0,
            "period_days": days_back
        }
        
        # Calculate weekly average
        if days_back >= 7:
            usage_stats["weekly_average"] = round((usage_stats["total_reports"] * 7) / days_back, 2)
        else:
            usage_stats["weekly_average"] = usage_stats["total_reports"]
        
        conn.close()
        
        return {
            "daily_usage": daily_usage,
            "usage_stats": usage_stats
        }

    except Exception as e:
        logger.error(f"Error getting usage analytics: {e}")
        # Return empty data structure if there's an error
        return {
            "daily_usage": [],
            "usage_stats": {
                "total_reports": 0,
                "document_reports": 0,
                "sms_reports": 0,
                "email_reports": 0,
                "weekly_average": 0,
                "period_days": days_back
            }
        }

# ============================================================================
# RESTFUL ENDPOINTS (Primary API)
# ============================================================================

@router.get("/tenants", response_model=Dict[str, Any])
def get_tenants(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    include_users: bool = Query(True),
    active_only: bool = Query(False),
    detailed: bool = Query(True),
    db: Session = Depends(get_db)
):
    """
    Get tenant information with optional detailed data
    - detailed=True: Full tenant details with usage analytics (enhanced)
    - detailed=False: Basic tenant information (simple)
    """
    try:
        # Base query with ORDER BY for SQL Server compatibility
        query = db.query(Tenant).order_by(Tenant.tenant_id)
        
        if active_only:
            query = query.filter(Tenant.is_active == True)
            
        tenants = query.offset(skip).limit(limit).all()
        
        tenant_list = []
        total_users = 0
        total_reports_used = 0
        monthly_revenue = 0.0
        active_tenant_count = 0
        
        # Get all tiers and services once to avoid repeated queries
        tiers = {t.tier_id: t for t in db.query(SubscriptionTier).all()}
        services = {s.service_id: s for s in db.query(SubscriptionService).all()}
        
        for tenant in tenants:
            try:
                # Get basic user count
                total_tenant_users = db.query(User).filter(User.tenant_id == tenant.tenant_id).count()
                
                # Get role counts
                admin_count = 0
                operator_count = 0
                
                if detailed:
                    # Detailed role counting with joins
                    admin_count = db.query(User).join(UserRoleAccess).join(Role).filter(
                        User.tenant_id == tenant.tenant_id,
                        Role.name == 'admin'
                    ).count()
                    
                    operator_count = db.query(User).join(UserRoleAccess).join(Role).filter(
                        User.tenant_id == tenant.tenant_id,
                        Role.name == 'operator'
                    ).count()
                
                # Get pricing information
                monthly_price = 0.0
                max_reports = 0
                tier_name = "Unknown"
                service_name = "Unknown"
                
                # Get tier info
                if tenant.subscription_tier_id and tenant.subscription_tier_id in tiers:
                    tier = tiers[tenant.subscription_tier_id]
                    tier_name = tier.tier_name
                    max_reports = tier.max_reports
                
                # Get service info
                if tenant.subscription_service_id and tenant.subscription_service_id in services:
                    service = services[tenant.subscription_service_id]
                    service_name = service.service_name
                
                # Get pricing
                if tenant.subscription_tier_id and tenant.subscription_service_id:
                    pricing = db.query(SubscriptionPricing).filter(
                        SubscriptionPricing.tier_id == tenant.subscription_tier_id,
                        SubscriptionPricing.service_id == tenant.subscription_service_id,
                        SubscriptionPricing.is_active == True
                    ).first()
                    
                    if pricing:
                        monthly_price = float(pricing.price_usd)
                
                # Calculate days left and status
                days_left = 0
                status = "expired"
                
                if tenant.subscription_end_date:
                    days_left = (tenant.subscription_end_date - datetime.now()).days
                    
                    if days_left < 0:
                        status = "expired"
                    elif days_left <= 5:
                        status = "expiring_soon"
                    else:
                        status = "active"
                        active_tenant_count += 1
                
                # Get users if requested
                users_data = []
                if include_users and total_tenant_users > 0:
                    users = db.query(User).filter(User.tenant_id == tenant.tenant_id).limit(50).all()
                    
                    for user in users:
                        # Get primary role
                        primary_role = "operator"  # default
                        
                        if detailed:
                            # Query user roles directly
                            user_role = db.query(Role).join(UserRoleAccess).filter(
                                UserRoleAccess.user_id == user.user_id
                            ).first()
                            
                            if user_role:
                                primary_role = user_role.name
                        
                        users_data.append({
                            "user_id": user.user_id,
                            "name": user.name,
                            "email": user.email,
                            "role": primary_role,
                            "last_login": "2024-11-01T10:30:00Z",  # TODO: Add last_login to User model
                            "is_active": True  # TODO: Add is_active to User model
                        })
                
                # Build tenant data
                tenant_data = {
                    "tenant_id": tenant.tenant_id,
                    "name": tenant.name,
                    "subscription_tier": tier_name,
                    "subscription_service": service_name,
                    "onboarding_date": tenant.onboarding_date.isoformat() if tenant.onboarding_date else None,
                    "subscription_start_date": tenant.subscription_start_date.isoformat() if tenant.subscription_start_date else None,
                    "subscription_end_date": tenant.subscription_end_date.isoformat() if tenant.subscription_end_date else None,
                    "reports_used": tenant.reports_used or 0,
                    "max_reports": max_reports,
                    "is_active": tenant.is_active,
                    "admin_users": admin_count,
                    "operator_users": operator_count,
                    "total_users": total_tenant_users,
                    "monthly_price": monthly_price,
                    "days_left": days_left,
                    "status": status,
                    "users": users_data
                }
                
                tenant_list.append(tenant_data)
                
                # Accumulate summary data
                total_users += total_tenant_users
                total_reports_used += tenant.reports_used or 0
                if status == "active":
                    monthly_revenue += monthly_price

            except Exception as tenant_error:
                logger.error(f"Error processing tenant {tenant.tenant_id}: {str(tenant_error)}")
                # Skip this tenant but continue with others
                continue
        
        # Build summary
        summary = {
            "total_tenants": len(tenant_list),
            "active_tenants": active_tenant_count,
            "total_users": total_users,
            "monthly_revenue": monthly_revenue,
            "total_reports_used": total_reports_used
        }
        
        return {
            "status": "success",
            "tenants": tenant_list,
            "summary": summary
        }

    except Exception as e:
        logger.error(f"Error in get_tenants: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch tenant details: {str(e)}")

@router.get("/tenants/{tenant_id}/users", response_model=Dict[str, Any])
def get_tenant_users(
    tenant_id: int,
    db: Session = Depends(get_db)
):
    """
    Get detailed user list for a specific tenant
    """
    try:
        # Verify tenant exists
        tenant = db.query(Tenant).filter(Tenant.tenant_id == tenant_id).first()
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant not found")
        
        # Get users
        users = db.query(User).filter(User.tenant_id == tenant_id).all()
        
        users_data = []
        for user in users:
            # Get primary role through UserRoleAccess
            primary_role = "operator"  # default
            user_roles = db.query(Role).join(UserRoleAccess).filter(
                UserRoleAccess.user_id == user.user_id
            ).all()
            
            if user_roles:
                admin_roles = [r for r in user_roles if r.name == 'admin']
                if admin_roles:
                    primary_role = "admin"
                else:
                    primary_role = user_roles[0].name
            
            users_data.append({
                "user_id": user.user_id,
                "name": user.name,
                "email": user.email,
                "role": primary_role,
                "last_login": "2024-11-01T10:30:00Z",  # TODO: Add to User model
                "is_active": True  # TODO: Add to User model
            })
        
        return {
            "status": "success",
            "tenant_id": tenant_id,
            "tenant_name": tenant.name,
            "users": users_data,
            "total_users": len(users_data)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch tenant users: {str(e)}")

@router.post("/tenants", response_model=Dict[str, Any])
def create_tenant(
    tenant_data: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """
    Create a new tenant with subscription details
    """
    try:
        name = tenant_data.get("name")
        subscription_tier_id = tenant_data.get("subscription_tier_id")
        subscription_service_id = tenant_data.get("subscription_service_id")
        
        if not name:
            raise HTTPException(status_code=400, detail="Tenant name is required")
        
        # Check if tenant already exists
        existing = db.query(Tenant).filter(Tenant.name == name).first()
        if existing:
            raise HTTPException(status_code=400, detail="Tenant name already exists")
        
        # Validate tier and service if provided
        if subscription_tier_id:
            tier = db.query(SubscriptionTier).filter(SubscriptionTier.tier_id == subscription_tier_id).first()
            if not tier:
                raise HTTPException(status_code=400, detail="Invalid subscription tier")
        
        if subscription_service_id:
            service = db.query(SubscriptionService).filter(SubscriptionService.service_id == subscription_service_id).first()
            if not service:
                raise HTTPException(status_code=400, detail="Invalid subscription service")
        
        # Create tenant
        new_tenant = Tenant(
            name=name,
            subscription_tier_id=subscription_tier_id,
            subscription_service_id=subscription_service_id,
            onboarding_date=datetime.now(),
            subscription_start_date=datetime.now(),
            subscription_end_date=datetime.now() + timedelta(days=365),  # 1 year default
            reports_used=0,
            is_active=True
        )
        
        db.add(new_tenant)
        db.commit()
        db.refresh(new_tenant)
        
        return {
            "status": "success",
            "message": f"Tenant '{name}' created successfully",
            "tenant_id": new_tenant.tenant_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create tenant: {str(e)}")

@router.get("/user-dashboard-data", response_model=Dict[str, Any])
def get_user_dashboard_data(
    user_id: int = Query(..., description="User ID from session"),
    days_back: int = Query(30, ge=1, le=365, description="Days of data to retrieve"),
    db: Session = Depends(get_db)
):
    """
    Get dashboard data for a specific user based on their tenant
    """
    try:
        # Get user and their tenant
        user = db.query(User).filter(User.user_id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        if not user.tenant_id:
            raise HTTPException(status_code=400, detail="User has no associated tenant")
        
        # Get tenant with subscription details
        tenant = db.query(Tenant).filter(Tenant.tenant_id == user.tenant_id).first()
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant not found")
        
        # Get subscription details
        tier_name = "Unknown"
        service_name = "Unknown"
        max_reports = 0
        monthly_price = 0.0
        
        if tenant.subscription_tier_id:
            tier = db.query(SubscriptionTier).filter(SubscriptionTier.tier_id == tenant.subscription_tier_id).first()
            if tier:
                tier_name = tier.tier_name
                max_reports = tier.max_reports
        
        if tenant.subscription_service_id:
            service = db.query(SubscriptionService).filter(SubscriptionService.service_id == tenant.subscription_service_id).first()
            if service:
                service_name = service.service_name
        
        if tenant.subscription_tier_id and tenant.subscription_service_id:
            pricing = db.query(SubscriptionPricing).filter(
                SubscriptionPricing.tier_id == tenant.subscription_tier_id,
                SubscriptionPricing.service_id == tenant.subscription_service_id,
                SubscriptionPricing.is_active == True
            ).first()
            if pricing:
                monthly_price = float(pricing.price_usd)
        
        # Calculate subscription status and days remaining
        days_remaining = 0
        subscription_status = "expired"
        
        if tenant.subscription_end_date:
            days_remaining = (tenant.subscription_end_date - datetime.now()).days
            
            if days_remaining < 0:
                subscription_status = "expired"
            elif days_remaining <= 7:
                subscription_status = "expiring_soon"
            else:
                subscription_status = "active"
        
        # Get usage analytics
        usage_analytics = get_tenant_usage_analytics(db, tenant.tenant_id, days_back)
        
        # Calculate usage percentage
        usage_percentage = 0
        if max_reports > 0:
            usage_percentage = (tenant.reports_used / max_reports) * 100
        
        # Build comprehensive dashboard data
        dashboard_data = {
            "status": "success",
            "user_id": user_id,
            "tenant_id": tenant.tenant_id,
            "tenant_name": tenant.name,
            
            # Subscription Information
            "subscription_info": {
                "tier": tier_name,
                "service": service_name,
                "max_reports": max_reports,
                "used_reports": tenant.reports_used or 0,
                "start_date": tenant.subscription_start_date.isoformat() if tenant.subscription_start_date else None,
                "end_date": tenant.subscription_end_date.isoformat() if tenant.subscription_end_date else None,
                "days_left": max(0, days_remaining),
                "is_active": subscription_status == "active",
                "price": monthly_price,
                "status": subscription_status,
                "usage_percentage": round(usage_percentage, 2)
            },
            
            # Usage Statistics (from VerificationLog)
            "usage_stats": {
                "total_reports": usage_analytics["usage_stats"]["total_reports"],
                "document_reports": usage_analytics["usage_stats"]["document_reports"],
                "sms_reports": usage_analytics["usage_stats"]["sms_reports"],
                "email_reports": usage_analytics["usage_stats"]["email_reports"],
                "weekly_average": usage_analytics["usage_stats"]["weekly_average"],
                "period_days": days_back
            },
            
            # Daily Usage Data for Charts
            "daily_usage": usage_analytics["daily_usage"],
            
            # Additional Dashboard Metrics
            "dashboard_metrics": {
                "reports_remaining": max(0, max_reports - (tenant.reports_used or 0)),
                "is_near_limit": usage_percentage > 80,
                "is_expiring_soon": days_remaining <= 30 and days_remaining > 0,
                "current_usage_rate": round(usage_analytics["usage_stats"]["total_reports"] / max(1, days_back), 2),
                "projected_days_until_limit": None
            }
        }
        
        # Calculate projected days until limit
        if usage_analytics["usage_stats"]["total_reports"] > 0 and max_reports > (tenant.reports_used or 0):
            daily_rate = usage_analytics["usage_stats"]["total_reports"] / days_back
            if daily_rate > 0:
                remaining_reports = max_reports - (tenant.reports_used or 0)
                dashboard_data["dashboard_metrics"]["projected_days_until_limit"] = round(remaining_reports / daily_rate, 0)
        
        return dashboard_data
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch dashboard data: {str(e)}")

# ============================================================================
# TENANT ONBOARDING ENDPOINT
# ============================================================================

@router.post("/onboard", response_model=TenantOnboardingResponse)
def onboard_tenant(
    onboarding_data: TenantOnboardingRequest,
    db: Session = Depends(get_db)
):
    """
    Complete tenant onboarding with validation and user creation
    """
    try:
        # Step 1: Validate subscription tier and service
        tier = db.query(SubscriptionTier).filter(
            SubscriptionTier.tier_id == onboarding_data.subscription_tier_id,
            SubscriptionTier.is_active == True
        ).first()
        
        if not tier:
            raise HTTPException(status_code=400, detail="Invalid subscription tier")
        
        service = db.query(SubscriptionService).filter(
            SubscriptionService.service_id == onboarding_data.subscription_service_id,
            SubscriptionService.is_active == True
        ).first()
        
        if not service:
            raise HTTPException(status_code=400, detail="Invalid subscription service")
        
        # Step 2: Check if tenant name already exists
        existing_tenant = db.query(Tenant).filter(Tenant.name == onboarding_data.tenant_name).first()
        if existing_tenant:
            raise HTTPException(status_code=400, detail="Tenant name already exists")
        
        # Step 3: Check if admin username or email already exists
        existing_user = db.query(User).filter(
            (User.username == onboarding_data.admin_username) | 
            (User.email == onboarding_data.admin_email)
        ).first()
        
        if existing_user:
            if existing_user.username == onboarding_data.admin_username:
                raise HTTPException(status_code=400, detail="Admin username already exists")
            else:
                raise HTTPException(status_code=400, detail="Admin email already exists")
        
        # Step 4: Get admin role
        admin_role = db.query(Role).filter(Role.name == 'admin').first()
        if not admin_role:
            raise HTTPException(status_code=500, detail="Admin role not found in system")
        
        # Step 5: Get pricing information
        pricing = db.query(SubscriptionPricing).filter(
            SubscriptionPricing.tier_id == onboarding_data.subscription_tier_id,
            SubscriptionPricing.service_id == onboarding_data.subscription_service_id,
            SubscriptionPricing.is_active == True
        ).first()
        
        if not pricing:
            raise HTTPException(status_code=400, detail="Pricing not found for this tier-service combination")
        
        # Step 6: Create tenant
        # Parse the subscription start date
        subscription_start_date = datetime.strptime(onboarding_data.subscription_start_date, '%Y-%m-%d')
        
        new_tenant = Tenant(
            name=onboarding_data.tenant_name,
            subscription_tier_id=onboarding_data.subscription_tier_id,
            subscription_service_id=onboarding_data.subscription_service_id,
            onboarding_date=datetime.now(),
            subscription_start_date=subscription_start_date,
            subscription_end_date=subscription_start_date + timedelta(days=365),  # 1 year subscription from start date
            reports_used=0,
            is_active=True
        )
        
        db.add(new_tenant)
        db.flush()  # Get the tenant_id without committing
        
        # Step 7: Create admin user
        new_user = User(
            name=onboarding_data.admin_name,
            username=onboarding_data.admin_username,
            email=onboarding_data.admin_email,
            password_hash=hash_password_bcrypt(onboarding_data.admin_password),  # Hash password with bcrypt
            tenant_id=new_tenant.tenant_id
        )
        
        db.add(new_user)
        db.flush()  # Get the user_id without committing
        
        # Step 8: Assign admin role to user
        user_role = UserRoleAccess(
            user_id=new_user.user_id,
            role_id=admin_role.role_id
        )
        
        db.add(user_role)
        
        # Step 9: Create tenant-specific configurations based on subscription service mapping
        from app.models.subscription_feature_mapping import SubscriptionFeatureMapping
        from app.models.main_feature_mapping import MainFeatureMapping
        from app.models.config_store import ConfigStore

        # Get main_feature_keys ENABLED for this service from subscription_feature_mapping
        feature_mappings = db.query(SubscriptionFeatureMapping).filter(
            SubscriptionFeatureMapping.service_id == onboarding_data.subscription_service_id
        ).all()

        # Collect the main feature keys for this subscription
        main_feature_keys = {fm.main_feature_key for fm in feature_mappings}

        # Look up all sub_feature_keys for the main_feature_keys from main_feature_mapping
        # These are the actual config keys that the frontend uses (ENABLE_OTP_VERIFICATION, etc.)
        sub_feature_mappings = db.query(MainFeatureMapping).filter(
            MainFeatureMapping.main_feature_key.in_(main_feature_keys)
        ).all()

        # Collect sub-feature keys that should be enabled
        enabled_sub_feature_keys = {sfm.sub_feature_key for sfm in sub_feature_mappings}

        # Create a lookup for global config descriptions
        global_config_lookup = {}
        all_global_configs = db.query(ConfigStore).filter(
            ConfigStore.tenant_id.is_(None),
            ConfigStore.is_global == True
        ).all()
        for gc in all_global_configs:
            global_config_lookup[gc.key_name] = gc

        # Create config entries for each enabled sub-feature
        # Features NOT in the mapping will not have a config entry, making them "unavailable"
        for sub_feature_key in enabled_sub_feature_keys:
            # Get description from global config if available
            global_config = global_config_lookup.get(sub_feature_key)
            description = global_config.description if global_config else f"Feature enabled for tenant"

            config_entry = ConfigStore(
                key_name=sub_feature_key,
                value="True",  # Default to enabled for subscribed features
                description=description,
                tenant_id=new_tenant.tenant_id,
                is_global=False
            )
            db.add(config_entry)

        # Step 9.5: Copy appearance configurations from global (always)
        appearance_configs = ['PRIMARY_COLOR', 'PRODUCT_LOGO', 'PRODUCT_NAME_IMAGE']

        for key in appearance_configs:
            global_config = global_config_lookup.get(key)
            if global_config:
                tenant_config_entry = ConfigStore(
                    key_name=global_config.key_name,
                    value=global_config.value,
                    description=global_config.description,
                    tenant_id=new_tenant.tenant_id,
                    is_global=False
                )
                db.add(tenant_config_entry)

        # Step 9.6: Copy storage configs ONLY if service includes document/face features
        # STORE_* configs are only relevant for Document ID & Face ID Verification
        has_document_features = 'ENABLE_DOCUMENT_ID_VERIFICATION' in main_feature_keys or \
                                'ENABLE_FACE_ID_VERIFICATION' in main_feature_keys or \
                                'ENABLE_COMPLETE_BUNDLE' in main_feature_keys

        if has_document_features:
            storage_configs = ['STORE_EXTRACTED_FACES', 'STORE_ID_AND_LICENSE_PHOTO', 'STORE_VIDEO']
            for key in storage_configs:
                global_config = global_config_lookup.get(key)
                if global_config:
                    tenant_config_entry = ConfigStore(
                        key_name=global_config.key_name,
                        value=global_config.value,
                        description=global_config.description,
                        tenant_id=new_tenant.tenant_id,
                        is_global=False
                    )
                    db.add(tenant_config_entry)
        
        # Step 10: Commit all changes
        db.commit()
        db.refresh(new_tenant)
        db.refresh(new_user)
        
        return TenantOnboardingResponse(
            status="success",
            message=f"Tenant '{onboarding_data.tenant_name}' onboarded successfully",
            tenant_id=new_tenant.tenant_id,
            user_id=new_user.user_id,
            tenant_name=new_tenant.name,
            admin_username=new_user.username,
            admin_email=new_user.email,
            subscription_tier=tier.tier_name,
            subscription_service=service.service_name,
            monthly_price=float(pricing.price_usd),
            max_reports=tier.max_reports,
            subscription_end_date=new_tenant.subscription_end_date.isoformat()
        )
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to onboard tenant: {str(e)}")

@router.post("/onboard/validate", response_model=TenantOnboardingValidationResponse)
def validate_tenant_onboarding(
    onboarding_data: TenantOnboardingRequest,
    db: Session = Depends(get_db)
):
    """
    Validate tenant onboarding data without creating anything
    """
    errors = []
    
    try:
        # Validate subscription tier and service
        tier = db.query(SubscriptionTier).filter(
            SubscriptionTier.tier_id == onboarding_data.subscription_tier_id,
            SubscriptionTier.is_active == True
        ).first()
        
        if not tier:
            errors.append(TenantOnboardingValidationError(
                field="subscription_tier_id",
                message="Invalid subscription tier"
            ))
        
        service = db.query(SubscriptionService).filter(
            SubscriptionService.service_id == onboarding_data.subscription_service_id,
            SubscriptionService.is_active == True
        ).first()
        
        if not service:
            errors.append(TenantOnboardingValidationError(
                field="subscription_service_id",
                message="Invalid subscription service"
            ))
        
        # Check if tenant name already exists
        existing_tenant = db.query(Tenant).filter(Tenant.name == onboarding_data.tenant_name).first()
        if existing_tenant:
            errors.append(TenantOnboardingValidationError(
                field="tenant_name",
                message="Tenant name already exists"
            ))
        
        # Check if admin username or email already exists
        existing_user = db.query(User).filter(
            (User.username == onboarding_data.admin_username) | 
            (User.email == onboarding_data.admin_email)
        ).first()
        
        if existing_user:
            if existing_user.username == onboarding_data.admin_username:
                errors.append(TenantOnboardingValidationError(
                    field="admin_username",
                    message="Admin username already exists"
                ))
            else:
                errors.append(TenantOnboardingValidationError(
                    field="admin_email",
                    message="Admin email already exists"
                ))
        
        # Check pricing availability
        if tier and service:
            pricing = db.query(SubscriptionPricing).filter(
                SubscriptionPricing.tier_id == onboarding_data.subscription_tier_id,
                SubscriptionPricing.service_id == onboarding_data.subscription_service_id,
                SubscriptionPricing.is_active == True
            ).first()
            
            if not pricing:
                errors.append(TenantOnboardingValidationError(
                    field="subscription_combination",
                    message="Pricing not available for this tier-service combination"
                ))
        
        return TenantOnboardingValidationResponse(errors=errors)
        
    except Exception as e:
        errors.append(TenantOnboardingValidationError(
            field="general",
            message=f"Validation error: {str(e)}"
        ))
        return TenantOnboardingValidationResponse(errors=errors)

# ============================================================================
# LEGACY OPERATION-BASED ENDPOINT (Backward Compatibility)
# ============================================================================

@router.post("/execute", response_model=Dict[str, Any])
def execute_tenant_operation(
    operation_data: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """
    Single endpoint for all tenant management operations (Legacy support)
    
    Supported operations:
    - create_tenant
    - create_tenant_with_users
    - add_users_to_existing_tenant
    - create_users_without_tenant
    - assign_users_to_tenant
    - update_tenant_license
    - add_roles_to_user
    - remove_roles_from_user
    - create_role
    - get_tenant_info
    - get_user_info
    - list_all_tenants
    - list_tenant_users
    """
    
    operation = operation_data.get("operation")
    
    if not operation:
        raise HTTPException(status_code=400, detail="Operation key is required")
    
    try:
        if operation == "create_tenant":
            return create_tenant_operation(db, operation_data)
        
        elif operation == "create_tenant_with_users":
            return create_tenant_with_users_operation(db, operation_data)
        
        elif operation == "add_users_to_existing_tenant":
            return add_users_to_existing_tenant_operation(db, operation_data)
        
        elif operation == "create_users_without_tenant":
            return create_users_without_tenant_operation(db, operation_data)
        
        elif operation == "assign_users_to_tenant":
            return assign_users_to_tenant_operation(db, operation_data)
        
        elif operation == "update_tenant_license":
            return update_tenant_license_operation(db, operation_data)
        
        elif operation == "add_roles_to_user":
            return add_roles_to_user_operation(db, operation_data)
        
        elif operation == "remove_roles_from_user":
            return remove_roles_from_user_operation(db, operation_data)
        
        elif operation == "create_role":
            return create_role_operation(db, operation_data)
        
        elif operation == "get_tenant_info":
            return get_tenant_info_operation(db, operation_data)
        
        elif operation == "get_user_info":
            return get_user_info_operation(db, operation_data)
        
        elif operation == "list_all_tenants":
            return list_all_tenants_operation(db)
        
        elif operation == "list_tenant_users":
            return list_tenant_users_operation(db, operation_data)
        
        else:
            raise HTTPException(status_code=400, detail=f"Unknown operation: {operation}")
    
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Operation failed: {str(e)}")

# ============================================================================
# LEGACY OPERATION FUNCTIONS
# ============================================================================

def create_tenant_operation(db: Session, data: Dict[str, Any]) -> Dict[str, Any]:
    """Create a new tenant"""
    tenant_data = data.get("tenant", {})
    name = tenant_data.get("name")
    license_info = tenant_data.get("license_info", {})
    
    if not name:
        raise HTTPException(status_code=400, detail="Tenant name is required")
    
    # Check if tenant already exists
    existing_tenant = db.query(Tenant).filter(Tenant.name == name).first()
    if existing_tenant:
        return {
            "status": "error",
            "message": f"Tenant '{name}' already exists"
        }
    
    # Create new tenant
    new_tenant = Tenant(
        name=name,
        license_info=json.dumps(license_info)
    )
    db.add(new_tenant)
    db.commit()
    db.refresh(new_tenant)
    
    return {
        "status": "success",
        "message": f"Tenant '{name}' created successfully",
        "tenant_id": new_tenant.tenant_id,
        "tenant_name": new_tenant.name,
        "license_info": json.loads(new_tenant.license_info)
    }

def create_tenant_with_users_operation(db: Session, data: Dict[str, Any]) -> Dict[str, Any]:
    """Create a tenant with users"""
    tenant_data = data.get("tenant", {})
    name = tenant_data.get("name")
    license_info = tenant_data.get("license_info", {})
    users_data = tenant_data.get("users", [])
    
    if not name:
        raise HTTPException(status_code=400, detail="Tenant name is required")
    
    # Check if tenant already exists
    existing_tenant = db.query(Tenant).filter(Tenant.name == name).first()
    if existing_tenant:
        return {
            "status": "error",
            "message": f"Tenant '{name}' already exists"
        }
    
    # Create tenant first
    new_tenant = Tenant(
        name=name,
        license_info=json.dumps(license_info)
    )
    db.add(new_tenant)
    db.commit()
    db.refresh(new_tenant)
    
    created_users = []
    
    # Create users for this tenant
    for user_data in users_data:
        username = user_data.get("username")
        email = user_data.get("email")
        password = user_data.get("password")
        name = user_data.get("name")
        roles = user_data.get("roles", [])
        
        if not all([username, email, password, name]):
            continue
        
        # Check if user already exists
        existing_user = db.query(User).filter(
            (User.username == username) | (User.email == email)
        ).first()
        
        if existing_user:
            continue
        
        # Create user
        new_user = User(
            name=name,
            username=username,
            email=email,
            password_hash=hash_password_bcrypt(password),  # Hash password with bcrypt
            tenant_id=new_tenant.tenant_id
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        # Assign roles
        for role_name in roles:
            role = db.query(Role).filter(Role.name == role_name).first()
            if role:
                user_role = UserRoleAccess(
                    user_id=new_user.user_id,
                    role_id=role.role_id
                )
                db.add(user_role)
        
        created_users.append({
            "user_id": new_user.user_id,
            "username": new_user.username,
            "email": new_user.email,
            "roles": roles
        })
    
    db.commit()
    
    return {
        "status": "success",
        "message": f"Tenant '{name}' created with {len(created_users)} users",
        "tenant_id": new_tenant.tenant_id,
        "tenant_name": new_tenant.name,
        "created_users": created_users
    }

def add_users_to_existing_tenant_operation(db: Session, data: Dict[str, Any]) -> Dict[str, Any]:
    """Add users to an existing tenant"""
    tenant_name = data.get("tenant_name")
    users_data = data.get("users", [])
    
    if not tenant_name:
        raise HTTPException(status_code=400, detail="Tenant name is required")
    
    # Find tenant
    tenant = db.query(Tenant).filter(Tenant.name == tenant_name).first()
    if not tenant:
        return {
            "status": "error",
            "message": f"Tenant '{tenant_name}' not found"
        }
    
    created_users = []
    
    for user_data in users_data:
        username = user_data.get("username")
        email = user_data.get("email")
        password = user_data.get("password")
        name = user_data.get("name")
        roles = user_data.get("roles", [])
        
        if not all([username, email, password, name]):
            continue
        
        # Check if user already exists
        existing_user = db.query(User).filter(
            (User.username == username) | (User.email == email)
        ).first()
        
        if existing_user:
            continue
        
        # Create user
        new_user = User(
            name=name,
            username=username,
            email=email,
            password_hash=hash_password_bcrypt(password),  # Hash password with bcrypt
            tenant_id=tenant.tenant_id
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        # Assign roles
        for role_name in roles:
            role = db.query(Role).filter(Role.name == role_name).first()
            if role:
                user_role = UserRoleAccess(
                    user_id=new_user.user_id,
                    role_id=role.role_id
                )
                db.add(user_role)
        
        created_users.append({
            "user_id": new_user.user_id,
            "username": new_user.username,
            "email": new_user.email,
            "roles": roles
        })
    
    db.commit()
    
    return {
        "status": "success",
        "message": f"Added {len(created_users)} users to tenant '{tenant_name}'",
        "tenant_name": tenant_name,
        "created_users": created_users
    }

def create_users_without_tenant_operation(db: Session, data: Dict[str, Any]) -> Dict[str, Any]:
    """Create users without tenant assignment"""
    users_data = data.get("users", [])
    
    created_users = []
    
    for user_data in users_data:
        username = user_data.get("username")
        email = user_data.get("email")
        password = user_data.get("password")
        name = user_data.get("name")
        roles = user_data.get("roles", [])
        
        if not all([username, email, password, name]):
            continue
        
        # Check if user already exists
        existing_user = db.query(User).filter(
            (User.username == username) | (User.email == email)
        ).first()
        
        if existing_user:
            continue
        
        # Create user without tenant
        new_user = User(
            name=name,
            username=username,
            email=email,
            password_hash=password,  # Password is already hashed by frontend
            tenant_id=None
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        # Assign roles
        for role_name in roles:
            role = db.query(Role).filter(Role.name == role_name).first()
            if role:
                user_role = UserRoleAccess(
                    user_id=new_user.user_id,
                    role_id=role.role_id
                )
                db.add(user_role)
        
        created_users.append({
            "user_id": new_user.user_id,
            "username": new_user.username,
            "email": new_user.email,
            "roles": roles
        })
    
    db.commit()
    
    return {
        "status": "success",
        "message": f"Created {len(created_users)} users without tenant assignment",
        "created_users": created_users
    }

def assign_users_to_tenant_operation(db: Session, data: Dict[str, Any]) -> Dict[str, Any]:
    """Assign existing users to a tenant"""
    tenant_name = data.get("tenant_name")
    usernames = data.get("usernames", [])
    
    if not tenant_name:
        raise HTTPException(status_code=400, detail="Tenant name is required")
    
    # Find tenant
    tenant = db.query(Tenant).filter(Tenant.name == tenant_name).first()
    if not tenant:
        return {
            "status": "error",
            "message": f"Tenant '{tenant_name}' not found"
        }
    
    assigned_users = []
    
    for username in usernames:
        user = db.query(User).filter(User.username == username).first()
        if user:
            user.tenant_id = tenant.tenant_id
            assigned_users.append(username)
    
    db.commit()
    
    return {
        "status": "success",
        "message": f"Assigned {len(assigned_users)} users to tenant '{tenant_name}'",
        "tenant_name": tenant_name,
        "assigned_users": assigned_users
    }

def update_tenant_license_operation(db: Session, data: Dict[str, Any]) -> Dict[str, Any]:
    """Update tenant license information"""
    tenant_name = data.get("tenant_name")
    license_info = data.get("license_info", {})
    
    if not tenant_name:
        raise HTTPException(status_code=400, detail="Tenant name is required")
    
    # Find tenant
    tenant = db.query(Tenant).filter(Tenant.name == tenant_name).first()
    if not tenant:
        return {
            "status": "error",
            "message": f"Tenant '{tenant_name}' not found"
        }
    
    # Update license info
    tenant.license_info = json.dumps(license_info)
    db.commit()
    
    return {
        "status": "success",
        "message": f"License updated for tenant '{tenant_name}'",
        "tenant_name": tenant_name,
        "license_info": license_info
    }

def add_roles_to_user_operation(db: Session, data: Dict[str, Any]) -> Dict[str, Any]:
    """Add roles to a user"""
    username = data.get("username")
    roles = data.get("roles", [])
    
    if not username:
        raise HTTPException(status_code=400, detail="Username is required")
    
    # Find user
    user = db.query(User).filter(User.username == username).first()
    if not user:
        return {
            "status": "error",
            "message": f"User '{username}' not found"
        }
    
    added_roles = []
    
    for role_name in roles:
        role = db.query(Role).filter(Role.name == role_name).first()
        if role:
            # Check if user already has this role
            existing_access = db.query(UserRoleAccess).filter(
                UserRoleAccess.user_id == user.user_id,
                UserRoleAccess.role_id == role.role_id
            ).first()
            
            if not existing_access:
                user_role = UserRoleAccess(
                    user_id=user.user_id,
                    role_id=role.role_id
                )
                db.add(user_role)
                added_roles.append(role_name)
    
    db.commit()
    
    return {
        "status": "success",
        "message": f"Added {len(added_roles)} roles to user '{username}'",
        "username": username,
        "added_roles": added_roles
    }

def remove_roles_from_user_operation(db: Session, data: Dict[str, Any]) -> Dict[str, Any]:
    """Remove roles from a user"""
    username = data.get("username")
    roles = data.get("roles", [])
    
    if not username:
        raise HTTPException(status_code=400, detail="Username is required")
    
    # Find user
    user = db.query(User).filter(User.username == username).first()
    if not user:
        return {
            "status": "error",
            "message": f"User '{username}' not found"
        }
    
    removed_roles = []
    
    for role_name in roles:
        role = db.query(Role).filter(Role.name == role_name).first()
        if role:
            # Remove user role access
            user_role = db.query(UserRoleAccess).filter(
                UserRoleAccess.user_id == user.user_id,
                UserRoleAccess.role_id == role.role_id
            ).first()
            
            if user_role:
                db.delete(user_role)
                removed_roles.append(role_name)
    
    db.commit()
    
    return {
        "status": "success",
        "message": f"Removed {len(removed_roles)} roles from user '{username}'",
        "username": username,
        "removed_roles": removed_roles
    }

def create_role_operation(db: Session, data: Dict[str, Any]) -> Dict[str, Any]:
    """Create a new role"""
    role_data = data.get("role", {})
    name = role_data.get("name")
    description = role_data.get("description", "")
    
    if not name:
        raise HTTPException(status_code=400, detail="Role name is required")
    
    # Check if role already exists
    existing_role = db.query(Role).filter(Role.name == name).first()
    if existing_role:
        return {
            "status": "error",
            "message": f"Role '{name}' already exists"
        }
    
    # Create new role
    new_role = Role(
        name=name,
        description=description
    )
    db.add(new_role)
    db.commit()
    db.refresh(new_role)
    
    return {
        "status": "success",
        "message": f"Role '{name}' created successfully",
        "role_id": new_role.role_id,
        "role_name": new_role.name,
        "description": new_role.description
    }

def get_tenant_info_operation(db: Session, data: Dict[str, Any]) -> Dict[str, Any]:
    """Get tenant information"""
    tenant_name = data.get("tenant_name")
    
    if not tenant_name:
        raise HTTPException(status_code=400, detail="Tenant name is required")
    
    # Find tenant
    tenant = db.query(Tenant).filter(Tenant.name == tenant_name).first()
    if not tenant:
        return {
            "status": "error",
            "message": f"Tenant '{tenant_name}' not found"
        }
    
    # Get users for this tenant
    users = db.query(User).filter(User.tenant_id == tenant.tenant_id).all()
    user_info = []
    
    for user in users:
        # Get user roles
        user_roles = db.query(Role).join(UserRoleAccess).filter(
            UserRoleAccess.user_id == user.user_id
        ).all()
        
        user_info.append({
            "user_id": user.user_id,
            "name": user.name,
            "username": user.username,
            "email": user.email,
            "roles": [role.name for role in user_roles]
        })
    
    return {
        "status": "success",
        "tenant_id": tenant.tenant_id,
        "tenant_name": tenant.name,
        "license_info": json.loads(tenant.license_info) if tenant.license_info else {},
        "users": user_info,
        "user_count": len(user_info)
    }

def get_user_info_operation(db: Session, data: Dict[str, Any]) -> Dict[str, Any]:
    """Get user information"""
    username = data.get("username")
    
    if not username:
        raise HTTPException(status_code=400, detail="Username is required")
    
    # Find user
    user = db.query(User).filter(User.username == username).first()
    if not user:
        return {
            "status": "error",
            "message": f"User '{username}' not found"
        }
    
    # Get user roles
    user_roles = db.query(Role).join(UserRoleAccess).filter(
        UserRoleAccess.user_id == user.user_id
    ).all()
    
    # Get tenant info
    tenant_info = None
    if user.tenant_id:
        tenant = db.query(Tenant).filter(Tenant.tenant_id == user.tenant_id).first()
        if tenant:
            tenant_info = {
                "tenant_id": tenant.tenant_id,
                "tenant_name": tenant.name,
                "license_info": json.loads(tenant.license_info) if tenant.license_info else {}
            }
    
    return {
        "status": "success",
        "user_id": user.user_id,
        "name": user.name,
        "username": user.username,
        "email": user.email,
        "tenant": tenant_info,
        "roles": [role.name for role in user_roles]
    }

def list_all_tenants_operation(db: Session) -> Dict[str, Any]:
    """List all tenants"""
    tenants = db.query(Tenant).all()
    
    tenant_list = []
    for tenant in tenants:
        # Get user count for each tenant
        user_count = db.query(User).filter(User.tenant_id == tenant.tenant_id).count()
        
        tenant_list.append({
            "tenant_id": tenant.tenant_id,
            "name": tenant.name,
            "license_info": json.loads(tenant.license_info) if tenant.license_info else {},
            "user_count": user_count
        })
    
    return {
        "status": "success",
        "tenants": tenant_list,
        "total_tenants": len(tenant_list)
    }

def list_tenant_users_operation(db: Session, data: Dict[str, Any]) -> Dict[str, Any]:
    """List users for a specific tenant"""
    tenant_name = data.get("tenant_name")
    
    if not tenant_name:
        raise HTTPException(status_code=400, detail="Tenant name is required")
    
    # Find tenant
    tenant = db.query(Tenant).filter(Tenant.name == tenant_name).first()
    if not tenant:
        return {
            "status": "error",
            "message": f"Tenant '{tenant_name}' not found"
        }
    
    # Get users for this tenant
    users = db.query(User).filter(User.tenant_id == tenant.tenant_id).all()
    user_list = []
    
    for user in users:
        # Get user roles
        user_roles = db.query(Role).join(UserRoleAccess).filter(
            UserRoleAccess.user_id == user.user_id
        ).all()
        
        user_list.append({
            "user_id": user.user_id,
            "name": user.name,
            "username": user.username,
            "email": user.email,
            "roles": [role.name for role in user_roles]
        })
    
    return {
        "status": "success",
        "tenant_name": tenant_name,
        "users": user_list,
        "total_users": len(user_list)
    }
