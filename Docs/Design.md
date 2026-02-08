# BharatConnect AI - Design Document

## Executive Summary

BharatConnect AI is a production-grade, voice-first web application that uses RAG (Retrieval-Augmented Generation) and rule-based filtering to help Indian citizens discover government scholarships. This document outlines the technical architecture, AI pipeline design, and implementation strategy for a hackathon-winning solution.

**Key Technical Highlights**:
- Hybrid AI: Vector search (semantic) + Rule engine (eligibility)
- Sub-3-second response time with FAISS optimization
- Graceful degradation across all failure modes
- Mobile-first, accessible, works on 2G networks
- Production-ready: Docker, tests, monitoring, docs

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        USER LAYER                            │
│  Mobile Browser (Chrome/Safari) + Web Speech API            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (React)                         │
│  • Voice Input UI  • Chat Interface  • Results Cards        │
│  • State Management (Context)  • Axios HTTP Client          │
└────────────────────┬────────────────────────────────────────┘
                     │ REST API (JSON)
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   BACKEND (FastAPI)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Chat Handler │  │ Eligibility  │  │ SMS Handler  │     │
│  │              │  │   Engine     │  │              │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                  │                  │              │
│         ▼                  ▼                  ▼              │
│  ┌──────────────────────────────────────────────────┐      │
│  │           AI PIPELINE (RAG)                       │      │
│  │  1. Query Embedding (sentence-transformers)      │      │
│  │  2. Vector Search (FAISS)                        │      │
│  │  3. Eligibility Filter (Rule Engine)             │      │
│  │  4. LLM Response (OpenAI/Ollama)                 │      │
│  └──────────────────────────────────────────────────┘      │
└────────────────────┬───────────────────┬────────────────────┘
                     │                   │
                     ▼                   ▼
         ┌───────────────────┐  ┌──────────────────┐
         │   Vector DB       │  │  External APIs   │
         │   (FAISS)         │  │  • OpenAI        │
         │   • Embeddings    │  │  • Twilio SMS    │
         │   • Scheme Index  │  │                  │
         └───────────────────┘  └──────────────────┘
                     │
                     ▼
         ┌───────────────────┐
         │   Data Layer      │
         │   schemes.json    │
         │   (15-25 schemes) │
         └───────────────────┘
