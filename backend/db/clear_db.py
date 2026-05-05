"""
backend/db/clear_db.py - Script to truncate all tables in the database
"""
from sqlalchemy import text
import sys
import os

# Add the parent directory to sys.path to allow importing from db
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.database import sync_engine

def clear_data():
    tables = [
        "master.employees",
        "master.users",
        "master.roles",
        "master.picklist",
        "master.picklist_type",
        "intelligence.product_sizes",
        "intelligence.size_history",
        "intelligence.price_history",
        "intelligence.scrape_logs",
        "intelligence.request_logs",
        "intelligence.bestseller_products",
        "intelligence.new_arrival_products",
        "intelligence.categories",
        "intelligence.competitors"
    ]
    
    print("Connecting to database to clear all data...")
    with sync_engine.connect() as conn:
        # Disable triggers/constraints check if needed, but CASCADE handles it
        # We'll use a single TRUNCATE command with CASCADE for efficiency
        table_list = ", ".join(tables)
        try:
            print(f"Truncating tables: {table_list}")
            conn.execute(text(f"TRUNCATE TABLE {table_list} RESTART IDENTITY CASCADE;"))
            conn.commit()
            print("\nSUCCESS: All data has been removed and identities restarted.")
        except Exception as e:
            conn.rollback()
            print(f"\nERROR: Failed to clear data. {e}")

if __name__ == "__main__":
    # Confirmation prompt skipped as per agentic behavior, but we can print what we are doing.
    clear_data()
