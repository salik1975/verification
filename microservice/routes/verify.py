from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from utils import expected_phrase, expected_phrases, preprocess_image, MODEL_NAME, DETECTOR_BACKEND, DISTANCE_METRIC, THRESHOLD
from deepface import DeepFace
import tempfile
import base64
import cv2
import os
import logging
import asyncio
from concurrent.futures import ThreadPoolExecutor
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)
# Ensure logger has a handler and is set to INFO level
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setLevel(logging.INFO)
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)
router = APIRouter()

# Thread pool executor for running DeepFace operations in parallel
# Number of workers configurable via FACE_VERIFY_WORKERS environment variable
# Default: 2 (recommended for most systems to avoid resource contention)
FACE_VERIFY_WORKERS = int(os.getenv('FACE_VERIFY_WORKERS', '2'))
executor = ThreadPoolExecutor(max_workers=FACE_VERIFY_WORKERS, thread_name_prefix="deepface_worker")

# ============================================================================
# RETRY LOGIC FOR DEEPFACE OPERATIONS
# ============================================================================

def retry_deepface_verify(img1_path, img2_path, max_attempts=3, backoff_seconds=0.5):
    """
    Retry wrapper for DeepFace.verify() to handle transient failures.

    Returns:
        DeepFace.verify() result dict
    """
    import time

    for attempt in range(1, max_attempts + 1):
        try:
            logger.debug(f"DeepFace.verify attempt {attempt}/{max_attempts}")
            result = DeepFace.verify(
                img1_path=img1_path,
                img2_path=img2_path,
                model_name=MODEL_NAME,
                detector_backend=DETECTOR_BACKEND,
                distance_metric=DISTANCE_METRIC,
                enforce_detection=True  # Raises exception if no face in either image
            )

            if attempt > 1:
                logger.info(f"DeepFace.verify succeeded on attempt {attempt}")

            return result

        except Exception as e:
            error_msg = str(e).lower()

            # Don't retry for "no face detected" errors (data issue, not transient)
            if 'no face' in error_msg or 'face could not be detected' in error_msg:
                logger.debug(f"Face detection failed (not retrying): {str(e)}")
                raise

            # Retry for other errors
            if attempt < max_attempts:
                backoff = backoff_seconds * (2 ** (attempt - 1))
                logger.warning(f"DeepFace.verify failed on attempt {attempt}/{max_attempts}: {str(e)}. Retrying in {backoff}s...")
                time.sleep(backoff)
            else:
                logger.error(f"DeepFace.verify failed after {max_attempts} attempts: {str(e)}")
                raise

# ============================================================================
# CUSTOMER-FACING ERROR MESSAGES
# ============================================================================

ERROR_MESSAGES = {
    "no_face_reference": "We couldn't find a face in your reference photo. Please ensure your face is clearly visible and well-lit, then try again.",
    "no_face_comparison": "We couldn't find a face in one of your verification photos. Please ensure your face is clearly visible in all photos.",
    "image_invalid": "One or more images couldn't be processed. Please ensure you've uploaded valid image files and try again.",
    "verification_failed": "Face verification encountered an error. Please try again. If the problem persists, contact support.",
    "timeout": "Verification is taking longer than expected. Please try again with better quality images.",
    "insufficient_images": "At least 2 images are required for face verification. Please provide your reference photo and at least one verification photo.",
    "generic_error": "We encountered an unexpected error during verification. Please try again or contact support if the issue persists."
}

def get_friendly_error_message(error_type, details=None):
    """Get customer-facing error message."""
    message = ERROR_MESSAGES.get(error_type, ERROR_MESSAGES["generic_error"])
    if details:
        logger.debug(f"Error details for {error_type}: {details}")
    return message

class VerifyPhraseRequest(BaseModel):
    name: str = "the user"
    session_id: str = None

