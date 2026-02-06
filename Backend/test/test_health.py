"""
Tests for health check endpoint
"""
import pytest


def test_health_check(client):
    """Test health check endpoint"""
    response = client.get("/health")

    assert response.status_code == 200
    data = response.json()

    assert "status" in data
    assert "services" in data
    assert data["status"] == "healthy"


def test_health_services_structure(client):
    """Test health check services structure"""
    response = client.get("/health")

    assert response.status_code == 200
    data = response.json()

    services = data["services"]

    # Check required services
    assert "vector_db" in services
    assert "llm" in services
    assert "sms" in services

    # Each service should have a status
    assert services["vector_db"] in ["ok", "fallback"]
    assert services["llm"] in ["ok", "fallback"]
    assert services["sms"] in ["ok", "mock"]


def test_health_response_format(client):
    """Test health check response format"""
    response = client.get("/health")

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/json"

    data = response.json()

    # Validate types
    assert isinstance(data["status"], str)
    assert isinstance(data["services"], dict)

    for service_name, service_status in data["services"].items():
        assert isinstance(service_name, str)
        assert isinstance(service_status, str)
