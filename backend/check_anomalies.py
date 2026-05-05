from db.database import sync_engine
from sqlalchemy import text

def check_anomalies():
    with sync_engine.connect() as conn:
        count = conn.execute(text("SELECT count(*) FROM intelligence.product_sizes WHERE quantity > 0 AND is_quantity_disclose = False;")).scalar()
        print(f"Anomalies (Qty > 0, Disclose = False): {count}")
        
        if count > 0:
            res = conn.execute(text("SELECT record_id, product_id, size, quantity, is_quantity_disclose FROM intelligence.product_sizes WHERE quantity > 0 AND is_quantity_disclose = False LIMIT 5;")).all()
            print("\nSample Anomalies:")
            for row in res:
                print(row)
        
        # Check overall distribution
        dist = conn.execute(text("SELECT is_quantity_disclose, count(*) FROM intelligence.product_sizes GROUP BY is_quantity_disclose;")).all()
        print("\nDisclosure Distribution:")
        for row in dist:
            print(f"Disclose={row[0]}: {row[1]} records")

if __name__ == "__main__":
    check_anomalies()
