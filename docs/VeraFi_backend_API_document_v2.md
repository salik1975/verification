# VeraFi Backend API Documentation v2.0

**Base URL:** `https://kognitools.kognitoai.com/projects/acufi-qa/backend/api/v1`
**API Version:** 2.0.0
**Content-Type:** `application/json`
**Last Updated:** October 2025

## Table of Contents

1. [Authentication & Authorization](#authentication--authorization)
2. [Users Management](#users-management)
3. [Document Types Management](#document-types-management)
4. [Document Details Management](#document-details-management)
5. [Critical Fields & Configuration](#critical-fields--configuration)
6. [Verification Logs](#verification-logs)
7. [Verification Configuration](#verification-configuration)
8. [Configuration Store](#configuration-store)
9. [Tenant Management](#tenant-management)
10. [Subscription Management](#subscription-management)
11. [Microservice Proxy (Document Processing)](#microservice-proxy-document-processing)
12. [Verification Services](#verification-services)
13. [OTP Services](#otp-services)
14. [Feature Management](#feature-management)
15. [Health & Status](#health--status)

---

## Authentication & Authorization

### Login with Password

**POST** `/auth/login`

Authenticate user credentials using username/email and password combination.

**Request Body:**
```json
{
  "username_or_email": "string",
  "password": "string",
  "role": "string (optional)"
}
```

**Response:**
```json
{
  "user_id": 1,
  "name": "John Doe",
  "username": "johndoe",
  "email": "john@example.com",
  "roles": ["admin", "operator"],
  "token": "uuid-token-string"
}
```

**Notes:**
- Password is verified against bcrypt hash stored in database
- Role is optional; validates user has the requested role if provided
- Returns session token for subsequent authenticated requests

### Login with OTP

**POST** `/auth/login`

Authenticate user credentials using One-Time Password (OTP) verification.

**Request Body:**
```json
{
  "username_or_email": "string",
  "otp": "123456",
  "role": "string (optional)"
}
```

**Response:** Same as Login with Password

**Notes:**
- OTP must be valid and not expired (5 minute expiry)
- OTP is consumed after successful verification

### Send OTP for Login

**POST** `/auth/send-otp`

Transmit One-Time Password (OTP) to user's registered email address for authentication purposes.

**Request Body:**
```json
{
  "username_or_email": "string"
}
```

**Response:**
```json
{
  "message": "OTP sent to email"
}
```

**Notes:**
- OTP is sent via configured Gmail sender
- OTP expires after 5 minutes
- Rate limited to 1 request per 2 minutes

### Verify OTP

**POST** `/auth/verify-otp`

Validate One-Time Password (OTP) and retrieve authentication token upon successful verification.

**Request Body:**
```json
{
  "username_or_email": "string",
  "otp": "123456"
}
```

**Response:** Same as Login with Password

### Forgot Password

**POST** `/auth/forgot-password`

Initiate password reset process by requesting One-Time Password (OTP) transmission.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "OTP sent to email"
}
```

### Reset Password

**POST** `/auth/reset-password`

Reset user password using validated One-Time Password (OTP) verification.

**Request Body:**
```json
{
  "email": "user@example.com",
  "otp": "123456",
  "new_password": "newpassword123"
}
```

**Response:**
```json
{
  "message": "Password reset successful"
}
```

**Notes:**
- New password is hashed with bcrypt before storage
- OTP is consumed after successful reset

### Check Session

**GET** `/auth/session?token={token}`

Validate session token and retrieve comprehensive user details including tenant subscription information.

**Response:**
```json
{
  "user_id": 1,
  "name": "John Doe",
  "username": "johndoe",
  "email": "john@example.com",
  "roles": ["admin"],
  "tenant_id": 1,
  "tenant_name": "Acme Corp",
  "subscription_tier": "Premium",
  "subscription_service": "ID Verification",
  "max_reports": 1000,
  "reports_used": 150,
  "subscription_start_date": "2024-01-01T00:00:00Z",
  "subscription_end_date": "2024-12-31T23:59:59Z",
  "days_remaining": 300,
  "monthly_price": 99.99,
  "subscription_status": "active"
}
```

**Subscription Status Values:**
- `active`: More than 7 days remaining
- `expiring_soon`: 1-7 days remaining
- `expired`: Past end date

---

## Users Management

### Create User

**POST** `/users/`

Register a new user account in the system.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response (201):**
```json
{
  "id": 1,
  "email": "user@example.com",
  "full_name": null,
  "is_active": true,
  "is_superuser": false,
  "created_at": "2024-01-01T00:00:00Z"
}
```

### Get User by ID

**GET** `/users/{user_id}`

Retrieve comprehensive user information by unique identifier.

**Response:**
```json
{
  "id": 1,
  "email": "user@example.com",
  "full_name": "John Doe",
  "is_active": true,
  "is_superuser": false,
  "created_at": "2024-01-01T00:00:00Z"
}
```

### Get All Users

**GET** `/users/?skip=0&limit=100`

Retrieve a paginated collection of user accounts with comprehensive details.

**Query Parameters:**
- `skip`: Number of records to skip (default: 0)
- `limit`: Maximum number of records to return (default: 100)

**Response:**
```json
[
  {
    "id": 1,
    "email": "user1@example.com",
    "full_name": "John Doe",
    "is_active": true,
    "is_superuser": false,
    "created_at": "2024-01-01T00:00:00Z"
  },
  {
    "id": 2,
    "email": "user2@example.com",
    "full_name": "Jane Smith",
    "is_active": true,
    "is_superuser": false,
    "created_at": "2024-01-02T00:00:00Z"
  }
]
```

### Update User

**PUT** `/users/{user_id}`

Modify existing user account information and settings.

**Request Body:**
```json
{
  "email": "newemail@example.com",
  "full_name": "John Smith",
  "is_active": true
}
```

**Response:**
```json
{
  "id": 1,
  "email": "newemail@example.com",
  "full_name": "John Smith",
  "is_active": true,
  "is_superuser": false,
  "created_at": "2024-01-01T00:00:00Z"
}
```

### Delete User

**DELETE** `/users/{user_id}`

Permanently remove a user account from the system.

**Response:**
```json
{
  "message": "User deleted successfully"
}
```

---

## Document Types Management

### Get Document Types

**GET** `/document-types/?skip=0&limit=100`

Retrieve a comprehensive collection of available document types for verification processing.

**Query Parameters:**
- `skip`: Number of records to skip (default: 0)
- `limit`: Maximum number of records to return (default: 100)

**Response:**
```json
[
  {
    "Id": 1,
    "DocumentType": "Driver License",
    "Description": "US Driver License verification"
  },
  {
    "Id": 2,
    "DocumentType": "Passport",
    "Description": "International Passport verification"
  }
]
```

### Get Document Type by ID

**GET** `/document-types/{document_type_id}`

Retrieve detailed specifications and metadata for a specific document type.

**Response:**
```json
{
  "Id": 1,
  "DocumentType": "Driver License",
  "Description": "US Driver License verification",
  "ExpectedJson": "{}",
  "CreatedBy": "system",
  "CreatedOn": "2024-01-01T00:00:00Z",
  "LastModifiedBy": "admin",
  "LastModifiedOn": "2024-01-15T00:00:00Z",
  "isActive": true,
  "VerticalThresholdScore": 80
}
```

### Get Document Type by Name

**GET** `/document-types/by-name/{document_type_name}`

Retrieve document type specifications using the document type name identifier.

**Response:**
```json
{
  "Id": 1,
  "DocumentType": "Driver License",
  "Description": "US Driver License verification",
  "ExpectedJson": "{}",
  "CreatedBy": "system",
  "CreatedOn": "2024-01-01T00:00:00Z",
  "LastModifiedBy": "admin",
  "LastModifiedOn": "2024-01-15T00:00:00Z",
  "isActive": true,
  "VerticalThresholdScore": 80
}
```

---

## Document Details Management

### Get Document Details

**GET** `/document-detail?document_type=1`

Retrieve comprehensive field definitions and validation criteria for a specific document type.

**Query Parameters:**
- `document_type`: Document type ID (1-4)

**Response:**
```json
[
  {
    "Id": 1,
    "DocId": 1,
    "FieldKey": "name",
    "FieldLabelToDisplay": "Full Name",
    "isCritical": true,
    "Weightage": 85
  }
]
```

### Update Critical Field Status

**POST** `/document-detail`

Modify the critical status designation for a specific document field.

**Request Body:**
```json
{
  "Id": 1,
  "isCritical": true
}
```

**Response:**
```json
{
  "Id": 1,
  "DocId": 1,
  "FieldKey": "name",
  "FieldLabelToDisplay": "Full Name",
  "isCritical": true,
  "Weightage": 85
}
```

### Rename Field Label

**POST** `/document-detail/rename`

Modify the display label and presentation name for a document field.

**Request Body:**
```json
{
  "Id": 1,
  "NewFieldToDisplay": "Customer Full Name"
}
```

**Response:**
```json
{
  "Id": 1,
  "DocId": 1,
  "FieldKey": "name",
  "FieldLabelToDisplay": "Customer Full Name",
  "isCritical": true,
  "Weightage": 85
}
```

---

## Critical Fields & Configuration

### Get Critical Fields

**POST** `/displaycriticalfield`

Retrieve all fields designated as critical for a specific document type.

**Request Body:**
```json
{
  "documentType": "Driver License"
}
```

**Response:**
```json
{
  "status": "success",
  "documentType": "Driver License",
  "data": [
    {
      "FieldKey": "name",
      "FieldLabelToDisplay": "Full Name",
      "Weightage": 85
    }
  ],
  "count": 1
}
```

### Get Confidence Color Codes

**GET** `/fetchconfidencecode`

Retrieve the confidence level color coding configuration for visual representation.

**Query Parameters:**
- None required

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "fromconfidence": 0,
      "toconfidence": 50,
      "colorcodetailwind": "border-red-500",
      "colorcode_hex": "#ef4444",
      "hoverDescription": "Low confidence"
    }
  ],
  "count": 3
}
```

---

## Verification Logs

### Insert Verification Log

**POST** `/insert-logs`

Generate a new verification log entry to record verification process details.

**Request Body:**
```json
{
  "SessionID": "optional-session-uuid",
  "DocumentTypeID": "1",
  "ExtractedName": "John Doe",
  "ExtractedDocNumber": "D123456789",
  "ExtractedInfoJson": "{}",
  "DocumentVerification": true,
  "LivenessVerification": true,
  "PhotoVerification": true,
  "PhraseVerification": false,
  "PhoneVerification": true,
  "EmailVerification": false,
  "FaceSnapshotsJson": "{}",
  "FinalVerification": true,
  "UserID": 1
}
```

**Response:**
```json
{
  "Id": 1,
  "SessionID": "550e8400-e29b-41d4-a716-446655440000",
  "DocumentTypeID": "1",
  "ExtractedName": "John Doe",
  "ExtractedDocNumber": "D123456789",
  "ExtractedInfoJson": "{}",
  "DocumentVerification": true,
  "LivenessVerification": true,
  "PhotoVerification": true,
  "PhraseVerification": false,
  "PhoneVerification": true,
  "EmailVerification": false,
  "FaceSnapshotsJson": "{}",
  "FinalVerification": true,
  "UserID": 1,
  "CreatedOn": "2024-10-16T10:00:00Z",
  "LastModifiedOn": "2024-10-16T10:00:00Z",
  "IsActive": true
}
```

**Notes:**
- SessionID is auto-generated if not provided
- CreatedOn and LastModifiedOn timestamps are auto-set if not provided

### Get Verification Logs

**GET** `/retrieve-logs`

Retrieve verification logs with advanced filtering capabilities and pagination support.

**Query Parameters:**
- `token`: Authentication token (required)
- `skip`: Number of records to skip (default: 0)
- `limit`: Number of records to return (default: 50, max: 1000)
- `document_type_id`: Filter by document type
- `user_id`: Filter by user ID
- `start_date`: Start date filter (YYYY-MM-DD)
- `end_date`: End date filter (YYYY-MM-DD)
- `sort_by`: Sort field (default: CreatedOn)
- `sort_order`: Sort order (asc/desc, default: desc)

**Response:**
```json
[
  {
    "Id": 1,
    "SessionID": "uuid-string",
    "DocumentTypeID": "1",
    "ExtractedName": "John Doe",
    "DocumentVerification": true,
    "FinalVerification": true,
    "CreatedOn": "2024-01-01T12:00:00Z",
    "tenant_name": "Acme Corp",
    "tenant_id": 1
  }
]
```

**Access Control:**
- **Product Owner**: Can view all logs from all tenants
- **Admin**: Can view logs from their tenant only
- **Operator**: Can view logs from their tenant only

### Get Logs Count

**GET** `/retrieve-logs-count`

Retrieve the total count of verification logs to support pagination functionality.

**Query Parameters:** (Same as retrieve-logs)

**Response:**
```json
{
  "total_count": 1250
}
```

### Get User Verification Count

**GET** `/user-verification-count`

Retrieve verification count statistics for a specific user within a specified date range.

**Query Parameters:**
- `user_id`: User ID (required)
- `start_date`: Start date (YYYY-MM-DD)
- `end_date`: End date (YYYY-MM-DD)
- `token`: Authentication token (required)

**Response:**
```json
{
  "user_id": 1,
  "verification_count": 45
}
```

**Access Control:**
- **Product Owner**: Can view any user's count
- **Others**: Can only view their own count

---

## Verification Configuration

### Get Verification Configuration

**GET** `/verification-config`

Retrieve the current verification configuration settings and parameters.

**Response:**
```json
{
  "success": true,
  "message": "Verification configuration retrieved successfully",
  "data": {
    "ENABLE_DOCUMENT_UPLOAD": {
      "value": true,
      "description": "Enable document upload functionality"
    },
    "ENABLE_LIVENESS_CHECK": {
      "value": true,
      "description": "Enable liveness detection"
    },
    "ENABLE_VIDEO_FACE": {
      "value": true,
      "description": "Enable video face capture"
    },
    "ENABLE_LIVE_PHRASE": {
      "value": true,
      "description": "Enable live phrase verification"
    },
    "ENABLE_FACE_MATCH": {
      "value": true,
      "description": "Enable face matching"
    },
    "ENABLE_OTP_VERIFICATION": {
      "value": true,
      "description": "Enable OTP verification"
    },
    "ENABLE_EMAIL_VERIFICATION": {
      "value": true,
      "description": "Enable email verification"
    },
    "ENABLE_CRITICAL_FIELDS_CHECK": {
      "value": true,
      "description": "Enable critical fields validation"
    },
    "ENABLE_PHRASE_VERIFICATION": {
      "value": true,
      "description": "Enable phrase verification"
    }
  }
}
```

### Update Verification Configuration

**PUT** `/verification-config`

Modify a specific verification configuration parameter.

**Request Body:**
```json
{
  "config_key": "ENABLE_LIVENESS_CHECK",
  "config_value": "false"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Configuration 'ENABLE_LIVENESS_CHECK' updated successfully",
  "data": {
    "config_key": "ENABLE_LIVENESS_CHECK",
    "config_value": false
  }
}
```

**Valid Config Keys:**
- `ENABLE_DOCUMENT_UPLOAD`
- `ENABLE_LIVENESS_CHECK`
- `ENABLE_VIDEO_FACE`
- `ENABLE_LIVE_PHRASE`
- `ENABLE_FACE_MATCH`
- `ENABLE_OTP_VERIFICATION`
- `ENABLE_EMAIL_VERIFICATION`
- `ENABLE_CRITICAL_FIELDS_CHECK`
- `ENABLE_PHRASE_VERIFICATION`

---

## Configuration Store

### Get Configuration Store

**GET** `/config-store?token={token}`

Retrieve tenant-specific configuration parameters or global system configurations.

**Query Parameters:**
- `token`: Authentication token (optional, if not provided returns global configs for login page appearance)

**Response:**
```json
[
  {
    "key_name": "ENABLE_DOCUMENT_UPLOAD",
    "value": "True",
    "description": "Enable document upload functionality",
    "is_available": true
  },
  {
    "key_name": "PRIMARY_COLOR",
    "value": "#3B82F6",
    "description": "Primary brand color",
    "is_available": true
  },
  {
    "key_name": "PRODUCT_LOGO",
    "value": "https://example.com/logo.png",
    "description": "Product logo URL",
    "is_available": true
  }
]
```

**Configuration Types:**
- **Boolean Keys**: Verification and storage settings
- **Appearance Keys**: Branding and UI customization
- **System Keys**: Internal configuration (e.g., AES_KEY - masked in response)

### Update Configuration Store

**POST** `/config-store?token={token}`

Modify multiple configuration parameters for a specific tenant.

**Request Body:**
```json
[
  {
    "key_name": "ENABLE_LIVENESS_CHECK",
    "value": "True",
    "description": "Enable liveness detection",
    "is_available": true
  },
  {
    "key_name": "PRIMARY_COLOR",
    "value": "#10B981",
    "description": "Primary brand color",
    "is_available": true
  }
]
```

**Response:** Returns updated configuration list (same format as GET)

**Editable Configuration Keys:**

**Boolean Keys:**
- `STORE_ID_AND_LICENSE_PHOTO`
- `STORE_VIDEO`
- `STORE_EXTRACTED_FACES`
- `ENABLE_DOCUMENT_UPLOAD`
- `ENABLE_CRITICAL_FIELDS_CHECK`
- `ENABLE_LIVENESS_CHECK`
- `ENABLE_VIDEO_FACE`
- `ENABLE_FACE_MATCH`
- `ENABLE_PHRASE_VERIFICATION`
- `ENABLE_LIVE_PHRASE`
- `ENABLE_OTP_VERIFICATION`
- `ENABLE_EMAIL_VERIFICATION`

**Appearance Keys:**
- `PRODUCT_LOGO`
- `PRODUCT_NAME_IMAGE`
- `PRODUCT_NAME`
- `PRIMARY_COLOR`

---

## Tenant Management

### Get Tenants

**GET** `/tenant-management/tenants`

Retrieve a comprehensive collection of all tenants with detailed organizational information.

**Query Parameters:**
- `skip`: Number of records to skip (default: 0)
- `limit`: Maximum records to return (default: 100)
- `include_users`: Include user details (default: true)
- `active_only`: Only active tenants (default: false)
- `detailed`: Include detailed analytics (default: true)

**Response:**
```json
{
  "status": "success",
  "tenants": [
    {
      "tenant_id": 1,
      "name": "Acme Corp",
      "subscription_tier": "Premium",
      "subscription_service": "ID Verification",
      "onboarding_date": "2024-01-01T00:00:00Z",
      "subscription_start_date": "2024-01-01T00:00:00Z",
      "subscription_end_date": "2024-12-31T23:59:59Z",
      "reports_used": 150,
      "max_reports": 1000,
      "is_active": true,
      "admin_users": 2,
      "operator_users": 5,
      "total_users": 7,
      "monthly_price": 99.99,
      "days_left": 300,
      "status": "active",
      "users": [
        {
          "user_id": 1,
          "name": "John Doe",
          "email": "john@example.com",
          "role": "admin",
          "last_login": "2024-11-01T10:30:00Z",
          "is_active": true
        }
      ]
    }
  ],
  "summary": {
    "total_tenants": 1,
    "active_tenants": 1,
    "total_users": 7,
    "monthly_revenue": 99.99,
    "total_reports_used": 150
  }
}
```

**Status Values:**
- `active`: More than 5 days remaining
- `expiring_soon`: 1-5 days remaining
- `expired`: Past end date

### Get Tenant Users

**GET** `/tenant-management/tenants/{tenant_id}/users`

Retrieve a comprehensive user directory for a specific tenant organization.

**Response:**
```json
{
  "status": "success",
  "tenant_id": 1,
  "tenant_name": "Acme Corp",
  "users": [
    {
      "user_id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "role": "admin",
      "last_login": "2024-11-01T10:30:00Z",
      "is_active": true
    }
  ],
  "total_users": 1
}
```

### Create Tenant

**POST** `/tenant-management/tenants`

Establish a new tenant organization within the system.

**Request Body:**
```json
{
  "name": "New Company",
  "subscription_tier_id": 1,
  "subscription_service_id": 1
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Tenant 'New Company' created successfully",
  "tenant_id": 2
}
```

### Onboard Tenant

**POST** `/tenant-management/onboard`

Execute comprehensive tenant onboarding process including administrative user account creation.

**Request Body:**
```json
{
  "tenant_name": "New Company",
  "subscription_tier_id": 1,
  "subscription_service_id": 1,
  "subscription_start_date": "2024-01-01",
  "admin_name": "John Admin",
  "admin_username": "jadmin",
  "admin_email": "admin@newcompany.com",
  "admin_password": "securepassword123"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Tenant 'New Company' onboarded successfully",
  "tenant_id": 2,
  "user_id": 10,
  "tenant_name": "New Company",
  "admin_username": "jadmin",
  "admin_email": "admin@newcompany.com",
  "subscription_tier": "Basic",
  "subscription_service": "ID Verification",
  "monthly_price": 29.99,
  "max_reports": 100,
  "subscription_end_date": "2025-01-01T00:00:00Z"
}
```

**Onboarding Process:**
1. Validates subscription tier and service
2. Creates tenant record
3. Creates admin user with bcrypt password hashing
4. Assigns admin role to user
5. Creates tenant-specific feature configurations
6. Copies global appearance configurations

### Validate Tenant Onboarding

**POST** `/tenant-management/onboard/validate`

Validate tenant onboarding data and configuration without executing the creation process.

**Request Body:** Same as Onboard Tenant

**Response:**
```json
{
  "errors": [
    {
      "field": "tenant_name",
      "message": "Tenant name already exists"
    }
  ]
}
```

**Returns empty errors array if validation passes**

### Get User Dashboard Data

**GET** `/tenant-management/user-dashboard-data`

Retrieve comprehensive dashboard analytics and metrics for a specific user.

**Query Parameters:**
- `user_id`: User ID (required)
- `days_back`: Days of data to retrieve (default: 30, max: 365)

**Response:**
```json
{
  "status": "success",
  "user_id": 1,
  "tenant_id": 1,
  "tenant_name": "Acme Corp",
  "subscription_info": {
    "tier": "Premium",
    "service": "ID Verification",
    "max_reports": 1000,
    "used_reports": 150,
    "start_date": "2024-01-01T00:00:00Z",
    "end_date": "2024-12-31T23:59:59Z",
    "days_left": 300,
    "is_active": true,
    "price": 99.99,
    "status": "active",
    "usage_percentage": 15.0
  },
  "usage_stats": {
    "total_reports": 45,
    "document_reports": 30,
    "sms_reports": 10,
    "email_reports": 5,
    "weekly_average": 10.5,
    "period_days": 30
  },
  "daily_usage": [
    {
      "date": "2024-10-10",
      "reports": 5,
      "document_reports": 3,
      "sms_reports": 1,
      "email_reports": 1
    }
  ],
  "dashboard_metrics": {
    "reports_remaining": 850,
    "is_near_limit": false,
    "is_expiring_soon": false,
    "current_usage_rate": 1.5,
    "projected_days_until_limit": 566
  }
}
```

### Legacy Execute Tenant Operation

**POST** `/tenant-management/execute`

Single endpoint for all tenant management operations (Legacy support for backward compatibility).

**Supported Operations:**
- `create_tenant`
- `create_tenant_with_users`
- `add_users_to_existing_tenant`
- `create_users_without_tenant`
- `assign_users_to_tenant`
- `update_tenant_license`
- `add_roles_to_user`
- `remove_roles_from_user`
- `create_role`
- `get_tenant_info`
- `get_user_info`
- `list_all_tenants`
- `list_tenant_users`

**Request Body:**
```json
{
  "operation": "create_tenant",
  "tenant": {
    "name": "New Company",
    "license_info": {}
  }
}
```

**Response (varies by operation):**
```json
{
  "status": "success",
  "message": "Tenant 'New Company' created successfully",
  "tenant_id": 2,
  "tenant_name": "New Company",
  "license_info": {}
}
```

**Notes:**
- Response format varies depending on the operation requested
- For details on each operation's specific response, refer to the legacy operation functions in the backend code

---

## Subscription Management

### Get Subscription Plans

**GET** `/subscription-management/plans`

Retrieve comprehensive subscription plans with complete pricing matrix for frontend integration.

**Response:**
```json
{
  "tiers": [
    {
      "tier_id": 1,
      "tier_name": "Basic",
      "max_reports": 100,
      "is_active": true
    },
    {
      "tier_id": 2,
      "tier_name": "Premium",
      "max_reports": 1000,
      "is_active": true
    }
  ],
  "services": [
    {
      "service_id": 1,
      "service_name": "ID Verification",
      "is_active": true
    },
    {
      "service_id": 2,
      "service_name": "Bank Statement Analysis",
      "is_active": true
    }
  ],
  "pricing_matrix": [
    {
      "tier_id": 1,
      "service_id": 1,
      "price_usd": 29.99
    },
    {
      "tier_id": 2,
      "service_id": 1,
      "price_usd": 99.99
    }
  ]
}
```

### Get Pricing for Plan

**GET** `/subscription-management/pricing/{tier_id}/{service_id}`

Retrieve pricing information for a specific subscription tier and service combination.

**Response:**
```json
{
  "price": 29.99
}
```

### Subscription Tiers Management

**GET** `/subscription-management/tiers?skip=0&limit=100`
Get all subscription tiers with pagination.

**Query Parameters:**
- `skip`: Number of records to skip (default: 0)
- `limit`: Maximum number of records to return (default: 100, max: 1000)

**Response:**
```json
[
  {
    "tier_id": 1,
    "tier_name": "Basic",
    "max_reports": 100,
    "is_active": true,
    "created_on": "2024-01-01T00:00:00Z"
  },
  {
    "tier_id": 2,
    "tier_name": "Premium",
    "max_reports": 1000,
    "is_active": true,
    "created_on": "2024-01-01T00:00:00Z"
  }
]
```

**GET** `/subscription-management/tiers/{tier_id}`
Get a specific subscription tier by ID.

**Response:**
```json
{
  "tier_id": 1,
  "tier_name": "Basic",
  "max_reports": 100,
  "is_active": true,
  "created_on": "2024-01-01T00:00:00Z"
}
```

**POST** `/subscription-management/tiers`
Create a new subscription tier.

**Request Body:**
```json
{
  "tier_name": "Enterprise",
  "max_reports": 10000,
  "is_active": true
}
```

**Response:**
```json
{
  "tier_id": 3,
  "tier_name": "Enterprise",
  "max_reports": 10000,
  "is_active": true,
  "created_on": "2024-10-16T00:00:00Z"
}
```

**PUT** `/subscription-management/tiers/{tier_id}`
Update an existing subscription tier.

**Request Body:**
```json
{
  "tier_name": "Enterprise Plus",
  "max_reports": 15000,
  "is_active": true
}
```

**Response:**
```json
{
  "tier_id": 3,
  "tier_name": "Enterprise Plus",
  "max_reports": 15000,
  "is_active": true,
  "created_on": "2024-10-16T00:00:00Z"
}
```

**DELETE** `/subscription-management/tiers/{tier_id}`
Delete a subscription tier.

**Response:**
```json
{
  "message": "Subscription tier deleted successfully"
}
```

### Subscription Services Management

**GET** `/subscription-management/services?skip=0&limit=100`
Get all subscription services with pagination.

**Query Parameters:**
- `skip`: Number of records to skip (default: 0)
- `limit`: Maximum number of records to return (default: 100, max: 1000)

**Response:**
```json
[
  {
    "service_id": 1,
    "service_name": "ID Verification",
    "service_description": "Identity document verification service",
    "is_active": true,
    "created_on": "2024-01-01T00:00:00Z"
  },
  {
    "service_id": 2,
    "service_name": "Bank Statement Analysis",
    "service_description": "Financial document analysis service",
    "is_active": true,
    "created_on": "2024-01-01T00:00:00Z"
  }
]
```

**GET** `/subscription-management/services/{service_id}`
Get a specific subscription service by ID.

**Response:**
```json
{
  "service_id": 1,
  "service_name": "ID Verification",
  "service_description": "Identity document verification service",
  "is_active": true,
  "created_on": "2024-01-01T00:00:00Z"
}
```

**POST** `/subscription-management/services`
Create a new subscription service.

**Request Body:**
```json
{
  "service_name": "Bank Statement Analysis",
  "service_description": "Financial document analysis service",
  "is_active": true
}
```

**Response:**
```json
{
  "service_id": 3,
  "service_name": "Bank Statement Analysis",
  "service_description": "Financial document analysis service",
  "is_active": true,
  "created_on": "2024-10-16T00:00:00Z"
}
```

**PUT** `/subscription-management/services/{service_id}`
Update an existing subscription service.

**Request Body:**
```json
{
  "service_name": "Advanced Bank Statement Analysis",
  "service_description": "Enhanced financial document analysis",
  "is_active": true
}
```

**Response:**
```json
{
  "service_id": 3,
  "service_name": "Advanced Bank Statement Analysis",
  "service_description": "Enhanced financial document analysis",
  "is_active": true,
  "created_on": "2024-10-16T00:00:00Z"
}
```

**DELETE** `/subscription-management/services/{service_id}`
Delete a subscription service.

**Response:**
```json
{
  "message": "Subscription service deleted successfully"
}
```

### Subscription Pricing Management

**GET** `/subscription-management/pricing`
Get all subscription pricing records.

**Response:**
```json
[
  {
    "pricing_id": 1,
    "tier_id": 1,
    "service_id": 1,
    "price_usd": 29.99,
    "is_active": true,
    "created_on": "2024-01-01T00:00:00Z"
  },
  {
    "pricing_id": 2,
    "tier_id": 2,
    "service_id": 1,
    "price_usd": 99.99,
    "is_active": true,
    "created_on": "2024-01-01T00:00:00Z"
  }
]
```

**GET** `/subscription-management/pricing/{pricing_id}`
Get a specific pricing record by ID.

**Response:**
```json
{
  "pricing_id": 1,
  "tier_id": 1,
  "service_id": 1,
  "price_usd": 29.99,
  "is_active": true,
  "created_on": "2024-01-01T00:00:00Z"
}
```

**POST** `/subscription-management/pricing`
Create a new pricing record.

**Request Body:**
```json
{
  "tier_id": 1,
  "service_id": 1,
  "price_usd": 29.99,
  "is_active": true
}
```

**Response:**
```json
{
  "pricing_id": 3,
  "tier_id": 1,
  "service_id": 1,
  "price_usd": 29.99,
  "is_active": true,
  "created_on": "2024-10-16T00:00:00Z"
}
```

**PUT** `/subscription-management/pricing/{pricing_id}`
Update an existing pricing record.

**Request Body:**
```json
{
  "price_usd": 34.99,
  "is_active": true
}
```

**Response:**
```json
{
  "pricing_id": 3,
  "tier_id": 1,
  "service_id": 1,
  "price_usd": 34.99,
  "is_active": true,
  "created_on": "2024-10-16T00:00:00Z"
}
```

**DELETE** `/subscription-management/pricing/{pricing_id}`
Delete a pricing record.

**Response:**
```json
{
  "message": "Subscription pricing deleted successfully"
}
```

### Usage Statistics

**GET** `/subscription-management/usage/statistics?days_back=30`

Retrieve comprehensive subscription usage statistics and analytics.

**Query Parameters:**
- `days_back`: Days of data to retrieve (default: 30, max: 365)

**Response:**
```json
{
  "status": "success",
  "overall_stats": {
    "total_reports": 1500,
    "document_reports": 1000,
    "sms_reports": 300,
    "email_reports": 200,
    "weekly_average": 350,
    "period_days": 30
  },
  "period": {
    "start_date": "2024-09-10T00:00:00Z",
    "end_date": "2024-10-10T00:00:00Z",
    "days_back": 30
  }
}
```

**GET** `/subscription-management/usage/tiers?days_back=30`

Retrieve usage statistics aggregated by subscription tiers.

**Query Parameters:**
- `days_back`: Days of data to retrieve (default: 30, min: 1, max: 365)

**Response:**
```json
{
  "status": "success",
  "tier_statistics": [
    {
      "tier_id": 1,
      "tier_name": "Basic",
      "total_reports": 500,
      "active_tenants": 10,
      "this_month_reports": 100
    }
  ],
  "period": {
    "start_date": "2024-09-10T00:00:00Z",
    "end_date": "2024-10-10T00:00:00Z",
    "days_back": 30
  }
}
```

**GET** `/subscription-management/usage/services?days_back=30`

Retrieve usage statistics aggregated by subscription services.

**Query Parameters:**
- `days_back`: Days of data to retrieve (default: 30, min: 1, max: 365)

**Response:**
```json
{
  "status": "success",
  "service_statistics": [
    {
      "service_id": 1,
      "service_name": "ID Verification",
      "total_reports": 1200,
      "active_tenants": 15,
      "this_month_reports": 250
    }
  ],
  "period": {
    "start_date": "2024-09-10T00:00:00Z",
    "end_date": "2024-10-10T00:00:00Z",
    "days_back": 30
  }
}
```

---

## Microservice Proxy (Document Processing)

All microservice proxy endpoints forward requests to the configured microservice while handling encryption, storage, and data enrichment.

### Upload Document

**POST** `/upload`

Upload and process identity documents including driver licenses, passports, and other government-issued identification.

**Request Body:** `multipart/form-data`
- `file`: Document image file (PNG, JPG, JPEG)
- `session_id`: Session identifier (optional, auto-generated if not provided)

**Response:**
```json
{
  "type": "id_document",
  "documentType": "Driver License",
  "analyzeResult": {
    "documents": [
      {
        "fields": {
          "name": {
            "value": "John Doe",
            "confidence": 0.95
          },
          "documentNumber": {
            "value": "D123456789",
            "confidence": 0.98
          },
          "dateOfBirth": {
            "value": "1990-01-01",
            "confidence": 0.97
          },
          "expirationDate": {
            "value": "2025-12-31",
            "confidence": 0.96
          }
        }
      }
    ],
    "faces": ["base64-encoded-face-image"]
  },
  "phrase": "Please say: Blue sky with clouds",
  "session_id": "uuid-session-id"
}
```

**Processing Flow:**
1. Saves and encrypts document if `STORE_ID_AND_LICENSE_PHOTO` is enabled
2. Forwards to microservice for OCR and data extraction
3. Saves extracted face images if `STORE_EXTRACTED_FACES` is enabled
4. Extracts user name from OCR results
5. Generates verification phrase using the extracted name
6. Returns combined result to frontend

### Process Face Image/Video

**POST** `/face`

Process facial image or video content for identity verification purposes.

**Request Body:** `multipart/form-data`
- `file`: Face image or video file
- `session_id`: Session identifier (optional)

**Response:**
```json
{
  "face_filename": "data:image/jpeg;base64,encoded-face",
  "analysis_result": {
    "face_detected": true,
    "face_quality": 0.95
  },
  "session_id": "uuid-session-id"
}
```

**Notes:**
- Saves and encrypts file if storage is enabled
- Extracts and stores face images if `STORE_EXTRACTED_FACES` is enabled

### Verify Phrase

**POST** `/verify_phrase`

Generate or validate authentication phrases for user voice verification.

**Request Body:**
```json
{
  "session_id": "uuid-session-id",
  "name": "John Doe (optional)"
}
```

**Response:**
```json
{
  "phrase": "Please say: Blue sky with clouds",
  "session_id": "uuid-session-id"
}
```

### Verify Face Match

**POST** `/verify_face`

Perform facial comparison analysis between identity document and live photo/video content.

**Request Body:**
```json
{
  "session_id": "uuid-session-id"
}
```

**Response:**
```json
{
  "match_result": {
    "is_match": true,
    "confidence": 0.92,
    "threshold": 0.85
  },
  "session_id": "uuid-session-id"
}
```

### Liveness Detection

**POST** `/api/liveness`

Process video content for advanced liveness detection and anti-spoofing verification.

**Request Body:** `multipart/form-data`
- `video`: Video file (webm format)
- `session_id`: Session identifier (optional)

**Response:**
```json
{
  "liveness_result": {
    "is_live": true,
    "confidence": 0.94,
    "analysis": "Real person detected"
  },
  "session_id": "uuid-session-id"
}
```

**Notes:**
- Saves and encrypts video as 'liveness.webm' if `STORE_VIDEO` is enabled
- Timeout: 300 seconds for video processing

### Bank Statement Processing

**POST** `/bank_statement`

Process bank statement PDF for transaction extraction and verification.

**Request Body:** `multipart/form-data`
- `file`: PDF file containing bank statement
- `session_id`: Session identifier (optional)

**Response:**
```json
{
  "status": "succeeded",
  "documentType": "Bank Statement",
  "bankName": "ABC Bank",
  "accountNumber": "****1234",
  "statementPeriod": {
    "startDate": "2024-01-01",
    "endDate": "2024-01-31"
  },
  "transactions": [
    {
      "transactionIndex": 0,
      "date": {"value": "2024-01-05", "confidence": 0.98},
      "description": {"value": "ACH Payment", "confidence": 0.95},
      "depositAmount": {"value": 1000.00, "confidence": 0.99},
      "withdrawalAmount": {"value": 0, "confidence": 0.99},
      "balance": {"value": 5000.00, "confidence": 0.97},
      "flagged": false,
      "flaggedSeverity": null,
      "flaggedReasons": [],
      "flaggedModules": []
    }
  ],
  "verificationFlags": {
    "scanned": true,
    "ofacCheck": true,
    "integrityCheck": true,
    "fraudEngineCheck": true
  },
  "verificationSummary": {
    "ofac_check": {
      "passed": true,
      "confidence": 0.95,
      "processing_time": 1.23
    },
    "pdf_integrity": {
      "passed": true,
      "confidence": 0.98,
      "processing_time": 0.45
    },
    "fraud_detection": {
      "passed": true,
      "confidence": 0.92,
      "processing_time": 2.15
    }
  },
  "flaggedTransactionDetails": {
    "0": {
      "severity": "yellow",
      "reasons": ["High-value transaction detected"],
      "modules": ["Fraud Detection"]
    }
  },
  "flaggingSummary": {
    "total_flagged": 1,
    "red_flagged": 0,
    "yellow_flagged": 1
  },
  "fileInfo": {
    "pdfFile": "bank_statement.pdf",
    "jsonFile": "bank_statement_analysis.json",
    "sessionId": "uuid-session-id",
    "storedAt": "2024-10-10T12:00:00Z"
  }
}
```

**Verification Checks Performed:**
1. **PDF Integrity Check**: Validates PDF structure and detects tampering
2. **OFAC Check**: Screens transaction parties against OFAC sanctions list
3. **Fraud Detection**: Analyzes transaction patterns for anomalies

**Transaction Flagging:**
- **Red Severity**: Critical issues detected (OFAC match, high fraud score)
- **Yellow Severity**: Warning issues detected (suspicious patterns)
- Each flagged transaction includes reasons and which module flagged it

**File Storage:**
- PDF saved as `bank_statement.pdf`
- Analysis results saved as `bank_statement_analysis.json`
- Both files encrypted if `STORE_ID_AND_LICENSE_PHOTO` is enabled

---

## Verification Services

NEW endpoints for standalone verification checks on bank statements and transactions.

### Verify Bank Statement

**POST** `/verification/verify-bank-statement`

Run all verification checks on a bank statement.

**Request Body:** `multipart/form-data`
- `file`: PDF file to verify
- `session_id`: Session identifier (optional)
- `analysis_data`: JSON string containing bank statement analysis data (optional)

**Response:**
```json
{
  "status": "success",
  "message": "Verification completed",
  "data": {
    "verification_flags": {
      "scanned": true,
      "ofacCheck": true,
      "integrityCheck": true,
      "fraudEngineCheck": true
    },
    "verification_summary": {
      "ofac_check": {
        "check_name": "OFAC Sanctions Screening",
        "passed": true,
        "confidence": 0.95,
        "details": {},
        "issues": [],
        "processing_time": 1.23
      }
    },
    "flagged_transactions": {},
    "flagging_summary": {
      "total_flagged": 0,
      "red_flagged": 0,
      "yellow_flagged": 0
    }
  }
}
```

### Verify PDF Integrity

**POST** `/verification/verify-pdf-integrity`

Verify PDF integrity only.

**Request Body:** `multipart/form-data`
- `file`: PDF file to verify

**Response:**
```json
{
  "status": "success",
  "message": "PDF integrity verification completed",
  "data": {
    "check_name": "PDF Integrity Check",
    "passed": true,
    "confidence": 0.98,
    "details": {
      "file_size": 1024000,
      "page_count": 3,
      "encryption_detected": false,
      "signatures_found": false
    },
    "issues": [],
    "processing_time": 0.45,
    "timestamp": "2024-10-10T12:00:00Z"
  }
}
```

### Verify OFAC

**POST** `/verification/verify-ofac`

Verify transactions against OFAC sanctions list.

**Request Body:** `multipart/form-data`
- `transactions`: JSON string containing transactions data

**Response:**
```json
{
  "status": "success",
  "message": "OFAC verification completed",
  "data": {
    "check_name": "OFAC Sanctions Screening",
    "passed": true,
    "confidence": 0.95,
    "details": {
      "total_checked": 50,
      "matches_found": 0,
      "matches": []
    },
    "issues": [],
    "processing_time": 1.23,
    "timestamp": "2024-10-10T12:00:00Z"
  }
}
```

### Verify Fraud

**POST** `/verification/verify-fraud`

Run fraud detection on transactions.

**Request Body:** `multipart/form-data`
- `transactions`: JSON string containing transactions data

**Response:**
```json
{
  "status": "success",
  "message": "Fraud detection completed",
  "data": {
    "check_name": "Fraud Detection",
    "passed": true,
    "confidence": 0.92,
    "details": {
      "total_analyzed": 50,
      "flagged_count": 2,
      "flagged_transactions": [
        {
          "transactionIndex": 5,
          "fraud_score": 0.35,
          "reasons": ["Unusual transaction amount", "Off-hours transaction"]
        }
      ]
    },
    "issues": [],
    "processing_time": 2.15,
    "timestamp": "2024-10-10T12:00:00Z"
  }
}
```

### Get Verification Status

**GET** `/verification/verification-status`

Get available verification checks and their status.

**Query Parameters:**
- None required

**Response:**
```json
{
  "status": "success",
  "message": "Verification status retrieved",
  "data": {
    "available_checks": [
      "pdf_integrity",
      "ofac_check",
      "fraud_detection"
    ],
    "total_checks": 3,
    "timestamp": "2024-10-10T12:00:00Z"
  }
}
```

### Test Verification

**POST** `/verification/test-verification`

Test verification system with sample data.

**Response:**
```json
{
  "status": "success",
  "message": "Verification test completed",
  "results": {
    "verification_flags": {},
    "verification_summary": {}
  }
}
```

---

## OTP Services

### Send SMS OTP

**POST** `/send-otp`

Transmit One-Time Password (OTP) to specified phone number via SMS messaging service.

**Request Body:**
```json
{
  "phone_number": "1234567890",
  "country_code": "+1"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "data": {
    "phone_number": "+11234567890",
    "expires_in": "5 minutes"
  }
}
```

**Notes:**
- Uses Twilio for SMS delivery
- OTP expires after 5 minutes
- Rate limited to 1 request per 2 minutes per phone number
- Maximum 3 verification attempts per OTP

### Verify SMS OTP

**POST** `/verify-otp`

Validate SMS One-Time Password (OTP) code for authentication purposes.

**Request Body:**
```json
{
  "phone_number": "1234567890",
  "country_code": "+1",
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "data": {
    "phone_number": "+11234567890",
    "verified_at": "2024-01-01T12:00:00Z"
  }
}
```

**Error Response (Invalid OTP):**
```json
{
  "detail": "Invalid OTP. 2 attempts remaining."
}
```

### Send Email OTP

**POST** `/send-email-otp`

Transmit One-Time Password (OTP) to specified email address for authentication purposes.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email OTP sent successfully",
  "data": {
    "email": "user@example.com",
    "expires_in": "5 minutes"
  }
}
```

**Notes:**
- Uses Gmail sender for email delivery
- Same rate limiting and expiry as SMS OTP

### Verify Email OTP

**POST** `/verify-email-otp`

Validate email One-Time Password (OTP) code for authentication purposes.

**Request Body:**
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email OTP verified successfully",
  "data": {
    "email": "user@example.com",
    "verified_at": "2024-01-01T12:00:00Z"
  }
}
```

### Get Resend Timer

**GET** `/resend-timer/{phone_number}?country_code=+1`

Retrieve remaining time duration before OTP can be resent to the specified phone number.

**Response:**
```json
{
  "success": true,
  "data": {
    "can_resend": false,
    "remaining_seconds": 90,
    "remaining_time": "1:30"
  }
}
```

### Get Email Resend Timer

**GET** `/email-resend-timer/{email}`

Retrieve remaining time duration before email OTP can be resent to the specified email address.

**Response:**
```json
{
  "success": true,
  "data": {
    "can_resend": false,
    "remaining_seconds": 90,
    "remaining_time": "1:30"
  }
}
```

### Debug Endpoints (Development Only)

**GET** `/debug/otp-storage`
Check stored SMS OTPs (for development/testing only)

**Response:**
```json
{
  "+11234567890": {
    "otp": "123456",
    "expires_at": "2024-10-16T10:05:00Z",
    "attempts": 0
  }
}
```

**GET** `/debug/email-otp-storage`
Check stored email OTPs (for development/testing only)

**Response:**
```json
{
  "user@example.com": {
    "otp": "654321",
    "expires_at": "2024-10-16T10:05:00Z",
    "attempts": 0
  }
}
```

---

## Feature Management

### Get All Features

**GET** `/subscription-management/features`

Retrieve comprehensive collection of all available features and capabilities in the system.

**Query Parameters:**
- None required

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "feature_id": 1,
      "feature_name": "Document Upload",
      "feature_key": "DOCUMENT_UPLOAD",
      "is_active": true
    }
  ]
}
```

### Get Main Features

**GET** `/subscription-management/features/main`

Retrieve primary feature categories and parent features in the system hierarchy.

**Query Parameters:**
- None required

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "main_feature_id": 1,
      "feature_key": "VERIFICATION_SERVICES",
      "feature_name": "Verification Services",
      "description": "Document and identity verification services",
      "is_active": true
    }
  ]
}
```

### Get Sub-Features

**GET** `/subscription-management/features/sub/{main_feature_key}`

Retrieve sub-features and child features associated with a specific main feature category.

**Path Parameters:**
- `main_feature_key`: Main feature key (e.g., "VERIFICATION_SERVICES")

**Query Parameters:**
- None required

**Response:**
```json
{
  "status": "success",
  "main_feature": "VERIFICATION_SERVICES",
  "data": [
    {
      "sub_feature_id": 1,
      "feature_key": "DOCUMENT_UPLOAD",
      "feature_name": "Document Upload",
      "description": "Upload and process identity documents",
      "is_active": true
    },
    {
      "sub_feature_id": 2,
      "feature_key": "LIVENESS_CHECK",
      "feature_name": "Liveness Detection",
      "description": "Real-time liveness verification",
      "is_active": true
    }
  ]
}
```

---

## Health & Status

### Root Endpoint

**GET** `/`

Retrieve fundamental API information and system metadata.

**Query Parameters:**
- None required

**Response:**
```json
{
  "message": "Welcome to AcuFi Backend API",
  "version": "1.0.0"
}
```

### Health Check

**GET** `/health`

Retrieve comprehensive API health status and system operational metrics.

**Query Parameters:**
- None required

**Response:**
```json
{
  "status": "healthy",
  "message": "AcuFi Backend API is running"
}
```

---

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "detail": "Invalid request parameters"
}
```

### 401 Unauthorized
```json
{
  "detail": "Invalid credentials or authentication required"
}
```

### 403 Forbidden
```json
{
  "detail": "Access denied"
}
```

### 404 Not Found
```json
{
  "detail": "Resource not found"
}
```

### 422 Validation Error
```json
{
  "detail": [
    {
      "loc": ["body", "email"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

### 429 Too Many Requests
```json
{
  "detail": "Rate limit exceeded. Please try again later."
}
```

### 500 Internal Server Error
```json
{
  "detail": "Internal server error"
}
```

---

## Rate Limiting

- **OTP endpoints**: 1 request per 2 minutes per phone/email
- **Authentication endpoints**: 5 requests per minute per IP
- **General API endpoints**: 100 requests per minute per token

## Authentication

Most endpoints require authentication using a session token obtained from the login endpoints. Include the token as:

- **Query Parameter:** `?token={your-token}`
- **Header:** `Authorization: Bearer {your-token}` (for some endpoints)

## Pagination

List endpoints support pagination with:
- `skip`: Number of records to skip
- `limit`: Maximum number of records to return

## Date Formats

All dates are in ISO 8601 format: `YYYY-MM-DDTHH:mm:ssZ`

## File Uploads

File upload endpoints accept `multipart/form-data` with the following supported formats:
- **Images:** PNG, JPG, JPEG
- **Videos:** WebM, MP4
- **Documents:** PDF, PNG, JPG, JPEG

Maximum file size: 10MB per file.

## Encryption and Storage

The backend implements file encryption for sensitive data:

**Storage Configuration:**
- `STORE_ID_AND_LICENSE_PHOTO`: Enable storage of identity documents
- `STORE_VIDEO`: Enable storage of liveness videos
- `STORE_EXTRACTED_FACES`: Enable storage of extracted face images

**Encryption:**
- All stored files are encrypted using AES encryption
- Encryption key is managed via ConfigDBService
- Files are automatically decrypted when forwarded to microservice

**Session-Based Storage:**
- Files are organized by session_id in outputstorage directory
- Each session has its own folder: `outputstorage/{session_id}/`
- Encrypted files have `.enc` extension

---

## API Versioning

**Current Version:** v1
**Prefix:** `/api/v1`

---

**Document Version:** 2.0.0
**Last Updated:** October 13, 2025

