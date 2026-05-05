"""
scheduler/tasks.py
------------------
Celery tasks + APScheduler cron job definition.

Start worker:
    celery -A scheduler.tasks worker --loglevel=info

Start beat (cron):
    celery -A scheduler.tasks beat --loglevel=info
"""
import logging
import os
from celery import Celery
from celery.schedules import crontab
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from dotenv import load_dotenv
# Load .env from the same directory as this script
base_dir = os.path.dirname(os.path.abspath(__file__))
# Note: Since tasks.py is in 'scheduler' folder, we go up one level for .env
load_dotenv(os.path.join(os.path.dirname(base_dir), ".env"))

REDIS_URL = os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0")

celery_app = Celery("biba_ci", broker=REDIS_URL, backend=REDIS_URL)

from celery.utils.log import get_task_logger
logger = get_task_logger(__name__)

@celery_app.on_after_configure.connect
def setup_periodic_tasks(sender, **kwargs):
    # Log every 10 seconds to prove the worker is alive
    sender.add_periodic_task(10.0, worker_heartbeat.s(), name='worker-heartbeat-10s')

@celery_app.task(name="scheduler.tasks.worker_heartbeat")
def worker_heartbeat():
    logger.info("[HEARTBEAT] Worker is alive and listening for tasks...")
    return True

# Windows Optimizations for faster task pickup
celery_app.conf.update(
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    worker_lost_wait=10.0,
    broker_connection_retry_on_startup=True,
    broker_transport_options={
        'visibility_timeout': 3600,
        'polling_interval': 0.1,  # Fast check for new tasks
    }
)

@celery_app.task(name="scheduler.tasks.test_ping")
def test_ping():
    logger.info("--- PING RECEIVED! WORKER IS WORKING! ---")
    return "pong"

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="Asia/Kolkata",
    enable_utc=True,
    # Run scrape daily at 2 AM IST (off-peak)
    beat_schedule={
        "daily-scrape-all": {
            "task": "scheduler.tasks.scrape_all_competitors",
            "schedule": crontab(hour=2, minute=0),
        },
    },
)


# DB Setup for tasks
db_url = os.getenv("SYNC_DATABASE_URL", "postgresql://postgres:Chandu14@127.0.0.1:5432/fashion_db")
engine = create_engine(db_url)
SessionLocal = sessionmaker(bind=engine)

@celery_app.task(name="scheduler.tasks.scrape_all_competitors", bind=True, max_retries=2)
def scrape_all_competitors(self):
    """Trigger scrape for every active competitor."""
    from db.models import Competitor
    from sqlalchemy import select

    with SessionLocal() as session:
        competitors = session.execute(
            select(Competitor).where(Competitor.is_active == True)
        ).scalars().all()
        names = [c.name for c in competitors]

    for name in names:
        scrape_single_competitor.delay(name)

    logger.info(f"Dispatched scrape tasks for: {names}")
    return {"dispatched": names}


@celery_app.task(name="scheduler.tasks.scrape_single_competitor")
def scrape_single_competitor(competitor_name: str):
    """Scrape one competitor. Retries on failure."""
    logger.info(f"==> Starting Scrape Job for: {competitor_name} <==")
    try:
        from scraper.pipeline import run_scrape_for_competitor

        with SessionLocal() as session:
            result = run_scrape_for_competitor(competitor_name, session)

        return result

    except Exception as exc:
        logger.error(f"Task failed for {competitor_name}: {exc}")
        raise exc
        raise self.retry(exc=exc, countdown=60 * 5)  # retry after 5 min
