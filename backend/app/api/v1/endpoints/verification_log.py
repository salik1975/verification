from fastapi import APIRouter, Depends, status, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc
from app.db.session import get_db
from app.schemas.verification_log import VerificationLogCreate
from app.crud import crud_verification_log
import uuid
from typing import List, Optional, Dict, Any
from app.models.verification_log import VerificationLog
from app.models.app_user import AppUser
from app.models.role import Role
from app.models.user_role_access import UserRoleAccess
from app.models.tenant import Tenant
from app.models.subscription_tier import SubscriptionTier
from fastapi.encoders import jsonable_encoder
from datetime import datetime, timedelta
from app.api.v1.endpoints.auth import session_store

router = APIRouter()

def check_subscription_limit(user_id: int, db: Session) -> dict:
    """
    Check if user's tenant has remaining reports in their subscription.
    Returns dict with 'allowed', 'remaining', 'max_reports', 'reports_used', and 'message'.
    """
    if not user_id:
        # No user ID provided, allow verification (anonymous)
        return {"allowed": True, "remaining": None, "max_reports": None, "reports_used": None, "message": "No user associated"}

    # Get user's tenant
    user = db.query(AppUser).filter(AppUser.user_id == user_id).first()
    if not user or not user.tenant_id:
        # User has no tenant, allow verification
        return {"allowed": True, "remaining": None, "max_reports": None, "reports_used": None, "message": "No tenant associated"}

    # Get tenant with subscription tier
    tenant = db.query(Tenant).filter(Tenant.tenant_id == user.tenant_id).first()
    if not tenant:
        return {"allowed": True, "remaining": None, "max_reports": None, "reports_used": None, "message": "Tenant not found"}

    # Check if tenant has a subscription tier
    if not tenant.subscription_tier_id:
        # No subscription tier set, allow verification
        return {"allowed": True, "remaining": None, "max_reports": None, "reports_used": None, "message": "No subscription tier"}

    # Get subscription tier for max_reports
    tier = db.query(SubscriptionTier).filter(SubscriptionTier.tier_id == tenant.subscription_tier_id).first()
    if not tier:
        return {"allowed": True, "remaining": None, "max_reports": None, "reports_used": None, "message": "Subscription tier not found"}

    # Check subscription expiration
    if tenant.subscription_end_date and tenant.subscription_end_date < datetime.utcnow():
        return {
            "allowed": False,
            "remaining": 0,
            "max_reports": tier.max_reports,
            "reports_used": tenant.reports_used or 0,
            "message": "Subscription has expired"
        }

    # Calculate remaining reports
    reports_used = tenant.reports_used or 0
    max_reports = tier.max_reports
    remaining = max_reports - reports_used

    if remaining <= 0:
        return {
            "allowed": False,
            "remaining": 0,
            "max_reports": max_reports,
            "reports_used": reports_used,
            "message": f"Subscription limit reached. You have used all {max_reports} reports."
        }

    return {
        "allowed": True,
        "remaining": remaining,
        "max_reports": max_reports,
        "reports_used": reports_used,
        "message": f"{remaining} reports remaining"
    }

@router.post("/insert-logs", status_code=status.HTTP_201_CREATED)
def insert_logs(payload: VerificationLogCreate, db: Session = Depends(get_db)):
    # Check subscription limit before creating log
    if payload.UserID:
        limit_check = check_subscription_limit(payload.UserID, db)
        if not limit_check["allowed"]:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail={
                    "error": "subscription_limit_exceeded",
                    "message": limit_check["message"],
                    "max_reports": limit_check["max_reports"],
                    "reports_used": limit_check["reports_used"]
                }
            )

    # Generate SessionID if not present
    if not payload.SessionID:
        payload.SessionID = str(uuid.uuid4())

    # Set CreatedOn if not provided
    if not payload.CreatedOn:
        payload.CreatedOn = datetime.utcnow()

    # Set LastModifiedOn if not provided
    if not payload.LastModifiedOn:
        payload.LastModifiedOn = datetime.utcnow()

    log = crud_verification_log.create_verification_log(db, payload)
    return log

