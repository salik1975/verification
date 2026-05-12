import os
import logging
import random
import string
from datetime import datetime, timedelta
from fastapi import FastAPI, UploadFile, File, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
import httpx
import pyodbc
from dotenv import load_dotenv
import json
from pydantic import BaseModel
from typing import Optional

# Import TwilioService
from gsm_server.twilio_service import TwilioService

# Load environment variables for DB
load_dotenv()

app = FastAPI()
logger = logging.getLogger("uvicorn.error")

# 1️⃣ CORS — allow your React dev server
app.add_middleware(
    CORSMiddleware,
    # allow_origins=["http://localhost:8080"],
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for OTPs (in production, use Redis or database)
otp_storage = {}  # {phone_number: {"otp": "123456", "expires_at": datetime, "attempts": 0}}

# Pydantic models for OTP requests
class SendOTPRequest(BaseModel):
    phone_number: str
    country_code: str = "+1"

class VerifyOTPRequest(BaseModel):
    phone_number: str
    country_code: str = "+1"
    otp: str

class OTPResponse(BaseModel):
    success: bool
    message: str
    data: Optional[dict] = None



def generate_otp() -> str:
    """Generate a random 6-digit OTP."""
    return ''.join(random.choices(string.digits, k=6))

def get_full_phone_number(country_code: str, phone_number: str) -> str:
    """Combine country code and phone number."""
    # Remove any existing + from country code
    clean_country_code = country_code.replace('+', '')
    # Remove any existing + from phone number
    clean_phone = phone_number.replace('+', '')
    return f"+{clean_country_code}{clean_phone}"

def cleanup_expired_otps():
    """Remove expired OTPs from storage."""
    current_time = datetime.now()
    expired_phones = [
        phone for phone, data in otp_storage.items()
        if data["expires_at"] < current_time
    ]
    for phone in expired_phones:
        del otp_storage[phone]

# Dependency to get TwilioService
def get_twilio_service() -> TwilioService:
    """Get TwilioService instance."""
    try:
        return TwilioService()
    except Exception as e:
        logger.error(f"Failed to initialize TwilioService: {e}")
        raise HTTPException(status_code=500, detail="SMS service unavailable")

@app.post("/api/v1/send-otp", response_model=OTPResponse)
async def send_otp(request: SendOTPRequest):
    """
    Send OTP to the provided phone number.
    """
    try:
        # Clean up expired OTPs
        cleanup_expired_otps()
        
        # Get full phone number
        full_phone = get_full_phone_number(request.country_code, request.phone_number)
        
        # Check if OTP was recently sent (rate limiting)
        if full_phone in otp_storage:
            last_sent = otp_storage[full_phone].get("last_sent")
            if last_sent and datetime.now() - last_sent < timedelta(minutes=1):
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Please wait 1 minute before requesting another OTP"
                )
        
        # Generate OTP
        otp = generate_otp()
        
        # Store OTP with expiration (5 minutes)
        otp_storage[full_phone] = {
            "otp": otp,
            "expires_at": datetime.now() + timedelta(minutes=5),
            "attempts": 0,
            "last_sent": datetime.now()
        }
        
        # Get Twilio service
        twilio_service = get_twilio_service()
        
        # Send SMS with OTP
        message_body = f"Your VeraFi.Me verification code is: {otp}. Valid for 5 minutes. Do not share this code with anyone."
        
        result = twilio_service.send_sms(
            to_number=full_phone,
            message_body=message_body
        )
        
        if result['success']:
            logger.info(f"OTP sent successfully to {full_phone}")
            return OTPResponse(
                success=True,
                message="OTP sent successfully",
                data={
                    "phone_number": full_phone,
                    "expires_in": "5 minutes"
                }
            )
        else:
            # Remove stored OTP if SMS failed
            if full_phone in otp_storage:
                del otp_storage[full_phone]
            
            logger.error(f"Failed to send OTP to {full_phone}: {result['error']}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to send OTP: {result['error']}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending OTP: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send OTP"
        )

