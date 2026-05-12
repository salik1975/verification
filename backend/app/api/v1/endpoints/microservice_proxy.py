from fastapi import APIRouter, UploadFile, File, HTTPException, Request, Form
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.core.encryption_utils import EncryptionManager
import httpx
import os
import uuid
import tempfile
from app.core.config_db import ConfigDBService
import base64
import json
import logging
from datetime import datetime, timezone

router = APIRouter()
logger = logging.getLogger("uvicorn.error")

# Initialize encryption manager
# Remove old global encryption_manager initialization
# encryption_manager = EncryptionManager(
#     key_path=settings.ENCRYPTION_KEY_PATH,
#     enabled=True
# )

MICROSERVICE_URL = settings.MICROSERVICE_URL

OUTPUT_STORAGE = os.path.join(os.getcwd(), 'outputstorage')
os.makedirs(OUTPUT_STORAGE, exist_ok=True)

TIMEOUT = 300  # seconds (generous timeout for video liveness and heavy processing)

def build_filename(original_filename: str, suffix: str) -> str:
    base, ext = os.path.splitext(original_filename)
    return f"{base}{suffix}{ext}"

def get_encryption_manager():
    from app.core.config_db import ConfigDBService
    key = ConfigDBService.get("AES_KEY")
    return EncryptionManager(key=key, enabled=True)

def should_store_id_and_license_photo():
    return ConfigDBService.get("STORE_ID_AND_LICENSE_PHOTO") == "True"

def should_store_video():
    return ConfigDBService.get("STORE_VIDEO") == "True"

def should_store_extracted_faces():
    return ConfigDBService.get("STORE_EXTRACTED_FACES") == "True"

def save_and_encrypt_file(file: UploadFile, session_id: str, suffix: str = "") -> str:
    """Save and encrypt an uploaded file, return the file path."""
    filename = build_filename(file.filename, suffix)
    session_folder = os.path.join(OUTPUT_STORAGE, session_id)
    os.makedirs(session_folder, exist_ok=True)
    file_path = os.path.join(session_folder, filename)
    content = file.file.read()
    if should_store_id_and_license_photo() or should_store_video() or should_store_extracted_faces():
        with open(file_path, 'wb') as f:
            f.write(content)
        get_encryption_manager().encrypt_file(file_path)
        return file_path
    else:
        # If not storing, just return a temp file path and write content for encryption/decryption compatibility
        with tempfile.NamedTemporaryFile(delete=False) as temp_file:
            temp_file.write(content)
            temp_path = temp_file.name
        get_encryption_manager().encrypt_file(temp_path)
        return temp_path

def decrypt_file_to_bytes(file_path: str) -> bytes:
    return get_encryption_manager().decrypt_file(file_path)

