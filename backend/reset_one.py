from db.database import sync_engine
from sqlalchemy import text

def reset_one():
    with sync_engine.connect() as conn:
        print("Resetting all quantities of 1 to 0...")
        with conn.begin():
            res = conn.execute(text("UPDATE intelligence.product_sizes SET quantity = 0, is_quantity_disclose = FALSE WHERE quantity = 1;"))
            print(f"Updated {res.rowcount} rows.")

if __name__ == "__main__":
    reset_one()
