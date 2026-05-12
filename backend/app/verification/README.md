# Bank Statement Verification System

## Overview
Comprehensive verification system for bank statement analysis with 3 main check categories.

## Check Categories

### 1. PDF Integrity Check
**Purpose**: Validates PDF document authenticity and structural integrity

**How:**:
- Structure integrity check (validates %%EOF markers, startxref, proper start/end)
- Metadata integrity check (compares CreationDate vs ModDate, checks for suspicious producer)
- File size validation (checks if file is empty or too small <100 bytes)
- PDF signature verification (validates %PDF- header and version)
- Cross-reference table validation (validates page access and xref integrity)

### 2. OFAC Sanctions Check
**Purpose**: Screens transactions against OFAC sanctions list for compliance

**How:**:
- Fuzzy matching with confidence scoring (SequenceMatcher similarity)
- Embedding-based semantic matching (ultra-fast cosine similarity with sentence-transformers)

### 3. Fraud Detection
**Purpose**: Identifies suspicious transaction patterns and potential fraud

**How:**:
- Rules-based detection (13 fraud rules):
  - Credit/debit reconciliation (checks if credits + debits = final balance)
  - Suspicious merchants (gambling, crypto)
  - Large amounts >3σ from mean
  - Micro-transactions <$10 (structuring)
  - High-frequency payments to same recipient
  - Large withdrawals >$25000
  - Round-trip transactions (deposit + withdrawal same day)
  - Same-day multiple large transactions
- ML anomaly detection using Isolation Forest (flags unusual transaction amounts with 10% contamination)
- Statistical profiling analysis (calculates mean, median, std dev for amount thresholds)
- Hybrid scoring system (normalizes fraud scores 0-1, flags if score ≥0.3)