from sqlalchemy.orm import Session
from app.models.document_detail import DocumentDetail

def get_by_document_type(db: Session, document_type: int):
    return db.query(DocumentDetail).filter(DocumentDetail.DocId == document_type).all()

def update_is_critical(db: Session, id: int, is_critical: bool):
    obj = db.query(DocumentDetail).filter(DocumentDetail.Id == id).first()
    if not obj:
        return None
    obj.isCritical = is_critical
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

def rename_field_label(db: Session, id: int, new_field_label: str):
    obj = db.query(DocumentDetail).filter(DocumentDetail.Id == id).first()
    if not obj:
        return None
    obj.FieldLabelToDisplay = new_field_label
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj 