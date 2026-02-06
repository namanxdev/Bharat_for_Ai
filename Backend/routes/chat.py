"""
Chat endpoint
Handles conversational interactions with users
Collects profile information and provides scheme recommendations
"""
from fastapi import APIRouter, HTTPException, Request
from ..models.schemas import ChatRequest, ChatResponse, UserProfile
from ..data.schemes import get_eligible_schemes
from datetime import datetime, timedelta
from typing import Dict, Any
import logging
import uuid
import re
from ..utils.rate_limit import chat_limiter

logger = logging.getLogger(__name__)

router = APIRouter()

# Services will be injected by main.py
vector_service = None
llm_service = None


def set_services(vector_svc, llm_svc):
    """Set service instances"""
    global vector_service, llm_service
    vector_service = vector_svc
    llm_service = llm_svc


# In-memory session storage
# Structure: {session_id: {user_profile, conversation_history, last_accessed, session_token}}
sessions: Dict[str, Dict[str, Any]] = {}
SESSION_TIMEOUT_MINUTES = 30
VALID_SESSION_ID_PATTERN = re.compile(r'^[a-f0-9\-]{36}$')  # UUID format validation


def validate_session_id(session_id: str) -> None:
    """Validate session ID format to prevent session fixation attacks"""
    if not isinstance(session_id, str) or not VALID_SESSION_ID_PATTERN.match(session_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid session_id format. Must be a valid UUID."
        )


def get_or_create_session(session_id: str) -> Dict[str, Any]:
    """Get existing session or create new one"""
    validate_session_id(session_id)
    now = datetime.now()

    # Clean up expired sessions
    expired = [
        sid for sid, data in sessions.items()
        if now - data['last_accessed'] > timedelta(minutes=SESSION_TIMEOUT_MINUTES)
    ]
    for sid in expired:
        del sessions[sid]

    # Get or create session
    if session_id not in sessions:
        sessions[session_id] = {
            'user_profile': UserProfile(),
            'conversation_history': [],
            'last_accessed': now,
            'session_token': str(uuid.uuid4())
        }
    else:
        sessions[session_id]['last_accessed'] = now

    return sessions[session_id]


def sanitize_response(text: str) -> str:
    """
    Sanitize LLM response to prevent injection attacks
    Removes HTML tags and script content while preserving markdown formatting
    """
    if not isinstance(text, str):
        return ""

    # Remove script tags and their content
    text = re.sub(r'<script[^>]*>.*?</script>', '', text, flags=re.IGNORECASE | re.DOTALL)

    # Remove iframe tags
    text = re.sub(r'<iframe[^>]*>.*?</iframe>', '', text, flags=re.IGNORECASE | re.DOTALL)

    # Remove other potentially dangerous HTML tags but keep safe ones for markdown
    dangerous_tags = ['onclick', 'onerror', 'onload', 'javascript:']
    for tag in dangerous_tags:
        text = re.sub(f'\\b{tag}\\b', '', text, flags=re.IGNORECASE)

    return text.strip()


def get_next_profile_question(profile: UserProfile) -> str | None:
    """Determine what profile information to ask for next"""
    if profile.age is None:
        return "To help you find the right schemes, I need a few details. Let's start with your age. How old are you?"

    if profile.income is None:
        return "Great! Now, what is your family's annual income in rupees?"

    if profile.state is None:
        return "Thank you! Which state are you from? (e.g., Maharashtra, Karnataka, Tamil Nadu, etc.)"

    if profile.category is None:
        return "Almost done! What is your category? (General, SC, ST, OBC, EWS, or Minority)"

    return None


def extract_profile_info(message: str, profile: UserProfile) -> UserProfile:
    """
    Extract profile information from user message
    Updates the profile with any information found in the message
    """
    message_lower = message.lower().strip()

    # Extract age
    if profile.age is None:
        # Try to extract number from message
        age_match = re.search(r'\b(\d{1,2})\b', message)
        if age_match:
            age = int(age_match.group(1))
            if 1 <= age <= 120:
                profile.age = age

    # Extract income
    elif profile.income is None:
        # Look for numbers (could be in lakhs, thousands, or rupees)
        income_match = re.search(r'(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:lakh|lakhs|l|k|thousand)?', message_lower)
        if income_match:
            income_str = income_match.group(1).replace(',', '')
            income = float(income_str)

            # Convert lakhs to rupees
            if 'lakh' in message_lower or 'l' in message_lower:
                income *= 100000
            elif 'k' in message_lower or 'thousand' in message_lower:
                income *= 1000

            profile.income = int(income)

    # Extract state
    elif profile.state is None:
        # List of Indian states
        states = [
            "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
            "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
            "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
            "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
            "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
            "Delhi", "Jammu and Kashmir", "Ladakh"
        ]

        for state in states:
            if state.lower() in message_lower:
                profile.state = state
                break

    # Extract category
    elif profile.category is None:
        categories = ["General", "SC", "ST", "OBC", "EWS", "Minority"]
        for category in categories:
            if category.lower() in message_lower:
                profile.category = category
                break

    return profile


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, http_request: Request):
    """
    Handle chat interaction with user

    Manages conversational flow to collect profile information
    and provide scheme recommendations
    """
    # Rate limiting by session ID
    allowed, remaining = chat_limiter.is_allowed(request.session_id)

    if not allowed:
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Please wait before sending another message."
        )

    # Get or create session
    session = get_or_create_session(request.session_id)

    # Update profile from request
    if request.user_profile:
        if request.user_profile.age is not None:
            session['user_profile'].age = request.user_profile.age
        if request.user_profile.income is not None:
            session['user_profile'].income = request.user_profile.income
        if request.user_profile.state is not None:
            session['user_profile'].state = request.user_profile.state
        if request.user_profile.category is not None:
            session['user_profile'].category = request.user_profile.category

    # Extract profile info from message
    session['user_profile'] = extract_profile_info(request.message, session['user_profile'])

    # Add message to conversation history
    session['conversation_history'].append({
        "role": "user",
        "content": request.message
    })

    # Check if profile is complete
    profile = session['user_profile']
    next_question = get_next_profile_question(profile)

    if next_question:
        # Profile incomplete - ask for next piece of information
        session['conversation_history'].append({
            "role": "assistant",
            "content": next_question
        })

        return ChatResponse(
            response=next_question,
            schemes=[],
            next_question=next_question
        )

    # Profile is complete - get eligible schemes
    eligible_schemes = get_eligible_schemes(profile.to_dict())

    # Generate response
    response_text = llm_service.generate_response(
        user_message=request.message,
        eligible_schemes=eligible_schemes,
        user_profile=profile.to_dict(),
        conversation_history=session['conversation_history']
    )

    # Sanitize LLM response to prevent injection attacks
    # Remove any HTML, script tags, or suspicious content
    response_text = sanitize_response(response_text)

    # Add response to conversation history
    session['conversation_history'].append({
        "role": "assistant",
        "content": response_text
    })

    return ChatResponse(
        response=response_text,
        schemes=eligible_schemes,
        next_question=None
    )
