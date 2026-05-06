"""
scraper/engine.py
-----------------
Core scraping engine with:
  • Undetected-Chromedriver (bypasses Cloudflare/Akamai fingerprinting)
  • Residential proxy rotation
  • Randomised User-Agents, delays, mouse & scroll simulation
  • CSS/XPath-based extraction helpers
  • Pagination & infinite-scroll handling
"""

import time
import random
import logging
import os
from dataclasses import dataclass, field
from typing import Optional

import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.action_chains import ActionChains
from fake_useragent import UserAgent
from scraper.size_extractor import extract_size_quantities
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

ua = UserAgent()

PROXY_HOST = os.getenv("PROXY_HOST", "")
PROXY_PORT = os.getenv("PROXY_PORT", "8080")
PROXY_USER = os.getenv("PROXY_USER", "")
PROXY_PASS = os.getenv("PROXY_PASS", "")


@dataclass
class RawProduct:
    """Raw scraped product before DB normalisation."""
    sku: str
    name: str
    category: str
    current_price: Optional[float]
    original_price: Optional[float]
    discount_pct: Optional[float]
    stock_available: bool
    is_bestseller: bool
    image_url: str
    product_url: str
    is_new_launch: bool = False
    sizes: dict[str, dict] = field(default_factory=dict) # e.g. {"XS": {"quantity": 5, "disclosed": True}}


def _build_proxy_extension(host: str, port: str, user: str, pwd: str) -> str:
    """
    Build a Chrome extension that injects proxy credentials.
    Returns path to a temporary .zip extension file.
    """
    import zipfile, tempfile

    manifest = """{
  "version": "1.0.0",
  "manifest_version": 2,
  "name": "Proxy Auth",
  "permissions": ["proxy", "tabs", "unlimitedStorage", "storage", "<all_urls>", "webRequest", "webRequestBlocking"],
  "background": {"scripts": ["background.js"]},
  "minimum_chrome_version": "22.0.0"
}"""

    background = f"""
var config = {{
    mode: "fixed_servers",
    rules: {{
        singleProxy: {{scheme: "http", host: "{host}", port: parseInt("{port}")}},
        bypassList: ["localhost"]
    }}
}};
chrome.proxy.settings.set({{value: config, scope: "regular"}}, function(){{}});
function callbackFn(details) {{
    return {{authCredentials: {{username: "{user}", password: "{pwd}"}}}};
}}
chrome.webRequest.onAuthRequired.addListener(callbackFn,
    {{urls: ["<all_urls>"]}}, ["blocking"]);
"""
    tmp = tempfile.mktemp(suffix=".zip")
    with zipfile.ZipFile(tmp, "w") as zp:
        zp.writestr("manifest.json", manifest)
        zp.writestr("background.js", background)
    return tmp


import threading
import shutil

_driver_lock = threading.Lock()


def _get_fresh_options():
    options = uc.ChromeOptions()
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_argument(f"--user-agent={ua.random}")
    # Randomize viewport slightly to avoid fixed-fingerprint detection
    width = random.randint(1366, 1920)
    height = random.randint(768, 1080)
    options.add_argument(f"--window-size={width},{height}")
    
    options.add_argument("--lang=en-US,en;q=0.9")
    
    # Advanced Header Spoofing
    options.add_argument("--disable-features=IsolateOrigins,site-per-process")
    options.add_argument("--accept-lang=en-US,en;q=0.9")
    
    # Realistic Referral Header (Simulating a visitor from Google)
    referrers = [
        "https://www.google.com/",
        "https://www.bing.com/",
        "https://t.co/", # Twitter
        "https://www.facebook.com/",
        "https://www.instagram.com/"
    ]
    options.add_argument(f"--referrer={random.choice(referrers)}")
    
    if PROXY_HOST:
        ext = _build_proxy_extension(PROXY_HOST, PROXY_PORT, PROXY_USER, PROXY_PASS)
        options.add_extension(ext)
    return options


