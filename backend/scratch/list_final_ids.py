import sys
import os
from sqlalchemy import select

# Add backend directory to path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(backend_dir)

from db.database import SessionLocalSync
from db.models import PriceHistory

session = SessionLocalSync()

history = session.execute(
    select(PriceHistory).where(PriceHistory.sku.like("%yellow-floral-printed%")).order_by(PriceHistory.sku, PriceHistory.scraped_at.asc())
).scalars().all()

print(f"Price History Record IDs:")
for h in history:
    print(f"SKU: ...{h.sku[-10:]} | RecordID: {h.record_id} | Date: {h.scraped_at} | Price: {h.price}")

session.close()
