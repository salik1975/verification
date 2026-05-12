from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.dependencies import get_db
from app.crud.crud_document_type import document_type
from app.schemas.document_type import DocumentTypePublic, DocumentType as DocumentTypeSchema
from app.models.document_type import DocumentType as DocumentTypeModel

router = APIRouter()


@router.get("/", response_model=List[DocumentTypePublic])
def get_document_types(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
) -> List[DocumentTypeModel]:
    """
    Retrieve active document types.
    Returns the Id, DocumentType and Description for each record.
    """
    document_types = document_type.get_active_document_types(db, skip=skip, limit=limit)
    return document_types


@router.get("/{document_type_id}", response_model=DocumentTypeSchema)
def get_document_type(
    document_type_id: int,
    db: Session = Depends(get_db),
) -> DocumentTypeModel:
    """
    Get document type by ID.
    """
    document_type_obj = document_type.get(db, id=document_type_id)
    if not document_type_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document type not found",
        )
    return document_type_obj


@router.get("/by-name/{document_type_name}", response_model=DocumentTypeSchema)
def get_document_type_by_name(
    document_type_name: str,
    db: Session = Depends(get_db),
) -> DocumentTypeModel:
    """
    Get document type by name.
    """
    document_type_obj = document_type.get_by_document_type_name(
        db, document_type_name=document_type_name
    )
    if not document_type_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document type not found",
        )
    return document_type_obj