# Feature 06: End-to-End Testing

## Priority: MEDIUM (Quality assurance)
## Estimated Effort: 8-10 hours
## Depends On: Features 01-05 should be substantially complete first

---

## Overview

Implement comprehensive end-to-end testing covering the full user journey from landing page through chat interaction to scheme results. This includes both backend API integration tests (expanding the existing pytest suite) and frontend E2E tests using Playwright.

---

## Current State (What Exists)

### Backend Tests (`Backend/test/`)
- `conftest.py` — pytest fixtures (test client, mock services)
- `test_chat.py` — tests for `/chat` endpoint
- `test_eligibility.py` — tests for `/eligibility` endpoint
- `test_health.py` — tests for `/health` endpoint
- `test_root.py` — tests for `/` root endpoint
- `test_schemes.py` — tests for scheme data/eligibility functions
- `test_sms.py` — tests for `/sms` endpoint
- `pytest.ini` — pytest configuration
- **All tests use `httpx.AsyncClient`** with mocked services

### Frontend Tests
- **NONE** — no test files, no test framework installed
- No `vitest`, `jest`, `playwright`, or `cypress` configured

---

## Testing Stack to Add

| Layer | Tool | Purpose |
|-------|------|---------|
| Backend Unit | `pytest` (existing) | Service & data layer tests |
| Backend Integration | `pytest` + real PostgreSQL | API tests with real database |
| Frontend Unit | `vitest` + `@testing-library/react` | Component tests |
| Frontend E2E | `Playwright` | Full browser automation |
| API Contract | `pytest` + schema validation | Request/response contract tests |

---

## Part 1: Backend Testing Improvements

### Step 1: Update `Backend/test/conftest.py`

Add database test fixtures:
```python
"""
Test configuration and fixtures.
Supports both mocked tests (fast) and integration tests (with real DB).
"""
import pytest
import asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import text

# Test database URL (use a separate test database!)
TEST_DATABASE_URL = "postgresql+asyncpg://postgres:postgres@localhost:5432/bharatconnect_test"


@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests"""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
async def test_engine():
    """Create test database engine"""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    
    # Create tables
    from database.connection import Base
    async with engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        await conn.run_sync(Base.metadata.create_all)
    
    yield engine
    
    # Cleanup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest.fixture
async def db_session(test_engine):
    """Provide a clean database session per test"""
    session_factory = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        yield session
        await session.rollback()


@pytest.fixture
async def seeded_db(db_session):
    """Database session with seed data loaded"""
    from database.models import SchemeModel
    from data.schemes import SCHEMES
    
    for scheme_data in SCHEMES:
        scheme = SchemeModel(**scheme_data)
        db_session.add(scheme)
    await db_session.commit()
    
    yield db_session


@pytest.fixture
async def client():
    """HTTP test client with mocked services (no DB needed)"""
    from main import app
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
async def integration_client(seeded_db):
    """HTTP test client with real database"""
    from main import app
    # Override the database dependency
    from database.connection import get_db
    
    async def override_get_db():
        yield seeded_db
    
    app.dependency_overrides[get_db] = override_get_db
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    
    app.dependency_overrides.clear()
```

### Step 2: Add Integration Tests

