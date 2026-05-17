import sys
sys.path.append('a:\\biba_ci\\backend')
from db.database import SessionLocalSync
from db.models import PriceHistory

session = SessionLocalSync()

# Query all records ordered by SKU and scraped_at
records = session.query(PriceHistory).order_by(PriceHistory.sku, PriceHistory.scraped_at).all()

last_sku = None
last_price = None
last_stock = None
to_delete = []

for r in records:
    if r.sku == last_sku:
        if r.price == last_price and r.stock_available == last_stock:
            # Duplicate!
            to_delete.append(r.record_id)
        else:
            # Update last known values
            last_price = r.price
            last_stock = r.stock_available
    else:
        # New SKU
        last_sku = r.sku
        last_price = r.price
        last_stock = r.stock_available

print(f"Found {len(to_delete)} duplicates to delete.")

if to_delete:
    # Delete in batches
    batch_size = 500
    for i in range(0, len(to_delete), batch_size):
        batch = to_delete[i:i+batch_size]
        session.query(PriceHistory).filter(PriceHistory.record_id.in_(batch)).delete(synchronize_session=False)
        session.commit()
    print("Deleted successfully!")
else:
    print("No duplicates found.")
