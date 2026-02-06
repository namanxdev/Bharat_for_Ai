# BharatConnect AI Backend - Setup Guide

Complete setup guide for the BharatConnect AI backend.

## Prerequisites

- Python 3.10 or higher
- pip (Python package manager)
- Virtual environment (recommended)

## Quick Start (Zero Configuration)

The backend works out of the box with zero configuration. All external services have fallback modes.

```bash
# Navigate to backend directory
cd backend

# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Or use the quick start script:

**Windows:**
```bash
start_server.bat
```

**Linux/Mac:**
```bash
chmod +x start_server.sh
./start_server.sh
```

The API will be available at `http://localhost:8000`

## Full Setup with External Services

### Step 1: Create Virtual Environment (Recommended)

```bash
# Create virtual environment
python -m venv venv

# Activate it
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate
```

### Step 2: Install Dependencies

```bash
pip install -r requirements.txt
```

### Step 3: Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and add your API keys:

#### Google Gemini (Optional - for AI-powered responses)

1. Get your API key from: https://makersuite.google.com/app/apikey
2. Add to `.env`:
```env
GOOGLE_API_KEY=your_google_api_key_here
GEMINI_MODEL=gemini-pro
```

#### Twilio SMS (Optional - for SMS notifications)

1. Sign up at: https://www.twilio.com/
2. Get your credentials from the Twilio Console
3. Add to `.env`:
```env
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

### Step 4: Test the Installation

```bash
# Run import test
python test_import.py

# Run test suite
pytest test/ -v

# Or use the test runner
python run_tests.py
```

### Step 5: Start the Server

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The server will start on:
- API: http://localhost:8000
- Swagger Docs: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Service Fallback Modes

The backend has intelligent fallbacks for all external services:

### Vector Search (FAISS + Sentence Transformers)
- **Available**: Semantic search with embeddings
- **Fallback**: Keyword-based search
- **No setup required**: Works automatically if dependencies installed

### LLM (Google Gemini)
- **Available**: AI-powered conversational responses
- **Fallback**: Template-based responses
- **Requires**: GOOGLE_API_KEY environment variable

### SMS (Twilio)
- **Available**: Real SMS sending
- **Fallback**: Mock SMS (logs to console)
- **Requires**: Twilio credentials in environment

## Running Tests

```bash
# Run all tests
pytest test/ -v

# Run specific test file
pytest test/test_eligibility.py -v

# Run with coverage
pytest test/ --cov=. --cov-report=html

# Use test runner script
python run_tests.py
```

## Development

### Project Structure

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
├── services/
│   ├── llm_service.py   # Gemini LLM integration
│   ├── vector_service.py # FAISS vector search
│   └── sms_service.py   # Twilio SMS integration
└── test/
    ├── conftest.py      # Pytest fixtures
    ├── test_chat.py
    ├── test_eligibility.py
    ├── test_sms.py
    ├── test_health.py
    ├── test_schemes.py
    └── test_root.py
```

### Adding New Schemes

Edit `data/schemes.py` and add schemes to the `SCHEMES` list:

```python
{
    "id": "scheme_11",
    "name": "Your Scheme Name",
    "state": "ALL",  # or specific state
    "category": "ALL",  # or specific category
    "income_max": 250000,
    "age_min": 17,
    "age_max": 25,
    "benefits": "Description of benefits...",
    "documents": ["Doc1", "Doc2"],
    "apply_link": "https://..."
}
```

### API Endpoints

- `GET /` - API information
- `GET /health` - Health check
- `POST /chat` - Conversational chat interface
- `POST /eligibility` - Direct eligibility check
- `POST /sms` - Send scheme details via SMS
- `GET /docs` - Swagger documentation
- `GET /redoc` - ReDoc documentation

## Troubleshooting

### Import Errors

If you get import errors, ensure you're in the correct directory and have installed dependencies:

```bash
cd backend
pip install -r requirements.txt
python test_import.py
```

### Port Already in Use

If port 8000 is already in use, specify a different port:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8001
```

### CORS Issues

If you're getting CORS errors from the frontend:

1. Check that the backend is running on port 8000
2. Verify CORS settings in `config.py`
3. Ensure frontend is allowed in `cors_origins` list

### Service Not Available

Check service status:

```bash
curl http://localhost:8000/health
```

This will show which services are available vs using fallback modes.

## Production Deployment

For production deployment:

1. Set environment variables securely (don't use .env file)
2. Use a production ASGI server (uvicorn with workers)
3. Configure CORS to only allow your frontend domain
4. Enable HTTPS
5. Set up proper logging and monitoring

```bash
# Production example
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4 --no-access-log
```

## Support

For issues or questions:
1. Check the logs for error messages
2. Run tests to verify functionality
3. Check health endpoint for service status
4. Review this setup guide

## License

MIT License
