from pydantic import BaseModel
from typing import Optional

class RoleCreate(BaseModel):
    name: str
    description: Optional[str] = None

class RoleResponse(BaseModel):
    status: str
    message: str
    role_id: Optional[int] = None
    role_name: Optional[str] = None
    description: Optional[str] = None
