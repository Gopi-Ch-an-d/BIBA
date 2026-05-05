from db.database import sync_engine
from sqlalchemy import text

def check_mismatch_active():
    with sync_engine.connect() as conn:
        print("--- ACTIVE PRODUCTS DISCLOSURE CHECK ---")
        res = conn.execute(text("""
            SELECT ps.record_id, ps.quantity, ps.is_quantity_disclose, ps.is_available, p.sku 
            FROM intelligence.product_sizes ps
            JOIN intelligence.new_arrival_products p ON ps.product_id = p.record_id
            WHERE ps.quantity > 0 AND ps.is_quantity_disclose=FALSE AND p.is_active=TRUE
            LIMIT 20;
        """))
        rows = res.fetchall()
        if not rows:
            print("Perfect! No mismatches for ACTIVE products.")
        else:
            for row in rows:
                print(f"SKU: {row[4]}, Qty: {row[1]}, Disclose: {row[2]}, Avail: {row[3]}")

if __name__ == "__main__":
    check_mismatch_active()
