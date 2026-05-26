from __future__ import annotations


import argparse

import logging

import sys

from dataclasses import dataclass

from datetime import datetime, timedelta

from pathlib import Path

from typing import Dict, Iterable, List


BACKEND_ROOT = Path(__file__).resolve().parents[1]

sys.path.insert(0, str(BACKEND_ROOT))


from app.core.database import Base, SessionLocal, engine

from app.core.security import get_password_hash

from app.models import (

    AccessType,

    AIEvaluation,

    Answer,

    AnswerMode,

    AttemptStatus,

    MentorFeedback,

    Question,

    QuestionType,

    SessionAttempt,

    SessionTemplate,

    SessionType,

    ShareLink,

    TemplateStatus,

    User,

    UserRole,

)

from app.services.ai_ml_service import AIMLService


logger = logging.getLogger("seed_demo_data")


DEMO_PASSWORD = "password123"

DEMO_USER_EMAIL = "demo.user@example.com"

DEMO_MENTOR_EMAIL = "mentor.demo@example.com"


@dataclass

class SeedCounts:

    users: int = 0

    templates: int = 0

    questions: int = 0

    attempts: int = 0

    answers: int = 0

    ai_evaluations: int = 0

    share_links: int = 0


def configure_logging() -> None:

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

    logging.getLogger("httpx").setLevel(logging.WARNING)


def ensure_postgresql() -> None:

    if engine.dialect.name != "postgresql":

        raise RuntimeError(

            f"Demo seeding is PostgreSQL-only. Current SQLAlchemy dialect: {engine.dialect.name}."

        )


def is_database_empty(db) -> bool:

    return db.query(User).count() == 0


def get_or_create_user(db, email: str, full_name: str, role: UserRole, counts: SeedCounts) -> User:

    user = db.query(User).filter(User.email == email).first()

    if user:

        user.full_name = full_name

        user.role = role

        return user


    user = User(

        email=email,

        full_name=full_name,

        password_hash=get_password_hash(DEMO_PASSWORD),

        role=role,

    )

    db.add(user)

    db.flush()

    counts.users += 1

    return user


def question(

    text: str,

    answer: str,

    index: int,

    qtype: QuestionType,

    difficulty: str,

    topic: str,

    keywords: Iterable[str],

) -> Dict:

    return {

        "question_text": text,

        "reference_answer": answer,

        "order_index": index,

        "question_type": qtype,

        "difficulty": difficulty,

        "topic": topic,

        "keywords": list(keywords),

        "evaluation_criteria": {

            "key_points": ["definition", "mechanism", "example", "tradeoff"],

            "scale": "0-100",

        },

    }