```

### Data Flow: User Query → Response

1. **User Input**: "I need a scholarship for engineering" (voice/text)
2. **Frontend**: Transcribe voice → Send to `/chat` endpoint
3. **Backend**: Extract/collect user profile (age, income, state, category)
4. **AI Pipeline**:
   - Generate query embedding (384-dim vector)
   - Search FAISS index → Top 10 similar schemes
   - Apply eligibility rules → Filter to 0-5 matches
   - Generate LLM response → Simplify language
5. **Response**: Return schemes + conversational explanation
6. **SMS**: User clicks "Send SMS" → Twilio delivers link

### Component Overview

1. **Frontend**: React SPA with voice input, chat interface, and SMS trigger
2. **Backend**: FastAPI REST API handling chat, eligibility, and SMS
3. **AI Pipeline**: RAG system with vector search and LLM generation
4. **Eligibility Engine**: Rule-based filtering system
5. **Data Layer**: JSON-based scheme storage with vector embeddings

## Technology Stack

### Frontend
- **Framework**: React with Vite
- **Styling**: Tailwind CSS
- **Voice Input**: Web Speech API (browser native)
- **HTTP Client**: Axios or Fetch API
- **State Management**: React Context or useState

### Backend
- **Framework**: FastAPI (Python 3.10+)
- **ASGI Server**: Uvicorn
- **Session Store**: In-memory dict or Redis (optional)
- **Validation**: Pydantic models

### AI/ML Layer
- **LLM**: OpenAI GPT-3.5/4 or Ollama (local)
- **Embeddings**: sentence-transformers (all-MiniLM-L6-v2)
- **Vector DB**: FAISS (in-memory)
- **Framework**: LangChain

### External Services
- **SMS**: Twilio API
- **Speech-to-Text**: Web Speech API (client-side)

### Deployment
- **Containerization**: Docker + docker-compose
- **Hosting**: Railway, Render, or AWS
- **Environment**: .env file for secrets

## Data Models

### Scheme Model
```python
{
  "id": "string",
  "name": "string",
  "state": "string",  # or "ALL"
  "category": "string",  # SC/ST/OBC/General or "ALL"
  "income_max": int,  # in INR
  "age_min": int,
  "age_max": int,
  "benefits": "string",
  "documents": ["string"],
  "apply_link": "string"
}
```

### User Profile Model
```python
{
  "age": int,
  "income": int,
  "state": "string",
  "category": "string"
}
```

### Chat Message Model
```python
{
  "session_id": "string",
  "message": "string",
  "timestamp": "datetime"
}
```

### SMS Request Model
```python
{
  "phone": "string",  # 10 digits
  "scheme_id": "string"
}
```

## API Design

### Endpoints

#### POST /chat
**Purpose**: Handle conversational queries and collect user profile

**Request**:
```json
{
  "session_id": "uuid",
  "message": "I need a scholarship",
  "user_profile": {
    "age": 20,
    "income": 200000,
    "state": "Maharashtra",
    "category": "General"
  }
}
```

**Response**:
```json
{
  "response": "Based on your profile, you're eligible for...",
  "schemes": [...],
  "next_question": "What is your annual family income?"
}
```

#### POST /eligibility
**Purpose**: Get eligible schemes for a complete user profile

**Request**:
```json
{
  "age": 20,
  "income": 200000,
  "state": "Maharashtra",
  "category": "General"
}
```

**Response**:
```json
{
  "eligible_schemes": [
    {
      "id": "scheme_1",
      "name": "Post Matric Scholarship",
      "match_reason": "You meet age, income, and category criteria",
      "benefits": "₹10,000 per year",
      "apply_link": "https://..."
    }
  ],
  "count": 3
}
```

#### POST /sms
**Purpose**: Send scheme details via SMS

**Request**:
```json
{
  "phone": "9876543210",
  "scheme_id": "scheme_1"
}
```

**Response**:
```json
{
  "status": "sent",
  "message": "SMS sent successfully"
}
```

#### GET /health
**Purpose**: Health check

**Response**:
```json
{
  "status": "healthy",
  "services": {
    "vector_db": "ok",
    "llm": "ok",
    "sms": "ok"
  }
}
```

## AI Pipeline Design

### RAG Architecture (Retrieval-Augmented Generation)

**Why RAG?**
- Prevents AI hallucination (grounds responses in real data)
- Combines semantic search (understands intent) with exact matching (eligibility rules)
- Faster than fine-tuning, cheaper than large context windows
- Transparent: Can show which schemes were retrieved

### Pipeline Flow (Detailed)

```
User Query: "I need money for college, I'm from Maharashtra"
     │
     ▼
┌─────────────────────────────────────────────────────────┐
│ STEP 1: Query Understanding                              │
│ • Extract intent: "scholarship search"                   │
│ • Extract entities: state="Maharashtra"                  │
│ • Normalize: "college" → "higher education"             │
└────────────────────┬────────────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────────────┐
│ STEP 2: Embedding Generation                             │
│ Model: sentence-transformers/all-MiniLM-L6-v2           │
│ Input: "scholarship higher education Maharashtra"       │
│ Output: 384-dimensional vector                           │
│ Time: ~50ms                                              │
└────────────────────┬────────────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────────────┐
│ STEP 3: Vector Search (FAISS)                            │
│ Index Type: IndexFlatIP (cosine similarity)             │
│ Search: Top 10 schemes with similarity > 0.6            │
│ Time: ~100ms (for 25 schemes)                           │
│ Results: [Scheme A (0.89), Scheme B (0.82), ...]       │
└────────────────────┬────────────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────────────┐
│ STEP 4: Eligibility Filtering (Rule Engine)             │
│ For each retrieved scheme:                               │
│   ✓ Age: 18 in [15, 25] → PASS                         │
│   ✓ Income: 200K <= 250K → PASS                        │
│   ✓ State: Maharashtra == Maharashtra → PASS           │
│   ✓ Category: General == ALL → PASS                    │
│ Time: ~10ms                                              │
│ Results: 3 eligible schemes                              │
└────────────────────┬────────────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────────────┐
│ STEP 5: LLM Response Generation                          │
│ Model: GPT-3.5-turbo (or Llama 3.1 8B)                  │
│ Prompt: "Explain these 3 schemes in simple language"    │
│ Temperature: 0.3 (deterministic)                         │
│ Max Tokens: 300                                          │
│ Time: ~1.5s                                              │
│ Output: Conversational explanation with eligibility      │
└────────────────────┬────────────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────────────┐
│ STEP 6: Response Formatting                              │
│ Structure:                                                │
│ • Greeting: "Great news! You're eligible for..."        │
│ • Schemes: Name, benefits, why eligible                 │
│ • CTA: "Click 'Send SMS' to get apply links"           │
└─────────────────────────────────────────────────────────┘

