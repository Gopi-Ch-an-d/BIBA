import sys
import os
from sqlalchemy import select

# Add backend directory to path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(backend_dir)

from db.database import SessionLocalSync
from db.models import PriceHistory

sku = "yellow-floral-printed-tassels-straight-kurta-with-flared-pant-and-dupatta-set-ws13689-126978"

session = SessionLocalSync()

history = session.execute(
    select(PriceHistory).where(PriceHistory.sku == sku).order_by(PriceHistory.scraped_at.asc())
).scalars().all()

print(f"Price History Detailed for {sku}:")
for h in history:
    print(f"Date: {h.scraped_at}")
    print(f"  Price: {h.price}")
    print(f"  Original Price: {h.original_price}")
    print(f"  Discount %: {h.discount_pct}")
    print("-" * 20)

session.close()
