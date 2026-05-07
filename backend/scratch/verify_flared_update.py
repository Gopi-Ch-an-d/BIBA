import requests

sku = "yellow-floral-printed-flared-dress-w13071-126165"
url = f"http://127.0.0.1:8000/api/v1/analytics/product/{sku}/history"

resp = requests.get(url)
print(f"Status: {resp.status_code}")
data = resp.json()

print(f"History items for Flared Dress: {len(data)}")
for item in data:
    print(f"  Date: {item['scraped_at']}, Price: {item['price']}")
