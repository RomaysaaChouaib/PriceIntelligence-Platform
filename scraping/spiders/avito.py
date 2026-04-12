import requests
from bs4 import BeautifulSoup

from scraping.utils.headers import HEADERS
from scraping.utils.helpers import clean_price

def scrape_avito(query):
    url = f"https://www.avito.ma/fr/maroc/achat-vente?q={query}"

    try:
        response = requests.get(url, headers=HEADERS, timeout=10)
        print("Status Code:", response.status_code)

        soup = BeautifulSoup(response.text, "html.parser")

        # Chaque annonce est dans un bloc avec data-testid="listing"
        items = soup.select("div[data-testid='listing']")
        print("Produits trouvés:", len(items))

        products = []

        for item in items[:20]:
            title = ""
            price = ""
            product_link = ""
            image_url = ""

            # Titre
            title_tag = item.select_one("h2")
            if title_tag:
                title = title_tag.get_text(strip=True)

            # Prix
            price_tag = item.select_one("span[data-testid='price']")
            if price_tag:
                price = price_tag.get_text(strip=True)

            # Lien du produit
            link_tag = item.select_one("a")
            if link_tag and link_tag.get("href"):
                product_link = "https://www.avito.ma" + link_tag.get("href")

            # Image
            img_tag = item.select_one("img")
            if img_tag and (img_tag.get("src") or img_tag.get("data-src")):
                image_url = img_tag.get("src") or img_tag.get("data-src")

            if title and price:
                products.append({
                    "title": title,
                    "price": clean_price(price),
                    "source": "Avito",
                    "link": product_link,
                    "rating": None,              # Avito n’a pas de système d’étoiles
                    "reviews_count": None,       # pas d’avis
                    "image": image_url
                })

        return products

    except Exception as e:
        print("Erreur :", e)
        return []