def template_specs() -> List[Dict]:

    sql_questions = [

        ("Що робить SELECT у SQL?", "SELECT читає дані з таблиць і може обмежувати колонки, фільтри та порядок результатів.", ["select", "таблиця", "дані"]),

        ("Для чого потрібен WHERE?", "WHERE задає умову фільтрації рядків до групування та сортування.", ["where", "фільтр", "умова"]),

        ("Що таке PRIMARY KEY?", "PRIMARY KEY унікально ідентифікує рядок і не допускає NULL.", ["primary", "key", "унікальність"]),

        ("Чим INNER JOIN відрізняється від LEFT JOIN?", "INNER JOIN повертає лише збіги, LEFT JOIN зберігає всі рядки з лівої таблиці.", ["join", "inner", "left"]),

        ("Для чого потрібен індекс у базі даних?", "Індекс пришвидшує пошук і сортування, але потребує місця та сповільнює записи.", ["індекс", "пошук", "сортування"]),

    ]

    react_questions = [

        ("Для чого у React використовують state?", "State зберігає локальні дані компонента, зміна яких запускає оновлення UI.", ["state", "component", "render"]),

        ("Чим props відрізняються від state?", "Props приходять ззовні, state належить компоненту або hook-логіці всередині.", ["props", "state", "дані"]),

        ("Для чого потрібен useEffect?", "useEffect запускає side effects після render і може очищати підписки.", ["useEffect", "side effect", "cleanup"]),

        ("Що таке controlled input?", "Controlled input бере value з React state і змінюється через onChange.", ["controlled", "input", "onChange"]),

        ("Навіщо потрібен key під час рендеру списків?", "Key допомагає React стабільно зіставляти елементи списку між render.", ["key", "list", "reconciliation"]),

    ]

    api_questions = [

        ("Що таке REST resource?", "REST resource є сутністю з URI, над якою виконуються HTTP-операції.", ["rest", "resource", "uri"]),

        ("Коли використовувати POST?", "POST використовують для створення ресурсу або запуску операції з побічним ефектом.", ["post", "create", "side effect"]),

        ("Навіщо потрібна idempotency?", "Idempotency гарантує однаковий результат повторного запиту, що важливо для retry.", ["idempotency", "retry", "safe"]),

        ("Що означає HTTP 401?", "401 означає, що користувач не автентифікований або token недійсний.", ["401", "auth", "token"]),

        ("Що таке pagination?", "Pagination ділить великий список на сторінки або курсори для керованого завантаження.", ["pagination", "cursor", "limit"]),

    ]

    architecture_questions = [

        ("Поясни різницю між monolith і microservices.", "Monolith має один deployable unit, microservices розділяють домени на окремі сервіси.", ["monolith", "microservices", "deploy"]),

        ("Що таке message broker?", "Message broker передає повідомлення між сервісами асинхронно і допомагає розв'язати компоненти.", ["broker", "queue", "async"]),

        ("Для чого потрібен cache?", "Cache зменшує latency і навантаження, але потребує інвалідації.", ["cache", "latency", "invalidation"]),

        ("Що таке eventual consistency?", "Eventual consistency означає, що дані узгоджуються не миттєво, але сходяться з часом.", ["eventual", "consistency", "distributed"]),

        ("Навіщо потрібен circuit breaker?", "Circuit breaker тимчасово блокує виклики до нестабільної залежності, щоб система деградувала контрольовано.", ["circuit", "breaker", "resilience"]),

        ("Що таке observability?", "Observability включає logs, metrics і traces для розуміння стану системи.", ["logs", "metrics", "traces"]),

        ("Як працює horizontal scaling?", "Horizontal scaling додає більше інстансів сервісу замість збільшення одного сервера.", ["scaling", "instances", "load"]),

        ("Для чого потрібен load balancer?", "Load balancer розподіляє трафік між інстансами та може виконувати health checks.", ["load", "balancer", "health"]),

        ("Що таке SLA?", "SLA визначає очікуваний рівень сервісу, наприклад uptime або latency.", ["sla", "uptime", "latency"]),

        ("Як планувати graceful degradation?", "Graceful degradation залишає критичні функції доступними, коли частина системи недоступна.", ["degradation", "fallback", "critical"]),

    ]

    video_questions = [

        question(

            f"Backend assessment питання {index + 1}: поясни тему {keyword}.",

            f"Еталон має містити визначення теми {keyword}, практичний приклад, ризики і короткий висновок.",

            index,

            QuestionType.oral_question if index % 2 == 0 else QuestionType.text_question,

            "middle" if index < 10 else "hard",

            "backend assessment",

            [keyword, "приклад", "ризик"],

        )

        for index, keyword in enumerate([

            "transaction", "index", "deadlock", "isolation", "queue", "cache", "jwt", "oauth",

            "rate limit", "pagination", "websocket", "docker", "migration", "replication", "backup",

            "observability", "load balancing", "circuit breaker", "event sourcing", "idempotency",

        ])

    ]


    return [

        {

            "owner": "user",

            "title": "Demo SQL Practice",

            "description": "Готовий тренувальний SQL шаблон.",

            "status": TemplateStatus.ready,

            "session_type": SessionType.practice,

            "answer_mode": AnswerMode.text,

            "duration": 25,

            "questions": [

                question(text, answer, index, QuestionType.text_question, "easy", "sql", keywords)

                for index, (text, answer, keywords) in enumerate(sql_questions)

            ],

        },

        {

            "owner": "user",

            "title": "Demo React Practice",

            "description": "React основи для короткого тренування.",

            "status": TemplateStatus.ready,

            "session_type": SessionType.practice,

            "answer_mode": AnswerMode.voice,

            "duration": 20,

            "questions": [

                question(text, answer, index, QuestionType.oral_question, "easy", "react", keywords)

                for index, (text, answer, keywords) in enumerate(react_questions)

            ],

        },

        {

            "owner": "user",

            "title": "Draft API Notes",

            "description": "Чернетка practice-шаблону з API питань.",

            "status": TemplateStatus.draft,

            "session_type": SessionType.practice,

            "answer_mode": AnswerMode.text,

            "duration": 15,

            "questions": [

                question(text, answer, index, QuestionType.text_question, "easy", "api", keywords)

                for index, (text, answer, keywords) in enumerate(api_questions)

            ],

        },

        {

            "owner": "mentor",

            "title": "Backend Video Assessment",

            "description": "Оціночна відео-сесія від ментора.",

            "status": TemplateStatus.ready,

            "session_type": SessionType.assessment,

            "answer_mode": AnswerMode.voice_video,

            "duration": 45,

            "questions": video_questions,

        },

        {

            "owner": "mentor",

            "title": "System Design Locked Bank",

            "description": "Заблокований банк system design питань.",

            "status": TemplateStatus.locked,

            "session_type": SessionType.practice,

            "answer_mode": AnswerMode.text,

            "duration": 40,

            "questions": [

                question(text, answer, index, QuestionType.coding_question if index % 4 == 0 else QuestionType.text_question, "hard", "architecture", keywords)

                for index, (text, answer, keywords) in enumerate(architecture_questions)

            ],

        },

        {

            "owner": "mentor",

            "title": "Archived Legacy Interview",

            "description": "Архівний шаблон для історичних результатів.",

            "status": TemplateStatus.archived,

            "session_type": SessionType.practice,

            "answer_mode": AnswerMode.text,

            "duration": 30,

            "questions": [

                question(text, answer, index, QuestionType.text_question, "middle", "legacy", keywords)

                for index, (text, answer, keywords) in enumerate(sql_questions + react_questions)

            ],

        },

    ]


