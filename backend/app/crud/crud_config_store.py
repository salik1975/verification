from sqlalchemy.orm import Session
from sqlalchemy import text
from app.models.config_store import ConfigStore
from typing import List

def get_all(db: Session) -> List[ConfigStore]:
    """Get all global configurations (for backward compatibility)"""
    return db.query(ConfigStore).filter(ConfigStore.tenant_id.is_(None)).all()

def get_global_configs(db: Session) -> List[ConfigStore]:
    """Get all global configurations (tenant_id IS NULL)"""
    return db.query(ConfigStore).filter(ConfigStore.tenant_id.is_(None)).all()

def get_tenant_configs(db: Session, tenant_id: int) -> List[ConfigStore]:
    """Get tenant-specific configurations"""
    return db.query(ConfigStore).filter(ConfigStore.tenant_id == tenant_id).all()

def update_value(db: Session, key_name: str, value: str) -> ConfigStore:
    """Update global configuration value (for backward compatibility)"""
    # Use a more specific query to avoid StaleDataError
    # First, try to find the exact record with tenant_id = NULL
    obj = db.query(ConfigStore).filter(
        ConfigStore.key_name == key_name,
        ConfigStore.tenant_id.is_(None)
    ).first()
    
    if not obj:
        return None
    
    # Update the value directly using SQL to avoid ORM issues
    db.execute(
        text("UPDATE config_store SET value = :value WHERE key_name = :key_name AND tenant_id IS NULL"),
        {"value": value, "key_name": key_name}
    )
    db.commit()
    
    # Return the updated object
    return db.query(ConfigStore).filter(
        ConfigStore.key_name == key_name,
        ConfigStore.tenant_id.is_(None)
    ).first()

def update_tenant_value(db: Session, key_name: str, value: str, tenant_id: int) -> ConfigStore:
    """Update or create tenant-specific configuration value"""
    # First, try to find existing tenant-specific config
    obj = db.query(ConfigStore).filter(
        ConfigStore.key_name == key_name,
        ConfigStore.tenant_id == tenant_id
    ).first()
    
    if obj:
        # Update existing tenant-specific config
        db.execute(
            text("UPDATE config_store SET value = :value WHERE key_name = :key_name AND tenant_id = :tenant_id"),
            {"value": value, "key_name": key_name, "tenant_id": tenant_id}
        )
        db.commit()
    else:
        # Create new tenant-specific config
        # First get the global config to copy description
        global_config = db.query(ConfigStore).filter(
            ConfigStore.key_name == key_name,
            ConfigStore.tenant_id.is_(None)
        ).first()
        
        if not global_config:
            return None  # Global config doesn't exist
        
        # Insert new tenant-specific config
        db.execute(
            text("INSERT INTO config_store (key_name, value, description, tenant_id, is_global) VALUES (:key_name, :value, :description, :tenant_id, 0)"),
            {
                "key_name": key_name, 
                "value": value, 
                "description": global_config.description,
                "tenant_id": tenant_id
            }
        )
        db.commit()
    
    # Return the updated/created object
    return db.query(ConfigStore).filter(
        ConfigStore.key_name == key_name,
        ConfigStore.tenant_id == tenant_id
    ).first() 