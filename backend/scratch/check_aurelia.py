import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.database import sync_engine
from sqlalchemy import text

def check():
    with sync_engine.connect() as conn:
        comp_id = conn.execute(text("SELECT record_id FROM intelligence.competitors WHERE name = 'Aurelia'")).scalar()
        print(f"Aurelia Competitor ID: {comp_id}")
        
        if comp_id:
            total = conn.execute(text(f"SELECT count(1) FROM intelligence.new_arrival_products WHERE competitor_id = {comp_id}")).scalar()
            active = conn.execute(text(f"SELECT count(1) FROM intelligence.new_arrival_products WHERE competitor_id = {comp_id} AND is_active = true")).scalar()
            print(f"Total products: {total}")
            print(f"Active products: {active}")

if __name__ == "__main__":
    check()
