# VeraFi Microservice

AI-powered document processing and identity verification microservice for the VeraFi platform.

## Overview

The VeraFi microservice handles computationally intensive AI/ML operations including document OCR, face detection, liveness verification, and audio transcription. Built with FastAPI and powered by Azure Document Intelligence, OpenAI Whisper, and DeepFace.

## Technology Stack

- **FastAPI** - Web framework
- **Azure Document Intelligence** - Document OCR and field extraction
- **OpenAI Whisper** - Audio transcription
- **DeepFace** - Face detection and recognition
- **MediaPipe** - Facial landmark detection for liveness
- **OpenCV** - Image processing
- **FFmpeg** - Audio/video processing

## Project Structure

```
microservice/
├── routes/
│   ├── document.py         # Document upload and OCR
│   ├── verify.py           # Face verification endpoints
│   ├── liveness.py         # Liveness detection
│   ├── bank_statement.py   # Bank statement analysis
│   └── health.py           # Health check endpoint
├── audio_transcriber.py    # Whisper audio transcription
├── utils.py                # Utility functions
├── microservice.py         # Main application
├── generate_keys.py        # AES key generation utility
└── requirements.txt        # Python dependencies
```

## Getting Started

### Prerequisites

- **Python 3.9 - 3.12** (Python 3.11 recommended)
  - **Important**: Python 3.13+ is NOT supported due to MediaPipe constraints
- FFmpeg installed and accessible
- Azure Document Intelligence credentials

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

   Edit `.env` with your credentials:
   ```env
   # Azure Document Intelligence
   AZURE_DOCUMENT_AI_KEY=your-azure-key
   AZURE_DOCUMENT_AI_ENDPOINT=https://your-resource.cognitiveservices.azure.com/

   # FFmpeg path (Windows only, leave empty for Linux/macOS if in system PATH)
   FFMPEG_PATH=C:\ffmpeg\bin
   ```

### Running the Service

Start the microservice:
```bash
uvicorn microservice:app --host 0.0.0.0 --port 8001
```

With auto-reload for development:
```bash
uvicorn microservice:app --host 0.0.0.0 --port 8001 --reload
```

The service will be available at http://localhost:8001

## API Endpoints

### Health Check

**GET** `/health`

Check if the service is running.

**Response:**
```json
{
  "status": "healthy"
}
```

### Document Analysis

**POST** `/upload`

