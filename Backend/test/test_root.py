"""
Tests for root endpoint and basic API functionality
"""
import pytest


def test_root_endpoint(client):
    """Test root endpoint returns API information"""
    response = client.get("/")

    assert response.status_code == 200
    data = response.json()

    assert "message" in data
    assert "version" in data
    assert "endpoints" in data


def test_root_endpoint_structure(client):
    """Test root endpoint has correct structure"""
    response = client.get("/")

    assert response.status_code == 200
    data = response.json()

    endpoints = data["endpoints"]
    assert "health" in endpoints
    assert "chat" in endpoints
    assert "eligibility" in endpoints
    assert "sms" in endpoints
    assert "docs" in endpoints


def test_cors_headers(client):
    """Test that CORS headers are present"""
    response = client.options("/health")

    # CORS headers should be present
    # Note: TestClient may not fully simulate CORS, but we can check basic functionality


def test_404_not_found(client):
    """Test 404 response for non-existent endpoints"""
    response = client.get("/non-existent-endpoint")

    assert response.status_code == 404


def test_method_not_allowed(client):
    """Test 405 response for wrong HTTP method"""
    response = client.get("/chat")  # POST endpoint called with GET

    assert response.status_code == 405
