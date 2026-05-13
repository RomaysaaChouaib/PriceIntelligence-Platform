# api/tasks.py
from celery import shared_task
from django.core.cache import cache
from scraping.db.mysql_writer import MySQLWriter
from concurrent.futures import ThreadPoolExecutor, as_completed

# === Import de vos scrapers existants ===
# Laptop
from scraping.core.scraper import scrape_product
from scraping.core.scraper_amazon import scrape_amazon_product, AmazonScraper
from scraping.core.scraper_aliex import AliexpressScraper

# Souris
from scraping.core.Accessoire.core_souris import scrape_souris_jumia, scrape_souris_amazon, scrape_aliexpress_product

# Sac
from scraping.core.Accessoire.core_sac import scrape_sac_jumia, scrape_sac_amazon, scrape_sac_aliexpress

# Laptop Stand
from scraping.core.Accessoire.core_laptop_stand import scrape_stand_laptop_jumia, scrape_stand_laptop_amazon, scrape_stand_laptop_aliex

# Cooling Pad
from scraping.core.Accessoire.cooling_pad import scrape_cooling_pad_jumia, scrape_cooling_pad_amazon, scrape_cooling_pad_aliex

# USB
from scraping.core.Accessoire.usb import scrape_usb_jumia, scrape_usb_amazon, scrape_usb_aliexpress


# === Task : Scraping Jumia seul ===
@shared_task(bind=True)
def scrape_jumia_task(self, query):
    cache.set("STOP_SCRAPING", False)
    db = MySQLWriter()
    try:
        products = scrape_product(query)
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


# === Task : Scraping Laptop (3 plateformes) ===
@shared_task(bind=True)
def scrape_all_task(self, query):
    cache.set("STOP_SCRAPING", False)
    db = MySQLWriter()
    results = {"jumia": [], "amazon": [], "aliexpress": []}
    errors = []
    total_inserted = 0

    try:
        with ThreadPoolExecutor(max_workers=3) as executor:
            futures = {
                executor.submit(scrape_product, query): "jumia",
                executor.submit(scrape_amazon_product, query): "amazon",
                executor.submit(lambda q: AliexpressScraper().scrape(q, max_pages=20), query): "aliexpress",
            }

            for future in as_completed(futures):
                source = futures[future]
                if cache.get("STOP_SCRAPING"):
                    errors.append(f"Interruption : {source} ignoré")
                    continue
                try:
                    data = future.result()
                    if data and not cache.get("STOP_SCRAPING"):
                        results[source] = data
                        db.insert_products(data)
                        total_inserted += len(data)
                except Exception as e:
                    errors.append(f"{source} error: {str(e)}")
        db.close()
        total_scraped = sum(len(results[k]) for k in results)
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


# === Task : Scraping Souris ===
@shared_task(bind=True)
def scrape_all_mouse_task(self, query):
    cache.set("STOP_SCRAPING", False)
    db = MySQLWriter()
    results = {"jumia": [], "amazon": [], "aliexpress": []}
    errors = []
    total_inserted = 0
    try:
        with ThreadPoolExecutor(max_workers=3) as executor:
            futures = {
                executor.submit(scrape_souris_jumia, query): "jumia",
                executor.submit(scrape_souris_amazon, query): "amazon",
                executor.submit(scrape_aliexpress_product, query): "aliexpress",
            }
            for future in as_completed(futures):
                source = futures[future]
                if cache.get("STOP_SCRAPING"):
                    errors.append(f"Interruption : {source} ignoré")
                    continue
                try:
                    data = future.result()
                    if data and not cache.get("STOP_SCRAPING"):
                        results[source] = data
                        db.insert_accessories(data)  # ← Attention : méthode pour accessoires
                        total_inserted += len(data)
                except Exception as e:
                    errors.append(f"{source} error: {str(e)}")
        db.close()
        total_scraped = sum(len(results[k]) for k in results)
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


# === Task : Scraping Sac ===
@shared_task(bind=True)
def scrape_all_sac_task(self, query):
    cache.set("STOP_SCRAPING", False)
    db = MySQLWriter()
    results = {"jumia": [], "amazon": [], "aliexpress": []}
    errors = []
    total_inserted = 0
    try:
        with ThreadPoolExecutor(max_workers=3) as executor:
            futures = {
                executor.submit(scrape_sac_jumia, query): "jumia",
                executor.submit(scrape_sac_amazon, query): "amazon",
                executor.submit(scrape_sac_aliexpress, query): "aliexpress",
            }
            for future in as_completed(futures):
                source = futures[future]
                if cache.get("STOP_SCRAPING"): continue
                try:
                    data = future.result()
                    if data and not cache.get("STOP_SCRAPING"):
                        results[source] = data
                        db.insert_accessories(data)
                        total_inserted += len(data)
                except Exception as e:
                    errors.append(f"{source} error: {str(e)}")
        db.close()
        total_scraped = sum(len(results[k]) for k in results)
        return {
            "status": "stopped" if cache.get("STOP_SCRAPING") else "success",
            "query": query, "inserted": total_inserted, "errors": errors,
            "jumia_count": len(results["jumia"]), "amazon_count": len(results["amazon"]),
            "aliexpress_count": len(results["aliexpress"])
        }
    except Exception as e:
        if 'db' in locals(): db.close()
        return {"status": "error", "error": str(e)}