def get_or_create_template(db, owner: User, spec: Dict, counts: SeedCounts) -> SessionTemplate:

    template = db.query(SessionTemplate).filter(

        SessionTemplate.owner_id == owner.id,

        SessionTemplate.title == spec["title"],

    ).first()

    if not template:

        template = SessionTemplate(

            owner_id=owner.id,

            title=spec["title"],

            description=spec["description"],

            status=spec["status"],

            session_type=spec["session_type"],

            answer_mode=spec["answer_mode"],

            duration_minutes=spec["duration"],

            allow_pause=spec["session_type"] == SessionType.practice,

            max_attempts=1 if spec["session_type"] == SessionType.assessment else None,

            strict_timer=spec["session_type"] == SessionType.assessment,

            camera_required=spec["answer_mode"] == AnswerMode.voice_video,

            voice_required=spec["answer_mode"] in (AnswerMode.voice, AnswerMode.voice_video),

            randomized_questions=spec["session_type"] == SessionType.assessment,

        )

        db.add(template)

        db.flush()

        counts.templates += 1


    template.description = spec["description"]

    template.status = spec["status"]

    template.session_type = spec["session_type"]

    template.answer_mode = spec["answer_mode"]

    template.duration_minutes = spec["duration"]

    template.allow_pause = spec["session_type"] == SessionType.practice

    template.max_attempts = 1 if spec["session_type"] == SessionType.assessment else None

    template.strict_timer = spec["session_type"] == SessionType.assessment

    template.camera_required = spec["answer_mode"] == AnswerMode.voice_video

    template.voice_required = spec["answer_mode"] in (AnswerMode.voice, AnswerMode.voice_video)

    template.randomized_questions = spec["session_type"] == SessionType.assessment

    return template


