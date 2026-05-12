from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.schemas.config_store import ConfigStoreRead
from app.crud import crud_config_store
from app.core.config_db import ConfigDBService
import pyodbc
import os
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

BOOL_KEYS = {
    "STORE_ID_AND_LICENSE_PHOTO", 
    "STORE_VIDEO", 
    "STORE_EXTRACTED_FACES",
    # Verification configuration boolean keys
    "ENABLE_DOCUMENT_UPLOAD",
    "ENABLE_CRITICAL_FIELDS_CHECK",
    "ENABLE_LIVENESS_CHECK",
    "ENABLE_VIDEO_FACE",
    "ENABLE_FACE_MATCH",
    "ENABLE_PHRASE_VERIFICATION",
    "ENABLE_LIVE_PHRASE",
    "ENABLE_OTP_VERIFICATION",
    "ENABLE_EMAIL_VERIFICATION"
}
APPEARANCE_KEYS = {"PRODUCT_LOGO", "PRODUCT_NAME_IMAGE", "PRODUCT_NAME", "PRIMARY_COLOR"}

# Import the session_store from auth module
from app.api.v1.endpoints.auth import session_store

def get_current_user_tenant_id(token: str) -> int:
    """Get the current user's tenant_id from the session token"""
    try:
        # Get user_id from in-memory session store
        user_id = session_store.get(token)
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid session token")
        
        # Get tenant_id for the user from database
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
        
        # Get tenant_id for the user
        cursor.execute("SELECT tenant_id FROM app_user WHERE user_id = ?", user_id)
        tenant_result = cursor.fetchone()
        
        conn.close()
        
        if not tenant_result:
            raise HTTPException(status_code=400, detail="User not found")
        
        # Access the tenant_id by index since pyodbc returns tuples
        tenant_id = tenant_result[0]
        if tenant_id is None:
            raise HTTPException(status_code=400, detail="User has no associated tenant")
        
        return tenant_id
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get user tenant: {str(e)}")

@router.get("/config-store", response_model=List[ConfigStoreRead])
def get_config_store(token: str = None, db: Session = Depends(get_db)):
    """Get tenant-specific configurations only, or global configs if no token provided"""
    try:
        # If no token provided, return global configs (for login page appearance)
        if not token:
            global_configs = crud_config_store.get_global_configs(db)
            result = []
            for config in global_configs:
                value = config.value
                if config.key_name == "AES_KEY":
                    value = "************"
                
                result.append(ConfigStoreRead(
                    key_name=config.key_name,
                    value=value,
                    description=config.description,
                    is_available=True
                ))
            return result
        
        # Get tenant_id for authenticated user
        tenant_id = get_current_user_tenant_id(token)
        
        # Get tenant-specific configs only
        tenant_configs = crud_config_store.get_tenant_configs(db, tenant_id)
        
        # Get all possible config keys from global configs for reference
        global_configs = crud_config_store.get_global_configs(db)
        all_possible_keys = {config.key_name for config in global_configs}
        
        # Create a map of existing tenant configs
        tenant_config_map = {config.key_name: config for config in tenant_configs}
        
        result = []
        for key_name in all_possible_keys:
            if key_name in tenant_config_map:
                # Tenant has this config
                config = tenant_config_map[key_name]
                value = config.value
                if key_name == "AES_KEY":
                    value = "************"
                
                result.append(ConfigStoreRead(
                    key_name=key_name,
                    value=value,
                    description=config.description,
                    is_available=True
                ))
            else:
                # Tenant doesn't have this config - show as unavailable
                # Get description from global config
                global_config = next((g for g in global_configs if g.key_name == key_name), None)
                description = global_config.description if global_config else f"Configuration for {key_name}"
                
                result.append(ConfigStoreRead(
                    key_name=key_name,
                    value="False",  # Default to False for unavailable configs
                    description=description,
                    is_available=False
                ))
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get configurations: {str(e)}")

class ConfigStoreUpdateItem(ConfigStoreRead):
    pass

@router.post("/config-store", response_model=List[ConfigStoreRead])
def update_config_store(items: List[ConfigStoreRead], token: str, db: Session = Depends(get_db)):
    """Update tenant-specific configurations"""
    try:
        tenant_id = get_current_user_tenant_id(token)

        updated_count = 0
        for item in items:
            if item.key_name in BOOL_KEYS:
                obj = crud_config_store.update_tenant_value(db, item.key_name, item.value, tenant_id)
                if not obj:
                    raise HTTPException(status_code=404, detail=f"Config key {item.key_name} not found")
                # Update in-memory config
                ConfigDBService.set(item.key_name, item.value)
                updated_count += 1
            elif item.key_name in APPEARANCE_KEYS:
                obj = crud_config_store.update_tenant_value(db, item.key_name, item.value, tenant_id)
                if not obj:
                    raise HTTPException(status_code=404, detail=f"Config key {item.key_name} not found")
                updated_count += 1
            elif item.key_name == "AES_KEY":
                # Do not allow updating AES_KEY from this endpoint
                continue
            else:
                raise HTTPException(status_code=400, detail=f"Config key {item.key_name} is not editable")
        
        # Return updated configs
        return get_config_store(token, db)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating configs: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to update configurations: {str(e)}") 