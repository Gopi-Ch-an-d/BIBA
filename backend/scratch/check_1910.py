from db.database import sync_engine
from sqlalchemy import text
import json

def check_product_1910():
    with sync_engine.connect() as conn:
        # Get product details
        product = conn.execute(text(
            "SELECT * FROM intelligence.new_arrival_products WHERE record_id = 1910"
        )).fetchone()
        
        if not product:
            print("Product 1910 not found in new_arrival_products.")
            return

        print(f"Product 1910: {product.name} (SKU: {product.sku})")
        print(f"  Current Price: {product.current_price}")
        print(f"  Stock Available: {product.stock_available}")
        print(f"  Last Updated: {product.last_updated_at}")
        
        # Get sizes
        sizes = conn.execute(text(
            "SELECT size, quantity, is_available, last_updated_at FROM intelligence.product_sizes WHERE product_id = 1910 AND source = 'new_arrival'"
        )).fetchall()
        
        print("\nSizes:")
        for s in sizes:
            print(f"  - {s.size}: Qty={s.quantity}, Available={s.is_available}, Updated={s.last_updated_at}")
            
        # Get history
        history = conn.execute(text(
            "SELECT price, stock_available, scraped_at FROM intelligence.price_history WHERE product_id = 1910 AND source = 'new_arrival' ORDER BY scraped_at DESC LIMIT 5"
        )).fetchall()
        
        print("\nRecent Price History:")
        for h in history:
            print(f"  - {h.scraped_at}: Price={h.price}, Stock={h.stock_available}")

if __name__ == '__main__':
    check_product_1910()
