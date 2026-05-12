from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.endpoints import (
    users, document_types, criticalfield, document_detail, 
    verification_log, microservice_proxy, config_store, auth, 
    verification_config, tenant_management, subscription_management, verification
)
from app.core.config import settings
from app.core.config_db import ConfigDBService
from app.db.session import SessionLocal
import logging

# Set up logging
logger = logging.getLogger("uvicorn.error")

# Try to import OTP with error handling
try:
    from app.api.v1.endpoints import otp
    logger.info("OTP module imported successfully")
except Exception as e:
    logger.error(f"Failed to import OTP module: {e}")
    otp = None

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="AcuFi Backend API with professional architecture",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
)

# Set up CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(
    users.router,
    prefix=f"{settings.API_V1_STR}/users",
    tags=["users"],
)

app.include_router(
    document_types.router,
    prefix=f"{settings.API_V1_STR}/document-types",
    tags=["document-types"],
)

app.include_router(
    criticalfield.router,
    prefix=f"{settings.API_V1_STR}",
    tags=["criticalfield"],
)

app.include_router(
    document_detail.router,
    prefix=f"{settings.API_V1_STR}",
    tags=["document-detail"],
)

app.include_router(
    verification_log.router,
    prefix=f"{settings.API_V1_STR}",
    tags=["verification-log"],
)

app.include_router(
    microservice_proxy.router,
    prefix=f"{settings.API_V1_STR}",
    tags=["microservice-proxy"],
)

app.include_router(
    verification_config.router,
    prefix=f"{settings.API_V1_STR}",
    tags=["verification-config"],
)

app.include_router(
    config_store.router,
    prefix=f"{settings.API_V1_STR}",
    tags=["config-store"],
)

app.include_router(
    auth.router,
    prefix=f"{settings.API_V1_STR}",
    tags=["auth"],
)

app.include_router(
    tenant_management.router,
    prefix=f"{settings.API_V1_STR}/tenant-management",
    tags=["tenant-management"],
)

app.include_router(
    subscription_management.router,
    prefix=f"{settings.API_V1_STR}/subscription-management",
    tags=["subscription-management"],
)

app.include_router(
    verification.router,
    prefix=f"{settings.API_V1_STR}/verification",
    tags=["verification"],
)

# Add the OTP router if available
if otp is not None:
    try:
        app.include_router(
            otp.router,
            prefix=f"{settings.API_V1_STR}",
            tags=["otp"],
        )
        logger.info("OTP router registered successfully")
    except Exception as e:
        logger.error(f"Failed to register OTP router: {e}")
else:
    logger.warning("OTP module not available, skipping router registration")

@app.on_event("startup")
def load_config():
    db = SessionLocal()
    ConfigDBService.load_from_db(db)
    db.close()

@app.get("/")
def read_root():
    return {"message": "Welcome to AcuFi Backend API", "version": "1.0.0"}

@app.get("/health")
def health_check():
    return {"status": "healthy", "message": "AcuFi Backend API is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)