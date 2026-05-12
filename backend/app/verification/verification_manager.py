"""
Verification Manager - Orchestrates all verification checks
"""

import time
from typing import Dict, Any, List, Optional
from datetime import datetime
from .base import BaseVerification, VerificationResult

class VerificationManager:
    """Manages and orchestrates all verification checks"""
    
    def __init__(self):
        self.checkers = {}
        self.logger = __import__('logging').getLogger(__name__)
        self._initialize_checkers()
    
    def _initialize_checkers(self):
        """Initialize checkers with error handling"""
        # PDF Integrity Checker
        try:
            from .pdf_integrity import PDFIntegrityChecker
            self.checkers['pdf_integrity'] = PDFIntegrityChecker()
            self.logger.info("PDF Integrity Checker initialized successfully")
        except Exception as e:
            self.logger.error(f"Failed to initialize PDF Integrity Checker: {e}")
        
        # OFAC Checker
        try:
            from .ofac_checker import OFACChecker
            self.checkers['ofac_check'] = OFACChecker()
            self.logger.info("OFAC Checker initialized successfully")
        except Exception as e:
            self.logger.error(f"Failed to initialize OFAC Checker: {e}")
        
        # Fraud Detector
        try:
            from .fraud_detector import FraudDetector
            self.checkers['fraud_detection'] = FraudDetector()
            self.logger.info("Fraud Detector initialized successfully")
        except Exception as e:
            self.logger.error(f"Failed to initialize Fraud Detector: {e}")
    
    def run_all_verifications(self, 
                            file_path: str = None, 
                            file_bytes: bytes = None,
                            transactions: List[Dict] = None,
                            **kwargs) -> Dict[str, Any]:
        """
        Run all verification checks
        
        Args:
            file_path: Path to PDF file
            file_bytes: PDF file bytes
            transactions: List of transactions from bank statement analysis
            **kwargs: Additional parameters
            
        Returns:
            Dict containing results from all verification checks
        """
        start_time = time.time()
        results = {
            'verification_summary': {
                'total_checks': len(self.checkers),
                'passed_checks': 0,
                'failed_checks': 0,
                'overall_passed': True,
                'overall_confidence': 0.0,
                'processing_time': 0.0,
                'timestamp': datetime.now().isoformat()
            },
            'check_results': {},
            'verification_flags': {
                'scanned': False,
                'ofacCheck': False,
                'integrityCheck': False,
                'fraudEngineCheck': False
            },
            'flagged_transactions': {},  # Will store detailed flagged transaction info
            'flagging_summary': {
                'total_flagged': 0,
                'red_flagged': 0,  # Overall check failed
                'yellow_flagged': 0  # Individual transactions flagged but overall passed
            }
        }
        
        try:
            # Run PDF Integrity Check
            if file_path or file_bytes:
                try:
                    pdf_data = {'file_path': file_path, 'file_bytes': file_bytes}
                    pdf_result = self.checkers['pdf_integrity'].verify(pdf_data, **kwargs)
                    results['check_results']['pdf_integrity'] = pdf_result
                    results['verification_flags']['integrityCheck'] = pdf_result.passed
                    
                    if pdf_result.passed:
                        results['verification_summary']['passed_checks'] += 1
                    else:
                        results['verification_summary']['failed_checks'] += 1
                        results['verification_summary']['overall_passed'] = False
                        
                    self.logger.info(f"PDF Integrity Check: {'PASSED' if pdf_result.passed else 'FAILED'}")
                except Exception as e:
                    self.logger.error(f"PDF Integrity Check failed: {str(e)}")
                    results['verification_flags']['integrityCheck'] = False
                    results['verification_summary']['failed_checks'] += 1
                    results['verification_summary']['overall_passed'] = False
                    results['check_results']['pdf_integrity'] = {
                        'error': str(e),
                        'passed': False,
                        'confidence': 0.0
                    }
            
            # Run OFAC Check
            if transactions:
                try:
                    ofac_data = {'transactions': transactions}
                    ofac_result = self.checkers['ofac_check'].verify(ofac_data, **kwargs)
                    results['check_results']['ofac_check'] = ofac_result
                    results['verification_flags']['ofacCheck'] = ofac_result.passed
                    
                    if ofac_result.passed:
                        results['verification_summary']['passed_checks'] += 1
                    else:
                        results['verification_summary']['failed_checks'] += 1
                        results['verification_summary']['overall_passed'] = False
                        
                    self.logger.info(f"OFAC Check: {'PASSED' if ofac_result.passed else 'FAILED'}")
                except Exception as e:
                    self.logger.error(f"OFAC Check failed: {str(e)}")
                    results['verification_flags']['ofacCheck'] = False
                    results['verification_summary']['failed_checks'] += 1
                    results['verification_summary']['overall_passed'] = False
                    results['check_results']['ofac_check'] = {
                        'error': str(e),
                        'passed': False,
                        'confidence': 0.0
                    }
            
            # Run Fraud Detection
            if transactions:
                try:
                    fraud_data = {'transactions': transactions}
                    fraud_result = self.checkers['fraud_detection'].verify(fraud_data, **kwargs)
                    results['check_results']['fraud_detection'] = fraud_result
                    results['verification_flags']['fraudEngineCheck'] = fraud_result.passed
                    
                    if fraud_result.passed:
                        results['verification_summary']['passed_checks'] += 1
                    else:
                        results['verification_summary']['failed_checks'] += 1
                        results['verification_summary']['overall_passed'] = False
                        
                    self.logger.info(f"Fraud Detection: {'PASSED' if fraud_result.passed else 'FAILED'}")
                except Exception as e:
                    self.logger.error(f"Fraud Detection failed: {str(e)}")
                    results['verification_flags']['fraudEngineCheck'] = False
                    results['verification_summary']['failed_checks'] += 1
                    results['verification_summary']['overall_passed'] = False
                    results['check_results']['fraud_detection'] = {
                        'error': str(e),
                        'passed': False,
                        'confidence': 0.0
                    }
            
            # Set scanned flag to true if we have transactions (document was successfully processed)
            if transactions:
                results['verification_flags']['scanned'] = True
            
            # Calculate overall confidence
            confidences = []
            for check_result in results['check_results'].values():
                if isinstance(check_result, VerificationResult):
                    confidences.append(check_result.confidence)
            
            if confidences:
                results['verification_summary']['overall_confidence'] = sum(confidences) / len(confidences)
            
            # Process flagged transactions with severity levels
            self._process_flagged_transactions(results, transactions or [])
            
            # Calculate processing time
            results['verification_summary']['processing_time'] = time.time() - start_time
            
            self.logger.info(f"Verification completed in {results['verification_summary']['processing_time']:.2f}s")
            self.logger.info(f"Overall result: {'PASSED' if results['verification_summary']['overall_passed'] else 'FAILED'}")
            self.logger.info(f"Flagging summary: {results['flagging_summary']}")
            
        except Exception as e:
            self.logger.error(f"Verification failed: {str(e)}")
            results['verification_summary']['overall_passed'] = False
            results['verification_summary']['error'] = str(e)
            results['verification_summary']['processing_time'] = time.time() - start_time
        
        return results
    
    def run_single_verification(self, 
                              check_name: str, 
                              data: Dict[str, Any], 
                              **kwargs) -> Optional[VerificationResult]:
        """
        Run a single verification check
        
        Args:
            check_name: Name of the check to run
            data: Data for the verification
            **kwargs: Additional parameters
            
        Returns:
            VerificationResult or None if check not found
        """
        if check_name not in self.checkers:
            self.logger.error(f"Unknown verification check: {check_name}")
            return None
        
        try:
            return self.checkers[check_name].verify(data, **kwargs)
        except Exception as e:
            self.logger.error(f"Verification check '{check_name}' failed: {str(e)}")
            return None
    
    def get_available_checks(self) -> List[str]:
        """Get list of available verification checks"""
        return list(self.checkers.keys())
    
    def _process_flagged_transactions(self, results: Dict[str, Any], transactions: List[Dict]):
        """Process flagged transactions with severity levels and detailed reasons"""
        flagged_transactions = {}
        red_flagged = 0
        yellow_flagged = 0
        
        # Get check results
        ofac_result = results['check_results'].get('ofac_check')
        fraud_result = results['check_results'].get('fraud_detection')
        
        # Process OFAC flagged transactions
        if ofac_result and hasattr(ofac_result, 'details'):
            ofac_passed = ofac_result.passed
            matches = ofac_result.details.get('matches', [])
            
            for match in matches:
                txn_index = match.get('transaction_index')
                if txn_index is not None:
                    severity = 'red' if not ofac_passed else 'yellow'
                    
                    if txn_index not in flagged_transactions:
                        flagged_transactions[txn_index] = {
                            'severity': severity,
                            'reasons': [],
                            'modules': []
                        }
                    
                    # Determine severity (red takes precedence)
                    if severity == 'red' or flagged_transactions[txn_index]['severity'] != 'red':
                        flagged_transactions[txn_index]['severity'] = severity
                    
                    # Add OFAC reason
                    risk_score = match.get('risk_score', 0)
                    entity_text = match.get('entity_text', 'Unknown')
                    ofac_name = match.get('ofac_name', 'Unknown')
                    
                    reason = f"OFAC match: '{entity_text}' matches '{ofac_name}' (Risk: {risk_score:.2f})"
                    flagged_transactions[txn_index]['reasons'].append(reason)
                    if 'OFAC Check' not in flagged_transactions[txn_index]['modules']:
                        flagged_transactions[txn_index]['modules'].append('OFAC Check')
        
        # Process Fraud flagged transactions
        if fraud_result and hasattr(fraud_result, 'details'):
            fraud_passed = fraud_result.passed
            flagged_txns = fraud_result.details.get('flagged_transactions', [])
            
            for flagged_txn in flagged_txns:
                txn_index = flagged_txn.get('transactionIndex')
                if txn_index is not None:
                    severity = 'red' if not fraud_passed else 'yellow'
                    
                    if txn_index not in flagged_transactions:
                        flagged_transactions[txn_index] = {
                            'severity': severity,
                            'reasons': [],
                            'modules': []
                        }
                    
                    # Determine severity (red takes precedence)
                    if severity == 'red' or flagged_transactions[txn_index]['severity'] != 'red':
                        flagged_transactions[txn_index]['severity'] = severity
                    
                    # Add Fraud reasons
                    fraud_score = flagged_txn.get('fraud_score', 0)
                    reasons = flagged_txn.get('reasons', [])
                    
                    for reason in reasons:
                        full_reason = f"Fraud indicator: {reason} (Score: {fraud_score:.2f})"
                        flagged_transactions[txn_index]['reasons'].append(full_reason)
                    
                    if 'Fraud Detection' not in flagged_transactions[txn_index]['modules']:
                        flagged_transactions[txn_index]['modules'].append('Fraud Detection')
        
        # Count severity levels
        for txn_data in flagged_transactions.values():
            if txn_data['severity'] == 'red':
                red_flagged += 1
            else:
                yellow_flagged += 1
        
        # Update results
        results['flagged_transactions'] = flagged_transactions
        results['flagging_summary'] = {
            'total_flagged': len(flagged_transactions),
            'red_flagged': red_flagged,
            'yellow_flagged': yellow_flagged
        }
        
        self.logger.info(f"Processed flagged transactions: {len(flagged_transactions)} total, {red_flagged} red, {yellow_flagged} yellow")
    
    def get_verification_summary(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """Extract summary information from verification results"""
        summary = results.get('verification_summary', {})
        flags = results.get('verification_flags', {})
        
        return {
            'overall_status': 'PASSED' if summary.get('overall_passed', False) else 'FAILED',
            'confidence': summary.get('overall_confidence', 0.0),
            'processing_time': summary.get('processing_time', 0.0),
            'checks_passed': summary.get('passed_checks', 0),
            'checks_failed': summary.get('failed_checks', 0),
            'verification_flags': flags,
            'timestamp': summary.get('timestamp', datetime.now().isoformat())
        }
