from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.schemas.document_detail import DocumentDetailRead
from app.crud import crud_document_detail
from pydantic import BaseModel

router = APIRouter()

@router.get("/document-detail", response_model=List[DocumentDetailRead])
def fetch_document_details(
    document_type: int = Query(..., ge=1, le=4),
    db: Session = Depends(get_db)
):
    results = crud_document_detail.get_by_document_type(db, document_type)
    if not results:
        raise HTTPException(status_code=404, detail="No document details found for this type")
    return results

class DocumentDetailUpdateCritical(BaseModel):
    Id: int
    isCritical: bool

@router.post("/document-detail", response_model=DocumentDetailRead)
def update_is_critical(payload: DocumentDetailUpdateCritical, db: Session = Depends(get_db)):
    updated = crud_document_detail.update_is_critical(db, payload.Id, payload.isCritical)
    if not updated:
        raise HTTPException(status_code=404, detail="DocumentDetail not found")
    return updated

class DocumentDetailRename(BaseModel):
    Id: int
    NewFieldToDisplay: str

@router.post("/document-detail/rename", response_model=DocumentDetailRead)
def rename_field_label(payload: DocumentDetailRename, db: Session = Depends(get_db)):
    updated = crud_document_detail.rename_field_label(db, payload.Id, payload.NewFieldToDisplay)
    if not updated:
        raise HTTPException(status_code=404, detail="DocumentDetail not found")
    return updated 