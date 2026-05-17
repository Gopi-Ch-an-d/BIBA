import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.database import sync_engine
from sqlalchemy import text

def delete_global_desi_data():
    with sync_engine.connect() as conn:
        comp_id = conn.execute(text("SELECT record_id FROM intelligence.competitors WHERE name = 'Global Desi'")).scalar()
        print(f"Global Desi Competitor ID: {comp_id}")
        
        if comp_id:
            # Get product IDs to delete sizes
            prod_ids_na = conn.execute(text(f"SELECT record_id FROM intelligence.new_arrival_products WHERE competitor_id = {comp_id}")).scalars().all()
            prod_ids_bs = conn.execute(text(f"SELECT record_id FROM intelligence.bestseller_products WHERE competitor_id = {comp_id}")).scalars().all()
            
            all_prod_ids = list(prod_ids_na) + list(prod_ids_bs)
            
            if all_prod_ids:
                # Delete sizes first
                for pid in all_prod_ids:
                    conn.execute(text(f"DELETE FROM intelligence.product_sizes WHERE product_id = {pid}"))
                print(f"Cleared size records for {len(all_prod_ids)} products.")
                
            res_na = conn.execute(text(f"DELETE FROM intelligence.new_arrival_products WHERE competitor_id = {comp_id}"))
            print(f"Deleted {res_na.rowcount} new arrival products!")
            
            res_bs = conn.execute(text(f"DELETE FROM intelligence.bestseller_products WHERE competitor_id = {comp_id}"))
            print(f"Deleted {res_bs.rowcount} bestseller products!")
            
            conn.commit()
            print("Global Desi data removed successfully!")
        else:
            print("Global Desi competitor not found.")

if __name__ == "__main__":
    delete_global_desi_data()
