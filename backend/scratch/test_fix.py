from scraper.size_extractor import extract_size_quantities
import json

url = "https://www.wforwoman.com/collections/new/products/pink-solid-embroidered-straight-silk-pant-f62055-920633?_pos=396&_fid=296c747bd&_ss=c"
results = extract_size_quantities(url)
print(json.dumps(results, indent=2))
