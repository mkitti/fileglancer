"""Tests for the /api/tokens management endpoints.

These use the cookie-auth override from test_endpoints, since token
management is deliberately session-only.
"""
import pytest

from test_endpoints import TEST_USERNAME, temp_dir, test_app, test_client  # noqa: F401


def test_list_is_empty_for_a_new_user(test_client):
    response = test_client.get("/api/tokens")

    assert response.status_code == 200
    assert response.json() == {"tokens": []}


def test_create_returns_the_secret_exactly_once(test_client):
    response = test_client.post("/api/tokens", json={
        "name": "laptop", "scopes": ["files:read"], "expires_in_days": 30,
    })

    assert response.status_code == 201
    body = response.json()
    assert body["secret"].startswith("fgt_")
    assert body["token"]["name"] == "laptop"
    assert body["token"]["scopes"] == ["files:read"]

    # The secret never appears again in the listing.
    listing = test_client.get("/api/tokens").json()
    assert len(listing["tokens"]) == 1
    assert "secret" not in listing["tokens"][0]
    assert "token_hash" not in listing["tokens"][0]


def test_create_defaults_to_thirty_days(test_client):
    response = test_client.post("/api/tokens", json={
        "name": "laptop", "scopes": ["files:read"],
    })

    assert response.status_code == 201


def test_create_rejects_unknown_scope(test_client):
    response = test_client.post("/api/tokens", json={
        "name": "bad", "scopes": ["files:read", "secrets:steal"],
    })

    assert response.status_code == 400
    assert "secrets:steal" in response.json()["error"]


def test_create_rejects_empty_scope_list(test_client):
    response = test_client.post("/api/tokens", json={"name": "bad", "scopes": []})

    assert response.status_code == 400


def test_create_rejects_expiry_over_the_maximum(test_client):
    response = test_client.post("/api/tokens", json={
        "name": "forever", "scopes": ["files:read"], "expires_in_days": 366,
    })

    assert response.status_code == 400


def test_create_rejects_blank_name(test_client):
    response = test_client.post("/api/tokens", json={
        "name": "", "scopes": ["files:read"],
    })

    assert response.status_code == 400


def test_delete_revokes_the_token(test_client):
    token_id = test_client.post("/api/tokens", json={
        "name": "laptop", "scopes": ["files:read"],
    }).json()["token"]["token_id"]

    assert test_client.delete(f"/api/tokens/{token_id}").status_code == 200
    assert test_client.get("/api/tokens").json() == {"tokens": []}


def test_delete_unknown_token_returns_404(test_client):
    assert test_client.delete("/api/tokens/doesnotexist").status_code == 404
