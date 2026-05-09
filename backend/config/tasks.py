from celery import shared_task
from django.core.cache import cache
from scraping.db.mysql_writer import MySQLWriter
from concurrent.futures import ThreadPoolExecutor, as_completed
from scraping.core.scraper import scrape_product
from scraping.core.scraper_amazon import scrape_amazon_product, AmazonScraper
from scraping.core.scraper_aliex import AliexpressScraper

#### souris classes
from scraping.core.Accessoire.core_souris import scrape_souris_jumia
from scraping.core.Accessoire.core_souris import scrape_souris_amazon
from scraping.core.Accessoire.core_souris import scrape_aliexpress_product

### Sac classes:
from scraping.core.Accessoire.core_sac import scrape_sac_jumia
from scraping.core.Accessoire.core_sac import scrape_sac_amazon
from scraping.core.Accessoire.core_sac import scrape_sac_aliexpress

### laptop_stand classes:
from scraping.core.Accessoire.core_laptop_stand import scrape_stand_laptop_jumia
from scraping.core.Accessoire.core_laptop_stand import scrape_stand_laptop_amazon
from scraping.core.Accessoire.core_laptop_stand import scrape_stand_laptop_aliex

## cooling pad classes:
from scraping.core.Accessoire.cooling_pad import scrape_cooling_pad_jumia
from scraping.core.Accessoire.cooling_pad import scrape_cooling_pad_amazon
from scraping.core.Accessoire.cooling_pad import scrape_cooling_pad_aliex

## usb classes:
from scraping.core.Accessoire.usb import scrape_usb_jumia
from scraping.core.Accessoire.usb import scrape_usb_amazon
from scraping.core.Accessoire.usb import scrape_usb_aliexpress

# Scarpping_jumia dans arriere plan pour test 
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
    
# Scaping All Laptop 
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
    

# Scarping All Souris 
@shared_task(bind=True)
def scrape_all_mouse_task(self, query):
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
                executor.submit(scrape_souris_jumia, query): "jumia",
                executor.submit(scrape_souris_amazon, query): "amazon",
                executor.submit(scrape_aliexpress_product,query): "aliexpress",
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
                                db.insert_accessories(data)
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
    
# Scraping All Sac:
@shared_task(bind=True)
def scrape_all_sac_task(self, query):
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
                executor.submit(scrape_sac_jumia, query): "jumia",
                executor.submit(scrape_sac_amazon, query): "amazon",
                executor.submit(scrape_sac_aliexpress, query): "aliexpress",
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
                                db.insert_accessories(data)
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


# Scraping All Laptop Stand:
@shared_task(bind=True)
def scrape_all_laptop_stand_task(self, query):
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
                executor.submit(scrape_stand_laptop_jumia, query): "jumia",
                executor.submit(scrape_stand_laptop_amazon, query): "amazon",
                executor.submit(scrape_stand_laptop_aliex, query): "aliexpress",
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
                                db.insert_accessories(data)
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


# cooling pad classes:
@shared_task(bind=True)
def scrape_all_cooling_pad_task(self, query):
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
                executor.submit(scrape_cooling_pad_jumia, query): "jumia",
                executor.submit(scrape_cooling_pad_amazon, query): "amazon",
                executor.submit(scrape_cooling_pad_aliex, query): "aliexpress",
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
                                db.insert_accessories(data)
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
    


# usb classes:
@shared_task(bind=True)
def scrape_all_usb_task(self, query):
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
                executor.submit(scrape_usb_jumia, query): "jumia",
                executor.submit(scrape_usb_amazon, query): "amazon",
                executor.submit(scrape_usb_aliexpress, query): "aliexpress",
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
                                db.insert_accessories(data)
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