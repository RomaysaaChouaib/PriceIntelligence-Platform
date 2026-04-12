from scraping.spiders.jumia import scrape_jumia
from scraping.spiders.amazon import scrape_amazon
from scraping.spiders.avito import scrape_avito
from scraping.spiders.ebay import scrape_ebay

def scrape_product(query):
    """Agrège les résultats des différents spiders dans une seule liste"""
    results = []

    try:
        results.extend(scrape_jumia(query))
    except Exception as e:
        print("Erreur Jumia:", e)

    try:
        results.extend(scrape_amazon(query))
    except Exception as e:
        print("Erreur Amazon:", e)

    try:
        results.extend(scrape_avito(query))
    except Exception as e:
        print("Erreur Avito:", e)

    try:
        results.extend(scrape_ebay(query))
    except Exception as e:
        print("Erreur Ebay:", e)

    return results
