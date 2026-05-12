from sqlalchemy import Column, Integer, String, DateTime, Boolean, Index, ForeignKey
from sqlalchemy.dialects.mssql import NVARCHAR
from app.db.base import BaseWithCustomPK

class VerificationLog(BaseWithCustomPK):
    __tablename__ = "VerificationLog"

    id = Column(Integer, primary_key=True, index=True)
    SessionID = Column(String(100), index=True)
    DocumentTypeID = Column(String(100), index=True)
    ExtractedName = Column(String(255))
    ExtractedDocNumber = Column(String(255))
    ExtractedInfoJson = Column(NVARCHAR(None))
    DocumentVerification = Column(Boolean)
    LivenessVerification = Column(Boolean)
    PhotoVerification = Column(Boolean)
    PhraseVerification = Column(Boolean)
    PhoneVerification = Column(Boolean)
    EmailVerification = Column(Boolean)
    FaceSnapshotsJson = Column(NVARCHAR(None))
    FinalVerification = Column(Boolean)
    CreatedOn = Column(DateTime, index=True)
    CreatedBy = Column(String(100))
    LastModifiedOn = Column(DateTime)
    LastModifiedBy = Column(String(100))
    IsActive = Column(Boolean, index=True)
    UserID = Column(Integer, ForeignKey("app_user.user_id"), index=True)

    # Composite indexes for common query patterns
    __table_args__ = (
        Index('idx_createdon_documenttype', 'CreatedOn', 'DocumentTypeID'),
        Index('idx_sessionid_createdon', 'SessionID', 'CreatedOn'),
        Index('idx_isactive_createdon', 'IsActive', 'CreatedOn'),
        Index('idx_userid_createdon', 'UserID', 'CreatedOn'),
        Index('idx_userid_documenttype', 'UserID', 'DocumentTypeID'),
    ) 