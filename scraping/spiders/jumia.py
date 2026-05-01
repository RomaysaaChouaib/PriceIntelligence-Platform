from datetime import datetime
import requests
#Librairie pour faire des requêtes HTTP
from bs4 import BeautifulSoup
#Sert à analyser le HTML (parser)
import time
#Pour faire des pauses (anti-blocage)
import re
import csv
from scraping.utils.headers import HEADERS
#Headers HTTP (simuler navigateur)
from scraping.utils.helpers import clean_price

class JumiaScraper:
    def __init__(self):
        self.base_url = "https://www.jumia.ma/catalog/"
        self.source_name = "Jumia"

    def generate_queries(self, query):
        related = {
            "laptop": [
    # =========================
    # Génériques FR
    # =========================
    "pc portable",
    "ordinateur portable",
    "portable ordinateur",
    "ultrabook",
    "chromebook",

    # =========================
    # Génériques EN
    # =========================
    "laptop",
    "gaming laptop",
    "business laptop",
    "student laptop",
    "notebook computer",
    "portable computer",
    "windows laptop",

    # =========================
    # Marques FR
    # =========================
    "pc portable hp",
    "pc portable lenovo",
    "pc portable dell",
    "pc portable asus",
    "pc portable acer",
    "pc portable msi",
    "pc portable huawei",

    # =========================
    # Marques EN
    # =========================
    "hp laptop",
    "lenovo laptop",
    "dell laptop",
    "asus laptop",
    "acer laptop",
    "msi laptop",
    "huawei laptop",
    "samsung laptop",

    # =========================
    # Apple
    # =========================
    "macbook",
    "macbook air",
    "macbook pro",
    "apple laptop",

    # =========================
    # Gaming
    # =========================
    "pc gamer",
    "laptop gaming",
    "gaming notebook",

    "asus rog",
    "asus tuf gaming",
    "lenovo legion",
    "hp omen",
    "hp victus",
    "acer nitro",
    "acer predator",
    "msi gaming laptop",
    "alienware laptop",

    # =========================
    # Business / Workstation
    # =========================
    "business laptop",
    "professional laptop",
    "workstation laptop",

    "hp elitebook",
    "hp probook",
    "hp zbook",

    "lenovo thinkpad",
    "lenovo thinkbook",

    "dell latitude",
    "dell vostro",
    "dell precision",

    # =========================
    # Séries populaires
    # =========================
    "lenovo ideapad",
    "lenovo yoga",

    "asus vivobook",
    "asus zenbook",
    "asus expertbook",

    "hp pavilion",
    "hp envy",
    "hp spectre",

    "dell inspiron",
    "dell xps",

    "acer aspire",
    "acer swift",
    "acer spin",

    # =========================
    # Desktop / Mini PC
    # =========================
    "desktop pc",
    "pc bureau",
    "ordinateur bureau",
    "mini pc",
    "all in one pc",
    "tower pc",

    # =========================
    # Reconditionné
    # =========================
    "refurbished laptop",
    "used laptop",
    "pc portable reconditionné",
    "laptop reconditionné",

    # =========================
    # CPU Queries
    # =========================
    "intel core i3 laptop",
    "intel core i5 laptop",
    "intel core i7 laptop",
    "intel core i9 laptop",

    "ryzen 3 laptop",
    "ryzen 5 laptop",
    "ryzen 7 laptop",

    "m1 macbook",
    "m2 macbook",

    # =========================
    # RAM / SSD
    # =========================
    "8gb ram laptop",
    "16gb ram laptop",
    "32gb ram laptop",

    "256gb ssd laptop",
    "512gb ssd laptop",
    "1tb ssd laptop",

    # =========================
    # Taille écran
    # =========================
    "14 inch laptop",
    "15.6 inch laptop",
    "17 inch laptop",

    # =========================
    # Usage
    # =========================
    "student laptop cheap",
    "developer laptop",
    "office laptop",
    "lightweight laptop",
    "2 in 1 laptop",
    "touchscreen laptop"
]
        }
        return related.get(query.lower(), [query])
    
    # Normalisation pour éviter les doublons (ex: "HP Laptop" vs "hp laptop")
    def _normalize_title(self, title):
        return re.sub(r"[^a-z0-9]", "", title.lower())

    def _get_with_retry(self, url, retries=3, backoff=2):
        for attempt in range(retries):
            try:
                response = requests.get(url, headers=HEADERS, timeout=10)
                if response.status_code == 200:
                    return response
                if response.status_code == 429: # trop de requete
                    wait = backoff * (attempt + 1) * 2
                    time.sleep(wait)
                    continue
            except Exception:
                time.sleep(backoff * (attempt + 1))
        return None

    def scrape(self, query, max_pages=50):
        products = []
        seen_links = set()
        seen_titles = set()

        pc_keywords = [
    "laptop", "notebook", "pc portable", "ordinateur portable",
    "ordinateur", "macbook", "ultrabook", "chromebook",

    # bureau
    "desktop", "pc bureau", "all in one", "mini pc",

    # gaming
    "gaming laptop", "gamer", "rog", "omen", "legion", "victus",

    # marques / séries
    "thinkpad", "ideapad", "vivobook", "zenbook",
    "pavilion", "inspiron", "latitude", "xps",
    "aspire", "swift", "elitebook", "probook"
]

        excluded = [
    # sacs
    "sac", "bag", "backpack", "cartable", "sacoche", "toploader",

    # stickers
    "sticker", "stickers", "autocollant", "autocollants", "skin", "decal",

    # souris clavier
    "souris", "mouse", "clavier", "keyboard",

    # charge
    "chargeur", "charger", "battery", "batterie", 'Hyper Station',


    # écran
    "écran", "ecran", "screen", "monitor",

    # protection
    "housse", "coque", "cover", "case",

    # support
    "support", "stand", "holder", "dock", "hub",

    # cables
    "cable", "câble", "adaptateur", "adapter",

    # audio
    "speaker", "haut parleur", "haut-parleur", "enceinte", "casque", "écouteur",

    # lampes
    "lampe", "lamp", "light",

    # stockage
    "disque dur", "hard drive", "hdd", "ssd externe",

    # autres
    "tablette", "smartphone", "tv", "projecteur", "webcam",'Manette','USB','usb','xbox','playstation'
    'Msi','PC Steam', 'Lenovo Legion','Legion','Asus ROG','ROG','HP Omen','Omen','Acer Predator','Predator',
    'notebook',
]

        queries = self.generate_queries(query)
        total_queries = len(queries)

        for q_idx, search_word in enumerate(queries, 1):
            print(f"\n[{q_idx}/{total_queries}] Recherche : '{search_word}'")
            pages_without_results = 0
            # Pagination
            for page in range(1, max_pages + 1):
                url = f"{self.base_url}?q={search_word}&page={page}"
                response = self._get_with_retry(url)

                if response is None: break

                # Parsing HTML
                soup = BeautifulSoup(response.text, "html.parser")
                items = soup.select("article.prd")

                if not items:
                    pages_without_results += 1
                    if pages_without_results >= 2: break
                    continue

                pages_without_results = 0
                new_on_page = 0
                # Extraction produit
                for item in items:
                    title_tag = item.select_one(".name")
                    price_tag = item.select_one(".prc")
                    link_tag = item.select_one("a.core")

                    if not title_tag or not price_tag: continue

                    title_text = title_tag.get_text(strip=True)
                    title_lower = " " + title_text.lower() + " "
                    price_val = clean_price(price_tag.get_text(strip=True))

                    is_pc = any(word in title_lower for word in pc_keywords)
                    is_bad = any(word in title_lower for word in excluded)

                    if is_pc and not is_bad and price_val >= 1200:
                        href = link_tag.get("href") if link_tag else ""
                        product_link = href if href.startswith("http") else "https://www.jumia.ma" + href

                        if product_link in seen_links: continue
                        norm_title = self._normalize_title(title_text)
                        if norm_title in seen_titles: continue

                        seen_links.add(product_link)
                        seen_titles.add(norm_title)

                        img_tag = item.select_one("img")
                        image_url = img_tag.get("data-src") or img_tag.get("src") or "" if img_tag else ""

                        # AJOUT DES CHAMPS DEMANDÉS
                        products.append({
                            "title": title_text,
                            "price": price_val,
                            "brand": title_text.split()[0] if title_text.split() else "Inconnu",
                            "source": self.source_name,
                            "link": product_link,
                            "image": image_url,
                            "search_query": search_word,
                            "page": page,
                            "is_gaming": "gaming" in title_text.lower(),
                            "date_scraped": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                        })
                        new_on_page += 1

                print(f"  Page {page} : {new_on_page} nouveaux | Total : {len(products)}")
                time.sleep(0.5 if new_on_page == 0 else 1.0)

        return products
    
    def export_to_csv(self, products, filename="jumia_laptops.csv"):
        if not products:
            print("Aucun produit à exporter.")
            return
        
        keys = products[0].keys()
        with open(filename, 'w', newline='', encoding='utf-8-sig') as f:
            dict_writer = csv.DictWriter(f, fieldnames=keys)
            dict_writer.writeheader()
            dict_writer.writerows(products)
        print(f"\nExportation réussie : {filename} ({len(products)} produits)")


"""
query → generate_queries
      → pages
      → request (headers)
      → parse HTML
      → filter produits
      → remove duplicates
      → store products
      → export CSV / DB
"""