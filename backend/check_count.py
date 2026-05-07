from db.database import sync_engine
from sqlalchemy import text

def check_count():
    with sync_engine.connect() as conn:
        res = conn.execute(text("SELECT count(*) FROM intelligence.product_sizes WHERE last_updated_at > NOW() - INTERVAL '1 hour'"))
        print(f"Products updated in last hour: {res.scalar()}")
        
        res = conn.execute(text("SELECT count(*) FROM intelligence.product_sizes WHERE last_updated_at > NOW() - INTERVAL '10 minutes'"))
        print(f"Products updated in last 10 mins: {res.scalar()}")

if __name__ == "__main__":
    check_count()
