from pydantic import BaseModel

class DocumentDetailRead(BaseModel):
    Id: int
    DocId: int
    FieldKey: str | None = None
    FieldLabelToDisplay: str | None = None
    isCritical: bool | None = None
    # Add more fields as needed

    class Config:
        orm_mode = True 