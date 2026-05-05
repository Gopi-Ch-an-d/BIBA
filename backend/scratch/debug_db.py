from db.database import sync_engine
from sqlalchemy import text

with sync_engine.connect() as conn:
    res = conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'intelligence' AND table_name = 'new_arrival_products'")).fetchall()
    for row in res:
        print(row)
    
    print("\nExisting record check:")
    res = conn.execute(text("SELECT record_id, sku FROM intelligence.new_arrival_products WHERE competitor_id=2 AND sku='off-white-thread-embroidered-pure-cotton-a-line-dress-w13568-224918'")).fetchone()
    print(res)
