# VeraFi Platform Setup Guide

This guide provides step-by-step instructions to set up and launch the VeraFi Identity Verification Platform on your local machine or server.

## Table of Contents
1. [Prerequisites Check](#prerequisites-check)
2. [Database Setup](#database-setup)
3. [Backend Setup](#backend-setup)
4. [Microservice Setup](#microservice-setup)
5. [Frontend Setup](#frontend-setup)
6. [Launch Instructions](#launch-instructions)
7. [Verification](#verification)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites Check

Before starting, ensure you have completed all steps in [prerequisites.md](./prerequisites.md):

- [ ] Python 3.8+ installed (backend can use any version, microservice requires 3.9-3.12)
- [ ] Node.js installed
- [ ] SQL Server installed
- [ ] ODBC Driver for SQL Server installed
- [ ] FFmpeg binaries downloaded
- [ ] Azure Document Intelligence credentials obtained
- [ ] Gmail app password generated
- [ ] (Optional) Twilio credentials obtained

---

## Database Setup

### Step 1: Install SQL Server

If you haven't already installed SQL Server:

**Windows**:
1. Download SQL Server from [Microsoft SQL Server Downloads](https://www.microsoft.com/en-us/sql-server/sql-server-downloads)
2. Run the installer and choose:
   - **Installation Type**: Basic or Custom
   - **Instance**: Default instance or named instance
   - **Authentication**: Mixed Mode (SQL Server and Windows Authentication)
   - Set a strong password for the `sa` account
3. Note down:
   - Server address (e.g., `localhost` or `127.0.0.1,1433`)
   - Instance name (if named instance)
   - SA password

**Linux (Ubuntu/Debian)**:
```bash
# Import Microsoft GPG key
wget -qO- https://packages.microsoft.com/keys/microsoft.asc | sudo apt-key add -

# Add SQL Server repository
sudo add-apt-repository "$(wget -qO- https://packages.microsoft.com/config/ubuntu/20.04/mssql-server-2022.list)"

# Install SQL Server
sudo apt-get update
sudo apt-get install -y mssql-server

# Configure SQL Server
sudo /opt/mssql/bin/mssql-conf setup

# Enable SQL Server service
sudo systemctl enable mssql-server
sudo systemctl start mssql-server
```

### Step 2: Import Database Dump

A SQL Server database backup is provided in `MS_SQL_backup/AcuFi.bak.zip`. Extract the `.bak` file and follow these steps to import it:

#### Option A: Restore from Backup File (.bak)

**Extract the backup file**:
1. Navigate to `MS_SQL_backup/` directory
2. Extract `AcuFi.bak.zip` to get `AcuFi.bak`

**Using SQL Server Management Studio (SSMS)**:
1. Download and install [SQL Server Management Studio](https://learn.microsoft.com/en-us/sql/ssms/download-sql-server-management-studio-ssms)
2. Connect to your SQL Server instance
3. Right-click on **Databases** → **Restore Database**
4. Select **Device** → Click **...** button
5. Click **Add** → Browse to the extracted `AcuFi.bak` file
6. Click **OK** to restore
7. The database will be restored as `AcuFi`

**Using T-SQL**:
```sql
-- Extract MS_SQL_backup/AcuFi.bak.zip first, then restore
RESTORE DATABASE AcuFi
FROM DISK = 'C:\path\to\extracted\AcuFi.bak'
WITH MOVE 'AcuFi' TO 'C:\Program Files\Microsoft SQL Server\MSSQL16.MSSQLSERVER\MSSQL\DATA\AcuFi.mdf',
     MOVE 'AcuFi_log' TO 'C:\Program Files\Microsoft SQL Server\MSSQL16.MSSQLSERVER\MSSQL\DATA\AcuFi_log.ldf',
     REPLACE;
GO
```

**Using sqlcmd (Linux/Windows Command Line)**:
```bash
# Extract MS_SQL_backup/AcuFi.bak.zip first
sqlcmd -S localhost -U sa -P '<YourPassword>' -Q "RESTORE DATABASE AcuFi FROM DISK='C:\path\to\extracted\AcuFi.bak' WITH REPLACE"
```

**Note**: The provided backup (`MS_SQL_backup/AcuFi.bak.zip`) is a full database backup from Microsoft SQL Server, so use Option A above. If you need to generate a SQL script instead, you can do so from SSMS after restoring the backup.

### Step 3: Verify Database Installation

Connect to the database and verify tables exist:

```sql
USE AcuFi;
GO

-- List all tables
SELECT TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_TYPE = 'BASE TABLE';
GO
```

You should see tables like:
- `app_user`
- `role`
- `user_role_access`
- `config_store`
- `document_types`
- `critical_fields`
- `verification_log`
- `tenant_management`
- `subscription_management`
- And others...

### Step 4: Create Database User (Optional but Recommended)

For better security, create a dedicated user instead of using `sa`:

```sql
USE AcuFi;
GO

-- Create login
CREATE LOGIN acufi_app WITH PASSWORD = 'StrongPassword123!';
GO

-- Create user in AcuFi database
CREATE USER acufi_app FOR LOGIN acufi_app;
GO

-- Grant permissions
ALTER ROLE db_owner ADD MEMBER acufi_app;
GO
```

---

## Backend Setup

### Step 1: Navigate to Backend Directory

```bash
cd backend
```

### Step 2: Create Python Virtual Environment

**Windows**:
```bash
python -m venv venv
venv\Scripts\activate
```

**Linux/macOS**:
```bash
python3 -m venv venv
source venv/bin/activate
```

You should see `(venv)` prefix in your terminal prompt.

### Step 3: Install Python Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

This will install:
- FastAPI
- Uvicorn
- SQLAlchemy
- Pyodbc
- Pydantic
- Passlib
- Python-jose
- Twilio
- And other dependencies

### Step 4: Configure Environment Variables

1. **Copy the example environment file**:
   ```bash
   # Windows
   copy env_example .env

   # Linux/macOS
   cp env_example .env
   ```

2. **Edit the `.env` file** with your configuration:
   ```bash
   # Use your preferred text editor
   # Windows: notepad .env
   # Linux/macOS: nano .env
   ```

3. **Update the following variables**:

```env
# Database Configuration
# Format: SERVER,PORT (note the comma!)
DB_SERVER=localhost,1433
DB_NAME=AcuFi
DB_USER=sa
DB_PASSWORD=YourSQLServerPassword

# Database URL for SQLAlchemy
# Replace <password> with your actual password
DATABASE_URL=mssql+pyodbc://sa:YourSQLServerPassword@localhost,1433/AcuFi?driver=ODBC+Driver+18+for+SQL+Server&TrustServerCertificate=yes

# Application Settings (leave as is)
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# API Settings (leave as is)
API_V1_STR=/api/v1
PROJECT_NAME=AcuFi Backend API

# Microservice URL
# Use the URL where the microservice will run
MICROSERVICE_URL=http://localhost:8001

# Email Configuration (Gmail)
SENDER_EMAIL=your-email@gmail.com
SENDER_EMAIL_APP_PASS=your-16-char-app-password

# Twilio Configuration (Optional - leave empty if not using SMS)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_NUMBER=
```

**Important Notes**:
- Replace `YourSQLServerPassword` with your actual SQL Server password
- Replace `your-email@gmail.com` with your Gmail address
- Replace `your-16-char-app-password` with the app password from Gmail
- For `DATABASE_URL`, ensure there are NO spaces and password is URL-encoded if it contains special characters

### Step 5: Test Database Connection

```bash
python -c "from app.db.session import engine; engine.connect(); print('Database connection successful!')"
```

If successful, you should see: `Database connection successful!`

---

## Microservice Setup

**Important**: The microservice requires Python 3.9 - 3.12 (NOT 3.13+) due to MediaPipe dependency. If you have Python 3.13, you must use an older Python version for the microservice.

### Step 1: Navigate to Microservice Directory

```bash
cd microservice
```

### Step 2: Create Python Virtual Environment

**Important**: Use Python 3.9 - 3.12 (NOT 3.13+)

**Windows (if you have multiple Python versions)**:
```bash
# Check Python version first
python --version

# If you have Python 3.13, use the Python launcher with a specific version
py -3.11 -m venv venv  # or py -3.10 or py -3.12
venv\Scripts\activate
```

**Windows (if you only have compatible Python 3.9-3.12)**:
```bash
python -m venv venv
venv\Scripts\activate
```

**Linux/macOS**:
```bash
# Use specific Python version if needed
python3.11 -m venv venv  # or python3.10 or python3.12
source venv/bin/activate
```

### Step 3: Install Python Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

This will install:
- Azure AI Document Intelligence
- DeepFace
- OpenCV
- Whisper
- MediaPipe
- FastAPI
- And other dependencies

**Note**: This may take several minutes as it installs large packages like TensorFlow and PyTorch.

### Step 4: Configure Environment Variables

1. **Copy the example environment file**:
   ```bash
   # Windows
   copy env_example .env

   # Linux/macOS
   cp env_example .env
   ```

2. **Edit the `.env` file**:
   ```bash
   # Use your preferred text editor
   # Windows: notepad .env
   # Linux/macOS: nano .env
   ```

3. **Update the following variables**:

```env
# Azure Document Intelligence Configuration
AZURE_DOCUMENT_AI_KEY=your-azure-key-from-portal
AZURE_DOCUMENT_AI_ENDPOINT=https://your-resource-name.cognitiveservices.azure.com/

# FFmpeg Configuration
# For Windows: Full path to ffmpeg bin directory
FFMPEG_PATH=C:\ffmpeg\bin

# For Linux/macOS: Leave empty if ffmpeg is in system PATH
# FFMPEG_PATH=

# Or specify custom path:
# FFMPEG_PATH=/usr/local/bin
```

**Important Notes**:
- Get Azure credentials from Azure Portal (see prerequisites.md)
- For Windows, use the full path to the `bin` folder (e.g., `C:\ffmpeg\bin`)
- For Linux/macOS, if you installed ffmpeg via package manager, you can leave `FFMPEG_PATH` empty

### Step 5: Set Up FFmpeg

#### Windows:
1. Download FFmpeg from [gyan.dev](https://www.gyan.dev/ffmpeg/builds/)
2. Extract to a location (e.g., `C:\ffmpeg`)
3. Verify the structure:
   ```
   C:\ffmpeg\
   └── bin\
       ├── ffmpeg.exe
       ├── ffplay.exe
       └── ffprobe.exe
   ```
4. Update `FFMPEG_PATH` in `.env` to point to the `bin` folder: `C:\ffmpeg\bin`

#### Linux:
```bash
sudo apt update
sudo apt install ffmpeg
which ffmpeg  # Verify installation
```

#### macOS:
```bash
brew install ffmpeg
which ffmpeg  # Verify installation
```

### Step 6: Test Configuration

```bash
python -c "from dotenv import load_dotenv; import os; load_dotenv(); print('Azure Key:', os.getenv('AZURE_DOCUMENT_AI_KEY')[:10] + '...'); print('Endpoint:', os.getenv('AZURE_DOCUMENT_AI_ENDPOINT'))"
```

This should print your Azure credentials (first 10 characters of key).

---

## Frontend Setup

### Step 1: Navigate to Frontend Directory

```bash
cd frontend
```

### Step 2: Install Node.js Dependencies

```bash
npm install
```

This will install:
- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui components
- Axios
- React Router
- And other dependencies

**Note**: This may take a few minutes.

### Step 3: Configure Environment Variables (Optional)

The frontend communicates with the backend only (not directly with the microservice). The backend then proxies requests to the microservice as needed.

If you need custom configuration, create a `.env` file:

```bash
# Windows
copy env_example .env

# Linux/macOS
cp env_example .env
```

Edit the `.env` file:

```env
# Microservice URL - for legacy support only, not currently used
VITE_API_BASE_URL=http://localhost:8001

# Backend API URL (frontend communicates with backend only)
VITE_API_BACKEND_URL=http://localhost:8000
```

**Note**: For local development with default ports (backend on 8000), you typically don't need to create or modify this `.env` file. The `vite.config.ts` file already configures the proxy to forward `/api` requests to the backend.

### Step 4: Build Frontend (Optional - for production)

For local development, skip this step. For production deployment:

```bash
npm run build
```

This creates an optimized production build in the `dist/` folder.

---

## Launch Instructions

Now that everything is configured, let's launch the three components in order.

### Step 1: Launch Microservice

1. **Open a new terminal window**
2. **Navigate to microservice directory**:
   ```bash
   cd microservice
   ```
3. **Activate virtual environment**:
   ```bash
   # Windows
   venv\Scripts\activate

   # Linux/macOS
   source venv/bin/activate
   ```
4. **Launch with uvicorn**:
   ```bash
   uvicorn microservice:app --host 0.0.0.0 --port 8001 --reload
   ```

**Expected Output**:
```
INFO:     Uvicorn running on http://0.0.0.0:8001 (Press CTRL+C to quit)
INFO:     Started reloader process [12345] using statreload
INFO:     Started server process [12346]
INFO:     Waiting for application startup.
Loading Whisper model: base
INFO:     Application startup complete.
```

**Note**: The first time you run this, it will download the Whisper model (~140MB), which may take a few minutes.

Leave this terminal running.

---

### Step 2: Launch Backend

1. **Open a new terminal window** (keep microservice running)
2. **Navigate to backend directory**:
   ```bash
   cd backend
   ```
3. **Activate virtual environment**:
   ```bash
   # Windows
   venv\Scripts\activate

   # Linux/macOS
   source venv/bin/activate
   ```
4. **Launch with uvicorn**:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```

**Expected Output**:
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [23456] using statreload
INFO:     Started server process [23457]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

Leave this terminal running.

---

### Step 3: Launch Frontend

1. **Open a new terminal window** (keep backend and microservice running)
2. **Navigate to frontend directory**:
   ```bash
   cd frontend
   ```
3. **Launch development server**:
   ```bash
   npm run dev
   ```

**Expected Output**:
```
  VITE v5.4.1  ready in 1234 ms

  ➜  Local:   http://localhost:8080/
  ➜  Network: http://192.168.1.100:8080/
  ➜  press h to show help
```

**Note**: The port may be different (5173 instead of 8080) depending on your configuration.

Leave this terminal running.

---

## Verification

### Step 1: Check All Services Are Running

You should now have **three terminal windows** running:

1. **Microservice**: http://localhost:8001
2. **Backend**: http://localhost:8000
3. **Frontend**: http://localhost:8080 (or 5173)

### Step 2: Test Microservice

Open a browser and visit:
```
http://localhost:8001/health
```

**Expected Response**:
```json
{
  "status": "healthy"
}
```

Or use curl:
```bash
curl http://localhost:8001/health
```

### Step 3: Test Backend

Open a browser and visit:
```
http://localhost:8000/health
```

**Expected Response**:
```json
{
  "status": "healthy",
  "message": "AcuFi Backend API is running"
}
```

Or use curl:
```bash
curl http://localhost:8000/health
```

### Step 4: Test Frontend

Open a browser and visit:
```
http://localhost:8080
```

You should see the **AcuFi Login Page**.

### Step 5: Test Full Integration

1. Open the frontend at http://localhost:8080
2. Try to log in with a test user (credentials from database dump)
3. Upload a test document
4. Verify the document analysis works
5. Test liveness detection

---

## Production Deployment

### Windows Server Deployment

The current deployment uses **PM2** to manage both backend and microservice uvicorn processes on a Windows Server VM. The `run_pm2.bat` scripts in the backend and microservice directories can be used to start the services with PM2.

### Docker Deployment

The application can be easily containerized and run in Docker on any platform. Docker configuration files can be added to each component directory for containerized deployment.

### Linux Deployment Notes

When deploying on Linux environments:
- All Python dependencies and services work identically
- **FFmpeg**: The only difference is using Linux FFmpeg binaries instead of Windows `.exe` files
  - Install via package manager: `sudo apt install ffmpeg` (Ubuntu/Debian) or `brew install ffmpeg` (macOS)
  - The application will automatically use the system FFmpeg from PATH
- The `FFMPEG_PATH` environment variable can be left empty if FFmpeg is installed system-wide

---

## Troubleshooting

### Issue: Database Connection Failed

**Error**: `Could not connect to database` or `Login failed for user`

**Solutions**:
1. Verify SQL Server is running:
   ```bash
   # Windows
   services.msc  # Check if SQL Server service is running

   # Linux
   sudo systemctl status mssql-server
   ```

2. Check connection string in `backend/.env`:
   - Verify server address (use `localhost,1433` or `127.0.0.1,1433`)
   - Verify database name matches
   - Check username and password
   - Ensure password doesn't have special characters that need URL encoding

3. Test connection with sqlcmd:
   ```bash
   sqlcmd -S localhost,1433 -U sa -P "YourPassword" -Q "SELECT @@VERSION"
   ```

4. Check firewall:
   - Ensure port 1433 is not blocked
   - On Windows: Allow SQL Server through Windows Firewall

---

### Issue: ODBC Driver Not Found

**Error**: `[Microsoft][ODBC Driver Manager] Data source name not found`

**Solutions**:
1. Install ODBC Driver 18:
   - Windows: Download from [Microsoft](https://learn.microsoft.com/en-us/sql/connect/odbc/download-odbc-driver-for-sql-server)
   - Linux: Follow instructions in prerequisites.md

2. Verify installation:
   ```bash
   # Windows
   odbcad32

   # Linux
   odbcinst -q -d
   ```

3. Update `DATABASE_URL` to use correct driver name:
   ```
   # Try Driver 17 if 18 is not available
   driver=ODBC+Driver+17+for+SQL+Server
   ```

---

### Issue: FFmpeg Not Found

**Error**: `ffmpeg is not installed or not found in PATH`

**Solutions**:
1. Verify FFmpeg is installed:
   ```bash
   ffmpeg -version
   ```

2. Check `FFMPEG_PATH` in `microservice/.env`:
   - Windows: Use full path to bin folder (e.g., `C:\ffmpeg\bin`)
   - Linux/macOS: Leave empty if installed via package manager

3. Add FFmpeg to system PATH:
   - Windows: System Properties → Environment Variables → PATH → Add `C:\ffmpeg\bin`
   - Linux/macOS: Already in PATH if installed via package manager

---

### Issue: Azure Document Intelligence API Error

**Error**: `401 Unauthorized` or `Invalid API key`

**Solutions**:
1. Verify credentials in `microservice/.env`:
   - Check `AZURE_DOCUMENT_AI_KEY` (no spaces, full key)
   - Check `AZURE_DOCUMENT_AI_ENDPOINT` (must end with `/`)

2. Test credentials with curl:
   ```bash
   curl -H "Ocp-Apim-Subscription-Key: YOUR_KEY" "YOUR_ENDPOINT/formrecognizer/info?api-version=2023-07-31"
   ```

3. Check Azure Portal:
   - Verify resource is active
   - Check quota/limits
   - Regenerate keys if needed

---

### Issue: Port Already in Use

**Error**: `Address already in use` or `Port 8000 is already in use`

**Solutions**:
1. Find process using the port:
   ```bash
   # Windows
   netstat -ano | findstr :8000
   taskkill /PID <PID> /F

   # Linux/macOS
   lsof -i :8000
   kill -9 <PID>
   ```

2. Use different ports:
   ```bash
   # Change port when launching
   uvicorn main:app --port 8002
   ```

---

### Issue: Frontend Build Errors

**Error**: Module not found or dependency errors

**Solutions**:
1. Clear node_modules and reinstall:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. Check Node.js version:
   ```bash
   node --version  # Should be 18.x or higher
   ```

3. Use npm ci for clean install:
   ```bash
   npm ci
   ```

---

### Issue: Email OTP Not Sending

**Error**: `Failed to send email` or SMTP error

**Solutions**:
1. Verify Gmail credentials in `backend/.env`:
   - Check email address is correct
   - Check app password (16 characters, no spaces)

2. Verify 2FA is enabled on Gmail account

3. Test with Python:
   ```python
   import smtplib
   from email.mime.text import MIMEText

   msg = MIMEText("Test")
   msg['Subject'] = 'Test'
   msg['From'] = 'your-email@gmail.com'
   msg['To'] = 'recipient@example.com'

   with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
       server.login('your-email@gmail.com', 'your-app-password')
       server.send_message(msg)
   ```

4. Check Gmail security settings:
   - Allow less secure apps (if needed)
   - Check blocked sign-in attempts

---

### Issue: Microservice Slow on First Request

**Symptom**: First document analysis takes 20-30 seconds

**Explanation**: This is normal. The microservice loads AI models (Whisper, DeepFace) on first request.

**Solutions**:
1. Models are cached after first load
2. For production, consider pre-warming:
   ```python
   # Add to microservice.py
   @app.on_event("startup")
   async def startup_event():
       preload_models()
   ```

---

### Issue: Virtual Environment Not Activating

**Error**: `venv\Scripts\activate` not working (Windows)

**Solutions**:
1. Change PowerShell execution policy:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

2. Use Command Prompt instead of PowerShell:
   ```cmd
   venv\Scripts\activate.bat
   ```

3. Or use Python directly without activation:
   ```bash
   venv\Scripts\python.exe -m uvicorn main:app
   ```

---

## Additional Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [SQL Server Documentation](https://learn.microsoft.com/en-us/sql/sql-server/)
- [Azure Document Intelligence Documentation](https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/)

---

## Next Steps

After successful setup:

1. **Configure System Settings**: Access the admin panel to configure feature flags and system settings
2. **Create User Accounts**: Add users with appropriate roles (Product Owner, Admin, Operator)
3. **Test Verification Flow**: Upload test documents and verify the complete flow
4. **Review Logs**: Monitor `backend/server.log` for any issues
5. **Set Up Monitoring**: Implement logging and monitoring for production

---

## Support

If you encounter issues not covered in this guide:

1. Check application logs:
   - Backend: `backend/server.log`
   - Microservice: Terminal output
   - Frontend: Browser console (F12)

2. Review error messages carefully
3. Verify all configuration files
4. Test each component independently
5. Contact the development team for assistance

---

**Last Updated**: October 2025
**Version**: 1.0.0
