from scraping.spiders.jumia import JumiaScraper
from scraping.core.cleaner import remove_duplicates

def scrape_product(query):
    scraper = JumiaScraper()
    products = scraper.scrape(query, max_pages=22)
    return remove_duplicates(products)