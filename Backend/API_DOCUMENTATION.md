# BharatConnect AI - API Documentation

Complete API reference for the BharatConnect AI backend.

## Base URL

```
http://localhost:8000
```

## Authentication

No authentication required for this version.

## Endpoints

### 1. Root Endpoint

Get API information and available endpoints.

**Endpoint:** `GET /`

**Response:**
```json
{
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
```

---

### 2. Health Check

Check the health status of all backend services.

**Endpoint:** `GET /health`

**Response:**
```json
{
  "status": "healthy",
  "services": {
    "vector_db": "ok",      // or "fallback"
    "llm": "ok",            // or "fallback"
    "sms": "ok"             // or "mock"
  }
}
```

**Service Status Values:**
- `ok` - Service fully operational with external API
- `fallback` - Using fallback implementation (vector_db, llm)
- `mock` - Using mock implementation (sms)

---

### 3. Chat Interface

Conversational interface for scheme discovery with profile collection.

**Endpoint:** `POST /chat`

**Request Body:**
```json
{
  "session_id": "unique-session-identifier",
  "message": "User's message text",
  "user_profile": {
    "age": 20,              // optional
    "income": 200000,       // optional
    "state": "Maharashtra", // optional
    "category": "General"   // optional
  }
}
```

**Response:**
```json
{
  "response": "Conversational response text",
  "schemes": [...],  // Array of eligible schemes (empty if profile incomplete)
  "next_question": "Next question to ask user or null"
}
```

**Profile Collection Flow:**

1. **First message** - System asks for age
2. **Age provided** - System asks for income
3. **Income provided** - System asks for state
4. **State provided** - System asks for category
5. **Category provided** - System returns eligible schemes

**Example Session:**

```javascript
// Message 1: Initial greeting
POST /chat
{
  "session_id": "abc123",
  "message": "Hello",
  "user_profile": {}
}
Response: {
  "response": "To help you find the right schemes, I need a few details...",
  "schemes": [],
  "next_question": "How old are you?"
}

// Message 2: Provide age
POST /chat
{
  "session_id": "abc123",
  "message": "I am 20 years old",
  "user_profile": {"age": 20}
}
Response: {
  "response": "Great! Now, what is your family's annual income?",
  "schemes": [],
  "next_question": "What is your family's annual income in rupees?"
}

// ... (continue with income, state, category)

// Final message: Complete profile
POST /chat
{
  "session_id": "abc123",
  "message": "General",
  "user_profile": {
    "age": 20,
    "income": 200000,
    "state": "Maharashtra",
    "category": "General"
  }
}
Response: {
  "response": "Excellent! You're eligible for 4 schemes...",
  "schemes": [/* array of schemes */],
  "next_question": null
}
```

---

### 4. Eligibility Check

Direct eligibility check without conversational interface.

**Endpoint:** `POST /eligibility`

**Request Body:**
```json
{
  "age": 20,
  "income": 200000,
  "state": "Maharashtra",
  "category": "General"
}
```

**Validation Rules:**
- `age`: Integer, 1-120
- `income`: Integer, >= 0
- `state`: String (Indian state name)
- `category`: String (General, SC, ST, OBC, EWS, Minority)

**Response:**
```json
{
  "eligible_schemes": [
    {
      "id": "scheme_1",
      "name": "National Scholarship for Higher Education",
      "state": "ALL",
      "category": "ALL",
      "income_max": 250000,
      "age_min": 17,
      "age_max": 25,
      "benefits": "Full tuition fee reimbursement...",
      "documents": ["Aadhaar Card", "Income Certificate", ...],
      "apply_link": "https://scholarships.gov.in",
      "eligibilityReason": "Age 20 is within 17-25 range • Income ₹200,000 is below limit"
    }
    // ... more schemes
  ],
  "count": 4
}
```

**Error Response (422):**
```json
{
  "detail": [
    {
      "loc": ["body", "age"],
      "msg": "ensure this value is less than or equal to 120",
      "type": "value_error"
    }
  ]
}
```

---

### 5. SMS Notification

Send scheme details to a phone number via SMS.

**Endpoint:** `POST /sms`

**Request Body:**
```json
{
  "phone": "9876543210",
  "scheme_id": "scheme_1"
}
```

**Phone Validation:**
- Must be exactly 10 digits
- Must start with 6, 7, 8, or 9
- Regex: `^[6-9]\d{9}$`

