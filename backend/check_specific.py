from db.database import sync_engine
from sqlalchemy import text

def check_specific_product(sku):
    with sync_engine.connect() as conn:
        print(f"--- DATABASE CHECK FOR SKU: {sku} ---")
        res = conn.execute(text("""
            SELECT ps.size, ps.quantity, ps.is_quantity_disclose, ps.is_available, p.name
            FROM intelligence.product_sizes ps
            JOIN intelligence.new_arrival_products p ON ps.product_id = p.record_id
            WHERE p.sku = :sku;
        """), {"sku": sku})
        rows = res.fetchall()
        if not rows:
            print("Product not found in database.")
        else:
            for row in rows:
                print(f"Size: {row[0]}, Qty: {row[1]}, Disclose: {row[2]}, Avail: {row[3]}, Name: {row[4]}")

if __name__ == "__main__":
    sku = "white-ankle-length-pure-cotton-gathered-pants-w63242-223575"
    check_specific_product(sku)
