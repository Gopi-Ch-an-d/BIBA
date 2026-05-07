import sys
import os
from sqlalchemy import select, func, and_

# Add backend directory to path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(backend_dir)

from db.database import SessionLocalSync
from db.models import BestsellerProduct, NewArrivalProduct, ProductSize

sku = "black-solid-printed-shantung-straight-kurta-straight-pant-and-dupatta-set-wsst10358-607053"

session = SessionLocalSync()

def check_total_qty(model_cls, source_name):
    p = session.execute(
        select(model_cls).where(model_cls.sku == sku)
    ).scalar_one_or_none()
    
    if not p:
        return

    print(f"\nChecking Total Qty for {source_name} (ID: {p.record_id})")
    
    # Replicate the API subquery logic
    latest_snaps = select(
        ProductSize.size,
        func.max(ProductSize.last_updated_at).label("max_ts")
    ).where(
        ProductSize.product_id == p.record_id,
        ProductSize.source == source_name
    ).group_by(ProductSize.size).subquery()

    qty_subq_stmt = select(func.sum(ProductSize.quantity)).join(
        latest_snaps,
        and_(
            ProductSize.size == latest_snaps.c.size,
            ProductSize.last_updated_at == latest_snaps.c.max_ts
        )
    ).where(
        ProductSize.product_id == p.record_id,
        ProductSize.source == source_name
    )
    
    total_qty = session.execute(qty_subq_stmt).scalar()
    print(f"Calculated Total Qty: {total_qty}")
    
    # Check individual latest records
    latest_records_stmt = select(ProductSize).join(
        latest_snaps,
        and_(
            ProductSize.size == latest_snaps.c.size,
            ProductSize.last_updated_at == latest_snaps.c.max_ts
        )
    ).where(
        ProductSize.product_id == p.record_id,
        ProductSize.source == source_name
    )
    
    records = session.execute(latest_records_stmt).scalars().all()
    print("Latest records found:")
    for r in records:
        print(f"  {r.size}: Qty={r.quantity}, Avail={r.is_available}, Updated={r.last_updated_at}")

check_total_qty(NewArrivalProduct, "new_arrival")

session.close()
