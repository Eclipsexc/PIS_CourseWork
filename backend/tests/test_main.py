import os

import pytest

from fastapi.testclient import TestClient

from sqlalchemy import create_engine

from sqlalchemy.orm import sessionmaker

from app.main import app

from app.core.database import Base, get_db

from app.services.attempt_service import AttemptService


TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL") or os.environ.get("DATABASE_URL")

if not TEST_DATABASE_URL:

    raise RuntimeError("Set TEST_DATABASE_URL or DATABASE_URL to a PostgreSQL database before running backend tests.")

if not TEST_DATABASE_URL.startswith("postgresql"):

    raise RuntimeError("Backend tests are PostgreSQL-only. Do not use SQLite.")


engine = create_engine(TEST_DATABASE_URL)

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():

    try:

        db = TestingSessionLocal()

        yield db

    finally:

        db.close()


app.dependency_overrides[get_db] = override_get_db


client = TestClient(app)


@pytest.fixture(autouse=True)

def setup_database():

    Base.metadata.create_all(bind=engine)

    yield

    Base.metadata.drop_all(bind=engine)


def test_root():

    response = client.get("/")

    assert response.status_code == 200

    assert "message" in response.json()


def test_health_check():

    response = client.get("/health")

    assert response.status_code == 200

    assert response.json() == {"status": "healthy"}


def test_register_user():

    response = client.post(

        "/api/v1/auth/register",

        json={

            "email": "test@example.com",

            "full_name": "Test User",

            "password": "password123"

        }

    )

    assert response.status_code == 201

    assert response.json()["email"] == "test@example.com"


def test_register_mentor_role():

    response = client.post(

        "/api/v1/auth/register",

        json={

            "email": "mentor@example.com",

            "full_name": "Test Mentor",

            "password": "password123",

            "role": "mentor"

        }

    )

    assert response.status_code == 201

    assert response.json()["role"] == "mentor"


def test_login_user():


    client.post(

        "/api/v1/auth/register",

        json={

            "email": "test@example.com",

            "full_name": "Test User",

            "password": "password123"

        }

    )


    response = client.post(

        "/api/v1/auth/login",

        json={

            "email": "test@example.com",

            "password": "password123"

        }

    )

    assert response.status_code == 200

    assert "access_token" in response.json()


def test_user_cannot_create_assessment_template():

    client.post(

        "/api/v1/auth/register",

        json={

            "email": "student@example.com",

            "full_name": "Test Student",

            "password": "password123",

            "role": "user"

        }

    )

    login_response = client.post(

        "/api/v1/auth/login",

        json={

            "email": "student@example.com",

            "password": "password123"

        }

    )

    token = login_response.json()["access_token"]


    response = client.post(

        "/api/v1/templates",

        headers={"Authorization": f"Bearer {token}"},

        json={

            "title": "Assessment",

            "description": "Should be forbidden",

            "session_type": "assessment",

            "answer_mode": "text",

            "duration_minutes": 30,

            "questions": [

                {

                    "question_text": "Explain dependency injection.",

                    "question_type": "text_question",

                    "order_index": 0,

                    "reference_answer": "Dependency injection passes dependencies from outside."

                }

            ]

        }

    )


    assert response.status_code == 403


def test_template_requires_questions():

    client.post(

        "/api/v1/auth/register",

        json={

            "email": "questions@example.com",

            "full_name": "Question User",

            "password": "password123"

        }

    )

    login_response = client.post(

        "/api/v1/auth/login",

        json={

            "email": "questions@example.com",

            "password": "password123"

        }

    )

    token = login_response.json()["access_token"]


    response = client.post(

        "/api/v1/templates",

        headers={"Authorization": f"Bearer {token}"},

        json={

            "title": "Empty Template",

            "description": "No questions",

            "session_type": "practice",

            "answer_mode": "text",

            "duration_minutes": 30,

            "questions": []

        }

    )


    assert response.status_code == 422


def test_template_rejects_empty_question_answer():

    client.post(

        "/api/v1/auth/register",

        json={

            "email": "invalidqa@example.com",

            "full_name": "Invalid QA User",

            "password": "password123"

        }

    )

    login_response = client.post(

        "/api/v1/auth/login",

        json={

            "email": "invalidqa@example.com",

            "password": "password123"

        }

    )

    token = login_response.json()["access_token"]


    response = client.post(

        "/api/v1/templates",

        headers={"Authorization": f"Bearer {token}"},

        json={

            "title": "Invalid QA",

            "description": "Invalid question and answer",

            "session_type": "practice",

            "answer_mode": "text",

            "duration_minutes": 30,

            "questions": [

                {

                    "question_text": "   ",

                    "question_type": "text_question",

                    "order_index": 0,

                    "reference_answer": "short"

                }

            ]

        }

    )


    assert response.status_code == 422


