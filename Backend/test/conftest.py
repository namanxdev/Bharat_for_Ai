"""
Pytest configuration and shared fixtures
"""
import pytest
from fastapi.testclient import TestClient
import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from main import app


@pytest.fixture
def client():
    """FastAPI test client"""
    return TestClient(app)


@pytest.fixture
def sample_user_profile():
    """Sample user profile for testing"""
    return {
        "age": 20,
        "income": 200000,
        "state": "Maharashtra",
        "category": "General"
    }


@pytest.fixture
def sample_obc_profile():
    """Sample OBC user profile"""
    return {
        "age": 18,
        "income": 150000,
        "state": "Karnataka",
        "category": "OBC"
    }


@pytest.fixture
def sample_sc_profile():
    """Sample SC user profile"""
    return {
        "age": 22,
        "income": 250000,
        "state": "Tamil Nadu",
        "category": "SC"
    }


@pytest.fixture
def sample_high_income_profile():
    """Sample profile with high income (should have fewer matches)"""
    return {
        "age": 19,
        "income": 900000,
        "state": "Delhi",
        "category": "General"
    }
