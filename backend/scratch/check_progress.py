from db.database import sync_engine
from sqlalchemy import text
from datetime import datetime, timedelta

def check_progress():
    now = datetime.utcnow()
    ten_mins_ago = now - timedelta(minutes=10)
    
    with sync_engine.connect() as conn:
        # Check Bestsellers
        bs_count = conn.execute(text(
            "SELECT count(*) FROM intelligence.bestseller_products WHERE last_updated_at > :t"
        ), {"t": ten_mins_ago}).scalar()
        
        # Check New Arrivals
        na_count = conn.execute(text(
            "SELECT count(*) FROM intelligence.new_arrival_products WHERE last_updated_at > :t"
        ), {"t": ten_mins_ago}).scalar()
        
        # Check Sizes
        size_count = conn.execute(text(
            "SELECT count(*) FROM intelligence.product_sizes WHERE last_updated_at > :t"
        ), {"t": ten_mins_ago}).scalar()
        
        print(f"Products updated in last 10 mins:")
        print(f"  Bestsellers: {bs_count}")
        print(f"  New Arrivals: {na_count}")
        print(f"  Sizes: {size_count}")

if __name__ == '__main__':
    check_progress()
