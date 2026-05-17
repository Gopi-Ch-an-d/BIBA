import sys
sys.path.append('a:\\biba_ci\\backend')
from db.database import SessionLocalSync
from db.models import PriceHistory

session = SessionLocalSync()

records = session.query(PriceHistory).filter(
    PriceHistory.sku == "off-white-floral-printed-lace-cotton-straight-kurta-with-palazzo-co-ord-set-as16646a-510814"
).order_by(PriceHistory.scraped_at).all()

last_sku = None
last_price = None
last_stock = None

for r in records:
    print(f"Checking: {r.scraped_at}, {r.price}, {r.stock_available}, {r.product_id}")
    if r.sku == last_sku:
        if r.price == last_price and r.stock_available == last_stock:
            print(f"-> DUPLICATE! Deleting Record ID: {r.record_id}")
            session.delete(r)
            session.commit()
            print("Deleted successfully!")
        else:
            print("-> Different price/stock")
            last_price = r.price
            last_stock = r.stock_available
    else:
        print("-> New SKU")
        last_sku = r.sku
        last_price = r.price
        last_stock = r.stock_available
