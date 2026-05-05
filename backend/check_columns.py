from db.database import sync_engine
from sqlalchemy import text

def check():
    with sync_engine.connect() as conn:
        res = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'intelligence' 
            AND table_name = 'product_sizes'
            ORDER BY ordinal_position;
        """))
        columns = [row[0] for row in res]
        print(f"Current columns: {columns}")

if __name__ == "__main__":
    check()
