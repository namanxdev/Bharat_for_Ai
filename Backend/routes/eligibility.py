"""
Eligibility endpoint
Checks user eligibility for government schemes
"""
from fastapi import APIRouter, HTTPException, Request
from ..models.schemas import EligibilityRequest, EligibilityResponse
from ..data.schemes import get_eligible_schemes
from ..utils.rate_limit import eligibility_limiter

router = APIRouter()


@router.post("/eligibility", response_model=EligibilityResponse)
async def check_eligibility(request: EligibilityRequest, http_request: Request):
    """
    Check user eligibility for schemes

    Returns list of schemes the user is eligible for based on their profile
    """
    # Rate limiting by client IP
    client_ip = http_request.client.host if http_request.client else "unknown"
    allowed, remaining = eligibility_limiter.is_allowed(client_ip)

    if not allowed:
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Please try again later."
        )

    # Get eligible schemes
    eligible_schemes = get_eligible_schemes(request.to_dict())

    return EligibilityResponse(
        eligible_schemes=eligible_schemes,
        count=len(eligible_schemes)
    )
