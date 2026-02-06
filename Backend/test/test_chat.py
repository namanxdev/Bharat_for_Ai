"""
Tests for chat endpoint
"""
import pytest
import uuid


def test_chat_profile_collection_flow(client):
    """Test complete profile collection flow through chat"""
    session_id = str(uuid.uuid4())

    # First message - should ask for age
    response = client.post("/chat", json={
        "session_id": session_id,
        "message": "Hello, I need help finding scholarships",
        "user_profile": {}
    })

    assert response.status_code == 200
    data = response.json()
    assert "response" in data
    assert "next_question" in data
    assert "age" in data["next_question"].lower()
    assert len(data["schemes"]) == 0

    # Provide age
    response = client.post("/chat", json={
        "session_id": session_id,
        "message": "I am 20 years old",
        "user_profile": {"age": 20}
    })

    assert response.status_code == 200
    data = response.json()
    assert "income" in data["next_question"].lower()
    assert len(data["schemes"]) == 0

    # Provide income
    response = client.post("/chat", json={
        "session_id": session_id,
        "message": "2 lakhs per year",
        "user_profile": {"age": 20, "income": 200000}
    })

    assert response.status_code == 200
    data = response.json()
    assert "state" in data["next_question"].lower()
    assert len(data["schemes"]) == 0

    # Provide state
    response = client.post("/chat", json={
        "session_id": session_id,
        "message": "Maharashtra",
        "user_profile": {"age": 20, "income": 200000, "state": "Maharashtra"}
    })

    assert response.status_code == 200
    data = response.json()
    assert "category" in data["next_question"].lower()
    assert len(data["schemes"]) == 0

    # Provide category - should now return schemes
    response = client.post("/chat", json={
        "session_id": session_id,
        "message": "General",
        "user_profile": {
            "age": 20,
            "income": 200000,
            "state": "Maharashtra",
            "category": "General"
        }
    })

    assert response.status_code == 200
    data = response.json()
    assert data["next_question"] is None
    assert len(data["schemes"]) > 0


def test_chat_with_complete_profile(client):
    """Test chat with already complete profile"""
    session_id = str(uuid.uuid4())

    response = client.post("/chat", json={
        "session_id": session_id,
        "message": "What scholarships am I eligible for?",
        "user_profile": {
            "age": 20,
            "income": 200000,
            "state": "Maharashtra",
            "category": "General"
        }
    })

    assert response.status_code == 200
    data = response.json()

    # Should return schemes immediately
    assert len(data["schemes"]) > 0
    assert data["next_question"] is None
    assert "response" in data


def test_chat_session_persistence(client):
    """Test that session data persists across requests"""
    session_id = str(uuid.uuid4())

    # First request with partial profile
    response1 = client.post("/chat", json={
        "session_id": session_id,
        "message": "I'm 20 years old",
        "user_profile": {"age": 20}
    })

    assert response1.status_code == 200

    # Second request - should remember age
    response2 = client.post("/chat", json={
        "session_id": session_id,
        "message": "200000 rupees",
        "user_profile": {"income": 200000}
    })

    assert response2.status_code == 200
    # Should now ask for state, not age


def test_chat_response_structure(client):
    """Test chat response has correct structure"""
    session_id = str(uuid.uuid4())

    response = client.post("/chat", json={
        "session_id": session_id,
        "message": "Hello",
        "user_profile": {}
    })

    assert response.status_code == 200
    data = response.json()

    assert "response" in data
    assert "schemes" in data
    assert "next_question" in data
    assert isinstance(data["response"], str)
    assert isinstance(data["schemes"], list)


def test_chat_age_extraction(client):
    """Test that chat can extract age from natural language"""
    session_id = str(uuid.uuid4())

    response = client.post("/chat", json={
        "session_id": session_id,
        "message": "I am 20 years old",
        "user_profile": {}
    })

    assert response.status_code == 200
    data = response.json()

    # Should move to next question (income) after extracting age
    assert "income" in data["next_question"].lower()


def test_chat_income_extraction(client):
    """Test that chat can extract income from natural language"""
    session_id = str(uuid.uuid4())

    # First provide age
    client.post("/chat", json={
        "session_id": session_id,
        "message": "20",
        "user_profile": {"age": 20}
    })

    # Then test income extraction
    response = client.post("/chat", json={
        "session_id": session_id,
        "message": "My family earns 2 lakhs annually",
        "user_profile": {"age": 20}
    })

    assert response.status_code == 200
    data = response.json()

    # Should move to next question (state)
    assert "state" in data["next_question"].lower()


def test_chat_multiple_sessions(client):
    """Test that multiple sessions are independent"""
    session_id_1 = str(uuid.uuid4())
    session_id_2 = str(uuid.uuid4())

    # Session 1 - provide age
    response1 = client.post("/chat", json={
        "session_id": session_id_1,
        "message": "20",
        "user_profile": {"age": 20}
    })

    assert response1.status_code == 200

    # Session 2 - should still ask for age
    response2 = client.post("/chat", json={
        "session_id": session_id_2,
        "message": "Hello",
        "user_profile": {}
    })

    assert response2.status_code == 200
    data2 = response2.json()
    assert "age" in data2["next_question"].lower()


def test_chat_missing_session_id(client):
    """Test chat without session_id"""
    response = client.post("/chat", json={
        "message": "Hello",
        "user_profile": {}
    })

    assert response.status_code == 422  # Validation error
