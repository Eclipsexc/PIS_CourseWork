# AI-Driven Session-Based Preparation and Assessment Platform

Інформаційна система підготовки до співбесід, екзаменів та публічних виступів із використанням методів AI та ML.

## Архітектура

Проєкт складається з трьох основних компонентів:

### 1. Frontend (React + Vite)
- Сучасний UI з градієнтами та анімаціями (Statify-inspired)
- React 18 + Vite
- Tailwind CSS + Framer Motion
- Zustand для state management
- JWT authentication
- Responsive design

### 2. Backend API
- FastAPI-based REST API
- Управління користувачами, шаблонами, спробами
- Бізнес-логіка системи
- База даних (PostgreSQL)
- Аутентифікація та авторизація

### 3. AI/ML Service
- Окремий мікросервіс для AI/ML операцій
- Gemini API integration
- Speech-to-Text (транскрипція голосових відповідей)
- NLP аналіз текстових відповідей
- Semantic similarity evaluation
- Генерація питань, відповідей, критеріїв
- Генерація feedback та recommendations

## Основна концепція

**Session = Template + Attempts**

### Типи сесій:
1. **Practice Session** - тренувальний режим (AI-only evaluation)
2. **Assessment Session** - оціночний режим (AI preliminary + Mentor final review)

### Ролі:
- **Guest** - перегляд публічної інформації
- **User** - створення practice templates, проходження attempts
- **Mentor** (extends User) - створення assessment templates, mentor review

## Technology Stack

### Frontend:
- React 18
- Vite
- Tailwind CSS
- Framer Motion (animations)
- Zustand (state management)
- React Router
- Axios
- Lucide React (icons)

### Backend:
- Python 3.11+
- FastAPI
- SQLAlchemy (ORM)
- PostgreSQL
- Alembic (migrations)
- Pydantic (validation)
- JWT authentication

### AI/ML Service:
- Python 3.11+
- FastAPI
- Google Gemini API
- Speech-to-Text API
- Sentence Transformers (embeddings)
- NumPy, scikit-learn

### Deployment:
- Docker + Docker Compose
- Nginx (reverse proxy)

## Структура проєкту

```
.
├── frontend/                # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   ├── store/          # Zustand stores
│   │   └── App.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── backend/                 # Backend API
│   ├── app/
│   │   ├── api/            # API endpoints
│   │   ├── core/           # Config, security
│   │   ├── models/         # SQLAlchemy models
│   │   ├── schemas/        # Pydantic schemas
│   │   ├── services/       # Business logic
│   │   └── main.py
│   ├── alembic/            # DB migrations
│   ├── tests/
│   ├── requirements.txt
│   └── Dockerfile
│
├── ai_ml_service/          # AI/ML Service
│   ├── app/
│   │   ├── api/            # API endpoints
│   │   ├── core/           # Config
│   │   ├── services/       # AI/ML logic
│   │   │   ├── gemini_service.py
│   │   │   ├── transcription_service.py
│   │   │   ├── evaluation_service.py
│   │   │   └── generation_service.py
│   │   └── main.py
│   ├── tests/
│   ├── requirements.txt
│   └── Dockerfile
│
├── docker-compose.yml
└── README.md
```

## Встановлення та запуск

### Локальний розвиток

1. Клонувати репозиторій
2. Створити `.env` файли для frontend, backend та ai_ml_service
3. Встановити залежності:

```bash
# Frontend
cd frontend
npm install

# Backend
cd ../backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# AI/ML Service
cd ../ai_ml_service
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

4. Запустити PostgreSQL
5. Виконати міграції:

```bash
cd backend
alembic upgrade head
```

6. Запустити сервіси:

```bash
# Frontend (terminal 1)
cd frontend
npm run dev

# Backend (terminal 2)
cd backend
uvicorn app.main:app --reload --port 8000

# AI/ML Service (terminal 3)
cd ai_ml_service
uvicorn app.main:app --reload --port 8001
```

### Docker Compose

```bash
docker-compose up --build
```

## API Endpoints

### Backend API (port 8000)

#### Authentication
- `POST /api/auth/register` - реєстрація
- `POST /api/auth/login` - вхід
- `GET /api/auth/me` - поточний користувач

#### Templates
- `POST /api/templates` - створити template
- `GET /api/templates` - список templates
- `GET /api/templates/{id}` - деталі template
- `PUT /api/templates/{id}` - оновити template
- `DELETE /api/templates/{id}` - видалити template

#### Attempts
- `POST /api/attempts` - почати attempt
- `GET /api/attempts/{id}` - деталі attempt
- `POST /api/attempts/{id}/answers` - надіслати відповідь
- `POST /api/attempts/{id}/finish` - завершити attempt
- `POST /api/attempts/{id}/pause` - пауза (practice only)

#### Mentor
- `GET /api/mentor/assessments` - список assessments для review
- `GET /api/mentor/attempts/{id}` - деталі attempt для review
- `POST /api/mentor/attempts/{id}/review` - залишити mentor feedback

### AI/ML Service API (port 8001)

#### Generation
- `POST /api/ai/generate-template` - згенерувати template з AI
- `POST /api/ai/generate-questions` - згенерувати питання

#### Evaluation
- `POST /api/ai/transcribe` - транскрибувати audio
- `POST /api/ai/evaluate-answer` - оцінити відповідь
- `POST /api/ai/generate-report` - згенерувати final report

## Core Entities

### SessionTemplate
- Reusable preparation structure
- Contains questions, criteria, settings
- Types: practice, assessment
- Status: draft, ready, locked, archived

### SessionAttempt
- One concrete pass of a template
- Stores answers, evaluations, scores
- Status: active, paused, completed, under_review, reviewed

### Question
- Belongs to template
- Types: text_question, oral_question
- Contains reference_answer, keywords, criteria

### Answer
- User's response to question
- Stores text, audio_url, video_url, transcript

### AIEvaluation
- AI-generated evaluation of answer
- Scores: semantic, keyword, structure, completeness
- Feedback, weak_points, recommendations

### MentorFeedback
- Mentor review for assessment attempts
- Final score confirmation or override
- Comment and override reason

## Workflow Examples

### Practice Session Flow
1. User створює practice template (file/AI/manual)
2. User запускає attempt
3. User відповідає на питання (text/voice/video)
4. AI транскрибує (якщо voice) та аналізує
5. AI генерує score та feedback
6. User завершує attempt
7. System генерує final report
8. User може повторити template

### Assessment Session Flow
1. Mentor створює assessment template
2. Mentor налаштовує strict rules (timer, deadline, max_attempts)
3. Mentor ділиться URL з user
4. User проходить assessment (strict mode)
5. AI генерує preliminary evaluation
6. Status → under_review
7. Mentor переглядає answers та AI score
8. Mentor confirms або overrides final score
9. User отримує final result

## Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql://user:password@localhost:5432/prep_system
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
AI_ML_SERVICE_URL=http://localhost:8001
```

### AI/ML Service (.env)
```
GEMINI_API_KEY=your-gemini-api-key
SPEECH_TO_TEXT_API_KEY=your-stt-api-key
MODEL_NAME=gemini-1.5-pro
```

## Testing

```bash
# Backend tests
cd backend
pytest

# AI/ML Service tests
cd ai_ml_service
pytest
```

## License

MIT