Total Time: ~1.7s (well under 3s requirement)
```

### Eligibility Engine Logic

**Design Philosophy**: Fail-safe filtering (better to show 0 results than wrong results)

```python
def is_eligible(user: UserProfile, scheme: Scheme) -> tuple[bool, str]:
    """
    Returns (is_eligible, reason) tuple
    reason explains why user is/isn't eligible
    """
    reasons = []
    
    # Age Check
    if not (scheme.age_min <= user.age <= scheme.age_max):
        return False, f"Age {user.age} is outside range {scheme.age_min}-{scheme.age_max}"
    reasons.append(f"Age {user.age} is within range")
    
    # Income Check
    if user.income > scheme.income_max:
        return False, f"Income ₹{user.income} exceeds limit ₹{scheme.income_max}"
    reasons.append(f"Income ₹{user.income} is below limit")
    
    # Category Check
    if scheme.category != "ALL" and scheme.category != user.category:
        return False, f"Category {user.category} doesn't match {scheme.category}"
    reasons.append(f"Category {user.category} matches")
    
    # State Check
    if scheme.state != "ALL" and scheme.state != user.state:
        return False, f"State {user.state} doesn't match {scheme.state}"
    reasons.append(f"State {user.state} matches")
    
    return True, " • ".join(reasons)

# Example Usage
user = UserProfile(age=20, income=200000, state="Maharashtra", category="General")
scheme = Scheme(name="Merit Scholarship", age_min=18, age_max=25, 
                income_max=250000, state="ALL", category="ALL")

eligible, reason = is_eligible(user, scheme)
# Returns: (True, "Age 20 is within range • Income ₹200000 is below limit • Category General matches • State Maharashtra matches")
```

**Edge Cases Handled**:
- User income = 0 (unemployed) → Still eligible
- User age at boundary (e.g., 18 when min is 18) → Eligible
- Scheme state = "ALL" → Matches any user state
- Scheme category = "ALL" → Matches any user category
- Multiple schemes with same name → Deduplicate by ID

### Prompt Template (Anti-Hallucination)

```python
SYSTEM_PROMPT = """You are a helpful assistant for BharatConnect AI, explaining government scholarship schemes to Indian citizens.

CRITICAL RULES:
1. ONLY use information from the provided scheme data
2. DO NOT make up scheme names, benefits, or eligibility criteria
3. If asked about a scheme not in the data, say "I don't have information about that"
4. Explain in simple language (5th-grade reading level)
5. Be encouraging and supportive

Your goal: Help users understand which schemes they're eligible for and why.
"""

USER_PROMPT_TEMPLATE = """
User Profile:
- Age: {age} years
- Annual Family Income: ₹{income}
- State: {state}
- Category: {category}

Eligible Schemes (retrieved from database):
{schemes_json}

Task:
1. Greet the user warmly
2. Explain each scheme in 2-3 sentences:
   - What it offers (benefits)
   - Why they're eligible (based on their profile)
   - One key requirement (e.g., "You'll need your income certificate")
3. End with: "Click 'Send SMS' to get the application link on your phone"

Keep total response under 200 words. Use simple Hindi-English words where helpful (e.g., "income certificate" = "aay praman patra").
"""

# Example Output:
"""
Great news! You're eligible for 3 scholarships:

1. **Post Matric Scholarship for SC/ST Students**
   This gives ₹10,000 per year for college fees. You qualify because you're 20 years old, 
   your family income is ₹2 lakhs (below the ₹2.5L limit), and you're from the SC category.
   You'll need your caste certificate.

2. **Maharashtra State Merit Scholarship**
   This provides ₹15,000 for students scoring above 75%. You're eligible because you're 
   from Maharashtra and your income is below ₹3 lakhs. Keep your mark sheets ready.

3. **National Means-cum-Merit Scholarship**
   This offers ₹12,000 per year for meritorious students. You qualify based on your age 
   and income. You'll need your school leaving certificate.

Click 'Send SMS' to get these application links on your phone!
"""
```

**Why This Works**:
- Explicit "DO NOT" instructions prevent hallucination
- Structured output format ensures consistency
- Word limit prevents rambling
- Examples in prompt guide tone and style
- Temperature 0.3 reduces creativity (we want accuracy, not creativity)

## Frontend Design

### Page Structure

#### Landing Page
- Hero section with tagline
- "Start with Voice" button (large, prominent)
- "Or type your query" text input
- Language selector (English, Hindi, Tamil, etc.)

#### Chat Interface
- Message history (scrollable)
- User messages (right-aligned, blue)
- AI messages (left-aligned, gray)
- Voice input button (bottom, always visible)
- Text input field (bottom)

#### Results Card
- Scheme name (bold, large)
- Benefits (bullet points)
- Eligibility reason (highlighted)
- "Send SMS" button
- "View Application" link

### Voice Input Flow

1. User clicks microphone button
2. Browser requests microphone permission
3. Web Speech API starts listening
4. Real-time transcription shown
5. User clicks "Stop" or auto-stop after 5s silence
6. Transcribed text sent to backend

### Mobile Responsiveness

- Single column layout
- Touch targets: 48px minimum
- Font size: 16px minimum (prevent zoom on iOS)
- Fixed bottom input bar
- Sticky header with logo

## Session Management

### Session Storage
```python
sessions = {
    "session_id": {
        "user_profile": {...},
        "conversation_history": [...],
        "created_at": datetime,
        "last_active": datetime
    }
}
```

### Session Lifecycle
- Created on first message
- Expires after 30 minutes of inactivity
- Cleared on browser close (no persistence)

## Error Handling Strategy

### AI Service Failure
```python
try:
    response = llm.generate(prompt)