**Create `Backend/test/test_integration.py`**:
```python
"""
Integration tests — full API flow with real PostgreSQL database.
These tests require a running PostgreSQL instance.

Run: pytest Backend/test/test_integration.py -m integration
"""
import pytest
import uuid

pytestmark = pytest.mark.integration


class TestFullChatFlow:
    """Test the complete chat flow: greeting → questions → eligibility → results"""

    async def test_complete_eligibility_flow(self, integration_client):
        """E2E: User completes all 4 questions and gets eligible schemes"""
        session_id = str(uuid.uuid4())

        # Step 1: Send initial greeting
        response = await integration_client.post("/chat", json={
            "session_id": session_id,
            "message": "Hello, I need help finding scholarships",
            "user_profile": {}
        })
        assert response.status_code == 200
        data = response.json()
        assert "age" in data["response"].lower() or data["next_question"] is not None

        # Step 2: Provide age
        response = await integration_client.post("/chat", json={
            "session_id": session_id,
            "message": "I am 20 years old",
            "user_profile": {"age": 20}
        })
        assert response.status_code == 200
        data = response.json()
        assert "income" in data["response"].lower() or data["next_question"] is not None

        # Step 3: Provide income
        response = await integration_client.post("/chat", json={
            "session_id": session_id,
            "message": "My family income is 200000 rupees",
            "user_profile": {"age": 20, "income": 200000}
        })
        assert response.status_code == 200

        # Step 4: Provide state
        response = await integration_client.post("/chat", json={
            "session_id": session_id,
            "message": "I am from Maharashtra",
            "user_profile": {"age": 20, "income": 200000, "state": "Maharashtra"}
        })
        assert response.status_code == 200

        # Step 5: Provide category → should trigger eligibility check
        response = await integration_client.post("/chat", json={
            "session_id": session_id,
            "message": "OBC",
            "user_profile": {"age": 20, "income": 200000, "state": "Maharashtra", "category": "OBC"}
        })
        assert response.status_code == 200
        data = response.json()
        # Should have eligible schemes now
        assert data["schemes"] is not None
        assert len(data["schemes"]) > 0

    async def test_eligibility_endpoint_integration(self, integration_client):
        """Test direct eligibility check with database"""
        response = await integration_client.post("/eligibility", json={
            "age": 20,
            "income": 200000,
            "state": "Maharashtra",
            "category": "OBC"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["count"] > 0
        assert "PM YASASVI" in str(data["eligible_schemes"])  # OBC scheme should match

    async def test_sms_with_valid_scheme(self, integration_client):
        """Test SMS endpoint with a scheme from database"""
        response = await integration_client.post("/sms", json={
            "phone": "9876543210",
            "scheme_id": "scheme_1"
        })
        assert response.status_code == 200
        assert response.json()["status"] in ["sent", "mock"]

    async def test_sms_with_invalid_scheme(self, integration_client):
        """Test SMS endpoint with non-existent scheme"""
        response = await integration_client.post("/sms", json={
            "phone": "9876543210",
            "scheme_id": "scheme_nonexistent"
        })
        assert response.status_code == 404


class TestSchemeData:
    """Test scheme data integrity in database"""

    async def test_all_schemes_loaded(self, integration_client):
        """Verify all 10 seed schemes are in database"""
        response = await integration_client.get("/schemes")
        assert response.status_code == 200
        data = response.json()
        assert data["count"] >= 10

    async def test_scheme_filtering(self, integration_client):
        """Test scheme filtering by state"""
        response = await integration_client.get("/schemes?state=Maharashtra")
        assert response.status_code == 200
        data = response.json()
        for scheme in data["schemes"]:
            assert scheme["state"] in ["Maharashtra", "ALL"]


class TestRateLimiting:
    """Test rate limiting behavior"""

    async def test_chat_rate_limit(self, integration_client):
        """Verify rate limiting kicks in after too many requests"""
        session_id = str(uuid.uuid4())
        
        for i in range(15):  # Exceed the 10 req/min limit
            response = await integration_client.post("/chat", json={
                "session_id": session_id,
                "message": f"test message {i}",
                "user_profile": {}
            })
            if response.status_code == 429:
                break
        
        assert response.status_code == 429


class TestHealthCheck:
    """Test health endpoint with real services"""

    async def test_health_with_db(self, integration_client):
        """Health check should report database status"""
        response = await integration_client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        # After database feature, this should show database status too
```

### Step 3: Add Database Repository Tests