@router.post("/upload")
async def proxy_upload(file: UploadFile = File(...), session_id: str = Form(None)):
    if not session_id:
        session_id = str(uuid.uuid4())
    if should_store_id_and_license_photo():
        file_path = save_and_encrypt_file(file, session_id, suffix="_id")
        file_bytes = decrypt_file_to_bytes(file_path)
    else:
        file_bytes = await file.read()
    files = {"file": (file.filename, file_bytes, file.content_type), "session_id": (None, session_id)}
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        # 1. Upload the ID and get extraction result
        resp = await client.post(f"{MICROSERVICE_URL}/upload", files=files)
        if resp.status_code != 200:
            # Extract detail from JSON error response
            try:
                error_data = resp.json()
                error_detail = error_data.get("detail", resp.text)
            except:
                error_detail = resp.text
            raise HTTPException(status_code=resp.status_code, detail=error_detail)
        extraction_result = resp.json()
        # Save extracted face images from ID if present
        if should_store_extracted_faces():
            analyze_result = extraction_result.get("analyzeResult", {})
            faces = analyze_result.get("faces")
            if faces and isinstance(faces, list):
                session_folder = os.path.join(OUTPUT_STORAGE, session_id)
                os.makedirs(session_folder, exist_ok=True)
                for idx, face_b64 in enumerate(faces):
                    face_path = os.path.join(session_folder, f"face_id_{idx}.jpg")
                    with open(face_path, "wb") as f:
                        f.write(base64.b64decode(face_b64))
                    get_encryption_manager().encrypt_file(face_path)
        # 2. Extract the user's name from the extraction result
        user_name = None
        try:
            analyze_result = extraction_result.get("analyzeResult", {})
            documents = analyze_result.get("documents", [])
            fields = documents[0]["fields"] if documents and "fields" in documents[0] else None
            if fields:
                # Try 'name' field first
                if "name" in fields and fields["name"].get("value"):
                    user_name = fields["name"]["value"]
                # Fallback to FirstName + LastName
                elif "FirstName" in fields and "LastName" in fields:
                    first = fields["FirstName"].get("content") or fields["FirstName"].get("value") or ""
                    last = fields["LastName"].get("content") or fields["LastName"].get("value") or ""
                    user_name = f"{first} {last}".strip()
        except Exception:
            user_name = None
        # 3. Call /verify_phrase with the extracted name
        phrase = None
        if user_name:
            phrase_resp = await client.post(
                f"{MICROSERVICE_URL}/verify_phrase",
                json={"name": user_name}
            )
            if phrase_resp.status_code == 200:
                phrase = phrase_resp.json().get("phrase")
        # 4. Flatten and return the response for the frontend
        return JSONResponse(content={
            "type": extraction_result.get("type"),
            "documentType": extraction_result.get("documentType"),
            "analyzeResult": extraction_result.get("analyzeResult"),
            "phrase": phrase,
            "session_id": session_id
        })

@router.post("/face")
async def proxy_face(file: UploadFile = File(...), session_id: str = Form(None)):
    if not session_id:
        session_id = str(uuid.uuid4())
    if should_store_id_and_license_photo() or should_store_extracted_faces():
        file_path = save_and_encrypt_file(file, session_id, suffix="_license")
        file_bytes = decrypt_file_to_bytes(file_path)
    else:
        file_bytes = await file.read()
    files = {"file": (file.filename, file_bytes, file.content_type), "session_id": (None, session_id)}
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        resp = await client.post(f"{MICROSERVICE_URL}/face", files=files)
        if resp.status_code != 200:
            # Extract detail from JSON error response
            try:
                error_data = resp.json()
                error_detail = error_data.get("detail", resp.text)
            except:
                error_detail = resp.text
            raise HTTPException(status_code=resp.status_code, detail=error_detail)
        face_result = resp.json()
        # Save extracted face images from video if present
        if should_store_extracted_faces():
            # Handle new format: single face as data URL in 'face_filename'
            face_data_url = face_result.get("face_filename")
            if face_data_url and face_data_url.startswith("data:image/jpeg;base64,"):
                session_folder = os.path.join(OUTPUT_STORAGE, session_id)
                os.makedirs(session_folder, exist_ok=True)
                face_b64 = face_data_url.split(",", 1)[1]
                face_path = os.path.join(session_folder, f"face_video_0.jpg")
                with open(face_path, "wb") as f:
                    f.write(base64.b64decode(face_b64))
                get_encryption_manager().encrypt_file(face_path)
            # Retain support for possible future 'faces' list
            faces = face_result.get("faces")
            if faces and isinstance(faces, list):
                session_folder = os.path.join(OUTPUT_STORAGE, session_id)
                os.makedirs(session_folder, exist_ok=True)
                for idx, face_b64 in enumerate(faces):
                    face_path = os.path.join(session_folder, f"face_video_{idx}.jpg")
                    with open(face_path, "wb") as f:
                        f.write(base64.b64decode(face_b64))
                    get_encryption_manager().encrypt_file(face_path)
        return JSONResponse(content=face_result)

@router.post("/verify_phrase")
async def proxy_verify_phrase(request: Request):
    data = await request.json() if request.headers.get("content-type", "").startswith("application/json") else {}
    session_id = data.get("session_id") if isinstance(data, dict) else None
    name = data.get("name") if isinstance(data, dict) else None
    if not session_id:
        session_id = str(uuid.uuid4())
    payload = {"session_id": session_id}
    if name:
        payload["name"] = name
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        resp = await client.post(f"{MICROSERVICE_URL}/verify_phrase", json=payload)
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail=resp.text)
        return JSONResponse(content=resp.json())

