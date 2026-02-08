# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BharatConnect AI is a voice-first web application that helps Indian citizens discover government scholarship schemes through conversational AI. Users answer 4 questions (age, income, state, category) and receive personalized eligible schemes with SMS delivery of application links. The frontend works in demo mode with mock API fallbacks when no backend is running.

## Repository Structure

- `/frontend` — React + Vite SPA (the main codebase; frontend dev commands run from here)
- `/Backend` — FastAPI Python backend (API server, services, routes)
  - `/Backend/routes` — API route handlers (chat, eligibility, sms, health)
  - `/Backend/services` — Business logic (vector_service, llm_service, sms_service)
  - `/Backend/models` — Pydantic schemas
  - `/Backend/data` — Scheme data and seed data
  - `/Backend/utils` — Utilities (rate limiting)
  - `/Backend/test` — pytest test suite
- `/Design.md` — Full system architecture and AI pipeline design document
- `/requirements.md` — Product requirements, functional specs, and success criteria

## Development Commands

### Frontend

All frontend commands run from the `frontend/` directory:

```bash
cd frontend
npm run dev        # Start dev server with HMR (Vite)
npm run build      # Production build to dist/
npm run lint       # ESLint (v9 flat config)
npm run preview    # Preview production build locally
```

### Backend

All backend commands run from the **project root** directory:

```bash
# Activate virtual environment first
# Windows: Backend\venv\Scripts\activate
# Linux/Mac: source Backend/venv/bin/activate

uvicorn Backend.main:app --reload   # Start dev server with hot reload on port 8000
python Backend/run_tests.py         # Run pytest test suite
```

Backend uses relative imports — always run uvicorn from the project root as `Backend.main:app`, not from inside the Backend directory.

## Tech Stack

### Frontend
- **React 19** with JSX (not TypeScript)
- **Vite 7** build tool
- **Tailwind CSS 4** via `@tailwindcss/vite` plugin (not PostCSS)
- **Framer Motion** for animations and page transitions
- **Lucide React** + **React Icons** for icons
- **ESLint 9** flat config with React Hooks and React Refresh plugins

### Backend
- **Python 3.13** with **FastAPI**
- **Pydantic Settings** for config management (loads from `.env`)
- **Uvicorn** ASGI server
- **Google Gemini** (optional) for LLM responses
- **Twilio** (optional) for SMS delivery
- **FAISS** + **sentence-transformers** (optional) for vector search
- **pytest** for testing
- All services have graceful fallbacks when optional dependencies are missing

## Architecture

### State Management

Single global context using `useReducer` in `src/context/AppContext.jsx`. The `useApp()` hook provides both state and memoized action dispatchers. State tracks: current view (`home`/`chat`/`results`), user profile fields, chat messages, eligible schemes, and UI state (typing indicator, SMS modal).

### View System

Three views controlled by `state.view` with `AnimatePresence` transitions:
- **home** — `HeroSection` landing page with voice/chat entry points
- **chat** — `ChatView` with sequential question flow collecting user profile
- **results** — Eligible schemes display with `SchemeCard` components

Navigation via `FloatingDock` component at the bottom.

### Conversational Flow

`ChatInterface` drives a sequential question flow: age → income → state → category → complete. Each step validates input and updates `userProfile` in context. On completion, `getEligibleSchemes()` from `src/data/schemes.js` filters the 10 mock schemes by age range, income ceiling, category, and state.

### API Layer

`src/services/api.js` — Fetch-based client hitting `VITE_API_URL` (default: `http://localhost:8000`). Endpoints: `/chat`, `/eligibility`, `/sms`, `/health`. All API calls have mock fallback responses so the frontend works without a backend (demo mode).

### UI Components

`src/components/ui/` contains ~15 animated UI primitives (3d-card, spotlight, wavy-background, text-effects, shimmer-button, floating-dock, etc.). These are self-contained effect components, many using Framer Motion and simplex-noise. Feature components (`ChatInterface`, `SchemeCard`, `VoiceInput`, `SMSModal`) live directly in `src/components/`.

### Path Aliases

`@/` maps to `./src/` (configured in both `vite.config.js` and `jsconfig.json`). Always use `@/` imports.

## Key Conventions

- **Functional components only** with hooks (no class components)
- **useCallback** for all action dispatchers in context
- **Indian flag color theme**: saffron (#FF9933), green (#138808), navy (#000080) defined as CSS custom properties in `src/index.css`
- **Dark mode by default** with orange primary and green secondary in Tailwind
- **Font**: Outfit (loaded via Google Fonts in `index.html`)
- **`cn()` utility** in `src/lib/utils.js` combines `clsx` + `tailwind-merge` for conditional class names

## Environment Variables

### Frontend
- `VITE_API_URL` — Backend API base URL (defaults to `http://localhost:8000`). The frontend runs standalone in demo mode without this.

### Backend (set in `Backend/.env`)
- `GOOGLE_API_KEY` — Google Gemini API key (optional; LLM falls back to mock responses)
- `GEMINI_MODEL` — Gemini model name (default: `gemini-pro`)
- `TWILIO_ACCOUNT_SID` — Twilio account SID (optional; SMS falls back to mock)
- `TWILIO_AUTH_TOKEN` — Twilio auth token (optional)
- `TWILIO_PHONE_NUMBER` — Twilio sender phone number (optional)
- `CORS_ORIGINS` — Comma-separated allowed origins (defaults to localhost:5173 and localhost:3000)
- `SESSION_TIMEOUT_MINUTES` — Session timeout (default: 30)

## Data

`src/data/schemes.js` contains 10 mock government scholarship schemes with fields: id, name, state, category, income_max, age_min, age_max, benefits, documents, apply_link. Also exports `getEligibleSchemes(profile)` for client-side filtering and the `INDIAN_STATES` array. Categories: General, SC, ST, OBC, EWS, Minority.

## Backend Architecture

The Backend is a FastAPI application with service-layer architecture. Services are initialized at startup in `main.py` and injected into route modules. All services gracefully degrade when optional dependencies (FAISS, Gemini, Twilio) are unavailable.

- **Routes** (`/chat`, `/eligibility`, `/sms`, `/health`) — thin handlers that delegate to services
- **VectorService** — FAISS-based scheme search using sentence-transformers embeddings (falls back to keyword matching)
- **LLMService** — Google Gemini integration for conversational responses (falls back to template responses)
- **SMSService** — Twilio SMS delivery (falls back to mock/logging)
- **Config** — `pydantic_settings.BaseSettings` loading from `.env` with sensible defaults
- **Rate limiting** utility in `utils/rate_limit.py`

Backend uses **relative imports** throughout (e.g., `from .config import settings`). Always run from the project root.
