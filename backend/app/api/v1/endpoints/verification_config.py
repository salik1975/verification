from fastapi import APIRouter, HTTPException, status, Header
from pydantic import BaseModel
from typing import Optional
import pyodbc
import os
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

# Import session store for token validation
from app.api.v1.endpoints.auth import session_store

# Pydantic models for verification configuration
class VerificationConfigResponse(BaseModel):
    success: bool
    message: str
    data: Optional[dict] = None

class UpdateVerificationConfigRequest(BaseModel):
    config_key: str
    config_value: str

def get_tenant_id_from_token(token: str) -> Optional[int]:
    """Get tenant_id from session token"""
    try:
        user_id = session_store.get(token)
        if not user_id:
            return None

        conn = pyodbc.connect(
            f"DRIVER={{ODBC Driver 18 for SQL Server}};"
            f"SERVER={os.getenv('DB_SERVER')};"
            f"DATABASE={os.getenv('DB_NAME')};"
            f"UID={os.getenv('DB_USER')};"
            f"PWD={os.getenv('DB_PASSWORD')};"
            "TrustServerCertificate=yes;"
            "Connection Timeout=20;"
        )
        cursor = conn.cursor()
        cursor.execute("SELECT tenant_id FROM app_user WHERE user_id = ?", user_id)
        result = cursor.fetchone()
        conn.close()

        return result[0] if result else None
    except Exception as e:
        logger.error(f"Error getting tenant_id from token: {e}")
        return None

@router.get("/test")
async def test_endpoint():
    return {"message": "Verification config router is working"}

@router.get("/verification-config", response_model=VerificationConfigResponse)
async def get_verification_config(token: Optional[str] = None):
    """
    Get verification configuration settings from the database.
    Uses tenant-specific configs if token provided, otherwise falls back to global.
    """
    try:
        # Establish DB connection
        conn = pyodbc.connect(
            f"DRIVER={{ODBC Driver 18 for SQL Server}};"
            f"SERVER={os.getenv('DB_SERVER')};"
            f"DATABASE={os.getenv('DB_NAME')};"
            f"UID={os.getenv('DB_USER')};"
            f"PWD={os.getenv('DB_PASSWORD')};"
            "TrustServerCertificate=yes;"
            "Connection Timeout=20;"
        )
        cursor = conn.cursor()

        # Get verification configuration keys
        verification_keys = [
            'ENABLE_DOCUMENT_UPLOAD',
            'ENABLE_LIVENESS_CHECK',
            'ENABLE_VIDEO_FACE',
            'ENABLE_LIVE_PHRASE',
            'ENABLE_FACE_MATCH',
            'ENABLE_OTP_VERIFICATION',
            'ENABLE_EMAIL_VERIFICATION',
            'ENABLE_CRITICAL_FIELDS_CHECK',
            'ENABLE_PHRASE_VERIFICATION'
        ]

        # Try to get tenant_id from token
        tenant_id = None
        if token:
            tenant_id = get_tenant_id_from_token(token)

        placeholders = ','.join(['?' for _ in verification_keys])

        config_data = {}

        if tenant_id:
            # Get tenant-specific configs
            cursor.execute(f"""
                SELECT key_name, value, description
                FROM config_store
                WHERE key_name IN ({placeholders}) AND tenant_id = ?
                ORDER BY key_name
            """, *verification_keys, tenant_id)

            tenant_results = cursor.fetchall()
            tenant_keys = set()

            for row in tenant_results:
                config_data[row.key_name] = {
                    "value": row.value.lower() == 'true',
                    "description": row.description
                }
                tenant_keys.add(row.key_name)

            # For keys not in tenant config, set as False (not available)
            for key in verification_keys:
                if key not in tenant_keys:
                    # Get description from global config
                    cursor.execute("""
                        SELECT description FROM config_store
                        WHERE key_name = ? AND tenant_id IS NULL
                    """, key)
                    desc_row = cursor.fetchone()
                    config_data[key] = {
                        "value": False,
                        "description": desc_row.description if desc_row else f"Configuration for {key}"
                    }
        else:
            # Fall back to global configs (for unauthenticated access)
            cursor.execute(f"""
                SELECT key_name, value, description
                FROM config_store
                WHERE key_name IN ({placeholders}) AND tenant_id IS NULL
                ORDER BY key_name
            """, verification_keys)

            results = cursor.fetchall()

            for row in results:
                config_data[row.key_name] = {
                    "value": row.value.lower() == 'true',
                    "description": row.description
                }

        conn.close()

        return VerificationConfigResponse(
            success=True,
            message="Verification configuration retrieved successfully",
            data=config_data
        )
        
    except Exception as e:
        logger.error(f"Error getting verification config: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get verification configuration"
        )

@router.put("/verification-config", response_model=VerificationConfigResponse)
async def update_verification_config(request: UpdateVerificationConfigRequest):
    """
    Update a specific verification configuration setting.
    """
    try:
        # Validate config key
        valid_keys = [
            'ENABLE_DOCUMENT_UPLOAD',
            'ENABLE_LIVENESS_CHECK', 
            'ENABLE_VIDEO_FACE',
            'ENABLE_LIVE_PHRASE',
            'ENABLE_FACE_MATCH',
            'ENABLE_OTP_VERIFICATION',
            'ENABLE_EMAIL_VERIFICATION',
            'ENABLE_CRITICAL_FIELDS_CHECK',
            'ENABLE_PHRASE_VERIFICATION'
        ]
        
        if request.config_key not in valid_keys:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid config key. Must be one of: {', '.join(valid_keys)}"
            )
        
        # Validate config value
        if request.config_value.lower() not in ['true', 'false']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Config value must be 'true' or 'false'"
            )
        
        # Establish DB connection
        conn = pyodbc.connect(
            f"DRIVER={{ODBC Driver 18 for SQL Server}};"
            f"SERVER={os.getenv('DB_SERVER')};"
            f"DATABASE={os.getenv('DB_NAME')};"
            f"UID={os.getenv('DB_USER')};"
            f"PWD={os.getenv('DB_PASSWORD')};"
            "TrustServerCertificate=yes;"
            "Connection Timeout=20;"
        )
        cursor = conn.cursor()

        # Update the configuration
        cursor.execute("""
            UPDATE config_store 
            SET value = ? 
            WHERE key_name = ? AND tenant_id IS NULL
        """, request.config_value, request.config_key)
        
        if cursor.rowcount == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Configuration key '{request.config_key}' not found"
            )
        
        conn.commit()
        conn.close()
        
        logger.info(f"Updated verification config: {request.config_key} = {request.config_value}")
        
        return VerificationConfigResponse(
            success=True,
            message=f"Configuration '{request.config_key}' updated successfully",
            data={
                "config_key": request.config_key,
                "config_value": request.config_value.lower() == 'true'
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating verification config: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update verification configuration"
        )
