from db.database import sync_engine
from sqlalchemy import text

def list_disclosed():
    with sync_engine.connect() as conn:
        res = conn.execute(text("""
            SELECT p.sku, ps.size, ps.quantity, ps.is_quantity_disclose
            FROM intelligence.product_sizes ps
            JOIN intelligence.new_arrival_products p ON ps.product_id = p.record_id
            WHERE ps.quantity > 0
            LIMIT 5;
        """))
        for row in res:
            print(f"SKU: {row[0]}, Size: {row[1]}, Qty: {row[2]}, Disclose: {row[3]}")

if __name__ == "__main__":
    list_disclosed()
