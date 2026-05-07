import requests
from bs4 import BeautifulSoup
import re

url = "https://www.wforwoman.com/products/yellow-floral-printed-tassels-straight-kurta-with-flared-pant-and-dupatta-set-ws13689-126978"

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
}

resp = requests.get(url, headers=headers)
soup = BeautifulSoup(resp.text, 'html.parser')

# Look for price
# span.price-item--sale
# span.price-item--regular
sale_price_el = soup.select_one("span.price-item--sale")
reg_price_el = soup.select_one("span.price-item--regular")

sale_price = sale_price_el.get_text(strip=True) if sale_price_el else "Not found"
reg_price = reg_price_el.get_text(strip=True) if reg_price_el else "Not found"

print(f"Sale Price: {sale_price}")
print(f"Regular Price: {reg_price}")
