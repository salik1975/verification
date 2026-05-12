from pydantic import BaseModel

class ConfigStoreRead(BaseModel):
    key_name: str
    value: str
    description: str
    is_available: bool = True

    class Config:
        orm_mode = True 