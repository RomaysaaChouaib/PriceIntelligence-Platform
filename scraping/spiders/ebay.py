import requests
from bs4 import BeautifulSoup
import time

from scraping.utils.headers import HEADERS
from scraping.utils.helpers import clean_price

def scrape_product_details(product_url):
    """Scrape rating et nombre d'avis depuis la page produit Ebay"""
    try:
        response = requests.get(product_url, headers=HEADERS, timeout=10)
        soup = BeautifulSoup(response.text, "html.parser")

        rating = None
        reviews_count = None

        rating_tag = soup.select_one(".x-star-rating span")
        if rating_tag:
            rating = rating_tag.get_text(strip=True)

        reviews_tag = soup.select_one(".prodreview")
        if reviews_tag:
            reviews_count = reviews_tag.get_text(strip=True)

        return rating, reviews_count
    except Exception:
        return None, None

def scrape_ebay(query, details_count=5):
    url = f"https://www.ebay.com/sch/i.html?_nkw={query}"

    try:
        response = requests.get(url, headers=HEADERS, timeout=10)
        print("Status Code:", response.status_code)

        soup = BeautifulSoup(response.text, "html.parser")
        items = soup.select(".s-item")
        print("Produits trouvés:", len(items))

        products = []

        for idx, item in enumerate(items[:20]):
            title = ""
            price = ""
            product_link = ""
            rating = None
            reviews_count = None
            image_url = ""

            title_tag = item.select_one(".s-item__title")
            if title_tag:
                title = title_tag.get_text(strip=True)

            price_tag = item.select_one(".s-item__price")
            if price_tag:
                price = price_tag.get_text(strip=True)

            link_tag = item.select_one("a.s-item__link")
            if link_tag and link_tag.get("href"):
                product_link = link_tag.get("href")

            img_tag = item.select_one(".s-item__image-img")
            if img_tag and img_tag.get("src"):
                image_url = img_tag.get("src")

            if idx < details_count and product_link:
                rating, reviews_count = scrape_product_details(product_link)
                time.sleep(1)

            if title and price:
                products.append({
                    "title": title,
                    "price": clean_price(price),
                    "source": "Ebay",
                    "link": product_link,
                    "rating": rating,
                    "reviews_count": reviews_count,
                    "image": image_url
                })

        return products

    except Exception as e:
        print("Erreur :", e)
        return []
