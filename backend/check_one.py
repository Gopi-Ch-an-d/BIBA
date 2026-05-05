from db.database import sync_engine
from sqlalchemy import text

def check_one():
    with sync_engine.connect() as conn:
        count = conn.execute(text("SELECT count(*) FROM intelligence.product_sizes WHERE quantity = 1;")).scalar()
        print(f"Products with Qty 1: {count}")

if __name__ == "__main__":
    check_one()
