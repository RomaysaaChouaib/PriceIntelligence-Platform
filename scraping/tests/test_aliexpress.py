import json
from scraping.spiders.aliexpress import AliexpressScraper

def run_test():
    # On donne le mot de base, le scraper s'occupe de la liste !
    base_keyword = "laptop"
    
    scraper = AliexpressScraper()
    
    print("🚀 Lancement du scraper furtif AliExpress (DrissionPage)...")
    
    # max_pages=20 (AliExpress peut bloquer avant, c'est normal)
    results = scraper.scrape(base_keyword, max_pages=10)
    
    if results:
        # Affichage du JSON pur dans le terminal (les 5 premiers pour ne pas polluer)
        print(json.dumps(results[:5], indent=4, ensure_ascii=False)) 
        
        # Export CSV 
        scraper.export_to_csv(results)
        print(f"\n✅ Terminé ! {len(results)} produits trouvés sur AliExpress et sauvegardés dans 'resultats_aliexpress.csv'.")
    else:
        print(json.dumps({"error": "Aucun résultat trouvé. AliExpress a peut-être bloqué la requête."}, indent=4, ensure_ascii=False))

if __name__ == "__main__":
    run_test()