import os
import uuid
from azure.ai.formrecognizer import DocumentAnalysisClient
from azure.core.credentials import AzureKeyCredential
import tempfile
import pandas as pd
from azure.ai.documentintelligence import DocumentIntelligenceClient
import re
from deepface import DeepFace
import random
import cv2
import numpy as np
import shutil
import json
import mediapipe as mp
from datetime import datetime, timezone
import base64
from threading import Thread
from audio_transcriber import AudioTranscriber
from dotenv import load_dotenv
import Levenshtein
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import health
from routes import document
from routes import verify
from routes import liveness
from routes import bank_statement
import logging
from utils import MODEL_NAME, DETECTOR_BACKEND, DISTANCE_METRIC, THRESHOLD

load_dotenv()

logger = logging.getLogger(__name__)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(document.router)
app.include_router(document.router, prefix="/api/v1")
app.include_router(verify.router)
app.include_router(verify.router, prefix="/api/v1")
app.include_router(liveness.router)
app.include_router(liveness.router, prefix="/api/v1")
app.include_router(bank_statement.router)
app.include_router(bank_statement.router, prefix="/api/v1")

transcriber = AudioTranscriber(model_size="base")
expected_phrase = ''

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

SAFE_WIDTH = 400

mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(static_image_mode=False, max_num_faces=1)

LEFT_EYE  = [33, 160, 158, 133, 153, 144]
RIGHT_EYE = [362, 385, 387, 263, 373, 380]
MOUTH     = [13, 14]

def extract_faces(image_bytes):
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
        first_face = faces[0]
        img = first_face["face"]
        if img.dtype != np.uint8:
            img = (img * 255).clip(0, 255).astype(np.uint8)
        img_bgr = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
        is_success, buffer = cv2.imencode(".jpg", img_bgr)
        if not is_success:
            return None
        extracted_face_bytes = buffer.tobytes()
        return extracted_face_bytes
    except Exception as e:
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
                            "message": "Not a USA or Canada passport."
                        }
                else:
                    output = {
                        "status": "failed",
                        "message": "Not a USA or Canada document."
                    }
                return output
        else:
            output = {
                "status": "failed",
                "message": "No documents found in the analysis result.",
                "createdDateTime": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                "lastUpdatedDateTime": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            }
        return output
    except Exception as e:
        return {"status": "failed", "message": str(e)}

def preload_models():
    """Preload DeepFace models to avoid loading delay on first request"""
    import time
    import sys

    print("\n" + "="*70)
    print("WARMING UP FACE VERIFICATION MODELS")
    print("="*70)
    print(f"Configuration:")
    print(f"  - Model:          {MODEL_NAME}")
    print(f"  - Detector:       {DETECTOR_BACKEND}")
    print(f"  - Distance:       {DISTANCE_METRIC}")
    print(f"  - Threshold:      {THRESHOLD}")
    print("="*70)
    sys.stdout.flush()

    try:
        # Step 1: Build recognition model
        print(f"\n[1/3] Loading {MODEL_NAME} model...", end=" ", flush=True)
        start_time = time.time()
        DeepFace.build_model(MODEL_NAME)
        model_time = time.time() - start_time
        print(f"Done ({model_time:.2f}s)")
        sys.stdout.flush()

        # Step 2: Build detector model
        print(f"[2/3] Loading {DETECTOR_BACKEND} detector...", end=" ", flush=True)
        start_time = time.time()
        test_image = np.zeros((224, 224, 3), dtype=np.uint8)
        test_image[:, :] = [120, 100, 90]
        cv2.circle(test_image, (80, 90), 15, (50, 50, 50), -1)
        cv2.circle(test_image, (144, 90), 15, (50, 50, 50), -1)
        cv2.ellipse(test_image, (112, 130), (20, 15), 0, 0, 180, (80, 60, 60), -1)
        cv2.ellipse(test_image, (112, 170), (30, 15), 0, 0, 180, (100, 70, 70), 2)

        faces = DeepFace.extract_faces(test_image, detector_backend=DETECTOR_BACKEND, enforce_detection=False)
        detector_time = time.time() - start_time
        print(f"Done ({detector_time:.2f}s)")
        sys.stdout.flush()

        # Step 3: Run full inference cycle
        print(f"[3/3] Running test inference...", end=" ", flush=True)
        start_time = time.time()
        test_image_1 = np.copy(test_image)
        test_image_2 = np.copy(test_image)
        test_image_2[100:120, 100:120] = [130, 110, 100]

        try:
            DeepFace.verify(
                test_image_1,
                test_image_2,
                model_name=MODEL_NAME,
                detector_backend=DETECTOR_BACKEND,
                distance_metric=DISTANCE_METRIC,
                enforce_detection=False
            )
        except Exception:
            pass

        inference_time = time.time() - start_time
        print(f"Done ({inference_time:.2f}s)")
        sys.stdout.flush()

        total_time = model_time + detector_time + inference_time
        print("="*70)
        print(f"Models warmed up successfully! (Total: {total_time:.2f}s)")
        print("="*70 + "\n")
        sys.stdout.flush()

        logger.info(f"DeepFace models preloaded: {MODEL_NAME} + {DETECTOR_BACKEND} in {total_time:.2f}s")
        return True

    except Exception as e:
        print(f"\nFailed to preload models: {str(e)}")
        print("="*70 + "\n")
        sys.stdout.flush()
        logger.error(f"Failed to preload DeepFace models: {str(e)}", exc_info=True)
        logger.warning("Service will continue but first request may be slower")
        return False

@app.on_event("startup")
async def startup_event():
    """Preload models on application startup"""
    preload_models()

if __name__ == '__main__':
    import logging
    logging.basicConfig(level=logging.INFO)
    preload_models() 