import os
import cv2
import numpy as np
from azure.ai.formrecognizer import DocumentAnalysisClient
from azure.core.credentials import AzureKeyCredential
from azure.ai.documentintelligence import DocumentIntelligenceClient
from datetime import datetime, timezone
import mediapipe as mp
import base64
from audio_transcriber import AudioTranscriber
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv('AZURE_DOCUMENT_AI_KEY')
endpoint = os.getenv('AZURE_DOCUMENT_AI_ENDPOINT')

if not api_key or not endpoint:
    raise ValueError("AZURE_DOCUMENT_AI_KEY and AZURE_DOCUMENT_AI_ENDPOINT must be set in .env file")

DOCUMENT_TYPES = {
    "US_DRIVING_LICENSE": [
        "name", "license_number", "date_of_birth", "address", "issue_date", "expiry_date"
    ],
}

US_STATES = [
    "alabama", "alaska", "arizona", "arkansas", "california", "colorado", "connecticut",
    "delaware", "florida", "georgia", "hawaii", "idaho", "illinois", "indiana", "iowa",
    "kansas", "kentucky", "louisiana", "maine", "maryland", "massachusetts", "michigan",
    "minnesota", "mississippi", "missouri", "montana", "nebraska", "nevada", "new hampshire",
    "new jersey", "new mexico", "new york", "north carolina", "north dakota", "ohio",
    "oklahoma", "oregon", "pennsylvania", "rhode island", "south carolina", "south dakota",
    "tennessee", "texas", "utah", "vermont", "virginia", "washington", "west virginia",
    "wisconsin", "wyoming", "district of columbia"
]
PROVINCE_MAP = {
    "AB": "Alberta", "BC": "British Columbia", "MB": "Manitoba",
    "NB": "New Brunswick", "NL": "Newfoundland and Labrador",
    "NS": "Nova Scotia", "NT": "Northwest Territories",
    "NU": "Nunavut", "ON": "Ontario", "PE": "Prince Edward Island",
    "QC": "Québec", "SK": "Saskatchewan", "YT": "Yukon"
}

def parse_azure_error(error_message: str) -> str:
    """
    Parse Azure Document Intelligence error messages and return user-friendly messages.
    Extracts the key information and maps common error codes to business-friendly messages.
    """
    error_str = str(error_message).lower()

    # Check for specific error codes/patterns (order matters - check specific before general)
    if "invalidcontentdimensions" in error_str or "dimensions are out of range" in error_str or "dimension" in error_str:
        return "The image dimensions are not supported. Please upload a photo taken with your phone camera or a scanned document with standard size."

    if "invalidimagesize" in error_str or "file size" in error_str or "too large" in error_str:
        return "The image file is too large. Please upload a smaller image (maximum 4MB)."

    if "unsupportedmediatype" in error_str or "unsupported content type" in error_str or "file format" in error_str:
        return "The file format is not supported. Please upload a JPG, PNG, or PDF file."

    if "invalidimage" in error_str or "cannot read image" in error_str or "corrupted" in error_str:
        return "The image file appears to be invalid or corrupted. Please try uploading a different photo."

    if "401" in error_str or "unauthorized" in error_str or "authentication" in error_str:
        return "Service authentication error. Please contact support."

    if "429" in error_str or "throttl" in error_str or "rate limit" in error_str:
        return "Service is temporarily busy. Please wait a moment and try again."

    if "timeout" in error_str or "timed out" in error_str:
        return "The request took too long to process. Please try again with a clearer image."

    if "network" in error_str or "connection" in error_str:
        return "Network connection error. Please check your internet connection and try again."

    # Check for "invalid request" last since it's very general
    if "badargument" in error_str or "invalid request" in error_str or "invalidrequest" in error_str:
        return "We couldn't process your document. Please ensure you're uploading a clear photo of a valid government-issued ID."

    # Default fallback message
    return "We couldn't process your document. Please try uploading a clearer photo of your ID."

