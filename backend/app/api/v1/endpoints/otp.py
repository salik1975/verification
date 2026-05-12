import logging
import random
import string
import os
import re
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr
from typing import Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Optional Twilio import
try:
    from twilio.rest import Client
    TWILIO_AVAILABLE = True
except ImportError:
    TWILIO_AVAILABLE = False
    Client = None

# Gmail sender import - using same pattern as auth.py
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..'))
try:
    from mail_server.gmail_sender import GmailSender
    GMAIL_AVAILABLE = True
except ImportError:
    GMAIL_AVAILABLE = False
    GmailSender = None

router = APIRouter()
logger = logging.getLogger("uvicorn.error")

# In-memory storage for OTPs (in production, use Redis or database)
otp_storage = {}  # {phone_number: {"otp": "123456", "expires_at": datetime, "attempts": 0}}
email_otp_storage = {}  # {email: {"otp": "123456", "expires_at": datetime, "attempts": 0}}

# Pydantic models for OTP requests
class SendOTPRequest(BaseModel):
    phone_number: str
    country_code: str = "+1"

class VerifyOTPRequest(BaseModel):
    phone_number: str
    country_code: str = "+1"
    otp: str

# New email OTP models
class SendEmailOTPRequest(BaseModel):
    email: EmailStr

class VerifyEmailOTPRequest(BaseModel):
    email: EmailStr
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

def validate_email(email: str) -> bool:
    """Validate email format."""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def cleanup_expired_otps():
    """Remove expired OTPs from storage."""
    current_time = datetime.now()
    
    # Clean up phone OTPs
    expired_phones = [
        phone for phone, data in otp_storage.items()
        if data["expires_at"] < current_time
    ]
    for phone in expired_phones:
        del otp_storage[phone]
    
    # Clean up email OTPs
    expired_emails = [
        email for email, data in email_otp_storage.items()
        if data["expires_at"] < current_time
    ]
    for email in expired_emails:
        del email_otp_storage[email]

def get_twilio_client():
    """Get Twilio client instance."""
    if not TWILIO_AVAILABLE:
        logger.error("Twilio library not available")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="SMS service not available - Twilio library not installed"
        )
    
    account_sid = os.getenv("TWILIO_ACCOUNT_SID")
    auth_token = os.getenv("TWILIO_AUTH_TOKEN")
    
    if not account_sid or not auth_token:
        logger.error("Twilio credentials not found in environment variables")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="SMS service configuration error"
        )
    
    return Client(account_sid, auth_token)

def get_gmail_sender():
    """Get Gmail sender instance."""
    if not GMAIL_AVAILABLE:
        logger.error("Gmail sender not available")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Email service not available - Gmail sender not configured"
        )
    
    sender_email = os.getenv("SENDER_EMAIL")
    sender_password = os.getenv("SENDER_EMAIL_APP_PASS")
    
    if not sender_email or not sender_password:
        logger.error("Gmail credentials not found in environment variables")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Email service configuration error"
        )
    
    return GmailSender(sender_email, sender_password)



@router.post("/send-otp", response_model=OTPResponse)
async def send_otp(request: SendOTPRequest):
    """
    Send OTP to the provided phone number.
    """
    try:
        logger.info(f"OTP endpoint called for phone: {request.phone_number}, country_code: {request.country_code}")
        
        # Clean up expired OTPs
        cleanup_expired_otps()
        
        # Get full phone number
        full_phone = get_full_phone_number(request.country_code, request.phone_number)
        
        # Check if OTP was recently sent (rate limiting - 2 minutes)
        if full_phone in otp_storage:
            last_sent = otp_storage[full_phone].get("last_sent")
            if last_sent and datetime.now() - last_sent < timedelta(minutes=2):
                remaining_time = timedelta(minutes=2) - (datetime.now() - last_sent)
                remaining_seconds = int(remaining_time.total_seconds())
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Please wait {remaining_seconds} seconds before requesting another OTP"
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
        
        # Send SMS using Twilio
        try:
            client = get_twilio_client()
            from_number = os.getenv("TWILIO_NUMBER")
            
            if not from_number:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="SMS service configuration error"
                )
            
            message_body = f"Your VeraFi.Me verification code is: {otp}. Valid for 5 minutes. Do not share this code with anyone."
            
            message = client.messages.create(
                to=full_phone,
                from_=from_number,
                body=message_body
            )
            
            logger.info(f"OTP sent successfully to {full_phone}, SID: {message.sid}")
            
            return OTPResponse(
                success=True,
                message="OTP sent successfully",
                data={
                    "phone_number": full_phone,
                    "expires_in": "5 minutes"
                }
            )
            
        except Exception as e:
            # Remove stored OTP if SMS failed
            if full_phone in otp_storage:
                del otp_storage[full_phone]
            
            logger.error(f"Failed to send OTP to {full_phone}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to send OTP: {str(e)}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending OTP: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send OTP"
        )

@router.post("/verify-otp", response_model=OTPResponse)
async def verify_otp(request: VerifyOTPRequest):
    """
    Verify the OTP provided by the user.
    """
    try:
        logger.info(f"OTP verification called for phone: {request.phone_number}, country_code: {request.country_code}")
        
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