from contextlib import contextmanager

@contextmanager
def get_stealth_driver(use_proxy: bool = True):
    """
    Context manager to ensure the driver is ALWAYS closed correctly.
    Usage: 
        with get_stealth_driver() as driver:
            driver.get(...)
    """
    driver = None
    try:
        driver = build_driver(use_proxy=use_proxy)
        yield driver
    finally:
        if driver:
            try:
                logger.info("Closing browser and cleaning up processes...")
                driver.quit()
            except Exception as e:
                logger.warning(f"Error while closing driver: {e}")


def build_driver(use_proxy: bool = True) -> uc.Chrome:
    """
    Return a stealthy Chrome driver.
    """
    logger.info("Starting browser initialization...")
    # Serialize driver creation to avoid Windows file-rename race condition
    with _driver_lock:
        uc_cache = os.path.join(os.path.expanduser("~"), "appdata", "roaming", "undetected_chromedriver")
        
        def try_init():
            logger.info("Creating fresh ChromeOptions...")
            opts = _get_fresh_options()
            
            is_headless = os.getenv("HEADLESS_SCRAPER", "true").lower() == "true"
            logger.info(f"Target Headless Mode: {is_headless}")

            try:
                logger.info("Attempting browser launch with version_main=147...")
                driver = uc.Chrome(options=opts, use_subprocess=False, version_main=147)
                if not driver:
                    raise Exception("uc.Chrome returned None")
                
                # Header Spoofing via CDP (TLS Fingerprinting)
                driver.execute_cdp_cmd('Network.setUserAgentOverride', {
                    "userAgent": opts.arguments[opts.arguments.index([a for a in opts.arguments if "--user-agent" in a][0])].split("=")[1]
                })
                
                logger.info("Stealth Browser object created! Verifying connection...")
                return driver
            except Exception as e:
                logger.warning(f"Browser init error: {e}")
                raise e

        try:
            return try_init()
        except Exception as e:
            logger.warning(f"Primary init failed, attempting fallback…")
            if os.path.isdir(uc_cache):
                shutil.rmtree(uc_cache, ignore_errors=True)
            time.sleep(2)
            try:
                from selenium import webdriver
                from selenium.webdriver.chrome.service import Service
                from webdriver_manager.chrome import ChromeDriverManager
                from selenium.webdriver.chrome.options import Options as ChromeOptions
                
                s_opts = ChromeOptions()
                if os.getenv("HEADLESS_SCRAPER", "true").lower() == "true":
                    s_opts.add_argument("--headless=new")
                s_opts.add_argument("--disable-gpu")
                s_opts.add_argument("--no-sandbox")
                s_opts.add_argument(f"--user-agent={ua.random}")
                
                driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=s_opts)
                logger.info("Standard Chrome fallback successful!")
                return driver
            except Exception as ex:
                logger.error(f"Critical Failure: Could not start any browser engine. {ex}")
                raise ex

# Human Delay Function
def human_delay(min_s: float = 0.8, max_s: float = 3.2):
    time.sleep(random.uniform(min_s, max_s))

# Human Scroll Function
def simulate_scroll(driver, pause: float = 0.4):
    """Scrolls the page gradually to trigger lazy-load."""
    total_height = driver.execute_script("return document.body.scrollHeight")
    viewport = driver.execute_script("return window.innerHeight")
    current = 0
    while current < total_height:
        scroll_by = random.randint(300, 700)
        driver.execute_script(f"window.scrollBy(0, {scroll_by});")
        current += scroll_by
        time.sleep(random.uniform(pause * 0.5, pause * 1.5))
    # Scroll back up slightly (more human-like)
    driver.execute_script("window.scrollBy(0, -300);")

# Random Mouse Move Function
def random_mouse_move(driver):
    """Move the mouse to a random element to avoid static-cursor detection."""
    try:
        elements = driver.find_elements(By.CSS_SELECTOR, "a, button, img")
        if elements:
            target = random.choice(elements[:20])
            ActionChains(driver).move_to_element(target).perform()
    except Exception:
        pass

