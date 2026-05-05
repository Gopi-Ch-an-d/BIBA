from db.database import sync_engine
from sqlalchemy import text

def check_active():
    with sync_engine.connect() as conn:
        count = conn.execute(text("SELECT count(*) FROM intelligence.new_arrival_products WHERE is_active=TRUE;")).scalar()
        print(f"Active Products: {count}")

if __name__ == "__main__":
    check_active()