except Exception:
    return "System is temporarily unavailable. Please try again."
```

### SMS Failure
```python
try:
    twilio.send_sms(phone, message)
except Exception:
    return {
        "status": "failed",
        "fallback": "apply_link",
        "message": "SMS failed. Here's the link: {link}"
    }
```

### Invalid Input
```python
if not (1 <= age <= 100):
    raise ValidationError("Age must be between 1 and 100")
```

## Demo Mode Features

### Configuration
```python
DEMO_MODE = os.getenv("DEMO_MODE", "false").lower() == "true"
```

### Visual Enhancements (When DEMO_MODE=true)

1. **AI Pipeline Visualization**
   ```
   Step 1: Understanding your query... ✓
   Step 2: Searching 25 scholarship schemes... ✓
   Step 3: Checking your eligibility... ✓
   Step 4: Found 3 matching schemes! ✓
   ```

2. **Eligibility Logic Highlight**
   - Show each filter step with checkmarks
   - Display: "✓ Age 20 is within 18-25"
   - Display: "✓ Income ₹2L is below ₹2.5L limit"
   - Display: "✓ Category SC matches scheme requirement"

3. **Artificial Delays (for dramatic effect)**
   - 500ms after each step
   - Total added delay: 1.5s
   - Makes AI feel "thoughtful" not instant

4. **Transparency Panel**
   - Show vector similarity scores
   - Show which schemes were filtered out and why
   - Example: "Scheme X excluded: Income too high"

5. **Analytics Display**
   - "Searched 25 schemes in 0.12s"
   - "Found 8 relevant, 3 eligible"
   - "Response generated in 1.8s"

### Demo Mode UI Components

```jsx
{DEMO_MODE && (
  <div className="demo-panel">
    <h3>🔍 AI Decision Process</h3>
    <ul>
      <li className="complete">Query embedded (384 dimensions)</li>
      <li className="complete">Vector search: 8 results (similarity > 0.6)</li>
      <li className="complete">Eligibility filter: 3 matches</li>
      <li className="complete">Response generated (GPT-3.5)</li>
    </ul>
    <p className="stats">
      Total time: 1.8s | Schemes searched: 25 | Eligible: 3
    </p>
  </div>
)}
```

**Why This Matters for Judges**:
- Shows technical sophistication (not just a chatbot)
- Demonstrates understanding of AI pipeline
- Builds trust through transparency
- Differentiates from "black box" solutions

## Security Considerations

### Input Sanitization
- Strip HTML tags from user messages
- Validate phone numbers with regex: `^[6-9]\d{9}$`
- Limit message length: 500 characters
- Rate limiting: 10 requests per minute per IP

### API Key Management
- Store in .env file
- Never commit to git (.gitignore)
- Use environment variables in production
- Rotate keys regularly

### CORS Configuration
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://yourdomain.com"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"]
)
```

## Deployment Architecture

### Docker Setup

**Backend Dockerfile**:
```dockerfile
FROM python:3.10-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Frontend Dockerfile**:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json .
RUN npm install
COPY . .
RUN npm run build
CMD ["npm", "run", "preview"]
```

**docker-compose.yml**:
```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    env_file:
      - .env
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend
```

### Environment Variables

```
# .env.example
OPENAI_API_KEY=your_key_here
TWILIO_ACCOUNT_SID=your_sid_here
TWILIO_AUTH_TOKEN=your_token_here
TWILIO_PHONE_NUMBER=+1234567890
DEMO_MODE=false
```

