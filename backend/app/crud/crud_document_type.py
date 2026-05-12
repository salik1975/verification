from typing import List
from sqlalchemy.orm import Session
from app.crud.crud_base import CRUDBase
from app.models.document_type import DocumentType
from app.schemas.document_type import DocumentTypeCreate, DocumentTypeUpdate


class CRUDDocumentType(CRUDBase[DocumentType, DocumentTypeCreate, DocumentTypeUpdate]):
    def get_active_document_types(
        self, db: Session, *, skip: int = 0, limit: int = 100
    ) -> List[DocumentType]:
        """Get active document types only"""
        return (
            db.query(self.model)
            .filter(self.model.isActive == True)
            .order_by(self.model.Id)
            .offset(skip)
            .limit(limit)
            .all()
        )
    
    def get_by_document_type_name(
        self, db: Session, *, document_type_name: str
    ) -> DocumentType:
        """Get document type by name"""
        return (
            db.query(self.model)
            .filter(self.model.DocumentType == document_type_name)
            .filter(self.model.isActive == True)
            .first()
        )


document_type = CRUDDocumentType(DocumentType)