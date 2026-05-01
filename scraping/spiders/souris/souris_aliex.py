import csv
import json
import time
import random
import re
from datetime import datetime
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout

class SourisAliexpressScraper:
    def __init__(self):
        self.base_url = "https://fr.aliexpress.com/wholesale?SearchText="
        self.source_name = "AliExpress"

    # ------------------------------------------------------------------
    # QUERIES
    # ------------------------------------------------------------------
    def generate_queries(self, query):
        if isinstance(query, list):
            return query

        # Dictionnaire adapté pour les souris
        related = {
            "souris": [
                "souris", 
                "souris gamer",
                "souris sans fil",
                "souris filaire",
                "souris bluetooth",
                "souris ergonomique",
                "souris verticale",
                "souris silencieuse",
                "souris rechargeable",
                "mini souris",
                "souris logitech",
                "logitech mx master",
                "logitech g502",
                "souris razer",
                "razer deathadder",
                "souris corsair",
                "souris steelseries",
                "souris zelotes", 
                "souris redragon", 
                "souris delux", 
                "souris rgb",
                "souris legere",
                "souris mmo",
                "souris 10000 dpi",
                "souris honeycomb"
            ]
        }
        return related.get(query.lower().strip(), [query])

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
    def scrape(self, base_query, max_pages=10):
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
                formatted_query = query.replace(" ", "+")
                search_word = query # Pour correspondre à ton append
                print(f"\n🔍 Requête : «{query}»")
                consecutive_fails = 0

                for page_idx in range(1, max_pages + 1):
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

                            # --- PRIX ---
                            price_val = 0.0 
                            currency = "inconnu" # Par défaut
                            
                            price_el = item.query_selector('[class*="price"], .lw_lm, [class*="multi--price"]')
                            if price_el:
                                raw_price = price_el.inner_text().strip()
                                clean_price = re.sub(r'[^\d.,]', '', raw_price)
                                
                                if clean_price:
                                    if ',' in clean_price and '.' in clean_price:
                                        if clean_price.rfind(',') > clean_price.rfind('.'):
                                            clean_price = clean_price.replace('.', '').replace(',', '.')
                                        else:
                                            clean_price = clean_price.replace(',', '')
                                    elif ',' in clean_price:
                                        clean_price = clean_price.replace(',', '.')
                                    
                                    try:
                                        price_val = float(clean_price)
                                    except ValueError:
                                        price_val = 0.0
                                
                                if 'MAD' in raw_price: currency = 'MAD'
                                elif '$' in raw_price or 'USD' in raw_price: currency = 'USD'
                                else: currency = "inconnu" # Par défaut

                            # --- ANCIEN PRIX (OLD PRICE) ---
                            old_price_val = None
                            old_price_el = item.query_selector('span[class*="original-price"], div[class*="discount"], [class*="oldPrice"]')
                            if old_price_el:
                                raw_old_price = old_price_el.inner_text().strip()
                                clean_old_price = re.sub(r'[^\d.,]', '', raw_old_price)
                                if clean_old_price:
                                    if ',' in clean_old_price and '.' in clean_old_price:
                                        if clean_old_price.rfind(',') > clean_old_price.rfind('.'):
                                            clean_old_price = clean_old_price.replace('.', '').replace(',', '.')
                                        else:
                                            clean_old_price = clean_old_price.replace(',', '')
                                    elif ',' in clean_old_price:
                                        clean_old_price = clean_old_price.replace(',', '.')
                                    try:
                                        old_price_val = float(clean_old_price)
                                    except ValueError:
                                        old_price_val = None

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

                            # --- INSERTION (FORMAT DEMANDÉ) ---
                            results.append({
                                "title": title_text,
                                "price": price_val,
                                "old_price": old_price_val,
                                "currency": currency,  # Dynamique, par défaut inconnu
                                "brand": title_text.split()[0] if title_text.split() else "Inconnu",
                                "category": "mouse",
                                "source": self.source_name,
                                "link": product_link,
                                "image": image_url,
                                "search_query": search_word,
                                "page": page_idx,
                                "in_stock": True, # Hardcodé à True par défaut comme demandé
                                "is_gaming": any(g in title_lower for g in ["gaming", "gamer"]),
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

    def export_to_csv(self, products, filename="resultats_aliexpress.csv"):
        if not products: return
        keys = products[0].keys()
        with open(filename, "w", newline="", encoding="utf-8-sig") as f:
            writer = csv.DictWriter(f, fieldnames=keys)
            writer.writeheader()
            writer.writerows(products)
        print(f"💾 CSV exporté : {filename}")


