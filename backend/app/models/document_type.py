from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text
from app.db.base import BaseWithCustomPK


class DocumentType(BaseWithCustomPK):
    __tablename__ = "DocumentType"
    
    # Define primary key with SQL Server column name
    Id = Column("Id", Integer, primary_key=True, index=True)
    
    # Map columns to exact SQL Server table structure
    DocumentType = Column("DocumentType", String(100), nullable=False)
    Description = Column("Description", String(500), nullable=True)
    ExpectedJson = Column("ExpectedJson", Text, nullable=True)  # nvarchar(max) equivalent
    CreatedOn = Column("CreatedOn", DateTime, nullable=True)
    CreatedBy = Column("CreatedBy", String(100), nullable=True)
    LastModifiedOn = Column("LastModifiedOn", DateTime, nullable=True)
    LastModifiedBy = Column("LastModifiedBy", String(100), nullable=True)
    isActive = Column("isActive", Boolean, default=True)
    VerticalThresholdScore = Column("VerticalThresholdScore", Integer, nullable=True)