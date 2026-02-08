# Feature 01: PostgreSQL Database Integration

## Priority: HIGH (Foundation — must be done first)
## Estimated Effort: 6-8 hours

---

## Overview

Replace the current in-memory data storage (hardcoded `SCHEMES` list in `Backend/data/schemes.py` and in-memory sessions dict in `Backend/routes/chat.py`) with a PostgreSQL database. This is a foundational change that all other features depend on.

---

## Current State (What Exists)

### 1. Scheme Data — Hardcoded Python List
- **File**: `Backend/data/schemes.py`
- Contains 10 hardcoded scheme dicts in the `SCHEMES` list
- Each scheme has: `id`, `name`, `state`, `category`, `income_max`, `age_min`, `age_max`, `benefits`, `documents` (list), `apply_link`
- `get_eligible_schemes(user_profile)` function filters by age range, income ceiling, category, and state
- `is_eligible(user_profile, scheme)` returns `(bool, reason_string)`

### 2. Sessions — In-Memory Dict
- **File**: `Backend/routes/chat.py` (lines 36-37)
- `sessions: Dict[str, Dict[str, Any]] = {}` — dies on server restart
- Each session stores: `user_profile` (UserProfile pydantic model), `conversation_history` (list of dicts), `last_accessed` (datetime), `session_token` (uuid)
- Cleanup of expired sessions happens inline in `get_or_create_session()`

### 3. Config — No DB settings
- **File**: `Backend/config.py`
- Uses `pydantic_settings.BaseSettings` loading from `.env`
- No database URL or connection pool settings exist

### 4. Pydantic Schemas
- **File**: `Backend/models/schemas.py`
- `UserProfile`, `ChatRequest`, `ChatResponse`, `EligibilityRequest/Response`, `SMSRequest/Response`, `HealthResponse`

---

## Target Architecture

```
PostgreSQL 16+
├── Table: schemes          (replaces SCHEMES list)
├── Table: sessions         (replaces in-memory sessions dict)
├── Table: users            (new — optional user accounts)
├── Table: eligibility_logs (new — audit trail)
└── Extension: pgvector     (for Feature 03)
```

---

## Step-by-Step Implementation

### Step 1: Install Dependencies

Add to `Backend/requirements.txt`:
```
sqlalchemy>=2.0.0
asyncpg>=0.29.0
alembic>=1.13.0
psycopg2-binary>=2.9.9
```

Run:
```bash
pip install sqlalchemy asyncpg alembic psycopg2-binary
```

### Step 2: Add Database Config

**Edit `Backend/config.py`** — Add these fields to the `Settings` class:

```python
class Settings(BaseSettings):
    # ... existing fields ...

    # Database Configuration
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/bharatconnect"
    database_url_sync: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/bharatconnect"
    db_pool_size: int = 5
    db_max_overflow: int = 10
    db_echo: bool = False
```

Add to `Backend/.env`:
```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/bharatconnect
DATABASE_URL_SYNC=postgresql+psycopg2://postgres:postgres@localhost:5432/bharatconnect
```

### Step 3: Create Database Module

**Create `Backend/database/__init__.py`**:
```python
from .connection import get_db, engine, AsyncSessionLocal
from .models import Base, SchemeModel, SessionModel, EligibilityLogModel
```

**Create `Backend/database/connection.py`**:
```python
"""
Async database connection management using SQLAlchemy 2.0
"""
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from config import settings
import logging

logger = logging.getLogger(__name__)

# Create async engine
engine = create_async_engine(
    settings.database_url,
    pool_size=settings.db_pool_size,
    max_overflow=settings.db_max_overflow,
    echo=settings.db_echo,
)

# Async session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

# Base class for models
class Base(DeclarativeBase):
    pass

# Dependency for FastAPI routes
async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

async def init_db():
    """Create all tables (for development). Use Alembic in production."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables created/verified")

async def close_db():
    """Cleanup database connections"""
    await engine.dispose()
    logger.info("Database connections closed")
```

