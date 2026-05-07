from scraping.spiders.cooling_pad import CoolingPadJumia
from scraping.spiders.cooling_pad import  CoolingPadAmazon
from scraping.spiders.cooling_pad import CoolingPadAliexpress


from scraping.core.cleaner import remove_duplicates

def scrape_cooling_pad_jumia(query):
    scraper = CoolingPadJumia()
    products = scraper.scrape(query, max_pages=10)
    return remove_duplicates(products)



def scrape_cooling_pad_amazon(query):
    scraper = CoolingPadAmazon()
    products = scraper.scrape(query, max_pages=10) 
    return remove_duplicates(products)


def scrape_cooling_pad_aliex(query):
    scraper = CoolingPadAliexpress()
    products = scraper.scrape(query, max_pages=10) 
    return remove_duplicates(products)