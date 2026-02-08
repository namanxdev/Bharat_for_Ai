# Feature 03: Replace FAISS with PostgreSQL pgvector

## Priority: HIGH (Replaces current vector search)
## Estimated Effort: 4-5 hours
## Depends On: Feature 01 (PostgreSQL Database) — MUST be completed first

---

## Overview

Replace the FAISS in-memory vector index in `Backend/services/vector_service.py` with PostgreSQL's `pgvector` extension. This eliminates the need for FAISS and sentence-transformers as separate dependencies, keeps all data in one place (PostgreSQL), and integrates naturally with the database layer.

---

## Current State (What Exists)

### `Backend/services/vector_service.py`
- Imports `sentence_transformers.SentenceTransformer` and `faiss`
- Loads `all-MiniLM-L6-v2` model (384-dimension embeddings)
- On init: embeds all 10 scheme texts (`name + benefits`), normalizes, stores in `faiss.IndexFlatIP`
- `search(query, top_k, eligible_scheme_ids)` — encodes query, searches FAISS index, returns top-k
- `_keyword_search()` — fallback when FAISS unavailable (word overlap scoring)
- Falls back gracefully if `faiss-cpu` or `sentence-transformers` not installed

### How Vector Search Is Used
- `Backend/routes/chat.py` calls `vector_service.search()` — but actually it's only available via `set_services()`, the chat route currently uses `get_eligible_schemes()` directly and only uses vector_service for potential RAG context
- The LangChain agent (Feature 02) will use it through a `search_schemes` tool

---

## Target Architecture

```
PostgreSQL with pgvector
├── Table: schemes
│   ├── ... existing columns ...
│   └── embedding VECTOR(384)    ← new column
├── Index: schemes_embedding_idx (ivfflat or hnsw)
│
Embedding Generation:
├── Option A: sentence-transformers (keep existing model)
└── Option B: Google Gemini Embedding API (text-embedding-004)
    └── Recommended — reduces dependencies, Google handles hosting
```

---

## Step-by-Step Implementation

### Step 1: Install Dependencies

Add to `Backend/requirements.txt`:
```
pgvector>=0.3.0
```

Optional (if keeping sentence-transformers for embeddings):
```
sentence-transformers>=3.3.0
```

Remove from `Backend/requirements.txt`:
```
faiss-cpu>=1.9.0   # DELETE THIS LINE
```

### Step 2: Enable pgvector Extension

```sql
-- Run this on your bharatconnect database
CREATE EXTENSION IF NOT EXISTS vector;
```

Or in the database init code (`Backend/database/connection.py`):
```python
async def init_db():
    async with engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        await conn.run_sync(Base.metadata.create_all)
```

### Step 3: Add Embedding Column to SchemeModel

**Edit `Backend/database/models.py`**:
```python
from pgvector.sqlalchemy import Vector

class SchemeModel(Base):
    __tablename__ = "schemes"
    
    # ... existing columns ...
    
    # Vector embedding for semantic search
    embedding = Column(Vector(384), nullable=True)  # 384 for all-MiniLM-L6-v2 or text-embedding-004
```

### Step 4: Create Alembic Migration

```bash
cd Backend
alembic revision --autogenerate -m "add_embedding_column"
alembic upgrade head
```

### Step 5: Create Embedding Service

