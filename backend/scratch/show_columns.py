from db.database import sync_engine
from sqlalchemy import text
import json

with sync_engine.connect() as conn:
    res = conn.execute(text("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'intelligence' AND table_name = 'product_sizes' 
        ORDER BY ordinal_position
    """)).fetchall()
    
    columns = {r[0]: r[1] for r in res}
    print(json.dumps(columns, indent=2))