**Create `Backend/test/test_repositories.py`**:
```python
"""
Tests for database repository layer.
"""
import pytest
from database.repositories import SchemeRepository, SessionRepository

pytestmark = pytest.mark.integration


class TestSchemeRepository:
    async def test_get_all_active(self, seeded_db):
        repo = SchemeRepository(seeded_db)
        schemes = await repo.get_all_active()
        assert len(schemes) == 10

    async def test_get_eligible_obc_maharashtra(self, seeded_db):
        repo = SchemeRepository(seeded_db)
        schemes = await repo.get_eligible_schemes(
            age=20, income=200000, state="Maharashtra", category="OBC"
        )
        # Should include: scheme_1 (ALL/ALL), scheme_2 (OBC), scheme_4 (Maharashtra), scheme_6, scheme_7
        assert len(schemes) >= 3
        scheme_ids = [s["id"] for s in schemes]
        assert "scheme_2" in scheme_ids  # PM YASASVI (OBC)

    async def test_get_eligible_no_results(self, seeded_db):
        repo = SchemeRepository(seeded_db)
        schemes = await repo.get_eligible_schemes(
            age=60, income=1000000, state="Ladakh", category="General"
        )
        assert len(schemes) == 0

    async def test_search_schemes(self, seeded_db):
        repo = SchemeRepository(seeded_db)
        results = await repo.search_schemes("girl students")
        assert any("Pragati" in s.name for s in results)


class TestSessionRepository:
    async def test_create_session(self, seeded_db):
        repo = SessionRepository(seeded_db)
        session = await repo.get_or_create("test-session-123")
        assert session.id == "test-session-123"
        assert session.conversation_history == []

    async def test_update_session(self, seeded_db):
        repo = SessionRepository(seeded_db)
        await repo.get_or_create("test-session-456")
        await repo.update_session("test-session-456", 
            user_profile={"age": 20, "income": 200000},
            conversation_history=[{"role": "user", "content": "hello"}]
        )
        session = await repo.get_or_create("test-session-456")
        assert session.user_profile["age"] == 20
```

### Step 4: Update `Backend/pytest.ini`

```ini
[pytest]
asyncio_mode = auto
markers =
    integration: marks tests that require a running PostgreSQL database
testpaths = test
python_files = test_*.py
python_classes = Test*
python_functions = test_*
# By default, skip integration tests. Run them explicitly:
# pytest -m integration
addopts = -m "not integration" -v
```

---

## Part 2: Frontend Testing Setup

### Step 5: Install Frontend Testing Dependencies

```bash
cd frontend
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
npm install -D @playwright/test
npx playwright install
```

### Step 6: Configure Vitest

**Create `frontend/vitest.config.js`**:
```javascript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.js"],
    css: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

**Create `frontend/src/test/setup.js`**:
```javascript
import "@testing-library/jest-dom";
```

**Update `frontend/package.json`** scripts:
```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

### Step 7: Create Frontend Component Tests

**Create `frontend/src/test/components/SchemeCard.test.jsx`**:
```jsx
import { render, screen, fireEvent } from "@testing-library/react";
import { SchemeCard } from "@/components/SchemeCard";
import { describe, it, expect, vi } from "vitest";

const mockScheme = {
  id: "scheme_1",
  name: "National Scholarship for Higher Education",
  state: "ALL",
  category: "ALL",
  income_max: 250000,
  age_min: 17,
  age_max: 25,
  benefits: "Full tuition fee reimbursement up to ₹50,000 per year",
  documents: ["Aadhaar Card", "Income Certificate", "Previous Year Marksheet", "Bank Passbook"],
  apply_link: "https://scholarships.gov.in",
};

describe("SchemeCard", () => {
  it("renders scheme name", () => {
    render(<SchemeCard scheme={mockScheme} />);
    expect(screen.getByText("National Scholarship for Higher Education")).toBeInTheDocument();
  });

  it("renders benefits text", () => {
    render(<SchemeCard scheme={mockScheme} />);
    expect(screen.getByText(/Full tuition fee/)).toBeInTheDocument();
  });

  it("renders eligibility criteria", () => {
    render(<SchemeCard scheme={mockScheme} />);
    expect(screen.getByText(/17-25/)).toBeInTheDocument();
  });

  it("shows first 3 documents", () => {
    render(<SchemeCard scheme={mockScheme} />);
    expect(screen.getByText("Aadhaar Card")).toBeInTheDocument();
    expect(screen.getByText("Income Certificate")).toBeInTheDocument();
    expect(screen.getByText(/\+1 more/)).toBeInTheDocument();
  });

  it("calls onSendSMS when SMS button clicked", () => {
    const mockSMS = vi.fn();
    render(<SchemeCard scheme={mockScheme} onSendSMS={mockSMS} />);
    fireEvent.click(screen.getByText("Send SMS"));
    expect(mockSMS).toHaveBeenCalledWith(mockScheme);
  });

  it("opens apply link in new tab", () => {
    const mockOpen = vi.fn();
    window.open = mockOpen;
    render(<SchemeCard scheme={mockScheme} />);
    fireEvent.click(screen.getByText("Apply Now"));
    expect(mockOpen).toHaveBeenCalledWith("https://scholarships.gov.in", "_blank");
  });
});
```