@app.post("/api/v1/verify-otp", response_model=OTPResponse)
async def verify_otp(request: VerifyOTPRequest):
    """
    Verify the OTP provided by the user.
    """
    try:
        # Clean up expired OTPs
        cleanup_expired_otps()
        
        # Get full phone number
        full_phone = get_full_phone_number(request.country_code, request.phone_number)
        
        # Check if OTP exists
        if full_phone not in otp_storage:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No OTP found for this phone number. Please request a new OTP."
            )
        
        otp_data = otp_storage[full_phone]
        
        # Check if OTP is expired
        if otp_data["expires_at"] < datetime.now():
            del otp_storage[full_phone]
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OTP has expired. Please request a new OTP."
            )
        
        # Check attempts limit (max 3 attempts)
        if otp_data["attempts"] >= 3:
            del otp_storage[full_phone]
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Too many failed attempts. Please request a new OTP."
            )
        
        # Increment attempts
        otp_data["attempts"] += 1
        
        # Verify OTP
        if otp_data["otp"] == request.otp:
            # OTP is correct, remove it from storage
            del otp_storage[full_phone]
            
            logger.info(f"OTP verified successfully for {full_phone}")
            return OTPResponse(
                success=True,
                message="OTP verified successfully",
                data={
                    "phone_number": full_phone,
                    "verified_at": datetime.now().isoformat()
                }
            )
        else:
            # OTP is incorrect
            if otp_data["attempts"] >= 3:
                del otp_storage[full_phone]
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Too many failed attempts. Please request a new OTP."
                )
            
            remaining_attempts = 3 - otp_data["attempts"]
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid OTP. {remaining_attempts} attempts remaining."
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verifying OTP: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to verify OTP"
        )

@app.get("/api/v1/otp/status/{phone_number}")
async def get_otp_status(phone_number: str, country_code: str = "+1"):
    """
    Get the status of OTP for a phone number (for debugging/testing).
    """
    try:
        full_phone = get_full_phone_number(country_code, phone_number)
        
        if full_phone in otp_storage:
            otp_data = otp_storage[full_phone]
            is_expired = otp_data["expires_at"] < datetime.now()
            
            return {
                "success": True,
                "data": {
                    "phone_number": full_phone,
                    "has_otp": True,
                    "is_expired": is_expired,
                    "attempts": otp_data["attempts"],
                    "expires_at": otp_data["expires_at"].isoformat(),
                    "remaining_attempts": 3 - otp_data["attempts"] if not is_expired else 0
                }
            }
        else:
            return {
                "success": True,
                "data": {
                    "phone_number": full_phone,
                    "has_otp": False
                }
            }
            
    except Exception as e:
        logger.error(f"Error getting OTP status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get OTP status"
        )

def allowed_file(fn: str) -> bool:
    return "." in fn and fn.rsplit(".", 1)[1].lower() in {"png", "jpg", "jpeg", "pdf"}

# FLASK_UPLOAD_URL = "http://localhost:3205/upload"


@app.post("/displaycriticalfield")
async def criticalfield(request: Request):
    try:
        body = await request.json()
        document_type = body.get("documentType")

        if not document_type:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing 'documentType' in request body"
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

        # Step 1: Fetch DocumentType ID
        cursor.execute("""
            SELECT Id, DocumentType 
            FROM DocumentType 
            WHERE DocumentType = ?
        """, document_type)
        doc_type_row = cursor.fetchone()

        if not doc_type_row:
            conn.close()
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="DocumentType not found"
            )

        document_type_id = doc_type_row.Id

        # Step 2: Fetch Critical Fields for that DocumentType
        cursor.execute("""
            SELECT FieldKey, FieldLabelToDisplay, Weightage 
            FROM DocumentDetail 
            WHERE DocId = ? AND isCritical = 1
        """, document_type_id)
        rows = cursor.fetchall()

        critical_fields = []
        for row in rows:
            critical_fields.append({
                "FieldKey": row.FieldKey,
                "FieldLabelToDisplay": row.FieldLabelToDisplay,
                "Weightage": row.Weightage
            })

        conn.close()

        return {
            "status": "success",
            "documentType": document_type,
            "data": critical_fields,
            "count": len(critical_fields)
        }

    except Exception as e:
        logger.error(f"❌ DB Fetch Failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch critical field information"
        )

@app.get("/fetchconfidencecode")
async def fetch():
    try:
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

        # Query to fetch confidence ranges from ConfidenceColor table
        query = """
        SELECT FromConfidence, ToConfidence, ConfidenceColorCode,BoxBorderColorHex,BoxBorderColorTailwind,HoverDescription
        FROM ConfidenceColor
        ORDER BY FromConfidence
        """
        
        cursor.execute(query)
        rows = cursor.fetchall()
        
        # Convert rows to list of dictionaries
        confidence_ranges = []
        for row in rows:
            confidence_ranges.append({
                "fromconfidence": row.FromConfidence,
                "toconfidence": row.ToConfidence,
                "colorcodetailwind": row.BoxBorderColorTailwind,
                "colorcode_hex":row.BoxBorderColorHex,
                "hoverDescription":row.HoverDescription
            })
        
        conn.close()
        
        return {
            "status": "success",
            "data": confidence_ranges,
            "count": len(confidence_ranges)
        }

    except Exception as e:
        logger.error(f"❌ DB Fetch Failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch confidence color ranges"
        )