PHRASES = [                                       
        "The quick brown fox jumps over the lazy dog",
        "Pack my box with five dozen liquor jugs",              
        "The corners of the room don't echo anymore",
        "Time moves slower when the lights flicker",
        "Glass holds its breath before it breaks",
        "The ceiling hums when no one listens",
        "There is dust on things no one remembers",
        "The morning started without asking me",
        "Nothing moves until someone pretends it does",
        "The street forgot where it was going",
        "You can hear silence if you wait long enough",
        "Shadows know when you are not looking",
        "The keys were still warm when I found them",
        "Patterns repeat even when they should not",
        "The sound of shoes does not match the walk",
        "Every window has its own kind of light",
        "No clocks tick the same in quiet rooms",
        "The hallway stretched longer than it should",
        "Voices linger where words have left",
        "The walls do not remember what they have heard",
        "Even stillness has a rhythm of its own",
        "The echo came back different this time",
    "Nothing changes if you don't look",
        "Sometimes the floor feels farther away",
        "Light bends when you stop paying attention"       
    ]  

MODEL_NAME = os.getenv('FACE_RECOGNITION_MODEL', 'SFace')
DETECTOR_BACKEND = os.getenv('FACE_DETECTOR_BACKEND', 'opencv')
DISTANCE_METRIC = "cosine"
THRESHOLD = float(os.getenv('FACE_MATCH_THRESHOLD', '0.6'))
PHRASE_MATCH_THRESHOLD = float(os.getenv('PHRASE_MATCH_THRESHOLD', '0.1'))
LIVENESS_HEAD_MOVEMENT_THRESHOLD = float(os.getenv('LIVENESS_HEAD_MOVEMENT_THRESHOLD', '0.05'))
LIVENESS_VERTICAL_MOVEMENT_THRESHOLD = float(os.getenv('LIVENESS_VERTICAL_MOVEMENT_THRESHOLD', '0.04'))
SAFE_WIDTH = 400

# Validate configuration
VALID_MODELS = ["VGG-Face", "Facenet", "Facenet512", "OpenFace", "DeepID",
                "ArcFace", "SFace", "GhostFaceNet"]
VALID_DETECTORS = ["opencv", "retinaface", "ssd", "mtcnn", "dlib", "mediapipe"]

if MODEL_NAME not in VALID_MODELS:
    import logging
    logger = logging.getLogger(__name__)
    logger.warning(f"Invalid FACE_RECOGNITION_MODEL '{MODEL_NAME}'. Falling back to 'SFace'.")
    MODEL_NAME = "SFace"

if DETECTOR_BACKEND not in VALID_DETECTORS:
    import logging
    logger = logging.getLogger(__name__)
    logger.warning(f"Invalid FACE_DETECTOR_BACKEND '{DETECTOR_BACKEND}'. Falling back to 'opencv'.")
    DETECTOR_BACKEND = "opencv"

mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(static_image_mode=False, max_num_faces=1)

LEFT_EYE  = [33, 160, 158, 133, 153, 144]
RIGHT_EYE = [362, 385, 387, 263, 373, 380]
MOUTH     = [13, 14]

transcriber = AudioTranscriber(model_size="base")
expected_phrase = ''

# In-memory storage for expected phrases per session
expected_phrases = {}

def extract_faces(image_bytes):
    from deepface import DeepFace
    try:
        np_arr = np.frombuffer(image_bytes, np.uint8)
        img_for_deepface = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if img_for_deepface is None:
            raise ValueError("Could not decode image from bytes.")
    except Exception as e:
        return None

    try:
        faces = DeepFace.extract_faces(img_for_deepface, detector_backend=DETECTOR_BACKEND, enforce_detection=True)
        if not faces:
            return None

        # If multiple faces detected, pick the largest one (by area)
        if len(faces) > 1:
            largest_face = max(faces, key=lambda f: f.get("facial_area", {}).get("w", 0) * f.get("facial_area", {}).get("h", 0))
            import logging
            logger = logging.getLogger(__name__)
            logger.info(f"Multiple faces detected ({len(faces)}). Selected largest face with area: {largest_face.get('facial_area', {})}")
        else:
            largest_face = faces[0]

        img = largest_face["face"]
        if img.dtype != np.uint8:
            img = (img * 255).clip(0, 255).astype(np.uint8)
        img_bgr = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
        is_success, buffer = cv2.imencode(".jpg", img_bgr)
        if not is_success:
            return None
        extracted_face_bytes = buffer.tobytes()
        return extracted_face_bytes
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.debug(f"Face extraction failed: {str(e)}")
        return None

