import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.database import sync_engine
from sqlalchemy import text

def delete_global_desi_competitor():
    with sync_engine.connect() as conn:
        # Delete from competitors table
        res = conn.execute(text("DELETE FROM intelligence.competitors WHERE code = 'GD_IND'"))
        conn.commit()
        print(f"Deleted {res.rowcount} competitor record!")

if __name__ == "__main__":
    delete_global_desi_competitor()
