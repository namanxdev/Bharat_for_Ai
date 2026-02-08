"""
SMS service using Twilio
Sends scheme details to users via SMS with fallback to mock responses
"""
import logging
from typing import Dict, Any
from config import settings

logger = logging.getLogger(__name__)

# Try to import Twilio
try:
    from twilio.rest import Client
    TWILIO_AVAILABLE = all([
        settings.twilio_account_sid,
        settings.twilio_auth_token,
        settings.twilio_phone_number
    ])
    if TWILIO_AVAILABLE:
        twilio_client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
except ImportError:
    TWILIO_AVAILABLE = False
    logger.warning("Twilio library not available. Using mock SMS responses.")


class SMSService:
    """Service for sending SMS notifications about schemes"""

    def __init__(self):
        self.available = TWILIO_AVAILABLE
        if self.available:
            logger.info("SMS service initialized with Twilio")
        else:
            logger.info("SMS service using mock responses (Twilio not configured)")

    def send_scheme_details(self, phone: str, scheme: Dict[str, Any]) -> Dict[str, str]:
        """
        Send scheme details to a phone number

        Args:
            phone: Indian phone number (10 digits)
            scheme: Scheme dictionary with details

        Returns:
            Dict with status and message
        """
        # Format phone number for India
        formatted_phone = f"+91{phone}"

        # Build SMS message
        sms_text = self._build_sms_message(scheme)

        if self.available:
            return self._send_with_twilio(formatted_phone, sms_text)
        else:
            return self._send_mock(formatted_phone, sms_text)

    def _send_with_twilio(self, phone: str, message: str) -> Dict[str, str]:
        """Send SMS using Twilio API"""
        try:
            message_obj = twilio_client.messages.create(
                body=message,
                from_=settings.twilio_phone_number,
                to=phone
            )

            # Log with masked phone number to protect PII
            masked_phone = phone[-4:].rjust(len(phone), '*')
            logger.info(f"SMS sent successfully to {masked_phone}. SID: {message_obj.sid}")

            return {
                "status": "sent",
                "message": "SMS sent successfully"
            }

        except Exception as e:
            # Log the error but don't expose it to the client
            logger.error(f"Failed to send SMS via Twilio: {e}")
            return {
                "status": "failed",
                "message": "Failed to send SMS. Please try again later."
            }

    def _send_mock(self, phone: str, message: str) -> Dict[str, str]:
        """Mock SMS sending (for development/testing)"""
        # Log with masked phone number to protect PII
        masked_phone = phone[-4:].rjust(len(phone), '*')
        logger.info(f"Mock SMS to {masked_phone}: {message[:50]}...")

        return {
            "status": "sent",
            "message": "SMS sent successfully (mock mode)"
        }

    def _build_sms_message(self, scheme: Dict[str, Any]) -> str:
        """Build SMS message text from scheme details"""
        message = f"""BharatConnect AI

{scheme['name']}

Benefits: {scheme['benefits'][:150]}...

Apply: {scheme['apply_link']}

Documents needed:
"""
        # Add first 3 documents to keep SMS concise
        for doc in scheme['documents'][:3]:
            message += f"- {doc}\n"

        if len(scheme['documents']) > 3:
            message += f"+ {len(scheme['documents']) - 3} more\n"

        return message

    def is_available(self) -> bool:
        """Check if Twilio SMS service is available"""
        return self.available
