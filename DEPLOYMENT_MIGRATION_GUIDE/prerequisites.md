# Prerequisites and External Services

This document outlines all the external services, dependencies, and prerequisites required to run the VeraFi Identity Verification Platform.

## Table of Contents
1. [Database Requirements](#database-requirements)
2. [External Services](#external-services)
3. [Software Dependencies](#software-dependencies)
4. [Obtaining API Keys and Credentials](#obtaining-api-keys-and-credentials)

---

## Database Requirements

### Microsoft SQL Server
- **Version**: SQL Server 2016 or later (SQL Server 2019+ recommended)
- **Edition**: Express, Standard, or Enterprise
- **Connection**: TCP/IP enabled on port 1433
- **Authentication**: SQL Server authentication enabled

#### Required Configuration
- Database name: `AcuFi` (restored from backup)
- User with full permissions (CREATE, SELECT, INSERT, UPDATE, DELETE)
- ODBC Driver 18 for SQL Server installed

#### Download SQL Server
- **Download**: [Microsoft SQL Server Downloads](https://www.microsoft.com/en-us/sql-server/sql-server-downloads)
- **Free Edition**: SQL Server Express Edition available at no cost

#### Database Backup Provided
A complete database backup is provided in the repository at `MS_SQL_backup/AcuFi.bak.zip`:
- This is a full backup from **SQL Server 2022 Developer Edition**
- Contains all tables, stored procedures, and initial data
- Database name: `AcuFi`
- Includes user accounts, roles, and configuration data
- See [setup.md](./setup.md) for detailed restore instructions

---

## External Services

### 1. Azure Document Intelligence (Form Recognizer)

**Purpose**: Document OCR, ID document analysis (passport, driver's license), and field extraction.

**Required For**:
- Document type detection
- ID document verification
- Text extraction from images/PDFs

#### How to Obtain Azure Document Intelligence API Key

1. **Create an Azure Account**
   - Visit [Azure Portal](https://portal.azure.com/)
   - Sign up for a free account (includes $200 credit for 30 days)
   - Free tier available: 500 pages/month

2. **Create a Document Intelligence Resource**
   - Log in to [Azure Portal](https://portal.azure.com/)
   - Click "Create a resource"
   - Search for "Document Intelligence" (or "Form Recognizer")
   - Click "Create"

3. **Configure the Resource**
   - **Subscription**: Select your subscription
   - **Resource Group**: Create new or use existing
   - **Region**: Choose closest region (e.g., East US, West Europe)
   - **Name**: Choose a unique name (e.g., `verafi-document-ai`)
   - **Pricing Tier**:
     - Free (F0): 500 pages/month
     - Standard (S0): Pay-as-you-go

4. **Get Your Credentials**
   - After deployment, go to your resource
   - Navigate to "Keys and Endpoint" in the left menu
   - Copy:
     - **KEY 1** (or KEY 2) - This is your `api_key`
     - **Endpoint URL** - This is your `endpoint`

5. **Save Credentials**
   - Keep these credentials secure
   - You'll add them to `microservice/.env`

---

### 2. Email Service (Gmail SMTP)

**Purpose**: Sending OTP codes and email notifications to users.

**Required For**:
- User authentication (OTP-based login)
- Password reset functionality
- Email notifications

#### How to Obtain Gmail App Password

1. **Gmail Account Requirements**
   - Active Gmail account
   - Two-factor authentication (2FA) must be enabled

2. **Enable 2-Factor Authentication**
   - Go to [Google Account Security](https://myaccount.google.com/security)
   - Click "2-Step Verification"
   - Follow the setup wizard to enable 2FA
   - Verify with phone number or authenticator app

3. **Generate App Password**
   - Go to [Google Account Security](https://myaccount.google.com/security)
   - Scroll to "How you sign in to Google"
   - Click "App passwords" (if you don't see this, ensure 2FA is enabled)
   - Select app: "Mail"
   - Select device: "Other" (Custom name)
   - Enter name: "VeraFi Backend"
   - Click "Generate"
   - **Copy the 16-character password** - This is your `SENDER_EMAIL_APP_PASS`

4. **Save Credentials**
   - Email address: Your Gmail address (e.g., `youremail@gmail.com`)
   - App password: 16-character code from step 3

**Alternative**: For production, consider using dedicated email services like SendGrid, AWS SES, or Mailgun.

---

### 3. Twilio (Optional - for SMS/OTP via Phone)

**Purpose**: Send SMS-based OTP codes to users' phone numbers.

**Required For**:
- SMS-based authentication (optional feature)
- Phone verification

#### How to Obtain Twilio Credentials

1. **Create Twilio Account**
   - Visit [Twilio](https://www.twilio.com/)
   - Sign up for a free trial account
   - Free trial includes $15 credit

2. **Get Your Credentials**
   - Log in to [Twilio Console](https://console.twilio.com/)
   - On the dashboard, find:
     - **Account SID** - This is your `TWILIO_ACCOUNT_SID`
     - **Auth Token** - This is your `TWILIO_AUTH_TOKEN`

3. **Get a Phone Number**
   - In Twilio Console, navigate to "Phone Numbers" → "Manage" → "Buy a number"
   - Select a phone number (free with trial)
   - This is your `TWILIO_NUMBER` (include country code, e.g., +1234567890)

4. **Save Credentials**
   - Keep Account SID, Auth Token, and Phone Number secure
   - You'll add them to `backend/.env`

**Note**: This is optional. The application works without Twilio using email OTP only.

---

## Software Dependencies

### 1. Python

#### Backend
**Version Required**: Python 3.8 or later (Python 3.11+ recommended)

The backend has no specific Python version restrictions and can use the latest Python versions including 3.13+.

#### Microservice
**Version Required**: Python 3.9 - 3.12 (Python 3.11 recommended)

**Important**:
- **Microservice requires Python 3.9 - 3.12** due to MediaPipe dependency constraints
- **Python 3.13+ is NOT supported for microservice** (MediaPipe compatibility issue)
- Python 3.11 is recommended for best compatibility

**Download**:
- **Windows**: [Python.org](https://www.python.org/downloads/)
  - For backend: Any recent version (3.11+ recommended)
  - For microservice: Download Python 3.11.x or 3.12.x (NOT 3.13+)
  - During installation, check "Add Python to PATH"
- **Linux**: Use package manager (e.g., `sudo apt install python3.11`)
- **macOS**: Use Homebrew (`brew install python@3.11`) or download from Python.org

**Verify Installation**:
```bash
python --version
# or
python3 --version
# For backend: 3.8+ (any version)
# For microservice: Should show 3.9.x, 3.10.x, 3.11.x, or 3.12.x (NOT 3.13+)
```

---

### 2. Node.js (Frontend)

**Version Required**: Node.js 18.x or later (Node.js 20.x recommended)

**Download**:
- **All Platforms**: [Node.js Official Website](https://nodejs.org/)
- Choose LTS (Long Term Support) version

**Verify Installation**:
```bash
node --version
npm --version
```

---

### 3. FFmpeg (Microservice - Audio/Video Processing)

**Purpose**: Audio extraction from videos for transcription, video processing.

**Required For**:
- Liveness detection (video processing)
- Audio transcription with Whisper

#### How to Obtain FFmpeg

**Windows**:
1. Download FFmpeg from [FFmpeg Official Website](https://ffmpeg.org/download.html#build-windows)
   - Recommended: Use [gyan.dev builds](https://www.gyan.dev/ffmpeg/builds/)
   - Download "ffmpeg-release-essentials.zip"
2. Extract the ZIP file to a location (e.g., `C:\ffmpeg`)
3. The binaries are in the `bin` folder (e.g., `C:\ffmpeg\bin`)
4. You'll reference this path in the `.env` file (see setup.md)

**Linux (Ubuntu/Debian)**:
```bash
sudo apt update
sudo apt install ffmpeg
```

**macOS**:
```bash
brew install ffmpeg
```

**Verify Installation**:
```bash
ffmpeg -version
```

**Note**: For Windows, you can place the FFmpeg binaries in `microservice/ffmpeg/bin/` directory, or set the `FFMPEG_PATH` environment variable.

---

### 4. ODBC Driver for SQL Server

**Purpose**: Database connectivity between Python backend and SQL Server.

**Version Required**: ODBC Driver 17 or 18 for SQL Server

#### Download ODBC Driver

**Windows**:
- Download [ODBC Driver 18 for SQL Server](https://learn.microsoft.com/en-us/sql/connect/odbc/download-odbc-driver-for-sql-server)
- Run the installer (msodbcsql.msi)

**Linux (Ubuntu/Debian)**:
```bash
curl https://packages.microsoft.com/keys/microsoft.asc | sudo apt-key add -
curl https://packages.microsoft.com/config/ubuntu/$(lsb_release -rs)/prod.list | sudo tee /etc/apt/sources.list.d/mssql-release.list
sudo apt-get update
sudo ACCEPT_EULA=Y apt-get install -y msodbcsql18
```

**macOS**:
```bash
brew tap microsoft/mssql-release https://github.com/Microsoft/homebrew-mssql-release
brew update
brew install msodbcsql18
```

**Verify Installation**:
```bash
# Windows
odbcad32

# Linux/macOS
odbcinst -q -d -n "ODBC Driver 18 for SQL Server"
```

---

### 5. Git (Optional but Recommended)

**Purpose**: Version control and code management.

**Download**:
- **All Platforms**: [Git Official Website](https://git-scm.com/downloads)

**Verify Installation**:
```bash
git --version
```

---

## Summary Checklist

Before proceeding to setup, ensure you have:

### Required Services
- [ ] Microsoft SQL Server installed and running
- [ ] Azure Document Intelligence API key and endpoint
- [ ] Gmail account with app password (for email OTP)

### Optional Services
- [ ] Twilio credentials (for SMS OTP) - optional

### Software Dependencies
- [ ] Python 3.8+ installed (backend can use any version, microservice needs 3.9-3.12)
- [ ] Node.js 18+ installed
- [ ] FFmpeg binaries available
- [ ] ODBC Driver 18 for SQL Server installed

### Credentials Collected
- [ ] Azure Document Intelligence: `api_key` and `endpoint`
- [ ] Gmail: email address and app password
- [ ] SQL Server: server address, database name, username, password
- [ ] Twilio (optional): Account SID, Auth Token, Phone Number

---

## Next Steps

Once you have all prerequisites ready, proceed to [setup.md](./setup.md) for installation and configuration instructions.

---

## Support Resources

### Azure Document Intelligence
- [Documentation](https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/)
- [Support](https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/support)

### Gmail SMTP
- [App Passwords Guide](https://support.google.com/accounts/answer/185833)
- [SMTP Settings](https://support.google.com/mail/answer/7126229)

### Twilio
- [Documentation](https://www.twilio.com/docs)
- [Console](https://console.twilio.com/)
- [Support](https://www.twilio.com/help/support)

### FFmpeg
- [Documentation](https://ffmpeg.org/documentation.html)
- [Download](https://ffmpeg.org/download.html)

### SQL Server
- [Documentation](https://learn.microsoft.com/en-us/sql/sql-server/)
- [Express Edition](https://www.microsoft.com/en-us/sql-server/sql-server-downloads)
