import psycopg2
import os
from dotenv import load_dotenv

def check_product():
    load_dotenv('a:/biba_ci/backend/.env')
    conn = psycopg2.connect(os.getenv('SYNC_DATABASE_URL'))
    cur = conn.cursor()
    
    sku = 'yellow-floral-printed-flared-dress-w13071-126165'
    cur.execute('SELECT record_id, name FROM intelligence.new_arrival_products WHERE sku = %s', (sku,))
    product = cur.fetchone()
    
    if product:
        pid, name = product
        print(f"Product Found: {name} (ID: {pid})")
        cur.execute('SELECT size, quantity, is_available FROM intelligence.product_sizes WHERE product_id = %s', (pid,))
        sizes = cur.fetchall()
        print("Sizes in DB:")
        for s in sizes:
            print(f"  {s[0]}: Qty={s[1]}, Available={s[2]}")
    else:
        print("Product NOT found in new_arrival_products")
        
    cur.close()
    conn.close()

if __name__ == "__main__":
    check_product()
