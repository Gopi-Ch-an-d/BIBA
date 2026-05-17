import sys
sys.path.append('a:\\biba_ci\\backend')
from db.database import SessionLocalSync
from db.models import BestsellerProduct

session = SessionLocalSync()
records = session.query(BestsellerProduct).filter(
    BestsellerProduct.sku == "beige-floral-printed-buttons-cotton-blend-straight-kurta-with-pant-set-ws13919-125515"
).all()

for r in records:
    print(r.record_id, r.first_seen_at, r.is_active, r.is_deleted)
