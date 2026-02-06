"""
Pydantic models for request/response validation
These models match the API contracts expected by the frontend
"""
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any
import re


class UserProfile(BaseModel):
    """User profile information for eligibility checks"""
    age: Optional[int] = None
    income: Optional[int] = None
    state: Optional[str] = None
    category: Optional[str] = None

    def is_complete(self) -> bool:
        """Check if all profile fields are filled"""
        return all([
            self.age is not None,
            self.income is not None,
            self.state is not None,
            self.category is not None
        ])

    def to_dict(self) -> dict:
        """Convert to dict for eligibility checking"""
        return {
            "age": self.age,
            "income": self.income,
            "state": self.state,
            "category": self.category
        }


class ChatRequest(BaseModel):
    """Request model for POST /chat endpoint"""
    session_id: str = Field(..., description="Unique session identifier")
    message: str = Field(..., description="User's message")
    user_profile: UserProfile = Field(default_factory=UserProfile, description="User profile data")


class ChatResponse(BaseModel):
    """Response model for POST /chat endpoint"""
    response: str = Field(..., description="Conversational response text")
    schemes: List[Dict[str, Any]] = Field(default_factory=list, description="Eligible schemes")
    next_question: Optional[str] = Field(None, description="Next question to ask user")


class EligibilityRequest(BaseModel):
    """Request model for POST /eligibility endpoint"""
    age: int = Field(..., ge=1, le=120, description="User's age")
    income: int = Field(..., ge=0, description="Annual family income in rupees")
    state: str = Field(..., description="User's state")
    category: str = Field(..., description="User's category (General, SC, ST, OBC, EWS, Minority)")

    def to_dict(self) -> dict:
        """Convert to dict for eligibility checking"""
        return {
            "age": self.age,
            "income": self.income,
            "state": self.state,
            "category": self.category
        }


class EligibilityResponse(BaseModel):
    """Response model for POST /eligibility endpoint"""
    eligible_schemes: List[Dict[str, Any]] = Field(..., description="List of eligible schemes")
    count: int = Field(..., description="Number of eligible schemes")


class SMSRequest(BaseModel):
    """Request model for POST /sms endpoint"""
    phone: str = Field(..., description="Indian phone number (10 digits, starting with 6-9)")
    scheme_id: str = Field(..., description="ID of the scheme to send details about")

    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v: str) -> str:
        """Validate Indian phone number format"""
        if not re.match(r'^[6-9]\d{9}$', v):
            raise ValueError('Invalid Indian phone number. Must be 10 digits starting with 6-9')
        return v


class SMSResponse(BaseModel):
    """Response model for POST /sms endpoint"""
    status: str = Field(..., description="Status of SMS operation")
    message: str = Field(..., description="Human-readable message")


class HealthResponse(BaseModel):
    """Response model for GET /health endpoint"""
    status: str = Field(..., description="Overall health status")
    services: Dict[str, str] = Field(..., description="Status of individual services")