## Testing Strategy

### 1. Unit Tests (pytest)

```python
# tests/test_eligibility.py
def test_eligibility_age_within_range():
    user = UserProfile(age=20, income=100000, state="Maharashtra", category="General")
    scheme = Scheme(age_min=18, age_max=25, income_max=200000, state="ALL", category="ALL")
    assert is_eligible(user, scheme)[0] == True

def test_eligibility_age_below_range():
    user = UserProfile(age=15, income=100000, state="Maharashtra", category="General")
    scheme = Scheme(age_min=18, age_max=25, income_max=200000, state="ALL", category="ALL")
    assert is_eligible(user, scheme)[0] == False

def test_eligibility_income_exceeds_limit():
    user = UserProfile(age=20, income=300000, state="Maharashtra", category="General")
    scheme = Scheme(age_min=18, age_max=25, income_max=200000, state="ALL", category="ALL")
    assert is_eligible(user, scheme)[0] == False

def test_eligibility_category_mismatch():
    user = UserProfile(age=20, income=100000, state="Maharashtra", category="General")
    scheme = Scheme(age_min=18, age_max=25, income_max=200000, state="ALL", category="SC")
    assert is_eligible(user, scheme)[0] == False

def test_eligibility_all_category_matches_any():
    user = UserProfile(age=20, income=100000, state="Maharashtra", category="OBC")
    scheme = Scheme(age_min=18, age_max=25, income_max=200000, state="ALL", category="ALL")
    assert is_eligible(user, scheme)[0] == True

# tests/test_vector_search.py
def test_embedding_generation():
    query = "I need a scholarship"
    embedding = get_query_embedding(query)
    assert embedding.shape == (384,)
    assert np.linalg.norm(embedding) > 0

def test_vector_search_returns_top_k():
    query = "engineering scholarship"
    results = search_schemes(query, k=5)
    assert len(results) <= 5
    assert all(score > 0.6 for _, score in results)

# tests/test_llm.py
def test_llm_no_hallucination():
    """Ensure LLM doesn't make up scheme names"""
    schemes = [Scheme(name="Real Scheme", benefits="₹10,000")]
    response = generate_response(schemes)
    assert "Real Scheme" in response
    assert "Fake Scheme" not in response
```

### 2. Integration Tests (pytest + httpx)

```python
# tests/test_api.py
from fastapi.testclient import TestClient

client = TestClient(app)

def test_chat_endpoint():
    response = client.post("/chat", json={
        "session_id": "test-123",
        "message": "I need a scholarship",
        "user_profile": {
            "age": 20,
            "income": 200000,
            "state": "Maharashtra",
            "category": "General"
        }
    })
    assert response.status_code == 200
    assert "schemes" in response.json()

def test_eligibility_endpoint():
    response = client.post("/eligibility", json={
        "age": 20,
        "income": 200000,
        "state": "Maharashtra",
        "category": "General"
    })
    assert response.status_code == 200
    assert "eligible_schemes" in response.json()

def test_sms_endpoint_valid_phone():
    response = client.post("/sms", json={
        "phone": "9876543210",
        "scheme_id": "scheme_1"
    })
    assert response.status_code == 200
    assert response.json()["status"] in ["sent", "failed"]

def test_sms_endpoint_invalid_phone():
    response = client.post("/sms", json={
        "phone": "123",  # Invalid
        "scheme_id": "scheme_1"
    })
    assert response.status_code == 400
```

### 3. E2E Tests (Playwright)

```javascript
// tests/e2e/user-flow.spec.js
test('complete user journey', async ({ page }) => {
  // 1. Open landing page
  await page.goto('http://localhost:3000');
  await expect(page.locator('h1')).toContainText('BharatConnect AI');
  
  // 2. Type query
  await page.fill('input[placeholder="Ask me anything"]', 'I need a scholarship');
  await page.click('button[type="submit"]');
  
  // 3. Answer profile questions
  await page.fill('input[name="age"]', '20');
  await page.fill('input[name="income"]', '200000');
  await page.selectOption('select[name="state"]', 'Maharashtra');
  await page.selectOption('select[name="category"]', 'General');
  await page.click('button:has-text("Submit")');
  
  // 4. Verify results
  await expect(page.locator('.scheme-card')).toHaveCount(3);
  await expect(page.locator('.scheme-card').first()).toContainText('eligible');
  
  // 5. Test SMS button
  await page.click('button:has-text("Send SMS")');
  await page.fill('input[name="phone"]', '9876543210');
  await page.click('button:has-text("Send")');
  await expect(page.locator('.success-message')).toBeVisible();
});

test('voice input flow', async ({ page, context }) => {
  await context.grantPermissions(['microphone']);
  await page.goto('http://localhost:3000');
  
  // Click voice button
  await page.click('button[aria-label="Voice input"]');
  await expect(page.locator('.recording-indicator')).toBeVisible();
  
  // Simulate voice input (mock Web Speech API)
  await page.evaluate(() => {
    window.mockSpeechRecognition.simulateResult('I need a scholarship');
  });
  
  await expect(page.locator('.chat-message')).toContainText('I need a scholarship');
});
```

