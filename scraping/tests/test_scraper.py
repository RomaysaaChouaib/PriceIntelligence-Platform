# Import de la classe JumiaScraper (adaptez le chemin d'import selon votre structure)
from scraping.core.scraper import JumiaScraper 
# pour database :
from scraping.db.mysql_writer import MySQLWriter
def test_full_search():
    query = "laptop"

    print(f"Lancement du test de scraping Jumia pour : {query}")
    print("=" * 50)

    # 1. Instancier le scraper
    scraper = JumiaScraper()

    # 2. Lancer le scraping (le résultat est une liste de dictionnaires)
    results = scraper.scrape(query)

    print("-" * 50)
    print(f"Nombre total de produits uniques trouvés : {len(results)}")
    print("-" * 50)

    # 3. Affichage des 10 premiers résultats avec les nouveaux champs
    for p in results[:10]:
        print(f"[{p['source']}] (Query: {p['search_query']} | Page: {p['page']})")
        print(f" {p['brand']} - {p['title']} : {p['price']} MAD")
        print(f" Lien: {p['link'][:60]}...")
        print("-" * 20)

    # 4. EXPORTATION EN CSV (La nouvelle fonctionnalité)
    if results:
        scraper.export_to_csv(results, "resultats_jumia_laptops.csv")
    else:
        print("Aucun résultat à exporter.")
    # 3. SAVE TO MYSQL
    db = MySQLWriter()
    db.insert_products(results)
    print("Data saved to MySQL successfully!")
    
if __name__ == "__main__":
    test_full_search()