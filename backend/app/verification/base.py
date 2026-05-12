"""
Base verification class for all verification components
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

@dataclass
class VerificationResult:
    """Standard result format for all verification checks"""
    check_name: str
    passed: bool
    confidence: float  # 0.0 to 1.0
    details: Dict[str, Any]
    issues: List[str]
    timestamp: datetime
    processing_time: float

class BaseVerification(ABC):
    """Abstract base class for all verification components"""
    
    def __init__(self, name: str):
        self.name = name
        self.logger = logging.getLogger(f"{__name__}.{name}")
    
    @abstractmethod
    def verify(self, data: Dict[str, Any], **kwargs) -> VerificationResult:
        """
        Perform verification check
        
        Args:
            data: Input data for verification
            **kwargs: Additional parameters specific to the verification type
            
        Returns:
            VerificationResult: Standardized result
        """
        pass
    
    def _create_result(self, 
                      passed: bool, 
                      confidence: float, 
                      details: Dict[str, Any], 
                      issues: List[str],
                      processing_time: float) -> VerificationResult:
        """Helper method to create standardized verification result"""
        return VerificationResult(
            check_name=self.name,
            passed=passed,
            confidence=confidence,
            details=details,
            issues=issues,
            timestamp=datetime.now(),
            processing_time=processing_time
        )
