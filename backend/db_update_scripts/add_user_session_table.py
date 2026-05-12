"""
Migration script to add user_session table for persistent session storage.
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

def create_user_session_table():
    """Create the user_session table if it doesn't exist."""
    conn = get_db_conn()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_NAME = 'user_session'
    """)
    if cursor.fetchone()[0] > 0:
        print("Table 'user_session' already exists. Skipping creation.")
        conn.close()
        return

    create_table_sql = """
    CREATE TABLE user_session (
        session_id INT IDENTITY(1,1) PRIMARY KEY,
        token VARCHAR(36) NOT NULL UNIQUE,
        user_id INT NOT NULL,
        created_at DATETIME2 DEFAULT GETUTCDATE(),
        expires_at DATETIME2 NULL,
        last_accessed DATETIME2 DEFAULT GETUTCDATE(),
        CONSTRAINT FK_user_session_user FOREIGN KEY (user_id)
            REFERENCES app_user(user_id) ON DELETE CASCADE
    );

    CREATE INDEX IX_user_session_token ON user_session(token);
    CREATE INDEX IX_user_session_user_id ON user_session(user_id);
    CREATE INDEX IX_user_session_expires_at ON user_session(expires_at);
    """

    try:
        cursor.execute(create_table_sql)
        conn.commit()
        print("Table 'user_session' created successfully!")
    except Exception as e:
        print(f"Error creating table: {e}")
        conn.rollback()
    finally:
        conn.close()

def cleanup_expired_sessions():
    """Clean up expired sessions (optional maintenance function)."""
    conn = get_db_conn()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            DELETE FROM user_session
            WHERE expires_at IS NOT NULL AND expires_at < GETUTCDATE()
        """)
        deleted = cursor.rowcount
        conn.commit()
        print(f"Cleaned up {deleted} expired sessions.")
    except Exception as e:
        print(f"Error cleaning up sessions: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    print("Creating user_session table...")
    create_user_session_table()
    print("\nDone!")
