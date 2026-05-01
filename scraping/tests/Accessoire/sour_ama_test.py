# Import de la classe AmazonScraper (adaptez le chemin d'import selon votre structure)
from scraping.core.Accessoire.souris_amazon import SourisAmazonScraper
# Import pour la database
from scraping.db.mysql_writer import MySQLWriter

def test_full_search():
    query = "souris"

    print(f"Lancement du test de scraping Amazon pour : {query}")
    print("=" * 50)

    # 1. Instancier le scraper
    scraper = SourisAmazonScraper()

    # 2. Lancer le scraping (le résultat est une liste de dictionnaires)
    # Limitation à max_pages=2 pour les tests rapides
    results = scraper.scrape(query, max_pages=7)

    print("-" * 50)
    print(f"Nombre total de produits uniques trouvés : {len(results)}")
    print("-" * 50)

    # 3. Affichage des 10 premiers résultats pour vérification
    for p in results[:10]:
        print(f"[{p['source']}] (Query: {p['search_query']} | Page: {p['page']})")
        print(f" {p['brand']} - {p['title'][:60]}... ")
        print(f" Prix: {p['price']} € | Ancien prix: {p['old_price']}")
        print(f" Gaming: {'Oui' if p['is_gaming'] else 'Non'} | Lien: {p['link'][:60]}...")
        print("-" * 20)

    # 4. Traitement et Export
    if results:
        # EXPORT CSV
        csv_filename = "resultats_amazon_souris.csv"
        scraper.export_to_csv(results, csv_filename)
        print(f"✔ Export CSV réussi dans : {csv_filename}")
        
        # 5. SAUVEGARDE MYSQL (Appel de votre fonction)
        print("Lancement de l'insertion dans MySQL...")
        try:
            db = MySQLWriter()
            db.insert_accessories(results) 
        except Exception as e:
            print(f"Erreur lors de l'insertion en base de données : {e}")
    else:
        print("Aucun résultat à exporter.")

if __name__ == "__main__":
    test_full_search()