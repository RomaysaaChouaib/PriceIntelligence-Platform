from scraping.spiders.Sac import SacLaptopJumiaScraper
from scraping.spiders.Sac import SacLaptopAmazonScraper
from scraping.spiders.Sac import SacLaptopAliexpressScraper

from scraping.core.cleaner import remove_duplicates

def scrape_sac_jumia(query):
    scraper = SacLaptopJumiaScraper()
    products = scraper.scrape(query, max_pages=15)
    return remove_duplicates(products)



def scrape_sac_amazon(query):
    scraper = SacLaptopAmazonScraper()
    products = scraper.scrape(query, max_pages=15) 
    return remove_duplicates(products)


def scrape_sac_aliexpress(query):
    scraper = SacLaptopAliexpressScraper()
    products = scraper.scrape(query, max_pages=15) 
    return remove_duplicates(products)