@router.get("/resend-timer/{phone_number}")
async def get_resend_timer(phone_number: str, country_code: str = "+1"):
    """
    Get the remaining time before OTP can be resent
    """
    try:
        cleanup_expired_otps()
        full_phone = get_full_phone_number(country_code, phone_number)
        
        if full_phone in otp_storage:
            last_sent = otp_storage[full_phone].get("last_sent")
            if last_sent:
                time_diff = datetime.now() - last_sent
                if time_diff < timedelta(minutes=2):
                    remaining_time = timedelta(minutes=2) - time_diff
                    remaining_seconds = int(remaining_time.total_seconds())
                    return {
                        "success": True,
                        "data": {
                            "can_resend": False,
                            "remaining_seconds": remaining_seconds,
                            "remaining_time": f"{remaining_seconds // 60}:{(remaining_seconds % 60):02d}"
                        }
                    }
        
        return {
            "success": True,
            "data": {
                "can_resend": True,
                "remaining_seconds": 0,
                "remaining_time": "0:00"
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting resend timer: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get resend timer"
        )


# Email OTP Endpoints

@router.post("/send-email-otp", response_model=OTPResponse)
async def send_email_otp(request: SendEmailOTPRequest):
    """
    Send OTP to the provided email address.
    """
    try:
        logger.info(f"Email OTP endpoint called for email: {request.email}")
        
        # Clean up expired OTPs
        cleanup_expired_otps()
        
        # Validate email format
        if not validate_email(request.email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid email format"
            )
        
        # Check if OTP was recently sent (rate limiting - 2 minutes)
        if request.email in email_otp_storage:
            last_sent = email_otp_storage[request.email].get("last_sent")
            if last_sent and datetime.now() - last_sent < timedelta(minutes=2):
                remaining_time = timedelta(minutes=2) - (datetime.now() - last_sent)
                remaining_seconds = int(remaining_time.total_seconds())
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Please wait {remaining_seconds} seconds before requesting another OTP"
                )
        
        # Generate OTP
        otp = generate_otp()
        
        # Store OTP with expiration (5 minutes)
        email_otp_storage[request.email] = {
            "otp": otp,
            "expires_at": datetime.now() + timedelta(minutes=5),
            "attempts": 0,
            "last_sent": datetime.now()
        }
        
        # Send email using Gmail
        try:
            gmail_sender = get_gmail_sender()
            
            subject = "Your VeraFi.Me Verification Code"
            body = f"""Your VeraFi.Me verification code is: {otp}

This code is valid for 5 minutes. Do not share this code with anyone.

If you didn't request this code, please ignore this email.

Best regards,
VeraFi.Me Team"""
            
            gmail_sender.send_email(request.email, subject, body)
            
            logger.info(f"Email OTP sent successfully to {request.email}")
            
            return OTPResponse(
                success=True,
                message="Email OTP sent successfully",
                data={
                    "email": request.email,
                    "expires_in": "5 minutes"
                }
            )
            
        except Exception as e:
            # Remove stored OTP if email failed
            if request.email in email_otp_storage:
                del email_otp_storage[request.email]
            
            logger.error(f"Failed to send email OTP to {request.email}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to send email OTP: {str(e)}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending email OTP: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send email OTP"
        )

@router.post("/verify-email-otp", response_model=OTPResponse)
async def verify_email_otp(request: VerifyEmailOTPRequest):
    """
    Verify the email OTP provided by the user.
    """
    try:
        logger.info(f"Email OTP verification called for email: {request.email}")
        
        # Clean up expired OTPs
        cleanup_expired_otps()
        
        # Check if OTP exists
        if request.email not in email_otp_storage:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No OTP found for this email address. Please request a new OTP."
            )
        
        otp_data = email_otp_storage[request.email]
        
        # Check if OTP is expired
        if otp_data["expires_at"] < datetime.now():
            del email_otp_storage[request.email]
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OTP has expired. Please request a new OTP."
            )
        
        # Check attempts limit (max 3 attempts)
        if otp_data["attempts"] >= 3:
            del email_otp_storage[request.email]
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Too many failed attempts. Please request a new OTP."
            )
        
        # Increment attempts
        otp_data["attempts"] += 1
        
        # Verify OTP
        if otp_data["otp"] == request.otp:
            # OTP is correct, remove it from storage
            del email_otp_storage[request.email]
            
            logger.info(f"Email OTP verified successfully for {request.email}")
            return OTPResponse(
                success=True,
                message="Email OTP verified successfully",
                data={
                    "email": request.email,
                    "verified_at": datetime.now().isoformat()
                }
            )
        else:
            # OTP is incorrect
            if otp_data["attempts"] >= 3:
                del email_otp_storage[request.email]
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
        logger.error(f"Error verifying email OTP: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to verify email OTP"
        )

@router.get("/email-resend-timer/{email}")
async def get_email_resend_timer(email: str):
    """
    Get the remaining time before email OTP can be resent
    """
    try:
        cleanup_expired_otps()
        
        if email in email_otp_storage:
            last_sent = email_otp_storage[email].get("last_sent")
            if last_sent:
                time_diff = datetime.now() - last_sent
                if time_diff < timedelta(minutes=2):
                    remaining_time = timedelta(minutes=2) - time_diff
                    remaining_seconds = int(remaining_time.total_seconds())
                    return {
                        "success": True,
                        "data": {
                            "can_resend": False,
                            "remaining_seconds": remaining_seconds,
                            "remaining_time": f"{remaining_seconds // 60}:{(remaining_seconds % 60):02d}"
                        }
                    }
        
        return {
            "success": True,
            "data": {
                "can_resend": True,
                "remaining_seconds": 0,
                "remaining_time": "0:00"
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting email resend timer: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get email resend timer"
        )