@router.post("/verify_face")
async def proxy_verify_face(request: Request):
    try:
        logger.info(f"Received verify_face request, forwarding to microservice: {MICROSERVICE_URL}/verify_face")
        data = await request.json()
        image_count = len(data.get("images", [])) if isinstance(data, dict) else 0
        logger.info(f"Request contains {image_count} image(s)")
        
        session_id = data.get("session_id") if isinstance(data, dict) else None
        if not session_id:
            session_id = str(uuid.uuid4())
            logger.debug(f"Generated new session_id: {session_id}")
        data["session_id"] = session_id
        
        logger.info(f"Forwarding verify_face request to microservice with session_id: {session_id}")
        logger.debug(f"Request payload keys: {list(data.keys()) if isinstance(data, dict) else 'N/A'}")
        logger.debug(f"MICROSERVICE_URL: {MICROSERVICE_URL}")
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            try:
                logger.info(f"Calling microservice: {MICROSERVICE_URL}/verify_face")
                resp = await client.post(f"{MICROSERVICE_URL}/verify_face", json=data, timeout=TIMEOUT)
                logger.info(f"Microservice responded with status: {resp.status_code}")
            except httpx.ConnectError as e:
                logger.error(f"Failed to connect to microservice at {MICROSERVICE_URL}: {str(e)}")
                raise
            except httpx.TimeoutException as e:
                logger.error(f"Timeout connecting to microservice (timeout: {TIMEOUT}s): {str(e)}")
                raise
            except httpx.HTTPStatusError as e:
                logger.error(f"HTTP error from microservice: {e.response.status_code} - {e.response.text}")
                raise
            except Exception as e:
                logger.error(f"Unexpected error calling microservice: {type(e).__name__}: {str(e)}", exc_info=True)
                raise
            
            if resp.status_code != 200:
                error_text = resp.text
                logger.error(f"Microservice returned error {resp.status_code}: {error_text}")
                raise HTTPException(status_code=resp.status_code, detail=error_text)
            
            try:
                result = resp.json()
            except Exception as e:
                logger.error(f"Failed to parse microservice response as JSON: {str(e)}")
                logger.error(f"Response text: {resp.text[:500]}")
                raise HTTPException(status_code=502, detail=f"Invalid response from microservice: {str(e)}")
            
            verified_count = sum(1 for r in result.get("results", []) if r.get("verified", False))
            logger.info(f"Verification complete: {verified_count}/{len(result.get('results', []))} match(es)")
            return JSONResponse(content=result)
    except httpx.TimeoutException:
        logger.error(f"Timeout while calling microservice verify_face endpoint (timeout: {TIMEOUT}s)")
        raise HTTPException(status_code=504, detail="Face verification request timed out")
    except httpx.RequestError as e:
        logger.error(f"Request error while calling microservice: {str(e)}")
        raise HTTPException(status_code=502, detail=f"Failed to connect to microservice: {str(e)}")
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse request JSON: {str(e)}")
        raise HTTPException(status_code=400, detail="Invalid JSON in request body")
    except Exception as e:
        logger.error(f"Unexpected error in proxy_verify_face: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/api/liveness")
async def proxy_liveness(video: UploadFile = File(...), session_id: str = Form(None)):
    if not session_id:
        session_id = str(uuid.uuid4())
    if should_store_video():
        # Always use 'liveness.webm' as the filename for video
        session_folder = os.path.join(OUTPUT_STORAGE, session_id)
        os.makedirs(session_folder, exist_ok=True)
        file_path = os.path.join(session_folder, 'liveness.webm')
        content = video.file.read()
        with open(file_path, 'wb') as f:
            f.write(content)
        get_encryption_manager().encrypt_file(file_path)
        file_bytes = get_encryption_manager().decrypt_file(file_path)
    else:
        file_bytes = await video.read()
    files = {"video": ('liveness.webm', file_bytes, video.content_type), "session_id": (None, session_id)}
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        resp = await client.post(f"{MICROSERVICE_URL}/api/liveness", files=files)
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail=resp.text)
        return JSONResponse(content=resp.json())

