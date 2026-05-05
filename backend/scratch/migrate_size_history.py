from db.database import sync_engine
from sqlalchemy import text

def drop_unique_constraint():
    with sync_engine.connect() as conn:
        try:
            # Postgres: drop the unique constraint
            # We need to find the name of the constraint first
            res = conn.execute(text("""
                SELECT conname 
                FROM pg_constraint 
                WHERE conrelid = 'intelligence.product_sizes'::regclass 
                AND contype = 'u';
            """)).fetchall()
            
            for r in res:
                print(f"Dropping constraint: {r[0]}")
                conn.execute(text(f"ALTER TABLE intelligence.product_sizes DROP CONSTRAINT {r[0]};"))
            
            # Also ensure the Index exists
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_product_size_lookup 
                ON intelligence.product_sizes (source, product_id, size);
            """))
            
            conn.commit()
            print("Successfully converted ProductSize to history-enabled (append-only).")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == '__main__':
    drop_unique_constraint()