def sync_questions(db, template: SessionTemplate, spec: Dict, counts: SeedCounts) -> List[Question]:

    existing = {

        question.order_index: question

        for question in db.query(Question).filter(Question.template_id == template.id).all()

    }

    questions = []

    for item in spec["questions"]:

        model = existing.get(item["order_index"])

        if not model:

            model = Question(

                template_id=template.id,

                order_index=item["order_index"],

                question_text=item["question_text"],

                reference_answer=item["reference_answer"],

                question_type=item["question_type"],

                difficulty=item["difficulty"],

                topic=item["topic"],

                keywords=item["keywords"],

                evaluation_criteria=item["evaluation_criteria"],

            )

            db.add(model)

            db.flush()

            counts.questions += 1

        model.question_text = item["question_text"]

        model.reference_answer = item["reference_answer"]

        model.question_type = item["question_type"]

        model.difficulty = item["difficulty"]

        model.topic = item["topic"]

        model.keywords = item["keywords"]

        model.evaluation_criteria = item["evaluation_criteria"]

        questions.append(model)

    return questions


def attempt_key(user: User, template: SessionTemplate, index: int) -> datetime:

    return datetime(2026, 5, 1, 9, 0, 0) + timedelta(days=index, minutes=template.id % 17 + user.id)


def realistic_answer(question_model: Question, attempt_index: int) -> str:

    return (

        f"{question_model.question_text} "

        f"Я пояснюю це через визначення, механізм роботи і приклад. "

        f"Ключова ідея: {question_model.reference_answer} "

        f"У практиці це важливо для стабільності системи, швидкості розробки і зрозумілого результату. "

        f"Висновок: рішення треба оцінювати за контекстом задачі та trade-offs. Спроба #{attempt_index + 1}."

    )


def get_or_create_attempt(

    db,

    user: User,

    template: SessionTemplate,

    status_value: AttemptStatus,

    index: int,

    counts: SeedCounts,

    started_at: datetime | None = None,

) -> SessionAttempt:

    started_at = started_at or attempt_key(user, template, index)

    attempt = db.query(SessionAttempt).filter(

        SessionAttempt.user_id == user.id,

        SessionAttempt.template_id == template.id,

        SessionAttempt.started_at == started_at,

    ).first()

    if not attempt:

        attempt = SessionAttempt(user_id=user.id, template_id=template.id, started_at=started_at)

        db.add(attempt)

        db.flush()

        counts.attempts += 1


    attempt.status = status_value

    attempt.created_at = started_at

    attempt.paused_duration = 0

    attempt.paused_at = None

    if status_value in (AttemptStatus.completed, AttemptStatus.reviewed, AttemptStatus.under_review, AttemptStatus.failed):

        attempt.finished_at = started_at + timedelta(minutes=18 + index)

    else:

        attempt.finished_at = None

    return attempt


def get_or_create_answer(

    db,

    attempt: SessionAttempt,

    question_model: Question,

    attempt_index: int,

    counts: SeedCounts,

) -> Answer:

    answer = db.query(Answer).filter(

        Answer.attempt_id == attempt.id,

        Answer.question_id == question_model.id,

    ).first()

    if not answer:

        answer = Answer(attempt_id=attempt.id, question_id=question_model.id)

        db.add(answer)

        db.flush()

        counts.answers += 1


    answer.answer_text = realistic_answer(question_model, attempt_index)

    answer.transcript = answer.answer_text if attempt.template.answer_mode in (AnswerMode.voice, AnswerMode.voice_video) else None

    answer.video_url = None

    answer.audio_url = None

    answer.submitted_at = attempt.started_at + timedelta(minutes=2 + question_model.order_index)

    answer.duration_seconds = 75 + question_model.order_index * 8

    return answer


