from db.database import sync_engine
from sqlalchemy import text

def force_migrate():
    with sync_engine.connect() as conn:
        print("FORCING schema update...")
        try:
            # 1. Explicitly add the column
            conn.execute(text("""
                ALTER TABLE intelligence.product_sizes 
                ADD COLUMN is_quantity_disclose BOOLEAN DEFAULT FALSE;
            """))
            print("Successfully added is_quantity_disclose column.")
        except Exception as e:
            print(f"Error adding column (it might already exist?): {e}")

        try:
            # 2. Fix quantity constraints
            conn.execute(text("""
                ALTER TABLE intelligence.product_sizes 
                ALTER COLUMN quantity SET DEFAULT 0,
                ALTER COLUMN quantity SET NOT NULL;
            """))
            print("Successfully updated quantity constraints.")
        except Exception as e:
            print(f"Error updating quantity: {e}")

        conn.commit()
        print("All forced changes committed!")

if __name__ == "__main__":
    force_migrate()
