"""
backend/manual_scrape.py — Manually trigger the scraping pipeline for a competitor.
"""
import sys
import os
import logging

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from db.database import SessionLocalSync
from scraper.pipeline import run_scrape_for_competitor

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def main():
    if len(sys.argv) < 2:
        print("Usage: python manual_scrape.py <CompetitorName> or 'all'")
        sys.exit(1)
    
    target = sys.argv[1]
    session = SessionLocalSync()
    
    try:
        if target.lower() == 'all':
            from db.models import Competitor
            competitors = session.query(Competitor).filter_by(is_active=True).all()
            for comp in competitors:
                logger.info(f"Starting manual scrape for: {comp.name}")
                run_scrape_for_competitor(comp.name, session)
        else:
            logger.info(f"Starting manual scrape for: {target}")
            run_scrape_for_competitor(target, session)
    except Exception as e:
        logger.error(f"Manual scrape failed: {e}")
    finally:
        session.close()

if __name__ == "__main__":
    main()
