import sys
import os
from sqlalchemy import select
from datetime import datetime

# Add backend directory to path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(backend_dir)

from db.database import SessionLocalSync
from db.models import NewArrivalProduct, PriceHistory

sku = "yellow-floral-printed-flared-dress-w13071-126165"

session = SessionLocalSync()

p = session.execute(
    select(NewArrivalProduct).where(NewArrivalProduct.sku == sku)
).scalar_one_or_none()

if p:
    print(f"Found product: {p.name}")
    # 1. Update current price
    p.current_price = 7000.0
    p.last_updated_at = datetime.utcnow()
    
    # 2. Ensure May 03 record is correct (5000)
    may03_record = session.execute(
        select(PriceHistory).where(PriceHistory.sku == sku).order_by(PriceHistory.scraped_at.asc())
    ).scalars().first()
    
    if may03_record:
        print(f"Ensuring May 03 record is 5000 (currently {may03_record.price})...")
        may03_record.price = 5000.0
    
    # 3. Add May 07 record (7000)
    print("Adding May 07 record at 7000...")
    new_history = PriceHistory(
        source='new_arrival',
        product_id=p.record_id,
        competitor_id=p.competitor_id,
        sku=p.sku,
        price=7000.0,
        original_price=p.original_price,
        stock_available=True,
        scraped_at=datetime.utcnow()
    )
    session.add(new_history)
    
    session.commit()
    print("Successfully updated Flared Dress to 7000 and added history record.")
else:
    print("Product not found.")

session.close()
