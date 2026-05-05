from db.database import sync_engine
from sqlalchemy import text

def fix_disclose_logic():
    with sync_engine.connect() as conn:
        print("Fixing database disclosure logic...")
        with conn.begin():
            # 1. If quantity > 0, it must be disclosed
            res1 = conn.execute(text("UPDATE intelligence.product_sizes SET is_quantity_disclose = TRUE WHERE quantity > 0 AND is_quantity_disclose = FALSE;"))
            print(f"Set Disclose=True for {res1.rowcount} rows with positive quantity.")
            
            # 2. If quantity = 0, it must NOT be disclosed
            res2 = conn.execute(text("UPDATE intelligence.product_sizes SET is_quantity_disclose = FALSE WHERE quantity = 0 AND is_quantity_disclose = TRUE;"))
            print(f"Set Disclose=False for {res2.rowcount} rows with zero quantity.")

if __name__ == "__main__":
    fix_disclose_logic()
