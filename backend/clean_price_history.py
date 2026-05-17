import sys
import os
import logging

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from db.database import SessionLocalSync
from db.models import PriceHistory
from sqlalchemy import select

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def clean_price_history():
    session = SessionLocalSync()
    try:
        # Get all records ordered by product_id, source, and scraped_at
        records = session.execute(
            select(PriceHistory)
            .order_by(PriceHistory.product_id, PriceHistory.source, PriceHistory.scraped_at)
        ).scalars().all()

        if not records:
            logger.info("No records found in PriceHistory.")
            return

        to_delete = []
        
        # Track the last kept price for each product and source combination
        last_kept = {}

        for record in records:
            key = (record.product_id, record.source)
            if key not in last_kept:
                # First record for this product, keep it
                last_kept[key] = record.price
            else:
                # Compare with the last kept price
                if record.price == last_kept[key]:
                    # Price hasn't changed, mark for deletion
                    to_delete.append(record)
                else:
                    # Price changed, update last kept and keep record
                    last_kept[key] = record.price

        if to_delete:
            logger.info(f"Found {len(to_delete)} duplicate price records to delete.")
            for record in to_delete:
                session.delete(record)
            session.commit()
            logger.info("Successfully deleted duplicate records.")
        else:
            logger.info("No duplicate price records found.")

    except Exception as e:
        logger.error(f"Error cleaning price history: {e}")
        session.rollback()
    finally:
        session.close()

if __name__ == "__main__":
    clean_price_history()
