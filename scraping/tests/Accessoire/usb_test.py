import concurrent.futures

# --- Imports des classes de Scraping (adapte les chemins selon ton projet) ---
from scraping.spiders.USB import USBFlashDriveJumia
from scraping.spiders.USB import USBFlashDriveAmazon
from scraping.spiders.USB import USBFlashDriveAliexpress

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
        return cleaned_results, source_name
    except Exception as e:
        print(f"❌ [{source_name}] Erreur durant le scraping : {e}")
        return [], source_name

def test_full_parallel_search():
    query = "usb_flash_drive"
    pages_to_scrape = 15
    
    print("=" * 60)
    print(f"Lancement du scraping PARALLÈLE pour : {query}")
    print("=" * 60)

    scrapers = [
        USBFlashDriveJumia(),
        USBFlashDriveAmazon(),
        USBFlashDriveAliexpress()
    ]

    all_products = []
    
    # On instancie la connexion à la base de données UNE SEULE FOIS avant la boucle
    db = MySQLWriter() 

    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
        # On garde une référence au scraper dans le dictionnaire futures
        futures = {
            executor.submit(run_scraper, scraper, query, pages_to_scrape): scraper 
            for scraper in scrapers
        }
        
        # as_completed s'active DÈS QU'UN scraper a terminé
        for future in concurrent.futures.as_completed(futures):
            scraper = futures[future] # Récupération de l'objet scraper
            results, source_name = future.result()
            
            if results:
                # 1. On garde une trace pour l'affichage final
                all_products.extend(results)
                
                # 2. ON INSÈRE DIRECTEMENT EN BASE DE DONNÉES
                print(f"\n⏳ [{source_name}] Lancement de l'insertion dans MySQL...")
                try:
                    db.insert_accessories(results) 
                    print(f"✔ [{source_name}] Insertion en base de données réussie !")
                except Exception as e:
                    print(f"❌ [{source_name}] Erreur lors de l'insertion DB : {e}")

                # 3. EXPORT CSV IMMÉDIAT
                print(f"⏳ [{source_name}] Lancement de l'export CSV...")
                try:
                    # Appelle la fonction export_to_csv spécifique à chaque classe
                    scraper.export_to_csv(results)
                except Exception as e:
                    print(f"❌ [{source_name}] Erreur lors de l'export CSV : {e}")

    # Résumé final
    print("=" * 60)
    print(f"🏁 Scraping terminé ! Total global récupéré : {len(all_products)} produits.")
    print("=" * 60)

if __name__ == "__main__":
    test_full_parallel_search()