**Create `Backend/database/models.py`**:
```python
"""
SQLAlchemy ORM models for PostgreSQL
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.sql import func
from .connection import Base
import uuid

class SchemeModel(Base):
    """Government scheme stored in database"""
    __tablename__ = "schemes"

    id = Column(String(50), primary_key=True)  # e.g., "scheme_1"
    name = Column(String(255), nullable=False, index=True)
    state = Column(String(100), nullable=False, default="ALL", index=True)
    category = Column(String(50), nullable=False, default="ALL", index=True)
    income_max = Column(Integer, nullable=False)
    age_min = Column(Integer, nullable=False)
    age_max = Column(Integer, nullable=False)
    benefits = Column(Text, nullable=False)
    documents = Column(JSON, nullable=False, default=list)  # stored as JSON array
    apply_link = Column(String(500), nullable=False)
    
    # Metadata
    is_active = Column(Boolean, default=True, index=True)
    source_url = Column(String(500), nullable=True)  # Where the data was scraped from
    last_verified = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # For pgvector (Feature 03) — will be added later
    # embedding = Column(Vector(384))  

    def to_dict(self):
        """Convert to dict matching existing API contract"""
        return {
            "id": self.id,
            "name": self.name,
            "state": self.state,
            "category": self.category,
            "income_max": self.income_max,
            "age_min": self.age_min,
            "age_max": self.age_max,
            "benefits": self.benefits,
            "documents": self.documents,
            "apply_link": self.apply_link,
        }


class SessionModel(Base):
    """User chat sessions persisted in database"""
    __tablename__ = "sessions"

    id = Column(String(36), primary_key=True)  # UUID string
    session_token = Column(String(36), nullable=False)
    user_profile = Column(JSON, nullable=True)  # Stores {age, income, state, category}
    conversation_history = Column(JSON, default=list)  # List of {role, content} dicts
    last_accessed = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    is_expired = Column(Boolean, default=False, index=True)


class EligibilityLogModel(Base):
    """Audit log of eligibility checks"""
    __tablename__ = "eligibility_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(36), nullable=True, index=True)
    user_profile = Column(JSON, nullable=False)
    eligible_scheme_ids = Column(JSON, nullable=False)  # List of scheme IDs
    eligible_count = Column(Integer, nullable=False)
    checked_at = Column(DateTime(timezone=True), server_default=func.now())
```

### Step 4: Create Seed Script

**Create `Backend/database/seed.py`**:
```python
"""
Seed the database with initial scheme data.
Run: python -m Backend.database.seed
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from .connection import Base
from .models import SchemeModel
from config import settings

# The 10 existing schemes (copy from Backend/data/schemes.py SCHEMES list)
SEED_SCHEMES = [
    # ... paste all 10 scheme dicts from Backend/data/schemes.py here ...
]

def seed_database():
    engine = create_engine(settings.database_url_sync)
    Base.metadata.create_all(engine)
    
    with Session(engine) as session:
        existing = session.query(SchemeModel).count()
        if existing > 0:
            print(f"Database already has {existing} schemes. Skipping seed.")
            return
        
        for scheme_data in SEED_SCHEMES:
            scheme = SchemeModel(**scheme_data)
            session.add(scheme)
        
        session.commit()
        print(f"Seeded {len(SEED_SCHEMES)} schemes into database.")

if __name__ == "__main__":
    seed_database()
```

### Step 5: Create Repository Layer (Data Access)

**Create `Backend/database/repositories.py`**:
```python
"""
Repository pattern for database queries.
All SQL queries live here — routes and services call these functions.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from sqlalchemy.sql import func
from .models import SchemeModel, SessionModel, EligibilityLogModel
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List

class SchemeRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all_active(self) -> List[SchemeModel]:
        result = await self.db.execute(
            select(SchemeModel).where(SchemeModel.is_active == True)
        )
        return result.scalars().all()

    async def get_by_id(self, scheme_id: str) -> Optional[SchemeModel]:
        result = await self.db.execute(
            select(SchemeModel).where(SchemeModel.id == scheme_id)
        )
        return result.scalar_one_or_none()

    async def get_eligible_schemes(self, age: int, income: int, state: str, category: str) -> List[Dict]:
        """SQL-based eligibility check — replaces the Python loop"""
        query = select(SchemeModel).where(
            and_(
                SchemeModel.is_active == True,
                SchemeModel.age_min <= age,
                SchemeModel.age_max >= age,
                SchemeModel.income_max >= income,
                or_(SchemeModel.category == "ALL", SchemeModel.category == category),
                or_(SchemeModel.state == "ALL", SchemeModel.state == state),
            )
        )
        result = await self.db.execute(query)
        schemes = result.scalars().all()
        return [s.to_dict() for s in schemes]

    async def search_schemes(self, query: str, limit: int = 5) -> List[SchemeModel]:
        """Basic text search (pgvector semantic search in Feature 03)"""
        result = await self.db.execute(
            select(SchemeModel).where(
                and_(
                    SchemeModel.is_active == True,
                    or_(
                        SchemeModel.name.ilike(f"%{query}%"),
                        SchemeModel.benefits.ilike(f"%{query}%"),
                    )
                )
            ).limit(limit)
        )
        return result.scalars().all()


class SessionRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_or_create(self, session_id: str) -> SessionModel:
        result = await self.db.execute(
            select(SessionModel).where(SessionModel.id == session_id)
        )
        session = result.scalar_one_or_none()

        if session is None:
            import uuid
            session = SessionModel(
                id=session_id,
                session_token=str(uuid.uuid4()),
                user_profile={},
                conversation_history=[],
            )
            self.db.add(session)
            await self.db.commit()
            await self.db.refresh(session)

        return session

    async def update_session(self, session_id: str, user_profile: dict = None, conversation_history: list = None):
        result = await self.db.execute(
            select(SessionModel).where(SessionModel.id == session_id)
        )
        session = result.scalar_one_or_none()
        if session:
            if user_profile is not None:
                session.user_profile = user_profile
            if conversation_history is not None:
                session.conversation_history = conversation_history
            session.last_accessed = datetime.utcnow()
            await self.db.commit()

    async def cleanup_expired(self, timeout_minutes: int = 30):
        cutoff = datetime.utcnow() - timedelta(minutes=timeout_minutes)
        result = await self.db.execute(
            select(SessionModel).where(SessionModel.last_accessed < cutoff)
        )
        expired = result.scalars().all()
        for s in expired:
            s.is_expired = True
        await self.db.commit()
        return len(expired)


class EligibilityLogRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def log_check(self, session_id: str, user_profile: dict, eligible_scheme_ids: list):
        log = EligibilityLogModel(
            session_id=session_id,
            user_profile=user_profile,
            eligible_scheme_ids=eligible_scheme_ids,
            eligible_count=len(eligible_scheme_ids),
        )
        self.db.add(log)
        await self.db.commit()
```

