import psycopg2
import os
from dotenv import load_dotenv

load_dotenv('a:/biba_ci/backend/.env')
DATABASE_URL = os.getenv("SYNC_DATABASE_URL")

def sync_schema():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        # 1. Drop 'category' column from product tables if they exist
        tables = ['bestseller_products', 'new_arrival_products']
        for table in tables:
            cur.execute(f"SELECT column_name FROM information_schema.columns WHERE table_schema = 'intelligence' AND table_name = '{table}' AND column_name = 'category'")
            if cur.fetchone():
                print(f"Dropping 'category' column from intelligence.{table}...")
                cur.execute(f"ALTER TABLE intelligence.{table} DROP COLUMN category")
        
        # 2. Add 'inserted_datetime' to price_history if missing
        cur.execute("SELECT column_name FROM information_schema.columns WHERE table_schema = 'intelligence' AND table_name = 'price_history' AND column_name = 'inserted_datetime'")
        if not cur.fetchone():
            print("Adding 'inserted_datetime' to intelligence.price_history...")
            cur.execute("ALTER TABLE intelligence.price_history ADD COLUMN inserted_datetime TIMESTAMP DEFAULT CURRENT_TIMESTAMP")

        # 3. Add 'inserted_datetime' to product_sizes if missing
        cur.execute("SELECT column_name FROM information_schema.columns WHERE table_schema = 'intelligence' AND table_name = 'product_sizes' AND column_name = 'inserted_datetime'")
        if not cur.fetchone():
            print("Adding 'inserted_datetime' to intelligence.product_sizes...")
            cur.execute("ALTER TABLE intelligence.product_sizes ADD COLUMN inserted_datetime TIMESTAMP DEFAULT CURRENT_TIMESTAMP")

        conn.commit()
        print("Database synchronization complete.")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error syncing schema: {e}")

if __name__ == "__main__":
    sync_schema()
