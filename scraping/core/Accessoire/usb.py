from scraping.spiders.USB import USBFlashDriveJumia
from scraping.spiders.USB import USBFlashDriveAmazon
from scraping.spiders.USB import USBFlashDriveAliexpress
from scraping.core.cleaner import remove_duplicates

def scrape_usb_jumia(query):
    scraper = USBFlashDriveJumia()
    products = scraper.scrape(query, max_pages=10)
    return remove_duplicates(products)



def scrape_usb_amazon(query):
    scraper = USBFlashDriveAmazon()
    products = scraper.scrape(query, max_pages=10) 
    return remove_duplicates(products)


def scrape_usb_aliexpress(query):
    scraper = USBFlashDriveAliexpress()
    products = scraper.scrape(query, max_pages=10) 
    return remove_duplicates(products)