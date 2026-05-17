import re
import requests
from bs4 import BeautifulSoup
import logging
import random
import time

logger = logging.getLogger(__name__)

from fake_useragent import UserAgent

ua = UserAgent()
_session = requests.Session()

def extract_size_quantities(url: str) -> dict[str, dict]:
    """
    Extracts size-level stock info from a Shopify PDP with retry logic and 429/503 handling.
    """
    max_retries = 3
    resp_text = None
    
    referer = url.split("/products/")[0] + "/" if "/products/" in url else url
    for attempt in range(max_retries):
        headers = {
            "User-Agent": ua.random,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Referer": referer,
            "Cache-Control": "no-cache",
            "Pragma": "no-cache"
        }
        try:
            resp = _session.get(url, headers=headers, timeout=20)
            
            # Handle Rate Limiting (429) or Server Overload (503/504)
            if resp.status_code in [429, 503, 504]:
                wait_time = (attempt + 1) * random.uniform(5, 10)
                logger.warning(f"[size_extractor] Status {resp.status_code} on attempt {attempt+1}. Backing off for {wait_time:.1f}s...")
                time.sleep(wait_time)
                continue
                
            resp.raise_for_status()
            resp_text = resp.text
            break # Success
            
        except Exception as e:
            if attempt == max_retries - 1:
                logger.warning(f"[size_extractor] Final attempt failed for {url}: {e}")
                return {}
            time.sleep(random.uniform(2, 5))

    if not resp_text:
        return {}

    try:
        soup = BeautifulSoup(resp_text, "html.parser")
        results = {}

        for radio in soup.select('input[type="radio"][name="Size"]'):
            size = radio.get("value")
            if not size:
                continue

            size_key = size.strip().upper()
            label = soup.find("label", {"for": radio.get("id")})

            # ── Default state ──────────────────────────────────────────────
            qty = 0
            disclosed = False
            is_available = False 

            radio_disabled = radio.has_attr("disabled")

            if radio_disabled:
                is_available = False
            elif label:
                label_classes = label.get("class", [])
                is_sold_out_class = "sold_out_product_notify" in label_classes

                if is_sold_out_class:
                    is_available = False
                else:
                    # ── Extraction Logic ──────────────────────────────────────────────
                    # Check for quantity text (e.g. "Only 4 left")
                    span = label.find("span", class_="data_variant__quantity")
                    if not span:
                        span = label.find("span", class_="data_variant__qunatity")
                    if not span:
                        span = label.find("span", class_="variant-quantity")
                    
                    # Search for numbers ONLY in the span (to avoid matching numbers in size names like 3XL)
                    if span:
                        search_text = span.get_text(strip=True)
                        match = re.search(r"(\d+)", search_text)
                        
                        if match:
                            qty = int(match.group(1))
                            disclosed = True
                            is_available = qty > 0
                        else:
                            qty = 0
                            disclosed = False
                            is_available = True
                    else:
                        # No quantity span found. It's available but exact quantity is hidden.
                        qty = 0
                        disclosed = False
                        is_available = True
            else:
                is_available = not radio_disabled

            results[size_key] = {
                "quantity": qty,
                "disclosed": disclosed,
                "is_available": is_available,
            }

        return results

    except Exception as e:
        logger.warning(f"[size_extractor] Parsing error for {url}: {e}")
        return {}