# Safe Text Function
def safe_text(element, selector: str, attr: str = None) -> str:
    try:
        el = element.find_element(By.CSS_SELECTOR, selector)
        return el.get_attribute(attr).strip() if attr else el.text.strip()
    except Exception:
        return ""

# Parse Price Function
def parse_price(raw: str) -> Optional[float]:
    """Strip ₹, commas and convert to float."""
    if not raw:
        return None
    cleaned = raw.replace("₹", "").replace(",", "").replace(" ", "").strip()
    try:
        return float(cleaned)
    except ValueError:
        return None


# ─────────────────────────────────────────────────────────────────────────────
# Per-competitor scraper classes
# ─────────────────────────────────────────────────────────────────────────────

class BaseScraper:
    """All competitor scrapers extend this."""

    COMPETITOR_NAME: str = ""
    CATEGORY_URLS: list[str] = []

    def __init__(self, driver: uc.Chrome, category_urls: list = None, callback=None):
        self.driver = driver
        self.wait = WebDriverWait(driver, 15)
        self.callback = callback # Callback(product: RawProduct)
        # If dynamic URLs are provided from DB, use them instead of hardcoded defaults
        if category_urls:
            self.CATEGORY_URLS = category_urls

    def _load_page(self, url: str):
        """Load a URL with randomized delays and referral spoofing."""
        # Explicitly clear browser cache & cookies for a truly fresh load
        try:
            self.driver.execute_cdp_cmd("Network.clearBrowserCache", {})
            self.driver.execute_cdp_cmd("Network.clearBrowserCookies", {})
        except Exception:
            pass

        human_delay(2, 5)
        
        # Spoof referral from a search engine or social media
        referrers = [
            "https://www.google.com/",
            "https://www.bing.com/",
            "https://t.co/", # Twitter
            "https://www.facebook.com/",
            "https://www.instagram.com/"
        ]
        ref = random.choice(referrers)
        
        # Execute CDP commands to set headers (more stealthy than driver.get)
        self.driver.execute_cdp_cmd("Network.setExtraHTTPHeaders", {
            "headers": {
                "Referer": ref,
                "Accept-Language": "en-US,en;q=0.9",
                "Upgrade-Insecure-Requests": "1"
            }
        })
        
        logger.info(f"[{self.COMPETITOR_NAME}] Loading {url}")
        self.driver.get(url)
        human_delay(3, 6)
        simulate_scroll(self.driver)
        random_mouse_move(self.driver)
        human_delay(1, 2)

    def _handle_pagination(self, url: str, cat_name: str = "apparel") -> list:
        """Override per site. Returns list of RawProduct."""
        raise NotImplementedError

    def scrape_all_categories(self) -> list[RawProduct]:
        products = []
        for cat in self.CATEGORY_URLS:
            # Handle both string URLs and dict objects from DB
            url = cat["url"] if isinstance(cat, dict) else cat
            cat_name = cat["name"] if isinstance(cat, dict) else "unknown"
            
            try:
                logger.info(f"[{self.COMPETITOR_NAME}] Processing Category: {cat_name} -> {url}")
                self._load_page(url)
                # Pass the category name to the pagination handler
                products.extend(self._handle_pagination(url, cat_name))
            except Exception as e:
                logger.error(f"[{self.COMPETITOR_NAME}] Failed on {url}: {e}")
        return products


