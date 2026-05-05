from db.database import sync_engine
from sqlalchemy import text

def update_schema():
    sql = """
    CREATE TABLE IF NOT EXISTS intelligence.product_sizes (
        record_id             SERIAL PRIMARY KEY,
        source                VARCHAR(50) NOT NULL CHECK (source IN ('bestseller', 'new_arrival')),
        product_id            INT NOT NULL,
        size                  VARCHAR(50) NOT NULL,
        quantity              INT DEFAULT 0,
        is_quantity_disclose  BOOLEAN DEFAULT TRUE,
        is_available          BOOLEAN DEFAULT TRUE,
        last_updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        inserted_datetime     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (source, product_id, size)
    );
    """
    try:
        with sync_engine.connect() as conn:
            # We use text().execution_options(autocommit=True) if needed, but conn.commit() is fine
            conn.execute(text(sql))
            conn.commit()
            print("Schema updated successfully in fashion_db.")
    except Exception as e:
        print(f"Error updating schema: {e}")

if __name__ == "__main__":
    update_schema()