Upload and analyze identity documents (passport, driver's license).

**Request:**
- `file`: Multipart form data (image or PDF)
- `session_id`: Optional session identifier

**Response:**
```json
{
  "status": "succeeded",
  "type": "driving_license",
  "documentType": "US_DRIVING_LICENSE",
  "analyzeResult": {
    "documents": [...],
    "pages": [...],
    "fields": {...}
  }
}
```

### Face Verification

**POST** `/api/v1/verify`

Extract face from uploaded image.

**Request:**
- `file`: Multipart form data (image)
- `session_id`: Optional session identifier

**Response:**
```json
{
  "face_filename": "data:image/jpeg;base64,...",
  "confidence": 0.95
}
```

**POST** `/api/v1/set-expected-phrase`

Set expected phrase for liveness detection.

**Request:**
```json
{
  "phrase": "The quick brown fox",
  "name": "John",
  "session_id": "optional-session-id"
}
```

### Liveness Detection

**POST** `/api/liveness`

Perform liveness detection with video and audio analysis.

**Request:**
- `video`: Multipart form data (video file)
- `session_id`: Optional session identifier

**Response:**
```json
{
  "liveness_score": 0.92,
  "is_live": true,
  "audio_transcript": "the quick brown fox",
  "phrase_match": true,
  "face_count": 1
}
```

### Bank Statement Analysis

**POST** `/analyze-bank-statement`

Analyze bank statements for transaction patterns.

**Request:**
- `file`: Multipart form data (bank statement PDF or image)

**Response:**
```json
{
  "status": "success",
  "transactions": [...],
  "summary": {...}
}
```

## Features

### Document Processing

- **Supported Documents:**
  - US Passports
  - Canadian Passports
  - US Driver's Licenses
  - Canadian Driver's Licenses
  - Bank Statements

- **OCR Capabilities:**
  - Field extraction (name, DOB, license number, etc.)
  - Document type detection
  - Face extraction from ID photos
  - Multi-page document support

### Face Recognition

- **Face Detection:** RetinaFace backend for accurate detection
- **Face Extraction:** Automatic face cropping and normalization
- **Face Comparison:** Facenet512 model with cosine distance
- **Threshold:** Configurable similarity threshold (default: 0.6)

### Liveness Detection

- **Video Analysis:** Facial landmark tracking using MediaPipe
- **Audio Transcription:** OpenAI Whisper for phrase verification
- **Multi-factor Verification:**
  - Face movement detection
  - Audio phrase matching (Levenshtein distance)
  - Frame-by-frame analysis

### Audio Processing

- **Whisper Model:** Base model for fast transcription
- **Video Support:** Automatic audio extraction from video files
- **Format Support:** WebM, MP4, AVI, MOV, MKV
- **Audio Extraction:** First 10 seconds for efficiency

## Configuration

### Environment Variables

- `AZURE_DOCUMENT_AI_KEY` - Azure Document Intelligence API key
- `AZURE_DOCUMENT_AI_ENDPOINT` - Azure service endpoint
- `FFMPEG_PATH` - Path to FFmpeg binaries (Windows only)

### Model Configuration

Models are automatically downloaded on first use:

- **Whisper:** `base` model (~140MB)
- **DeepFace:** Facenet512 model
- **MediaPipe:** Face mesh model

Models are cached locally for subsequent runs.

### FFmpeg Setup

**Windows:**
1. Download FFmpeg from [official website](https://ffmpeg.org/download.html)
2. Extract to a directory (e.g., `C:\ffmpeg`)
3. Set `FFMPEG_PATH` in `.env` to the `bin` folder

**Linux/macOS:**
```bash
# Ubuntu/Debian
sudo apt install ffmpeg

# macOS
brew install ffmpeg
```

Leave `FFMPEG_PATH` empty if FFmpeg is in system PATH.

## Logging

The microservice uses Python's logging module for structured logging:

- **INFO**: Important events (model loading, service startup)
- **DEBUG**: Detailed processing information (file paths, transcriptions)
- **ERROR**: Error conditions and exceptions

Configure logging level by setting the `LOG_LEVEL` environment variable or through the application's logging configuration.

## Utilities

### AES Key Generation

Generate a secure 256-bit AES key for file encryption:

```bash
python generate_keys.py
```

This creates `aes_key.txt` with a base64-encoded key suitable for AES-256 encryption.

## Performance Considerations

### First Request Latency

The first request after startup may be slow due to:
- Model loading (Whisper, DeepFace)
- Backend initialization (TensorFlow, MediaPipe)

Subsequent requests are significantly faster as models remain in memory.

### Resource Requirements

- **Memory:** 4GB minimum (8GB+ recommended)
- **CPU:** Multi-core recommended for video processing
- **GPU:** Optional, improves DeepFace and Whisper performance

### Optimization Tips

1. **Use workers:** Deploy with multiple Uvicorn workers for parallel processing
2. **Keep models loaded:** Don't restart the service frequently
3. **Limit video length:** Service extracts only first 10 seconds for efficiency
4. **Cache models:** Ensure model cache directory is persistent

## Deployment

### Development

```bash
uvicorn microservice:app --host 0.0.0.0 --port 8001 --reload
```

### Production

Without reload for stability:
```bash
uvicorn microservice:app --host 0.0.0.0 --port 8001 --workers 2
```

### Process Management

Use PM2 or similar for process management:
```bash
pm2 start "uvicorn microservice:app --host 0.0.0.0 --port 8001 --workers 2" --name verafi-microservice
```

The included `run_pm2.bat` script provides a Windows-specific PM2 configuration.

### Docker Deployment

The microservice includes Docker support for containerized deployment.

#### Prerequisites

- Docker installed and running
- Docker Compose (optional, for docker-compose.yml)

#### Using Docker Compose (Recommended)

1. Create a `.env` file in the microservice directory with your credentials:
   ```env
   AZURE_DOCUMENT_AI_KEY=your-azure-key
   AZURE_DOCUMENT_AI_ENDPOINT=https://your-resource.cognitiveservices.azure.com/
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

The service will be available at http://localhost:3206

#### Using Dockerfile Directly

1. Build the image:
   ```bash
   docker build -t acufi-microservice .
   ```

2. Run the container:
   ```bash
   docker run -d \
     --name acufi-microservice \
     -p 3206:3206 \
     -e AZURE_DOCUMENT_AI_KEY=your-azure-key \
     -e AZURE_DOCUMENT_AI_ENDPOINT=https://your-resource.cognitiveservices.azure.com/ \
     acufi-microservice
   ```

   **Note:** It's recommended to pass environment variables directly via `-e` flags rather than mounting the `.env` file as a volume.

#### Docker Configuration

- **Port**: 3206 (mapped from container to host)
- **Base Image**: Python 3.11-slim
- **FFmpeg**: Installed automatically in the container
- **Environment Variables**: Recommended to pass via Docker environment variables (`-e` flags or `environment` section in docker-compose.yml) rather than mounting `.env` file as a volume

## API Documentation

Interactive API documentation is available when the service is running:

- **Swagger UI:** http://localhost:8001/docs
- **ReDoc:** http://localhost:8001/redoc

## Troubleshooting

### Python Version Compatibility

**Error**: `ERROR: Could not find a version that satisfies the requirement mediapipe`

**Cause**: MediaPipe requires Python 3.9 - 3.12. Python 3.13+ is not supported.

**Solution**:
1. Check your Python version:
   ```bash
   python --version
   ```

2. If you have Python 3.13+, install Python 3.11 or 3.12:
   - **Windows**: Download from [Python.org](https://www.python.org/downloads/)
   - **Linux**: `sudo apt install python3.11`
   - **macOS**: `brew install python@3.11`

3. Create a virtual environment with the correct Python version:
   ```bash
   # Windows
   py -3.11 -m venv venv

   # Linux/macOS
   python3.11 -m venv venv
   ```

4. Activate and install dependencies:
   ```bash
   # Windows
   venv\Scripts\activate

   # Linux/macOS
   source venv/bin/activate

   pip install -r requirements.txt
   ```

### FFmpeg Not Found

**Error:** `ffmpeg is not installed or not found in PATH`

**Solution:**
- Verify FFmpeg is installed: `ffmpeg -version`
- Check `FFMPEG_PATH` in `.env` points to the correct directory
- On Linux/macOS, ensure FFmpeg is in system PATH

### Azure API Errors

**Error:** `401 Unauthorized` or API key errors

**Solution:**
- Verify credentials in `.env` are correct
- Check Azure resource is active and not quota-limited
- Ensure endpoint URL ends with `/`

### Model Download Issues

**Error:** Model download fails or times out

**Solution:**
- Check internet connectivity
- Ensure sufficient disk space for model cache
- Try downloading models manually to cache directory

### Memory Issues

**Error:** Out of memory or slow processing

**Solution:**
- Increase available RAM
- Reduce number of workers
- Process smaller batches of requests
- Use GPU acceleration if available

## License

This microservice is part of the VeraFi Identity Verification Platform for AcuFi.
