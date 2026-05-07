from datetime import datetime
import requests
from bs4 import BeautifulSoup
from django.core.cache import cache
import time
import re
import csv
import hashlib
# Assure-toi que ces imports fonctionnent selon ta structure de dossier
from scraping.utils.headers import HEADERS
from scraping.utils.helpers import clean_price

class CoolingPadJumia:
    def __init__(self):
        self.base_url = "https://www.jumia.ma/catalog/"
        self.source_name = "Jumia"

    def generate_queries(self, query):
        related = {
           "cooling_pad": [
    "refroidisseur pc portable",
    "ventilateur pc portable",
    "support ventilé pc",
    "cooling pad laptop",
    "support refroidisseur gamer",
    "base de refroidissement",
    "ergostand pc portable",
    "refroidisseur pc portable pas cher",
    "ventilateur usb pc",
    "deepcool wind pal",
    "support pc portable ventilé",
    "tapis de refroidissement pc",
    "cooling pad 17 pouces",
    "refroidisseur 6 ventilateurs",
    "support pc gamer led"
]
        }
        # Retourne les requêtes pour cooling_pad, sinon utilise le mot passé en paramètre
        key = query.lower().replace(" ", "_")
        return related.get(key, related.get("cooling_pad", [query]))

    def _normalize_title(self, title):
        return re.sub(r"[^a-z0-9]", "", title.lower())

    def _get_with_retry(self, url, retries=3, backoff=2):
        for attempt in range(retries):
            try:
                response = requests.get(url, headers=HEADERS, timeout=10)
                if response.status_code == 200:
                    return response
                if response.status_code == 429:
                    time.sleep(backoff * (attempt + 1) * 2)
                    continue
            except Exception:
                time.sleep(backoff * (attempt + 1))
        return None

    def scrape(self, query="cooling_pad", max_pages=10):
        products = []
        seen_links = set()
        seen_titles = set()

        # Mots-clés requis pour confirmer qu'il s'agit bien d'une clé USB
        usb_keywords = ["refroidisseur", "cooling", "cooler", "ventilateur", "ventilo", 
    "fan", "pad", "base", "support ventilé", "radiateur", "vaccum", 
    "turbine", "rgb", "led", "airflow"]
        
        # Mots-clés à exclure (accessoires USB qui ne sont pas des clés de stockage)
        excluded = [
          "interne", "pâte thermique", "thermal paste", "cpu cooler", 
    "watercooling kit", "boitier pc", "case fan", "support bois", 
    "support aluminium seul", "pliable sans ventilateur", 
    "bureau", "table", "coque", "housse"
        ]

        queries = self.generate_queries(query)
        
        for q_idx, search_word in enumerate(queries, 1):
                    
            # 🛑 VÉRIFICATION 1 : Est-ce qu'on doit s'arrêter avant de changer de mot-clé ?
            if cache.get("STOP_SCRAPING"):
                print("🛑 Scraping annulé depuis le cache (Changement de mot-clé).")
                break # Casse la boucle des mots-clés
            print(f"\n[{q_idx}/{len(queries)}] Recherche Jumia : '{search_word}'")
            
            for page in range(1, max_pages + 1):
                   # 🛑 VÉRIFICATION 2 : Est-ce qu'on doit s'arrêter avant de charger une nouvelle page ?
                if cache.get("STOP_SCRAPING"):
                    print(f"🛑 Scraping annulé depuis le cache (Page {page}).")
                    break # Casse la boucle de pagination
                url = f"{self.base_url}?q={search_word}&page={page}"
                response = self._get_with_retry(url)

                if not response:
                    break

                soup = BeautifulSoup(response.text, "html.parser")
                items = soup.select("article.prd")

                if not items:
                    break

                new_on_page = 0
                for item in items:
                    title_tag = item.select_one(".name")
                    price_tag = item.select_one(".prc")
                    link_tag = item.select_one("a.core")
                    
                    if not title_tag or not price_tag:
                        continue

                    title_text = title_tag.get_text(strip=True)
                    price_val = clean_price(price_tag.get_text(strip=True))
                    
                    title_lower = title_text.lower()
                    
                    # Logique de filtrage : contient des mots USB mais n'est pas un accessoire exclu
                    is_usb = any(word in title_lower for word in usb_keywords)
                    is_bad = any(word in title_lower for word in excluded)

                    # Prix minimum 20 MAD pour éviter les petits adaptateurs inutiles
                    if is_usb and not is_bad and price_val >= 20:
                        
                        href = link_tag.get("href") if link_tag else ""
                        product_link = href if href.startswith("http") else "https://www.jumia.ma" + href

                        if product_link in seen_links:
                            continue

                        norm_title = self._normalize_title(title_text)
                        if norm_title in seen_titles:
                            continue

                        seen_links.add(product_link)
                        seen_titles.add(norm_title)

                        img_tag = item.select_one("img")
                        image_url = img_tag.get("data-src") or img_tag.get("src") or ""

                        products.append({
                            "title": title_text,
                            "price": price_val,
                            "currency": "MAD",
                            "brand": title_text.split()[0] if title_text.split() else "Inconnu",
                            "category": "cooling_pad",
                            "source": self.source_name,
                            "link": product_link,
                            "image": image_url,
                            "search_query": search_word,
                            "page": page,
                            "in_stock": True,
                            "date_scraped": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                        })
                        new_on_page += 1

                print(f"  Page {page} : {new_on_page} nouveaux | Total : {len(products)}")
                if new_on_page == 0: 
                    break 
                time.sleep(1)

        return products

    def export_to_csv(self, products, filename="jumia_cooling_pad.csv"):
        if not products:
            print("Aucun produit à exporter.")
            return

        keys = products[0].keys()
        with open(filename, 'w', newline='', encoding='utf-8-sig') as f:
            dict_writer = csv.DictWriter(f, fieldnames=keys)
            dict_writer.writeheader()
            dict_writer.writerows(products)
        print(f"\nExportation réussie : {filename}")




