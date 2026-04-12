from scraping.core.scraper import scrape_product

def test_scraper():
    data = scrape_product("pc portable")
    for item in data:
        print(item)

if __name__ == "__main__":
    test_scraper()
