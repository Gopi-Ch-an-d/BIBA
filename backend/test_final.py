import requests

def test_final():
    try:
        r = requests.get('http://localhost:8000/api/v1/products?page=1&page_size=20')
        print(f"Status: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            if len(data.get('products', [])) > 0:
                p = data['products'][0]
                print(f"Product Keys: {list(p.keys())}")
                print(f"Sample Product: {p.get('name')}")
                print(f"Total Quantity: {p.get('total_quantity')}")
        else:
            print(f"Error Body: {r.text}")
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    test_final()
