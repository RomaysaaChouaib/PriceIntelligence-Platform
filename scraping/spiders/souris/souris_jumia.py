from datetime import datetime
from django.core.cache import cache
import requests
from bs4 import BeautifulSoup
import time
import re
import csv
import hashlib
# Assure-toi que ces imports fonctionnent selon ta structure de dossier
from scraping.utils.headers import HEADERS
from scraping.utils.helpers import clean_price

class SourisJumiaScraper:
    def __init__(self):
        self.base_url = "https://www.jumia.ma/catalog/"
        self.source_name = "Jumia"

    def generate_queries(self, query):
        related = {
            "souris": [
               "souris pc",
                "souris ordinateur",
                "souris sans fil",
                "souris filaire",
                "souris usb",
                "souris bluetooth",
                "souris gamer",
                "souris gaming",
                "gaming mouse",
                "rgb mouse",
                "mouse gamer rgb",
                "hp mouse",
                "dell mouse",
                "razer mouse",
                "trust mouse",
                "havit mouse",
                "asus mouse",
                "lenovo mouse",
                "souris hp",
                "souris dell",
                "souris asus",
                "souris lenovo",
                "silent mouse",
                "ergonomic mouse",
                "vertical mouse",
                "portable mouse",
                "souris silencieuse",
                "souris ergonomique",
                "souris verticale",
                "souris portable"

            ]
        }
        return related.get(query.lower(), [query])

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

    def scrape(self, query, max_pages=10): # Ajusté à 10 pages pour test, tu peux remettre 50
        products = []
        seen_links = set()
        seen_titles = set()

        pc_keywords = ["souris", "mouse"]
        excluded = [
            "tapis", "mouse pad", "mousepad", "sticker", "autocollant", 
            "capteur", "switch", "bouton", "pièce", "cable", "câble", "hub"
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
                    
                    # Nouveaux sélecteurs pour les promos
                    old_price_tag = item.select_one(".old")
                    discount_tag = item.select_one(".tag._dsct")

                    if not title_tag or not price_tag:
                        continue

                    title_text = title_tag.get_text(strip=True)
                    price_val = clean_price(price_tag.get_text(strip=True))
                    
                    # Nettoyage des prix barrés
                    old_price_val = clean_price(old_price_tag.get_text(strip=True)) if old_price_tag else None
                    discount_text = discount_tag.get_text(strip=True) if discount_tag else None

                    title_lower = title_text.lower()
                    is_pc = any(word in title_lower for word in pc_keywords)
                    is_bad = any(word in title_lower for word in excluded)

                    # Filtre de prix corrigé à 30 DH minimum pour les souris
                    if is_pc and not is_bad and price_val >= 30:
                        
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

                        # Génération d'un ID unique stable basé sur l'URL
                        product_id = hashlib.md5(product_link.encode()).hexdigest()

                        products.append({
                            "product_id": product_id,
                            "title": title_text,
                            "price": price_val,
                            "old_price": old_price_val,
                            "discount": discount_text,
                            "brand": title_text.split()[0] if title_text.split() else "Inconnu",
                            "category": "mouse",
                            "source": self.source_name,
                            "link": product_link,
                            "image": image_url,
                            "search_query": search_word,
                            "page": page,
                            "in_stock": True,
                            "is_gaming": any(g in title_lower for g in ["gaming", "gamer"]),
                            "date_scraped": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                        })
                        new_on_page += 1

                print(f"  Page {page} : {new_on_page} nouveaux | Total : {len(products)}")
                if new_on_page == 0: break # Si aucun nouveau produit sur la page, on passe à la recherche suivante
                time.sleep(1)

        return products

    def export_to_csv(self, products, filename="jumia_souris.csv"):
        if not products:
            print("Aucun produit à exporter.")
            return

        keys = products[0].keys()
        with open(filename, 'w', newline='', encoding='utf-8-sig') as f:
            dict_writer = csv.DictWriter(f, fieldnames=keys)
            dict_writer.writeheader()
            dict_writer.writerows(products)
        print(f"\nExportation réussie : {filename}")
