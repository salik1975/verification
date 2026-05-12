from sqlalchemy import Column, Integer, String, Boolean
from app.db.base import BaseWithCustomPK

class DocumentDetail(BaseWithCustomPK):
    __tablename__ = "DocumentDetail"
    Id = Column(Integer, primary_key=True, index=True)
    DocId = Column(Integer, nullable=False)
    FieldKey = Column(String(100))
    FieldLabelToDisplay = Column(String(100))
    isCritical = Column(Boolean, nullable=True)
    # Add more fields as needed based on your table structure 