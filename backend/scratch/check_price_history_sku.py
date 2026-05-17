import sys
sys.path.append('a:\\biba_ci\\backend')
from db.database import SessionLocalSync
from db.models import NewArrivalProduct, Competitor

session = SessionLocalSync()

comp = session.query(Competitor).filter_by(name="Global Desi").first()
if comp:
    comp_id = getattr(comp, 'record_id', getattr(comp, 'id', None))
    p = session.query(NewArrivalProduct).filter_by(competitor_id=comp_id).order_by(NewArrivalProduct.last_updated_at.desc()).first()
    if p:
        print(f"Latest product date: {p.last_updated_at}")
    else:
        print("No products found!")
else:
    print("Global Desi not found in database!")
