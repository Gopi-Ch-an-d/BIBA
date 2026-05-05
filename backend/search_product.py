from db.database import sync_engine
from sqlalchemy import text

def find_product(search_term):
    with sync_engine.connect() as conn:
        print(f"--- SEARCHING FOR: {search_term} ---")
        res = conn.execute(text("""
            SELECT sku, name, record_id
            FROM intelligence.new_arrival_products 
            WHERE name ILIKE :term;
        """), {"term": f"%{search_term}%"})
        rows = res.fetchall()
        for row in rows:
            print(f"SKU: {row[0]}, Name: {row[1]}, ID: {row[2]}")
            # Get sizes
            res_sizes = conn.execute(text("""
                SELECT size, quantity, is_quantity_disclose, is_available
                FROM intelligence.product_sizes
                WHERE product_id = :pid;
            """), {"pid": row[2]})
            for s in res_sizes:
                print(f"  Size: {s[0]}, Qty: {s[1]}, Disclose: {s[2]}, Avail: {s[3]}")

if __name__ == "__main__":
    find_product("Ecru Voile Printed Dupatta")