**Create `Backend/services/embedding_service.py`**:
```python
"""
Embedding generation service.
Supports both Google Gemini embeddings and local sentence-transformers.
"""
import logging
import numpy as np
from typing import List, Optional
from config import settings

logger = logging.getLogger(__name__)

class EmbeddingService:
    """Generates text embeddings for vector search"""

    def __init__(self):
        self.available = False
        self.dimension = 384
        self._init_embedding_model()

    def _init_embedding_model(self):
        """Try Google Embeddings first, fall back to sentence-transformers"""
        
        # Option A: Google Gemini Embedding API
        if settings.google_api_key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=settings.google_api_key)
                self._embed_fn = self._embed_with_gemini
                self.dimension = 768  # Gemini text-embedding-004 dimension
                self.available = True
                logger.info("Embedding service initialized with Google Gemini")
                return
            except Exception as e:
                logger.warning(f"Google embedding init failed: {e}")

        # Option B: Local sentence-transformers
        try:
            from sentence_transformers import SentenceTransformer
            self.model = SentenceTransformer('all-MiniLM-L6-v2')
            self._embed_fn = self._embed_with_sentence_transformer
            self.dimension = 384
            self.available = True
            logger.info("Embedding service initialized with sentence-transformers")
            return
        except ImportError:
            logger.warning("sentence-transformers not available")

        logger.warning("No embedding service available. Vector search disabled.")

    def embed(self, texts: List[str]) -> Optional[List[List[float]]]:
        """Generate embeddings for a list of texts"""
        if not self.available:
            return None
        return self._embed_fn(texts)

    def embed_single(self, text: str) -> Optional[List[float]]:
        """Generate embedding for a single text"""
        result = self.embed([text])
        return result[0] if result else None

    def _embed_with_gemini(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings using Google Gemini API"""
        import google.generativeai as genai
        
        embeddings = []
        for text in texts:
            result = genai.embed_content(
                model="models/text-embedding-004",
                content=text,
                task_type="retrieval_document",
            )
            embeddings.append(result['embedding'])
        return embeddings

    def _embed_with_sentence_transformer(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings using local sentence-transformers"""
        embeddings = self.model.encode(texts, convert_to_numpy=True)
        # Normalize for cosine similarity
        norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
        embeddings = embeddings / norms
        return embeddings.tolist()

    def is_available(self) -> bool:
        return self.available
```

### Step 6: Rewrite Vector Service for pgvector

**Replace `Backend/services/vector_service.py`**:
```python
"""
Vector search service using PostgreSQL pgvector.
Replaces FAISS with database-native vector similarity search.
"""
import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from .embedding_service import EmbeddingService

logger = logging.getLogger(__name__)


class VectorService:
    """Semantic search over schemes using pgvector in PostgreSQL"""

    def __init__(self, embedding_service: EmbeddingService):
        self.embedding_service = embedding_service
        self.available = embedding_service.is_available()
        
        if self.available:
            logger.info("VectorService initialized with pgvector backend")
        else:
            logger.info("VectorService using keyword fallback (no embeddings)")

    async def generate_and_store_embeddings(self, db: AsyncSession):
        """
        Generate embeddings for all schemes and store in database.
        Call this during startup or after adding new schemes.
        """
        if not self.available:
            logger.warning("Cannot generate embeddings — no embedding service")
            return

        from database.models import SchemeModel
        
        result = await db.execute(
            select(SchemeModel).where(SchemeModel.embedding.is_(None))
        )
        schemes = result.scalars().all()
        
        if not schemes:
            logger.info("All schemes already have embeddings")
            return

        logger.info(f"Generating embeddings for {len(schemes)} schemes...")
        
        texts = [f"{s.name}. {s.benefits}" for s in schemes]
        embeddings = self.embedding_service.embed(texts)
        
        if embeddings:
            for scheme, embedding in zip(schemes, embeddings):
                scheme.embedding = embedding
            await db.commit()
            logger.info(f"Stored {len(embeddings)} embeddings in database")

    async def search(
        self,
        query: str,
        db: AsyncSession,
        top_k: int = 5,
        eligible_scheme_ids: Optional[List[str]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Semantic search for schemes using pgvector cosine similarity.
        
        Args:
            query: User's search query
            db: Database session
            top_k: Number of results
            eligible_scheme_ids: Optional filter
        
        Returns:
            List of scheme dicts with similarity_score
        """
        if not self.available:
            return await self._keyword_search(query, db, top_k, eligible_scheme_ids)

        try:
            from database.models import SchemeModel
            
            # Generate query embedding
            query_embedding = self.embedding_service.embed_single(query)
            if query_embedding is None:
                return await self._keyword_search(query, db, top_k, eligible_scheme_ids)

            # pgvector cosine distance search: 1 - (embedding <=> query) = similarity
            # <=> is cosine distance, <#> is negative inner product, <-> is L2
            embedding_str = "[" + ",".join(map(str, query_embedding)) + "]"
            
            sql = text(f"""
                SELECT id, name, state, category, income_max, age_min, age_max,
                       benefits, documents, apply_link,
                       1 - (embedding <=> :query_embedding) AS similarity_score
                FROM schemes
                WHERE is_active = true
                  AND embedding IS NOT NULL
                  {"AND id = ANY(:scheme_ids)" if eligible_scheme_ids else ""}
                ORDER BY embedding <=> :query_embedding
                LIMIT :top_k
            """)
            
            params = {"query_embedding": embedding_str, "top_k": top_k}
            if eligible_scheme_ids:
                params["scheme_ids"] = eligible_scheme_ids

            result = await db.execute(sql, params)
            rows = result.mappings().all()

            return [
                {
                    "id": row["id"],
                    "name": row["name"],
                    "state": row["state"],
                    "category": row["category"],
                    "income_max": row["income_max"],
                    "age_min": row["age_min"],
                    "age_max": row["age_max"],
                    "benefits": row["benefits"],
                    "documents": row["documents"],
                    "apply_link": row["apply_link"],
                    "similarity_score": float(row["similarity_score"]),
                }
                for row in rows
            ]

        except Exception as e:
            logger.error(f"pgvector search failed: {e}. Falling back to keyword search.")
            return await self._keyword_search(query, db, top_k, eligible_scheme_ids)

    async def _keyword_search(
        self,
        query: str,
        db: AsyncSession,
        top_k: int = 5,
        eligible_scheme_ids: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """Fallback keyword search using SQL ILIKE"""
        from database.models import SchemeModel
        from sqlalchemy import or_, and_
        
        conditions = [
            SchemeModel.is_active == True,
            or_(
                SchemeModel.name.ilike(f"%{query}%"),
                SchemeModel.benefits.ilike(f"%{query}%"),
            )
        ]
        
        if eligible_scheme_ids:
            conditions.append(SchemeModel.id.in_(eligible_scheme_ids))
        
        result = await db.execute(
            select(SchemeModel).where(and_(*conditions)).limit(top_k)
        )
        schemes = result.scalars().all()
        
        return [
            {**s.to_dict(), "similarity_score": 0.5}
            for s in schemes
        ]

    def is_available(self) -> bool:
        return self.available
```

