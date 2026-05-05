# Import de la classe AliexpressScraper (adapte le chemin selon ta structure)
from scraping.core.scraper_aliex import AliexpressScraper 

# Import pour la database
from scraping.db.mysql_writer import MySQLWriter

def test_full_search():
    query = "laptop"

    print(f"🚀 Lancement du test de scraping AliExpress pour : {query}")
    print("=" * 50)

    # 1. Instancier le scraper
    scraper = AliexpressScraper()

    # 2. Lancer le scraping (j'ai mis max_pages=2 pour tester plus vite)
    results = scraper.scrape(query, max_pages=9)

    print("-" * 50)
    print(f"📦 Nombre total de produits trouvés : {len(results)}")
    print("-" * 50)

    # 3. Affichage des 10 premiers résultats avec les nouveaux champs (price et old_price)
    for p in results[:10]:
        print(f"[{p.get('source', 'AliExpress')}] (Query: {p.get('search_query')} | Page: {p.get('page')})")
        print(f" {p.get('brand')} - {p.get('title')[:50]}...")
        print(f" 💰 Prix actuel: {p.get('price')} {p.get('currency')} | Ancien prix: {p.get('old_price')} {p.get('currency')}")
        print(f" 🔗 Lien: {p.get('link')[:60]}...")
        print("-" * 20)

    # 4. EXPORTATION EN CSV 
    if results:
        scraper.export_to_csv(results, "test_aliexpress_laptops.csv")
    else:
        print("⚠️ Aucun résultat à exporter.")

    # 5. SAUVEGARDE DANS MYSQL (AVEC MISE À JOUR DES PRIX)
    if results:
        print("💾 Envoi des données vers MySQL...")
        db = MySQLWriter()
        # C'est cette méthode qui va gérer l'insertion OU la mise à jour
        db.insert_products(results) 
        print("✅ Données sauvegardées et prix mis à jour avec succès !")

if __name__ == "__main__":
    test_full_search()