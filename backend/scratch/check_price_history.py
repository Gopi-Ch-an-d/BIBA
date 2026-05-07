import sys
import os
from sqlalchemy import select

# Add backend directory to path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(backend_dir)

from db.database import SessionLocalSync
from db.models import NewArrivalProduct, PriceHistory

sku = "yellow-floral-printed-tassels-straight-kurta-with-flared-pant-and-dupatta-set-ws13689-126978"

session = SessionLocalSync()

p = session.execute(
    select(NewArrivalProduct).where(NewArrivalProduct.sku == sku)
).scalar_one_or_none()

if p:
    print(f"Product found: {p.name} (ID: {p.record_id})")
    print(f"Current Price in main table: {p.current_price}")
    
    history = session.execute(
        select(PriceHistory).where(PriceHistory.sku == sku).order_by(PriceHistory.scraped_at.desc())
    ).scalars().all()
    
    print(f"Price History found ({len(history)} records):")
    for h in history:
        print(f"  Date: {h.scraped_at}, Price: {h.price}")
else:
    print("Product not found")

session.close()
