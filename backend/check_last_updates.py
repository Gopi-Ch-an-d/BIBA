from db.database import sync_engine
from sqlalchemy import text

def check_last_updates():
    with sync_engine.connect() as conn:
        print("--- LAST 10 UPDATED PRODUCTS ---")
        res = conn.execute(text("""
            SELECT p.sku, ps.size, ps.quantity, ps.is_quantity_disclose, ps.is_available, ps.last_updated_at
            FROM intelligence.product_sizes ps
            JOIN intelligence.new_arrival_products p ON ps.product_id = p.record_id
            ORDER BY ps.last_updated_at DESC
            LIMIT 10;
        """))
        for row in res:
            print(f"SKU: {row[0]}, Size: {row[1]}, Qty: {row[2]}, Disclose: {row[3]}, Avail: {row[4]}, Time: {row[5]}")

if __name__ == "__main__":
    check_last_updates()
