"""
backend/seed.py — Seeds the database with initial competitors and categories.
"""
from sqlalchemy.orm import Session
from db.database import SessionLocalSync, sync_engine, init_db
from db.models import Competitor, Category, User, Role
from api.auth import get_password_hash
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def seed_data():
    # Ensure tables exist
    init_db()
    
    session = SessionLocalSync()
    
    try:
        
        # --- Seed Roles ---
        admin_role = session.query(Role).filter_by(code="ADMIN").first()
        if not admin_role:
            logger.info("Adding ADMIN role")
            admin_role = Role(name="Administrator", code="ADMIN")
            session.add(admin_role)
            session.flush()

        # --- Seed Users ---
        admin_user = session.query(User).filter_by(email="admin@biba.com").first()
        if not admin_user:
            logger.info("Adding default admin user: admin@biba.com")
            admin_user = User(
                role_id=admin_role.record_id,
                first_name="Biba",
                last_name="Admin",
                email="admin@biba.com",
                password_hash=get_password_hash("admin123"),
                is_active=True
            )
            session.add(admin_user)
        
        session.commit()
        logger.info("Database seeding completed successfully.")
    except Exception as e:
        session.rollback()
        logger.error(f"Seeding failed: {e}")
    finally:
        session.close()

if __name__ == "__main__":
    seed_data()
