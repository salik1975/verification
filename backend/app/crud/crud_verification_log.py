from sqlalchemy.orm import Session
from app.models.verification_log import VerificationLog
from app.models.tenant import Tenant
from app.schemas.verification_log import VerificationLogCreate

def create_verification_log(db: Session, log_in: VerificationLogCreate):
    # Create the verification log
    db_log = VerificationLog(**log_in.dict())
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    
    # Update tenant's reports_used counter if user has a tenant
    if log_in.UserID:
        # Get user's tenant_id from app_user table
        from sqlalchemy import text
        result = db.execute(text("SELECT tenant_id FROM app_user WHERE user_id = :user_id"), 
                          {"user_id": log_in.UserID})
        user_row = result.fetchone()
        
        if user_row and user_row.tenant_id:
            # Increment tenant's reports_used counter
            tenant = db.query(Tenant).filter(Tenant.tenant_id == user_row.tenant_id).first()
            if tenant:
                tenant.reports_used = (tenant.reports_used or 0) + 1
                db.commit()
    
    return db_log 