from fastapi.testclient import TestClient
from src.app import app

client = TestClient(app)


def test_get_activities():
    res = client.get("/activities")
    assert res.status_code == 200
    data = res.json()
    # Basic sanity: chess club exists in the seeded data
    assert "Chess Club" in data


def test_signup_and_remove_participant():
    activity = "Chess Club"
    email = "test_user_1@mergington.edu"

    # Ensure test email is not already present
    res = client.get("/activities")
    assert res.status_code == 200
    data = res.json()
    assert email not in data[activity]["participants"]

    # Sign up
    res = client.post(f"/activities/{activity}/signup?email={email}")
    assert res.status_code == 200
    assert "Signed up" in res.json().get("message", "")

    # Verify participant appears
    res = client.get("/activities")
    data = res.json()
    assert email in data[activity]["participants"]

    # Remove participant
    res = client.delete(f"/activities/{activity}/participants?email={email}")
    assert res.status_code == 200
    assert "Removed" in res.json().get("message", "")

    # Verify removed
    res = client.get("/activities")
    data = res.json()
    assert email not in data[activity]["participants"]


def test_signup_existing_participant_fails():
    # michael@mergington.edu is present in seeded data -> signup should fail with 400
    res = client.post("/activities/Chess%20Club/signup?email=michael@mergington.edu")
    assert res.status_code == 400


def test_remove_nonexistent_participant():
    res = client.delete("/activities/Chess%20Club/participants?email=nonexistent@mergington.edu")
    assert res.status_code == 404