# Amazon:

"""
sync_playwright: LIBRARIE TRÈS IMPORTANTE
permet de :
- ouvrir vrai navigateur
- exécuter JavaScript
- contourner protections Amazon
- plus puissant que requests
"""


import random
import re
import csv
import time
from datetime import datetime
from playwright.sync_api import sync_playwright

class CoolingPadAmazon:
    def __init__(self):
        self.base_url = "https://www.amazon.fr/s?k="
        self.source_name = "Amazon"

    def generate_queries(self, query):
        if isinstance(query, list):
            return query

        related = {
           "cooling_pad": [
    "laptop cooling pad",
    "refroidisseur pc portable",
    "ventilateur pc portable",
    "gaming laptop cooler",
    "rgb laptop cooling pad",
    "laptop fan stand",
    "notebook cooling base",
    "powerful laptop fan",
    "high speed laptop cooler",
    "turbofan laptop cooler",
    "laptop vacuum cooler",
    "extracteur d'air pc portable",
    "industrial laptop cooler",
    "heavy duty cooling pad",
    "laptop cooler for 17.3 inch",
    "laptop cooler for 19 inch",
    "dual turbine laptop cooler",
    "pressure sealed cooling pad",
    "klim ultimate",
    "llano gaming cooler",
    "ice coorel k9",
    "topmate c11",
    "thermoelectric laptop cooler",
    "peltier cooling laptop",
    "liquid cooling pad laptop",
    "adjustable rpm laptop fan",
    "cooling pad with lcd display",
    "laptop radiator",
    "active cooling stand",
    "cross flow fan laptop",
    "silent gaming cooler",
    "opolar laptop fan",
    "flydigi laptop cooler",
    "black shark laptop cooler",
    "massive cooling pad"
]
        }
        return related.get(query.lower().strip(), [query])

    def scrape(self, base_query="cooling_pad", max_pages=5): # J'ai réduit max_pages par défaut pour éviter le ban IP
        results = []
        queries = self.generate_queries(base_query)
        
        USER_AGENTS= USER_AGENTS = [
    # Edge Windows (moderne)
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/125.0.0.0",
    
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0",

    # Edge avec version différente
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0",

    # Tu peux garder aussi Chrome/Firefox
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/126.0",
]
        with sync_playwright() as p:
            # Lancement du navigateur
            browser = p.chromium.launch(headless=False) 
            context = browser.new_context(
                user_agent=random.choice(USER_AGENTS),
                viewport={"width": 1920, "height": 1080},
                locale="fr-FR",
                extra_http_headers={
                    "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
                    "Referer": "https://www.amazon.fr/"
                }
            )
            page = context.new_page()
            
            # Anti-detection : cache l'automatisation
            page.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")

            for search_word in queries: 
                      # 🛑 VÉRIFICATION 1 : Arrêt avant de changer de mot-clé
                if cache.get("STOP_SCRAPING"):
                    print(f"🛑 Scraping Amazon annulé depuis le cache (Mot-clé: {search_word}).")
                    break # Casse la boucle des mots-clés
                print(f"\n--- Recherche Amazon : '{search_word}' ---")
                formatted_query = search_word.replace(" ", "+")
                
                for page_idx in range(1, max_pages + 1): 
                         # 🛑 VÉRIFICATION 2 : Arrêt avant de charger une nouvelle page
                    if cache.get("STOP_SCRAPING"):
                        print(f"🛑 Scraping Amazon annulé depuis le cache (Page {page_idx}).")
                        break # Casse la boucle de pagination
                    url = f"{self.base_url}{formatted_query}&page={page_idx}"
                    
                    try:
                        # Navigation
                        page.goto(url, wait_until="domcontentloaded", timeout=60000)
                        
                        # --- GESTION DU CAPTCHA ---
                        if page.query_selector('form[action="/errors/validateCaptcha"]'):
                            print("🛑 CAPTCHA DÉTECTÉ ! Amazon vous a bloqué temporairement.")
                            print("👉 Veuillez résoudre le captcha dans la fenêtre du navigateur...")
                            # On attend jusqu'à 5 minutes que tu résolves le captcha manuellement
                            page.wait_for_selector('div[data-component-type="s-search-result"]', timeout=300000)
                            print("✅ Captcha résolu, reprise du scraping...")
                            # Petite pause de sécurité après le captcha
                            time.sleep(3)

                        try:
                            # Attente des résultats normaux
                            page.wait_for_selector('div[data-component-type="s-search-result"]', timeout=15000)
                        except:
                            print(f"⚠️ Aucun produit détecté sur la page {page_idx} (Blocage ou page vide)")
                            continue

                        # --- SIMULATION HUMAINE PLUS LENTE ---
                        # Amazon bloque si c'est trop rapide. On augmente les délais.
                        page.wait_for_timeout(random.randint(3000, 6000)) 
                        
                        # Scroll en plusieurs fois pour faire plus humain
                        page.evaluate("window.scrollTo(0, document.body.scrollHeight/3)")
                        page.wait_for_timeout(random.randint(1000, 2000))
                        page.evaluate("window.scrollTo(0, document.body.scrollHeight/1.5)")
                        page.wait_for_timeout(random.randint(1000, 2000))

                        # Sélection des produits
                        items = page.query_selector_all('div[data-component-type="s-search-result"]')
                        
                        if not items:
                            print(f"Fin des résultats pour '{search_word}' à la page {page_idx}")
                            break

                        for item in items:
                            title_el = item.query_selector('h2 a span') or item.query_selector('h2 span')
                            price_el = item.query_selector('.a-price .a-offscreen') or item.query_selector('.a-price-whole')
                            old_price_el = item.query_selector('.a-text-price .a-offscreen')
                            link_el = item.query_selector('h2 a') or item.query_selector('a.a-link-normal.s-no-outline')
                            img_el = item.query_selector('img.s-image') 

                            if title_el:
                                title_text = title_el.inner_text().strip()
                                title_lower = title_text.lower()
                                
                                # --- Nettoyage du Prix en FLOAT (Obligatoire pour la base de données) ---
                                price_val = 0.0
                                if price_el:
                                    raw_price = price_el.inner_text().strip()
                                    clean_price = re.sub(r'[^\d,.]', '', raw_price).replace(',', '.')
                                    try: price_val = round(float(clean_price), 2)
                                    except ValueError: pass


                                # --- Lien ---
                                product_link = "N/A"
                                if link_el:
                                    href = link_el.get_attribute("href")
                                    if href:
                                        product_link = href if href.startswith('http') else "https://www.amazon.fr" + href

                                # --- Image ---
                                image_url = "N/A"
                                if img_el:
                                    image_url = img_el.get_attribute("src") or "N/A"

                                results.append({
                                    "title": title_text,
                                    "price": price_val,
                                    "currency": "EUR",
                                    "brand": title_text.split()[0] if title_text.split() else "Inconnu",
                                    "category": "cooling_pad",
                                    "source": self.source_name,
                                    "link": product_link,
                                    "image": image_url,
                                    "search_query": search_word,
                                    "page": page_idx,
                                    "in_stock": True,
                                    "is_gaming": any(g in title_lower for g in ["gaming", "gamer", "rog", "alienware"]),
                                    "date_scraped": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                                })

                    except Exception as e:
                        print(f"Erreur sur page {page_idx} : {e}")
                        continue 
                        
            browser.close()
        return results

    def export_to_csv(self, products, filename="amazon_cooling_pad.csv"):
        if not products:
            print("Aucun produit trouvé.")
            return
        
        keys = products[0].keys()
        try:
            with open(filename, 'w', newline='', encoding='utf-8-sig') as f:
                dict_writer = csv.DictWriter(f, fieldnames=keys)
                dict_writer.writeheader()
                dict_writer.writerows(products)
            print(f"\nSuccès ! {len(products)} produits exportés vers : {filename}")
        except Exception as e:
            print(f"Erreur lors de l'exportation CSV : {e}")



