from sqlalchemy import Table, Column, String, Integer, Boolean, MetaData, PrimaryKeyConstraint
from app.db.base import Base
from sqlalchemy.orm import registry

# Use a separate registry for reflection
mapper_registry = registry()
metadata = MetaData()

config_store_table = Table(
    "config_store",
    metadata,
    Column("key_name", String(255), index=True),
    Column("value", String),
    Column("description", String),
    Column("tenant_id", Integer, nullable=True),
    Column("is_global", Boolean, nullable=True, default=False),
    PrimaryKeyConstraint("key_name", "tenant_id", name="PK_config_store_key_tenant")
)

@mapper_registry.mapped
class ConfigStore:
    __table__ = config_store_table 