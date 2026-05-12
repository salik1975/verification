from fastapi import APIRouter, File, UploadFile, HTTPException
import base64
import sys
from utils import is_blurry, analyze_document_type, extract_faces, allowed_file

router = APIRouter()

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    print(f"[DOCUMENT_UPLOAD] Processing file: {file.filename}", file=sys.stderr, flush=True)

    if not allowed_file(file.filename):
        print(f"[DOCUMENT_UPLOAD] File type not allowed: {file.filename}", file=sys.stderr, flush=True)
        raise HTTPException(status_code=400, detail="File type not allowed")

    image_bytes = await file.read()
    print(f"[DOCUMENT_UPLOAD] Image size: {len(image_bytes)} bytes", file=sys.stderr, flush=True)

    if is_blurry(image_bytes):
        print(f"[DOCUMENT_UPLOAD] Image is too blurry", file=sys.stderr, flush=True)
        raise HTTPException(status_code=422, detail="The image quality is too low for processing. Please upload a clearer, well-focused photo of your document.")

    try:
        print(f"[DOCUMENT_UPLOAD] Analyzing document type...", file=sys.stderr, flush=True)
        document_extraction = analyze_document_type(image_bytes)

        # Check if document analysis failed
        if document_extraction.get("status") == "failed":
            error_message = document_extraction.get("message", "Failed to process document")
            print(f"[DOCUMENT_UPLOAD] Document analysis failed: {error_message}", file=sys.stderr, flush=True)
            raise HTTPException(status_code=422, detail=error_message)

        print(f"[DOCUMENT_UPLOAD] Document analysis complete: {document_extraction.get('documentType', 'UNKNOWN')}", file=sys.stderr, flush=True)
        return document_extraction
    except HTTPException:
        # Re-raise HTTPException as-is
        raise
    except Exception as e:
        # Log full error details for debugging
        print(f"[DOCUMENT_UPLOAD] Unexpected error: {str(e)}", file=sys.stderr, flush=True)
        import traceback
        print(f"[DOCUMENT_UPLOAD] Traceback: {traceback.format_exc()}", file=sys.stderr, flush=True)
        raise HTTPException(status_code=500, detail="We encountered an unexpected error while processing your document. Please try again or contact support if the issue persists.")

@router.post("/face")
async def upload_face_file(file: UploadFile = File(...)):
    print(f"[FACE_EXTRACTION] Processing file: {file.filename}", file=sys.stderr, flush=True)

    if not allowed_file(file.filename):
        print(f"[FACE_EXTRACTION] File type not allowed: {file.filename}", file=sys.stderr, flush=True)
        raise HTTPException(status_code=400, detail="File type not allowed")

    image_bytes = await file.read()
    print(f"[FACE_EXTRACTION] Image size: {len(image_bytes)} bytes", file=sys.stderr, flush=True)

    if is_blurry(image_bytes):
        print(f"[FACE_EXTRACTION] Image is too blurry", file=sys.stderr, flush=True)
        raise HTTPException(status_code=422, detail="The image quality is too low for face detection. Please upload a clearer, well-focused photo of your document.")

    try:
        print(f"[FACE_EXTRACTION] Attempting to extract face...", file=sys.stderr, flush=True)
        extracted_face_bytes = extract_faces(image_bytes)
        if not extracted_face_bytes:
            print(f"[FACE_EXTRACTION] No face detected in image", file=sys.stderr, flush=True)
            raise HTTPException(status_code=422, detail="No face detected in the uploaded image. Please upload a clear photo with a visible face.")

        print(f"[FACE_EXTRACTION] Face extracted successfully, size: {len(extracted_face_bytes)} bytes", file=sys.stderr, flush=True)
        img_b64 = base64.b64encode(extracted_face_bytes).decode("utf-8")
        data_url = f"data:image/jpeg;base64,{img_b64}"
        return {"face_filename": data_url}
    except HTTPException:
        # Re-raise HTTPException as-is (don't convert to 500)
        raise
    except Exception as e:
        # Log full error details for debugging
        print(f"[FACE_EXTRACTION] Unexpected error: {str(e)}", file=sys.stderr, flush=True)
        import traceback
        print(f"[FACE_EXTRACTION] Traceback: {traceback.format_exc()}", file=sys.stderr, flush=True)
        raise HTTPException(status_code=500, detail="We encountered an unexpected error while extracting the face. Please try again or contact support if the issue persists.") 