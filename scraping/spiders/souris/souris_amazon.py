import csv
import time
import random
import re
from datetime import datetime
from django.core.cache import cache
from playwright.sync_api import sync_playwright

"""
sync_playwright: LIBRARIE TRÈS IMPORTANTE
permet de :
- ouvrir vrai navigateur
- exécuter JavaScript
- contourner protections Amazon
- plus puissant que requests
"""

class SourisAmazonScraper:
    def __init__(self):
        self.base_url = "https://www.amazon.fr/s?k="
        self.source_name = "Amazon"

    def generate_queries(self, query):
        # SÉCURITÉ : Si query est déjà une liste, on la retourne directement
        if isinstance(query, list):
            return query

        # Dictionnaire adapté pour les souris
        related = {
            "souris": [
                "souris", # Terme principal
                "souris gamer",
                "souris sans fil",
                "souris filaire",
                "souris bluetooth",
                "souris ergonomique",
                "souris verticale",
                "souris silencieuse",
                "souris rechargeable",
                "souris pc",
                "souris mac",
                "souris ordinateur portable",
                "souris pas cher",
                # Marques et Modèles populaires
                "souris logitech",
                "logitech mx master",
                "logitech g502",
                "logitech g pro superlight",
                "souris razer",
                "razer deathadder",
                "razer viper",
                "razer basilisk",
                "souris corsair",
                "souris steelseries",
                "souris roccat",
                "souris asus rog",
                "souris hp",
                "souris dell",
                "apple magic mouse",
                "souris microsoft",
                # Spécifications techniques
                "souris rgb",
                "souris legere",
                "souris mmo",
                "souris gaucher",
                "souris 10000 dpi",
                "souris 20000 dpi",
                "souris avec fil"
            ]
        }
        return related.get(query.lower().strip(), [query])

    def scrape(self, base_query, max_pages=20):
        results = []
        queries = self.generate_queries(base_query)
        
        # Playwright
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=False) 
            context = browser.new_context(
                # simuler un navigateur Chrome réel
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                viewport={"width": 1920, "height": 1080},
                locale="fr-FR"
            )
            page = context.new_page()
            # anti-detection
            page.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")

            for search_word in queries: 
                     # 🛑 VÉRIFICATION 1 : Arrêt avant de changer de mot-clé
                if cache.get("STOP_SCRAPING"):
                    print(f"🛑 Scraping Amazon annulé depuis le cache (Mot-clé: {query}).")
                    break # Casse la boucle des mots-clés
                formatted_query = search_word.replace(" ", "+")
                
                # pagination
                for page_idx in range(1, max_pages + 1): 
                       # 🛑 VÉRIFICATION 2 : Arrêt avant de charger une nouvelle page
                    if cache.get("STOP_SCRAPING"):
                        print(f"🛑 Scraping Amazon annulé depuis le cache (Page {p_idx}).")
                        break # Casse la boucle de pagination
                    url = f"{self.base_url}{formatted_query}&page={page_idx}"
                    
                    try:
                        # NAVIGATION
                        page.goto(url, wait_until="domcontentloaded", timeout=60000)
                        
                        # Attendre l'apparition des produits
                        try:
                            page.wait_for_selector('div[data-component-type="s-search-result"]', timeout=10000)
                        except:
                            pass # Bypass en cas de Captcha/blocage temporaire

                        page.wait_for_timeout(random.randint(2000, 4000)) 
                        # scroll => simule humain
                        page.evaluate("window.scrollTo(0, document.body.scrollHeight/2)")
                        page.wait_for_timeout(random.randint(1000, 2000))

                        items = page.query_selector_all('div[data-component-type="s-search-result"]')
                        
                        if len(items) == 0:
                            break

                        for item in items:
                            title_el = item.query_selector('h2 a span') or item.query_selector('h2 span')
                            price_el = item.query_selector('.a-price .a-offscreen') 
                            # Sur Amazon, l'ancien prix barré se trouve souvent dans a-text-price
                            old_price_el = item.query_selector('.a-text-price .a-offscreen')
                            link_el = item.query_selector('h2 a') or item.query_selector('a.a-link-normal.s-no-outline')
                            img_el = item.query_selector('img.s-image') 

                            if title_el:
                                title_text = title_el.inner_text().strip()
                                title_lower = title_text.lower()
                                
                                # --- EXTRACTION DU PRIX ---
                                price_val = "N/A"
                                if price_el:
                                    raw_price = price_el.inner_text().strip()
                                    if re.search(r'\d', raw_price):
                                        price_val = re.sub(r'[^\d,.]', '', raw_price)
                                        
                                # --- EXTRACTION DE L'ANCIEN PRIX ---
                                old_price_val = "N/A"
                                if old_price_el:
                                    raw_old_price = old_price_el.inner_text().strip()
                                    if re.search(r'\d', raw_old_price):
                                        old_price_val = re.sub(r'[^\d,.]', '', raw_old_price)

                                # --- EXTRACTION DU LIEN ---
                                product_link = "N/A"
                                if link_el:
                                    href = link_el.get_attribute("href")
                                    if href:
                                        product_link = href if href.startswith('http') else "https://www.amazon.fr" + href

                                # --- EXTRACTION DE L'IMAGE ---
                                image_url = "N/A"
                                if img_el:
                                    src = img_el.get_attribute("src")
                                    if src:
                                        image_url = src

                                # --- AJOUT DES CHAMPS DEMANDÉS ---
                                results.append({
                                    "title": title_text,
                                    "price": price_val,
                                    "old_price": old_price_val,
                                    "currency": "EUR",  # AJOUT DE LA DEVISE ICI
                                    "brand": title_text.split()[0] if title_text.split() else "Inconnu",
                                    "category": "mouse",
                                    "source": self.source_name,
                                    "link": product_link,
                                    "image": image_url,
                                    "search_query": search_word,
                                    "page": page_idx,
                                    "in_stock": True,
                                    "is_gaming": any(g in title_lower for g in ["gaming", "gamer"]),
                                    "date_scraped": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                                })
                    except Exception as e:
                        print(f"Erreur lors du scraping de la page {page_idx} pour '{search_word}': {e}")
                        break
                        
            # Fin du navigateur       
            browser.close()
        return results

    def export_to_csv(self, products, filename="souris_amazon.csv"):
        if not products:
            print("Aucun produit à exporter.")
            return
        keys = products[0].keys()
        with open(filename, 'w', newline='', encoding='utf-8-sig') as f:
            dict_writer = csv.DictWriter(f, fieldnames=keys)
            dict_writer.writeheader()
            dict_writer.writerows(products)