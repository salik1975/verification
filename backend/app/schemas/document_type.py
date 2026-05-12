from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class DocumentTypeBase(BaseModel):
    DocumentType: str
    Description: Optional[str] = None
    ExpectedJson: Optional[str] = None
    CreatedBy: Optional[str] = None
    LastModifiedBy: Optional[str] = None
    isActive: bool = True
    VerticalThresholdScore: Optional[int] = None


class DocumentTypeCreate(DocumentTypeBase):
    pass


class DocumentTypeUpdate(BaseModel):
    DocumentType: Optional[str] = None
    Description: Optional[str] = None
    ExpectedJson: Optional[str] = None
    LastModifiedBy: Optional[str] = None
    isActive: Optional[bool] = None
    VerticalThresholdScore: Optional[int] = None


class DocumentTypePublic(BaseModel):
    """Public-facing schema that exposes Id, DocumentType and Description"""
    Id: int
    DocumentType: str
    Description: Optional[str] = None
    
    class Config:
        from_attributes = True


class DocumentTypeInDBBase(DocumentTypeBase):
    Id: int
    CreatedOn: Optional[datetime] = None
    LastModifiedOn: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class DocumentType(DocumentTypeInDBBase):
    pass


class DocumentTypeInDB(DocumentTypeInDBBase):
    pass