# Aliexpress:
import json
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout

class CoolingPadAliexpress:
    def __init__(self):
        self.base_url = "https://fr.aliexpress.com/wholesale?SearchText="
        self.source_name = "AliExpress"

    # ------------------------------------------------------------------
    # QUERIES
    # ------------------------------------------------------------------
    def generate_queries(self, query):
        if isinstance(query, list):
            return query

        # Dictionnaire adapté pour les sacs et sacoches PC
        related = {
         "cooling_pad": [
    "refroidisseur pc portable",
    "laptop cooling pad",
    "notebook cooler",
    "ventilateur pc portable",
    "support ventilé pc portable",
    "laptop fan stand",
    "base de refroidissement pc",
    "gaming laptop cooler",
    "rgb laptop cooling pad",
    "powerful laptop fan",
    "ice coorel",
    "llano laptop cooler",
    "klim cooler",
    "6 fans laptop cooler",
    "laptop vacuum cooler",
    "extracteur d'air pc portable",
    "laptop cooling base",
    "turbofan laptop cooler",
    "high speed cooler laptop",
    "radiateur pc portable",
    "external cooling fan laptop"
]
        }
        
        normalized_query = query.lower().strip().replace(" ", "_")
        return related.get(normalized_query, related.get("cooling_pad", [query]))

    # ------------------------------------------------------------------
    # HELPERS ANTI-DÉTECTION
    # ------------------------------------------------------------------
    def _human_scroll(self, page):
        total_height = page.evaluate("document.body.scrollHeight")
        current = 0
        step = random.randint(300, 600)
        while current < total_height:
            page.evaluate(f"window.scrollBy(0, {step})")
            time.sleep(random.uniform(0.4, 1.0))
            current += step
            if random.random() < 0.15:
                page.evaluate(f"window.scrollBy(0, -{random.randint(80, 200)})")
                time.sleep(random.uniform(0.2, 0.5))

    def _move_mouse_randomly(self, page):
        for _ in range(random.randint(2, 5)):
            x = random.randint(100, 1200)
            y = random.randint(100, 700)
            page.mouse.move(x, y)
            time.sleep(random.uniform(0.1, 0.3))

    def _is_blocked(self, page) -> bool:
        url = page.url
        content = page.content().lower()
        return (
            "captcha" in url
            or "robot" in url
            or "verify" in url
            or "captcha" in content
            or "are you a human" in content
            or "access denied" in content
        )

    # ------------------------------------------------------------------
    # SCRAPE
    # ------------------------------------------------------------------
    def scrape(self, base_query="cooling_pad", max_pages=10):
        results = []
        queries = self.generate_queries(base_query)

        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=False,
                args=[
                    "--disable-blink-features=AutomationControlled",
                    "--disable-dev-shm-usage",
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-web-security",
                    "--disable-features=IsolateOrigins,site-per-process",
                    "--lang=fr-FR",
                ]
            )

            context = browser.new_context(
                user_agent=(
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/123.0.0.0 Safari/537.36"
                ),
                viewport={"width": 1366, "height": 768},
                locale="fr-FR",
                timezone_id="Europe/Paris",
                extra_http_headers={
                    "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                    "Accept-Encoding": "gzip, deflate, br",
                    "DNT": "1",
                    "Upgrade-Insecure-Requests": "1",
                },
                geolocation={"latitude": 48.8566, "longitude": 2.3522},
                permissions=["geolocation"],
            )

            context.add_init_script("""
                Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
                Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3] });
                Object.defineProperty(navigator, 'languages', { get: () => ['fr-FR', 'fr', 'en-US', 'en'] });
                window.chrome = { runtime: {} };
                Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });
            """)

            page = context.new_page()

            try:
                page.goto("https://fr.aliexpress.com", wait_until="domcontentloaded", timeout=30000)
                time.sleep(random.uniform(3, 5))
                try:
                    page.click('button:has-text("Accepter")', timeout=4000)
                except Exception:
                    pass
                self._move_mouse_randomly(page)
            except Exception:
                pass

            for query in queries:
                        # 🛑 VÉRIFICATION 1 : Arrêt avant de changer de mot-clé
                if cache.get("STOP_SCRAPING"):
                    print(f"🛑 Scraping Amazon annulé depuis le cache (Mot-clé: {query}).")
                    break # Casse la boucle des mots-clés
                formatted_query = query.replace(" ", "+")
                search_word = query # Pour correspondre à ton append
                print(f"\n🔍 Requête : «{query}»")
                consecutive_fails = 0

                for page_idx in range(1, max_pages + 1):
                       # 🛑 VÉRIFICATION 2 : Arrêt avant de charger une nouvelle page
                    if cache.get("STOP_SCRAPING"):
                        print(f"🛑 Scraping Amazon annulé depuis le cache (Page {page_idx}).")
                        break # Casse la boucle de pagination
                    url = f"{self.base_url}{formatted_query}&page={page_idx}"

                    try:
                        page.goto(url, wait_until="domcontentloaded", timeout=45000)
                        time.sleep(random.uniform(2, 4))

                        if self._is_blocked(page):
                            print(f"  ⚠️  Blocage détecté page {page_idx}, pause longue...")
                            time.sleep(random.uniform(15, 45))
                            consecutive_fails += 1
                            if consecutive_fails >= 3:
                                break
                            continue

                        consecutive_fails = 0

                        try:
                            page.wait_for_selector('div[class*="search-card-item"], div[class*="multi--card--"], a[href*="/item/"]', timeout=12000)
                        except PlaywrightTimeout:
                            break

                        self._human_scroll(page)
                        self._move_mouse_randomly(page)
                        time.sleep(random.uniform(1, 2))

                        items = page.query_selector_all('div[class*="search-card-item"], div[class*="multi--card--"], div[class*="product-container"]')
                        if not items:
                            items = page.query_selector_all('a[href*="/item/"]')

                        if not items:
                            break

                        page_results = 0
                        for item in items:
                            # --- Titre ---
                            title_el = item.query_selector('h3, div[class*="title"], span[class*="title"]')
                            title_text = title_el.inner_text().strip() if title_el else ""
                            if not title_text or "AliExpress" in title_text:
                                continue
                            title_lower = title_text.lower()

                           # --- PRIX (LOGIQUE CORRIGÉE POUR MYSQL) ---
                           # --- PRIX (LOGIQUE CORRIGÉE CIBLANT UNIQUEMENT .lw_el) ---
                            price_val = 0.0 # Valeur par défaut numérique
                            currency = "inconnu"
                            
                            # On cible spécifiquement la classe vue sur ta capture d'écran
                            price_el = item.query_selector('.lw_el')
                            
                            if price_el:
                                # Astuce : On essaie d'abord de prendre l'aria-label (plus propre), sinon on prend le texte à l'intérieur
                                raw_price = price_el.get_attribute("aria-label") 
                                if not raw_price:
                                    raw_price = price_el.inner_text().strip()
                                
                                # Nettoyage : On ne garde que les chiffres, points et virgules
                                clean_price = re.sub(r'[^\d.,]', '', raw_price)
                                
                                if clean_price:
                                    # Gestion des formats (ex: 5.899,99 ou 5,899.99)
                                    if ',' in clean_price and '.' in clean_price:
                                        # Si la virgule est après le point, c'est le séparateur décimal (Format EU)
                                        if clean_price.rfind(',') > clean_price.rfind('.'):
                                            clean_price = clean_price.replace('.', '').replace(',', '.')
                                        # Sinon le point est la décimale (Format US)
                                        else:
                                            clean_price = clean_price.replace(',', '')
                                    # Si on a juste une virgule (ex: 12,50)
                                    elif ',' in clean_price:
                                        clean_price = clean_price.replace(',', '.')
                                    
                                    try:
                                        price_val = float(clean_price)
                                    except ValueError:
                                        price_val = 0.0
                            
                                # Extraction de la devise
                                if 'MAD' in raw_price: currency = 'MAD'
                                elif '€' in raw_price or 'EUR' in raw_price: currency = 'EUR'
                                elif '$' in raw_price or 'USD' in raw_price: currency = 'USD'
                                else:
                                    match_curr = re.search(r'([A-Za-z]+|€|\$|£)', raw_price)
                                    if match_curr: currency = match_curr.group(1)

                            # --- Lien ---
                            link_el = item.query_selector('a[href*="/item/"]') or (item if item.get_attribute("href") else None)
                            product_link = "N/A"
                            if link_el:
                                href = link_el.get_attribute("href")
                                if href:
                                    if href.startswith("http"): product_link = href
                                    elif href.startswith("//"): product_link = "https:" + href
                                    else: product_link = "https://fr.aliexpress.com" + href

                            # --- Image ---
                            img_el = item.query_selector('img[class*="product-img"], img')
                            image_url = "N/A"
                            if img_el:
                                src = img_el.get_attribute("src") or img_el.get_attribute("data-src")
                                if src: image_url = "https:" + src if src.startswith("//") else src

                            # --- INSERTION ---
                            results.append({
                                "title": title_text,
                                "price": price_val,
                                "currency": currency,
                                "brand": title_text.split()[0] if title_text.split() else "Inconnu",
                                "category": "cooling_pad", # MISE À JOUR ICI
                                "source": self.source_name,
                                "link": product_link,
                                "image": image_url,
                                "search_query": search_word,
                                "page": page_idx,
                                "in_stock": True,
                                "is_gaming": any(g in title_lower for g in ["gaming", "gamer"]), # Toujours utile pour les sacs à dos gaming
                                "date_scraped": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                            })
                            page_results += 1

                        print(f"  ✅ Page {page_idx} : {page_results} produits (total : {len(results)})")
                        time.sleep(random.uniform(3, 7))

                    except Exception as e:
                        print(f"  ❌ Erreur page {page_idx} : {e}")
                        break

                time.sleep(random.uniform(5, 10))
            browser.close()
        return results

    def export_to_csv(self, products, filename="aliexpress_cooling_pad.csv"): # MISE À JOUR ICI
        if not products: return
        keys = products[0].keys()
        with open(filename, "w", newline="", encoding="utf-8-sig") as f:
            writer = csv.DictWriter(f, fieldnames=keys)
            writer.writeheader()
            writer.writerows(products)
        print(f"💾 CSV exporté : {filename}")
