import sys
import os

# Add parent directory to path to import db
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.database import sync_engine
from sqlalchemy import text

def remove_global_desi():
    with sync_engine.connect() as conn:
        # Find competitor ID
        comp = conn.execute(text("SELECT record_id FROM intelligence.competitors WHERE name ILIKE '%Global Desi%';")).fetchone()
        if not comp:
            print("Competitor 'Global Desi' not found.")
            return
        comp_id = comp[0]
        print(f"Found Global Desi with ID: {comp_id}")
        
        # Find product IDs
        new_arrival_ids = [r[0] for r in conn.execute(text(f"SELECT record_id FROM intelligence.new_arrival_products WHERE competitor_id = {comp_id};")).fetchall()]
        bestseller_ids = [r[0] for r in conn.execute(text(f"SELECT record_id FROM intelligence.bestseller_products WHERE competitor_id = {comp_id};")).fetchall()]
        
        print(f"Found {len(new_arrival_ids)} new arrival products.")
        print(f"Found {len(bestseller_ids)} bestseller products.")
        
        # Delete from product_sizes
        if new_arrival_ids:
            ids_str = ",".join(map(str, new_arrival_ids))
            res = conn.execute(text(f"DELETE FROM intelligence.product_sizes WHERE source = 'new_arrival' AND product_id IN ({ids_str});"))
            print(f"Deleted {res.rowcount} sizes for new arrivals.")
            
        if bestseller_ids:
            ids_str = ",".join(map(str, bestseller_ids))
            res = conn.execute(text(f"DELETE FROM intelligence.product_sizes WHERE source = 'bestseller' AND product_id IN ({ids_str});"))
            print(f"Deleted {res.rowcount} sizes for bestsellers.")
            
        # Delete from price_history
        res = conn.execute(text(f"DELETE FROM intelligence.price_history WHERE competitor_id = {comp_id};"))
        print(f"Deleted {res.rowcount} price history records.")
        
        # Delete from products
        res = conn.execute(text(f"DELETE FROM intelligence.new_arrival_products WHERE competitor_id = {comp_id};"))
        print(f"Deleted {res.rowcount} new arrival products.")
        
        res = conn.execute(text(f"DELETE FROM intelligence.bestseller_products WHERE competitor_id = {comp_id};"))
        print(f"Deleted {res.rowcount} bestseller products.")
        
        conn.commit()
        print("Done.")

if __name__ == "__main__":
    remove_global_desi()
