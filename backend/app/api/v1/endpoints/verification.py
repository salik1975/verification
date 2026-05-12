"""
Verification API endpoints
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from typing import Dict, Any, Optional
import json
import os
import logging
from datetime import datetime

from app.verification.verification_manager import VerificationManager
from app.core.config import settings

router = APIRouter()
logger = logging.getLogger("uvicorn.error")

# Initialize verification manager
verification_manager = VerificationManager()

@router.post("/verify-bank-statement")
async def verify_bank_statement(
    file: UploadFile = File(...),
    session_id: str = Form(None),
    analysis_data: str = Form(None)
):
    """
    Verify bank statement with all available checks
    
    Args:
        file: PDF file to verify
        session_id: Session identifier
        analysis_data: JSON string containing bank statement analysis data
        
    Returns:
        Dict containing verification results
    """
    try:
        # Validate file type
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files are supported")
        
        # Read file bytes
        file_bytes = await file.read()
        
        # Parse analysis data if provided
        transactions = None
        if analysis_data:
            try:
                analysis_json = json.loads(analysis_data)
                transactions = analysis_json.get('transactions', [])
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid analysis_data JSON format")
        
        # Run all verifications
        verification_results = verification_manager.run_all_verifications(
            file_bytes=file_bytes,
            transactions=transactions,
            session_id=session_id
        )
        
        return {
            "status": "success",
            "message": "Verification completed",
            "data": verification_results
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Verification failed: {str(e)}")

@router.post("/verify-pdf-integrity")
async def verify_pdf_integrity(
    file: UploadFile = File(...)
):
    """
    Verify PDF integrity only
    
    Args:
        file: PDF file to verify
        
    Returns:
        Dict containing PDF integrity verification results
    """
    try:
        # Validate file type
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files are supported")
        
        # Read file bytes
        file_bytes = await file.read()
        
        # Run PDF integrity check
        result = verification_manager.run_single_verification(
            'pdf_integrity',
            {'file_bytes': file_bytes}
        )
        
        if result is None:
            raise HTTPException(status_code=500, detail="PDF integrity check failed")
        
        return {
            "status": "success",
            "message": "PDF integrity verification completed",
            "data": {
                "check_name": result.check_name,
                "passed": result.passed,
                "confidence": result.confidence,
                "details": result.details,
                "issues": result.issues,
                "processing_time": result.processing_time,
                "timestamp": result.timestamp.isoformat()
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF integrity verification failed: {str(e)}")

@router.post("/verify-ofac")
async def verify_ofac(
    transactions: str = Form(...)
):
    """
    Verify transactions against OFAC sanctions list
    
    Args:
        transactions: JSON string containing transactions data
        
    Returns:
        Dict containing OFAC verification results
    """
    try:
        # Parse transactions data
        try:
            transactions_data = json.loads(transactions)
            if not isinstance(transactions_data, list):
                raise ValueError("Transactions must be a list")
        except (json.JSONDecodeError, ValueError) as e:
            raise HTTPException(status_code=400, detail=f"Invalid transactions format: {str(e)}")
        
        # Run OFAC check
        result = verification_manager.run_single_verification(
            'ofac_check',
            {'transactions': transactions_data}
        )
        
        if result is None:
            raise HTTPException(status_code=500, detail="OFAC check failed")
        
        return {
            "status": "success",
            "message": "OFAC verification completed",
            "data": {
                "check_name": result.check_name,
                "passed": result.passed,
                "confidence": result.confidence,
                "details": result.details,
                "issues": result.issues,
                "processing_time": result.processing_time,
                "timestamp": result.timestamp.isoformat()
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OFAC verification failed: {str(e)}")

@router.post("/verify-fraud")
async def verify_fraud(
    transactions: str = Form(...)
):
    """
    Run fraud detection on transactions
    
    Args:
        transactions: JSON string containing transactions data
        
    Returns:
        Dict containing fraud detection results
    """
    try:
        # Parse transactions data
        try:
            transactions_data = json.loads(transactions)
            if not isinstance(transactions_data, list):
                raise ValueError("Transactions must be a list")
        except (json.JSONDecodeError, ValueError) as e:
            raise HTTPException(status_code=400, detail=f"Invalid transactions format: {str(e)}")
        
        # Run fraud detection
        result = verification_manager.run_single_verification(
            'fraud_detection',
            {'transactions': transactions_data}
        )
        
        if result is None:
            raise HTTPException(status_code=500, detail="Fraud detection failed")
        
        return {
            "status": "success",
            "message": "Fraud detection completed",
            "data": {
                "check_name": result.check_name,
                "passed": result.passed,
                "confidence": result.confidence,
                "details": result.details,
                "issues": result.issues,
                "processing_time": result.processing_time,
                "timestamp": result.timestamp.isoformat()
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fraud detection failed: {str(e)}")

@router.get("/verification-status")
async def get_verification_status():
    """
    Get available verification checks and their status
    
    Returns:
        Dict containing available verification checks
    """
    try:
        available_checks = verification_manager.get_available_checks()
        
        return {
            "status": "success",
            "message": "Verification status retrieved",
            "data": {
                "available_checks": available_checks,
                "total_checks": len(available_checks),
                "timestamp": datetime.now().isoformat()
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get verification status: {str(e)}")

@router.post("/test-verification")
async def test_verification():
    """
    Test verification system with sample data
    """
    try:
        # Sample transaction data for testing
        sample_transactions = [
            {
                'transactionIndex': 0,
                'date': {'value': '2024-01-01'},
                'description': {'value': 'Test transaction'},
                'depositAmount': {'value': 100.0},
                'withdrawalAmount': {'value': 0}
            }
        ]
        
        # Run verification with sample data
        verification_results = verification_manager.run_all_verifications(
            transactions=sample_transactions
        )
        
        return {
            "status": "success",
            "message": "Verification test completed",
            "results": verification_results
        }
        
    except Exception as e:
        import traceback
        return {
            "status": "error",
            "message": f"Verification test failed: {str(e)}",
            "error_type": type(e).__name__,
            "traceback": traceback.format_exc()
        }