import sys
import os
import time

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import undetected_chromedriver as uc
from selenium.webdriver.common.by import By

def inspect():
    options = uc.ChromeOptions()
    options.add_argument("--headless")
    driver = uc.Chrome(options=options, version_main=147)
    try:
        driver.get("https://www.globaldesi.in/new-arrivals")
        time.sleep(5)
        
        cards = driver.find_elements(By.CSS_SELECTOR, ".product-tile")
        print(f"Found {len(cards)} cards.")
        
        if cards:
            card = cards[0]
            try:
                img = card.find_element(By.CSS_SELECTOR, ".product-tile__anchor img")
                print("--- IMG HTML ---")
                print(img.get_attribute("outerHTML").encode('utf-8'))
                print("----------------")
            except Exception as e:
                print(f"Failed to find image: {e}")
            
    finally:
        driver.quit()

if __name__ == "__main__":
    inspect()
