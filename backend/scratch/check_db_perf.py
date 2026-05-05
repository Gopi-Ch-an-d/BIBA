import time
from db.database import sync_engine
from sqlalchemy import text

start = time.time()
with sync_engine.connect() as conn:
    try:
        # Simple test query to see if ProductSize is locked or slow
        res = conn.execute(text("SELECT count(*) FROM intelligence.product_sizes")).scalar()
        print(f"Count: {res}, Time: {time.time() - start:.4f}s")
    except Exception as e:
        print(f"Error: {e}")
