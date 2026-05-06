from db.database import sync_engine
from sqlalchemy import text
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("recovery")

def recover_products():
    with sync_engine.connect() as conn:
        trans = conn.begin()
        try:
            # Get competitor ID for W
            res = conn.execute(text("SELECT record_id FROM intelligence.competitors WHERE name = 'W'"))
            comp_id = res.scalar()
            
            if not comp_id:
                logger.error("Competitor 'W' not found.")
                return

            # Re-activate new arrivals that were deactivated recently
            # (Assuming they were deactivated in the last 2 hours)
            res_na = conn.execute(text("""
                UPDATE intelligence.new_arrival_products
                SET is_active = true
                WHERE competitor_id = :comp_id
                AND is_active = false
                AND last_updated_at < NOW() - INTERVAL '5 minutes';
            """), {"comp_id": comp_id})
            
            # Re-activate bestsellers too just in case
            res_bs = conn.execute(text("""
                UPDATE intelligence.bestseller_products
                SET is_active = true
                WHERE competitor_id = :comp_id
                AND is_active = false
                AND last_updated_at < NOW() - INTERVAL '5 minutes';
            """), {"comp_id": comp_id})

            trans.commit()
            logger.info(f"Recovery complete. Reactivated {res_na.rowcount} new arrivals and {res_bs.rowcount} bestsellers for W.")
            
        except Exception as e:
            trans.rollback()
            logger.error(f"Recovery failed: {e}")

if __name__ == "__main__":
    recover_products()
