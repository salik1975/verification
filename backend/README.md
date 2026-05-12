# VeraFi Backend

FastAPI-based backend API server for the VeraFi Identity Verification Platform.

## Overview

The VeraFi backend serves as the API gateway and orchestration layer, handling authentication, user management, configuration, and proxying requests to the microservice for AI/ML operations.

## Technology Stack

- **FastAPI** - Modern Python web framework
- **SQLAlchemy** - ORM for database operations
- **Alembic** - Database migrations
- **PyODBC** - SQL Server connectivity
- **Pydantic** - Data validation
- **Python-Jose** - JWT token handling
- **Passlib** - Password hashing
- **Twilio** - SMS/OTP services (optional)

## Project Structure

```
backend/
├── app/
│   ├── api/
│   │   └── v1/
│   │       └── endpoints/        # API route handlers
│   │           ├── auth.py       # Authentication endpoints
│   │           ├── users.py      # User management
│   │           ├── otp.py        # OTP verification
│   │           ├── config_store.py        # Configuration
│   │           ├── tenant_management.py   # Tenant management
│   │           ├── subscription_management.py  # Subscriptions
│   │           ├── verification.py        # Verification workflow
│   │           ├── verification_log.py    # Verification logs
│   │           ├── verification_config.py # Verification settings
│   │           └── microservice_proxy.py  # Microservice proxy
│   ├── core/
│   │   ├── config.py            # Application configuration
│   │   ├── config_db.py         # Database configuration
│   │   └── encryption_utils.py  # File encryption utilities
│   ├── crud/                    # Database CRUD operations
│   ├── db/                      # Database setup
│   ├── models/                  # SQLAlchemy models
│   ├── schemas/                 # Pydantic schemas
│   └── verification/            # Verification logic
│       ├── fraud_detector.py    # Fraud detection
│       ├── ofac_checker.py      # OFAC compliance
│       └── pdf_integrity.py     # PDF integrity checks
├── gsm_server/                  # SMS/Twilio integration
├── mail_server/                 # Email services
├── main.py                      # Application entry point
├── requirements.txt             # Python dependencies
└── env_example                  # Environment template
```

## Getting Started

### Prerequisites

- Python 3.8 or later (Python 3.11+ recommended)
  - Note: Backend has no specific version restrictions, can use latest Python including 3.13+
  - Python version restriction (3.9-3.12) only applies to the microservice due to MediaPipe
- Microsoft SQL Server
- ODBC Driver 18 for SQL Server
- Azure Document Intelligence credentials (for microservice)
- Gmail account with app password (for email OTP)
- Twilio account (optional, for SMS OTP)

### Installation