### Step 7: Create pgvector Index

For better performance, create an index on the embedding column:

```sql
-- HNSW index (better query performance, slower to build)
CREATE INDEX ON schemes USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- OR IVFFlat index (faster to build, good enough for <10k rows)
CREATE INDEX ON schemes USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 10);
```

Add this to your Alembic migration or seed script.

### Step 8: Update Startup in `main.py`

```python
from services.embedding_service import EmbeddingService

# Initialize services
embedding_service = EmbeddingService()
vector_service = VectorService(embedding_service)

# In the lifespan function:
@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    
    # Generate embeddings for any schemes missing them
    async with AsyncSessionLocal() as db:
        await vector_service.generate_and_store_embeddings(db)
    
    yield
    await close_db()
```

### Step 9: Update Agent Tool

**Edit `Backend/services/agent_tools.py`** — the `search_schemes` tool now needs a db session:

```python
@tool
async def search_schemes(query: str) -> str:
    """Search for government schemes by keyword or description."""
    # The tool will need access to both vector_service and a db session
    # This requires injecting dependencies through a closure or global
    if _vector_service is None or _db_session_factory is None:
        return "Search unavailable."
    
    async with _db_session_factory() as db:
        results = await _vector_service.search(query, db, top_k=5)
    
    if not results:
        return "No schemes found."
    
    return "\n".join([
        f"- **{r['name']}** (score: {r['similarity_score']:.2f}): {r['benefits'][:100]}..."
        for r in results
    ])
```

---

## Files to Create
- `Backend/services/embedding_service.py`

## Files to Modify
- `Backend/services/vector_service.py` — full rewrite for pgvector
- `Backend/database/models.py` — add `embedding` column
- `Backend/main.py` — initialize embedding service, generate embeddings on startup
- `Backend/services/agent_tools.py` — update search tool for async db
- `Backend/requirements.txt` — add `pgvector`, remove `faiss-cpu`

## Files to Delete (optional)
- Can remove `faiss-cpu` from requirements.txt

---

## Verification Checklist
- [ ] `CREATE EXTENSION vector` succeeds in PostgreSQL
- [ ] `embedding` column exists in `schemes` table
- [ ] Seed script generates and stores embeddings
- [ ] `search_schemes` tool returns semantically relevant results
- [ ] Searching "engineering scholarship" returns relevant schemes
- [ ] Searching "SC category students" returns SC-specific schemes
- [ ] Keyword fallback works when embeddings are unavailable
- [ ] No FAISS dependencies are needed
- [ ] Performance: search returns in < 200ms for 100 schemes
