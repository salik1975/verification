from typing import List, Optional, Literal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
import bcrypt
import logging
from app.api.dependencies import get_db
from app.models.app_user import AppUser
from app.models.role import Role
from app.models.user_role_access import UserRoleAccess
from app.models.user_session import UserSession
from app.models.verification_log import VerificationLog

router = APIRouter()


def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

# Pydantic schemas for user operations
class UserCreate(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters")
    is_active: bool = True
    is_superuser: bool = False
    tenant_id: Optional[int] = None
    role: Optional[Literal['admin', 'operator']] = 'operator'

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    password: Optional[str] = Field(None, min_length=8)
    is_active: Optional[bool] = None
    is_superuser: Optional[bool] = None
    role: Optional[Literal['admin', 'operator']] = None

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: Optional[str] = None
    is_active: bool
    is_superuser: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    *,
    db: Session = Depends(get_db),
    user_in: UserCreate,
):
    """
    Create new user.
    """
    # Check if user already exists
    existing_user = db.query(AppUser).filter(AppUser.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The user with this email already exists in the system.",
        )

    # Create user with hashed password
    hashed_password = hash_password(user_in.password)

    # Generate username from email (part before @)
    username = user_in.email.split('@')[0]
    # Ensure username is unique
    base_username = username
    counter = 1
    while db.query(AppUser).filter(AppUser.username == username).first():
        username = f"{base_username}{counter}"
        counter += 1

    db_user = AppUser(
        email=user_in.email,
        name=user_in.full_name or user_in.email.split('@')[0],
        username=username,
        password_hash=hashed_password,
        tenant_id=user_in.tenant_id,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    # Assign role to user
    role_name = user_in.role or ('admin' if user_in.is_superuser else 'operator')
    role = db.query(Role).filter(Role.name == role_name).first()
    if role:
        user_role = UserRoleAccess(
            user_id=db_user.user_id,
            role_id=role.role_id
        )
        db.add(user_role)
        db.commit()

    return UserResponse(
        id=db_user.user_id,
        email=db_user.email,
        full_name=db_user.name,
        is_active=True,
        is_superuser=user_in.is_superuser,
        created_at=datetime.now(),
        updated_at=None
    )


@router.get("/{user_id}", response_model=UserResponse)
def read_user(
    user_id: int,
    db: Session = Depends(get_db),
):
    """
    Get user by ID.
    """
    user_obj = db.query(AppUser).filter(AppUser.user_id == user_id).first()
    if not user_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return UserResponse(
        id=user_obj.user_id,
        email=user_obj.email,
        full_name=user_obj.name,
        is_active=True,
        is_superuser=False,
        created_at=None,
        updated_at=None
    )


@router.get("/", response_model=List[UserResponse])
def read_users(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
):
    """
    Retrieve users.
    """
    users = db.query(AppUser).offset(skip).limit(limit).all()
    return [
        UserResponse(
            id=u.user_id,
            email=u.email,
            full_name=u.name,
            is_active=True,
            is_superuser=False,
            created_at=None,
            updated_at=None
        ) for u in users
    ]


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    *,
    db: Session = Depends(get_db),
    user_id: int,
    user_in: UserUpdate,
):
    """
    Update user.
    """
    user_obj = db.query(AppUser).filter(AppUser.user_id == user_id).first()
    if not user_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Check if email is being updated and if it already exists
    if user_in.email and user_in.email != user_obj.email:
        existing_user = db.query(AppUser).filter(AppUser.email == user_in.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The user with this email already exists in the system.",
            )
        user_obj.email = user_in.email

    if user_in.full_name:
        user_obj.name = user_in.full_name

    if user_in.password:
        user_obj.password_hash = hash_password(user_in.password)

    # Handle role update
    if user_in.role:
        new_role = db.query(Role).filter(Role.name == user_in.role).first()
        if new_role:
            # Remove existing role assignments
            db.query(UserRoleAccess).filter(UserRoleAccess.user_id == user_id).delete()
            # Add new role
            user_role = UserRoleAccess(
                user_id=user_id,
                role_id=new_role.role_id
            )
            db.add(user_role)

    db.commit()
    db.refresh(user_obj)

    # Get current role for response
    current_role = db.query(Role).join(UserRoleAccess).filter(
        UserRoleAccess.user_id == user_id
    ).first()
    is_superuser = current_role and current_role.name == 'admin'

    return UserResponse(
        id=user_obj.user_id,
        email=user_obj.email,
        full_name=user_obj.name,
        is_active=True,
        is_superuser=is_superuser,
        created_at=None,
        updated_at=datetime.now()
    )


@router.delete("/{user_id}")
def delete_user(
    *,
    db: Session = Depends(get_db),
    user_id: int,
) -> dict:
    """
    Delete user and clean up all related records.

    Cleanup order:
    1. Delete user_role_access (role assignments)
    2. Delete user_session (active sessions)
    3. Nullify VerificationLog.UserID (preserve audit trail)
    4. Delete app_user record
    """
    logger = logging.getLogger(__name__)

    try:
        # Step 1: Verify user exists
        user_obj = db.query(AppUser).filter(AppUser.user_id == user_id).first()
        if not user_obj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        # Store email for response
        user_email = user_obj.email

        # Step 2: Delete user_role_access records
        deleted_roles = db.query(UserRoleAccess).filter(
            UserRoleAccess.user_id == user_id
        ).delete(synchronize_session=False)

        # Step 3: Delete user_session records
        deleted_sessions = db.query(UserSession).filter(
            UserSession.user_id == user_id
        ).delete(synchronize_session=False)

        # Step 4: Preserve VerificationLog audit trail (nullify UserID)
        updated_logs = db.query(VerificationLog).filter(
            VerificationLog.UserID == user_id
        ).update(
            {VerificationLog.UserID: None},
            synchronize_session=False
        )

        # Step 5: Delete the user
        db.delete(user_obj)

        # Step 6: Commit all changes in a single transaction
        db.commit()

        logger.info(f"User {user_email} (ID: {user_id}) deleted successfully")

        return {
            "message": "User deleted successfully",
            "details": {
                "user_id": user_id,
                "email": user_email,
                "roles_removed": deleted_roles,
                "sessions_invalidated": deleted_sessions,
                "audit_logs_preserved": updated_logs
            }
        }

    except HTTPException:
        # Re-raise HTTP exceptions (like 404)
        raise
    except IntegrityError as e:
        db.rollback()
        # Log the specific constraint that failed
        constraint_info = str(e.orig) if hasattr(e, 'orig') else str(e)
        logger.error(f"IntegrityError deleting user {user_id}: {constraint_info}")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot delete user due to database constraints: {constraint_info}"
        )
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting user {user_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete user: An unexpected error occurred"
        )