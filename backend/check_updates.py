from db.database import sync_engine
from sqlalchemy import text
from datetime import datetime, timedelta

def check_recent_updates():
    with sync_engine.connect() as conn:
        five_mins_ago = datetime.now() - timedelta(minutes=5)
        # We need to account for timezone if needed, but let's try simple first
        res = conn.execute(text("SELECT count(*) FROM intelligence.product_sizes WHERE last_updated_at > :t;"), {"t": five_mins_ago})
        count = res.scalar()
        print(f"Sizes updated in last 5 minutes: {count}")
        
        if count > 0:
            res_details = conn.execute(text("""
                SELECT p.sku, ps.size, ps.quantity, ps.is_quantity_disclose 
                FROM intelligence.product_sizes ps
                JOIN intelligence.new_arrival_products p ON ps.product_id = p.record_id
                WHERE ps.last_updated_at > :t
                LIMIT 5;
            """), {"t": five_mins_ago})
            for row in res_details:
                print(f"SKU: {row[0]}, Size: {row[1]}, Qty: {row[2]}, Disclose: {row[3]}")

if __name__ == "__main__":
    check_recent_updates()