@router.get("/check-subscription-limit")
def get_subscription_limit(
    user_id: int = Query(..., description="User ID to check subscription limit for"),
    db: Session = Depends(get_db)
):
    """
    Check if user has remaining reports in their subscription.
    Frontend should call this before starting verification to warn user.
    """
    result = check_subscription_limit(user_id, db)
    return result

def get_current_user_tenant_id(token: str, db: Session) -> Optional[int]:
    """Get the current user's tenant_id from the session token"""
    try:
        # Get user_id from in-memory session store
        user_id = session_store.get(token)
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid session token")
        
        # Get user with tenant_id
        user = db.query(AppUser).filter(AppUser.user_id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return user.tenant_id
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get user tenant: {str(e)}")

def get_user_roles(token: str, db: Session) -> List[str]:
    """Get the current user's roles from the session token"""
    try:
        # Get user_id from in-memory session store
        user_id = session_store.get(token)
        if not user_id:
            return []
        
        # Get user roles
        roles = db.query(Role).join(UserRoleAccess).filter(
            UserRoleAccess.user_id == user_id
        ).all()
        
        return [role.name for role in roles]
        
    except Exception:
        return []

def is_product_owner(token: str, db: Session) -> bool:
    """Check if the current user has product_owner role"""
    roles = get_user_roles(token, db)
    return 'product_owner' in roles

def is_admin(token: str, db: Session) -> bool:
    """Check if the current user has admin role"""
    roles = get_user_roles(token, db)
    return 'admin' in roles

@router.get("/retrieve-logs")
def get_logs(
    db: Session = Depends(get_db),
    token: str = Query(..., description="Authentication token"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=1000, description="Number of records to return"),
    document_type_id: Optional[str] = Query(None, description="Filter by document type ID"),
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    sort_by: str = Query("CreatedOn", description="Sort by field"),
    sort_order: str = Query("desc", description="Sort order (asc/desc)")
):
    """
    Retrieve verification logs with pagination and filtering.
    Default: 50 records, sorted by CreatedOn descending.
    - Product owner users can see all logs from all tenants
    - Admin users can only see logs from their own tenant
    - Other users can only see logs from their own tenant
    """
    # Check user roles
    is_product_owner_user = is_product_owner(token, db)
    is_admin_user = is_admin(token, db)
    
    # Build query with filters
    query = db.query(VerificationLog)
    
    # Apply tenant filter for non-product_owner users
    if not is_product_owner_user:
        tenant_id = get_current_user_tenant_id(token, db)
        if tenant_id:
            # Join with app_user to filter by tenant
            query = query.join(AppUser, VerificationLog.UserID == AppUser.user_id)
            query = query.filter(AppUser.tenant_id == tenant_id)
        else:
            # User has no tenant, return empty result
            return []
    
    # Apply document type filter
    if document_type_id:
        query = query.filter(VerificationLog.DocumentTypeID == document_type_id)
    
    # Apply user filter
    if user_id:
        query = query.filter(VerificationLog.UserID == user_id)
    
    # Apply date range filter
    if start_date:
        try:
            start_datetime = datetime.strptime(start_date, "%Y-%m-%d")
            query = query.filter(VerificationLog.CreatedOn >= start_datetime)
        except ValueError:
            pass
    
    if end_date:
        try:
            end_datetime = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
            query = query.filter(VerificationLog.CreatedOn < end_datetime)
        except ValueError:
            pass
    
    # Apply sorting
    if hasattr(VerificationLog, sort_by):
        sort_column = getattr(VerificationLog, sort_by)
        if sort_order.lower() == "asc":
            query = query.order_by(asc(sort_column))
        else:
            query = query.order_by(desc(sort_column))
    else:
        # Default sorting by CreatedOn descending
        query = query.order_by(desc(VerificationLog.CreatedOn))
    
    # Apply pagination
    logs = query.offset(skip).limit(limit).all()
    
    # Convert to dict and add tenant information
    logs_with_tenant = []
    for log in logs:
        log_dict = jsonable_encoder(log)
        
        # Add tenant information
        if log.UserID:
            user = db.query(AppUser).filter(AppUser.user_id == log.UserID).first()
            if user and user.tenant_id:
                tenant = db.query(Tenant).filter(Tenant.tenant_id == user.tenant_id).first()
                log_dict["tenant_name"] = tenant.name if tenant else "Unknown"
                log_dict["tenant_id"] = user.tenant_id
            else:
                log_dict["tenant_name"] = "No Tenant"
                log_dict["tenant_id"] = None
        else:
            log_dict["tenant_name"] = "No User"
            log_dict["tenant_id"] = None
        
        logs_with_tenant.append(log_dict)
    
    return logs_with_tenant

@router.get("/retrieve-logs-count")
def get_logs_count(
    db: Session = Depends(get_db),
    token: str = Query(..., description="Authentication token"),
    document_type_id: Optional[str] = Query(None, description="Filter by document type ID"),
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)")
):
    """
    Get total count of verification logs for pagination.
    - Product owner users can see all logs from all tenants
    - Admin users can only see logs from their own tenant
    - Other users can only see logs from their own tenant
    """
    # Check user roles
    is_product_owner_user = is_product_owner(token, db)
    
    query = db.query(VerificationLog)
    
    # Apply tenant filter for non-product_owner users
    if not is_product_owner_user:
        tenant_id = get_current_user_tenant_id(token, db)
        if tenant_id:
            # Join with app_user to filter by tenant
            query = query.join(AppUser, VerificationLog.UserID == AppUser.user_id)
            query = query.filter(AppUser.tenant_id == tenant_id)
        else:
            # User has no tenant, return 0
            return {"total_count": 0}
    
    # Apply same filters as get_logs
    if document_type_id:
        query = query.filter(VerificationLog.DocumentTypeID == document_type_id)
    
    if user_id:
        query = query.filter(VerificationLog.UserID == user_id)
    
    if start_date:
        try:
            start_datetime = datetime.strptime(start_date, "%Y-%m-%d")
            query = query.filter(VerificationLog.CreatedOn >= start_datetime)
        except ValueError:
            pass
    
    if end_date:
        try:
            end_datetime = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
            query = query.filter(VerificationLog.CreatedOn < end_datetime)
        except ValueError:
            pass
    
    count = query.count()
    return {"total_count": count}

