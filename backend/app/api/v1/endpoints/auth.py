from fastapi import APIRouter, HTTPException, Depends, status, Request
from pydantic import BaseModel, EmailStr
from typing import List, Optional
import bcrypt
import uuid
import pyodbc
import os
from dotenv import load_dotenv
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..'))
from mail_server.gmail_sender import GmailSender
import time
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

# Load env vars for DB
load_dotenv()
db_server = os.getenv('DB_SERVER')
db_name = os.getenv('DB_NAME')
db_user = os.getenv('DB_USER')
db_password = os.getenv('DB_PASSWORD')

# Session expiry (7 days by default)
SESSION_EXPIRY_DAYS = int(os.getenv('SESSION_EXPIRY_DAYS', '7'))

router = APIRouter(prefix="/auth", tags=["auth"])

# Initialize GmailSender using credentials from .env
SENDER_EMAIL = os.getenv('SENDER_EMAIL')
SENDER_EMAIL_APP_PASS = os.getenv('SENDER_EMAIL_APP_PASS')
gmail_sender = GmailSender(SENDER_EMAIL, SENDER_EMAIL_APP_PASS)
OTP_EXPIRY_SECONDS = 300

class DatabaseOTPStore:
    """
    Database-backed OTP store that persists across server restarts
    and supports load-balanced deployments.
    """

    @staticmethod
    def _get_conn():
        return pyodbc.connect(
            f"DRIVER={{ODBC Driver 18 for SQL Server}};"
            f"SERVER={db_server};"
            f"DATABASE={db_name};"
            f"UID={db_user};"
            f"PWD={db_password};"
            "TrustServerCertificate=yes;"
            "Connection Timeout=20;"
        )

    def get(self, email: str) -> Optional[dict]:
        """Get OTP record for a given email. Returns None if not found or expired."""
        conn = None
        try:
            conn = self._get_conn()
            cursor = conn.cursor()

            # Check for valid, non-expired OTP
            cursor.execute("""
                SELECT otp, expires_at FROM otp_store
                WHERE email = ? AND expires_at > GETUTCDATE()
            """, email)

            row = cursor.fetchone()
            if row:
                from datetime import timezone
                expires_utc = row.expires_at.replace(tzinfo=timezone.utc)
                expires_timestamp = expires_utc.timestamp()
                return {"otp": row.otp, "expires": expires_timestamp}

            return None
        except Exception as e:
            logger.error(f"Error getting OTP from database: {e}")
            return None
        finally:
            if conn:
                conn.close()

    def set(self, email: str, otp: str, expires_seconds: int = OTP_EXPIRY_SECONDS) -> bool:
        """Create or update an OTP for an email. Returns True if successful."""
        conn = None
        try:
            conn = self._get_conn()
            cursor = conn.cursor()

            cursor.execute("""
                MERGE INTO otp_store AS target
                USING (SELECT ? AS email) AS source
                ON target.email = source.email
                WHEN MATCHED THEN
                    UPDATE SET otp = ?, created_at = GETUTCDATE(), expires_at = DATEADD(SECOND, ?, GETUTCDATE())
                WHEN NOT MATCHED THEN
                    INSERT (email, otp, created_at, expires_at)
                    VALUES (?, ?, GETUTCDATE(), DATEADD(SECOND, ?, GETUTCDATE()));
            """, email, otp, expires_seconds, email, otp, expires_seconds)

            conn.commit()
            return True
        except Exception as e:
            logger.error(f"Error storing OTP in database: {e}")
            return False
        finally:
            if conn:
                conn.close()

    def delete(self, email: str) -> bool:
        """Delete OTP record for an email. Returns True if successful."""
        conn = None
        try:
            conn = self._get_conn()
            cursor = conn.cursor()

            cursor.execute("DELETE FROM otp_store WHERE email = ?", email)
            conn.commit()
            return True
        except Exception as e:
            logger.error(f"Error deleting OTP from database: {e}")
            return False
        finally:
            if conn:
                conn.close()

    def cleanup_expired(self) -> int:
        """Remove expired OTPs. Returns count of deleted records."""
        conn = None
        try:
            conn = self._get_conn()
            cursor = conn.cursor()

            cursor.execute("DELETE FROM otp_store WHERE expires_at < GETUTCDATE()")
            deleted = cursor.rowcount
            conn.commit()
            return deleted
        except Exception as e:
            logger.error(f"Error cleaning up expired OTPs: {e}")
            return 0
        finally:
            if conn:
                conn.close()

    def __setitem__(self, email: str, record: dict):
        if "expires" in record:
            expires_seconds = max(0, int(record["expires"] - time.time()))
        else:
            expires_seconds = OTP_EXPIRY_SECONDS
        self.set(email, record["otp"], expires_seconds)

    def __getitem__(self, email: str) -> Optional[dict]:
        return self.get(email)

    def __delitem__(self, email: str):
        self.delete(email)

