import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
import time
import os

def main():
    opts = uc.ChromeOptions()
    opts.add_argument('--headless')
    driver = uc.Chrome(options=opts, version_main=147)
    try:
        driver.get('https://www.wforwoman.com/collections/new')
        time.sleep(15)
        cards = driver.find_elements(By.CSS_SELECTOR, '.card-wrapper, .grid__item')
        if cards:
            content = cards[0].get_attribute('outerHTML')
            with open('card_sample.html', 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Success: Found {len(cards)} cards. Sample saved to card_sample.html")
        else:
            print("No cards found")
    finally:
        driver.quit()

if __name__ == "__main__":
    main()
