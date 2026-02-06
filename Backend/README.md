# BharatConnect AI Backend

FastAPI backend for the BharatConnect AI government scholarship scheme discovery platform.

## Features

- **Conversational Chat Interface**: Collects user profile through natural conversation
- **Eligibility Checking**: Matches users with eligible government schemes
- **RAG Pipeline**: Semantic search using FAISS and sentence-transformers
- **LLM Integration**: Google Gemini with LangChain for natural responses
- **SMS Notifications**: Send scheme details via Twilio SMS
- **Graceful Fallbacks**: Works without any external APIs configured
- **Comprehensive Tests**: Full test suite with pytest

## Quick Start

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Run the Server

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

### 3. View API Documentation

Open your browser and navigate to:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Configuration (Optional)

Copy `.env.example` to `.env` and configure optional services:

```bash
cp .env.example .env
```

### Google Gemini (Optional)
For LLM-powered conversational responses:
```env
GOOGLE_API_KEY=your_google_api_key
GEMINI_MODEL=gemini-pro
```
Get your API key from: https://makersuite.google.com/app/apikey

### Twilio (Optional)
For SMS notifications:
```env
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=your_twilio_number
```

**Note**: The backend works perfectly without any configuration. All services have fallback modes.

## API Endpoints

### POST /chat
Conversational interface for scheme discovery
- Collects user profile (age, income, state, category)
- Returns eligible schemes and conversational responses

### POST /eligibility
Direct eligibility check
- Input: User profile
- Output: List of eligible schemes

### POST /sms
Send scheme details via SMS
- Validates Indian phone numbers (10 digits, starting with 6-9)
- Sends formatted scheme information

### GET /health
Health check endpoint
- Reports status of all services (vector_db, llm, sms)

## Architecture

```
backend/
├── main.py              # FastAPI app entry point
├── config.py            # Configuration management
├── requirements.txt     # Python dependencies
├── data/
│   └── schemes.py       # Scheme data + eligibility engine
├── models/
│   └── schemas.py       # Pydantic request/response models
├── routes/
│   ├── chat.py          # Chat endpoint
│   ├── eligibility.py   # Eligibility endpoint
│   ├── sms.py           # SMS endpoint
│   └── health.py        # Health check endpoint
└── services/
    ├── llm_service.py   # OpenAI LLM integration
    ├── vector_service.py # FAISS vector search
    └── sms_service.py   # Twilio SMS integration
```

## Technology Stack

- **FastAPI**: Modern, fast web framework
- **Pydantic**: Data validation and settings management
- **FAISS**: Vector similarity search
- **Sentence-Transformers**: Text embeddings (all-MiniLM-L6-v2)
- **Google Gemini**: LLM integration via LangChain
- **LangChain**: LLM orchestration framework
- **Twilio**: Optional SMS service
- **Pytest**: Testing framework

## Development

### Running Tests
```bash
# Run all tests
pytest test/ -v

# Or use the test runner
python run_tests.py

# Run specific test file
pytest test/test_eligibility.py -v

# Run with coverage
pytest test/ --cov=. --cov-report=html
```

### Code Formatting
```bash
black .
```

### Type Checking
```bash
mypy .
```

## Session Management

Sessions are stored in-memory and expire after 30 minutes of inactivity. Each session maintains:
- User profile information
- Conversation history
- Last access timestamp

## Scheme Data

The backend includes 10 government scholarship schemes covering:
- National schemes (applicable to all states)
- State-specific schemes (Maharashtra, Karnataka, Tamil Nadu, Uttar Pradesh)
- Category-specific schemes (SC, ST, OBC, Minority)
- Income-based schemes (ranging from ₹2L to ₹8L limits)

## CORS Configuration

The backend is configured to allow all origins for development. Update `config.py` to restrict origins in production.

## License

MIT License - see LICENSE file for details
