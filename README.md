# VeraFi - Identity Verification Platform

A comprehensive identity verification platform built with FastAPI, React, and microservice architecture. VeraFi provides secure document verification, face recognition, liveness detection, and multi-factor authentication for AcuFi.

## Architecture Overview

VeraFi follows a modern microservice architecture with three main components:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │  Microservice   │
│   (React)       │◄──►│   (FastAPI)     │◄──►│   (FastAPI)     │
│                 │    │                 │    │                 │
│ • UI Components │    │ • API Gateway   │    │ • Document OCR  │
│ • Auth Context  │    │ • Auth Service  │    │ • Face Detection│
│ • State Mgmt    │    │ • File Storage  │    │ • Liveness Check│
│ • Role-based UI │    │ • Encryption    │    │ • Audio Trans.  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Components

- **Frontend**: React TypeScript application with Tailwind CSS and shadcn/ui components
- **Backend**: FastAPI application serving as API gateway and orchestration layer
- **Microservice**: Stateless FastAPI service handling AI/ML processing tasks
- **Database**: Microsoft SQL Server for user management and configuration storage

## Getting Started

For detailed setup instructions, please refer to the deployment guides:

1. **[Prerequisites Guide](DEPLOYMENT_MIGRATION_GUIDE/prerequisites.md)** - External services, dependencies, and credential setup
2. **[Setup Guide](DEPLOYMENT_MIGRATION_GUIDE/setup.md)** - Complete installation and configuration instructions

### Quick Start

**Important Python Version Notes**:
- **Backend**: Can use any Python version (3.8+), including latest versions like 3.13+
- **Microservice**: Requires Python 3.9 - 3.12 (NOT 3.13+) due to MediaPipe constraints

```bash
# 1. Set up and start microservice (requires Python 3.9-3.12)
cd microservice
# If you have Python 3.13, use: py -3.11 -m venv venv (Windows) or python3.11 -m venv venv (Linux/macOS)
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
cp env_example .env  # Edit .env with your credentials
uvicorn microservice:app --host 0.0.0.0 --port 8001

# 2. Set up and start backend (any Python 3.8+)
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
cp env_example .env  # Edit .env with your credentials
uvicorn main:app --host 0.0.0.0 --port 8000

# 3. Set up and start frontend
cd frontend
npm install
npm run dev
```

Access the application at http://localhost:8080

## Key Features

### Authentication & Authorization
- Multi-factor authentication (password and OTP-based)
- Role-based access control (Product Owner, Admin, Operator)
- Session-based authentication with secure token management

### Document Verification
- Support for US and Canadian passports and driver's licenses
- OCR and field extraction using Azure Document Intelligence
- Document type detection and validation

### Identity Verification
- Face extraction and comparison using DeepFace
- Video-based liveness detection
- Audio transcription and phrase matching with Whisper AI

### Security
- AES-256 file encryption for stored documents
- Configurable data retention policies
- CORS protection and input validation

## Project Structure

```
acufi-code-handover/
├── backend/                    # FastAPI backend
│   ├── app/
│   │   ├── api/v1/endpoints/  # API routes
│   │   ├── core/              # Configuration
│   │   ├── crud/              # Database operations
│   │   ├── db/                # Database setup
│   │   ├── models/            # SQLAlchemy models
│   │   └── schemas/           # Pydantic schemas
│   ├── gsm_server/            # SMS/Twilio integration
│   ├── mail_server/           # Email services
│   └── main.py                # Application entry point
├── microservice/              # AI/ML processing service
│   ├── routes/                # API routes
│   ├── audio_transcriber.py   # Whisper integration
│   ├── utils.py               # Helper functions
│   └── microservice.py        # Main application
├── frontend/                  # React application
│   ├── src/
│   │   ├── components/        # UI components
│   │   ├── pages/             # Page components
│   │   └── utils/             # Utilities
│   └── public/                # Static assets
└── DEPLOYMENT_MIGRATION_GUIDE/
    ├── prerequisites.md       # Setup prerequisites
    └── setup.md               # Installation guide
```

## Configuration

### Required Services
- Microsoft SQL Server (database)
- Azure Document Intelligence (document OCR)
- Gmail SMTP or similar (email OTP)
- FFmpeg (audio/video processing)
- Twilio (optional - SMS OTP)

### Environment Variables

Each component requires environment configuration:

- **Backend**: `backend/.env` - Database, microservice URL, email, optional Twilio
- **Microservice**: `microservice/.env` - Azure credentials, FFmpeg path
- **Frontend**: `frontend/.env` - Backend API URL (optional for development)

See `env_example` files in each directory for templates.

## Health Checks

Verify services are running:

```bash
# Backend
curl http://localhost:8000/health

# Microservice
curl http://localhost:8001/health
```

## API Documentation

Interactive API documentation is available when the services are running:

- Backend API: http://localhost:8000/docs
- Microservice API: http://localhost:8001/docs

## Technology Stack

### Backend
- FastAPI
- SQLAlchemy
- Pydantic
- PyODBC
- Python-jose
- Passlib

### Microservice
- FastAPI
- Azure AI Document Intelligence
- OpenAI Whisper
- DeepFace
- OpenCV
- MediaPipe
- TensorFlow

### Frontend
- React 18
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Axios
- React Router

## Support

For issues or questions:
- Check the troubleshooting section in [setup.md](DEPLOYMENT_MIGRATION_GUIDE/setup.md)
- Review application logs (backend/server.log, terminal output)
- Contact the development team

## License

This project is licensed under the MIT License.
