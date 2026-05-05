from celery import shared_task
from django.core.cache import cache
# ── Scraping ───────────────────────────────────────────────────────
from scraping.db.mysql_writer import MySQLWriter
from concurrent.futures import ThreadPoolExecutor, as_completed
######### Jumia ##################
from scraping.core.scraper import scrape_product
########## Amazon ##################
from scraping.core.scraper_amazon import scrape_amazon_product, AmazonScraper
############ Aliexpress ############
from scraping.core.scraper_aliex import AliexpressScraper

@shared_task(bind=True)
def scrape_jumia_task(self, query):
    # On réinitialise le stop au début de la tâche
    cache.set("STOP_SCRAPING", False)
    
    db = MySQLWriter()
    try:
        # Exécution de votre fonction habituelle
        products = scrape_product(query)
        
        # Vérification du STOP via le cache
        if cache.get("STOP_SCRAPING"):
            db.close()
            return {"status": "stopped", "message": "Interrompu"}

        inserted = 0
        if products:
            db.insert_products(products)
            inserted = len(products)
            
        db.close()
        return {"status": "success", "inserted": inserted}
        
    except Exception as e:
        if 'db' in locals(): db.close()
        return {"status": "error", "error": str(e)}
    

@shared_task(bind=True)
def scrape_all_task(self, query):
    # On réinitialise le cache au début de la tâche
    cache.set("STOP_SCRAPING", False)
    
    db = MySQLWriter()
    results = {"jumia": [], "amazon": [], "aliexpress": []}
    errors = []
    total_inserted = 0

    try:
        # On lance les 3 scrapers en parallèle
        with ThreadPoolExecutor(max_workers=3) as executor:
            futures = {
                executor.submit(scrape_product, query): "jumia",
                executor.submit(scrape_amazon_product, query): "amazon",
                executor.submit(lambda q: AliexpressScraper().scrape(q, max_pages=20), query): "aliexpress",
            }

            for future in as_completed(futures):
                source = futures[future]
                
                # --- VÉRIFICATION DU STOP VIA LE CACHE ---
                if cache.get("STOP_SCRAPING"):
                    errors.append(f"Interruption : Les données de {source} ont été ignorées.")
                    continue 
                # -----------------------------------------

                try:
                    data = future.result()
                    
                    if data:
                        results[source] = data
                        
                        # Deuxième vérification juste avant l'écriture MySQL
                        if not cache.get("STOP_SCRAPING"):
                            try:
                                db.insert_products(data)
                                total_inserted += len(data)
                                print(f"✅ [{source}] inséré immédiatement : {len(data)} produits")
                            except Exception as db_err:
                                errors.append(f"DB Error for {source}: {str(db_err)}")
                    else:
                        results[source] = []

                except Exception as e:
                    errors.append(f"{source} error: {str(e)}")
                    results[source] = []

        db.close()
        
        total_scraped = len(results["jumia"]) + len(results["amazon"]) + len(results["aliexpress"])

        # Statut final selon si ça a été stoppé ou non
        is_stopped = cache.get("STOP_SCRAPING")
        
        return {
            "status": "stopped" if is_stopped else "success",
            "query": query,
            "jumia_count": len(results["jumia"]),
            "amazon_count": len(results["amazon"]),
            "aliexpress_count": len(results["aliexpress"]),
            "total_scraped": total_scraped,
            "inserted": total_inserted,
            "errors": errors,
            "message": "Scraping interrompu" if is_stopped else f"{total_inserted} produits enregistrés"
        }

    except Exception as e:
        if 'db' in locals(): db.close()
        return {"status": "error", "error": str(e)}