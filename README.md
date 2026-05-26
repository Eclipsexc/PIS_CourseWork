# PrepAI

PrepAI is a session-based preparation and assessment platform for interviews, exams, and oral-answer practice. The system separates repeatable self-training from mentor-controlled assessment and uses a dedicated AI/ML service for answer analysis, file parsing, and future inference extensions.

The core domain flow is:

```text
template -> attempt -> answer -> AI evaluation -> mentor review -> result analytics
```

PrepAI is not designed as a generic chatbot wrapper. The main value of the system is the controlled session lifecycle: templates define questions and answer modes, attempts store how a user passed a session, AI evaluation provides a preliminary technical score, and the mentor can make the final decision for assessment sessions.

## Main Features

- Practice sessions for repeatable user training.
- Assessment sessions created and reviewed by mentors.
- Text, voice, and voice/video answer modes.
- Question template import from `.txt` and text-layer `.pdf` files.
- Public and private template sharing through links and invitations.
- One-attempt assessment flow.
- Mentor review with final score, comment, and override reason.
- AI-assisted answer evaluation on a 0-100 scale.
- Submitted answer review after completion.
- Dashboard with score dynamics for week, month, year, and all-time ranges.
- Frontend video metrics summary for voice/video attempts.
- PostgreSQL migrations, demo seeding, and demo-data validation.

## Architecture

The project is split into three application parts and one persistent database:

```text
frontend       React + Vite user interface
backend        FastAPI domain API
ai_ml_service  FastAPI analysis service
postgres       PostgreSQL database
```

The backend is the owner of domain rules. It handles authentication, authorization, template permissions, attempt lifecycle, invitation validation, mentor workflow, database transactions, and persistence.

The AI/ML service is intentionally separated from the backend. Answer analysis, text extraction, transcription hooks, and future model inference can be slower or less predictable than regular API operations. Keeping them in a separate service gives a cleaner boundary and allows the main backend flow to remain stable if AI processing becomes unavailable or needs to be scaled separately.

The current implementation uses a pragmatic monolith plus AI/ML-service architecture. The backend remains one coherent domain application, while AI-heavy processing is isolated behind HTTP calls.

## Runtime Stack

Frontend:

- React 18;
- Vite;
- Tailwind CSS;
- shadcn-style local UI components;
- Lucide icons;
- React Router;
- Zustand;
- Axios;
- browser MediaDevices, MediaRecorder, and Web Speech APIs where supported.

Backend:

- FastAPI;
- SQLAlchemy ORM;
- Alembic migrations;
- PostgreSQL;
- JWT authentication;
- Pydantic schemas;
- service layer for attempts, templates, mentor flow, analytics, and AI/ML integration.

AI/ML service:

- FastAPI;
- local heuristic text analysis;
- `.txt` extraction;
- text-layer `.pdf` extraction through `pypdf`;
- Q/A parsing;
- extension endpoints for transcription and video analysis.

Database:

- PostgreSQL is the only durable database.
- Redis is not used in the current version.
- Blob storage is not used in the current version.
- Raw video is not stored in PostgreSQL.

## Storage Model

PostgreSQL stores users, templates, questions, attempts, answers, evaluations, mentor feedback, share links, and video metrics summaries.

The `answers` table contains `audio_url` and `video_url` fields as extension points for future media storage. In the current MVP they should not be treated as permanent blob storage. Voice/video assessment flow stores answer text or transcript data and aggregated metrics summaries, not raw media files.

This is intentional: raw video would quickly increase storage size and create stronger privacy and retention requirements. PrepAI stores the information needed for scoring and review without turning the database into a media archive.

## User Roles

Guest:

- opens public pages;
- registers;
- logs in.

User:

- creates practice templates;
- imports questions;
- passes practice sessions;
- joins assessment sessions through links or invitations;
- views own attempts, scores, and mentor feedback.

Mentor:

- creates assessment templates;
- imports questions and reference answers;
- shares templates with public or private access;
- reviews submitted attempts;
- sees AI evaluation;
- sets final score and comment.

A mentor can pass practice sessions and assessment sessions created by other mentors. A mentor cannot pass an assessment created by themselves.

## Session Types

Practice sessions are repeatable and are used for learning. The user may see AI feedback directly after completion.

Assessment sessions are controlled by a mentor. The user should not see reference answers before or during the exam flow. AI evaluation is preliminary, while the mentor score is the final result.

## AI/ML Evaluation

The current AI/ML service is a local heuristic service. It does not depend on external LLM APIs.

Implemented analysis steps:

- normalize and tokenize the submitted answer;
- tokenize the reference answer and expected concepts;
- build token-frequency vectors;
- calculate cosine similarity as a lightweight semantic-overlap estimate;
- calculate keyword/reference coverage;
- estimate completeness from answer length and concept coverage;
- estimate structure from sentence and formatting signals;
- detect matched and missing concepts;
- generate detailed feedback and recommendations;
- aggregate partial metrics into a final score.

Current score aggregation:

