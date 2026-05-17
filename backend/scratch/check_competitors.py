import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.database import sync_engine
from sqlalchemy import text

def check_competitors():
    with sync_engine.connect() as conn:
        res = conn.execute(text("SELECT record_id, name, code, is_active FROM intelligence.competitors")).all()
        for row in res:
            print(f"ID: {row[0]}, Name: {row[1]}, Code: {row[2]}, Active: {row[3]}")

if __name__ == "__main__":
    check_competitors()
