import re


def clean_price(price_text):
    """Nettoie le prix Jumia (ex: '12 500,00 MAD' -> 12500)"""
    if not price_text:
        return 0
    
    # Garde uniquement les chiffres
    cleaned = re.sub(r'[^\d]', '', price_text)
    
    try:
        return int(cleaned)
    except:
        return 0