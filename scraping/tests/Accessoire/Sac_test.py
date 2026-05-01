import concurrent.futures

# --- Imports des classes de Scraping (adapte les chemins selon ton projet) ---
from scraping.spiders.Sac import SacLaptopJumiaScraper
from scraping.spiders.Sac import SacLaptopAmazonScraper
from scraping.spiders.Sac import SacLaptopAliexpressScraper

# --- Import du cleaner et de la DB ---
from scraping.core.cleaner import remove_duplicates
from scraping.db.mysql_writer import MySQLWriter

def run_scraper(scraper, query, max_pages):
    """
    Fonction wrapper exécutée par chaque thread.
    Lance le scraping, nettoie les doublons et retourne les résultats.
    """
    source_name = getattr(scraper, 'source_name', type(scraper).__name__)
    print(f"🚀 [{source_name}] Lancement du scraping...")
    
    try:
        raw_results = scraper.scrape(query, max_pages=max_pages)
        cleaned_results = remove_duplicates(raw_results)
        print(f"✅ [{source_name}] Terminé : {len(cleaned_results)} produits uniques.")
        return cleaned_results, source_name # On retourne aussi le nom pour l'affichage
    except Exception as e:
        print(f"❌ [{source_name}] Erreur durant le scraping : {e}")
        return [], source_name

def test_full_parallel_search():
    query = "sac_laptop"
    pages_to_scrape = 7
    
    print("=" * 60)
    print(f"Lancement du scraping PARALLÈLE pour : {query}")
    print("=" * 60)

    scrapers = [
        SacLaptopJumiaScraper(),
        SacLaptopAmazonScraper(),
        SacLaptopAliexpressScraper()
    ]

    all_products = []
    
    # On instancie la connexion à la base de données UNE SEULE FOIS avant la boucle
    db = MySQLWriter() 

    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
        futures = {
            executor.submit(run_scraper, scraper, query, pages_to_scrape): scraper 
            for scraper in scrapers
        }
        
        # as_completed s'active DÈS QU'UN scraper a terminé
        for future in concurrent.futures.as_completed(futures):
            results, source_name = future.result()
            
            if results:
                # 1. On garde une trace pour l'affichage final
                all_products.extend(results)
                
                # 2. ON INSÈRE DIRECTEMENT EN BASE DE DONNÉES (sans attendre les autres)
                print(f"\n⏳ [{source_name}] Lancement de l'insertion dans MySQL...")
                try:
                    db.insert_accessories(results) 
                    print(f"✔ [{source_name}] Insertion en base de données réussie ! ({len(results)} produits)")
                except Exception as e:
                    print(f"❌ [{source_name}] Erreur lors de l'insertion BD : {e}")

    # --- La suite s'exécute quand tout est totalement fini ---
    print("\n" + "=" * 60)
    print(f"🌟 SCRAPING COMPLET - Nombre TOTAL de produits collectés : {len(all_products)}")
    print("=" * 60)

    # Affichage de vérification
    for p in all_products[:5]:
        print(f"[{p.get('source', 'Inconnu')}] {p.get('brand', 'N/A')} - {p.get('title', '')[:50]}... ")
        print(f" Prix: {p.get('price')} {p.get('currency', 'EUR')} | Lien: {p.get('link', '')[:40]}...")
        print("-" * 40)

if __name__ == "__main__":
    test_full_parallel_search()