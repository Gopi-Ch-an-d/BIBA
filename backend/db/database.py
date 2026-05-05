"""
db/database.py — Async SQLAlchemy engine + session factory 
it is a connection file between frontend and database
"""
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy import create_engine
from dotenv import load_dotenv
import os

load_dotenv()

# This is Environment Variables it comes from .env file (Local Database)

# Async is used for FastAPI API's
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:Chandu14@127.0.0.1:5432/fashion_db")

# Sync is used for Scrapers & Migrations
SYNC_DATABASE_URL = os.getenv("SYNC_DATABASE_URL", "postgresql://postgres:Chandu14@127.0.0.1:5432/fashion_db")

# Async engine (used by FastAPI endpoints)
async_engine = create_async_engine(DATABASE_URL, echo=False, pool_size=10, max_overflow=20)

# Creates DB session for async usage
AsyncSessionLocal = async_sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)

# Sync engine (used by Alembic & scrapers)
sync_engine = create_engine(SYNC_DATABASE_URL, pool_size=5, max_overflow=10)

from sqlalchemy.orm import sessionmaker
SessionLocalSync = sessionmaker(bind=sync_engine)

# This is used in FastAPI like:

async def get_db() -> AsyncSession:
    """FastAPI dependency — yields an async DB session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

# Create tables

def init_db():
    """Create all tables (run once on startup or via migration)."""
    from db.models import Base
    Base.metadata.create_all(bind=sync_engine)