### 4. Load Testing (Locust)

```python
# tests/load_test.py
from locust import HttpUser, task, between

class ScholarshipUser(HttpUser):
    wait_time = between(1, 3)
    
    @task(3)
    def search_scholarships(self):
        self.client.post("/chat", json={
            "session_id": f"user-{self.user_id}",
            "message": "I need a scholarship",
            "user_profile": {
                "age": 20,
                "income": 200000,
                "state": "Maharashtra",
                "category": "General"
            }
        })
    
    @task(1)
    def send_sms(self):
        self.client.post("/sms", json={
            "phone": "9876543210",
            "scheme_id": "scheme_1"
        })

# Run: locust -f tests/load_test.py --host=http://localhost:8000
# Target: 100 concurrent users, < 3s response time
```

### 5. AI Hallucination Tests

```python
# tests/test_hallucination.py
def test_llm_only_uses_provided_schemes():
    """Ensure LLM doesn't invent schemes"""
    schemes = load_schemes()
    scheme_names = {s.name for s in schemes}
    
    response = generate_response(schemes)
    
    # Extract mentioned scheme names from response
    mentioned_schemes = extract_scheme_names(response)
    
    # All mentioned schemes must be in original data
    assert mentioned_schemes.issubset(scheme_names)

def test_llm_doesnt_make_up_benefits():
    """Ensure LLM doesn't invent benefit amounts"""
    scheme = Scheme(name="Test Scheme", benefits="₹10,000 per year")
    response = generate_response([scheme])
    
    # Should mention ₹10,000, not other amounts
    assert "₹10,000" in response or "10000" in response
    assert "₹50,000" not in response  # Made-up amount
```

### Test Coverage Goals

- Unit tests: 90% code coverage
- Integration tests: All API endpoints
- E2E tests: Critical user paths
- Load tests: 100 concurrent users
- AI tests: Zero hallucination tolerance

### CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.10'
      - run: pip install -r requirements.txt
      - run: pytest tests/ --cov=app --cov-report=xml
      - run: playwright install
      - run: playwright test
      - uses: codecov/codecov-action@v3
```

## Performance Optimization

### Caching Strategy

```python
from functools import lru_cache
import redis

# 1. Embedding Cache (in-memory)
@lru_cache(maxsize=1000)
def get_query_embedding(query: str) -> np.ndarray:
    """Cache embeddings for repeated queries"""
    return embedding_model.encode(query)

# 2. Scheme Embeddings (pre-computed at startup)
SCHEME_EMBEDDINGS = None  # Loaded once, never recomputed

def load_scheme_embeddings():
    global SCHEME_EMBEDDINGS
    if SCHEME_EMBEDDINGS is None:
        schemes = load_schemes()
        SCHEME_EMBEDDINGS = {
            scheme.id: embedding_model.encode(scheme.description)
            for scheme in schemes
        }
    return SCHEME_EMBEDDINGS

# 3. LLM Response Cache (Redis, optional)
redis_client = redis.Redis(host='localhost', port=6379, decode_responses=True)

def get_cached_response(user_profile_hash: str, scheme_ids: list) -> str:
    """Cache LLM responses for identical queries"""
    cache_key = f"response:{user_profile_hash}:{','.join(sorted(scheme_ids))}"
    cached = redis_client.get(cache_key)
    if cached:
        return cached
    
    response = generate_llm_response(user_profile, schemes)
    redis_client.setex(cache_key, 3600, response)  # 1 hour TTL
    return response
```

### Vector Search Optimization

```python
import faiss

# Use IndexFlatIP for exact cosine similarity (fast for < 10K vectors)
dimension = 384
index = faiss.IndexFlatIP(dimension)

# Normalize vectors for cosine similarity
faiss.normalize_L2(scheme_embeddings)
index.add(scheme_embeddings)

