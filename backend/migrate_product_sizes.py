from sqlalchemy import text
from db.database import sync_engine

def migrate():
    with sync_engine.connect() as conn:
        print("Applying schema updates to intelligence.product_sizes...")
        
        # 1. Add is_quantity_disclose if it doesn't exist
        conn.execute(text("""
            ALTER TABLE intelligence.product_sizes 
            ADD COLUMN IF NOT EXISTS is_quantity_disclose BOOLEAN DEFAULT FALSE;
        """))
        
        # 2. Make quantity NOT NULL and set default
        # First, update any existing NULLs just in case (though default should handle it)
        conn.execute(text("""
            UPDATE intelligence.product_sizes 
            SET quantity = 0 WHERE quantity IS NULL;
        """))
        
        conn.execute(text("""
            ALTER TABLE intelligence.product_sizes 
            ALTER COLUMN quantity SET DEFAULT 0,
            ALTER COLUMN quantity SET NOT NULL;
        """))

        # 3. Ensure UNIQUE constraint exists (source, product_id, size)
        # Note: IF NOT EXISTS is not supported for UNIQUE constraints in some PG versions, 
        # so we'll check first or rely on the fact that it likely already exists from previous setup.
        try:
            conn.execute(text("""
                ALTER TABLE intelligence.product_sizes 
                ADD CONSTRAINT product_sizes_source_product_id_size_key UNIQUE (source, product_id, size);
            """))
        except Exception:
            print("Unique constraint already exists or could not be applied. Skipping.")

        conn.commit()
        print("Migration completed successfully!")

if __name__ == "__main__":
    migrate()
