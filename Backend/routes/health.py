"""
Health check endpoint
Reports status of all backend services
"""
from fastapi import APIRouter
from models.schemas import HealthResponse

router = APIRouter()

# Services will be injected by main.py
vector_service = None
llm_service = None
sms_service = None


def set_services(vector_svc, llm_svc, sms_svc):
    """Set service instances for health checks"""
    global vector_service, llm_service, sms_service
    vector_service = vector_svc
    llm_service = llm_svc
    sms_service = sms_svc


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Check health status of all services

    Returns status of vector database, LLM, and SMS services
    """
    services_status = {
        "vector_db": "ok" if vector_service and vector_service.is_available() else "fallback",
        "llm": "ok" if llm_service and llm_service.is_available() else "fallback",
        "sms": "ok" if sms_service and sms_service.is_available() else "mock"
    }

    return HealthResponse(
        status="healthy",
        services=services_status
    )
