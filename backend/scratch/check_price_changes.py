import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.database import SessionLocalSync
from db.models import PriceHistory, NewArrivalProduct
from sqlalchemy import desc
import logging

def check_price_changes():
    session = SessionLocalSync()
    try:
        # Get products updated in the current run
        latest_history = session.query(PriceHistory).order_by(desc(PriceHistory.scraped_at)).limit(50).all()
        
        changes = []
        for current in latest_history:
            # Find the previous history for the same product
            prev = session.query(PriceHistory)\
                .filter(PriceHistory.product_id == current.product_id, 
                        PriceHistory.source == current.source,
                        PriceHistory.scraped_at < current.scraped_at)\
                .order_by(desc(PriceHistory.scraped_at))\
                .first()
            
            if prev:
                if prev.price != current.price:
                    product = session.query(NewArrivalProduct).filter_by(record_id=current.product_id).first()
                    name = product.name if product else f"ID: {current.product_id}"
                    changes.append({
                        "name": name,
                        "old": prev.price,
                        "new": current.price,
                        "date": current.scraped_at
                    })
        
        if not changes:
            print("No price changes detected in the latest batch. Prices remain the same as the last scrape.")
        else:
            print(f"Detected {len(changes)} price changes:")
            for c in changes:
                print(f" - {c['name']}: ₹{c['old']} -> ₹{c['new']}")
                
    finally:
        session.close()

if __name__ == "__main__":
    check_price_changes()
