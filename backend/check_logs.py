from db.database import sync_engine
from sqlalchemy import text

def check_scrape_logs():
    with sync_engine.connect() as conn:
        print("--- RECENT SCRAPE LOGS ---")
        res = conn.execute(text("""
            SELECT l.record_id, c.name, l.status, l.inserted_datetime, l.total_products, l.new_products, l.updated_products
            FROM intelligence.scrape_logs l
            JOIN intelligence.competitors c ON l.competitor_id = c.record_id
            ORDER BY l.inserted_datetime DESC
            LIMIT 5;
        """))
        for row in res:
            print(f"ID: {row[0]}, Comp: {row[1]}, Status: {row[2]}, Start: {row[3]}, Total: {row[4]}, New: {row[5]}, Upd: {row[6]}")

if __name__ == "__main__":
    check_scrape_logs()
