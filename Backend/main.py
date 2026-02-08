"""
BharatConnect AI Backend
FastAPI application for government scholarship scheme discovery
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

from config import settings
from data.schemes import SCHEMES
from services.vector_service import VectorService
from services.llm_service import LLMService
from services.sms_service import SMSService

# Import routers
from routes import chat, eligibility, sms, health

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="BharatConnect AI API",
    description="Backend API for government scholarship scheme discovery",
    version="1.0.0"
)

# Configure CORS
allowed_origins = settings.cors_origins if settings.cors_origins else ["http://localhost:5173", "http://localhost:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,  # Use configured origins from settings
    allow_credentials=True,
    allow_methods=["GET", "POST"],  # Only allow necessary methods
    allow_headers=["Content-Type"],  # Only allow necessary headers
)

# Initialize services
logger.info("Initializing backend services...")

vector_service = VectorService(SCHEMES)
llm_service = LLMService()
sms_service = SMSService()

# Inject services into route modules
chat.set_services(vector_service, llm_service)
health.set_services(vector_service, llm_service, sms_service)
sms.set_sms_service(sms_service)

logger.info(f"Services initialized - Vector: {vector_service.is_available()}, "
           f"LLM: {llm_service.is_available()}, SMS: {sms_service.is_available()}")

# Include routers
app.include_router(chat.router, tags=["chat"])
app.include_router(eligibility.router, tags=["eligibility"])
app.include_router(sms.router, tags=["sms"])
app.include_router(health.router, tags=["health"])


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "BharatConnect AI Backend API",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "chat": "/chat",
            "eligibility": "/eligibility",
            "sms": "/sms",
            "docs": "/docs"
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "Backend.main:app",
        host=settings.host,
        port=settings.port,
        reload=True
    )