```text
total_score =
  semantic_score * 0.35 +
  keyword_score * 0.25 +
  completeness_score * 0.20 +
  structure_score * 0.20
```

The scoring result is advisory in assessment mode. The mentor can confirm, adjust, or override the result because a heuristic evaluator cannot fully understand domain nuance, partial reasoning, oral explanation quality, or grading context.

Reserved extension points:

- production-grade speech-to-text;
- transformer embeddings;
- OCR for scanned PDFs;
- asynchronous inference jobs;
- retry policy for failed analysis tasks;
- model versioning;
- dedicated worker queue.

## Video Metrics

Voice/video mode uses browser-side media access and sends only summarized metrics. Metrics are heuristic and guidance-oriented.

Examples:

- camera status;
- microphone status;
- estimated brightness;
- estimated blur or clarity;
- face-presence ratio;
- speaking activity ratio;
- speaking stability;
- warning messages;
- recommendations.

The system does not claim cheating detection, lie detection, emotion recognition, or psychological diagnosis. Video metrics are technical and behavioral hints only.

## Domain Entities

Core entities:

- `User`;
- `SessionTemplate`;
- `Question`;
- `SessionAttempt`;
- `Answer`;
- `AIEvaluation`;
- `MentorFeedback`;
- `ShareLink`;
- `VideoAnalysis`.

Supporting entities:

- `AIGenerationCache`;
- `AIGenerationUsage`.

Important relationship rules:

- `Answer` belongs to `SessionAttempt` and `Question`.
- `SessionAttempt` connects a user with a template at runtime.
- `AIEvaluation` is separated from `MentorFeedback`.
- `ShareLink` models public and private access.
- `VideoAnalysis` stores summary metrics only.

## Project Structure

```text
.
├── ai_ml_service/
│   ├── app/
│   │   ├── main.py
│   │   ├── schemas.py
│   │   └── services/
│   │       └── analysis.py
│   ├── Dockerfile
│   └── requirements.txt
├── backend/
│   ├── alembic/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   └── main.py
│   ├── scripts/
│   │   ├── seed_demo_data.py
│   │   └── validate_demo_data.py
│   ├── tests/
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── features/
│   │   ├── shared/
│   │   └── widgets/
│   ├── package.json
│   └── vite.config.js
├── sample_template_files/
├── docker-compose.dev.yml
├── docker-compose.yml
└── README.md
```

## Quick Start With Docker

Start the development environment:

```bash
docker compose -f docker-compose.dev.yml up --build
```

Services:

```text
Frontend       http://localhost:3000
Backend API    http://localhost:8000
AI/ML service  http://localhost:8001
PostgreSQL     localhost:5432
```

The development compose file runs migrations on backend startup. It also supports automatic demo seeding through:

```text
AUTO_SEED=true
```

## Manual Local Development

Start PostgreSQL first and set `DATABASE_URL`.

Backend:

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

AI/ML service:

```bash
cd ai_ml_service
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

## Environment Variables

Backend:

```text
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/prep_system
AI_ML_SERVICE_URL=http://localhost:8001
SECRET_KEY=change-me
API_V1_PREFIX=/api/v1
LEGACY_API_PREFIX=/api
ACCESS_TOKEN_EXPIRE_MINUTES=30
AUTO_SEED=false
```

Frontend:

```text
VITE_API_BASE_URL=http://localhost:8000
VITE_API_VERSION=/api/v1
VITE_AI_GENERATION_ENABLED=false
```

## Demo Data

Run migrations:

```bash
cd backend
alembic upgrade head
```

Seed demo data from the project root:

```bash
python backend/scripts/seed_demo_data.py
```

Validate demo data:

```bash
python backend/scripts/validate_demo_data.py
```

Demo accounts:

```text
demo.user@example.com
mentor.demo@example.com
password123
```

The seed script is idempotent and uses the ORM models with the configured `DATABASE_URL`. It creates demo users, templates, questions, attempts, answers, AI evaluations, share links, and mentor feedback.

## Main API Areas

Backend API modules:

- authentication;
- templates;
- share links;
- attempts;
- answers;
- video metrics summary;
- mentor review;
- analytics.

AI/ML service API areas:

- answer evaluation;
- tokenization;
- concept matching;
- detailed feedback;
- text extraction;
- Q/A parsing;
- local template generation;
- transcription and video-analysis extension endpoints.

## Verification

Frontend build:

```bash
cd frontend
npm run build
```

Python syntax check:

```bash
python -m compileall -q backend/app backend/scripts ai_ml_service/app
```

Backend tests require PostgreSQL through `TEST_DATABASE_URL` or `DATABASE_URL`:

```bash
cd backend
pytest
```

## Notes For Further Development

The next major technical step is to add a real asynchronous processing layer for long-running AI/ML work. The current service boundary already supports this direction, but the project does not yet include Redis, Celery, RQ, or a dedicated job table.

Future media storage should be implemented through an external object store or a controlled filesystem/blob layer, not by placing raw media inside PostgreSQL rows.
