import sys
import os
import logging

# Add backend directory to path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(backend_dir)

from scraper.size_extractor import extract_size_quantities

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

url = "https://www.wforwoman.com/products/black-solid-printed-shantung-straight-kurta-straight-pant-and-dupatta-set-wsst10358-607053"

logger.info(f"Debugging PDP extraction for: {url}")
sizes = extract_size_quantities(url)

print("\nEXTRACTED SIZES:")
for size, info in sizes.items():
    print(f"{size}: {info}")

if not sizes:
    print("\nNO SIZES EXTRACTED! The selector might be wrong or we are blocked.")