otp_store = DatabaseOTPStore()

class DatabaseSessionStore:
    """
    Database-backed session store that persists across server restarts
    and supports load-balanced deployments.
    """

    @staticmethod
    def _get_conn():
        return pyodbc.connect(
            f"DRIVER={{ODBC Driver 18 for SQL Server}};"
            f"SERVER={db_server};"
            f"DATABASE={db_name};"
            f"UID={db_user};"
            f"PWD={db_password};"
            "TrustServerCertificate=yes;"
            "Connection Timeout=20;"
        )

    def get(self, token: str) -> Optional[int]:
        """Get user_id for a given token. Returns None if token not found or expired."""
        conn = None
        try:
            conn = self._get_conn()
            cursor = conn.cursor()

            # Check for valid, non-expired session
            cursor.execute("""
                SELECT user_id FROM user_session
                WHERE token = ?
                AND (expires_at IS NULL OR expires_at > GETUTCDATE())
            """, token)

            row = cursor.fetchone()
            if row:
                # Update last_accessed timestamp
                cursor.execute("""
                    UPDATE user_session SET last_accessed = GETUTCDATE()
                    WHERE token = ?
                """, token)
                conn.commit()
                return row.user_id

            return None
        except Exception as e:
            logger.error(f"Error getting session from database: {e}")
            return None
        finally:
            if conn:
                conn.close()

    def set(self, token: str, user_id: int, expires_days: int = SESSION_EXPIRY_DAYS) -> bool:
        """Create a new session. Returns True if successful."""
        conn = None
        try:
            conn = self._get_conn()
            cursor = conn.cursor()

            expires_at = datetime.utcnow() + timedelta(days=expires_days)

            cursor.execute("""
                INSERT INTO user_session (token, user_id, created_at, expires_at, last_accessed)
                VALUES (?, ?, GETUTCDATE(), ?, GETUTCDATE())
            """, token, user_id, expires_at)

            conn.commit()
            return True
        except Exception as e:
            logger.error(f"Error creating session in database: {e}")
            return False
        finally:
            if conn:
                conn.close()

    def delete(self, token: str) -> bool:
        """Delete a session (logout). Returns True if successful."""
        conn = None
        try:
            conn = self._get_conn()
            cursor = conn.cursor()

            cursor.execute("DELETE FROM user_session WHERE token = ?", token)
            conn.commit()
            return True
        except Exception as e:
            logger.error(f"Error deleting session from database: {e}")
            return False
        finally:
            if conn:
                conn.close()

    def delete_user_sessions(self, user_id: int) -> bool:
        """Delete all sessions for a user (force logout). Returns True if successful."""
        conn = None
        try:
            conn = self._get_conn()
            cursor = conn.cursor()

            cursor.execute("DELETE FROM user_session WHERE user_id = ?", user_id)
            conn.commit()
            return True
        except Exception as e:
            logger.error(f"Error deleting user sessions from database: {e}")
            return False
        finally:
            if conn:
                conn.close()

    def cleanup_expired(self) -> int:
        """Remove expired sessions. Returns count of deleted sessions."""
        conn = None
        try:
            conn = self._get_conn()
            cursor = conn.cursor()

            cursor.execute("""
                DELETE FROM user_session
                WHERE expires_at IS NOT NULL AND expires_at < GETUTCDATE()
            """)
            deleted = cursor.rowcount
            conn.commit()
            return deleted
        except Exception as e:
            logger.error(f"Error cleaning up expired sessions: {e}")
            return 0
        finally:
            if conn:
                conn.close()

    def __setitem__(self, token: str, user_id: int):
        self.set(token, user_id)

    def __getitem__(self, token: str) -> Optional[int]:
        return self.get(token)

    def __delitem__(self, token: str):
        self.delete(token)

