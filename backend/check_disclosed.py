from db.database import sync_engine
from sqlalchemy import text

def check_disclosed():
    with sync_engine.connect() as conn:
        count = conn.execute(text("SELECT count(*) FROM intelligence.product_sizes WHERE is_quantity_disclose=TRUE AND quantity > 0;")).scalar()
        print(f"Disclosed Quantities found: {count}")

if __name__ == "__main__":
    check_disclosed()
