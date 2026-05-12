"""
Fraud Detection Engine for Bank Statement Verification
"""

import time
import statistics
from typing import Dict, Any, List, Tuple
from collections import defaultdict, Counter
from datetime import datetime, timedelta
from .base import BaseVerification, VerificationResult

# Import ML libraries with error handling
try:
    import numpy as np
    from sklearn.ensemble import IsolationForest
    from sklearn.preprocessing import StandardScaler
    ML_AVAILABLE = True
except ImportError as e:
    ML_AVAILABLE = False
    import logging
    logger = logging.getLogger(__name__)
    logger.warning(f"ML libraries not available: {e}")

class FraudDetector(BaseVerification):
    """Fraud detection engine adapted from fraud_detection_engine.py"""
    
    def __init__(self):
        super().__init__("Fraud Detection")
        self.stage_results = {
            'rules_based': {'flagged': [], 'reasons': []},
            'ml_anomaly': {'flagged': [], 'reasons': []},
            'statistical_profiling': {'flagged': [], 'reasons': []},
            'hybrid_scoring': {'flagged': [], 'reasons': []}
        }
    
    def verify(self, data: Dict[str, Any], **kwargs) -> VerificationResult:
        """
        Run fraud detection on bank statement transactions
        
        Args:
            data: Should contain 'transactions' list
            **kwargs: Additional parameters
        """
        start_time = time.time()
        
        try:
            transactions = data.get('transactions', [])
            if not transactions:
                return self._create_result(
                    passed=True,  # No transactions to check
                    confidence=1.0,
                    details={'message': 'No transactions to check'},
                    issues=[],
                    processing_time=time.time() - start_time
                )
            
            # Run fraud detection stages
            stage1_results = self._stage1_rules_based_detection(transactions)
            stage2_results = self._stage2_ml_anomaly_detection(transactions)
            
            # Compile results from implemented stages
            all_flagged = []
            all_reasons = []
            
            all_flagged.extend(stage1_results['flagged'])
            all_flagged.extend(stage2_results['flagged'])
            all_reasons.extend(stage1_results['reasons'])
            all_reasons.extend(stage2_results['reasons'])
            
            # Remove duplicates based on transaction index
            unique_flagged = {}
            for flag in all_flagged:
                txn_idx = flag['transactionIndex']
                if txn_idx not in unique_flagged:
                    unique_flagged[txn_idx] = flag
                else:
                    # Merge reasons if same transaction flagged by multiple stages
                    existing_reasons = unique_flagged[txn_idx]['reasons']
                    new_reasons = flag['reasons']
                    unique_flagged[txn_idx]['reasons'] = existing_reasons + new_reasons
            
            final_flagged = list(unique_flagged.values())
            
            # Calculate fraud metrics
            total_transactions = len(transactions)
            flagged_count = len(final_flagged)
            fraud_percentage = (flagged_count / total_transactions * 100) if total_transactions > 0 else 0
            
            # Determine risk level
            if fraud_percentage > 20:
                risk_level = "HIGH"
            elif fraud_percentage > 10:
                risk_level = "MEDIUM"
            elif fraud_percentage > 5:
                risk_level = "LOW"
            else:
                risk_level = "MINIMAL"
            
            # Check passes if risk level is MINIMAL or LOW
            passed = risk_level in ["MINIMAL", "LOW"]
            
            # Calculate confidence based on fraud percentage
            confidence = max(0.0, 1.0 - (fraud_percentage / 100))
            
            details = {
                'total_transactions': total_transactions,
                'flagged_transactions': flagged_count,
                'fraud_percentage': round(fraud_percentage, 2),
                'risk_level': risk_level,
                'stage_results': {
                    'rules_based': {
                        'flagged_count': len(stage1_results['flagged']),
                        'flagged_transactions': stage1_results['flagged']
                    },
                    'ml_anomaly': {
                        'flagged_count': len(stage2_results['flagged']),
                        'flagged_transactions': stage2_results['flagged']
                    }
                },
                'flagged_transactions': final_flagged,
                'fraud_indicators': list(set(all_reasons))
            }
            
            issues = []
            if risk_level == "HIGH":
                issues.append(f"High fraud risk detected: {fraud_percentage:.1f}% of transactions flagged")
            elif risk_level == "MEDIUM":
                issues.append(f"Medium fraud risk detected: {fraud_percentage:.1f}% of transactions flagged")
            elif risk_level == "LOW":
                issues.append(f"Low fraud risk detected: {fraud_percentage:.1f}% of transactions flagged")
            
            processing_time = time.time() - start_time
            
            return self._create_result(
                passed=passed,
                confidence=confidence,
                details=details,
                issues=issues,
                processing_time=processing_time
            )
            
        except Exception as e:
            self.logger.error(f"Fraud detection failed: {str(e)}")
            return self._create_result(
                passed=False,
                confidence=0.0,
                details={'error': str(e)},
                issues=[f"Fraud detection failed: {str(e)}"],
                processing_time=time.time() - start_time
            )
    
    def _get_transaction_amount(self, transaction: Dict) -> float:
        """Extract transaction amount (positive for deposits, negative for withdrawals)"""
        deposit = transaction.get('depositAmount', {}).get('value', 0)
        withdrawal = transaction.get('withdrawalAmount', {}).get('value', 0)
        
        # Handle empty strings and None values
        if deposit == "" or deposit is None:
            deposit = 0
        if withdrawal == "" or withdrawal is None:
            withdrawal = 0
            
        # Deposits are positive, withdrawals are already negative in the data
        return float(deposit) if deposit != 0 else float(withdrawal)
    
    def _stage1_rules_based_detection(self, transactions: List[Dict]) -> Dict:
        """Stage 1: Rules-Based Fraud Detection"""
        flagged_transactions = []
        stage_reasons = []
        
        if not transactions:
            return {'flagged': flagged_transactions, 'reasons': stage_reasons}
        
        # Calculate statistics for rules
        amounts = []
        for txn in transactions:
            amount = self._get_transaction_amount(txn)
            if amount != 0:  # Exclude zero amounts
                amounts.append(abs(amount))
        
        if not amounts:
            return {'flagged': flagged_transactions, 'reasons': stage_reasons}
        
        avg_amount = statistics.mean(amounts)
        median_amount = statistics.median(amounts)
        std_amount = statistics.stdev(amounts) if len(amounts) > 1 else 0
        
        # Group transactions by date and account for analysis
        daily_transactions = defaultdict(list)
        account_transactions = defaultdict(list)
        for txn in transactions:
            date = txn.get('date', {}).get('value', '')
            account_idx = txn.get('accountIndex', 0)
            if date:
                daily_transactions[date].append(txn)
            account_transactions[account_idx].append(txn)
        
        # Rule weights (normalized 0-1 scale)
        rule_weights = {
            'large_amount': 0.8,
            'suspicious_merchant': 1.0,
            'structuring': 0.9,
            'round_trip': 1.0,
            'rtc_payment': 0.7,
            'savings_unlock': 0.8,
            'low_confidence': 0.2,
            'high_frequency': 0.6,
            'large_withdrawal': 0.7,
            'daily_large_burst': 0.6,
            'prepaid_purchase': 0.5,
            'round_numbers': 0.3,
            'very_low_confidence': 0.1
        }
        
        # Process each transaction
        for txn in transactions:
            amount = self._get_transaction_amount(txn)
            abs_amount = abs(amount)
            txn_index = txn.get('transactionIndex', 0)
            description = txn.get('description', {}).get('value', '')
            date = txn.get('date', {}).get('value', '')
            account_idx = txn.get('accountIndex', 0)
            deposit_amount = float(txn.get('depositAmount', {}).get('value', 0)) if txn.get('depositAmount', {}).get('value') else 0
            withdrawal_amount = float(txn.get('withdrawalAmount', {}).get('value', 0)) if txn.get('withdrawalAmount', {}).get('value') else 0
            
            reasons = []
            fraud_score = 0.0
            
            # Skip zero amounts
            if abs_amount == 0:
                continue
            
            # Rule 1: Large Amount Transactions (3+ standard deviations from mean)
            large_threshold = avg_amount + (3 * std_amount) if std_amount > 0 else avg_amount * 3
            if abs_amount > large_threshold:
                # Exclude legitimate large transactions
                legitimate_large_keywords = ['interest', 'salary', 'pension', 'bonus', 'refund', 'dividend']
                is_legitimate_large = any(keyword in description.lower() for keyword in legitimate_large_keywords)
                
                if not is_legitimate_large:
                    reasons.append(f"Large amount transaction ({abs_amount:.2f} > threshold {large_threshold:.2f})")
                    fraud_score += rule_weights['large_amount']
            
            # Rule 2: Suspicious Merchant Patterns
            suspicious_keywords = ['betway', 'lottostar', 'casino', 'gambling', 'crypto', 'bitcoin']
            if any(keyword in description.lower() for keyword in suspicious_keywords):
                reasons.append(f"Suspicious merchant detected: {description}")
                fraud_score += rule_weights['suspicious_merchant']
            
            # Rule 3: Micro-transactions (structuring detection)
            is_micro = abs_amount < 10
            if is_micro:
                # Exclude legitimate banking fees
                legitimate_fee_keywords = [
                    'admin fee', 'sms notification', 'payment fee', 'monthly', 
                    'service fee', 'maintenance fee', 'account fee', 'banking fee',
                    'notification fee', 'transaction fee', 'processing fee'
                ]
                
                is_legitimate_fee = any(keyword in description.lower() for keyword in legitimate_fee_keywords)
                
                if not is_legitimate_fee:
                    # Count similar descriptions for this account
                    same_desc_count = sum(1 for t in account_transactions[account_idx] 
                                        if t.get('description', {}).get('value', '').strip() == description.strip())
                    if same_desc_count >= 6:
                        reasons.append(f"Potential structuring: {same_desc_count} micro-transactions to same merchant")
                        fraud_score += rule_weights['structuring']
            
            # Rule 4: High-frequency payments to same recipient
            payment_freq = sum(1 for t in account_transactions[account_idx] 
                             if t.get('description', {}).get('value', '').strip() == description.strip())
            
            # Exclude legitimate recurring payments
            legitimate_recurring_keywords = [
                'admin fee', 'sms notification', 'payment fee', 'monthly', 
                'service fee', 'maintenance fee', 'account fee', 'banking fee',
                'interest', 'salary', 'pension', 'rent', 'insurance'
            ]
            
            is_legitimate_recurring = any(keyword in description.lower() for keyword in legitimate_recurring_keywords)
            
            if payment_freq >= 12 and not is_legitimate_recurring:
                reasons.append(f"High-frequency payments ({payment_freq}) to same recipient")
                fraud_score += rule_weights['high_frequency']
            
            # Rule 5: Large withdrawals (potential cash-out)
            if withdrawal_amount > 5000:
                reasons.append(f"Large withdrawal ({abs(withdrawal_amount):.2f})")
                fraud_score += rule_weights['large_withdrawal']
            
            # Rule 6: Round-trip transactions
            if deposit_amount > 0 and date:
                try:
                    txn_date = datetime.strptime(date, '%Y-%m-%d')
                    # Look for withdrawal on same day
                    same_day_withdrawals = [
                        t for t in daily_transactions[date]
                        if t.get('accountIndex') == account_idx and 
                        float(t.get('withdrawalAmount', {}).get('value', 0)) > 0
                    ]
                    if same_day_withdrawals:
                        reasons.append("Round-trip transaction: deposit followed by withdrawal same day")
                        fraud_score += rule_weights['round_trip']
                except:
                    pass
            
            # Rule 7: Same-day multiple large transactions
            if date:
                daily_large_count = sum(1 for t in daily_transactions[date] 
                                      if abs(self._get_transaction_amount(t)) > 1000)
                if daily_large_count >= 3:
                    reasons.append(f"Daily large transaction burst ({daily_large_count} large transactions)")
                    fraud_score += rule_weights['daily_large_burst']
            
            # Rule 8: Immediate Payment (RTC) transactions
            if 'RTC' in description.upper() or 'IMMEDIATE PAYMENT' in description.upper():
                reasons.append("High-risk immediate payment (RTC)")
                fraud_score += rule_weights['rtc_payment']
            
            # Rule 9: Prepaid mobile purchases
            if 'PREPAID' in description.upper():
                legitimate_prepaid_keywords = [
                    'mtn', 'vodacom', 'cell c', 'telkom', 'mobile', 'airtime', 
                    'top-up', 'topup', 'recharge', 'data bundle'
                ]
                
                is_legitimate_prepaid = any(keyword in description.lower() for keyword in legitimate_prepaid_keywords)
                
                if not is_legitimate_prepaid:
                    reasons.append("Suspicious prepaid purchase (potential laundering)")
                    fraud_score += rule_weights['prepaid_purchase']
            
            # Rule 10: Fixed term savings unlock
            if 'FIXED TERM' in description.upper() or 'SAVINGS.*UNLOCK' in description.upper():
                reasons.append("Unusual savings account unlock")
                fraud_score += rule_weights['savings_unlock']
            
            # Rule 11: Very low confidence transactions
            very_low_confidence_indicators = [
                'unkown', 'unclear', 'missing', 'unreadable', 'partial', 'corrupted', 'unknown'
            ]
            if any(indicator in description.lower() for indicator in very_low_confidence_indicators):
                reasons.append("Very low confidence transaction (poor OCR/description)")
                fraud_score += rule_weights['very_low_confidence']
            
            # Rule 12: Low confidence transactions
            low_confidence_indicators = [
                'tbd', 'pending', 'incomplete', 'unclear', '??????'
            ]
            if any(indicator in description.lower() for indicator in low_confidence_indicators):
                reasons.append("Low confidence transaction (unclear description)")
                fraud_score += rule_weights['low_confidence']
            
            # Rule 13: Round number transactions
            large_round_numbers = [5000, 10000, 20000, 50000, 100000]
            if abs_amount in large_round_numbers:
                reasons.append(f"Suspicious large round number transaction ({abs_amount:.2f})")
                fraud_score += rule_weights['round_numbers']
            
            # Normalize fraud score to 0-1 scale
            max_possible_score = sum(rule_weights.values())
            normalized_score = min(fraud_score / max_possible_score, 1.0) if max_possible_score > 0 else 0.0
            
            # Only flag if fraud score meets threshold and has reasons
            if reasons and normalized_score >= 0.3:
                flagged_transactions.append({
                    'transactionIndex': txn_index,
                    'date': date,
                    'description': description,
                    'amount': amount,
                    'reasons': reasons,
                    'fraud_score': round(normalized_score, 2),
                    'stage': 'rules_based'
                })
                stage_reasons.extend(reasons)
        
        # Sort by fraud score (highest first)
        flagged_transactions.sort(key=lambda x: x['fraud_score'], reverse=True)
        
        return {'flagged': flagged_transactions, 'reasons': stage_reasons}
    
    def _stage2_ml_anomaly_detection(self, transactions: List[Dict]) -> Dict:
        """Stage 2: ML Anomaly Detection using Isolation Forest"""
        flagged_transactions = []
        stage_reasons = []
        
        if not ML_AVAILABLE:
            self.logger.warning("ML libraries not available, skipping ML anomaly detection")
            return {'flagged': flagged_transactions, 'reasons': stage_reasons}
        
        try:
            # Check if we have enough transactions for ML
            if len(transactions) < 10:
                return {'flagged': flagged_transactions, 'reasons': stage_reasons}
            
            # Extract transaction amounts for ML analysis
            amounts = []
            for txn in transactions:
                deposit = float(txn.get('depositAmount', {}).get('value', 0)) if txn.get('depositAmount', {}).get('value') else 0
                withdrawal = float(txn.get('withdrawalAmount', {}).get('value', 0)) if txn.get('withdrawalAmount', {}).get('value') else 0
                net_amount = deposit - abs(withdrawal) if withdrawal else deposit
                amounts.append(abs(net_amount))  # Use absolute values for anomaly detection
            
            # Convert to numpy array and reshape for sklearn
            amounts_array = np.array(amounts).reshape(-1, 1)
            
            # Scale the features
            scaler = StandardScaler()
            amounts_scaled = scaler.fit_transform(amounts_array)
            
            # Train Isolation Forest model
            isolation_forest = IsolationForest(contamination=0.1, random_state=42)
            anomaly_labels = isolation_forest.fit_predict(amounts_scaled)
            anomaly_scores = isolation_forest.score_samples(amounts_scaled)
            
            # Normalize anomaly scores to 0-1 scale (lower scores = more anomalous)
            min_score = np.min(anomaly_scores)
            max_score = np.max(anomaly_scores)
            if max_score != min_score:
                normalized_scores = (anomaly_scores - min_score) / (max_score - min_score)
                # Invert so higher values = more anomalous
                normalized_scores = 1 - normalized_scores
            else:
                normalized_scores = np.zeros_like(anomaly_scores)
            
            # Flag transactions marked as anomalies (-1 = anomaly, 1 = normal)
            for i, (txn, label, score) in enumerate(zip(transactions, anomaly_labels, normalized_scores)):
                if label == -1:  # Anomaly detected
                    date = txn.get('date', 'Unknown')
                    description = txn.get('description', 'Unknown')
                    
                    # Calculate net amount the same way as in amounts array
                    deposit = float(txn.get('depositAmount', {}).get('value', 0)) if txn.get('depositAmount', {}).get('value') else 0
                    withdrawal = float(txn.get('withdrawalAmount', {}).get('value', 0)) if txn.get('withdrawalAmount', {}).get('value') else 0
                    net_amount = deposit - abs(withdrawal) if withdrawal else deposit
                    
                    flagged_transactions.append({
                        'transactionIndex': i,
                        'date': date,
                        'description': description,
                        'amount': net_amount,
                        'reasons': [f"ML Anomaly Detection: Unusual transaction amount ({net_amount:.2f})"],
                        'fraud_score': round(score, 2),
                        'stage': 'ml_anomaly'
                    })
                    stage_reasons.append(f"ML detected unusual amount: {net_amount:.2f}")
            
        except Exception as e:
            self.logger.error(f"Error in ML anomaly detection: {e}")
        
        return {'flagged': flagged_transactions, 'reasons': stage_reasons}