1. Create a virtual environment:
   ```bash
   python -m venv venv

   # Windows
   venv\Scripts\activate

   # Linux/macOS
   source venv/bin/activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Configure environment variables:
   ```bash
   cp env_example .env
   ```

   Edit `.env` with your configuration:
   ```env
   # Database Configuration
   DB_SERVER=localhost,1433
   DB_NAME=AcuFi
   DB_USER=sa
   DB_PASSWORD=your-password

   # Database URL for SQLAlchemy
   DATABASE_URL=mssql+pyodbc://sa:your-password@localhost,1433/AcuFi?driver=ODBC+Driver+18+for+SQL+Server&TrustServerCertificate=yes

   # Application Settings
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=30
   API_V1_STR=/api/v1
   PROJECT_NAME=VeraFi Backend API

   # Microservice URL
   MICROSERVICE_URL=http://localhost:8001

   # Email Configuration (Gmail)
   SENDER_EMAIL=your-email@gmail.com
   SENDER_EMAIL_APP_PASS=your-16-char-app-password

   # Twilio Configuration (Optional)
   TWILIO_ACCOUNT_SID=
   TWILIO_AUTH_TOKEN=
   TWILIO_NUMBER=
   ```

4. Set up the database:

   Import the provided database dump or run migrations:
   ```bash
   # If using database dump
   # Import using SQL Server Management Studio or sqlcmd

   # Or run migrations (if available)
   alembic upgrade head
   ```

### Running the Service

Start the backend server:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

With auto-reload for development:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The API will be available at http://localhost:8000

## API Documentation

### Interactive Documentation

When the server is running, access:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Health Check

**GET** `/health`

Check if the backend is running.

**Response:**
```json
{
  "status": "healthy",
  "message": "AcuFi Backend API is running"
}
```

### Core Endpoints

#### Authentication

- `POST /api/v1/auth/login` - User login with password or OTP
- `POST /api/v1/auth/send-otp` - Send OTP to email
- `POST /api/v1/send-otp` - Send OTP to phone (requires Twilio)
- `POST /api/v1/verify-otp` - Verify OTP code
- `POST /api/v1/send-email-otp` - Send email OTP
- `POST /api/v1/verify-email-otp` - Verify email OTP

#### User Management

- `GET /api/v1/users` - List users
- `POST /api/v1/users` - Create user
- `GET /api/v1/users/{user_id}` - Get user details
- `PUT /api/v1/users/{user_id}` - Update user
- `DELETE /api/v1/users/{user_id}` - Delete user

#### Verification

- `POST /api/v1/verification/start` - Start verification session
- `POST /api/v1/verification/complete` - Complete verification
- `GET /api/v1/verification/{session_id}` - Get verification status
- `POST /api/v1/verification-log` - Create verification log
- `GET /api/v1/verification-log` - List verification logs

#### Configuration

- `GET /api/v1/config-store` - Get configuration settings
- `PUT /api/v1/config-store` - Update configuration
- `GET /api/v1/verification-config` - Get verification settings
- `PUT /api/v1/verification-config` - Update verification settings

#### Tenant Management

- `GET /api/v1/tenant-management/tenants` - List tenants
- `POST /api/v1/tenant-management/tenants` - Create tenant
- `GET /api/v1/tenant-management/tenants/{tenant_id}` - Get tenant
- `PUT /api/v1/tenant-management/tenants/{tenant_id}` - Update tenant
- `DELETE /api/v1/tenant-management/tenants/{tenant_id}` - Delete tenant

#### Subscription Management

- `GET /api/v1/subscription-management/plans` - List subscription plans
- `POST /api/v1/subscription-management/plans` - Create plan
- `PUT /api/v1/subscription-management/plans/{plan_id}` - Update plan
- `GET /api/v1/subscription-management/subscriptions` - List subscriptions

#### Microservice Proxy

- `POST /api/v1/upload` - Upload and analyze document
- `POST /api/v1/face` - Extract face from image
- `POST /api/v1/api/liveness` - Perform liveness detection

## Features

### Authentication & Authorization

- **Multi-factor Authentication**: Password and OTP-based login
- **Role-based Access Control**: Product Owner, Admin, Operator roles
- **Session Management**: Secure token-based sessions
- **Password Hashing**: Bcrypt for secure password storage

### User Management

- User CRUD operations
- Role assignment and management
- User session tracking
- Access control by role

### Tenant & Subscription Management

- Multi-tenant architecture support
- Subscription plan management
- Usage tracking and analytics
- Tenant-specific configurations

### Verification Workflow

- Document verification orchestration
- Face verification coordination
- Liveness detection management
- Verification log storage
- Configurable verification rules

### Configuration Management

- Dynamic feature flags
- Tenant-specific settings
- Appearance customization
- Verification thresholds

### Data Security

- **File Encryption**: AES-256 for stored files
- **Secure Storage**: Configurable data retention
- **CORS Protection**: Configurable origins
- **Input Validation**: Pydantic schemas

## Configuration

### Environment Variables

Key environment variables in `.env`:

- **Database**:
  - `DB_SERVER` - SQL Server address
  - `DB_NAME` - Database name
  - `DB_USER` - Database user
  - `DB_PASSWORD` - Database password
  - `DATABASE_URL` - SQLAlchemy connection string

- **Application**:
  - `ALGORITHM` - JWT algorithm (HS256)
  - `ACCESS_TOKEN_EXPIRE_MINUTES` - Token expiration
  - `API_V1_STR` - API version prefix
  - `PROJECT_NAME` - Application name

- **Services**:
  - `MICROSERVICE_URL` - Microservice endpoint
  - `SENDER_EMAIL` - Gmail address for OTP
  - `SENDER_EMAIL_APP_PASS` - Gmail app password
  - `TWILIO_ACCOUNT_SID` - Twilio account SID (optional)
  - `TWILIO_AUTH_TOKEN` - Twilio auth token (optional)
  - `TWILIO_NUMBER` - Twilio phone number (optional)

### Database Configuration

The application uses SQL Server with PyODBC. Ensure:

1. SQL Server is running and accessible
2. ODBC Driver 18 is installed
3. Database exists with correct schema
4. User has appropriate permissions

### Feature Flags

Feature flags are stored in the `config_store` table:

- `STORE_ID_AND_LICENSE_PHOTO` - Store document photos
- `STORE_VIDEO` - Store liveness videos
- `STORE_EXTRACTED_FACES` - Store extracted face images
- `AES_KEY` - Encryption key for files

## Database Schema

### Core Tables

- **app_user**: User accounts
- **role**: User roles (Product Owner, Admin, Operator)
- **user_role_access**: User-role mappings
- **tenant_management**: Multi-tenant data
- **subscription_management**: Subscription plans
- **config_store**: Configuration key-value pairs
- **verification_log**: Verification history
- **verification_config**: Verification rules
- **document_types**: Supported document types
- **critical_fields**: Document field definitions

## Logging

The backend uses Python's logging module:

- **INFO**: Important operations (login, verification)
- **WARNING**: Suspicious activity, deprecated features
- **ERROR**: Errors and exceptions
- **DEBUG**: Detailed debugging information

Configure logging level via environment or application settings.

## Development

### Adding New Endpoints

1. Create endpoint file in `app/api/v1/endpoints/`
2. Define routes using FastAPI router
3. Add Pydantic schemas for request/response
4. Import and register router in `main.py`

### Database Operations

Use CRUD modules in `app/crud/` for database operations:
- Inherit from `CRUDBase` for standard operations
- Use SQLAlchemy models from `app/models/`
- Define Pydantic schemas in `app/schemas/`

### Testing

```bash
# Run tests
pytest tests/