### Step 6: Set Up Alembic Migrations

```bash
cd Backend
alembic init alembic
```

**Edit `Backend/alembic.ini`**: Set `sqlalchemy.url` to the sync URL:
```ini
sqlalchemy.url = postgresql+psycopg2://postgres:postgres@localhost:5432/bharatconnect
```

**Edit `Backend/alembic/env.py`**: Import your Base:
```python
from database.models import Base  # noqa
target_metadata = Base.metadata
```

Generate and run the first migration:
```bash
alembic revision --autogenerate -m "initial_tables"
alembic upgrade head
```

### Step 7: Update `Backend/main.py`

Add startup/shutdown lifecycle events:
```python
from contextlib import asynccontextmanager
from database.connection import init_db, close_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Initializing database...")
    await init_db()
    yield
    # Shutdown
    await close_db()

app = FastAPI(
    title="BharatConnect AI API",
    ...,
    lifespan=lifespan,
)
```

### Step 8: Update Routes to Use Database

**Update `Backend/routes/eligibility.py`**:
- Add `db: AsyncSession = Depends(get_db)` parameter
- Replace `get_eligible_schemes(request.to_dict())` with `SchemeRepository(db).get_eligible_schemes(...)`

**Update `Backend/routes/chat.py`**:
- Replace in-memory `sessions` dict with `SessionRepository`
- Add `db: AsyncSession = Depends(get_db)` to the `chat` endpoint

**Update `Backend/routes/sms.py`**:
- Replace `next(s for s in SCHEMES ...)` with `SchemeRepository(db).get_by_id(request.scheme_id)`

**Update `Backend/routes/health.py`**:
- Add database health check: try a `SELECT 1` query

### Step 9: Keep Backward Compatibility

The existing `Backend/data/schemes.py` should still work as a fallback. Keep it but mark it as deprecated:
```python
# DEPRECATED: This file is kept for backward compatibility.
# Schemes are now stored in PostgreSQL. See Backend/database/models.py
```

---

## Database Setup Instructions (for the developer)

```bash
# 1. Install PostgreSQL 16+ (if not installed)
# Windows: Download from https://www.postgresql.org/download/windows/
# Or use Docker:
docker run -d --name bharatconnect-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=bharatconnect -p 5432:5432 postgres:16

# 2. Create database
psql -U postgres -c "CREATE DATABASE bharatconnect;"

# 3. Enable pgvector extension (needed for Feature 03)
psql -U postgres -d bharatconnect -c "CREATE EXTENSION IF NOT EXISTS vector;"

# 4. Run migrations
cd Backend
alembic upgrade head

# 5. Seed initial data
python -m Backend.database.seed
```

---

## Environment Variables to Add

```env
# Backend/.env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/bharatconnect
DATABASE_URL_SYNC=postgresql+psycopg2://postgres:postgres@localhost:5432/bharatconnect
DB_POOL_SIZE=5
DB_MAX_OVERFLOW=10
DB_ECHO=false
```

---

## Files to Create
- `Backend/database/__init__.py`
- `Backend/database/connection.py`
- `Backend/database/models.py`
- `Backend/database/repositories.py`
- `Backend/database/seed.py`

## Files to Modify
- `Backend/config.py` — add DB settings
- `Backend/requirements.txt` — add sqlalchemy, asyncpg, alembic, psycopg2-binary
- `Backend/main.py` — add lifespan events
- `Backend/routes/chat.py` — use SessionRepository
- `Backend/routes/eligibility.py` — use SchemeRepository
- `Backend/routes/sms.py` — use SchemeRepository
- `Backend/routes/health.py` — add DB health check

## Verification Checklist
- [ ] PostgreSQL is running and `bharatconnect` database exists
- [ ] `alembic upgrade head` runs without errors
- [ ] `python -m Backend.database.seed` populates 10 schemes
- [ ] `GET /health` shows `"database": "ok"`
- [ ] `POST /eligibility` returns same results as before (test with age=20, income=200000, state=Maharashtra, category=OBC)
- [ ] `POST /chat` creates/retrieves sessions from DB (survives server restart)
- [ ] `POST /sms` looks up scheme from DB
- [ ] All existing tests still pass