class WScraper(BaseScraper):
    """
    Scraper for W (wforwoman.com).
    Updated with data_variant__quantity based size extraction.
    """
    COMPETITOR_NAME = "W"
    _size_cache = {}

    def _parse_product_card(self, card, category_name: str = "apparel") -> Optional[RawProduct]:
        import re
        try:
            # ── Product URL & SKU ──────────────────────────────────────────────
            url_el = card.find_element(By.CSS_SELECTOR, "a.full-unstyled-link")
            product_url = url_el.get_attribute("href")
            
            # --- FILTER: Only accept actual product links ---
            if "/products/" not in product_url:
                return None

            sku = product_url.split("/products/")[-1].split("?")[0]

            # ── Product Name ───────────────────────────────────────────────────
            name = safe_text(card, ".card-information .card-information__text")
            if not name:
                name = safe_text(card, ".card-information a, .card-information .h5, .card__heading")

            # ── Prices ────────────────────────────────────────────────────────
            def clean_w_price(raw: str):
                if not raw:
                    return None
                cleaned = (
                    raw.replace("Rs.", "")
                       .replace("Rs", "")
                       .replace("₹", "")
                       .replace(",", "")
                       .replace("\u00a0", " ")
                       .strip()
                )
                match = re.search(r"[\d]+(?:\.\d+)?", cleaned)
                return float(match.group()) if match else None

            original_price = clean_w_price(
                safe_text(card, "div.price__regular span.price-item--regular")
            )
            current_price = clean_w_price(
                safe_text(card, "div.price__sale span.price-item--sale")
            )

            if not original_price and current_price:
                original_price = clean_w_price(
                    safe_text(card, "div.price__sale span.price-item--regular")
                )

            if not current_price and original_price:
                current_price = original_price
                original_price = None

            if not current_price:
                all_price_els = card.find_elements(By.CSS_SELECTOR, "span.price-item")
                vals = [clean_w_price(el.text) for el in all_price_els if el.text.strip()]
                vals = [v for v in vals if v]
                if vals:
                    current_price = min(vals)
                    original_price = max(vals) if len(vals) > 1 else None

            discount_pct = None
            if original_price and current_price and original_price > current_price:
                discount_pct = round((1 - current_price / original_price) * 100, 1)
            else:
                disc_match = re.search(r"-\s*(\d+)\s*%", card.text)
                if disc_match:
                    discount_pct = float(disc_match.group(1))

            # ── Bestseller Badge ───────────────────────────────────────────────
            try:
                badge_el = card.find_element(By.CSS_SELECTOR, "div.card__badge, .badge")
                is_bestseller = any(
                    kw in badge_el.text.lower() for kw in ["bestseller", "trending", "hot"]
                )
            except Exception:
                is_bestseller = False

            # ── Image ──────────────────────────────────────────────────────────
            try:
                img_el = card.find_element(
                    By.CSS_SELECTOR, "div.card__media img, .media img, img"
                )
                img_url = (
                    img_el.get_attribute("src")
                    or img_el.get_attribute("data-src")
                    or img_el.get_attribute("srcset")
                    or img_el.get_attribute("data-srcset")
                    or ""
                )
                
                # If it's a srcset, take the first URL
                if img_url and (" " in img_url or "," in img_url):
                    img_url = img_url.split(",")[0].split(" ")[0]

                if img_url.startswith("//"):
                    img_url = "https:" + img_url
            except Exception:
                img_url = ""

            # ── UPDATED SIZE + STOCK LOGIC (PDP FETCH) ─────────────────────
            sizes = {}
            if product_url:
                try:
                    # Use the client's logic to fetch exact quantities from PDP
                    # This provides the "X left" numbers for every size
                    # Small delay to avoid 429 rate limiting on PDP pages
                    time.sleep(random.uniform(1.0, 3.0))
                    sizes = extract_size_quantities(product_url)
                except Exception as e:
                    logger.debug(f"[W] PDP size fetch error for {sku}: {e}")

            # ── Final Stock Check ──────────────────────────────────────────────
            is_sold_out_badge = False
            try:
                badge_el = card.find_element(
                    By.CSS_SELECTOR, ".badge--sold-out, .sold-out-label"
                )
                if "sold out" in badge_el.text.lower():
                    is_sold_out_badge = True
            except Exception:
                pass

            if sizes:
                # ── KEY FIX: Trust PDP size data over the grid badge ───────────
                # If the product page says it's available, it IS available.
                stock_available = any(s.get("is_available", False) for s in sizes.values())
            elif is_sold_out_badge:
                stock_available = False
            else:
                stock_available = not any(
                    kw in card.text.lower()
                    for kw in ["sold out", "out of stock"]
                )

            # Fallback if no sizes were extracted (e.g., PDP fetch failed)
            if not sizes:
                sizes = {
                    "ALL": {
                        "quantity": 0,
                        "is_available": stock_available,
                        "disclosed": False
                    }
                }

            return RawProduct(
                sku=sku,
                name=name,
                category=category_name,
                current_price=current_price,
                original_price=original_price,
                discount_pct=discount_pct,
                stock_available=stock_available,
                is_bestseller=is_bestseller,
                image_url=img_url,
                product_url=product_url,
                sizes=sizes,
            )

        except Exception as e:
            logger.warning(f"[W] Card parse error: {e}")
            return None

    def _handle_pagination(self, url: str, cat_name: str = "apparel") -> list[RawProduct]:
        is_bs_url = "bestseller" in url.lower() or "bestseller" in cat_name.lower()
        is_new_url = "new" in url.lower()

        # Support starting from a specific page (e.g. to resume after a crash)
        start_page = int(os.getenv("SCRAPE_START_PAGE", "1"))
        if start_page > 1:
            sep = "&" if "?" in url else "?"
            url = f"{url}{sep}page={start_page}"
            logger.info(f"[W] Resuming from Page {start_page} via URL: {url}")
            self.driver.get(url)
            human_delay(3, 6)

        logger.info(f"[W] Starting Page-by-Page scraping for {cat_name} from Page {start_page}...")

        products = []
        seen_skus = set()
        page_attempt = start_page
        max_pages = 100

        while page_attempt <= max_pages:
            cards = self.driver.find_elements(
                By.CSS_SELECTOR,
                ".card-wrapper, .grid__item, .product-item, .product-card"
            )

            new_on_page = 0

            for card in cards:
                try:
                    parsed = self._parse_product_card(card, category_name=cat_name)

                    if parsed and parsed.sku and parsed.sku not in seen_skus:
                        if is_bs_url:
                            parsed.is_bestseller = True
                        if is_new_url:
                            parsed.is_new_launch = True

                        seen_skus.add(parsed.sku)
                        products.append(parsed)
                        new_on_page += 1

                        if self.callback:
                            self.callback(parsed)
                        
                        logger.info(f"[W] Processed {new_on_page}/{len(cards)}: {parsed.sku} ({parsed.name[:20]}...)")

                except Exception as e:
                    logger.warning(f"[W] Failed to process a card: {e}")
                    continue

            logger.info(
                f"[W] Page {page_attempt}: Found {len(cards)} cards, processed {new_on_page} new."
            )

            # Pagination (Show More)
            try:
                self.driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
                time.sleep(random.uniform(1.5, 2.5))

                load_more = self.driver.find_elements(By.ID, "load-more-btn")
                if not load_more or not load_more[0].is_displayed():
                    load_more = self.driver.find_elements(
                        By.CSS_SELECTOR, ".load-more-btn, .pagination__more"
                    )

                if load_more and load_more[0].is_displayed():
                    logger.info(f"[W] Clicking SHOW MORE ({page_attempt})")
                    self.driver.execute_script("arguments[0].scrollIntoView();", load_more[0])
                    time.sleep(1)
                    self.driver.execute_script("arguments[0].click();", load_more[0])

                    human_delay(3, 5)
                    page_attempt += 1

                    if page_attempt % 3 == 0:
                        random_mouse_move(self.driver)
                else:
                    logger.info("[W] No more 'SHOW MORE'. Done.")
                    break

            except Exception as e:
                logger.info(f"[W] Pagination end: {e}")
                break

        logger.info(f"[W] Finished scrape. Total products: {len(products)}")
        return products