# With coverage
pytest --cov=app tests/
```

## Deployment

### Production Settings

For production:

1. Use strong database passwords
2. Configure CORS for specific origins
3. Use HTTPS for all connections
4. Set up proper logging and monitoring
5. Use environment-specific configuration

### Process Management

Use PM2 or similar:

```bash
# Install PM2
npm install -g pm2

# Start backend
pm2 start "uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4" --name verafi-backend

# Save configuration
pm2 save

# Set to start on boot
pm2 startup
```

The included `run_pm2.bat` provides a Windows-specific configuration.

### Multiple Workers

For production, run with multiple workers:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Docker Deployment

The backend includes Docker support for containerized deployment.

#### Prerequisites

- Docker installed and running
- Docker Compose (optional, for docker-compose.yml)
- Access to SQL Server (can be on host or in separate container)

#### Using Docker Compose (Recommended)

1. Create a `.env` file in the backend directory with your credentials:
   ```env
   DB_SERVER=localhost,1433
   DB_NAME=AcuFi
   DB_USER=sa
   DB_PASSWORD=your-password
   DATABASE_URL=mssql+pyodbc://sa:your-password@localhost,1433/AcuFi?driver=ODBC+Driver+18+for+SQL+Server&TrustServerCertificate=yes
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=30
   API_V1_STR=/api/v1
   PROJECT_NAME=AcuFi Backend API
   MICROSERVICE_URL=http://localhost:3206
   SENDER_EMAIL=your-email@gmail.com
   SENDER_EMAIL_APP_PASS=your-app-password
   TWILIO_ACCOUNT_SID=
   TWILIO_AUTH_TOKEN=
   TWILIO_NUMBER=
   ```

2. Build and start the container:
   ```bash
   docker-compose up -d
   ```

   **Note:** The docker-compose.yml passes environment variables from your `.env` file to the container. The volume mount for `.env` file is optional and can be removed - it's recommended to rely on Docker environment variables instead.

3. View logs:
   ```bash
   docker-compose logs -f
   ```

4. Stop the container:
   ```bash
   docker-compose down
   ```

The service will be available at http://localhost:3209

#### Using Dockerfile Directly

1. Build the image:
   ```bash
   docker build -t acufi-backend .
   ```

2. Run the container:
   ```bash
   docker run -d \
     --name acufi-backend \
     -p 3209:3209 \
     -e DB_SERVER=localhost,1433 \
     -e DB_NAME=AcuFi \
     -e DB_USER=sa \
     -e DB_PASSWORD=your-password \
     -e DATABASE_URL=mssql+pyodbc://sa:your-password@localhost,1433/AcuFi?driver=ODBC+Driver+18+for+SQL+Server&TrustServerCertificate=yes \
     -e MICROSERVICE_URL=http://localhost:3206 \
     -e SENDER_EMAIL=your-email@gmail.com \
     -e SENDER_EMAIL_APP_PASS=your-app-password \
     acufi-backend
   ```

   **Note:** It's recommended to pass environment variables directly via `-e` flags rather than mounting the `.env` file as a volume.

#### Docker Configuration

- **Port**: 3209 (mapped from container to host)
- **Base Image**: Python 3.11-slim
- **ODBC Driver**: ODBC Driver 18 for SQL Server (installed automatically)
- **Environment Variables**: Recommended to pass via Docker environment variables (`-e` flags or `environment` section in docker-compose.yml) rather than mounting `.env` file as a volume

#### Database Connection from Container

When running in Docker, ensure your SQL Server is accessible from the container:

- If SQL Server is on the host machine, use `host.docker.internal` instead of `localhost`:
  ```env
  DB_SERVER=host.docker.internal,1433
  DATABASE_URL=mssql+pyodbc://sa:password@host.docker.internal,1433/AcuFi?driver=ODBC+Driver+18+for+SQL+Server&TrustServerCertificate=yes
  ```

- If SQL Server is in a separate Docker container, use the container service name or network alias.

## Troubleshooting

### Database Connection Errors

**Error**: Cannot connect to database

**Solutions**:
- Verify SQL Server is running
- Check `DB_SERVER` format: `hostname,port`
- Verify ODBC Driver 18 is installed
- Test with: `sqlcmd -S localhost,1433 -U sa -P password`
- Check firewall allows port 1433

### OTP Not Sending

**Error**: Failed to send OTP

**Solutions for Email**:
- Verify Gmail credentials in `.env`
- Ensure 2FA is enabled on Gmail
- Check app password is correct (16 chars)
- Review `mail_server/gmail_sender.py` logs

**Solutions for SMS**:
- Verify Twilio credentials
- Check Twilio account has credit
- Ensure phone number is verified (trial accounts)

### Microservice Connection Errors

**Error**: Cannot connect to microservice

**Solutions**:
- Verify microservice is running on port 8001
- Check `MICROSERVICE_URL` in `.env`
- Test microservice health: `curl http://localhost:8001/health`

### Import Errors

**Error**: Module not found

**Solutions**:
- Verify virtual environment is activated
- Reinstall dependencies: `pip install -r requirements.txt`
- Check Python version: `python --version` (3.8+)

## License

This backend is part of the VeraFi Identity Verification Platform for AcuFi.
