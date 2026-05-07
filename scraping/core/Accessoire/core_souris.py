from scraping.spiders.souris.souris_jumia import SourisJumiaScraper
from scraping.spiders.souris.souris_amazon import SourisAmazonScraper
from scraping.spiders.souris.souris_aliex import SourisAliexpressScraper
from scraping.core.cleaner import remove_duplicates

def scrape_souris_jumia(query):
    scraper = SourisJumiaScraper()
    products = scraper.scrape(query, max_pages=10)
    return remove_duplicates(products)



def scrape_souris_amazon(query):
    scraper = SourisAmazonScraper()
    products = scraper.scrape(query, max_pages=10) 
    return remove_duplicates(products)


def scrape_aliexpress_product(query):
    scraper = SourisAliexpressScraper()
    products = scraper.scrape(query, max_pages=10) 
    return remove_duplicates(products)