def get_or_create_evaluation(db, answer: Answer, question_model: Question, counts: SeedCounts) -> AIEvaluation:

    evaluation = db.query(AIEvaluation).filter(AIEvaluation.answer_id == answer.id).first()

    if not evaluation:

        evaluation = AIEvaluation(answer_id=answer.id, total_score=0)

        db.add(evaluation)

        db.flush()

        counts.ai_evaluations += 1


    result = AIMLService.evaluate_answer(

        answer_text=answer.answer_text,

        reference_answer=question_model.reference_answer,

        keywords=question_model.keywords,

    )

    evaluation.semantic_score = result["semantic_score"]

    evaluation.keyword_score = result["keyword_score"]

    evaluation.completeness_score = result["completeness_score"]

    evaluation.structure_score = result["structure_score"]

    evaluation.speech_score = result["speech_score"]

    evaluation.total_score = result["total_score"]

    evaluation.source = result["source"]

    evaluation.feedback_text = result["feedback_text"]

    evaluation.weak_points = result["weak_points"]

    evaluation.recommendations = result["recommendations"]

    evaluation.missing_concepts = result["missing_concepts"]

    return evaluation


def update_attempt_scores(attempt: SessionAttempt) -> None:

    scores = [

        answer.ai_evaluation.total_score

        for answer in attempt.answers

        if answer.ai_evaluation and answer.ai_evaluation.total_score is not None

    ]

    average = round(sum(scores) / len(scores), 2) if scores else 0.0

    attempt.ai_score = average

    attempt.total_score = average

    if attempt.status == AttemptStatus.completed:

        attempt.final_score = average

    elif attempt.status == AttemptStatus.reviewed:

        attempt.mentor_score = min(100.0, round(average + 4.5, 2))

        attempt.final_score = attempt.mentor_score


def apply_demo_score_profile(attempt: SessionAttempt, score: float) -> None:

    bounded_score = round(max(0.0, min(100.0, score)), 2)

    attempt.ai_score = bounded_score

    attempt.total_score = bounded_score

    if attempt.status == AttemptStatus.reviewed:

        attempt.mentor_score = round(max(0.0, min(100.0, bounded_score + 2.25)), 2)

        attempt.final_score = attempt.mentor_score

    elif attempt.status == AttemptStatus.completed:

        attempt.final_score = bounded_score


    for answer in attempt.answers:

        if answer.ai_evaluation:

            drift = ((answer.question_id % 5) - 2) * 1.35

            answer.ai_evaluation.total_score = round(max(0.0, min(100.0, bounded_score + drift)), 2)


def ensure_mentor_feedback(db, attempt: SessionAttempt, mentor: User) -> None:

    if attempt.status != AttemptStatus.reviewed:

        return

    feedback = db.query(MentorFeedback).filter(MentorFeedback.attempt_id == attempt.id).first()

    if not feedback:

        feedback = MentorFeedback(attempt_id=attempt.id, mentor_id=mentor.id, final_score=attempt.final_score or 0)

        db.add(feedback)

    feedback.mentor_id = mentor.id

    feedback.final_score = attempt.final_score or attempt.ai_score or 0

    feedback.comment = (

        "Демо-коментар ментора: відповідь має робочу структуру, але варто точніше називати ключові поняття "

        "і завершувати кожну відповідь коротким висновком."

    )

    feedback.override_reason = "Demo assessment calibration"


