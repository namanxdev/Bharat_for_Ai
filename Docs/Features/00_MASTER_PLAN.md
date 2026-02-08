# BharatConnect AI — Master Implementation Plan

## For AI Agents: Read This First

This is the master guide that ties together all feature READMEs. **Read the feature files in order** and implement them sequentially. Each feature builds on the previous one.

---

## Project Summary

**BharatConnect AI** is a voice-first web app helping Indian citizens discover government scholarship schemes via conversational AI. Users answer 4 questions (age, income, state, category) and receive personalized scheme recommendations with SMS delivery.

**Current State**: Working prototype with mock data, basic Gemini integration, FAISS vector search, and 2 frontend views (home + chat).

---

## Implementation Order (Critical Path)

```
Phase 1: Backend Foundation
  ├── 01_DATABASE_POSTGRES.md        ← DO THIS FIRST
  │     PostgreSQL + SQLAlchemy + Alembic
  │     Replaces: hardcoded SCHEMES list, in-memory sessions
  │
  ├── 03_PGVECTOR_SEARCH.md          ← Depends on 01
  │     pgvector extension + embedding service
  │     Replaces: FAISS in-memory index
  │
  └── 02_LANGCHAIN_GEMINI_AGENT.md   ← Depends on 01 + 03
        LangChain agent with tools
        Replaces: basic Gemini API call

Phase 2: Data
  └── 07_SCHEME_DATA_SOURCES.md      ← Depends on 01
        Real scheme data + scraping guide
        Replaces: 10 mock schemes with 50+ real ones

Phase 3: Frontend
  ├── 04_FRONTEND_PAGES.md           ← Independent (can start during Phase 1)
  │     6 new pages + routing
  │     Adds: Schemes, SchemeDetail, Results, About, Help, Profile
  │
  └── 05_UI_IMPROVEMENTS.md          ← Depends on 04
        Polish, loading states, toasts, accessibility
        Fixes: progress stepper, select dropdowns, skeletons

Phase 4: Quality
  └── 06_E2E_TESTING.md              ← Depends on all above
        Playwright + Vitest + expanded pytest suite
        Adds: component tests, E2E flows, integration tests
```

---

## Dependency Graph

```
01_DATABASE_POSTGRES ──┬──► 03_PGVECTOR_SEARCH ──► 02_LANGCHAIN_AGENT
                       │
                       └──► 07_SCHEME_DATA_SOURCES
                       
04_FRONTEND_PAGES ────────► 05_UI_IMPROVEMENTS

All Features ─────────────► 06_E2E_TESTING
```

---

## Feature Files Reference

| # | File | Summary | Est. Hours |
|---|------|---------|------------|
| 01 | [01_DATABASE_POSTGRES.md](01_DATABASE_POSTGRES.md) | PostgreSQL + SQLAlchemy async + Alembic migrations + repository pattern | 6-8h |
| 02 | [02_LANGCHAIN_GEMINI_AGENT.md](02_LANGCHAIN_GEMINI_AGENT.md) | LangChain ReAct agent with tools, memory, and structured prompts | 5-7h |
| 03 | [03_PGVECTOR_SEARCH.md](03_PGVECTOR_SEARCH.md) | Replace FAISS with pgvector for semantic search | 4-5h |
| 04 | [04_FRONTEND_PAGES.md](04_FRONTEND_PAGES.md) | 6 new pages: Schemes, SchemeDetail, Results, About, Help, Profile | 10-14h |
| 05 | [05_UI_IMPROVEMENTS.md](05_UI_IMPROVEMENTS.md) | Progress stepper, toast system, skeletons, error boundaries, fixes | 6-8h |
| 06 | [06_E2E_TESTING.md](06_E2E_TESTING.md) | Playwright E2E, Vitest components, pytest integration tests | 8-10h |
| 07 | [07_SCHEME_DATA_SOURCES.md](07_SCHEME_DATA_SOURCES.md) | Real govt data sources, scraper, CSV/JSON import tools | 4-6h |

**Total**: ~43-58 hours of implementation work

---

## Architecture After All Features

### Backend
```
Backend/
├── main.py                     # FastAPI app with lifespan events
├── config.py                   # Settings with DB + LLM + agent config
├── database/
│   ├── __init__.py
│   ├── connection.py           # SQLAlchemy async engine + session
│   ├── models.py               # SchemeModel (with pgvector), SessionModel, EligibilityLog
│   ├── repositories.py         # SchemeRepository, SessionRepository
│   └── seed.py                 # Load schemes from JSON
├── services/
│   ├── llm_service.py          # LangChain Agent with Gemini
│   ├── agent_tools.py          # search_schemes, check_eligibility, get_scheme_details tools
│   ├── agent_prompts.py        # System prompt templates
│   ├── embedding_service.py    # Gemini or sentence-transformer embeddings
│   ├── vector_service.py       # pgvector-based semantic search
│   └── sms_service.py          # Twilio SMS (unchanged)
├── routes/
│   ├── chat.py                 # Uses agent + DB sessions
│   ├── eligibility.py          # Uses SchemeRepository
│   ├── schemes.py              # NEW — browse/search all schemes
│   ├── sms.py                  # Uses SchemeRepository for lookup
│   └── health.py               # Includes DB health check
├── data/
│   ├── schemes.py              # Deprecated — kept for fallback
│   └── schemes_real.json       # Real scheme data
├── scripts/
│   ├── scrape_schemes.py       # Web scraper
│   ├── extract_schemes_ai.py   # AI extraction
│   └── import_csv.py           # CSV import
├── alembic/                    # Database migrations
│   └── versions/
└── test/
    ├── conftest.py             # With DB fixtures
    ├── test_integration.py     # Full flow tests
    ├── test_repositories.py    # DB query tests
    └── ... existing tests ...
```