@router.post("/verify_phrase")
async def gen_verify_phrase(req: VerifyPhraseRequest):
    global expected_phrase
    phrase = f"My name is {req.name} and I am verifying my identity"
    expected_phrase = phrase  # Keep global for backward compatibility
    
    # Store phrase per session
    if req.session_id:
        expected_phrases[req.session_id] = phrase
        logger.debug(f"Setting expected_phrase for session {req.session_id}: {phrase}")
    else:
        logger.debug(f"Setting expected_phrase (no session): {phrase}")

    logger.debug(f"Request name: {req.name}")
    return {"phrase": phrase}

class VerifyFaceRequest(BaseModel):
    images: list[str]

@router.post("/verify_face")
async def verify_face(req: VerifyFaceRequest):
    import sys
    import time
    start_time = time.time()
    
    # Force immediate output to verify endpoint is called
    sys.stderr.write(f"[VERIFY_FACE] ===== ENDPOINT CALLED AT {time.strftime('%H:%M:%S')} =====\n")
    sys.stderr.flush()
    sys.stdout.write(f"[VERIFY_FACE] ===== ENDPOINT CALLED AT {time.strftime('%H:%M:%S')} =====\n")
    sys.stdout.flush()
    
    print(f"[VERIFY_FACE] Request received with {len(req.images) if req.images else 0} image(s)", file=sys.stderr, flush=True)
    logger.info(f"Face verification request received: {len(req.images) if req.images else 0} image(s) provided")
    
    temp_paths = []
    preprocessed_paths = []
    try:
        images = req.images
        print(f"[VERIFY_FACE] Processing {len(images)} images", file=sys.stderr, flush=True)
        if not images or len(images) < 2:
            raise HTTPException(status_code=400, detail=get_friendly_error_message("insufficient_images"))
        
        def save_base64_to_temp(base64_str):
            if not base64_str:
                return None
            fd = None
            try:
                # Detect image format from data URL (e.g., "data:image/png;base64,..." or "data:image/jpeg;base64,...")
                # Default to .jpg if format not specified
                suffix = ".jpg"
                if base64_str.startswith("data:image/"):
                    format_part = base64_str.split(";")[0]  # Get "data:image/png" or "data:image/jpeg"
                    if "png" in format_part.lower():
                        suffix = ".png"
                    elif "jpeg" in format_part.lower() or "jpg" in format_part.lower():
                        suffix = ".jpg"
                
                fd, temp_path = tempfile.mkstemp(suffix=suffix)
                with open(temp_path, "wb") as f:
                    f.write(base64.b64decode(base64_str.split(',')[-1]))
                return temp_path
            except Exception as e:
                logger.warning(f"Failed to save base64 image to temp file: {str(e)}")
                return None
            finally:
                if fd is not None:
                    try:
                        os.close(fd)
                    except Exception:
                        pass
        print(f"[VERIFY_FACE] Step 1: Decoding base64 images to temporary files...", file=sys.stderr, flush=True)
        logger.info("Step 1: Decoding base64 images to temporary files...")
        temp_paths = [save_base64_to_temp(b64) for b64 in images]
        valid_temp_count = sum(1 for p in temp_paths if p is not None)
        print(f"[VERIFY_FACE] Decoded {valid_temp_count}/{len(images)} images successfully", file=sys.stderr, flush=True)
        logger.info(f"Decoded {valid_temp_count}/{len(images)} images successfully")
        
        def preprocess_and_save(image_path):
            if image_path is None:
                return None
            try:
                img = cv2.imread(image_path)
                if img is None or img.size == 0:
                    logger.warning(f"Failed to read image from {image_path}: image is None or empty")
                    return None
                # Validate image dimensions
                h, w = img.shape[:2]
                if h < 10 or w < 10:
                    logger.warning(f"Image too small: {w}x{h}")
                    return None
                pre_img = preprocess_image(img)
                fd = None
                try:
                    fd, tmp_path = tempfile.mkstemp(suffix=".jpg")
                    if not cv2.imwrite(tmp_path, pre_img):
                        logger.warning(f"Failed to write preprocessed image to {tmp_path}")
                        if os.path.exists(tmp_path):
                            os.remove(tmp_path)
                        return None
                    # Verify file was written and is readable
                    if not os.path.exists(tmp_path) or os.path.getsize(tmp_path) == 0:
                        logger.warning(f"Preprocessed image file is empty or doesn't exist: {tmp_path}")
                        return None
                    return tmp_path
                finally:
                    if fd is not None:
                        try:
                            os.close(fd)
                        except Exception:
                            pass
            except Exception as e:
                logger.warning(f"Failed to preprocess image: {str(e)}")
                return None
        print(f"[VERIFY_FACE] Step 2: Preprocessing images (resizing, sharpening)...", file=sys.stderr, flush=True)
        logger.info("Step 2: Preprocessing images (resizing, sharpening)...")
        preprocessed_paths = [preprocess_and_save(p) for p in temp_paths]
        valid_preprocessed_count = sum(1 for p in preprocessed_paths if p is not None)
        print(f"[VERIFY_FACE] Preprocessed {valid_preprocessed_count}/{len(temp_paths)} images successfully", file=sys.stderr, flush=True)
        logger.info(f"Preprocessed {valid_preprocessed_count}/{len(temp_paths)} images successfully")
        
        if not preprocessed_paths or preprocessed_paths[0] is None:
            raise HTTPException(status_code=400, detail=get_friendly_error_message("image_invalid", "Reference image"))
        
        print(f"[VERIFY_FACE] Step 3: Starting face verification for {len(preprocessed_paths) - 1} comparison(s)...", file=sys.stderr, flush=True)
        logger.info(f"Step 3: Starting face verification for {len(preprocessed_paths) - 1} comparison(s)...")
        
        # OPTIMIZATION: Detect face in reference image once (not 3 times)
        # This saves ~20-25 seconds per comparison
        print(f"[VERIFY_FACE]    Detecting face in reference image (image1) once for all comparisons...", file=sys.stderr, flush=True)
        logger.debug(f"    Detecting face in reference image (image1)...")
        face_detect_start = time.time()
        try:
            faces_ref = DeepFace.extract_faces(
                img_path=preprocessed_paths[0],
                detector_backend=DETECTOR_BACKEND,
                enforce_detection=True  # Raises exception if no face (handled below)
            )
            ref_face_detected = faces_ref and len(faces_ref) > 0
            print(f"[VERIFY_FACE]    Reference face detection completed in {time.time() - face_detect_start:.2f}s - {'Face found' if ref_face_detected else 'No face'}", file=sys.stderr, flush=True)
            if not ref_face_detected:
                logger.warning("No face detected in reference image (image1)")
            elif len(faces_ref) > 1:
                logger.warning(f"Multiple faces ({len(faces_ref)}) detected in reference image. Using first face only. This may cause inconsistent verification results.")
        except Exception as e:
            logger.warning(f"Face detection failed for reference image: {str(e)}")
            ref_face_detected = False
        
        if not ref_face_detected:
            # If no face in reference, return errors for all comparisons
            results = [{
                'compared_with': f'image{i+1}',
                'verified': False,
                'distance': float('inf'),
                'threshold': THRESHOLD,
                'error': get_friendly_error_message("no_face_reference")
            } for i in range(1, len(preprocessed_paths)) if preprocessed_paths[i] is not None]
        else:
            # OPTIMIZATION: Run all comparisons in parallel
            print(f"[VERIFY_FACE]    Starting {len(preprocessed_paths) - 1} parallel verification(s)...", file=sys.stderr, flush=True)
            logger.info(f"Running {len(preprocessed_paths) - 1} face verification(s) in parallel...")
            
            async def verify_single_comparison(i, img2_path):
                """Run a single face verification comparison"""
                if img2_path is None:
                    return {
                        'compared_with': f'image{i+1}',
                        'verified': False,
                        'distance': float('inf'),
                        'threshold': THRESHOLD,
                        'error': get_friendly_error_message("image_invalid", f"Image {i+1}")
                    }
                
                try:
                    logger.info(f"  Processing comparison {i}/{len(preprocessed_paths) - 1}: image1 vs image{i+1}")
                    print(f"[VERIFY_FACE]    [Parallel {i}] Starting verification for image1 vs image{i+1}...", file=sys.stderr, flush=True)

                    # Detect face in comparison image and log quality info
                    try:
                        comp_faces = DeepFace.extract_faces(
                            img_path=img2_path,
                            detector_backend=DETECTOR_BACKEND,
                            enforce_detection=True
                        )
                        if comp_faces and len(comp_faces) > 0:
                            face_area = comp_faces[0].get('facial_area', {})
                            confidence = comp_faces[0].get('confidence', 0.0)
                            logger.info(f"    Image{i+1} face detection: confidence={confidence:.3f}, area={face_area}")
                            print(f"[VERIFY_FACE]    [Parallel {i}] Face detected in image{i+1}: confidence={confidence:.3f}", file=sys.stderr, flush=True)
                            if len(comp_faces) > 1:
                                logger.warning(f"    Multiple faces ({len(comp_faces)}) detected in image{i+1}. Using first face only.")
                        else:
                            logger.warning(f"    No face detected in image{i+1}")
                            print(f"[VERIFY_FACE]    [Parallel {i}] WARNING: No face in image{i+1}", file=sys.stderr, flush=True)
                    except Exception as face_check_e:
                        logger.warning(f"    Face detection check failed for image{i+1}: {str(face_check_e)}")
                        print(f"[VERIFY_FACE]    [Parallel {i}] Face check failed: {str(face_check_e)}", file=sys.stderr, flush=True)

                    # Run DeepFace.verify() in thread pool to avoid blocking
                    def run_verify():
                        try:
                            print(f"[VERIFY_FACE]    [Parallel {i}] Thread started, calling DeepFace.verify()...", file=sys.stderr, flush=True)
                            result = retry_deepface_verify(
                                img1_path=preprocessed_paths[0],
                                img2_path=img2_path,
                                max_attempts=3,
                                backoff_seconds=0.5
                            )
                            print(f"[VERIFY_FACE]    [Parallel {i}] DeepFace.verify() returned successfully", file=sys.stderr, flush=True)
                            return result
                        except Exception as thread_e:
                            print(f"[VERIFY_FACE]    [Parallel {i}] Exception in thread: {str(thread_e)}", file=sys.stderr, flush=True)
                            import traceback
                            print(f"[VERIFY_FACE]    [Parallel {i}] Thread traceback:\n{traceback.format_exc()}", file=sys.stderr, flush=True)
                            raise
                    
                    # Get the running event loop (safer than get_event_loop())
                    try:
                        loop = asyncio.get_running_loop()
                    except RuntimeError:
                        # Fallback if no running loop (shouldn't happen in FastAPI)
                        loop = asyncio.get_event_loop()
                    
                    print(f"[VERIFY_FACE]    [Parallel {i}] Submitting to executor...", file=sys.stderr, flush=True)
                    verify_start = time.time()
                    # Add timeout to prevent hanging (300 seconds per comparison to match overall timeout)
                    try:
                        result = await asyncio.wait_for(
                            loop.run_in_executor(executor, run_verify),
                            timeout=300.0
                        )
                    except asyncio.TimeoutError:
                        print(f"[VERIFY_FACE]    [Parallel {i}] TIMEOUT after 300s", file=sys.stderr, flush=True)
                        raise TimeoutError(f"Face verification timed out after 300 seconds for image{i+1}")
                    
                    verify_time = time.time() - verify_start
                    print(f"[VERIFY_FACE]    [Parallel {i}] DeepFace.verify() completed in {verify_time:.2f}s", file=sys.stderr, flush=True)
                    
                    distance = result.get('distance', float('inf'))
                    verified = distance < THRESHOLD
                    logger.info(f"    Verification result: {'MATCH' if verified else 'NO MATCH'} (distance: {distance:.4f}, threshold: {THRESHOLD})")
                    return {
                        'compared_with': f'image{i+1}',
                        'verified': verified,
                        'distance': distance,
                        'threshold': THRESHOLD
                    }
                except Exception as e:
                    import traceback
                    error_trace = traceback.format_exc()
                    print(f"[VERIFY_FACE]    [Parallel {i}] EXCEPTION: {str(e)}", file=sys.stderr, flush=True)
                    print(f"[VERIFY_FACE]    [Parallel {i}] TRACEBACK:\n{error_trace}", file=sys.stderr, flush=True)
                    logger.error(f"Face verification failed for image{i+1}: {str(e)}", exc_info=True)
                    error_msg = str(e).lower()
                    if 'no face' in error_msg or 'face could not be detected' in error_msg:
                        error_detail = get_friendly_error_message("no_face_comparison", f"image{i+1}")
                    else:
                        error_detail = get_friendly_error_message("verification_failed", str(e))
                    return {
                        'compared_with': f'image{i+1}',
                        'verified': False,
                        'distance': float('inf'),
                        'threshold': THRESHOLD,
                        'error': error_detail
                    }
            
            # Create tasks for all comparisons
            tasks = [
                verify_single_comparison(i, preprocessed_paths[i])
                for i in range(1, len(preprocessed_paths))
            ]
            
            # Run all comparisons in parallel
            # Use return_exceptions=True to ensure all tasks complete even if one fails
            # Add overall timeout to prevent hanging (5 minutes total)
            parallel_start = time.time()
            print(f"[VERIFY_FACE]    Awaiting {len(tasks)} parallel tasks...", file=sys.stderr, flush=True)
            try:
                print(f"[VERIFY_FACE]    Starting asyncio.gather() for {len(tasks)} tasks...", file=sys.stderr, flush=True)
                results = await asyncio.wait_for(
                    asyncio.gather(*tasks, return_exceptions=True),
                    timeout=300.0  # 5 minutes total timeout
                )
                print(f"[VERIFY_FACE]    asyncio.gather() COMPLETED with {len(results)} results", file=sys.stderr, flush=True)
                logger.info(f"asyncio.gather() completed with {len(results)} result(s)")
                
                # Check for exceptions in results
                for idx, result in enumerate(results):
                    if isinstance(result, Exception):
                        import traceback
                        error_trace = traceback.format_exc()
                        print(f"[VERIFY_FACE]    Exception in parallel task {idx+1}: {str(result)}", file=sys.stderr, flush=True)
                        print(f"[VERIFY_FACE]    Task {idx+1} traceback:\n{error_trace}", file=sys.stderr, flush=True)
                        logger.error(f"Exception in parallel task {idx+1}: {str(result)}", exc_info=result)
                        # Convert exception to error result
                        results[idx] = {
                            'compared_with': f'image{idx+2}',
                            'verified': False,
                            'distance': float('inf'),
                            'threshold': THRESHOLD,
                            'error': f'Face verification failed: {str(result)}'
                        }
                    elif isinstance(result, dict):
                        print(f"[VERIFY_FACE]    Task {idx+1} completed successfully: verified={result.get('verified', False)}, distance={result.get('distance', 'N/A')}", file=sys.stderr, flush=True)
                        logger.info(f"Task {idx+1} result: {result}")
                    else:
                        print(f"[VERIFY_FACE]    Task {idx+1} returned unexpected type: {type(result)}", file=sys.stderr, flush=True)
                        logger.warning(f"Task {idx+1} returned unexpected type: {type(result)}")
                
                print(f"[VERIFY_FACE]    Finished processing all {len(results)} results", file=sys.stderr, flush=True)
            except asyncio.TimeoutError:
                print(f"[VERIFY_FACE]    TIMEOUT: Parallel processing exceeded 300s timeout", file=sys.stderr, flush=True)
                logger.error("Parallel processing timed out after 300 seconds")
                # Cancel remaining tasks
                for task in tasks:
                    if not task.done():
                        task.cancel()
                # Try to get partial results from completed tasks
                partial_results = []
                for idx, task in enumerate(tasks):
                    if task.done():
                        try:
                            result = task.result()
                            if isinstance(result, dict):
                                partial_results.append(result)
                            else:
                                partial_results.append({
                                    'compared_with': f'image{idx+2}',
                                    'verified': False,
                                    'distance': float('inf'),
                                    'threshold': THRESHOLD,
                                    'error': f'Task failed: {str(result)}'
                                })
                        except Exception as e:
                            partial_results.append({
                                'compared_with': f'image{idx+2}',
                                'verified': False,
                                'distance': float('inf'),
                                'threshold': THRESHOLD,
                                'error': f'Task error: {str(e)}'
                            })
                    else:
                        partial_results.append({
                            'compared_with': f'image{idx+2}',
                            'verified': False,
                            'distance': float('inf'),
                            'threshold': THRESHOLD,
                            'error': 'Face verification timed out (exceeded 300 seconds)'
                        })
                results = partial_results
            except Exception as e:
                import traceback
                error_trace = traceback.format_exc()
                print(f"[VERIFY_FACE]    Error in asyncio.gather: {str(e)}", file=sys.stderr, flush=True)
                print(f"[VERIFY_FACE]    Gather traceback:\n{error_trace}", file=sys.stderr, flush=True)
                logger.error(f"Error in asyncio.gather: {str(e)}", exc_info=True)
                # Fallback: return error results for all
                results = [{
                    'compared_with': f'image{i+1}',
                    'verified': False,
                    'distance': float('inf'),
                    'threshold': THRESHOLD,
                    'error': f'Parallel processing failed: {str(e)}'
                } for i in range(1, len(preprocessed_paths))]
            
            parallel_time = time.time() - parallel_start
            print(f"[VERIFY_FACE]    All {len(results)} parallel verification(s) completed in {parallel_time:.2f}s", file=sys.stderr, flush=True)
            logger.info(f"All {len(results)} parallel verification(s) completed in {parallel_time:.2f}s")
        
        # Ensure results is a list
        if not isinstance(results, list):
            print(f"[VERIFY_FACE]    WARNING: results is not a list: {type(results)}", file=sys.stderr, flush=True)
            results = []
        
        verified_count = sum(1 for r in results if isinstance(r, dict) and r.get('verified', False))
        # Count execution errors (not distance-based failures)
        # Execution errors have an error message but distance is None or inf
        execution_error_count = sum(1 for r in results if isinstance(r, dict) and r.get('error') and not r.get('verified', False) and (r.get('distance') is None or r.get('distance') == float('inf')))
        # Distance failures have a valid distance but didn't meet threshold
        distance_failure_count = sum(1 for r in results if isinstance(r, dict) and not r.get('verified', False) and r.get('distance') is not None and r.get('distance') != float('inf'))
        
        total_time = time.time() - start_time
        print(f"[VERIFY_FACE] Step 4: Verification complete. {verified_count}/{len(results)} comparison(s) matched. Total time: {total_time:.2f}s", file=sys.stderr, flush=True)
        logger.info(f"Step 4: Verification complete. {verified_count}/{len(results)} comparison(s) matched.")
        
        # Determine overall verification status and failure reason
        overall_verified = False
        failure_reason = None

        if verified_count >= 2:
            # At least 2 matches - check if remaining failure(s) are within tolerance
            # Close miss = distance <= threshold * 1.5 (50% above threshold)
            close_miss_tolerance = THRESHOLD * 1.5

            # Check all failed comparisons with valid distances
            has_far_misses = False
            for r in results:
                if isinstance(r, dict) and not r.get('verified', False):
                    distance = r.get('distance')
                    # If distance is valid and exceeds tolerance, it's a far miss
                    if distance is not None and distance != float('inf') and distance > close_miss_tolerance:
                        has_far_misses = True
                        print(f"[VERIFY_FACE]    Far miss detected: {r.get('compared_with')} distance={distance:.4f} > tolerance={close_miss_tolerance:.4f}", file=sys.stderr, flush=True)
                        break

            if not has_far_misses:
                # 2+ matches + no far misses = PASS
                overall_verified = True
                print(f"[VERIFY_FACE]    Overall status: PASS - {verified_count} match(es) found, all failures within tolerance (<= {close_miss_tolerance:.2f})", file=sys.stderr, flush=True)
                logger.info(f"Overall verification PASSED: {verified_count} match(es) found, all failures within tolerance")
            else:
                # 2+ matches but has far miss = FAIL
                overall_verified = False
                failure_reason = "The face in your video does not match your ID photo. Please ensure you are using your own ID and try again"
                print(f"[VERIFY_FACE]    Overall status: FAIL - {verified_count} match(es) but has far miss (distance > {close_miss_tolerance:.2f})", file=sys.stderr, flush=True)
                print(f"[VERIFY_FACE]    Failure reason: {failure_reason}", file=sys.stderr, flush=True)
                logger.info(f"Overall verification FAILED: {verified_count} match(es) but has far miss beyond tolerance")
        elif verified_count == 1:
            # Only 1 match - FAIL (need at least 2 matches)
            overall_verified = False
            failure_reason = "The face in your video does not match your ID photo. Please ensure you are using your own ID and try again"
            print(f"[VERIFY_FACE]    Overall status: FAIL - Only 1 match found (need at least 2)", file=sys.stderr, flush=True)
            print(f"[VERIFY_FACE]    Failure reason: {failure_reason}", file=sys.stderr, flush=True)
            logger.info(f"Overall verification FAILED: Only 1 match found (need at least 2)")
        else:
            # No matches at all - FAIL
            overall_verified = False
            failure_reason = "The face in your video does not match your ID photo. Please ensure you are using your own ID and try again"
            print(f"[VERIFY_FACE]    Overall status: FAIL - No matches found", file=sys.stderr, flush=True)
            print(f"[VERIFY_FACE]    Failure reason: {failure_reason}", file=sys.stderr, flush=True)
            logger.info("Overall verification FAILED: No matches found")
            logger.info(f"Failure reason: {failure_reason}")
        
        # Ensure results list is properly formatted and JSON-serializable
        # Replace float('inf') with None or a large number for JSON compliance
        json_safe_results = []
        for result in results:
            if isinstance(result, dict):
                json_safe_result = result.copy()
                # Replace float('inf') with None for JSON compliance
                if 'distance' in json_safe_result and json_safe_result['distance'] == float('inf'):
                    json_safe_result['distance'] = None
                json_safe_results.append(json_safe_result)
            else:
                json_safe_results.append(result)
        
        response_data = {
            'reference': 'image1',
            'results': json_safe_results,
            'overall_verified': overall_verified,
            'summary': {
                'total_comparisons': len(json_safe_results),
                'matches': verified_count,
                'execution_errors': execution_error_count,
                'distance_failures': distance_failure_count
            }
        }

        # Add failure_reason if verification failed
        if failure_reason:
            response_data['failure_reason'] = failure_reason
        
        print(f"[VERIFY_FACE] ===== PREPARING RESPONSE =====", file=sys.stderr, flush=True)
        print(f"[VERIFY_FACE]    Response data keys: {list(response_data.keys())}", file=sys.stderr, flush=True)
        print(f"[VERIFY_FACE]    Results count: {len(response_data['results'])}", file=sys.stderr, flush=True)
        logger.info(f"Preparing response with {len(response_data['results'])} result(s)")
        
        # Force flush all output before returning
        sys.stderr.flush()
        sys.stdout.flush()
        
        print(f"[VERIFY_FACE] ===== RETURNING RESPONSE NOW =====", file=sys.stderr, flush=True)
        logger.info("Returning response to client")
        
        return response_data
    except HTTPException:
        print(f"[VERIFY_FACE] HTTPException raised, re-raising", file=sys.stderr, flush=True)
        raise
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"[VERIFY_FACE] EXCEPTION: {str(e)}", file=sys.stderr, flush=True)
        print(f"[VERIFY_FACE] TRACEBACK:\n{error_trace}", file=sys.stderr, flush=True)
        logger.error(f"Unexpected error in verify_face endpoint: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=get_friendly_error_message("generic_error", str(e)))
    finally:
        for p in temp_paths + preprocessed_paths:
            if p and os.path.exists(p):
                try:
                    os.remove(p)
                except Exception:
                    pass 