**Create `frontend/src/test/components/ChatView.test.jsx`**:
```jsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AppProvider } from "@/context/AppContext";
import { ChatView } from "@/components/ChatView";
import { describe, it, expect } from "vitest";

const renderWithProvider = (component) => {
  return render(<AppProvider>{component}</AppProvider>);
};

describe("ChatView", () => {
  it("shows initial greeting message", async () => {
    renderWithProvider(<ChatView />);
    await waitFor(() => {
      expect(screen.getByText(/Hello/)).toBeInTheDocument();
    });
  });

  it("shows age question first", async () => {
    renderWithProvider(<ChatView />);
    await waitFor(() => {
      expect(screen.getByText(/age/i)).toBeInTheDocument();
    });
  });

  it("accepts age input and moves to income", async () => {
    renderWithProvider(<ChatView />);
    
    await waitFor(() => {
      const input = screen.getByPlaceholderText(/age/i);
      fireEvent.change(input, { target: { value: "20" } });
      fireEvent.click(screen.getByRole("button", { type: "submit" }));
    });

    await waitFor(() => {
      expect(screen.getByText(/income/i)).toBeInTheDocument();
    }, { timeout: 2000 });
  });
});
```

**Create `frontend/src/test/context/AppContext.test.jsx`**:
```jsx
import { renderHook, act } from "@testing-library/react";
import { AppProvider, useApp } from "@/context/AppContext";
import { describe, it, expect } from "vitest";

const wrapper = ({ children }) => <AppProvider>{children}</AppProvider>;

describe("AppContext", () => {
  it("initializes with home view", () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    expect(result.current.view).toBe("home");
  });

  it("switches view", () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    act(() => result.current.setView("chat"));
    expect(result.current.view).toBe("chat");
  });

  it("updates user profile", () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    act(() => result.current.setUserProfile({ age: 20 }));
    expect(result.current.userProfile.age).toBe(20);
  });

  it("calculates eligible schemes", () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    let schemes;
    act(() => {
      schemes = result.current.checkAndSetEligibleSchemes({
        age: 20, income: 200000, state: "Maharashtra", category: "OBC"
      });
    });
    expect(schemes.length).toBeGreaterThan(0);
  });
});
```

### Step 8: Create Playwright E2E Tests

**Create `frontend/playwright.config.js`**:
```javascript
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
  },
});
```

**Create `frontend/e2e/home.spec.js`**:
```javascript
import { test, expect } from "@playwright/test";

test.describe("Home Page", () => {
  test("displays landing page", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=BharatConnect")).toBeVisible();
    await expect(page.locator("text=Start with Voice")).toBeVisible();
    await expect(page.locator("text=Chat Instead")).toBeVisible();
  });

  test("navigates to chat on button click", async ({ page }) => {
    await page.goto("/");
    await page.click("text=Chat Instead");
    await expect(page.locator("text=Hello")).toBeVisible({ timeout: 5000 });
  });
});
```

**Create `frontend/e2e/chat-flow.spec.js`**:
```javascript
import { test, expect } from "@playwright/test";

test.describe("Complete Chat Flow", () => {
  test("user completes eligibility check", async ({ page }) => {
    await page.goto("/");
    
    // 1. Click "Chat Instead" to start
    await page.click("text=Chat Instead");
    
    // 2. Wait for greeting and age question
    await expect(page.locator("text=Hello")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=age")).toBeVisible({ timeout: 3000 });
    
    // 3. Enter age
    await page.fill('input[placeholder*="age"]', "20");
    await page.click('button[type="submit"]');
    
    // 4. Wait for income question
    await expect(page.locator("text=income")).toBeVisible({ timeout: 3000 });
    
    // 5. Enter income
    await page.fill('input[type="number"]', "200000");
    await page.click('button[type="submit"]');
    
    // 6. Wait for state question
    await expect(page.locator("text=state")).toBeVisible({ timeout: 3000 });
    
    // 7. Select state
    await page.selectOption("select", "Maharashtra");
    await page.click('button[type="submit"]');
    
    // 8. Wait for category question
    await expect(page.locator("text=category")).toBeVisible({ timeout: 3000 });
    
    // 9. Select category
    await page.selectOption("select", "OBC");
    await page.click('button[type="submit"]');
    
    // 10. Wait for results
    await expect(page.locator("text=Eligible Schemes")).toBeVisible({ timeout: 5000 });
    
    // 11. Verify scheme cards appear
    const schemeCards = page.locator('[class*="scheme-card"], [class*="SchemeCard"]');
    await expect(schemeCards.first()).toBeVisible({ timeout: 3000 });
  });

  test("SMS modal works", async ({ page }) => {
    // First complete the flow (or navigate directly to results)
    await page.goto("/");
    await page.click("text=Chat Instead");
    
    // Quick flow through questions
    await page.waitForTimeout(1500);
    await page.fill('input[placeholder*="age"]', "20");
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1500);
    await page.fill('input[type="number"]', "200000");
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1500);
    await page.selectOption("select", "Maharashtra");
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1500);
    await page.selectOption("select", "OBC");
    await page.click('button[type="submit"]');
    
    // Wait for schemes to load
    await page.waitForTimeout(2000);
    
    // Click Send SMS on first scheme
    const smsButton = page.locator("text=Send SMS").first();
    if (await smsButton.isVisible()) {
      await smsButton.click();
      
      // SMS modal should appear
      await expect(page.locator("text=Send Scheme Details")).toBeVisible({ timeout: 3000 });
      
      // Enter phone number
      await page.fill('input[placeholder*="phone"], input[type="tel"]', "9876543210");
    }
  });
});
```