# Search with optimized parameters
k = 10  # Top 10 results
query_vector = get_query_embedding(user_query)
faiss.normalize_L2(query_vector)
distances, indices = index.search(query_vector, k)

# Filter by similarity threshold
results = [
    (indices[i], distances[i]) 
    for i in range(k) 
    if distances[i] > 0.6  # Cosine similarity threshold
]
```

**Performance Benchmarks** (on 25 schemes):
- Embedding generation: 50ms
- FAISS search: 100ms
- Eligibility filtering: 10ms
- LLM generation: 1500ms
- **Total: ~1.7s** (target: < 3s) ✓

### Frontend Optimization

```javascript
// 1. Debounce text input
const debouncedSearch = useMemo(
  () => debounce((query) => sendMessage(query), 300),
  []
);

// 2. Lazy load chat history
const [messages, setMessages] = useState([]);
const visibleMessages = messages.slice(-20);  // Show last 20 only

// 3. Optimize images
// Use WebP format, lazy loading, responsive sizes
<img 
  src="logo.webp" 
  loading="lazy" 
  srcSet="logo-small.webp 480w, logo-large.webp 1080w"
  alt="BharatConnect AI"
/>

// 4. Code splitting
const ResultsCard = lazy(() => import('./ResultsCard'));

// 5. Service Worker for offline support
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}
```

### Database Optimization (Future: PostgreSQL)

```sql
-- Index for fast eligibility queries
CREATE INDEX idx_eligibility ON schemes (
  age_min, age_max, income_max, state, category
);

-- Query optimization
SELECT * FROM schemes
WHERE age_min <= ? AND age_max >= ?
  AND income_max >= ?
  AND (state = ? OR state = 'ALL')
  AND (category = ? OR category = 'ALL')
LIMIT 10;
```

## Monitoring & Logging

### Logging Strategy
```python
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

