"""
Tests for SMS endpoint
"""
import pytest


def test_sms_valid_request(client):
    """Test SMS sending with valid request"""
    response = client.post("/sms", json={
        "phone": "9876543210",
        "scheme_id": "scheme_1"
    })

    assert response.status_code == 200
    data = response.json()

    assert "status" in data
    assert "message" in data
    assert data["status"] == "sent"


def test_sms_invalid_phone_format(client):
    """Test SMS with invalid phone format"""
    # Phone starting with invalid digit
    response = client.post("/sms", json={
        "phone": "1234567890",  # Starts with 1, should start with 6-9
        "scheme_id": "scheme_1"
    })

    assert response.status_code == 422  # Validation error


def test_sms_invalid_phone_length(client):
    """Test SMS with invalid phone length"""
    response = client.post("/sms", json={
        "phone": "98765",  # Too short
        "scheme_id": "scheme_1"
    })

    assert response.status_code == 422  # Validation error


def test_sms_invalid_scheme_id(client):
    """Test SMS with non-existent scheme ID"""
    response = client.post("/sms", json={
        "phone": "9876543210",
        "scheme_id": "invalid_scheme"
    })

    assert response.status_code == 404  # Not found


def test_sms_all_schemes(client):
    """Test SMS for all available schemes"""
    phone = "9876543210"

    for i in range(1, 11):
        scheme_id = f"scheme_{i}"
        response = client.post("/sms", json={
            "phone": phone,
            "scheme_id": scheme_id
        })

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "sent"


def test_sms_response_structure(client):
    """Test SMS response structure"""
    response = client.post("/sms", json={
        "phone": "9876543210",
        "scheme_id": "scheme_1"
    })

    assert response.status_code == 200
    data = response.json()

    assert "status" in data
    assert "message" in data
    assert isinstance(data["status"], str)
    assert isinstance(data["message"], str)


def test_sms_phone_variations(client):
    """Test SMS with different valid phone number variations"""
    valid_phones = [
        "6000000000",  # Starts with 6
        "7000000000",  # Starts with 7
        "8000000000",  # Starts with 8
        "9000000000",  # Starts with 9
    ]

    for phone in valid_phones:
        response = client.post("/sms", json={
            "phone": phone,
            "scheme_id": "scheme_1"
        })

        assert response.status_code == 200


def test_sms_missing_fields(client):
    """Test SMS with missing required fields"""
    # Missing phone
    response = client.post("/sms", json={
        "scheme_id": "scheme_1"
    })
    assert response.status_code == 422

    # Missing scheme_id
    response = client.post("/sms", json={
        "phone": "9876543210"
    })
    assert response.status_code == 422