**Create `frontend/e2e/navigation.spec.js`**:
```javascript
import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("floating dock navigates between views", async ({ page }) => {
    await page.goto("/");
    
    // Home should be visible
    await expect(page.locator("text=BharatConnect")).toBeVisible();
    
    // Click Chat in dock
    const chatButton = page.locator('[title="Chat"], [aria-label="Chat"]');
    if (await chatButton.isVisible()) {
      await chatButton.click();
      await expect(page.locator("text=Hello")).toBeVisible({ timeout: 5000 });
    }
    
    // Click Home to go back
    const homeButton = page.locator('[title="Home"], [aria-label="Home"]');
    if (await homeButton.isVisible()) {
      await homeButton.click();
      await expect(page.locator("text=BharatConnect")).toBeVisible({ timeout: 3000 });
    }
  });

  test("schemes page loads", async ({ page }) => {
    await page.goto("/schemes");
    // Verify schemes page renders (after Feature 04)
    await expect(page.locator("body")).toBeVisible();
  });

  test("about page loads", async ({ page }) => {
    await page.goto("/about");
    await expect(page.locator("body")).toBeVisible();
  });
});
```

---

## Running Tests

### Backend Tests
```bash
# Unit tests (no DB required)
cd Backend
python -m pytest test/ -v

# Integration tests (requires PostgreSQL)
python -m pytest test/ -m integration -v

# All tests with coverage
python -m pytest test/ -v --cov=. --cov-report=html
```

### Frontend Tests
```bash
cd frontend

# Component tests
npm test              # Watch mode
npm run test:run      # Single run

# E2E tests
npm run test:e2e      # Headless
npm run test:e2e:ui   # Interactive UI mode
```

---

## Files to Create

### Backend
- `Backend/test/test_integration.py`
- `Backend/test/test_repositories.py`

### Frontend
- `frontend/vitest.config.js`
- `frontend/playwright.config.js`
- `frontend/src/test/setup.js`
- `frontend/src/test/components/SchemeCard.test.jsx`
- `frontend/src/test/components/ChatView.test.jsx`
- `frontend/src/test/context/AppContext.test.jsx`
- `frontend/e2e/home.spec.js`
- `frontend/e2e/chat-flow.spec.js`
- `frontend/e2e/navigation.spec.js`

## Files to Modify
- `Backend/test/conftest.py` — add database fixtures
- `Backend/pytest.ini` — add integration marker
- `frontend/package.json` — add test scripts and devDependencies

---

## Verification Checklist
- [ ] `npm run test:run` passes all component tests
- [ ] `npm run test:e2e` passes all Playwright tests
- [ ] `python -m pytest test/ -v` passes all backend unit tests
- [ ] `python -m pytest test/ -m integration -v` passes with PostgreSQL
- [ ] Full chat flow E2E test completes in < 30 seconds
- [ ] SMS modal E2E test works
- [ ] Test coverage > 70% for both frontend and backend
- [ ] Tests run in CI pipeline (GitHub Actions ready)
- [ ] No flaky tests (retries handled properly)
