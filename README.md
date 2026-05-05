# BIBA Competitive Intelligence System

Automated scraping engine + executive dashboard monitoring **W**, **Aurelia**, and **Global Desi** for pricing, bestsellers, and new launches.

---

## Stack
| Layer | Technology |
|---|---|
| Backend API | FastAPI + Uvicorn |
| Database | PostgreSQL (via SQLAlchemy async) |
| Scraper | Selenium + Undetected-Chromedriver |
| Task Queue | Celery + Redis |
| Frontend | React 18 + Vite + Tailwind CSS + Recharts |

---

## Project Structure
```
biba_ci/
├── backend/
│   ├── main.py              ← FastAPI app entry point
│   ├── seed.py              ← Seeds competitor records into DB
│   ├── requirements.txt
│   ├── .env.example         ← Copy to .env and configure
│   ├── db/
│   │   ├── models.py        ← SQLAlchemy ORM models
│   │   └── database.py      ← Async engine + session factory
│   ├── scraper/
│   │   ├── engine.py        ← Stealthy Chrome driver + per-competitor scrapers
│   │   └── pipeline.py      ← Upsert + new-launch detection + scrape logs
│   ├── scheduler/
│   │   └── tasks.py         ← Celery tasks + cron schedule (2 AM IST daily)
│   ├── api/
│   │   ├── routes.py        ← All FastAPI endpoints
│   │   └── schemas.py       ← Pydantic request/response models
│   └── alembic/
│       └── env.py           ← Alembic migration env
└── frontend/
    ├── src/
    │   ├── main.jsx         ← React entry + router
    │   ├── index.css        ← Tailwind + CSS variables
    │   ├── utils/api.js     ← Axios API client
    │   ├── components/
    │   │   └── Sidebar.jsx
    │   └── pages/
    │       ├── Overview.jsx     ← Competitor overview cards
    │       ├── Products.jsx     ← Filterable product grid
    │       ├── Trends.jsx       ← Price/discount trend charts
    │       ├── Exports.jsx      ← Excel/PDF download
    │       └── ScrapeLogs.jsx   ← Scrape audit log + manual trigger
    ├── vite.config.js
    ├── tailwind.config.js
    └── package.json
```

---

## Setup

### 1. PostgreSQL
```bash
createdb biba_ci
```

### 2. Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env with your DB URL, proxy credentials, Redis URL

# Create tables + seed competitors
python seed.py

# Start API server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Redis + Celery (for scheduled/manual scraping)
```bash
# In a separate terminal (requires Redis running locally or via Docker)
redis-server

# Celery worker
celery -A scheduler.tasks worker --loglevel=info

# Celery beat scheduler (daily cron at 2 AM IST)
celery -A scheduler.tasks beat --loglevel=info
```

### 4. Frontend
```bash
cd frontend
npm install
npm run dev
# Opens at http://localhost:3000
```

---

## API Endpoints (all prefixed `/api/v1`)

| Method | Path | Description |
|---|---|---|
| GET | `/competitors` | List all competitors |
| GET | `/dashboard/overview` | Overview cards (totals, avg discount, new arrivals) |
| GET | `/products` | Paginated, filterable product list |
| GET | `/products/{id}` | Single product detail |
| GET | `/analytics/price-trend` | Daily avg price + discount for a competitor |
| GET | `/analytics/product/{id}/history` | Price history for one SKU |
| GET | `/export/excel` | Download Excel file |
| GET | `/export/pdf` | Download PDF report |
| POST | `/scrape/trigger` | Manually queue a scrape |
| GET | `/scrape/logs` | Audit log of all scrape runs |

Interactive docs: **http://localhost:8000/docs**

---

## Adding a New Competitor
1. Create a new scraper class in `backend/scraper/engine.py` extending `BaseScraper`
2. Register it in `SCRAPER_REGISTRY` at the bottom of that file
3. Add the competitor to the DB via the API (`POST /api/v1/competitors`) or `seed.py`

---

## CSS Selector Updates
Competitor sites change their DOM frequently. When a scrape fails:
- Check the `ScrapeLog` table (or Scrape Monitor page) for `error_message`
- Inspect the live site to find new selectors
- Update the relevant `_parse_product_card()` method in `scraper/engine.py`

---

## Proxy Configuration
Set in `.env`:
```
PROXY_HOST=your_residential_proxy_host
PROXY_PORT=8080
PROXY_USER=username
PROXY_PASS=password
```
To test without a proxy (for local dev), set `use_proxy=False` in `build_driver()` or leave `PROXY_HOST` empty.
# BIBA
