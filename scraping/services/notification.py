# scraping/services/notification.py

def check_price_drop(product_title, current_scraped_price, stored_db_price, currency="EUR", link="", source=""):
    current = float(current_scraped_price)
    stored = float(stored_db_price)

    if current < stored and current > 0:
        diff = stored - current
        percentage = (diff / stored) * 100
        
        # On retourne l'objet de l'alerte au lieu de juste True
        return {
            "title": product_title,
            "old_price": round(stored, 2),
            "new_price": round(current, 2),
            "currency": currency,
            "diff": round(diff, 2),
            "percentage": round(percentage, 1),
            "link": link,
            "source": source
        }
    return None