import csv
import time
import random
import re
from datetime import datetime
from playwright.sync_api import sync_playwright
"""
sync_playwright:LIBRAIRIE TRÈS IMPORTANTE
permet de :
ouvrir vrai navigateur
exécuter JavaScript
contourner protections Amazon
 plus puissant que requests
"""
class AmazonScraper:
    def __init__(self):
        self.base_url = "https://www.amazon.fr/s?k="
        self.source_name = "Amazon"

    def generate_queries(self, query):
        # SÉCURITÉ : Si query est déjà une liste (venant du test_amazon.py), on la retourne directement
        if isinstance(query, list):
            return query

        related = {
            "laptop": [
                "pc gamer", 
                "laptop", # <--- AJOUTÉ ICI pour ne pas ignorer le terme principal
                "ordinateur portable", 
                "macbook", 
                "macbook pro",
                "macbook air",
                "ordinateur hp",
                "ordinateur lenovo",
                "ultrabook",
                "chromebook",
                "pc portable asus",
                "ordinateur portable dell",
                "pc portable acer",
                "pc portable msi",
                "ordinateur portable etudiant",
                "ordinateur portable professionnel",
                "pc portable pas cher",
                "notebook pc",
                "ordinateur portable i7",
                "ordinateur portable rtx",
                # Marques & Gammes
                "surface laptop",
                "microsoft surface",
                "huawei matebook",
                "xiaomi redmibook",
                "thinkpad",
                "lenovo ideapad",
                "lenovo yoga",
                "dell xps",
                "dell latitude",
                "dell inspiron",
                "hp pavilion",
                "hp omen",
                "acer predator",
                "acer swift",
                "acer aspire",
                "asus rog",
                "asus zenbook",
                "msi stealth",
                "apple mac",
                # Spécifications techniques
                "pc portable i5",
                "pc portable i9",
                "pc portable ryzen 5",
                "pc portable ryzen 7",
                "pc portable ryzen 9",
                "pc portable 16 go ram",
                "pc portable 32 go ram",
                "pc portable ssd",
                "pc portable 1 to",
                "pc portable rtx 3060",
                "pc portable rtx 4070",
                "pc portable rtx 4090",
                "pc portable gtx 1660",
                "pc portable 144hz",
                "pc portable 120hz",
                "pc portable oled",
                "pc portable 4k",
                "pc portable full hd",
                "pc portable intel core",
                "pc portable amd",
            ]
        }
        return related.get(query.lower().strip(), [query])

    def scrape(self, base_query, max_pages=20):
        results = []
        # On génère la liste à partir de la fonction fraîchement créée
        queries = self.generate_queries(base_query)
        
        # Playwright
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=False) 
            context = browser.new_context(
                # simuler chrome reel
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                viewport={"width": 1920, "height": 1080},
                locale="fr-FR"
            )
            page = context.new_page()
            #anti-detection
            page.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")

            for query in queries:
                formatted_query = query.replace(" ", "+")
                # pagination
                for p_idx in range(1, max_pages + 1):
                    url = f"{self.base_url}{formatted_query}&page={p_idx}"
                    
                    try:
                        #NAVIGATION
                        page.goto(url, wait_until="domcontentloaded", timeout=60000)
                        
                        # --- CORRECTION POUR NE PAS SAUTER LE PREMIER TERME ---
                        # On force le script à attendre l'apparition des produits avant de continuer
                        try:
                            page.wait_for_selector('div[data-component-type="s-search-result"]', timeout=10000)
                        except:
                            pass # Si ça bloque (Captcha), on laisse le code continuer pour qu'il fasse son 'break' proprement
                        # ------------------------------------------------------

                        page.wait_for_timeout(random.randint(2000, 4000)) 
                        # scroll =>simule humain
                        page.evaluate("window.scrollTo(0, document.body.scrollHeight/2)")
                        page.wait_for_timeout(random.randint(1000, 2000))

                        items = page.query_selector_all('div[data-component-type="s-search-result"]')
                        
                        if len(items) == 0:
                            break

                        for item in items:
                            title_el = item.query_selector('h2 a span') or item.query_selector('h2 span')
                            price_el = item.query_selector('.a-price .a-offscreen') 
                            link_el = item.query_selector('h2 a') or item.query_selector('a.a-link-normal.s-no-outline')
                            img_el = item.query_selector('img.s-image') # Nouveau sélecteur pour l'image

                            if title_el:
                                title_text = title_el.inner_text().strip()
                                
                                # --- EXTRACTION DU PRIX ET DE LA DEVISE ---
                                price_val = "N/A"
                                currency = "N/A"
                                
                                if price_el:
                                    #si prix existe
                                    raw_price = price_el.inner_text().strip()
                                    #garde chiffres
                                    if re.search(r'\d', raw_price):
                                        price_val = re.sub(r'[^\d,.]', '', raw_price)
                                        currency_match = re.search(r'[^\d,.\s]+', raw_price)
                                        if currency_match:
                                            currency = currency_match.group(0)
                                
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

                                brand = title_text.split()[0] if title_text.split() else "Inconnu"

                                # --- AJOUT DES CHAMPS DEMANDÉS EXACTEMENT COMME VOULU ---
                                results.append({
                                    "title": title_text,
                                    "price": price_val,
                                    "currency": currency,
                                    "brand": brand,
                                    "source": self.source_name,
                                    "link": product_link,
                                    "image": image_url,
                                    "search_query": query,
                                    "page": p_idx,
                                    "is_gaming": "gaming" in title_text.lower(),
                                    "date_scraped": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                                })
                    except Exception as e:
                        break
             # fin de navigateur       
            browser.close()
        return results

    def export_to_csv(self, products, filename="resultats_amazon.csv"):
        if not products:
            return
        keys = products[0].keys()
        with open(filename, 'w', newline='', encoding='utf-8-sig') as f:
            dict_writer = csv.DictWriter(f, fieldnames=keys)
            dict_writer.writeheader()
            dict_writer.writerows(products)

"""
query → generate_queries
      → Playwright browser
      → Amazon search page
      → wait selector
      → extract products
      → filter fields
      → clean price
      → save results
"""

"""
Playwright = vrai navigateur
 anti-bot script
random delay
scroll simulation
 retry selectors
"""