from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def health():
    return {"status": "ok"}

@router.get("/health")
def health_check():
    return {"status": "healthy"}

@router.get("/test")
def test():
    return {"status": "test ok"} 