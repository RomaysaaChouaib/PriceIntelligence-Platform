from scraping.spiders.aliexpress import AliexpressScraper
from scraping.core.cleaner import remove_duplicates

def scrape_aliexpress_product(query):
    """
    Fonction principale pour scraper AliExpress et nettoyer les doublons.
    """
    scraper = AliexpressScraper()
    
    # Contrairement à votre scraper Amazon, votre AliexpressScraper actuel 
    # gère directement les chaînes de caractères (string) via sa méthode generate_queries.
    # On peut donc lui passer 'query' directement sans le mettre dans une liste.
    products = scraper.scrape(query, max_pages=20) 
    
    # On retourne les produits après avoir enlevé les doublons
    return remove_duplicates(products)