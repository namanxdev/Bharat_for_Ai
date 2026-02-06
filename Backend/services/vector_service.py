"""
Vector search service using FAISS and sentence-transformers
Provides RAG functionality with graceful fallback to keyword search
"""
import numpy as np
from typing import List, Dict, Any
import logging

logger = logging.getLogger(__name__)

# Try to import vector search dependencies
try:
    from sentence_transformers import SentenceTransformer
    import faiss
    VECTOR_AVAILABLE = True
except ImportError:
    VECTOR_AVAILABLE = False
    logger.warning("Vector search dependencies not available. Falling back to keyword search.")


class VectorService:
    """Service for semantic search over schemes using vector embeddings"""

    def __init__(self, schemes: List[Dict[str, Any]]):
        self.schemes = schemes
        self.available = False
        self.model = None
        self.index = None
        self.scheme_texts = []

        if VECTOR_AVAILABLE:
            try:
                self._initialize_vector_search()
            except Exception as e:
                logger.error(f"Failed to initialize vector search: {e}")
                self.available = False
        else:
            logger.info("Vector search not available, using keyword fallback")

    def _initialize_vector_search(self):
        """Initialize the vector search components"""
        logger.info("Initializing vector search with sentence-transformers...")

        # Load embedding model
        self.model = SentenceTransformer('all-MiniLM-L6-v2')

        # Prepare scheme texts for embedding
        self.scheme_texts = []
        for scheme in self.schemes:
            text = f"{scheme['name']}. {scheme['benefits']}"
            self.scheme_texts.append(text)

        # Generate embeddings
        logger.info(f"Generating embeddings for {len(self.scheme_texts)} schemes...")
        embeddings = self.model.encode(self.scheme_texts, convert_to_numpy=True)

        # Create FAISS index
        dimension = embeddings.shape[1]  # 384 for all-MiniLM-L6-v2
        self.index = faiss.IndexFlatIP(dimension)  # Inner product (cosine similarity)

        # Normalize embeddings for cosine similarity
        faiss.normalize_L2(embeddings)
        self.index.add(embeddings)

        self.available = True
        logger.info(f"Vector search initialized successfully with {self.index.ntotal} schemes")

    def search(self, query: str, top_k: int = 3, eligible_scheme_ids: List[str] = None) -> List[Dict[str, Any]]:
        """
        Search for relevant schemes using vector similarity

        Args:
            query: User's query text
            top_k: Number of results to return
            eligible_scheme_ids: Optional list of scheme IDs to filter by

        Returns:
            List of relevant schemes with similarity scores
        """
        if not self.available:
            return self._keyword_search(query, top_k, eligible_scheme_ids)

        try:
            # Encode query
            query_embedding = self.model.encode([query], convert_to_numpy=True)
            faiss.normalize_L2(query_embedding)

            # Search
            scores, indices = self.index.search(query_embedding, min(top_k, len(self.schemes)))

            # Get results
            results = []
            for idx, score in zip(indices[0], scores[0]):
                if idx < len(self.schemes):
                    scheme = self.schemes[idx].copy()

                    # Filter by eligible schemes if provided
                    if eligible_scheme_ids and scheme['id'] not in eligible_scheme_ids:
                        continue

                    scheme['similarity_score'] = float(score)
                    results.append(scheme)

                    if len(results) >= top_k:
                        break

            return results

        except Exception as e:
            logger.error(f"Vector search failed: {e}. Falling back to keyword search.")
            return self._keyword_search(query, top_k, eligible_scheme_ids)

    def _keyword_search(self, query: str, top_k: int = 3, eligible_scheme_ids: List[str] = None) -> List[Dict[str, Any]]:
        """
        Fallback keyword-based search when vector search is unavailable

        Args:
            query: User's query text
            top_k: Number of results to return
            eligible_scheme_ids: Optional list of scheme IDs to filter by

        Returns:
            List of schemes matching keywords
        """
        query_lower = query.lower()
        query_words = set(query_lower.split())

        results = []
        for scheme in self.schemes:
            # Filter by eligible schemes if provided
            if eligible_scheme_ids and scheme['id'] not in eligible_scheme_ids:
                continue

            # Calculate keyword match score
            scheme_text = f"{scheme['name']} {scheme['benefits']}".lower()
            matches = sum(1 for word in query_words if word in scheme_text)

            if matches > 0:
                scheme_copy = scheme.copy()
                scheme_copy['similarity_score'] = matches / len(query_words)
                results.append(scheme_copy)

        # Sort by score and return top_k
        results.sort(key=lambda x: x['similarity_score'], reverse=True)
        return results[:top_k]

    def is_available(self) -> bool:
        """Check if vector search is available"""
        return self.available
