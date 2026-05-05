import requests
from bs4 import BeautifulSoup

def get_pdp_html(url):
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    r = requests.get(url, headers=headers)
    soup = BeautifulSoup(r.text, 'html.parser')
    
    # Look for size variants
    variants = soup.select(".data_variant_list li")
    print(f"Found {len(variants)} variants")
    
    for li in variants:
        size = li.select_one(".data_variant__size")
        qty = li.select_one(".data_variant__quantity")
        print(f"Size: {size.get_text(strip=True) if size else 'N/A'}")
        print(f"Qty El: {qty}")
        if qty:
            print(f"Qty Text: {qty.get_text(strip=True)}")
        print("-" * 20)

if __name__ == "__main__":
    url = "https://www.wforwoman.com/products/white-ankle-length-pure-cotton-gathered-pants-w63242-223575"
    get_pdp_html(url)
