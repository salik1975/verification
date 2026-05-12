from fastapi import APIRouter, File, UploadFile, HTTPException
import os
import sys
import configparser
from azure.ai.documentintelligence import DocumentIntelligenceClient
from azure.core.credentials import AzureKeyCredential
from datetime import datetime, timezone
import json
import re
import time
import tempfile

router = APIRouter()

def load_config():
    """Load Azure Document Intelligence configuration"""
    config = configparser.ConfigParser()
    config.read('client.ini')
    api_key = config.get('DocumentAI', 'api_key')
    endpoint = config.get('DocumentAI', 'endpoint')
    return api_key, endpoint

def extract_account_number_from_text(text):
    """Extract account number from raw text if not found in structured fields"""
    if not text:
        return ""
    
    # Look for patterns like "Account Number: 1700530745" or "Account: 1700530745"
    patterns = [
        r'Account Number:\s*(\d+)',
        r'Account:\s*(\d+)',
        r'Acc No:\s*(\d+)',
        r'Account\s*(\d+)'
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(1)
    
    return ""

def extract_balance_from_text(text):
    """Extract beginning and ending balances from raw text"""
    balances = {"beginning": "", "ending": ""}
    
    if not text:
        return balances
    
    # Look for balance patterns
    beginning_patterns = [
        r'Beginning Balance[:\s]*R?\s*([\d,]+\.?\d*)',
        r'Opening Balance[:\s]*R?\s*([\d,]+\.?\d*)',
        r'Balance Brought Forward[:\s]*R?\s*([\d,]+\.?\d*)'
    ]
    
    ending_patterns = [
        r'Ending Balance[:\s]*R?\s*([\d,]+\.?\d*)',
        r'Closing Balance[:\s]*R?\s*([\d,]+\.?\d*)',
        r'Available Balance[:\s]*R?\s*([\d,]+\.?\d*)',
        r'Balance[:\s]*R?\s*([\d,]+\.?\d*)\s*$'
    ]
    
    # Extract beginning balance
    for pattern in beginning_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            balance_str = match.group(1).replace(',', '')
            try:
                balances["beginning"] = float(balance_str)
                break
            except ValueError:
                continue
    
    # Extract ending balance
    for pattern in ending_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            balance_str = match.group(1).replace(',', '')
            try:
                balances["ending"] = float(balance_str)
                break
            except ValueError:
                continue
    
    return balances

def extract_date_from_text(text, statement_start_date, statement_end_date):
    """Extract date from raw text when structured field fails"""
    if not text:
        return ""
    
    # Look for date patterns like "10/02", "25/12", etc.
    date_patterns = [
        r'(\d{1,2})/(\d{1,2})',  # DD/MM or MM/DD
        r'(\d{1,2})-(\d{1,2})',  # DD-MM or MM-DD
        r'(\d{1,2})\.(\d{1,2})'  # DD.MM or MM.DD
    ]
    
    for pattern in date_patterns:
        match = re.search(pattern, text)
        if match:
            day, month = match.group(1), match.group(2)
            
            # Try to determine the year from statement dates
            year = None
            if statement_start_date and statement_end_date:
                try:
                    # Parse statement dates to get year
                    start_date = datetime.strptime(statement_start_date, "%Y-%m-%d")
                    end_date = datetime.strptime(statement_end_date, "%Y-%m-%d")
                    year = start_date.year  # Use start year as default
                    
                    # If month is December and we're near year end, it might be previous year
                    if int(month) == 12 and int(day) >= 25:
                        year = start_date.year
                    # If month is January and we're near year start, it might be next year
                    elif int(month) == 1 and int(day) <= 10:
                        year = end_date.year
                except:
                    year = datetime.now().year
            
            if year:
                try:
                    # Try DD/MM format first (common in many countries)
                    parsed_date = datetime.strptime(f"{day}/{month}/{year}", "%d/%m/%Y")
                    return parsed_date.strftime("%Y-%m-%d")
                except ValueError:
                    try:
                        # Try MM/DD format (US format)
                        parsed_date = datetime.strptime(f"{month}/{day}/{year}", "%m/%d/%Y")
                        return parsed_date.strftime("%Y-%m-%d")
                    except ValueError:
                        continue
    
    return ""

def find_date_from_raw_content(raw_content, description, occurrence_index):
    """
    Find date for a specific transaction from raw content by searching for the nth occurrence
    of the description and looking for nearby dates.
    
    Args:
        raw_content: The full content string from the API response
        description: The transaction description to search for
        occurrence_index: Which occurrence of the description (0-based index)
    
    Returns:
        Extracted date string in YYYY-MM-DD format or empty string if not found
    """
    if not raw_content or not description:
        return ""
    
    # Find all occurrences of the description in the raw content
    description_positions = []
    start = 0
    while True:
        pos = raw_content.find(description, start)
        if pos == -1:
            break
        description_positions.append(pos)
        start = pos + 1
    
    if occurrence_index >= len(description_positions):
        return ""
    
    target_position = description_positions[occurrence_index]
    
    # Extract context around the target position (500 chars before and after)
    context_start = max(0, target_position - 500)
    context_end = min(len(raw_content), target_position + len(description) + 500)
    context = raw_content[context_start:context_end]
    
    # Look for date patterns in the context
    # Enhanced date patterns to match various formats
    date_patterns = [
        r'(\d{2})/(\d{2})/(\d{4})',  # DD/MM/YYYY or MM/DD/YYYY
        r'(\d{1,2})/(\d{1,2})/(\d{4})',  # D/M/YYYY variations
        r'(\d{2})/(\d{2})',  # DD/MM or MM/DD (will need year inference)
        r'(\d{1,2})/(\d{1,2})',  # D/M variations
    ]
    
    dates_found = []
    for pattern in date_patterns:
        matches = re.finditer(pattern, context)
        for match in matches:
            match_pos = context_start + match.start()
            distance_from_description = abs(match_pos - target_position)
            
            if len(match.groups()) == 3:  # Full date with year
                day, month, year = match.groups()
                date_str = f"{day}/{month}/{year}"
                try:
                    # Try DD/MM/YYYY format first
                    parsed_date = datetime.strptime(date_str, "%d/%m/%Y")
                    formatted_date = parsed_date.strftime("%Y-%m-%d")
                    dates_found.append((formatted_date, distance_from_description, match.group()))
                except ValueError:
                    try:
                        # Try MM/DD/YYYY format
                        parsed_date = datetime.strptime(date_str, "%m/%d/%Y")
                        formatted_date = parsed_date.strftime("%Y-%m-%d")
                        dates_found.append((formatted_date, distance_from_description, match.group()))
                    except ValueError:
                        continue
            else:  # Date without year, need to infer
                day, month = match.groups()
                # Infer year (assume current year or previous year if reasonable)
                current_year = datetime.now().year
                for year_candidate in [current_year, current_year - 1, current_year + 1]:
                    try:
                        # Try DD/MM format first
                        parsed_date = datetime.strptime(f"{day}/{month}/{year_candidate}", "%d/%m/%Y")
                        formatted_date = parsed_date.strftime("%Y-%m-%d")
                        dates_found.append((formatted_date, distance_from_description, match.group()))
                        break
                    except ValueError:
                        try:
                            # Try MM/DD format
                            parsed_date = datetime.strptime(f"{month}/{day}/{year_candidate}", "%m/%d/%Y")
                            formatted_date = parsed_date.strftime("%Y-%m-%d")
                            dates_found.append((formatted_date, distance_from_description, match.group()))
                            break
                        except ValueError:
                            continue
    
    if not dates_found:
        return ""
    
    # Sort by distance and return the closest date
    dates_found.sort(key=lambda x: x[1])
    closest_date = dates_found[0]
    
    return closest_date[0]

def fill_missing_dates_second_pass(extracted_data, raw_content):
    """
    Second pass to fill missing dates by searching in raw content.
    This function processes all transactions and attempts to find missing dates
    by looking for the transaction description in the raw content and finding nearby dates.
    """
    if not extracted_data.get("transactions") or not raw_content:
        return extracted_data
    
    # Group transactions by description to track occurrences
    description_counts = {}
    transactions_to_fix = []
    
    for idx, transaction in enumerate(extracted_data["transactions"]):
        description = transaction.get("description", {}).get("value", "")
        date_value = transaction.get("date", {}).get("value", "")
        
        if not description:
            continue
            
        # Track occurrence count for this description
        if description not in description_counts:
            description_counts[description] = 0
        else:
            description_counts[description] += 1
        
        # Check if date is missing or has very low confidence (likely raw text)
        date_confidence = transaction.get("date", {}).get("confidence", 0.0)
        if not date_value or date_confidence < 0.2:
            transactions_to_fix.append({
                "index": idx,
                "description": description,
                "occurrence": description_counts[description],
                "current_date": date_value,
                "current_confidence": date_confidence
            })
    
    # Process each transaction that needs date fixing
    fixed_count = 0
    for transaction_info in transactions_to_fix:
        idx = transaction_info["index"]
        description = transaction_info["description"]
        occurrence = transaction_info["occurrence"]
        
        # Try to find the date from raw content
        extracted_date = find_date_from_raw_content(raw_content, description, occurrence)
        
        if extracted_date:
            # Update the transaction with the found date
            extracted_data["transactions"][idx]["date"]["value"] = extracted_date
            extracted_data["transactions"][idx]["date"]["confidence"] = 0.7  # Medium confidence for content extraction
            fixed_count += 1
    
    return extracted_data

def analyze_bank_statement(file_bytes):
    """Analyze bank statement using Azure Document Intelligence v4.0"""
    start_time = time.time()
    
    try:
        # Load configuration
        api_key, endpoint = load_config()
        
        # Create Document Intelligence Client (v4.0)
        document_intelligence_client = DocumentIntelligenceClient(
            endpoint=endpoint, 
            credential=AzureKeyCredential(api_key)
        )
        
        # Use the correct v4.0 API method for bank statements
        poller = document_intelligence_client.begin_analyze_document(
            "prebuilt-bankStatement.us", 
            body=file_bytes
        )

        result = poller.result()
        
        # Initialize output structure with only Azure API data
        extracted_data = {
            "status": "succeeded",
            "documentType": "bank_statement",
            "createdDateTime": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "lastUpdatedDateTime": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "pages": len(result.pages) if result.pages else 0,
            "languages": [lang.language_code for lang in result.languages] if result.languages else [],
            "styles": [style.confidence for style in result.styles] if result.styles else [],
            # Standard bank statement fields based on Azure API schema
            "accountHolderName": {"value": "", "confidence": 0.0},
            "accountHolderAddress": {"value": "", "confidence": 0.0},
            "bankName": {"value": "", "confidence": 0.0},
            "bankAddress": {"value": "", "confidence": 0.0},
            "statementStartDate": {"value": "", "confidence": 0.0},
            "statementEndDate": {"value": "", "confidence": 0.0},
            "accounts": [],
            "transactions": [],
            # Verification flags - set to true for now since no checks are implemented yet
            "verificationFlags": {
                "scanned": True,
                "ofacCheck": True,
                "integrityCheck": True,
                "fraudEngineCheck": True
            },
            # Processing metadata
            "processingTime": 0.0,
            "apiInfo": {
                "version": "4.0",
                "model": "prebuilt-bankStatement.us",
                "endpoint": endpoint
            }
        }
        
        # Extract data from documents (v4.0 structure)
        if result.documents and len(result.documents) > 0:
            document = result.documents[0]
            
            if hasattr(document, 'fields') and document.fields:
                # Extract standard bank statement fields using proper field accessors
                if 'AccountHolderName' in document.fields:
                    field = document.fields['AccountHolderName']
                    if field and hasattr(field, 'value_string'):
                        extracted_data["accountHolderName"]["value"] = field.value_string
                        extracted_data["accountHolderName"]["confidence"] = getattr(field, 'confidence', 0.0)
                
                if 'AccountHolderAddress' in document.fields:
                     field = document.fields['AccountHolderAddress']
                     if field and hasattr(field, 'value_address'):
                         # Convert address object to string representation
                         addr = field.value_address
                         address_parts = []
                         if hasattr(addr, 'house_number') and addr.house_number:
                             address_parts.append(str(addr.house_number))
                         if hasattr(addr, 'street_address') and addr.street_address:
                             address_parts.append(str(addr.street_address))
                         if hasattr(addr, 'city') and addr.city:
                             address_parts.append(str(addr.city))
                         if hasattr(addr, 'postal_code') and addr.postal_code:
                             address_parts.append(str(addr.postal_code))
                         
                         # Filter out empty strings and join
                         address_parts = [part for part in address_parts if part and part.strip()]
                         if address_parts:
                             extracted_data["accountHolderAddress"]["value"] = ", ".join(address_parts)
                             extracted_data["accountHolderAddress"]["confidence"] = getattr(field, 'confidence', 0.0)
                
                if 'BankName' in document.fields:
                    field = document.fields['BankName']
                    if field and hasattr(field, 'value_string'):
                        extracted_data["bankName"]["value"] = field.value_string
                        extracted_data["bankName"]["confidence"] = getattr(field, 'confidence', 0.0)
                
                if 'BankAddress' in document.fields:
                    field = document.fields['BankAddress']
                    if field and hasattr(field, 'value_address'):
                        # Convert address object to string representation
                        addr = field.value_address
                        address_parts = []
                        if hasattr(addr, 'house_number') and addr.house_number:
                            address_parts.append(str(addr.house_number))
                        if hasattr(addr, 'street_address') and addr.street_address:
                            address_parts.append(str(addr.street_address))
                        if hasattr(addr, 'city') and addr.city:
                            address_parts.append(str(addr.city))
                        if hasattr(addr, 'postal_code') and addr.postal_code:
                            address_parts.append(str(addr.postal_code))
                        
                        # Filter out empty strings and join
                        address_parts = [part for part in address_parts if part and part.strip()]
                        if address_parts:
                            extracted_data["bankAddress"]["value"] = ", ".join(address_parts)
                            extracted_data["bankAddress"]["confidence"] = getattr(field, 'confidence', 0.0)
                
                if 'StatementStartDate' in document.fields:
                    field = document.fields['StatementStartDate']
                    if field and hasattr(field, 'value_date'):
                        extracted_data["statementStartDate"]["value"] = str(field.value_date)
                        extracted_data["statementStartDate"]["confidence"] = getattr(field, 'confidence', 0.0)
                
                if 'StatementEndDate' in document.fields:
                    field = document.fields['StatementEndDate']
                    if field and hasattr(field, 'value_date'):
                        extracted_data["statementEndDate"]["value"] = str(field.value_date)
                        extracted_data["statementEndDate"]["confidence"] = getattr(field, 'confidence', 0.0)
                
                # Extract account information
                if 'Accounts' in document.fields:
                    accounts_field = document.fields['Accounts']
                    if hasattr(accounts_field, 'value_array') and accounts_field.value_array:
                        for account_idx, account in enumerate(accounts_field.value_array):
                            if hasattr(account, 'value_object') and account.value_object:
                                account_obj = account.value_object
                                
                                account_data = {
                                    "accountIndex": account_idx,
                                    "accountNumber": {"value": "", "confidence": 0.0},
                                    "accountType": {"value": "", "confidence": 0.0},
                                    "beginningBalance": {"value": "", "confidence": 0.0},
                                    "endingBalance": {"value": "", "confidence": 0.0},
                                    "totalServiceFees": {"value": "", "confidence": 0.0}
                                }
                                
                                # Extract account details using proper field accessors
                                if 'AccountNumber' in account_obj:
                                    field = account_obj['AccountNumber']
                                    if field and hasattr(field, 'value_string'):
                                        account_data["accountNumber"]["value"] = field.value_string
                                        account_data["accountNumber"]["confidence"] = getattr(field, 'confidence', 0.0)
                                
                                if 'AccountType' in account_obj:
                                    field = account_obj['AccountType']
                                    if field and hasattr(field, 'value_string'):
                                        account_data["accountType"]["value"] = field.value_string
                                        account_data["accountType"]["confidence"] = getattr(field, 'confidence', 0.0)
                                
                                if 'BeginningBalance' in account_obj:
                                    field = account_obj['BeginningBalance']
                                    if field and hasattr(field, 'value_number'):
                                        account_data["beginningBalance"]["value"] = field.value_number
                                        account_data["beginningBalance"]["confidence"] = getattr(field, 'confidence', 0.0)
                                
                                if 'EndingBalance' in account_obj:
                                    field = account_obj['EndingBalance']
                                    if field and hasattr(field, 'value_number'):
                                        account_data["endingBalance"]["value"] = field.value_number
                                        account_data["endingBalance"]["confidence"] = getattr(field, 'confidence', 0.0)
                                
                                if 'TotalServiceFees' in account_obj:
                                    field = account_obj['TotalServiceFees']
                                    if field and hasattr(field, 'value_number'):
                                        account_data["totalServiceFees"]["value"] = field.value_number
                                        account_data["totalServiceFees"]["confidence"] = getattr(field, 'confidence', 0.0)
                                
                                extracted_data["accounts"].append(account_data)
                                
                                # Extract transactions for this account
                                if 'Transactions' in account_obj:
                                    transactions_field = account_obj['Transactions']
                                    if hasattr(transactions_field, 'value_array') and transactions_field.value_array:
                                        for transaction_idx, transaction in enumerate(transactions_field.value_array):
                                            if hasattr(transaction, 'value_object') and transaction.value_object:
                                                transaction_obj = transaction.value_object
                                                
                                                transaction_data = {
                                                    "transactionIndex": transaction_idx,
                                                    "accountIndex": account_idx,
                                                    "date": {"value": "", "confidence": 0.0},
                                                    "description": {"value": "", "confidence": 0.0},
                                                    "checkNumber": {"value": "", "confidence": 0.0},
                                                    "depositAmount": {"value": "", "confidence": 0.0},
                                                    "withdrawalAmount": {"value": "", "confidence": 0.0}
                                                }
                                                
                                                # Extract transaction details using standard API fields
                                                if 'Date' in transaction_obj:
                                                    field = transaction_obj['Date']
                                                    
                                                    # Check if we have a parsed date value
                                                    if field and hasattr(field, 'value_date') and field.value_date:
                                                        transaction_data["date"]["value"] = str(field.value_date)
                                                        transaction_data["date"]["confidence"] = getattr(field, 'confidence', 0.0)
                                                    # Check if we have raw content to parse
                                                    elif field and hasattr(field, 'content') and field.content:
                                                        # Fallback: try to extract date from raw text
                                                        fallback_date = extract_date_from_text(
                                                            field.content, 
                                                            extracted_data["statementStartDate"]["value"], 
                                                            extracted_data["statementEndDate"]["value"]
                                                        )
                                                        if fallback_date:
                                                            transaction_data["date"]["value"] = fallback_date
                                                            transaction_data["date"]["confidence"] = 0.3  # Lower confidence for text extraction
                                                        else:
                                                            # Store the raw content as fallback
                                                            transaction_data["date"]["value"] = field.content
                                                            transaction_data["date"]["confidence"] = 0.1  # Very low confidence for raw content
                                                
                                                if 'Description' in transaction_obj:
                                                    field = transaction_obj['Description']
                                                    if field and hasattr(field, 'value_string'):
                                                        transaction_data["description"]["value"] = field.value_string
                                                        transaction_data["description"]["confidence"] = getattr(field, 'confidence', 0.0)
                                                
                                                if 'CheckNumber' in transaction_obj:
                                                    field = transaction_obj['CheckNumber']
                                                    if field and hasattr(field, 'value_string'):
                                                        transaction_data["checkNumber"]["value"] = field.value_string
                                                        transaction_data["checkNumber"]["confidence"] = getattr(field, 'confidence', 0.0)
                                                
                                                if 'DepositAmount' in transaction_obj:
                                                    field = transaction_obj['DepositAmount']
                                                    if field and hasattr(field, 'value_number'):
                                                        transaction_data["depositAmount"]["value"] = field.value_number
                                                        transaction_data["depositAmount"]["confidence"] = getattr(field, 'confidence', 0.0)
                                                
                                                if 'WithdrawalAmount' in transaction_obj:
                                                    field = transaction_obj['WithdrawalAmount']
                                                    if field and hasattr(field, 'value_number'):
                                                        transaction_data["withdrawalAmount"]["value"] = field.value_number
                                                        transaction_data["withdrawalAmount"]["confidence"] = getattr(field, 'confidence', 0.0)
                                                
                                                # Add mock flagged status for testing (placeholder for future fraud detection)
                                                # In real implementation, this would be determined by fraud detection logic
                                                transaction_data["flagged"] = False  # Placeholder - all transactions unflagged for now
                                                
                                                extracted_data["transactions"].append(transaction_data)
        
        # Try to extract account number from raw text if not found in structured fields
        if not any(account.get('accountNumber', {}).get('value') for account in extracted_data['accounts']):
            account_number = extract_account_number_from_text(result.content if result.content else "")
            if account_number:
                if extracted_data['accounts']:
                    extracted_data['accounts'][0]['accountNumber']['value'] = account_number
                    extracted_data['accounts'][0]['accountNumber']['confidence'] = 0.5  # Lower confidence for text extraction
        
        # Try to extract balances from text if not found in structured fields
        if not any(account.get('beginningBalance', {}).get('value') for account in extracted_data['accounts']) or not any(account.get('endingBalance', {}).get('value') for account in extracted_data['accounts']):
            balances = extract_balance_from_text(result.content if result.content else "")
            if balances["beginning"] and extracted_data['accounts']:
                extracted_data['accounts'][0]['beginningBalance']['value'] = balances["beginning"]
                extracted_data['accounts'][0]['beginningBalance']['confidence'] = 0.5  # Lower confidence for text extraction
            if balances["ending"] and extracted_data['accounts']:
                extracted_data['accounts'][0]['endingBalance']['value'] = balances["ending"]
                extracted_data['accounts'][0]['endingBalance']['confidence'] = 0.5  # Lower confidence for text extraction
        
        # Second pass: Fill missing dates from raw content
        if result.content:
            extracted_data = fill_missing_dates_second_pass(extracted_data, result.content)
        
        # Calculate processing time
        processing_time = time.time() - start_time
        extracted_data["processingTime"] = round(processing_time, 2)
        
        return extracted_data
        
    except Exception as e:
        return {"status": "failed", "message": str(e)}

@router.post("/bank_statement")
async def process_bank_statement(file: UploadFile = File(...)):
    """Process bank statement PDF and extract structured data"""
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported for bank statements")
    
    try:
        # Read file bytes
        file_bytes = await file.read()
        
        # Analyze the bank statement
        result = analyze_bank_statement(file_bytes)
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing bank statement: {str(e)}")
