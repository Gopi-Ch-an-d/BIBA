from db.database import sync_engine
from sqlalchemy import text

def check_history():
    with sync_engine.connect() as conn:
        res = conn.execute(text("""
            SELECT CAST(first_seen_at AS DATE) as d, COUNT(*) 
            FROM intelligence.new_arrival_products 
            GROUP BY d 
            ORDER BY d DESC 
            LIMIT 5;
        """))
        for row in res:
            print(f"Date {row[0]}: {row[1]} products added")

if __name__ == "__main__":
    check_history()