**Response (Success):**
```json
{
  "status": "sent",
  "message": "SMS sent successfully"
}
```

**Response (Mock Mode):**
```json
{
  "status": "sent",
  "message": "SMS sent successfully (mock mode)"
}
```

**Error Responses:**

**Invalid Phone (422):**
```json
{
  "detail": [
    {
      "loc": ["body", "phone"],
      "msg": "Invalid Indian phone number. Must be 10 digits starting with 6-9",
      "type": "value_error"
    }
  ]
}
```

**Scheme Not Found (404):**
```json
{
  "detail": "Scheme scheme_99 not found"
}
```

---

## Scheme Data Structure

All schemes follow this structure:

```json
{
  "id": "scheme_1",                    // Unique identifier
  "name": "Scheme Name",               // Display name
  "state": "ALL",                      // State or "ALL"
  "category": "ALL",                   // Category or "ALL"
  "income_max": 250000,                // Maximum family income
  "age_min": 17,                       // Minimum age
  "age_max": 25,                       // Maximum age
  "benefits": "Description...",        // Benefits description
  "documents": ["Doc1", "Doc2"],       // Required documents
  "apply_link": "https://...",         // Application URL
  "eligibilityReason": "Reason..."     // Only in responses
}
```

## Eligibility Logic

A user is eligible for a scheme if:

1. **Age**: `age_min <= user_age <= age_max`
2. **Income**: `user_income <= income_max`
3. **Category**: `scheme_category == "ALL" OR scheme_category == user_category`
4. **State**: `scheme_state == "ALL" OR scheme_state == user_state`

All conditions must be true for eligibility.

## Available Schemes

10 schemes are currently available:

1. **scheme_1** - National Scholarship for Higher Education (ALL states, ALL categories)
2. **scheme_2** - PM YASASVI Scholarship (ALL states, OBC only)
3. **scheme_3** - Post Matric Scholarship for SC Students (ALL states, SC only)
4. **scheme_4** - Maharashtra State Merit Scholarship (Maharashtra only)
5. **scheme_5** - Karnataka Vidyasiri Scholarship (Karnataka only)
6. **scheme_6** - Central Sector Scholarship (ALL states, ALL categories)
7. **scheme_7** - Pragati Scholarship for Girl Students (ALL states, ALL categories)
8. **scheme_8** - UP Scholarship for Minority Students (UP only, Minority only)
9. **scheme_9** - Pre Matric Scholarship for ST Students (ALL states, ST only)
10. **scheme_10** - Tamil Nadu Free Education Scheme (Tamil Nadu only)

## Error Codes

- **200** - Success
- **404** - Resource not found
- **405** - Method not allowed
- **422** - Validation error (invalid request data)
- **500** - Internal server error

## Rate Limiting

No rate limiting implemented in this version.

## CORS

CORS is enabled for all origins in development mode. In production, configure allowed origins in `config.py`.

## Interactive Documentation

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Example Code

### Python (using requests)

```python
import requests

# Eligibility check
response = requests.post('http://localhost:8000/eligibility', json={
    'age': 20,
    'income': 200000,
    'state': 'Maharashtra',
    'category': 'General'
})

data = response.json()
print(f"Eligible for {data['count']} schemes")
for scheme in data['eligible_schemes']:
    print(f"  - {scheme['name']}")
```

### JavaScript (using fetch)

```javascript
// Chat interaction
const response = await fetch('http://localhost:8000/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    session_id: 'user-123',
    message: 'Hello',
    user_profile: {}
  })
});

const data = await response.json();
console.log(data.response);
console.log('Schemes:', data.schemes.length);
```

### cURL

```bash
# Health check
curl http://localhost:8000/health

# Eligibility check
curl -X POST http://localhost:8000/eligibility \
  -H "Content-Type: application/json" \
  -d '{
    "age": 20,
    "income": 200000,
    "state": "Maharashtra",
    "category": "General"
  }'

# SMS
curl -X POST http://localhost:8000/sms \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "9876543210",
    "scheme_id": "scheme_1"
  }'
```

## Webhooks

No webhooks implemented in this version.

## Changelog

### Version 1.0.0 (2024-02-06)
- Initial release
- Chat interface with profile collection
- Direct eligibility checking
- SMS notifications
- Google Gemini LLM integration
- RAG pipeline with FAISS
- Comprehensive test suite
