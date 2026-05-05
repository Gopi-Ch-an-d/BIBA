from db.database import sync_engine
from sqlalchemy import text

def check_inactive():
    with sync_engine.connect() as conn:
        count = conn.execute(text("SELECT count(*) FROM intelligence.new_arrival_products WHERE is_active=FALSE;")).scalar()
        print(f"Inactive Products: {count}")

if __name__ == "__main__":
    check_inactive()
