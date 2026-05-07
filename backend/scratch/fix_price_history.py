import sys
import os
from sqlalchemy import select
from datetime import datetime

# Add backend directory to path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(backend_dir)

from db.database import SessionLocalSync
from db.models import NewArrivalProduct, PriceHistory

sku = "yellow-floral-printed-tassels-straight-kurta-with-flared-pant-and-dupatta-set-ws13689-126978"

session = SessionLocalSync()

# 1. Update the main product table to 5000
p = session.execute(
    select(NewArrivalProduct).where(NewArrivalProduct.sku == sku)
).scalar_one_or_none()

if p:
    print(f"Updating main product table for {sku}...")
    p.current_price = 5000.0
    p.last_updated_at = datetime.utcnow()

# 2. Fix history records
history = session.execute(
    select(PriceHistory).where(PriceHistory.sku == sku).order_by(PriceHistory.scraped_at.asc())
).scalars().all()

if len(history) >= 2:
    print("Fixing history records...")
    # May 03 record (index 0) -> 5599
    history[0].price = 5599.0
    print(f"  Updated May 03 record to 5599.0")
    
    # May 07 record (index 1) -> 5000
    history[1].price = 5000.0
    print(f"  Updated May 07 record to 5000.0")

session.commit()
print("Success: Price records corrected.")
session.close()
