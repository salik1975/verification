import logging
import os
import json
import pyodbc
from fastapi import APIRouter, Request, HTTPException, status
from app.core.config import settings

router = APIRouter(tags=["criticalfield"])

logger = logging.getLogger("uvicorn.error")

def _get_connection():
    connection_string = (
        f"DRIVER={{ODBC Driver 18 for SQL Server}};"
        f"SERVER={settings.DB_SERVER};"
        f"DATABASE={settings.DB_NAME};"
        f"UID={settings.DB_USER};"
        f"PWD={settings.DB_PASSWORD};"
        "TrustServerCertificate=yes;"
        "Connection Timeout=20;"
    )
    return pyodbc.connect(connection_string)

@router.post("/displaycriticalfield")
async def display_critical_field(request: Request):
    try:
        body = await request.json()
        document_type = body.get("documentType")
        if not document_type:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing 'documentType' in request body"
            )
        conn = _get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT Id, DocumentType
            FROM DocumentType
            WHERE DocumentType = ?
            """,
            document_type
        )
        doc_type_row = cursor.fetchone()
        if not doc_type_row:
            conn.close()
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="DocumentType not found"
            )
        document_type_id = doc_type_row.Id
        cursor.execute(
            """
            SELECT FieldKey, FieldLabelToDisplay, Weightage
            FROM DocumentDetail
            WHERE DocId = ? AND isCritical = 1
            """,
            document_type_id
        )
        rows = cursor.fetchall()
        critical_fields = [
            {"FieldKey": r.FieldKey,
             "FieldLabelToDisplay": r.FieldLabelToDisplay,
             "Weightage": r.Weightage}
            for r in rows
        ]
        conn.close()
        return {
            "status": "success",
            "documentType": document_type,
            "data": critical_fields,
            "count": len(critical_fields)
        }
    except Exception as e:
        logger.error(f"❌ DB Fetch Failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch critical field information"
        )

@router.get("/fetchconfidencecode")
async def fetch_confidence_code():
    try:
        conn = _get_connection()
        cursor = conn.cursor()
        query = """
        SELECT FromConfidence, ToConfidence, ConfidenceColorCode,
               BoxBorderColorHex, BoxBorderColorTailwind, HoverDescription
        FROM ConfidenceColor
        ORDER BY FromConfidence
        """
        cursor.execute(query)
        rows = cursor.fetchall()
        confidence_ranges = [
            {
                "fromconfidence": r.FromConfidence,
                "toconfidence": r.ToConfidence,
                "colorcodetailwind": r.BoxBorderColorTailwind,
                "colorcode_hex": r.BoxBorderColorHex,
                "hoverDescription": r.HoverDescription
            }
            for r in rows
        ]
        conn.close()
        return {
            "status": "success",
            "data": confidence_ranges,
            "count": len(confidence_ranges)
        }
    except Exception as e:
        logger.error(f"❌ DB Fetch Failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch confidence color ranges"
        )
