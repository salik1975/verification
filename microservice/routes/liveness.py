from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from utils import transcriber, face_mesh, expected_phrase, expected_phrases, PHRASE_MATCH_THRESHOLD, DETECTOR_BACKEND, LIVENESS_HEAD_MOVEMENT_THRESHOLD, LIVENESS_VERTICAL_MOVEMENT_THRESHOLD
from deepface import DeepFace
import tempfile
import os
import cv2
import base64
import Levenshtein
import re
import numpy as np
import logging
import asyncio
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger(__name__)
router = APIRouter()

# Load parallel processing configuration
LIVENESS_PARALLEL_PROCESSING = os.getenv('LIVENESS_PARALLEL_PROCESSING', 'true').lower() in ('true', '1', 'yes')
liveness_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="liveness_worker")

if LIVENESS_PARALLEL_PROCESSING:
    logger.info("Liveness parallel processing: ENABLED (face extraction + audio transcription run in parallel)")
else:
    logger.info("Liveness parallel processing: DISABLED (sequential processing)")

@router.post("/api/liveness")
async def liveness_check(video: UploadFile = File(...), session_id: str = Form(None)):
    temp_video_path = None
    cap = None
    try:
        # Validate video file size
        content = await video.read()
        if len(content) < 1024:  # Minimum 1KB
            raise HTTPException(status_code=400, detail="Video file is too small or corrupted")
        
        suffix = os.path.splitext(video.filename)[1] or ".webm"
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as temp_file:
            temp_video_path = temp_file.name
        with open(temp_video_path, "wb") as f:
            f.write(content)
        
        # Validate video file can be opened
        cap = cv2.VideoCapture(temp_video_path)
        if not cap.isOpened():
            raise HTTPException(status_code=400, detail="Invalid video file format or corrupted file")
        nose_x = []
        head_ok = False
        THRESH = LIVENESS_HEAD_MOVEMENT_THRESHOLD
        MIN_FRMS = 10
        nose_y = []
        vertical_ok = False
        VERTICAL_THRESH = LIVENESS_VERTICAL_MOVEMENT_THRESHOLD
        all_frames = []
        captured_frames_indices = []
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            all_frames.append(frame)
        total_frames = len(all_frames)
        if total_frames == 0:
            raise HTTPException(status_code=400, detail="Video contains no frames")

        # Calculate FPS and video duration
        fps = cap.get(cv2.CAP_PROP_FPS)
        if fps is None or fps <= 0 or fps > 240:
            logger.warning(f"Invalid FPS value: {fps}. Using default 30 fps.")
            fps = 30.0

        video_duration = total_frames / fps

        # Frame capture strategy: Priority to 3s, 6s, 9s timestamps
        if video_duration >= 10:
            # For 10s+ videos: 3s, 6s, 9s, 1.5s, 4.5s
            target_timestamps = [3.0, 6.0, 9.0, 1.5, 4.5]
        elif video_duration >= 6:
            # For 6-10s videos: 3s, 6s, and distribute remaining
            target_timestamps = [3.0, 6.0, video_duration * 0.25, video_duration * 0.75, video_duration * 0.95]
        elif video_duration >= 3:
            # For 3-6s videos: 3s and distribute evenly
            target_timestamps = [3.0, video_duration * 0.2, video_duration * 0.5, video_duration * 0.8, video_duration * 0.95]
        else:
            # For <3s videos: Distribute evenly
            target_timestamps = [video_duration * i / 5 for i in range(1, 6)]

        # Convert timestamps to frame indices
        def timestamp_to_frame(timestamp):
            frame_idx = int(timestamp * fps)
            return max(0, min(frame_idx, total_frames - 1))

        target_frame_indices = [timestamp_to_frame(ts) for ts in target_timestamps]

        # Remove duplicates while preserving order
        seen = set()
        captured_frames_indices = []
        frame_to_timestamp = {}
        for ts, idx in zip(target_timestamps, target_frame_indices):
            if idx not in seen:
                seen.add(idx)
                captured_frames_indices.append(idx)
                frame_to_timestamp[idx] = ts

        import sys
        print(f"[LIVENESS] Video: duration={video_duration:.2f}s, fps={fps:.1f}, total_frames={total_frames}", file=sys.stderr, flush=True)
        print(f"[LIVENESS] Capturing {len(captured_frames_indices)} frames at timestamps:", file=sys.stderr, flush=True)
        for idx in captured_frames_indices:
            print(f"[LIVENESS]   - {frame_to_timestamp[idx]:.2f}s (frame {idx})", file=sys.stderr, flush=True)

        logger.info(f"Video: duration={video_duration:.2f}s, fps={fps:.1f}, total_frames={total_frames}")
        logger.info(f"Capturing {len(captured_frames_indices)} frames at timestamps: {[f'{frame_to_timestamp[idx]:.2f}s (frame {idx})' for idx in captured_frames_indices]}")

        # Start audio transcription in parallel (if enabled)
        import time
        face_extraction_start = time.time()
        audio_task = None
        if LIVENESS_PARALLEL_PROCESSING:
            logger.debug("Starting audio transcription in parallel with face extraction")
            loop = asyncio.get_event_loop()
            audio_task = loop.run_in_executor(
                liveness_executor,
                transcriber.transcribe,
                temp_video_path
            )

        # Face extraction with retry logic
        captured_faces = []
        for i, frame in enumerate(all_frames):
            # MediaPipe for head movement detection
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            res = face_mesh.process(rgb)
            if res.multi_face_landmarks:
                lm = res.multi_face_landmarks[0].landmark

                # Track both horizontal and vertical movement
                nose_x.append(lm[1].x)
                nose_y.append(lm[1].y)

                # Check horizontal movement
                if not head_ok and len(nose_x) >= MIN_FRMS and (max(nose_x) - min(nose_x) > THRESH):
                    head_ok = True
                    nose_range = max(nose_x) - min(nose_x)
                    logger.info(f"Horizontal head movement detected at frame {i}: nose_x range={nose_range:.4f} (threshold={THRESH}, frames={len(nose_x)})")
                    print(f"[LIVENESS] Horizontal movement detected at frame {i} (range={nose_range:.4f})", file=sys.stderr, flush=True)

                # Check vertical movement (nodding)
                if not vertical_ok and len(nose_y) >= MIN_FRMS and (max(nose_y) - min(nose_y) > VERTICAL_THRESH):
                    vertical_ok = True
                    vertical_range = max(nose_y) - min(nose_y)
                    logger.info(f"Vertical head movement detected at frame {i}: nose_y range={vertical_range:.4f} (threshold={VERTICAL_THRESH}, frames={len(nose_y)})")
                    print(f"[LIVENESS] Vertical movement detected at frame {i} (range={vertical_range:.4f})", file=sys.stderr, flush=True)

            # Extract faces from priority frames
            if i in captured_frames_indices:
                face_extracted = False
                retry_offsets = [0, 3, 6]  # Try current frame, +3 frames, +6 frames

                for offset in retry_offsets:
                    retry_frame_idx = i + offset
                    if retry_frame_idx >= total_frames:
                        break

                    retry_frame = all_frames[retry_frame_idx]

                    try:
                        rgb_frame = cv2.cvtColor(retry_frame, cv2.COLOR_BGR2RGB)
                        faces = DeepFace.extract_faces(
                            rgb_frame,
                            detector_backend=DETECTOR_BACKEND,
                            enforce_detection=True  # Raises exception if no face (handled by retry)
                        )

                        if faces and len(faces) > 0:
                            face_img = faces[0]["face"]
                            if face_img.dtype != np.uint8:
                                face_img = (face_img * 255).clip(0, 255).astype(np.uint8)
                            _, buffer = cv2.imencode('.jpg', face_img)
                            img_b64 = base64.b64encode(buffer).decode("utf-8")
                            captured_faces.append(f"data:image/jpeg;base64,{img_b64}")
                            face_extracted = True

                            image_num = len(captured_faces)
                            timestamp = frame_to_timestamp.get(i, 0.0)
                            offset_str = f' +{offset} offset' if offset > 0 else ''
                            print(f"[LIVENESS]   Captured image{image_num} from {timestamp:.2f}s (frame {retry_frame_idx}){offset_str}", file=sys.stderr, flush=True)
                            logger.info(f"  Captured image{image_num} from {timestamp:.2f}s (frame {retry_frame_idx}){offset_str}")
                            break
                    except Exception as e:
                        logger.debug(f"Face extraction failed for frame {retry_frame_idx}: {str(e)}")
                        continue

                if not face_extracted:
                    logger.warning(f"No face detected at frame {i} after {len(retry_offsets)} attempts")

        # Validate that at least some faces were extracted
        if len(captured_faces) == 0:
            logger.warning(f"No faces extracted from {len(captured_frames_indices)} priority frames after retry attempts")
            if head_ok:
                logger.warning("Head movement detected but no faces extracted - possible video quality issue")

        # Log horizontal movement status
        if not head_ok and len(nose_x) > 0:
            nose_range = max(nose_x) - min(nose_x)
            logger.warning(f"Horizontal movement NOT detected: nose_x range={nose_range:.4f} (threshold={THRESH}, frames={len(nose_x)})")
            print(f"[LIVENESS] Horizontal movement NOT detected: range={nose_range:.4f} < threshold {THRESH}", file=sys.stderr, flush=True)

        # Log vertical movement status
        if not vertical_ok and len(nose_y) > 0:
            vertical_range = max(nose_y) - min(nose_y)
            logger.warning(f"Vertical movement NOT detected: nose_y range={vertical_range:.4f} (threshold={VERTICAL_THRESH}, frames={len(nose_y)})")
            print(f"[LIVENESS] Vertical movement NOT detected: range={vertical_range:.4f} < threshold {VERTICAL_THRESH}", file=sys.stderr, flush=True)

        face_extraction_time = time.time() - face_extraction_start
        print(f"[LIVENESS] Face extraction completed in {face_extraction_time:.2f}s", file=sys.stderr, flush=True)
        logger.debug(f"Face extraction completed in {face_extraction_time:.2f}s")

        # Audio transcription (parallel or sequential based on config)
        audio_start = time.time()
        if LIVENESS_PARALLEL_PROCESSING and audio_task:
            logger.debug("Waiting for parallel audio transcription to complete")
            try:
                audio_transcript = await audio_task
            except Exception as e:
                logger.error(f"Parallel audio transcription failed: {str(e)}")
                audio_transcript = ""
        else:
            logger.debug("Running audio transcription sequentially")
            try:
                audio_transcript = transcriber.transcribe(temp_video_path)
            except Exception as e:
                logger.error(f"Audio transcription failed: {str(e)}")
                audio_transcript = ""

        audio_time = time.time() - audio_start

        # Detect suspiciously short transcriptions (likely audio failure)
        if audio_transcript and len(audio_transcript.strip()) < 10:
            logger.warning(f"Audio transcription suspiciously short ({len(audio_transcript.strip())} chars): '{audio_transcript}' - possible audio quality/volume issue")
            print(f"[LIVENESS] WARNING: Audio transcription very short ({len(audio_transcript.strip())} chars) - check microphone volume/quality", file=sys.stderr, flush=True)

        if LIVENESS_PARALLEL_PROCESSING and audio_task:
            total_time = max(face_extraction_time, audio_time)
            print(f"[LIVENESS] Audio transcription completed in {audio_time:.2f}s (parallel)", file=sys.stderr, flush=True)
            print(f"[LIVENESS] Total processing time: {total_time:.2f}s (Face={face_extraction_time:.2f}s, Audio={audio_time:.2f}s overlapped)", file=sys.stderr, flush=True)
            logger.debug(f"Audio transcription completed in {audio_time:.2f}s (parallel - actual time: ~{total_time:.2f}s)")
            logger.info(f"Liveness processing: Face={face_extraction_time:.2f}s, Audio={audio_time:.2f}s (overlapped), Total={total_time:.2f}s")
        else:
            total_time = face_extraction_time + audio_time
            print(f"[LIVENESS] Audio transcription completed in {audio_time:.2f}s (sequential)", file=sys.stderr, flush=True)
            print(f"[LIVENESS] Total processing time: {total_time:.2f}s (Face={face_extraction_time:.2f}s + Audio={audio_time:.2f}s)", file=sys.stderr, flush=True)
            logger.debug(f"Audio transcription completed in {audio_time:.2f}s (sequential)")
            logger.info(f"Liveness processing: Face={face_extraction_time:.2f}s, Audio={audio_time:.2f}s, Total={total_time:.2f}s")

        # Get the expected phrase for this session
        current_expected_phrase = expected_phrase  # fallback to global
        if session_id and session_id in expected_phrases:
            current_expected_phrase = expected_phrases[session_id]
            logger.debug(f"Using session-specific phrase for {session_id}")
        else:
            logger.debug(f"No session-specific phrase found, using global")

        normalized_audio_transcript = re.sub(r'[^a-zA-Z0-9]', '', audio_transcript).lower()
        normalized_expected_phrase = re.sub(r'[^a-zA-Z0-9]', '', current_expected_phrase).lower()
        distance = Levenshtein.distance(normalized_expected_phrase, normalized_audio_transcript)
        max_len = max(len(normalized_expected_phrase), 1)
        distance_ratio = distance / max_len
        phrase_match = distance_ratio <= PHRASE_MATCH_THRESHOLD

        import sys
        print(f"[LIVENESS] ===== PHRASE VERIFICATION =====", file=sys.stderr, flush=True)
        print(f"[LIVENESS]   Expected phrase:  '{current_expected_phrase}'", file=sys.stderr, flush=True)
        print(f"[LIVENESS]   Extracted phrase: '{audio_transcript}'", file=sys.stderr, flush=True)
        print(f"[LIVENESS]   Levenshtein distance: {distance} (ratio: {distance_ratio:.3f}, threshold: {PHRASE_MATCH_THRESHOLD})", file=sys.stderr, flush=True)
        print(f"[LIVENESS]   Result: {'MATCH' if phrase_match else 'NO MATCH'}", file=sys.stderr, flush=True)

        logger.info(f"Phrase verification:")
        logger.info(f"  Expected phrase:  '{current_expected_phrase}'")
        logger.info(f"  Extracted phrase: '{audio_transcript}'")
        logger.info(f"  Levenshtein distance: {distance} (ratio: {distance_ratio:.3f}, threshold: {PHRASE_MATCH_THRESHOLD})")
        logger.info(f"  Result: {'MATCH' if phrase_match else 'NO MATCH'}")

        # Determine failure reasons
        failure_reasons = []
        if not head_ok:
            failure_reasons.append("Please turn your head left and right during the recording")
        if not vertical_ok:
            failure_reasons.append("Please nod your head up and down during the recording")
        if not phrase_match:
            failure_reasons.append("Please speak the phrase clearly and loudly")
        if len(captured_faces) == 0:
            failure_reasons.append("Please ensure your face is clearly visible with good lighting")

        response_data = {
            "success": head_ok and vertical_ok and phrase_match,
            "head_movement": head_ok,
            "vertical_movement": vertical_ok,
            "initial_frame_data": captured_faces,
            "total_frames": total_frames,
            "captured_count": len(captured_faces),
            "message": "Liveness check completed" if (head_ok and vertical_ok and phrase_match) else "Liveness check failed",
            "phrase_match": phrase_match,
            "failure_reasons": failure_reasons
        }

        print(f"[LIVENESS] ===== FINAL RESULT =====", file=sys.stderr, flush=True)
        print(f"[LIVENESS]   Horizontal movement: {'DETECTED' if head_ok else 'NOT DETECTED'}", file=sys.stderr, flush=True)
        print(f"[LIVENESS]   Vertical movement: {'DETECTED' if vertical_ok else 'NOT DETECTED'}", file=sys.stderr, flush=True)
        print(f"[LIVENESS]   Phrase match: {'MATCH' if phrase_match else 'NO MATCH'}", file=sys.stderr, flush=True)
        print(f"[LIVENESS]   Faces captured: {len(captured_faces)}/{len(captured_frames_indices)}", file=sys.stderr, flush=True)
        print(f"[LIVENESS]   Overall status: {'PASS' if head_ok and vertical_ok and phrase_match else 'FAIL'}", file=sys.stderr, flush=True)
        if failure_reasons:
            print(f"[LIVENESS]   Failure reason(s): {', '.join(failure_reasons)}", file=sys.stderr, flush=True)

        logger.info(f"Liveness check result:")
        logger.info(f"  Horizontal movement: {'DETECTED' if head_ok else 'NOT DETECTED'}")
        logger.info(f"  Vertical movement: {'DETECTED' if vertical_ok else 'NOT DETECTED'}")
        logger.info(f"  Phrase match: {'MATCH' if phrase_match else 'NO MATCH'}")
        logger.info(f"  Faces captured: {len(captured_faces)}/{len(captured_frames_indices)}")
        logger.info(f"  Overall: {'PASS' if head_ok and vertical_ok and phrase_match else 'FAIL'}")
        if failure_reasons:
            logger.info(f"  Failure reason(s): {', '.join(failure_reasons)}")

        return response_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process video: {str(e)}")
    finally:
        if cap:
            cap.release()
        cv2.destroyAllWindows()
        if temp_video_path and os.path.exists(temp_video_path):
            os.remove(temp_video_path) 