def preprocess_image(image, safe_width=SAFE_WIDTH):
    h, w = image.shape[:2]
    if w < safe_width:
        scale_factor = safe_width / w
        image = cv2.resize(image, (int(w * scale_factor), int(h * scale_factor)), interpolation=cv2.INTER_CUBIC)
    kernel = np.array([[0, -1, 0], [-1, 5,-1], [0, -1, 0]])
    return cv2.filter2D(image, -1, kernel)

BLUR_THRESHOLD = 100.0

def is_blurry(image_bytes: bytes) -> bool:
    try:
        np_arr = np.frombuffer(image_bytes, np.uint8)
        gray = cv2.imdecode(np_arr, cv2.IMREAD_GRAYSCALE)
    except Exception as e:
        return True
    if gray is None:
        return True
    fm = cv2.Laplacian(gray, cv2.CV_64F).var()
    return fm < BLUR_THRESHOLD

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in {'png', 'jpg', 'jpeg', 'pdf'}

def analyze_document_type(file_bytes):
    try:
        document_analysis_client = DocumentAnalysisClient(
            endpoint=endpoint, credential=AzureKeyCredential(api_key)
        )
        poller = document_analysis_client.begin_analyze_document(
            "prebuilt-idDocument", document=file_bytes
        )
        id_result = poller.result()
        if hasattr(id_result, 'documents') and id_result.documents:
            for document in id_result.documents:
                doc_type = getattr(document, 'doc_type', '').lower()
                if 'license' in doc_type:
                    region = document.fields.get('Region','')
                    addr = document.fields.get("Address",'')
                    if region and any(state in region.value.lower() for state in US_STATES):
                        output = {
                            "status": "succeeded",
                            "type":"driving_license",
                            "documentType": "US_DRIVING_LICENSE",
                            "createdDateTime": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                            "lastUpdatedDateTime": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                            "analyzeResult": id_result.to_dict()
                        }
                    elif addr and getattr(addr.value, "state", None):
                        code = addr.value.state.strip().upper()
                        if code in PROVINCE_MAP:
                            output = {
                                "status": "succeeded",
                                "type":"driving_license",
                                "documentType": "CAN_DRIVING_LICENSE",
                                "createdDateTime": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                                "lastUpdatedDateTime": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                                "analyzeResult": id_result.to_dict()
                            }
                    else:
                        output = {
                            "status": "failed",
                            "type":"UNKNOWN",
                            "documentType": "UNKNOWN",
                            "message": "We currently only accept Driver's Licenses from the United States and Canada. Please upload a valid US or Canadian Driver's License.",
                            "createdDateTime": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                            "lastUpdatedDateTime": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                            "analyzeResult": id_result.to_dict()
                        }
                elif 'passport' in doc_type:
                    country_field = document.fields.get("CountryRegion", '')
                    if country_field and country_field.value == "USA":
                        output = {
                            "status": "succeeded",
                            "type":"passport",
                            "documentType": "US_PASSPORT",
                            "createdDateTime": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                            "lastUpdatedDateTime": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                            "analyzeResult": id_result.to_dict()
                        }
                    elif country_field and country_field.value == "CAN":
                        output = {
                            "status": "succeeded",
                            "type":"passport",
                            "documentType": "CAN_PASSPORT",
                            "createdDateTime": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                            "lastUpdatedDateTime": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                            "analyzeResult": id_result.to_dict()
                        }
                    else:
                        output = {
                            "status": "failed",
                            "message": "We currently only accept Passports from the United States and Canada. Please upload a valid US or Canadian Passport."
                        }
                else:
                    output = {
                        "status": "failed",
                        "message": "We couldn't recognize this document type. Please upload a valid Driver's License or Passport from the United States or Canada."
                    }
                return output
        else:
            output = {
                "status": "failed",
                "message": "We couldn't extract information from this document. Please ensure the image is clear, well-lit, and shows the entire document.",
                "createdDateTime": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                "lastUpdatedDateTime": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            }
        return output
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Azure Document Intelligence error: {str(e)}")

        # Parse Azure error and return user-friendly message
        user_friendly_message = parse_azure_error(str(e))
        return {"status": "failed", "message": user_friendly_message} 