# === Task : Laptop Stand ===
@shared_task(bind=True)
def scrape_all_laptop_stand_task(self, query):
    cache.set("STOP_SCRAPING", False)
    db = MySQLWriter()
    results = {"jumia": [], "amazon": [], "aliexpress": []}
    errors = []
    total_inserted = 0
    try:
        with ThreadPoolExecutor(max_workers=3) as executor:
            futures = {
                executor.submit(scrape_stand_laptop_jumia, query): "jumia",
                executor.submit(scrape_stand_laptop_amazon, query): "amazon",
                executor.submit(scrape_stand_laptop_aliex, query): "aliexpress",
            }
            for future in as_completed(futures):
                source = futures[future]
                if cache.get("STOP_SCRAPING"): continue
                try:
                    data = future.result()
                    if data and not cache.get("STOP_SCRAPING"):
                        results[source] = data
                        db.insert_accessories(data)
                        total_inserted += len(data)
                except Exception as e:
                    errors.append(f"{source} error: {str(e)}")
        db.close()
        total_scraped = sum(len(results[k]) for k in results)
        return {
            "status": "stopped" if cache.get("STOP_SCRAPING") else "success",
            "query": query, "inserted": total_inserted, "errors": errors,
            "jumia_count": len(results["jumia"]), "amazon_count": len(results["amazon"]),
            "aliexpress_count": len(results["aliexpress"])
        }
    except Exception as e:
        if 'db' in locals(): db.close()
        return {"status": "error", "error": str(e)}


# === Task : Cooling Pad ===
@shared_task(bind=True)
def scrape_all_cooling_pad_task(self, query):
    cache.set("STOP_SCRAPING", False)
    db = MySQLWriter()
    results = {"jumia": [], "amazon": [], "aliexpress": []}
    errors = []
    total_inserted = 0
    try:
        with ThreadPoolExecutor(max_workers=3) as executor:
            futures = {
                executor.submit(scrape_cooling_pad_jumia, query): "jumia",
                executor.submit(scrape_cooling_pad_amazon, query): "amazon",
                executor.submit(scrape_cooling_pad_aliex, query): "aliexpress",
            }
            for future in as_completed(futures):
                source = futures[future]
                if cache.get("STOP_SCRAPING"): continue
                try:
                    data = future.result()
                    if data and not cache.get("STOP_SCRAPING"):
                        results[source] = data
                        db.insert_accessories(data)
                        total_inserted += len(data)
                except Exception as e:
                    errors.append(f"{source} error: {str(e)}")
        db.close()
        total_scraped = sum(len(results[k]) for k in results)
        return {
            "status": "stopped" if cache.get("STOP_SCRAPING") else "success",
            "query": query, "inserted": total_inserted, "errors": errors,
            "jumia_count": len(results["jumia"]), "amazon_count": len(results["amazon"]),
            "aliexpress_count": len(results["aliexpress"])
        }
    except Exception as e:
        if 'db' in locals(): db.close()
        return {"status": "error", "error": str(e)}


# === Task : USB ===
@shared_task(bind=True)
def scrape_all_usb_task(self, query):
    cache.set("STOP_SCRAPING", False)
    db = MySQLWriter()
    results = {"jumia": [], "amazon": [], "aliexpress": []}
    errors = []
    total_inserted = 0
    try:
        with ThreadPoolExecutor(max_workers=3) as executor:
            futures = {
                executor.submit(scrape_usb_jumia, query): "jumia",
                executor.submit(scrape_usb_amazon, query): "amazon",
                executor.submit(scrape_usb_aliexpress, query): "aliexpress",
            }
            for future in as_completed(futures):
                source = futures[future]
                if cache.get("STOP_SCRAPING"): continue
                try:
                    data = future.result()
                    if data and not cache.get("STOP_SCRAPING"):
                        results[source] = data
                        db.insert_accessories(data)
                        total_inserted += len(data)
                except Exception as e:
                    errors.append(f"{source} error: {str(e)}")
        db.close()
        total_scraped = sum(len(results[k]) for k in results)
        return {
            "status": "stopped" if cache.get("STOP_SCRAPING") else "success",
            "query": query, "inserted": total_inserted, "errors": errors,
            "jumia_count": len(results["jumia"]), "amazon_count": len(results["amazon"]),
            "aliexpress_count": len(results["aliexpress"])
        }
    except Exception as e:
        if 'db' in locals(): db.close()
        return {"status": "error", "error": str(e)}