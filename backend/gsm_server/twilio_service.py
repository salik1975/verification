import os
import logging
from typing import Optional, Dict, Any, List
from twilio.rest import Client
from twilio.base.exceptions import TwilioException
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class TwilioService:
    """
    A service class for handling Twilio SMS operations.
    Provides methods for sending SMS messages with proper error handling.
    """
    
    def __init__(self, account_sid: Optional[str] = None, 
                 auth_token: Optional[str] = None, 
                 from_number: Optional[str] = None):
        """
        Initialize the Twilio service.
        
        Args:
            account_sid: Twilio Account SID (optional, will load from env if not provided)
            auth_token: Twilio Auth Token (optional, will load from env if not provided)
            from_number: Twilio phone number to send from (optional, will load from env if not provided)
        """
        # Load environment variables if not provided
        load_dotenv()
        
        self.account_sid = account_sid or os.environ.get("TWILIO_ACCOUNT_SID")
        self.auth_token = auth_token or os.environ.get("TWILIO_AUTH_TOKEN")
        self.from_number = from_number or os.environ.get("TWILIO_NUMBER")
        
        # Validate required credentials
        if not all([self.account_sid, self.auth_token, self.from_number]):
            raise ValueError("Missing required Twilio credentials. Please provide account_sid, auth_token, and from_number or set them in environment variables.")
        
        # Initialize Twilio client
        try:
            self.client = Client(self.account_sid, self.auth_token)
            logger.info("Twilio client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Twilio client: {e}")
            raise
    
    def send_sms(self, to_number: str, message_body: str, 
                 media_url: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        Send an SMS message using Twilio.
        
        Args:
            to_number: Recipient phone number (with country code)
            message_body: Text message content
            media_url: Optional list of media URLs to include
            
        Returns:
            Dict containing message details and status
            
        Raises:
            TwilioException: If message sending fails
        """
        try:
            # Validate phone number format (basic validation)
            if not to_number.startswith('+'):
                raise ValueError("Phone number must include country code (e.g., +1234567890)")
            
            # Prepare message parameters
            message_params = {
                'to': to_number,
                'from_': self.from_number,
                'body': message_body
            }
            
            # Add media URLs if provided
            if media_url:
                message_params['media_url'] = media_url
            
            # Send the message
            message = self.client.messages.create(**message_params)
            
            # Log success
            logger.info(f"SMS sent successfully to {to_number}. SID: {message.sid}")
            
            # Return message details
            return {
                'success': True,
                'message_sid': message.sid,
                'to': message.to,
                'from': message.from_,
                'body': message.body,
                'status': message.status,
                'date_created': message.date_created.isoformat() if message.date_created else None,
                'error_code': message.error_code,
                'error_message': message.error_message
            }
            
        except TwilioException as e:
            logger.error(f"Twilio error sending SMS to {to_number}: {e}")
            return {
                'success': False,
                'error': str(e),
                'error_code': getattr(e, 'code', None),
                'to': to_number,
                'from': self.from_number
            }
        except Exception as e:
            logger.error(f"Unexpected error sending SMS to {to_number}: {e}")
            return {
                'success': False,
                'error': str(e),
                'to': to_number,
                'from': self.from_number
            }
    
    def send_bulk_sms(self, phone_numbers: List[str], message_body: str,
                      media_url: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        """
        Send SMS messages to multiple recipients.
        
        Args:
            phone_numbers: List of recipient phone numbers
            message_body: Text message content
            media_url: Optional list of media URLs to include
            
        Returns:
            List of results for each message sent
        """
        results = []
        
        for phone_number in phone_numbers:
            result = self.send_sms(phone_number, message_body, media_url)
            results.append(result)
        
        return results
    
    def get_message_status(self, message_sid: str) -> Dict[str, Any]:
        """
        Get the status of a sent message.
        
        Args:
            message_sid: The SID of the message to check
            
        Returns:
            Dict containing message status details
        """
        try:
            message = self.client.messages(message_sid).fetch()
            
            return {
                'success': True,
                'message_sid': message.sid,
                'status': message.status,
                'to': message.to,
                'from': message.from_,
                'body': message.body,
                'date_created': message.date_created.isoformat() if message.date_created else None,
                'date_sent': message.date_sent.isoformat() if message.date_sent else None,
                'error_code': message.error_code,
                'error_message': message.error_message
            }
            
        except TwilioException as e:
            logger.error(f"Error fetching message status for {message_sid}: {e}")
            return {
                'success': False,
                'error': str(e),
                'message_sid': message_sid
            }
    
    def get_account_info(self) -> Dict[str, Any]:
        """
        Get account information from Twilio.
        
        Returns:
            Dict containing account details
        """
        try:
            account = self.client.api.accounts(self.account_sid).fetch()
            
            return {
                'success': True,
                'account_sid': account.sid,
                'friendly_name': account.friendly_name,
                'status': account.status,
                'type': account.type,
                'date_created': account.date_created.isoformat() if account.date_created else None
            }
            
        except TwilioException as e:
            logger.error(f"Error fetching account info: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def validate_phone_number(self, phone_number: str) -> Dict[str, Any]:
        """
        Validate a phone number using Twilio's Lookup API.
        
        Args:
            phone_number: Phone number to validate
            
        Returns:
            Dict containing validation results
        """
        try:
            # Note: This requires the Lookup API which may have additional costs
            # You might want to implement basic regex validation instead
            lookup = self.client.lookups.v2.phone_numbers(phone_number).fetch()
            
            return {
                'success': True,
                'phone_number': lookup.phone_number,
                'valid': True,
                'country_code': lookup.country_code,
                'national_format': lookup.national_format,
                'international_format': lookup.international_format
            }
            
        except TwilioException as e:
            logger.error(f"Error validating phone number {phone_number}: {e}")
            return {
                'success': False,
                'error': str(e),
                'phone_number': phone_number
            }
    
    def get_message_history(self, limit: int = 50) -> Dict[str, Any]:
        """
        Get recent message history.
        
        Args:
            limit: Maximum number of messages to retrieve
            
        Returns:
            Dict containing message history
        """
        try:
            messages = self.client.messages.list(limit=limit)
            
            message_list = []
            for message in messages:
                message_list.append({
                    'sid': message.sid,
                    'to': message.to,
                    'from': message.from_,
                    'body': message.body,
                    'status': message.status,
                    'date_created': message.date_created.isoformat() if message.date_created else None,
                    'date_sent': message.date_sent.isoformat() if message.date_sent else None
                })
            
            return {
                'success': True,
                'messages': message_list,
                'count': len(message_list)
            }
            
        except TwilioException as e:
            logger.error(f"Error fetching message history: {e}")
            return {
                'success': False,
                'error': str(e)
            }


# Example usage and testing
if __name__ == "__main__":
    # Example usage
    try:
        # Initialize the service
        twilio_service = TwilioService()
        
        # Send a test message
        result = twilio_service.send_sms(
            to_number="",
            message_body="Hello from TwilioService class!"
        )
        
        print("Send SMS Result:", result)
        
        # Get account info
        account_info = twilio_service.get_account_info()
        print("Account Info:", account_info)
        
        # Get message history
        history = twilio_service.get_message_history(limit=5)
        print("Message History:", history)
        
    except Exception as e:
        print(f"Error: {e}")
