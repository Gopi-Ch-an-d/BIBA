import sys
import os
from sqlalchemy import select

# Add backend directory to path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(backend_dir)

from db.database import SessionLocalSync
from db.models import BestsellerProduct, NewArrivalProduct, ProductSize

sku = "black-solid-printed-shantung-straight-kurta-straight-pant-and-dupatta-set-wsst10358-607053"

session = SessionLocalSync()

def check_product(model_cls, name):
    p = session.execute(
        select(model_cls).where(model_cls.sku == sku)
    ).scalar_one_or_none()
    
    if p:
        print(f"\nFound in {name}:")
        print(f"ID: {p.record_id}, SKU: {p.sku}, Stock Available: {p.stock_available}")
        print(f"Last Updated: {p.last_updated_at}")
        
        sizes = session.execute(
            select(ProductSize).where(
                ProductSize.product_id == p.record_id,
                ProductSize.source == name.lower().replace(" ", "_")[:-1] # bestseller or new_arrival
            ).order_by(ProductSize.last_updated_at.desc())
        ).scalars().all()
        
        print(f"Size Records found: {len(sizes)}")
        # Group by size to see the latest for each
        latest_sizes = {}
        for s in sizes:
            if s.size not in latest_sizes:
                latest_sizes[s.size] = s
        
        for size, s in latest_sizes.items():
            print(f"  {size}: Qty={s.quantity}, Available={s.is_available}, Disclosed={s.is_quantity_disclose}, Updated={s.last_updated_at}")
    else:
        print(f"\nNot found in {name}")

check_product(BestsellerProduct, "Bestsellers")
check_product(NewArrivalProduct, "New Arrivals")

session.close()
