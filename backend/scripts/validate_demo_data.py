from __future__ import annotations


import logging

import sys

from pathlib import Path


BACKEND_ROOT = Path(__file__).resolve().parents[1]

sys.path.insert(0, str(BACKEND_ROOT))


from app.core.database import SessionLocal, engine

from app.models import (

    AIEvaluation,

    Answer,

    Question,

    SessionAttempt,

    SessionTemplate,

    ShareLink,

    User,

    UserRole,

)


logger = logging.getLogger("validate_demo_data")


DEMO_USER_EMAIL = "demo.user@example.com"

DEMO_MENTOR_EMAIL = "mentor.demo@example.com"


def ensure_postgresql() -> None:

    if engine.dialect.name != "postgresql":

        raise RuntimeError(

            f"Demo validation is PostgreSQL-only. Current SQLAlchemy dialect: {engine.dialect.name}."

        )


def assert_count(name: str, value: int, minimum: int) -> None:

    if value < minimum:

        raise RuntimeError(f"{name} count is {value}, expected at least {minimum}.")


def main() -> None:

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

    ensure_postgresql()

    db = SessionLocal()

    try:

        demo_user = db.query(User).filter(User.email == DEMO_USER_EMAIL, User.role == UserRole.user).first()

        demo_mentor = db.query(User).filter(User.email == DEMO_MENTOR_EMAIL, User.role == UserRole.mentor).first()

        if not demo_user or not demo_mentor:

            raise RuntimeError("Demo user or demo mentor account is missing.")


        counts = {

            "Users": db.query(User).count(),

            "Templates": db.query(SessionTemplate).count(),

            "Questions": db.query(Question).count(),

            "Attempts": db.query(SessionAttempt).count(),

            "Answers": db.query(Answer).count(),

            "AI evaluations": db.query(AIEvaluation).count(),

            "Share links": db.query(ShareLink).count(),

        }

        minimums = {

            "Users": 2,

            "Templates": 6,

            "Questions": 40,

            "Attempts": 15,

            "Answers": 40,

            "AI evaluations": 40,

            "Share links": 3,

        }

        for name, minimum in minimums.items():

            assert_count(name, counts[name], minimum)


        orphan_checks = {

            "Templates without owner": db.query(SessionTemplate).outerjoin(User, SessionTemplate.owner_id == User.id).filter(User.id.is_(None)).count(),

            "Attempts without user": db.query(SessionAttempt).outerjoin(User, SessionAttempt.user_id == User.id).filter(User.id.is_(None)).count(),

            "Attempts without template": db.query(SessionAttempt).outerjoin(SessionTemplate, SessionAttempt.template_id == SessionTemplate.id).filter(SessionTemplate.id.is_(None)).count(),

            "Answers without attempt": db.query(Answer).outerjoin(SessionAttempt, Answer.attempt_id == SessionAttempt.id).filter(SessionAttempt.id.is_(None)).count(),

            "Answers without question": db.query(Answer).outerjoin(Question, Answer.question_id == Question.id).filter(Question.id.is_(None)).count(),

            "Evaluations without answer": db.query(AIEvaluation).outerjoin(Answer, AIEvaluation.answer_id == Answer.id).filter(Answer.id.is_(None)).count(),

            "Share links without template": db.query(ShareLink).outerjoin(SessionTemplate, ShareLink.template_id == SessionTemplate.id).filter(SessionTemplate.id.is_(None)).count(),

        }

        invalid = {name: count for name, count in orphan_checks.items() if count}

        if invalid:

            raise RuntimeError(f"Relation consistency failed: {invalid}")


        mentor_template_count = db.query(SessionTemplate).filter(SessionTemplate.owner_id == demo_mentor.id).count()

        user_template_count = db.query(SessionTemplate).filter(SessionTemplate.owner_id == demo_user.id).count()

        if mentor_template_count < 3 or user_template_count < 3:

            raise RuntimeError(

                f"Unexpected demo template ownership: user={user_template_count}, mentor={mentor_template_count}."

            )


        for name, value in counts.items():

            print(f"{name}: {value}")

        print("Relation consistency: OK")

        print("Demo accounts: OK")

    finally:

        db.close()


if __name__ == "__main__":

    main()