def seed_attempts(db, users: Dict[str, User], templates: Dict[str, SessionTemplate], counts: SeedCounts) -> None:

    plan = [

        ("user", "Demo SQL Practice", AttemptStatus.completed, 0, 5),

        ("user", "Demo SQL Practice", AttemptStatus.completed, 1, 5),

        ("user", "Demo SQL Practice", AttemptStatus.in_progress, 2, 3),

        ("user", "Demo React Practice", AttemptStatus.completed, 3, 5),

        ("user", "Demo React Practice", AttemptStatus.failed, 4, 2),

        ("user", "Backend Video Assessment", AttemptStatus.reviewed, 5, 6),

        ("user", "Backend Video Assessment", AttemptStatus.under_review, 6, 5),

        ("mentor", "Demo SQL Practice", AttemptStatus.completed, 7, 4),

        ("mentor", "Demo React Practice", AttemptStatus.completed, 8, 4),

        ("mentor", "Archived Legacy Interview", AttemptStatus.completed, 9, 5),

        ("mentor", "System Design Locked Bank", AttemptStatus.completed, 10, 5),

        ("mentor", "System Design Locked Bank", AttemptStatus.in_progress, 11, 3),

        ("mentor", "System Design Locked Bank", AttemptStatus.failed, 12, 2),

        ("user", "Archived Legacy Interview", AttemptStatus.completed, 13, 5),

        ("user", "System Design Locked Bank", AttemptStatus.completed, 14, 5),

        ("user", "Demo SQL Practice", AttemptStatus.completed, 15, 5),

    ]

    mentor = users["mentor"]

    for user_key, template_title, status_value, index, answer_limit in plan:

        user = users[user_key]

        template = templates[template_title]

        attempt = get_or_create_attempt(db, user, template, status_value, index, counts)

        questions = db.query(Question).filter(Question.template_id == template.id).order_by(Question.order_index).limit(answer_limit).all()

        for question_model in questions:

            answer = get_or_create_answer(db, attempt, question_model, index, counts)

            get_or_create_evaluation(db, answer, question_model, counts)

        db.flush()

        db.refresh(attempt)

        update_attempt_scores(attempt)

        ensure_mentor_feedback(db, attempt, mentor)


    trend_base = datetime(2026, 5, 26, 9, 30, 0)

    trend_plan = []

    for offset, days_ago in enumerate([0, 1, 2, 3, 4, 5, 6]):

        trend_plan.append(("user", "Demo SQL Practice", AttemptStatus.completed, 100 + offset, 5, days_ago))

        trend_plan.append(("mentor", "Demo React Practice", AttemptStatus.completed, 120 + offset, 5, days_ago))


    for offset, days_ago in enumerate(range(8, 31, 2)):

        trend_plan.append(("user", "Demo React Practice", AttemptStatus.completed, 140 + offset, 5, days_ago))

        trend_plan.append(("mentor", "System Design Locked Bank", AttemptStatus.completed, 170 + offset, 6, days_ago))


    for offset, days_ago in enumerate(range(45, 361, 15)):

        trend_plan.append(("user", "Archived Legacy Interview", AttemptStatus.completed, 200 + offset, 6, days_ago))

        trend_plan.append(("user", "Backend Video Assessment", AttemptStatus.reviewed, 240 + offset, 5, days_ago))

        trend_plan.append(("mentor", "Demo SQL Practice", AttemptStatus.completed, 280 + offset, 5, days_ago))


    for user_key, template_title, status_value, index, answer_limit, days_ago in trend_plan:

        user = users[user_key]

        template = templates[template_title]

        started_at = trend_base - timedelta(days=days_ago, minutes=index % 90)

        attempt = get_or_create_attempt(db, user, template, status_value, index, counts, started_at=started_at)

        questions = db.query(Question).filter(Question.template_id == template.id).order_by(Question.order_index).limit(answer_limit).all()

        for question_model in questions:

            answer = get_or_create_answer(db, attempt, question_model, index, counts)

            get_or_create_evaluation(db, answer, question_model, counts)

        db.flush()

        db.refresh(attempt)

        profile_score = 48 + ((index * 7 + days_ago * 3) % 47)

        apply_demo_score_profile(attempt, profile_score)

        ensure_mentor_feedback(db, attempt, mentor)


def get_or_create_share_link(

    db,

    token: str,

    template: SessionTemplate,

    creator: User,

    access_type: AccessType,

    counts: SeedCounts,

    recipient_email: str | None = None,

) -> ShareLink:

    share = db.query(ShareLink).filter(ShareLink.token == token).first()

    if not share:

        share = ShareLink(

            token=token,

            template_id=template.id,

            created_by=creator.id,

            access_type=access_type,

            recipient_email=recipient_email,

            expires_at=datetime.utcnow() + timedelta(days=90),

        )

        db.add(share)

        db.flush()

        counts.share_links += 1

    share.template_id = template.id

    share.created_by = creator.id

    share.access_type = access_type

    share.recipient_email = recipient_email

    share.expires_at = datetime.utcnow() + timedelta(days=90)

    return share


