from scraping.spiders.StandLaptop import LaptopStandJumia
from scraping.spiders.StandLaptop import LaptopStandAmazon
from scraping.spiders.StandLaptop import LaptopStandAliexpress


from scraping.core.cleaner import remove_duplicates

def scrape_stand_laptop_jumia(query):
    scraper = LaptopStandJumia()
    products = scraper.scrape(query, max_pages=10)
    return remove_duplicates(products)



def scrape_stand_laptop_amazon(query):
    scraper = LaptopStandAmazon()
    products = scraper.scrape(query, max_pages=10) 
    return remove_duplicates(products)


def scrape_stand_laptop_aliex(query):
    scraper = LaptopStandAliexpress()
    products = scraper.scrape(query, max_pages=10) 
    return remove_duplicates(products)