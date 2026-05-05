from db.database import sync_engine
from sqlalchemy import text

def reset_ten():
    with sync_engine.connect() as conn:
        print("Resetting all quantities of 10 to 0...")
        with conn.begin():
            res = conn.execute(text("UPDATE intelligence.product_sizes SET quantity = 0 WHERE quantity = 10;"))
            print(f"Updated {res.rowcount} rows.")

if __name__ == "__main__":
    reset_ten()
