import json
from scraping.spiders.souris.souris_aliex import SourisAliexpressScraper
# Import pour la database
from scraping.db.mysql_writer import MySQLWriter

def run_test():
    # On donne le mot de base, le scraper s'occupe de la liste !
    base_keyword = "souris"
    
    print(f"🚀 Lancement du test de scraping AliExpress pour : {base_keyword}")
    print("=" * 50)
    
    # 1. Instancier le scraper
    scraper = SourisAliexpressScraper()
    
    # 2. Lancer le scraping
    # max_pages=10 (AliExpress peut bloquer avant, c'est normal)
    results = scraper.scrape(base_keyword, max_pages=6)
    
    print("-" * 50)
    print(f"Nombre total de produits uniques trouvés : {len(results)}")
    print("-" * 50)
    
    if results:
        # 3. Affichage des 5 premiers résultats pour vérification (plus lisible que le JSON pur)
        for p in results[:5]:
            print(f"[{p.get('source', 'AliExpress')}] (Query: {p.get('search_query', 'N/A')} | Page: {p.get('page', 1)})")
            print(f" {p.get('brand', 'Inconnu')} - {p.get('title', '')[:60]}... ")
            print(f" Prix: {p.get('price', 0)} {p.get('currency', 'EUR')} | Ancien prix: {p.get('old_price', 'N/A')}")
            print(f" Gaming: {'Oui' if p.get('is_gaming') else 'Non'} | Lien: {p.get('link', '')[:60]}...")
            print("-" * 20)
            
        # 4. EXPORT CSV 
        csv_filename = "resultats_aliexpress.csv"
        scraper.export_to_csv(results, filename=csv_filename) # Assure-toi que le nom d'argument correspond à ta méthode
        print(f"✔ Export CSV réussi dans : {csv_filename}")
        
        # 5. SAUVEGARDE MYSQL
        print("Lancement de l'insertion dans MySQL...")
        try:
            db = MySQLWriter()
            db.insert_accessories(results) 
            print("✅ Insertion en base de données terminée avec succès !")
        except Exception as e:
            print(f"❌ Erreur lors de l'insertion en base de données : {e}")
            
        print(f"\n✅ Terminé ! {len(results)} produits traités.")
    else:
        print(json.dumps({"error": "Aucun résultat trouvé. AliExpress a peut-être bloqué la requête."}, indent=4, ensure_ascii=False))

if __name__ == "__main__":
    run_test()