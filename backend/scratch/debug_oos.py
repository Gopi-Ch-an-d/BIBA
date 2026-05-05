import requests
from bs4 import BeautifulSoup

url = "https://www.wforwoman.com/products/navy-blue-solid-lace-rayon-flax-a-line-kurta-w14139-225567"
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
}

resp = requests.get(url, headers=headers)
soup = BeautifulSoup(resp.text, "html.parser")

# Check for sold out badge on PDP
badges = soup.select(".badge--sold-out, .sold-out-label, .product__badge")
print(f"Found {len(badges)} badges")
for b in badges:
    print(f"Badge text: '{b.text.strip().lower()}'")

# Check sizes
radios = soup.select('input[type="radio"][name="Size"]')
print(f"Found {len(radios)} size radios")

for radio in radios:
    id_ = radio.get("id")
    val = radio.get("value")
    label = soup.find("label", {"for": id_})
    disabled = radio.has_attr("disabled")
    
    span = None
    if label:
        span = label.find("span", class_="data_variant__quantity")
        if not span:
            span = label.find("span", class_="data_variant__qunatity")
            
    qty_text = span.get_text(strip=True) if span else "No span"
    print(f"Size: {val}, Disabled: {disabled}, Span: {qty_text}")
