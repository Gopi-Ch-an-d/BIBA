import requests
from bs4 import BeautifulSoup

url = "https://www.wforwoman.com/collections/new/products/pink-solid-embroidered-straight-silk-pant-f62055-920633?_pos=396&_fid=296c747bd&_ss=c"
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
}

resp = requests.get(url, headers=headers)
print(f"Status: {resp.status_code}")
soup = BeautifulSoup(resp.text, "html.parser")

# Check for size inputs
radios = soup.select('input[type="radio"][name="Size"]')
print(f"Found {len(radios)} size radios")

for radio in radios:
    id_ = radio.get("id")
    val = radio.get("value")
    label = soup.find("label", {"for": id_})
    span = label.find("span", class_="data_variant__quantity") if label else None
    qty_text = span.get_text(strip=True) if span else "No span found"
    print(f"Size: {val}, Label: {'Found' if label else 'Not Found'}, Span: {qty_text}")

# Also check for any mention of 'left' or 'only'
import re
matches = re.findall(r"\d+\s+left", resp.text, re.I)
print(f"Regex 'left' matches: {matches}")
