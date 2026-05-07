import sys
import os
from sqlalchemy import select

# Add backend directory to path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(backend_dir)

from db.database import SessionLocalSync
from db.models import Competitor, Category

session = SessionLocalSync()

def check_w_categories():
    w = session.execute(
        select(Competitor).where(Competitor.name == "W")
    ).scalar_one_or_none()
    
    if not w:
        print("Competitor W not found")
        return

    print(f"Categories for W (ID: {w.record_id}):")
    categories = session.execute(
        select(Category).where(Category.competitor_id == w.record_id)
    ).scalars().all()
    
    for c in categories:
        print(f"  ID: {c.record_id}, Name: {c.name}, Active: {c.is_active}, URL: {c.url}")

check_w_categories()
session.close()
