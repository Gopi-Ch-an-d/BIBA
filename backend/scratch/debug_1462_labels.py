import requests
from bs4 import BeautifulSoup

url = "https://www.wforwoman.com/collections/new/products/pink-solid-embroidered-straight-silk-pant-f62055-920633?_pos=396&_fid=296c747bd&_ss=c"
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
}

resp = requests.get(url, headers=headers)
soup = BeautifulSoup(resp.text, "html.parser")

radios = soup.select('input[type="radio"][name="Size"]')

for radio in radios:
    id_ = radio.get("id")
    val = radio.get("value")
    label = soup.find("label", {"for": id_})
    if label:
        print(f"Size: {val}, Label HTML: {label}")
