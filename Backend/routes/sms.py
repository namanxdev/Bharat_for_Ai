"""
SMS endpoint
Sends scheme details to users via SMS
"""
from fastapi import APIRouter, HTTPException, Request
from ..models.schemas import SMSRequest, SMSResponse
from ..data.schemes import SCHEMES
from ..utils.rate_limit import sms_limiter

router = APIRouter()

# SMS service will be injected by main.py
sms_service = None


def set_sms_service(service):
    """Set the SMS service instance"""
    global sms_service
    sms_service = service


@router.post("/sms", response_model=SMSResponse)
async def send_sms(request: SMSRequest, http_request: Request):
    """
    Send scheme details via SMS

    Validates phone number and sends scheme information to the user
    """
    # Rate limiting by phone number to prevent spam
    rate_limit_key = request.phone
    allowed, remaining = sms_limiter.is_allowed(rate_limit_key)

    if not allowed:
        raise HTTPException(
            status_code=429,
            detail="Too many SMS requests. Please try again later."
        )

    # Find the scheme
    scheme = next((s for s in SCHEMES if s['id'] == request.scheme_id), None)

    if not scheme:
        raise HTTPException(status_code=404, detail=f"Scheme {request.scheme_id} not found")

    # Send SMS
    result = sms_service.send_scheme_details(request.phone, scheme)

    return SMSResponse(
        status=result["status"],
        message=result["message"]
    )