### Frontend
```
frontend/src/
├── App.jsx                     # With routing + all views
├── main.jsx                    # RouterProvider
├── router.jsx                  # React Router config
├── context/
│   ├── AppContext.jsx          # Extended with new state
│   └── ToastContext.jsx        # Toast notification system
├── hooks/
│   └── usePageTitle.js         # Dynamic page titles
├── components/
│   ├── HeroSection.jsx         # Fixed 3D card, better mobile
│   ├── ChatView.jsx            # + progress stepper
│   ├── ChatInterface.jsx       # + timestamps, markdown
│   ├── SchemeCard.jsx          # + bookmark, match strength
│   ├── SMSModal.jsx            # (unchanged)
│   ├── VoiceInput.jsx          # (unchanged)
│   ├── SchemesPage.jsx         # NEW — browse all schemes
│   ├── SchemeDetailPage.jsx    # NEW — single scheme detail
│   ├── ResultsPage.jsx         # NEW — eligibility results
│   ├── AboutPage.jsx           # NEW — about the app
│   ├── HelpPage.jsx            # NEW — FAQ + support
│   ├── ProfilePage.jsx         # NEW — user profile
│   ├── ErrorBoundary.jsx       # NEW — error handling
│   └── ui/
│       ├── ... existing 15 components ...
│       ├── select.jsx           # NEW
│       ├── toast.jsx            # NEW
│       ├── skeleton.jsx         # NEW
│       ├── accordion.jsx        # NEW
│       ├── slider.jsx           # NEW
│       ├── tabs.jsx             # NEW
│       └── progress.jsx         # NEW
├── services/
│   └── api.js                  # + getSchemes, getSchemeById
├── data/
│   └── schemes.js              # Kept for offline fallback
├── test/
│   ├── setup.js
│   └── components/
│       ├── SchemeCard.test.jsx
│       ├── ChatView.test.jsx
│       └── AppContext.test.jsx
└── e2e/                        # Playwright tests (in frontend/)
    ├── home.spec.js
    ├── chat-flow.spec.js
    └── navigation.spec.js
```

---

## Environment Variables (Complete)

```env
# Backend/.env

# Database (Feature 01)
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/bharatconnect
DATABASE_URL_SYNC=postgresql+psycopg2://postgres:postgres@localhost:5432/bharatconnect
DB_POOL_SIZE=5
DB_MAX_OVERFLOW=10

# Gemini AI (Feature 02)
GOOGLE_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.0-flash
GEMINI_TEMPERATURE=0.3
GEMINI_MAX_TOKENS=1024
AGENT_MAX_ITERATIONS=5

# Twilio SMS (existing)
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=+1234567890

# Server (existing)
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
SESSION_TIMEOUT_MINUTES=30
```

```env
# Frontend/.env
VITE_API_URL=http://localhost:8000
```

---

## How to Use These Guides

### For an AI Agent:
1. Read `00_MASTER_PLAN.md` (this file) first for context
2. Start with `01_DATABASE_POSTGRES.md` — implement every step
3. After each feature, run the verification checklist at the bottom
4. Move to the next feature in the dependency order
5. Always refer back to the existing code referenced in "Current State" sections
6. Preserve backward compatibility — existing API contracts must not break
7. Keep the mock/fallback behavior when services are unavailable

### For a Human Developer:
1. Set up PostgreSQL locally (or use Docker)
2. Follow the features in order
3. Each feature has exact file paths, code snippets, and verification steps
4. The frontend features (04, 05) can be done in parallel with backend work

---

## Key Principles

1. **Backward Compatibility**: Every change must keep the existing API working. Frontend demo mode (no backend) must still function.
2. **Graceful Degradation**: If PostgreSQL is down, fall back to in-memory data. If Gemini API is unavailable, use template responses. If pgvector extension is missing, use keyword search.
3. **Existing Conventions**: Use `@/` imports, `cn()` utility, Framer Motion, Indian flag colors, dark mode.
4. **No Breaking Changes**: The existing 10 schemes, the chat flow, the SMS functionality — all must continue working.
5. **Test Everything**: Each feature has a verification checklist. Run it before moving on.

---

## Quick Start (Resume Work)

```bash
# Backend
cd /path/to/ai_for_bharat
source Backend/venv/bin/activate  # or Backend\venv\Scripts\activate on Windows
uvicorn Backend.main:app --reload

# Frontend
cd frontend
npm run dev

# PostgreSQL (Docker)
docker run -d --name bharatconnect-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=bharatconnect \
  -p 5432:5432 postgres:16

# Tests
python Backend/run_tests.py       # Backend tests
cd frontend && npm test           # Frontend tests
```