class AureliaScraper(BaseScraper):
    """
    Scraper for Aurelia (aurelia.in).
    """
    COMPETITOR_NAME = "Aurelia"

    def _parse_product_card(self, card, category_name: str = "apparel") -> Optional[RawProduct]:
        import re
        try:
            # ── Product URL & SKU ──────────────────────────────────────────────
            url_el = card.find_element(By.CSS_SELECTOR, "a.product-title, a.card-title, a")
            product_url = url_el.get_attribute("href")
            sku = product_url.split("/products/")[-1].split("?")[0] if "/products/" in product_url else product_url

            # ── Product Name ───────────────────────────────────────────────────
            name = safe_text(card, ".card-information__text, h3, .h4")
            
            # ── Prices ────────────────────────────────────────────────────────
            def clean_price(raw: str) -> Optional[float]:
                if not raw: return None
                match = re.search(r"[\d,]+(?:\.\d+)?", raw)
                if match:
                    return float(match.group().replace(",", ""))
                return None

            # Standard Shopify Price Items found in inspection
            current_price = clean_price(safe_text(card, ".price__sale .price-item--sale"))
            original_price = clean_price(safe_text(card, ".price__sale .price-item--regular"))
            
            if not current_price:
                current_price = clean_price(safe_text(card, "span.price-item--regular"))
            
            # If sale price is missing, use regular as current
            if not current_price and original_price:
                current_price = original_price
                original_price = None

            # ── Discount % ────────────────────────────────────────────────────
            discount_pct = None
            if original_price and current_price and original_price > current_price:
                discount_pct = round((1 - current_price / original_price) * 100, 1)

            # ── Image ──────────────────────────────────────────────────────────
            try:
                img_el = card.find_element(By.CSS_SELECTOR, ".card__media img, img")
                img_url = img_el.get_attribute("src") or img_el.get_attribute("data-src") or ""
                if img_url.startswith("//"): img_url = "https:" + img_url
            except Exception:
                img_url = ""

            # ── Badges ────────────────────────────────────────────────────────
            stock_available = "sold out" not in card.text.lower()
            is_bestseller = "bestseller" in card.text.lower()

            return RawProduct(
                sku=sku, name=name, category=category_name,
                current_price=current_price, original_price=original_price,
                discount_pct=discount_pct, stock_available=stock_available,
                is_bestseller=is_bestseller, image_url=img_url, product_url=product_url,
            )
        except Exception as e:
            logger.debug(f"[Aurelia] Card parse error: {e}")
            return None

    def _handle_pagination(self, url: str, cat_name: str = "apparel") -> list[RawProduct]:
        """Handle 'Show More' style pagination for Aurelia."""
        is_bs_url = "bestseller" in url.lower() or "bestseller" in cat_name.lower()
        # Wait for initial load - Verified from CSS
        try:
            self.wait.until(EC.presence_of_element_located((
                By.CSS_SELECTOR, 
                ".product-grid, .grid, .card-wrapper"
            )))
        except Exception:
            logger.warning("[Aurelia] Initial grid not found with CSS selectors")
            return []

        # Keep pagination up to 5 pages
        # Pagination - keep going as long as Show More is present
        page_attempt = 1
        while True:
            try:
                show_more = self.driver.find_element(By.ID, "ShowMoreBtn")
                if not show_more.is_displayed():
                    break
                
                logger.info(f"[Aurelia] Clicking Show More (Attempt {page_attempt})...")
                self.driver.execute_script("arguments[0].scrollIntoView();", show_more)
                human_delay(1, 2)
                show_more.click()
                human_delay(3, 5) # Wait for new items to load
                page_attempt += 1
            except Exception:
                logger.info("[Aurelia] No more 'Show More' button found.")
                break

        # Final grab of all cards - Verified .card-wrapper from CSS
        cards = self.driver.find_elements(
            By.CSS_SELECTOR, 
            ".card-wrapper, .grid__item"
        )
        logger.info(f"[Aurelia] Total products found: {len(cards)}")
        
        products = []
        is_new_url = "new" in url.lower()
        for card in cards:
            parsed = self._parse_product_card(card, category_name=cat_name)
            if parsed and parsed.name:
                if is_bs_url: parsed.is_bestseller = True
                if is_new_url: parsed.is_new_launch = True
                products.append(parsed)
                if self.callback:
                    self.callback(parsed)
                
        return products