logger.info(f"User query: {message}")
logger.info(f"Eligible schemes: {len(schemes)}")
logger.error(f"SMS failed: {error}")
```

### Metrics to Track
- API response times
- Vector search latency
- SMS delivery success rate
- User session duration
- Error rates by endpoint

## Future Enhancements (Post-Hackathon Roadmap)

### Phase 2: Multilingual Support
- Hindi, Tamil, Bengali, Telugu, Marathi interfaces
- LLM-based translation (GPT-4 or IndicTrans)
- Voice input in regional languages
- SMS in user's preferred language

### Phase 3: WhatsApp Integration
- Replace SMS with WhatsApp Business API
- Send rich media (images, PDFs)
- Two-way conversation via WhatsApp
- Status updates on application progress

### Phase 4: Scheme Expansion
- Healthcare schemes (Ayushman Bharat, etc.)
- Employment schemes (MGNREGA, skill development)
- Housing schemes (PMAY)
- Agriculture schemes (PM-KISAN)

### Phase 5: Personalization
- User accounts (optional, not required)
- Application tracking dashboard
- Scheme recommendations based on history
- Email/WhatsApp alerts for new schemes

### Phase 6: Government Integration
- API integration with National Scholarship Portal
- Real-time scheme updates
- Application status tracking
- Direct form submission (if APIs available)

### Phase 7: Analytics Dashboard
- Usage metrics (queries, SMS sent, conversions)
- Scheme gap analysis (most requested but unavailable)
- Geographic heatmap of users
- A/B testing for UX improvements

### Phase 8: Offline Mode
- Progressive Web App (PWA)
- Offline scheme database
- Queue SMS requests for later
- Sync when online

### Scalability Roadmap

**Current (MVP)**: 100 concurrent users
- Single server (Railway/Render)
- In-memory FAISS
- No caching

**Phase 1 (1K users)**: 
- Redis for session + cache
- PostgreSQL for schemes
- Load balancer (2 backend instances)

**Phase 2 (10K users)**:
- Kubernetes cluster (auto-scaling)
- Managed vector DB (Pinecone/Weaviate)
- CDN for frontend (Cloudflare)
- Separate LLM service

**Phase 3 (100K users)**:
- Microservices architecture
- Message queue (RabbitMQ/Kafka)
- Distributed tracing (Jaeger)
- Multi-region deployment

### Monetization Strategy (If Needed)

1. **Freemium Model**:
   - Free: 5 queries/day, SMS delivery
   - Premium: Unlimited queries, WhatsApp, application tracking

2. **B2B Partnerships**:
   - License to NGOs, schools, government agencies
   - White-label solution for state governments

3. **Affiliate Revenue**:
   - Partner with education loan providers
   - Earn commission on successful applications

4. **Grants & CSR**:
   - Apply for government innovation grants
   - Corporate CSR funding (education sector)

### Success Metrics (6-Month Goals)

- **Users**: 10,000 unique users
- **Engagement**: 40% SMS conversion rate
- **Satisfaction**: 4.5/5 average rating
- **Impact**: 2,500 successful applications
- **Performance**: 99.5% uptime, < 2s response time
- **Cost**: < ₹50,000/month operational cost

## Technical Decision Log

### Why FastAPI over Flask/Django?
- **Async support**: Better for I/O-bound operations (LLM calls, SMS)
- **Auto-generated docs**: Swagger UI out of the box
- **Type safety**: Pydantic models prevent bugs
- **Performance**: 2-3x faster than Flask
- **Modern**: Built for Python 3.10+ with async/await

### Why FAISS over Pinecone/Weaviate?
- **Cost**: Free, no API limits
- **Speed**: In-memory, < 100ms search
- **Simplicity**: No external service dependencies
- **Sufficient**: 25 schemes don't need distributed vector DB
- **Upgrade path**: Can migrate to Pinecone later

### Why React over Next.js?
- **Simplicity**: No SSR needed for this use case
- **Speed**: Vite is faster than Next.js for development
- **Flexibility**: Easier to deploy frontend separately
- **Learning curve**: More developers know React than Next.js

### Why Sentence-Transformers over OpenAI Embeddings?
- **Cost**: Free, no API calls
- **Speed**: Local inference, no network latency
- **Privacy**: No data sent to external services
- **Quality**: all-MiniLM-L6-v2 is sufficient for 25 schemes

### Why SMS over WhatsApp (for MVP)?
- **Simplicity**: Twilio SMS API is easier than WhatsApp Business
- **Reach**: SMS works on all phones, WhatsApp requires smartphone
- **Cost**: SMS is cheaper for low volume
- **Approval**: WhatsApp Business requires approval (takes days)

### Why JSON over PostgreSQL (for MVP)?
- **Simplicity**: No database setup, migrations, or ORM
- **Speed**: Faster development, easier to iterate
- **Sufficient**: 25 schemes fit in memory
- **Portability**: Easy to version control, share, and deploy
- **Upgrade path**: Can migrate to PostgreSQL in Phase 2

### Why OpenAI over Ollama (for Demo)?
- **Reliability**: OpenAI has better uptime than self-hosted
- **Quality**: GPT-3.5 is more consistent than Llama 3.1 8B
- **Speed**: OpenAI API is faster than local inference
- **Fallback**: Can switch to Ollama if API fails
- **Note**: Provide both options in code for flexibility

### Why Web Speech API over Whisper?
- **Cost**: Free, no API calls
- **Speed**: Real-time transcription, no upload delay
- **UX**: Works directly in browser, no backend needed
- **Simplicity**: No audio file handling, storage, or processing
- **Limitation**: Only works in Chrome/Safari (acceptable for demo)

## Appendix: Scheme Data Example

```json
{
  "id": "maha_merit_2024",
  "name": "Maharashtra State Merit Scholarship",
  "state": "Maharashtra",
  "category": "ALL",
  "income_max": 800000,
  "age_min": 16,
  "age_max": 25,
  "benefits": "₹15,000 per year for students scoring above 75% in 12th standard. Covers tuition fees for undergraduate courses.",
  "documents": [
    "12th standard mark sheet",
    "Income certificate (below ₹8 lakhs)",
    "Domicile certificate (Maharashtra)",
    "Bank account details",
    "Aadhaar card"
  ],
  "apply_link": "https://mahadbt.maharashtra.gov.in/SchemeData/SchemeData?str=E9DDFA703C38E51A5D106F1E8C1F6D3F",
  "description": "Merit-based scholarship for Maharashtra students pursuing higher education. Open to all categories. Requires 75% marks in 12th standard.",
  "deadline": "2024-12-31",
  "provider": "Government of Maharashtra"
}
```

## Conclusion

This design document outlines a production-ready, hackathon-winning solution that:
- Solves a real problem (60% non-application rate)
- Uses cutting-edge AI (RAG, LLM, vector search)
- Prioritizes accessibility (voice-first, mobile-first)
- Demonstrates technical depth (hybrid AI, anti-hallucination, performance optimization)
- Shows scalability thinking (Docker, caching, load testing)
- Has clear impact metrics (10K users, 2.5K applications)

**Next Steps**: Implement Phase 1-8 from Instructions.txt, starting with folder structure and data layer.
