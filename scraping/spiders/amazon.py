import csv
import json
import time
import random
import re
from datetime import datetime
from playwright.sync_api import sync_playwright

class AmazonScraper:
    def __init__(self):
        self.base_url = "https://www.amazon.fr/s?k="
        self.source_name = "Amazon"

    def scrape(self, queries, max_pages=5):
        results = []
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=False) 
            context = browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                viewport={"width": 1920, "height": 1080},
                locale="fr-FR"
            )
            page = context.new_page()
            page.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")

            for query in queries:
                formatted_query = query.replace(" ", "+")
                
                for p_idx in range(1, max_pages + 1):
                    url = f"{self.base_url}{formatted_query}&page={p_idx}"
                    
                    try:
                        page.goto(url, wait_until="domcontentloaded", timeout=60000)
                        page.wait_for_timeout(random.randint(2000, 4000)) 
                        
                        page.evaluate("window.scrollTo(0, document.body.scrollHeight/2)")
                        page.wait_for_timeout(random.randint(1000, 2000))

                        items = page.query_selector_all('div[data-component-type="s-search-result"]')
                        
                        # Si aucun produit n'est trouvé, on passe au mot-clé suivant
                        if len(items) == 0:
                            break

                        for item in items:
                            title_el = item.query_selector('h2 a span') or item.query_selector('h2 span')
                            price_el = item.query_selector('.a-price .a-offscreen') 
                            link_el = item.query_selector('h2 a') or item.query_selector('a.a-link-normal.s-no-outline')

                            if title_el:
                                title = title_el.inner_text().strip()
                                short_title = (title[:45] + '...') if len(title) > 45 else title
                                
                                # --- EXTRACTION DU PRIX ET DE LA DEVISE ---
                                price_amount = "N/A"
                                currency = "N/A"
                                
                                if price_el:
                                    raw_price = price_el.inner_text().strip()
                                    if re.search(r'\d', raw_price):
                                        # Extrait uniquement les chiffres, virgules et points
                                        price_amount = re.sub(r'[^\d,.]', '', raw_price)
                                        
                                        # Extrait le symbole monétaire (ex: €, $)
                                        currency_match = re.search(r'[^\d,.\s]+', raw_price)
                                        if currency_match:
                                            currency = currency_match.group(0)
                                
                                # --- EXTRACTION DU LIEN ---
                                link = "N/A"
                                if link_el:
                                    href = link_el.get_attribute("href")
                                    if href:
                                        link = href if href.startswith('http') else "https://www.amazon.fr" + href

                                brand = title.split()[0] if title else "N/A"

                                results.append({
                                    "keyword": query,
                                    "title": title,
                                    "short_title": short_title,
                                    "price_amount": price_amount,
                                    "currency": currency,
                                    "brand": brand,
                                    "source": self.source_name,
                                    "link": link, 
                                    "date_scraped": datetime.now().strftime("%H:%M:%S")
                                })
                    except Exception as e:
                        # On passe silencieusement en cas d'erreur de timeout pour ne pas planter le script global
                        break
                    
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
