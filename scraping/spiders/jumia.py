import requests
from bs4 import BeautifulSoup
import time

from scraping.utils.headers import HEADERS
from scraping.utils.helpers import clean_price

def scrape_product_details(product_url):
    """Scrape rating et nombre d'avis depuis la page produit Jumia"""
    try:
        response = requests.get(product_url, headers=HEADERS, timeout=10)
        soup = BeautifulSoup(response.text, "html.parser")

        rating = None
        reviews_count = None

        # Note (souvent dans un bloc avec étoiles)
        rating_tag = soup.select_one(".stars._s")
        if rating_tag:
            rating = rating_tag.get("data-rating") or rating_tag.get_text(strip=True)

        # Nombre d’avis
        reviews_tag = soup.select_one(".rev")
        if reviews_tag:
            reviews_count = reviews_tag.get_text(strip=True)

        return rating, reviews_count
    except Exception:
        return None, None

def scrape_jumia(query, details_count=5):
    url = f"https://www.jumia.ma/catalog/?q={query}"

    try:
        response = requests.get(url, headers=HEADERS, timeout=10)
        print("Status Code:", response.status_code)

        soup = BeautifulSoup(response.text, "html.parser")

        items = soup.select("article.prd")
        print("Produits trouvés:", len(items))

        products = []

        for idx, item in enumerate(items[:20]):
            title = ""
            price = ""
            product_link = ""
            rating = None
            reviews_count = None
            image_url = ""

            # Titre
            title_tag = item.select_one(".name")
            if title_tag:
                title = title_tag.get_text(strip=True)

            # Prix
            price_tag = item.select_one(".prc")
            if price_tag:
                price = price_tag.get_text(strip=True)

            # Lien du produit
            link_tag = item.select_one("a")
            if link_tag and link_tag.get("href"):
                product_link = "https://www.jumia.ma" + link_tag.get("href")

            # Image
            img_tag = item.select_one("img")
            if img_tag and img_tag.get("data-src"):
                image_url = img_tag.get("data-src")

            # Pour les N premiers produits, on va chercher rating et reviews
            if idx < details_count and product_link:
                rating, reviews_count = scrape_product_details(product_link)
                time.sleep(1)  # éviter trop de requêtes rapides

            if title and price:
                products.append({
                    "title": title,
                    "price": clean_price(price),
                    "source": "Jumia",
                    "link": product_link,
                    "rating": rating,
                    "reviews_count": reviews_count,
                    "image": image_url
                })

        return products

    except Exception as e:
        print("Erreur :", e)
        return []