@router.patch("/update-log/{session_id}", status_code=status.HTTP_200_OK)
def update_log(
    session_id: str,
    payload: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """
    Update an existing verification log by SessionID.
    Only updates the fields provided in the payload.
    """
    # Find the log by SessionID
    log = db.query(VerificationLog).filter(VerificationLog.SessionID == session_id).first()

    if not log:
        raise HTTPException(status_code=404, detail="Verification log not found")

    # Update only the fields that are provided
    updatable_fields = [
        'DocumentVerification', 'LivenessVerification', 'PhotoVerification',
        'PhraseVerification', 'PhoneVerification', 'EmailVerification',
        'FinalVerification', 'LastModifiedOn', 'LastModifiedBy'
    ]

    for field in updatable_fields:
        if field in payload:
            setattr(log, field, payload[field])

    # Always update LastModifiedOn
    log.LastModifiedOn = datetime.utcnow()

    db.commit()
    db.refresh(log)

    return jsonable_encoder(log)

@router.get("/user-verification-count")
def get_user_verification_count(
    db: Session = Depends(get_db),
    user_id: int = Query(..., description="User ID to get verification count for"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    token: str = Query(..., description="Authentication token")
):
    """
    Get verification count for a specific user within a date range.
    Useful for subscription usage tracking.
    - Product owner users can see any user's count
    - Admin users can only see their own count
    - Other users can only see their own count
    """
    # Check user roles
    is_product_owner_user = is_product_owner(token, db)
    is_admin_user = is_admin(token, db)
    
    # For non-product_owner users, check if they're requesting their own data
    if not is_product_owner_user:
        current_user_id = session_store.get(token)
        if current_user_id != user_id:
            raise HTTPException(status_code=403, detail="Access denied: Can only view own verification count")
    
    query = db.query(VerificationLog).filter(VerificationLog.UserID == user_id)
    
    if start_date:
        try:
            start_datetime = datetime.strptime(start_date, "%Y-%m-%d")
            query = query.filter(VerificationLog.CreatedOn >= start_datetime)
        except ValueError:
            pass
    
    if end_date:
        try:
            end_datetime = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
            query = query.filter(VerificationLog.CreatedOn < end_datetime)
        except ValueError:
            pass
    
    count = query.count()
    return {"user_id": user_id, "verification_count": count} 