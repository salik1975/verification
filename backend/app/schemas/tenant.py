from pydantic import BaseModel, EmailStr, validator
from typing import Optional, Dict, Any
from datetime import datetime

class TenantCreate(BaseModel):
    name: str
    license_info: Dict[str, Any]

class TenantUpdate(BaseModel):
    name: Optional[str] = None
    license_info: Optional[Dict[str, Any]] = None

class TenantResponse(BaseModel):
    status: str
    message: str
    tenant_id: Optional[int] = None
    tenant_name: Optional[str] = None
    license_info: Optional[Dict[str, Any]] = None

# Tenant Onboarding Schemas
class TenantOnboardingRequest(BaseModel):
    tenant_name: str
    admin_name: str
    admin_email: EmailStr
    admin_username: str
    admin_password: str
    subscription_tier_id: int
    subscription_service_id: int
    subscription_start_date: str
    company_website: Optional[str] = None
    phone_number: Optional[str] = None
    address: Optional[str] = None

    @validator('tenant_name')
    def validate_tenant_name(cls, v):
        if not v.strip():
            raise ValueError('Tenant name is required')
        if len(v.strip()) < 2:
            raise ValueError('Tenant name must be at least 2 characters')
        if len(v.strip()) > 100:
            raise ValueError('Tenant name must be less than 100 characters')
        return v.strip()

    @validator('admin_name')
    def validate_admin_name(cls, v):
        if not v.strip():
            raise ValueError('Admin name is required')
        if len(v.strip()) < 2:
            raise ValueError('Admin name must be at least 2 characters')
        if len(v.strip()) > 100:
            raise ValueError('Admin name must be less than 100 characters')
        return v.strip()

    @validator('admin_username')
    def validate_admin_username(cls, v):
        if not v.strip():
            raise ValueError('Admin username is required')
        if len(v.strip()) < 3:
            raise ValueError('Admin username must be at least 3 characters')
        if len(v.strip()) > 50:
            raise ValueError('Admin username must be less than 50 characters')
        # Check for valid characters (alphanumeric and underscore only)
        if not v.strip().replace('_', '').isalnum():
            raise ValueError('Admin username can only contain letters, numbers, and underscores')
        return v.strip()

    @validator('admin_password')
    def validate_admin_password(cls, v):
        if not v:
            raise ValueError('Admin password is required')
        if len(v) < 6:
            raise ValueError('Admin password must be at least 6 characters')
        if len(v) > 128:
            raise ValueError('Admin password must be less than 128 characters')
        return v

    @validator('company_website')
    def validate_company_website(cls, v):
        if v and v.strip():
            if not v.startswith(('http://', 'https://')):
                v = 'https://' + v
            # Basic URL validation
            if len(v) > 255:
                raise ValueError('Company website URL is too long')
        return v.strip() if v else None

    @validator('phone_number')
    def validate_phone_number(cls, v):
        if v and v.strip():
            # Basic phone validation - allow digits, spaces, dashes, parentheses, plus
            cleaned = ''.join(c for c in v if c.isdigit() or c in ' +-()')
            if len(cleaned.replace(' ', '').replace('-', '').replace('(', '').replace(')', '').replace('+', '')) < 10:
                raise ValueError('Phone number must have at least 10 digits')
        return v.strip() if v else None

    @validator('subscription_start_date')
    def validate_subscription_start_date(cls, v):
        if not v:
            raise ValueError('Subscription start date is required')
        try:
            # Parse the date string to ensure it's valid
            datetime.strptime(v, '%Y-%m-%d')
            # Check if the date is not in the past
            from datetime import date
            selected_date = date.fromisoformat(v)
            if selected_date < date.today():
                raise ValueError('Subscription start date cannot be in the past')
        except ValueError as e:
            if 'cannot be in the past' in str(e):
                raise e
            raise ValueError('Invalid date format. Please use YYYY-MM-DD format')
        return v

class TenantOnboardingResponse(BaseModel):
    status: str
    message: str
    tenant_id: int
    user_id: int
    tenant_name: str
    admin_username: str
    admin_email: str
    subscription_tier: str
    subscription_service: str
    monthly_price: float
    max_reports: int
    subscription_end_date: str

class TenantOnboardingValidationError(BaseModel):
    field: str
    message: str

class TenantOnboardingValidationResponse(BaseModel):
    status: str = "validation_error"
    errors: list[TenantOnboardingValidationError]