class GlobalDesiScraper(BaseScraper):
    """
    Scraper for Global Desi (global-desi.com).
    """
    COMPETITOR_NAME = "Global Desi"

    def _parse_product_card(self, card, category_name: str = "apparel") -> Optional[RawProduct]:
        import re
        try:
            url_el = card.find_element(By.CSS_SELECTOR, "a")
            product_url = url_el.get_attribute("href")
            sku = product_url.split("/products/")[-1].split("?")[0] if "/products/" in product_url else product_url

            name = safe_text(card, ".product-title, .card-information__text, h3")
            
            def clean_price(raw: str) -> Optional[float]:
                if not raw: return None
                match = re.search(r"[\d,]+(?:\.\d+)?", raw)
                if match:
                    return float(match.group().replace(",", ""))
                return None

            current_price = clean_price(safe_text(card, ".price-item--sale, .price--sale"))
            original_price = clean_price(safe_text(card, ".price-item--regular, .price--regular"))
            
            if not current_price:
                current_price = clean_price(safe_text(card, "span.price-item"))

            discount_pct = None
            if original_price and current_price and original_price > current_price:
                discount_pct = round((1 - current_price / original_price) * 100, 1)

            try:
                img_el = card.find_element(By.CSS_SELECTOR, "img")
                img_url = img_el.get_attribute("src") or img_el.get_attribute("data-src") or ""
                if img_url.startswith("//"): img_url = "https:" + img_url
            except Exception:
                img_url = ""

            try:
                badge = card.find_element(By.CSS_SELECTOR, ".badge, .label").text.lower()
                is_bestseller = "bestseller" in badge or "trending" in badge
            except Exception:
                is_bestseller = False

            stock_available = "sold out" not in card.text.lower()

            return RawProduct(
                sku=sku, name=name, category=category_name,
                current_price=current_price, original_price=original_price,
                discount_pct=discount_pct, stock_available=stock_available,
                is_bestseller=is_bestseller, image_url=img_url, product_url=product_url,
            )
        except Exception as e:
            logger.debug(f"[Global Desi] Card parse error: {e}")
            return None

    def _handle_pagination(self, url: str, cat_name: str = "apparel") -> list[RawProduct]:
        is_bs_url = "bestseller" in url.lower() or "bestseller" in cat_name.lower()
        is_new_url = "new" in url.lower()
        products = []
        page = 1
        while True:
            cards = self.driver.find_elements(By.CSS_SELECTOR, "li.grid__item, .product-item, .product-card")
            logger.info(f"[Global Desi] Page {page} — {len(cards)} cards found")
            for card in cards:
                parsed = self._parse_product_card(card, category_name=cat_name)
                if parsed and parsed.name:
                    if is_bs_url: parsed.is_bestseller = True
                    if is_new_url: parsed.is_new_launch = True
                    products.append(parsed)
                    if self.callback:
                        self.callback(parsed)

            try:
                next_btn = self.driver.find_element(By.CSS_SELECTOR, "a[rel='next'], .pagination__next")
                next_url = next_btn.get_attribute("href")
                if not next_url:
                    break
                self._load_page(next_url)
                page += 1
            except Exception:
                break
        return products


# Registry — add new scrapers here
SCRAPER_REGISTRY: dict[str, type[BaseScraper]] = {
    "W": WScraper,
    "Aurelia": AureliaScraper,
    "Global Desi": GlobalDesiScraper,
}
