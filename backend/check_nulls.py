from db.database import sync_engine
from sqlalchemy import text

def check_nulls():
    with sync_engine.connect() as conn:
        count = conn.execute(text("SELECT count(*) FROM intelligence.product_sizes WHERE quantity IS NULL;")).scalar()
        print(f"Null Quantities: {count}")
        
        # Also check one product with Qty: None in API
        res = conn.execute(text("""
            SELECT p.record_id, p.name, ps.quantity 
            FROM intelligence.new_arrival_products p
            LEFT JOIN intelligence.product_sizes ps ON p.record_id = ps.product_id
            LIMIT 5;
        """)).all()
        print("\nSample Join Check:")
        for row in res:
            print(f"ID: {row[0]}, Name: {row[1]}, Qty: {row[2]}")

if __name__ == "__main__":
    check_nulls()