session_store = DatabaseSessionStore()

def get_db_conn():
    return pyodbc.connect(
        f"DRIVER={{ODBC Driver 18 for SQL Server}};"
        f"SERVER={db_server};"
        f"DATABASE={db_name};"
        f"UID={db_user};"
        f"PWD={db_password};"
        "TrustServerCertificate=yes;"
        "Connection Timeout=20;"
    )

def verify_bcrypt_password(password: str, hashed_password: str) -> bool:
    """Verify a password against a bcrypt hash"""
    try:
        return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception as e:
        logger.error(f"Error verifying password: {e}")
        return False

class LoginRequest(BaseModel):
    username_or_email: str
    password: Optional[str] = None
    otp: Optional[str] = None
    role: Optional[str] = None

class LoginResponse(BaseModel):
    user_id: int
    name: str
    username: str
    email: str
    roles: List[str]
    token: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str
    new_password: str

class SendOtpRequest(BaseModel):
    username_or_email: str

class VerifyOtpRequest(BaseModel):
    username_or_email: str
    otp: str

class SessionResponse(BaseModel):
    user_id: int
    name: str
    username: str
    email: str
    roles: List[str]
    # New tenant subscription fields (optional for backward compatibility)
    tenant_id: Optional[int] = None
    tenant_name: Optional[str] = None
    subscription_tier: Optional[str] = None
    subscription_service: Optional[str] = None
    max_reports: Optional[int] = None
    reports_used: Optional[int] = None
    subscription_start_date: Optional[str] = None
    subscription_end_date: Optional[str] = None
    days_remaining: Optional[int] = None
    monthly_price: Optional[float] = None
    subscription_status: Optional[str] = None

# Helper to get user and roles by username/email

