from scraping.spiders.amazon import AmazonScraper
from scraping.core.cleaner import remove_duplicates

def scrape_amazon_product(query):
    """
    Fonction principale pour scraper Amazon et nettoyer les doublons.
    """
    scraper = AmazonScraper()
    
    # Attention : Ton AmazonScraper attend une liste de mots-clés (queries).
    # Donc on transforme la variable 'query' (chaîne de caractères) en liste : [query]
    products = scraper.scrape(query, max_pages=10) 
    
    # On retourne les produits après avoir enlevé les doublons
    return remove_duplicates(products)