def test_attempt_detail_includes_template_questions_and_answers():

    client.post(

        "/api/v1/auth/register",

        json={

            "email": "attemptdetail@example.com",

            "full_name": "Attempt Detail User",

            "password": "password123"

        }

    )

    login_response = client.post(

        "/api/v1/auth/login",

        json={

            "email": "attemptdetail@example.com",

            "password": "password123"

        }

    )

    token = login_response.json()["access_token"]

    headers = {"Authorization": f"Bearer {token}"}


    template_response = client.post(

        "/api/v1/templates",

        headers=headers,

        json={

            "title": "Attempt Detail Template",

            "description": "Template for attempt detail",

            "session_type": "practice",

            "answer_mode": "text",

            "duration_minutes": 30,

            "questions": [

                {

                    "question_text": "Explain overfitting in machine learning.",

                    "question_type": "text_question",

                    "order_index": 0,

                    "reference_answer": "Overfitting happens when a model memorizes training data and generalizes poorly."

                }

            ]

        }

    )

    template_id = template_response.json()["id"]

    client.post(f"/api/v1/templates/{template_id}/ready", headers=headers)


    attempt_response = client.post(

        "/api/v1/attempts",

        headers=headers,

        json={"template_id": template_id}

    )

    attempt_id = attempt_response.json()["id"]


    detail_response = client.get(f"/api/v1/attempts/{attempt_id}", headers=headers)

    detail = detail_response.json()


    assert detail_response.status_code == 200

    assert detail["template"]["id"] == template_id

    assert len(detail["questions"]) == 1

    assert detail["questions"][0]["question_text"] == "Explain overfitting in machine learning."

    assert detail["answers"] == []


def test_attempt_pause_resume_tracks_pause_state():

    client.post(

        "/api/v1/auth/register",

        json={

            "email": "pauseflow@example.com",

            "full_name": "Pause Flow User",

            "password": "password123"

        }

    )

    login_response = client.post(

        "/api/v1/auth/login",

        json={

            "email": "pauseflow@example.com",

            "password": "password123"

        }

    )

    token = login_response.json()["access_token"]

    headers = {"Authorization": f"Bearer {token}"}


    template_response = client.post(

        "/api/v1/templates",

        headers=headers,

        json={

            "title": "Pause Flow Template",

            "description": "Template for pause flow",

            "session_type": "practice",

            "answer_mode": "text",

            "duration_minutes": 30,

            "allow_pause": True,

            "strict_timer": False,

            "questions": [

                {

                    "question_text": "Explain overfitting in machine learning.",

                    "question_type": "text_question",

                    "order_index": 0,

                    "reference_answer": "Overfitting happens when a model memorizes training data and generalizes poorly."

                }

            ]

        }

    )

    template_id = template_response.json()["id"]

    client.post(f"/api/v1/templates/{template_id}/ready", headers=headers)


    attempt_response = client.post(

        "/api/v1/attempts",

        headers=headers,

        json={"template_id": template_id}

    )

    attempt_id = attempt_response.json()["id"]


    pause_response = client.post(f"/api/v1/attempts/{attempt_id}/pause", headers=headers)

    pause_data = pause_response.json()


    assert pause_response.status_code == 200

    assert pause_data["status"] == "paused"

    assert pause_data["paused_at"] is not None


    resume_response = client.post(f"/api/v1/attempts/{attempt_id}/resume", headers=headers)

    resume_data = resume_response.json()


    assert resume_response.status_code == 200

    assert resume_data["status"] == "active"

    assert resume_data["paused_at"] is None

    assert resume_data["paused_duration"] >= 0


def test_finish_attempt_enters_processing_state(monkeypatch):

    async def noop_process(attempt_id):

        return None


    monkeypatch.setattr(AttemptService, "process_attempt_evaluation", noop_process)


    client.post(

        "/api/v1/auth/register",

        json={

            "email": "finishflow@example.com",

            "full_name": "Finish Flow User",

            "password": "password123"

        }

    )

    login_response = client.post(

        "/api/v1/auth/login",

        json={

            "email": "finishflow@example.com",

            "password": "password123"

        }

    )

    token = login_response.json()["access_token"]

    headers = {"Authorization": f"Bearer {token}"}


    template_response = client.post(

        "/api/v1/templates",

        headers=headers,

        json={

            "title": "Finish Flow Template",

            "description": "Template for finish flow",

            "session_type": "practice",

            "answer_mode": "text",

            "duration_minutes": 30,

            "questions": [

                {

                    "question_text": "Explain overfitting in machine learning.",

                    "question_type": "text_question",

                    "order_index": 0,

                    "reference_answer": "Overfitting happens when a model memorizes training data and generalizes poorly."

                }

            ]

        }

    )

    template_id = template_response.json()["id"]

    client.post(f"/api/v1/templates/{template_id}/ready", headers=headers)


    attempt_response = client.post(

        "/api/v1/attempts",

        headers=headers,

        json={"template_id": template_id}

    )

    attempt_id = attempt_response.json()["id"]


    finish_response = client.post(f"/api/v1/attempts/{attempt_id}/finish", headers=headers)


    assert finish_response.status_code == 200

    assert finish_response.json()["status"] == "processing"

