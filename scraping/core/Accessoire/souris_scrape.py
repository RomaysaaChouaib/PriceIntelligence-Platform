from scraping.spiders.souris.souris_jumia import SourisJumiaScraper
from scraping.core.cleaner import remove_duplicates

def scrape_product(query):
    scraper = SourisJumiaScraper()
    products = scraper.scrape(query, max_pages=22)
    return remove_duplicates(products)