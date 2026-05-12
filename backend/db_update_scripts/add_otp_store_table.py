"""
Migration script to add otp_store table for persistent OTP storage.
Run this script once to create the table.
"""

import pyodbc
import os
from dotenv import load_dotenv

load_dotenv()

db_server = os.getenv('DB_SERVER')
db_name = os.getenv('DB_NAME')
db_user = os.getenv('DB_USER')
db_password = os.getenv('DB_PASSWORD')

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

def create_otp_store_table():
    """Create the otp_store table if it doesn't exist."""
    conn = get_db_conn()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_NAME = 'otp_store'
    """)
    if cursor.fetchone()[0] > 0:
        print("Table 'otp_store' already exists. Skipping creation.")
        conn.close()
        return

    create_table_sql = """
    CREATE TABLE otp_store (
        otp_id INT IDENTITY(1,1) PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        otp VARCHAR(6) NOT NULL,
        created_at DATETIME2 DEFAULT GETUTCDATE(),
        expires_at DATETIME2 NOT NULL
    );

    CREATE INDEX IX_otp_store_email ON otp_store(email);
    CREATE INDEX IX_otp_store_expires_at ON otp_store(expires_at);
    """

    try:
        cursor.execute(create_table_sql)
        conn.commit()
        print("Table 'otp_store' created successfully!")
    except Exception as e:
        print(f"Error creating table: {e}")
        conn.rollback()
    finally:
        conn.close()

def cleanup_expired_otps():
    """Clean up expired OTPs (optional maintenance function)."""
    conn = get_db_conn()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            DELETE FROM otp_store
            WHERE expires_at < GETUTCDATE()
        """)
        deleted = cursor.rowcount
        conn.commit()
        print(f"Cleaned up {deleted} expired OTPs.")
    except Exception as e:
        print(f"Error cleaning up OTPs: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    print("Creating otp_store table...")
    create_otp_store_table()
    print("\nDone!")
