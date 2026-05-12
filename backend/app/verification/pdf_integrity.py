"""
PDF Integrity Checker for Bank Statement Verification
"""

import os
import hashlib
import time
from typing import Dict, Any, List
import pikepdf
from pikepdf import PasswordError, PdfError
from PyPDF2 import PdfReader
from .base import BaseVerification, VerificationResult

class PDFIntegrityChecker(BaseVerification):
    """PDF integrity verification using the existing pdf_integrity_check.py logic"""
    
    def __init__(self):
        super().__init__("PDF Integrity Check")
    
    def verify(self, data: Dict[str, Any], **kwargs) -> VerificationResult:
        """
        Verify PDF integrity
        
        Args:
            data: Should contain 'file_path' or 'file_bytes'
            **kwargs: Additional parameters
        """
        start_time = time.time()
        
        try:
            # Get file path or file bytes
            file_path = data.get('file_path')
            file_bytes = data.get('file_bytes')
            
            if not file_path and not file_bytes:
                self.logger.error("PDF Integrity Check: No file path or file bytes provided")
                return self._create_result(
                    passed=False,
                    confidence=0.0,
                    details={},
                    issues=["No file path or file bytes provided"],
                    processing_time=time.time() - start_time
                )
            
            self.logger.info("PDF Integrity Check: Starting PDF integrity verification")
            
            # If we have file bytes, write to temporary file
            temp_file = None
            if file_bytes and not file_path:
                import tempfile
                self.logger.debug("PDF Integrity Check: Creating temporary file from file bytes")
                temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
                temp_file.write(file_bytes)
                temp_file.close()
                file_path = temp_file.name
                self.logger.debug(f"PDF Integrity Check: Temporary file created: {file_path}")
            
            # Perform integrity checks
            integrity_result = self._check_pdf_integrity(file_path)
            
            # Clean up temp file if created
            if temp_file and os.path.exists(temp_file.name):
                os.unlink(temp_file.name)
                self.logger.debug("PDF Integrity Check: Temporary file cleaned up")
            
            processing_time = time.time() - start_time
            
            # Log final result
            if integrity_result['passed']:
                self.logger.info(f"PDF Integrity Check: PASSED - No integrity issues detected (Confidence: {integrity_result['confidence']:.2f})")
            else:
                self.logger.warning(f"PDF Integrity Check: FAILED - {len(integrity_result['issues'])} issues found (Confidence: {integrity_result['confidence']:.2f})")
                for issue in integrity_result['issues']:
                    self.logger.warning(f"  - {issue}")
            
            return self._create_result(
                passed=integrity_result['passed'],
                confidence=integrity_result['confidence'],
                details=integrity_result['details'],
                issues=integrity_result['issues'],
                processing_time=processing_time
            )
            
        except Exception as e:
            self.logger.error(f"PDF integrity check failed: {str(e)}")
            return self._create_result(
                passed=False,
                confidence=0.0,
                details={'error': str(e)},
                issues=[f"PDF integrity check failed: {str(e)}"],
                processing_time=time.time() - start_time
            )
    
    def _check_pdf_integrity(self, file_path: str) -> Dict[str, Any]:
        """Main integrity check function adapted from pdf_integrity_check.py"""
        all_checks_passed = True
        total_issues = []
        details = {}
        
        self.logger.info(f"Starting PDF integrity check for: {file_path}")
        
        # 1. File existence and basic validation
        if not os.path.exists(file_path):
            self.logger.error(f"PDF file does not exist: {file_path}")
            return {
                'passed': False,
                'confidence': 0.0,
                'details': {'error': 'File does not exist'},
                'issues': ['File does not exist']
            }
        
        # Check file extension
        if not file_path.lower().endswith('.pdf'):
            self.logger.warning(f"File does not have .pdf extension: {file_path}")
            # Don't fail the check, just log a warning
        
        # 2. File size check
        size_ok, size_msg = self._check_file_size(file_path)
        details['file_size'] = size_msg
        self.logger.info(f"File size check: {size_msg} (passed: {size_ok})")
        if not size_ok:
            all_checks_passed = False
            total_issues.append(size_msg)
        
        # 3. PDF signature check
        sig_ok, sig_msg = self._check_pdf_signature(file_path)
        details['pdf_signature'] = sig_msg
        self.logger.info(f"PDF signature check: {sig_msg} (passed: {sig_ok})")
        if not sig_ok:
            all_checks_passed = False
            total_issues.append(sig_msg)
        
        # 4. Structure integrity check
        struct_ok, struct_issues = self._check_pdf_structure(file_path)
        details['structure_check'] = 'passed' if struct_ok else 'failed'
        self.logger.info(f"Structure check: {'passed' if struct_ok else 'failed'} - Issues: {struct_issues}")
        if not struct_ok:
            all_checks_passed = False
            total_issues.extend(struct_issues)
        
        # 5. Metadata check
        meta_ok, meta_issues = self._check_metadata_integrity(file_path)
        details['metadata_check'] = 'passed' if meta_ok else 'failed'
        self.logger.info(f"Metadata check: {'passed' if meta_ok else 'failed'} - Issues: {meta_issues}")
        if not meta_ok:
            all_checks_passed = False
            total_issues.extend(meta_issues)
        
        # 6. Xref integrity check
        xref_ok, xref_issues = self._check_xref_integrity(file_path)
        details['xref_check'] = 'passed' if xref_ok else 'failed'
        self.logger.info(f"Xref check: {'passed' if xref_ok else 'failed'} - Issues: {xref_issues}")
        if not xref_ok:
            all_checks_passed = False
            total_issues.extend(xref_issues)
        
        # 7. File hash
        file_hash = self._check_file_hash(file_path)
        details['file_hash'] = file_hash
        
        # Calculate confidence based on checks passed
        total_checks = 5  # size, signature, structure, metadata, xref
        passed_checks = sum([size_ok, sig_ok, struct_ok, meta_ok, xref_ok])
        confidence = passed_checks / total_checks
        
        self.logger.info(f"PDF integrity check completed - Passed: {all_checks_passed}, Confidence: {confidence:.2f}, Issues: {total_issues}")
        
        return {
            'passed': all_checks_passed,  # Use strict check like original script
            'confidence': confidence,
            'details': details,
            'issues': total_issues
        }
    
    def _check_file_size(self, path: str) -> tuple[bool, str]:
        """Check if file size is reasonable"""
        try:
            size = os.path.getsize(path)
            if size == 0:
                return False, "File is empty"
            elif size < 100:  # PDFs should be at least 100 bytes
                return False, f"File too small ({size} bytes) - likely corrupted"
            return True, f"File size: {size:,} bytes"
        except Exception as e:
            return False, f"Size check failed: {e}"
    
    def _check_pdf_signature(self, path: str) -> tuple[bool, str]:
        """Check if file has proper PDF signature"""
        try:
            with open(path, "rb") as f:
                header = f.read(8)
                if not header.startswith(b"%PDF-"):
                    return False, "Invalid PDF signature"
                version = header.decode('ascii', errors='ignore')
                return True, f"PDF version: {version}"
        except Exception as e:
            return False, f"Failed to read PDF signature: {e}"
    
    def _check_pdf_structure(self, path: str) -> tuple[bool, List[str]]:
        """Check basic PDF structure integrity"""
        issues = []
        try:
            with open(path, "rb") as f:
                data = f.read()
            
            # Check for proper start
            if not data.startswith(b"%PDF-"):
                issues.append("Missing PDF header")
            
            # Check for proper end
            if not data.rstrip().endswith(b"%%EOF"):
                issues.append("Missing or malformed EOF marker")
            
            # Count EOF markers
            eof_count = data.count(b"%%EOF")
            if eof_count == 0:
                issues.append("No EOF markers found")
            elif eof_count > 1:
                issues.append(f"Multiple EOF markers ({eof_count}) - possible incremental updates")
            
            # Check for startxref
            startxref_pos = data.rfind(b"startxref")
            if startxref_pos == -1:
                issues.append("Missing startxref")
            
            return len(issues) == 0, issues
            
        except Exception as e:
            return False, [f"Structure check failed: {e}"]
    
    def _check_metadata_integrity(self, path: str) -> tuple[bool, List[str]]:
        """Check PDF metadata for inconsistencies"""
        issues = []
        try:
            reader = PdfReader(path)
            info = reader.metadata
            
            if not info:
                issues.append("No metadata found")
                return True, issues  # Pass the check but log the issue (matches original)
            
            # Check creation vs modification dates
            if "/CreationDate" in info and "/ModDate" in info:
                creation_date = info["/CreationDate"]
                mod_date = info["/ModDate"]
                if creation_date != mod_date:
                    issues.append(f"CreationDate != ModDate - possible modification (Created: {creation_date}, Modified: {mod_date})")
            
            # Check for suspicious metadata
            if "/Producer" in info:
                producer = str(info["/Producer"])
                if any(suspicious in producer.lower() for suspicious in ["hack", "crack", "modify"]):
                    issues.append("Suspicious producer metadata")
            
            return len(issues) == 0, issues
            
        except Exception as e:
            return False, [f"Metadata check failed: {e}"]
    
    def _check_xref_integrity(self, path: str) -> tuple[bool, List[str]]:
        """Check cross-reference table integrity"""
        try:
            with pikepdf.open(path) as pdf:
                # Basic xref validation by attempting to access pages
                page_count = len(pdf.pages)
                if page_count == 0:
                    return False, ["No pages found in PDF"]
                return True, [f"Xref integrity OK - {page_count} pages"]
        except PasswordError:
            return False, ["PDF is password protected - cannot verify xref integrity"]
        except PdfError as e:
            return False, [f"PDF parsing error: {e}"]
        except Exception as e:
            return False, [f"Xref integrity check failed: {e}"]
    
    def _check_file_hash(self, path: str) -> str:
        """Calculate file hash for integrity verification"""
        try:
            h = hashlib.sha256()
            with open(path, "rb") as f:
                for chunk in iter(lambda: f.read(4096), b""):
                    h.update(chunk)
            return h.hexdigest()
        except Exception as e:
            return f"Hash calculation failed: {e}"
