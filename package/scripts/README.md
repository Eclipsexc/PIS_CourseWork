# Project Scripts

Run demo seed data against the PostgreSQL database configured by `DATABASE_URL`:

```bash
python backend/scripts/seed_demo_data.py
```

Validate demo data and relation consistency:

```bash
python backend/scripts/validate_demo_data.py
```

Docker dev auto-seed:

```bash
docker compose -f docker-compose.dev.yml up --build
```

`AUTO_SEED=true` runs the seed script after `alembic upgrade head` and only when the database is empty.

Run the standalone AI/ML service with the backend:

```bash
docker compose up -d --build ai_ml_service backend
```
