"""
Tests for eligibility endpoint
"""
import pytest


def test_eligibility_general_user(client, sample_user_profile):
    """Test eligibility check for general category user"""
    response = client.post("/eligibility", json=sample_user_profile)

    assert response.status_code == 200
    data = response.json()

    assert "eligible_schemes" in data
    assert "count" in data
    assert isinstance(data["eligible_schemes"], list)
    assert data["count"] == len(data["eligible_schemes"])
    assert data["count"] > 0  # Should have at least some schemes


def test_eligibility_obc_user(client, sample_obc_profile):
    """Test eligibility check for OBC category user"""
    response = client.post("/eligibility", json=sample_obc_profile)

    assert response.status_code == 200
    data = response.json()

    assert data["count"] > 0

    # Check that PM YASASVI scheme (OBC-specific) is included
    scheme_ids = [s["id"] for s in data["eligible_schemes"]]
    assert "scheme_2" in scheme_ids  # PM YASASVI is for OBC


def test_eligibility_sc_user(client, sample_sc_profile):
    """Test eligibility check for SC category user"""
    response = client.post("/eligibility", json=sample_sc_profile)

    assert response.status_code == 200
    data = response.json()

    assert data["count"] > 0

    # Check that SC-specific scheme is included
    scheme_ids = [s["id"] for s in data["eligible_schemes"]]
    assert "scheme_3" in scheme_ids  # Post Matric Scholarship for SC


def test_eligibility_high_income(client, sample_high_income_profile):
    """Test eligibility check for high income user"""
    response = client.post("/eligibility", json=sample_high_income_profile)

    assert response.status_code == 200
    data = response.json()

    # High income should have fewer schemes
    # Only schemes with income_max >= 900000 should match
    for scheme in data["eligible_schemes"]:
        assert scheme["income_max"] >= 900000


def test_eligibility_invalid_age(client):
    """Test eligibility with invalid age"""
    response = client.post("/eligibility", json={
        "age": 150,  # Invalid age
        "income": 200000,
        "state": "Maharashtra",
        "category": "General"
    })

    assert response.status_code == 422  # Validation error


def test_eligibility_negative_income(client):
    """Test eligibility with negative income"""
    response = client.post("/eligibility", json={
        "age": 20,
        "income": -5000,  # Negative income
        "state": "Maharashtra",
        "category": "General"
    })

    assert response.status_code == 422  # Validation error


def test_eligibility_missing_fields(client):
    """Test eligibility with missing required fields"""
    response = client.post("/eligibility", json={
        "age": 20,
        "income": 200000
        # Missing state and category
    })

    assert response.status_code == 422  # Validation error


def test_eligibility_response_structure(client, sample_user_profile):
    """Test that response has correct structure"""
    response = client.post("/eligibility", json=sample_user_profile)

    assert response.status_code == 200
    data = response.json()

    # Check response structure
    assert "eligible_schemes" in data
    assert "count" in data

    # Check scheme structure
    if data["count"] > 0:
        scheme = data["eligible_schemes"][0]
        assert "id" in scheme
        assert "name" in scheme
        assert "state" in scheme
        assert "category" in scheme
        assert "income_max" in scheme
        assert "age_min" in scheme
        assert "age_max" in scheme
        assert "benefits" in scheme
        assert "documents" in scheme
        assert "apply_link" in scheme
        assert "eligibilityReason" in scheme


def test_eligibility_state_specific(client):
    """Test state-specific scheme matching"""
    # Test Maharashtra-specific scheme
    response = client.post("/eligibility", json={
        "age": 18,
        "income": 500000,
        "state": "Maharashtra",
        "category": "General"
    })

    assert response.status_code == 200
    data = response.json()

    # Should include Maharashtra State Merit Scholarship
    scheme_ids = [s["id"] for s in data["eligible_schemes"]]
    assert "scheme_4" in scheme_ids


def test_eligibility_age_boundary(client):
    """Test age boundary conditions"""
    # Test minimum age boundary for a scheme
    response = client.post("/eligibility", json={
        "age": 17,  # Minimum age for many schemes
        "income": 200000,
        "state": "Karnataka",
        "category": "General"
    })

    assert response.status_code == 200
    data = response.json()
    assert data["count"] > 0

    # Test age just below minimum
    response = client.post("/eligibility", json={
        "age": 5,  # Too young for most schemes
        "income": 200000,
        "state": "Karnataka",
        "category": "General"
    })

    assert response.status_code == 200
    data = response.json()
    # Should have very few or no schemes
    assert data["count"] <= 1  # Only TN Free Education allows age 6+