def seed_share_links(db, users: Dict[str, User], templates: Dict[str, SessionTemplate], counts: SeedCounts) -> None:

    get_or_create_share_link(

        db,

        "demo-public-sql-practice",

        templates["Demo SQL Practice"],

        users["user"],

        AccessType.public,

        counts,

    )

    get_or_create_share_link(

        db,

        "demo-public-backend-assessment",

        templates["Backend Video Assessment"],

        users["mentor"],

        AccessType.public,

        counts,

    )

    get_or_create_share_link(

        db,

        "demo-private-user-assessment",

        templates["Backend Video Assessment"],

        users["mentor"],

        AccessType.private,

        counts,

        recipient_email=users["user"].email,

    )


def validate_relations(db) -> None:

    checks = {

        "orphan_templates": db.query(SessionTemplate).outerjoin(User, SessionTemplate.owner_id == User.id).filter(User.id.is_(None)).count(),

        "orphan_attempts_user": db.query(SessionAttempt).outerjoin(User, SessionAttempt.user_id == User.id).filter(User.id.is_(None)).count(),

        "orphan_attempts_template": db.query(SessionAttempt).outerjoin(SessionTemplate, SessionAttempt.template_id == SessionTemplate.id).filter(SessionTemplate.id.is_(None)).count(),

        "orphan_answers_attempt": db.query(Answer).outerjoin(SessionAttempt, Answer.attempt_id == SessionAttempt.id).filter(SessionAttempt.id.is_(None)).count(),

        "orphan_answers_question": db.query(Answer).outerjoin(Question, Answer.question_id == Question.id).filter(Question.id.is_(None)).count(),

        "orphan_evaluations": db.query(AIEvaluation).outerjoin(Answer, AIEvaluation.answer_id == Answer.id).filter(Answer.id.is_(None)).count(),

        "orphan_share_links": db.query(ShareLink).outerjoin(SessionTemplate, ShareLink.template_id == SessionTemplate.id).filter(SessionTemplate.id.is_(None)).count(),

    }

    invalid = {name: count for name, count in checks.items() if count}

    if invalid:

        raise RuntimeError(f"Relation validation failed: {invalid}")


def seed(only_empty: bool = False) -> SeedCounts:

    ensure_postgresql()

    Base.metadata.create_all(bind=engine)

    counts = SeedCounts()

    db = SessionLocal()

    try:

        if only_empty and not is_database_empty(db):

            logger.info("AUTO_SEED skipped: database is not empty.")

            return counts


        users = {

            "user": get_or_create_user(db, DEMO_USER_EMAIL, "Demo Prepared User", UserRole.user, counts),

            "mentor": get_or_create_user(db, DEMO_MENTOR_EMAIL, "Demo Mentor", UserRole.mentor, counts),

        }

        db.flush()


        templates = {}

        for spec in template_specs():

            owner = users[spec["owner"]]

            template = get_or_create_template(db, owner, spec, counts)

            db.flush()

            sync_questions(db, template, spec, counts)

            templates[spec["title"]] = template


        db.flush()

        seed_attempts(db, users, templates, counts)

        seed_share_links(db, users, templates, counts)

        validate_relations(db)

        db.commit()

        logger.info("Demo data seed committed successfully.")

        return counts

    except Exception:

        db.rollback()

        logger.exception("Demo data seed failed; transaction rolled back.")

        raise

    finally:

        db.close()


def print_counts(counts: SeedCounts) -> None:

    print(f"Users created: {counts.users}")

    print(f"Templates created: {counts.templates}")

    print(f"Questions created: {counts.questions}")

    print(f"Attempts created: {counts.attempts}")

    print(f"Answers created: {counts.answers}")

    print(f"AI evaluations created: {counts.ai_evaluations}")

    print(f"Share links created: {counts.share_links}")


def main() -> None:

    parser = argparse.ArgumentParser(description="Seed demo data into PostgreSQL.")

    parser.add_argument("--only-empty", action="store_true", help="Skip seeding when users already exist.")

    args = parser.parse_args()

    configure_logging()

    counts = seed(only_empty=args.only_empty)

    print_counts(counts)

    print(f"Demo user: {DEMO_USER_EMAIL} / {DEMO_PASSWORD}")

    print(f"Demo mentor: {DEMO_MENTOR_EMAIL} / {DEMO_PASSWORD}")


if __name__ == "__main__":

    main()

