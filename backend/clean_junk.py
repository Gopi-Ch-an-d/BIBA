from db.database import sync_engine
from sqlalchemy import text

def clean_junk():
    with sync_engine.connect() as conn:
        # Delete products that are actually just URLs (junk)
        res = conn.execute(text("DELETE FROM intelligence.new_arrival_products WHERE sku LIKE 'http%';"))
        print(f"Deleted {res.rowcount} junk URL products.")
        
        # Delete products with empty SKUs
        res = conn.execute(text("DELETE FROM intelligence.new_arrival_products WHERE sku IS NULL OR sku = '';"))
        print(f"Deleted {res.rowcount} empty SKU products.")
        
        # Commit (sync_engine should handle it, but text() often needs manual commit or begin block)
        conn.commit()

if __name__ == "__main__":
    clean_junk()
