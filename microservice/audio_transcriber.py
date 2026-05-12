import os
import sys
import whisper
import tempfile
import subprocess
import logging
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

class AudioTranscriber:
    def __init__(self, model_size="base"):
        """
        Initializes the AudioTranscriber with a specified Whisper model size.
        The Whisper model is preloaded during initialization.
        """
        # Add ffmpeg directory to PATH for whisper
        ffmpeg_path = os.getenv('FFMPEG_PATH', '')
        if ffmpeg_path and ffmpeg_path not in os.environ["PATH"]:
            os.environ["PATH"] += os.pathsep + ffmpeg_path
            logger.info(f"Added FFmpeg path to PATH: {ffmpeg_path}")

        self._check_ffmpeg()

        logger.info(f"Loading Whisper model: {model_size}")
        self.model = whisper.load_model(model_size)

    def _check_ffmpeg(self):
        """
        Checks if ffmpeg is installed and accessible in PATH.
        """
        try:
            kwargs = {"capture_output": True, "check": True}
            if sys.platform == "win32":
                kwargs["creationflags"] = subprocess.CREATE_NO_WINDOW
            subprocess.run(["ffmpeg", "-version"], **kwargs)
        except (subprocess.CalledProcessError, FileNotFoundError):
            raise RuntimeError("ffmpeg is not installed or not found in PATH. Please install ffmpeg to process video files.")

    def transcribe(self, audio_source):
        """
        Transcribe audio from a file path or byte content using the preloaded Whisper model
        and return the transcribed text as a string.
        
        Args:
            audio_source (str or bytes): Path to the audio/video file or the audio file content as bytes.
        
        Returns:
            str: Transcribed text
        """
        temp_audio_file_obj = None
        audio_to_transcribe_path = None
        
        try:
            if isinstance(audio_source, bytes):
                # If audio_source is bytes, write it to a temporary file
                temp_audio_file_obj = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
                temp_audio_file_obj.write(audio_source)
                temp_audio_file_obj.close()
                audio_file_path = temp_audio_file_obj.name
                logger.debug(f"Transcribing from temporary byte file: {audio_file_path}")
            elif isinstance(audio_source, str):
                # If audio_source is a string, treat it as a file path
                audio_file_path = audio_source
                if not os.path.exists(audio_file_path):
                    raise FileNotFoundError(f"Audio file not found: {audio_file_path}")
                logger.debug(f"Transcribing from file path: {audio_file_path}")
            else:
                raise TypeError("audio_source must be a file path (str) or file content (bytes).")

            file_extension = Path(audio_file_path).suffix.lower()

            # Check if it's a video file that needs audio extraction
            if file_extension in ['.webm', '.mp4', '.avi', '.mov', '.mkv']:
                logger.debug(f"Extracting audio from video file: {audio_file_path} (first 10 seconds)")
                temp_audio_file_obj = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
                audio_to_transcribe_path = temp_audio_file_obj.name
                temp_audio_file_obj.close()

                command = [
                    "ffmpeg",
                    "-y",  # Overwrite output files without asking
                    "-ss", "0",  # Seek to the beginning
                    "-t", "10",  # Extract only the first 10 seconds
                    "-i", audio_file_path,
                    "-vn",  # No video
                    "-acodec", "pcm_s16le", # PCM 16-bit little-endian audio codec
                    "-ar", "16000", # Audio sample rate
                    "-ac", "1", # Mono audio
                    audio_to_transcribe_path
                ]

                kwargs = {"check": True, "stdout": subprocess.DEVNULL, "stderr": subprocess.DEVNULL, "timeout": 60}
                if sys.platform == "win32":
                    kwargs["creationflags"] = subprocess.CREATE_NO_WINDOW
                subprocess.run(command, **kwargs)

                if not os.path.exists(audio_to_transcribe_path):
                    raise RuntimeError(f"FFmpeg command completed, but temporary audio file was not created at {audio_to_transcribe_path}")
                logger.debug(f"Audio extracted to: {audio_to_transcribe_path}")
            else:
                audio_to_transcribe_path = audio_file_path

            logger.debug(f"Transcribing: {audio_to_transcribe_path}")
            # Transcribe the audio
            result = self.model.transcribe(audio_to_transcribe_path)

            return result["text"]

        finally:
            # Clean up temporary file if it exists
            if temp_audio_file_obj and os.path.exists(temp_audio_file_obj.name):
                os.remove(temp_audio_file_obj.name)
                logger.debug(f"Cleaned up temporary audio file: {temp_audio_file_obj.name}")
            if audio_to_transcribe_path and audio_to_transcribe_path != audio_file_path and os.path.exists(audio_to_transcribe_path):
                os.remove(audio_to_transcribe_path)
                logger.debug(f"Cleaned up temporary extracted audio file: {audio_to_transcribe_path}")