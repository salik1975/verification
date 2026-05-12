from pydantic import BaseModel
from typing import Optional, Union
from datetime import datetime

class VerificationLogCreate(BaseModel):
    SessionID: Optional[str] = None
    DocumentTypeID: Union[str, int]
    ExtractedName: Optional[str] = None
    ExtractedDocNumber: Optional[str] = None
    ExtractedInfoJson: Optional[str] = None
    DocumentVerification: Optional[bool] = None
    LivenessVerification: Optional[bool] = None
    PhotoVerification: Optional[bool] = None
    PhraseVerification: Optional[bool] = None
    PhoneVerification: Optional[bool] = None
    EmailVerification: Optional[bool] = None
    FaceSnapshotsJson: Optional[str] = None
    FinalVerification: Optional[bool] = None
    CreatedOn: Optional[datetime] = None
    CreatedBy: Optional[str] = None
    LastModifiedOn: Optional[datetime] = None
    LastModifiedBy: Optional[str] = None
    IsActive: Optional[bool] = True
    UserID: Optional[int] = None 