def get_user_and_roles(username_or_email):
    conn = get_db_conn()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT user_id, name, username, email, password_hash FROM app_user
        WHERE username = ? OR email = ?
    """, username_or_email, username_or_email)
    user = cursor.fetchone()
    if not user:
        conn.close()
        return None, []
    user_id = user.user_id
    cursor.execute("""
        SELECT r.name FROM user_role_access ura
        JOIN role r ON ura.role_id = r.role_id
        WHERE ura.user_id = ?
    """, user_id)
    roles = [row.name for row in cursor.fetchall()]
    conn.close()
    return user, roles

@router.post("/login", response_model=LoginResponse)
def login(data: LoginRequest):
    user, roles = get_user_and_roles(data.username_or_email)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if data.role and data.role not in roles:
        raise HTTPException(status_code=401, detail="User does not have the requested role")
    if data.otp:
        record = otp_store.get(user.email)
        if not record:
            logger.warning(f"OTP verification failed: No record found for {user.email}")
            raise HTTPException(status_code=401, detail="Invalid or expired OTP")
        
        # Check expiration with a small buffer to avoid precision issues
        current_time = time.time()
        if current_time >= record["expires"]:
            logger.warning(f"OTP verification failed: Expired for {user.email}. Current: {current_time}, Expires: {record['expires']}")
            del otp_store[user.email]
            raise HTTPException(status_code=401, detail="Invalid or expired OTP")
        
        # Strip whitespace and ensure string comparison
        stored_otp = str(record["otp"]).strip()
        provided_otp = str(data.otp).strip()
        logger.debug(f"OTP comparison for {user.email}: stored='{stored_otp}' (len={len(stored_otp)}), provided='{provided_otp}' (len={len(provided_otp)})")
        if stored_otp != provided_otp:
            logger.warning(f"OTP verification failed: Mismatch for {user.email}. Stored: '{stored_otp}', Provided: '{provided_otp}'")
            raise HTTPException(status_code=401, detail="Invalid or expired OTP")
        token = str(uuid.uuid4())
        session_store[token] = user.user_id
        del otp_store[user.email]
        return LoginResponse(
            user_id=user.user_id,
            name=user.name,
            username=user.username,
            email=user.email,
            roles=roles,
            token=token
        )
    elif data.password:
        # Verify plain text password against stored bcrypt hash
        if not verify_bcrypt_password(data.password, user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        token = str(uuid.uuid4())
        session_store[token] = user.user_id
        return LoginResponse(
            user_id=user.user_id,
            name=user.name,
            username=user.username,
            email=user.email,
            roles=roles,
            token=token
        )
    else:
        raise HTTPException(status_code=400, detail="Password or OTP required")

@router.post("/forgot-password")
def forgot_password(data: ForgotPasswordRequest):
    user, _ = get_user_and_roles(data.email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    otp = str(uuid.uuid4().int % 1000000).zfill(6)
    otp_store[data.email] = {"otp": otp, "expires": time.time() + OTP_EXPIRY_SECONDS}
    gmail_sender.send_email(data.email, "Your Password Reset OTP", f"Your password reset OTP is: {otp}")
    return {"message": "OTP sent to email"}

@router.post("/reset-password")
def reset_password(data: ResetPasswordRequest):
    record = otp_store.get(data.email)
    if not record:
        logger.warning(f"Password reset OTP verification failed: No record found for {data.email}")
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
    
    # Check expiration with a small buffer to avoid precision issues
    current_time = time.time()
    if current_time >= record["expires"]:
        logger.warning(f"Password reset OTP verification failed: Expired for {data.email}. Current: {current_time}, Expires: {record['expires']}")
        del otp_store[data.email]
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
    
    # Strip whitespace and ensure string comparison
    stored_otp = str(record["otp"]).strip()
    provided_otp = str(data.otp).strip()
    logger.debug(f"Password reset OTP comparison for {data.email}: stored='{stored_otp}' (len={len(stored_otp)}), provided='{provided_otp}' (len={len(provided_otp)})")
    if stored_otp != provided_otp:
        logger.warning(f"Password reset OTP verification failed: Mismatch for {data.email}. Stored: '{stored_otp}', Provided: '{provided_otp}'")
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
    conn = get_db_conn()
    cursor = conn.cursor()
    # Hash the new password with bcrypt before storing
    new_password_hash = bcrypt.hashpw(data.new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    cursor.execute("""
        UPDATE app_user SET password_hash = ? WHERE email = ?
    """, new_password_hash, data.email)
    conn.commit()
    conn.close()
    del otp_store[data.email]
    return {"message": "Password reset successful"}

@router.post("/send-otp")
def send_otp(data: SendOtpRequest):
    user, _ = get_user_and_roles(data.username_or_email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    otp = str(uuid.uuid4().int % 1000000).zfill(6)
    otp_store[user.email] = {"otp": otp, "expires": time.time() + OTP_EXPIRY_SECONDS}
    gmail_sender.send_email(user.email, "Your OTP Code", f"Your OTP is: {otp}")
    return {"message": "OTP sent to email"}

@router.post("/verify-otp", response_model=LoginResponse)
def verify_otp(data: VerifyOtpRequest):
    user, roles = get_user_and_roles(data.username_or_email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    record = otp_store.get(user.email)
    if not record:
        logger.warning(f"OTP verification failed: No record found for {user.email}")
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
    
    # Check expiration with a small buffer to avoid precision issues
    current_time = time.time()
    if current_time >= record["expires"]:
        logger.warning(f"OTP verification failed: Expired for {user.email}. Current: {current_time}, Expires: {record['expires']}")
        del otp_store[user.email]
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
    
    # Strip whitespace and ensure string comparison
    stored_otp = str(record["otp"]).strip()
    provided_otp = str(data.otp).strip()
    logger.debug(f"OTP comparison for {user.email}: stored='{stored_otp}' (len={len(stored_otp)}), provided='{provided_otp}' (len={len(provided_otp)})")
    if stored_otp != provided_otp:
        logger.warning(f"OTP verification failed: Mismatch for {user.email}. Stored: '{stored_otp}', Provided: '{provided_otp}'")
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
    token = str(uuid.uuid4())
    session_store[token] = user.user_id
    del otp_store[user.email]
    return LoginResponse(
        user_id=user.user_id,
        name=user.name,
        username=user.username,
        email=user.email,
        roles=roles,
        token=token
    )

@router.get("/session", response_model=SessionResponse)
def check_session(token: str):
    user_id = session_store.get(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired session token")
    conn = get_db_conn()
    cursor = conn.cursor()
    
    # Get user basic info including tenant_id
    cursor.execute("SELECT user_id, name, username, email, tenant_id FROM app_user WHERE user_id = ?", user_id)
    user = cursor.fetchone()
    if not user:
        conn.close()
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get user roles
    cursor.execute("""
        SELECT r.name FROM user_role_access ura
        JOIN role r ON ura.role_id = r.role_id
        WHERE ura.user_id = ?
    """, user_id)
    roles = [row.name for row in cursor.fetchall()]
    
    # Initialize response with existing fields
    response_data = {
        "user_id": user.user_id,
        "name": user.name,
        "username": user.username,
        "email": user.email,
        "roles": roles
    }
    
    # Add tenant subscription data if user has a tenant
    if user.tenant_id:
        cursor.execute("""
            SELECT 
                t.tenant_id,
                t.name as tenant_name,
                t.reports_used,
                t.subscription_start_date,
                t.subscription_end_date,
                st.tier_name,
                st.max_reports,
                ss.service_name,
                sp.price_usd
            FROM tenant t
            LEFT JOIN subscription_tiers st ON t.subscription_tier_id = st.tier_id
            LEFT JOIN subscription_services ss ON t.subscription_service_id = ss.service_id
            LEFT JOIN subscription_pricing sp ON (t.subscription_tier_id = sp.tier_id AND t.subscription_service_id = sp.service_id)
            WHERE t.tenant_id = ? AND t.is_active = 1
        """, user.tenant_id)
        
        tenant_data = cursor.fetchone()
        if tenant_data:
            # Calculate days remaining and status
            days_remaining = None
            subscription_status = "expired"
            
            if tenant_data.subscription_end_date:
                from datetime import datetime
                days_remaining = (tenant_data.subscription_end_date - datetime.now()).days
                
                if days_remaining < 0:
                    subscription_status = "expired"
                elif days_remaining <= 7:
                    subscription_status = "expiring_soon"
                else:
                    subscription_status = "active"
            
            # Add tenant subscription fields to response
            response_data.update({
                "tenant_id": tenant_data.tenant_id,
                "tenant_name": tenant_data.tenant_name,
                "subscription_tier": tenant_data.tier_name,
                "subscription_service": tenant_data.service_name,
                "max_reports": tenant_data.max_reports,
                "reports_used": tenant_data.reports_used,
                "subscription_start_date": tenant_data.subscription_start_date.isoformat() if tenant_data.subscription_start_date else None,
                "subscription_end_date": tenant_data.subscription_end_date.isoformat() if tenant_data.subscription_end_date else None,
                "days_remaining": days_remaining,
                "monthly_price": float(tenant_data.price_usd) if tenant_data.price_usd else None,
                "subscription_status": subscription_status
            })
    
    conn.close()
    return SessionResponse(**response_data)

@router.post("/logout")
def logout(token: str):
    """
    Logout endpoint - invalidates the session token.
    """
    if not token:
        raise HTTPException(status_code=400, detail="Token required")

    # Check if token exists
    user_id = session_store.get(token)
    if not user_id:
        # Token doesn't exist or already expired, return success anyway
        return {"message": "Logged out successfully"}

    # Delete the session
    session_store.delete(token)
    return {"message": "Logged out successfully"}

@router.post("/cleanup-sessions")
def cleanup_sessions():
    """
    Cleanup expired sessions. Can be called periodically by a cron job.
    """
    deleted = session_store.cleanup_expired()
    return {"message": f"Cleaned up {deleted} expired sessions"}