@router.post("/bank_statement")
async def proxy_bank_statement(file: UploadFile = File(...), session_id: str = Form(None)):
    """Proxy bank statement processing to microservice"""
    if not session_id:
        session_id = str(uuid.uuid4())
    
    # Validate file type
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported for bank statements")
    
    # Store the PDF file in session folder
    session_folder = os.path.join(OUTPUT_STORAGE, session_id)
    os.makedirs(session_folder, exist_ok=True)
    
    # Save original PDF file
    pdf_filename = "bank_statement.pdf"
    pdf_file_path = os.path.join(session_folder, pdf_filename)
    content = file.file.read()
    with open(pdf_file_path, 'wb') as f:
        f.write(content)
    
    # Encrypt the PDF file if storage is enabled
    if should_store_id_and_license_photo():
        get_encryption_manager().encrypt_file(pdf_file_path)
        file_bytes = get_encryption_manager().decrypt_file(pdf_file_path)
    else:
        file_bytes = content
    
    # Prepare files for microservice
    files = {"file": (file.filename, file_bytes, file.content_type), "session_id": (None, session_id)}
    
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        try:
            # Call microservice to process bank statement
            resp = await client.post(f"{MICROSERVICE_URL}/bank_statement", files=files)
            if resp.status_code != 200:
                raise HTTPException(status_code=resp.status_code, detail=resp.text)
            
            result = resp.json()
            
            # Save the JSON result in the session folder
            json_filename = "bank_statement_analysis.json"
            json_file_path = os.path.join(session_folder, json_filename)
            
            with open(json_file_path, 'w', encoding='utf-8') as f:
                json.dump(result, f, indent=2, ensure_ascii=False)
            
            # Encrypt the JSON file if storage is enabled
            if should_store_id_and_license_photo():
                get_encryption_manager().encrypt_file(json_file_path)
            
            # Run verification checks if we have transactions
            if result.get('status') == 'succeeded' and result.get('transactions'):
                # Initialize verification flags with scanned = True (document was successfully processed)
                verification_flags = {
                    'scanned': True,
                    'ofacCheck': False,
                    'integrityCheck': False,
                    'fraudEngineCheck': False
                }
                verification_summary = {}
                flagged_transactions = set()
                verification_errors = {}
                
                try:
                    from app.verification.verification_manager import VerificationManager
                    verification_manager = VerificationManager()
                    
                    logger.info(f"Starting verification for {len(result.get('transactions', []))} transactions")
                    
                    # Run all verifications
                    # Use file_bytes for PDF integrity check if file is encrypted
                    if should_store_id_and_license_photo():
                        verification_results = verification_manager.run_all_verifications(
                            file_bytes=file_bytes,
                            transactions=result.get('transactions', [])
                        )
                    else:
                        verification_results = verification_manager.run_all_verifications(
                            file_path=pdf_file_path,
                            transactions=result.get('transactions', [])
                        )
                    
                    logger.info(f"Verification completed successfully: {verification_results.get('verification_summary', {})}")
                    
                    # Update verification flags from results
                    verification_flags.update(verification_results.get('verification_flags', {}))
                    verification_summary = verification_results.get('verification_summary', {})
                    
                    # Get detailed flagged transaction information
                    detailed_flagged = verification_results.get('flagged_transactions', {})
                    flagging_summary = verification_results.get('flagging_summary', {})
                    
                except ImportError as e:
                    # Handle import errors - all verifications fail due to missing dependencies
                    logger.error(f"Verification import failed: {str(e)}")
                    logger.error("Make sure all verification dependencies are installed: scikit-learn, numpy, pandas")
                    verification_errors['import_error'] = f"Import error: {str(e)}"
                    
                except Exception as e:
                    # If verification manager fails completely, log error but keep scanned = True
                    logger.error(f"Verification manager failed: {str(e)}")
                    logger.error(f"Verification error type: {type(e).__name__}")
                    import traceback
                    logger.error(f"Verification traceback: {traceback.format_exc()}")
                    verification_errors['manager_error'] = str(e)
                
                # Try individual verification checks if the manager failed
                if verification_errors:
                    logger.info("Attempting individual verification checks...")
                    
                    # Initialize detailed_flagged for fallback processing
                    if 'detailed_flagged' not in locals():
                        detailed_flagged = {}
                    
                    try:
                        from app.verification.pdf_integrity import PDFIntegrityChecker
                        from app.verification.ofac_checker import OFACChecker
                        from app.verification.fraud_detector import FraudDetector
                        
                        # Try PDF Integrity Check
                        try:
                            pdf_checker = PDFIntegrityChecker()
                            # Use file_bytes if file is encrypted, otherwise use file_path
                            if should_store_id_and_license_photo():
                                pdf_data = {'file_bytes': file_bytes}
                            else:
                                pdf_data = {'file_path': pdf_file_path}
                            pdf_result = pdf_checker.verify(pdf_data)
                            verification_flags['integrityCheck'] = pdf_result.passed
                            logger.info(f"PDF Integrity Check: {'PASSED' if pdf_result.passed else 'FAILED'}")
                        except Exception as e:
                            logger.error(f"PDF Integrity Check failed: {str(e)}")
                            verification_errors['pdf_integrity'] = str(e)
                        
                        # Try OFAC Check
                        try:
                            ofac_checker = OFACChecker()
                            ofac_data = {'transactions': result.get('transactions', [])}
                            ofac_result = ofac_checker.verify(ofac_data)
                            verification_flags['ofacCheck'] = ofac_result.passed
                            logger.info(f"OFAC Check: {'PASSED' if ofac_result.passed else 'FAILED'}")
                            
                            # Process OFAC flagged transactions with details
                            if ofac_result.details.get('matches'):
                                for match in ofac_result.details['matches']:
                                    txn_index = match.get('transaction_index')
                                    if txn_index is not None and match.get('risk_score', 0) >= 0.3:
                                        flagged_transactions.add(txn_index)
                                        # Store detailed flagged info for fallback
                                        if 'detailed_flagged' not in locals():
                                            detailed_flagged = {}
                                        if txn_index not in detailed_flagged:
                                            detailed_flagged[txn_index] = {
                                                'severity': 'red' if not ofac_result.passed else 'yellow',
                                                'reasons': [],
                                                'modules': []
                                            }
                                        
                                        risk_score = match.get('risk_score', 0)
                                        entity_text = match.get('entity_text', 'Unknown')
                                        ofac_name = match.get('ofac_name', 'Unknown')
                                        reason = f"OFAC match: '{entity_text}' matches '{ofac_name}' (Risk: {risk_score:.2f})"
                                        detailed_flagged[txn_index]['reasons'].append(reason)
                                        if 'OFAC Check' not in detailed_flagged[txn_index]['modules']:
                                            detailed_flagged[txn_index]['modules'].append('OFAC Check')
                        except Exception as e:
                            logger.error(f"OFAC Check failed: {str(e)}")
                            verification_errors['ofac_check'] = str(e)
                        
                        # Try Fraud Detection
                        try:
                            fraud_detector = FraudDetector()
                            fraud_data = {'transactions': result.get('transactions', [])}
                            fraud_result = fraud_detector.verify(fraud_data)
                            verification_flags['fraudEngineCheck'] = fraud_result.passed
                            logger.info(f"Fraud Detection: {'PASSED' if fraud_result.passed else 'FAILED'}")
                            
                            # Process fraud flagged transactions with details
                            if fraud_result.details.get('flagged_transactions'):
                                for flagged_txn in fraud_result.details['flagged_transactions']:
                                    txn_index = flagged_txn.get('transactionIndex')
                                    if txn_index is not None and flagged_txn.get('fraud_score', 0) >= 0.3:
                                        flagged_transactions.add(txn_index)
                                        # Store detailed flagged info for fallback
                                        if 'detailed_flagged' not in locals():
                                            detailed_flagged = {}
                                        if txn_index not in detailed_flagged:
                                            detailed_flagged[txn_index] = {
                                                'severity': 'red' if not fraud_result.passed else 'yellow',
                                                'reasons': [],
                                                'modules': []
                                            }
                                        
                                        fraud_score = flagged_txn.get('fraud_score', 0)
                                        reasons = flagged_txn.get('reasons', [])
                                        for reason in reasons:
                                            full_reason = f"Fraud indicator: {reason} (Score: {fraud_score:.2f})"
                                            detailed_flagged[txn_index]['reasons'].append(full_reason)
                                        if 'Fraud Detection' not in detailed_flagged[txn_index]['modules']:
                                            detailed_flagged[txn_index]['modules'].append('Fraud Detection')
                        except Exception as e:
                            logger.error(f"Fraud Detection failed: {str(e)}")
                            verification_errors['fraud_detection'] = str(e)
                            
                    except ImportError as e:
                        logger.error(f"Individual verification imports failed: {str(e)}")
                        verification_errors['individual_import_error'] = str(e)
                
                # Set the final verification flags and summary
                result["verificationFlags"] = verification_flags
                result["verificationSummary"] = verification_summary
                
                # Add verification errors if any occurred
                if verification_errors:
                    result["verificationErrors"] = verification_errors
                
                # Add detailed flagged transaction information
                if 'detailed_flagged' in locals():
                    result["flaggedTransactionDetails"] = detailed_flagged
                    
                    # Calculate flagging summary if not already available
                    if 'flagging_summary' not in locals():
                        red_count = sum(1 for info in detailed_flagged.values() if info['severity'] == 'red')
                        yellow_count = len(detailed_flagged) - red_count
                        flagging_summary = {
                            'total_flagged': len(detailed_flagged),
                            'red_flagged': red_count,
                            'yellow_flagged': yellow_count
                        }
                    
                    result["flaggingSummary"] = flagging_summary
                
                # Update transactions with detailed flagged status
                for transaction in result.get('transactions', []):
                    transaction_index = transaction.get('transactionIndex')
                    
                    if 'detailed_flagged' in locals() and transaction_index in detailed_flagged:
                        flagged_info = detailed_flagged[transaction_index]
                        transaction['flagged'] = True
                        transaction['flaggedSeverity'] = flagged_info['severity']  # 'red' or 'yellow'
                        transaction['flaggedReasons'] = flagged_info['reasons']
                        transaction['flaggedModules'] = flagged_info['modules']
                    elif transaction_index in flagged_transactions:
                        # Fallback for old logic
                        transaction['flagged'] = True
                        transaction['flaggedSeverity'] = 'yellow'  # Default to yellow
                        transaction['flaggedReasons'] = ['Transaction flagged by verification checks']
                        transaction['flaggedModules'] = ['Unknown']
                    else:
                        transaction['flagged'] = False
                        transaction['flaggedSeverity'] = None
                        transaction['flaggedReasons'] = []
                        transaction['flaggedModules'] = []
            else:
                # Set default verification flags if no transactions
                result["verificationFlags"] = {
                    'scanned': result.get('status') == 'succeeded',
                    'ofacCheck': False,
                    'integrityCheck': False,
                    'fraudEngineCheck': False
                }
                
                # Ensure all transactions have flagged properties (default to false)
                for transaction in result.get('transactions', []):
                    transaction['flagged'] = False
                    transaction['flaggedSeverity'] = None
                    transaction['flaggedReasons'] = []
                    transaction['flaggedModules'] = []
            
            # Ensure verificationFlags is always present in the response
            if 'verificationFlags' not in result:
                result["verificationFlags"] = {
                    'scanned': result.get('status') == 'succeeded',
                    'ofacCheck': False,
                    'integrityCheck': False,
                    'fraudEngineCheck': False
                }
            
            # Add file storage info to response
            result["fileInfo"] = {
                "pdfFile": pdf_filename,
                "jsonFile": json_filename,
                "sessionId": session_id,
                "storedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            }
            
            return JSONResponse(content=result)
            
        except httpx.TimeoutException:
            raise HTTPException(status_code=504, detail="Bank statement processing timeout")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error processing bank statement: {str(e)}") 