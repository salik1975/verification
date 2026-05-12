from app.db.session import get_db

# Re-export the get_db dependency for easier imports
__all__ = ["get_db"]