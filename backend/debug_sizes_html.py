import requests
from bs4 import BeautifulSoup

def debug_sizes(url):
    headers = {"User-Agent": "Mozilla/5.0"}
    r = requests.get(url, headers=headers)
    soup = BeautifulSoup(r.text, 'html.parser')
    
    print(f"URL: {url}")
    radios = soup.select('input[type="radio"][name="Size"]')
    print(f"Found {len(radios)} radio buttons.")
    
    for rd in radios:
        size = rd.get("value")
        attrs = rd.attrs
        label = soup.find("label", {"for": rd.get("id")})
        label_text = label.get_text(strip=True) if label else "NO LABEL"
        label_class = label.get("class") if label else "N/A"
        
        print(f"Size: {size} | Radio Attrs: {attrs} | Label: {label_text} | Label Class: {label_class}")
        if label:
            span = label.find("span", class_="data_variant__qunatity")
            if span:
                print(f"  FOUND QUANTITY SPAN: {span.get_text(strip=True)}")

if __name__ == "__main__":
    url = "https://www.wforwoman.com/collections/new/products/green-embroidered-anarkali-tissue-dress-with-churidar-and-dupatta-set-sp11499-401097"
    debug_sizes(url)
