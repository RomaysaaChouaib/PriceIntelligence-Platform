# data_mining/preprocessing/clean_data.py

import pandas as pd
import re

EXCLUDED_KEYWORDS = [
    "souris",
    "clavier", "keyboard",
    "webcam", "casque", "headset",
    "imprimante", "printer",
    "stylet", "hub usb",
    "refroidisseur", "cooling pad",
    "moniteur",
]

PRICE_CENTIMES_THRESHOLD = 100_000
PRICE_MIN = 500
PRICE_MAX = 200_000


# Taux de conversion approximatifs en MAD
CONVERSION_RATES = {
    'USD': 10.0,   # 1$ = ~10 MAD
    'EUR': 11.0,   # 1€ = ~11 MAD
    'GBP': 13.0,   # 1£ = ~13 MAD
    'MAD': 1.0,
}

def convert_to_mad(price: float, currency: str) -> float:
    """Convertit le prix en MAD selon la devise."""
    if not currency:
        return price
    currency = str(currency).strip().upper()
    rate = CONVERSION_RATES.get(currency, 1.0)
    return price * rate


def is_excluded(title: str) -> bool:
    """Filtre les accessoires — garde tout ce qui contient laptop/ordinateur."""
    t = title.lower().strip()
    
    # Si le titre contient un mot laptop → toujours garder
    laptop_keywords = [
        'laptop', 'ordinateur', 'notebook', 'pc portable', 
        'computer', 'chromebook', 'ultrabook', 'macbook'
    ]
    if any(kw in t for kw in laptop_keywords):
        return False  # ← garder ce produit
    
    # Sinon filtrer si contient un mot accessoire
    accessoire_keywords = [
        'souris', 'clavier', 'keyboard', 'webcam', 'casque',
        'headset', 'imprimante', 'printer', 'refroidisseur',
        'cooling pad', 'moniteur', 'hub usb', 'stylet',
    ]
    return any(kw in t for kw in accessoire_keywords)

def normalize_title(title: str) -> str:
    """Nettoie et normalise un titre produit."""
    title = title.strip()
    title = re.sub(r'\s+', ' ', title)
    return title


def clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """
    Nettoie un DataFrame issu du scraping Jumia.
    Retourne un DataFrame propre prêt pour le feature engineering.
    """
    df = df.copy()

    # 1. Supprimer doublons
# 1. Supprimer doublons (on garde les produits avec liens différents)
    before = len(df)
    df.drop_duplicates(subset=["title", "price", "link"], inplace=True)
    print(f"  [clean] Doublons supprimés : {before - len(df)}")

    # 2. Filtrer accessoires
    mask_excl = df["title"].apply(is_excluded)
    df = df[~mask_excl]
    print(f"  [clean] Accessoires filtrés : {mask_excl.sum()}")

    # 3. Convertir prix en numérique
    df["price"] = pd.to_numeric(df["price"], errors="coerce")
    df.dropna(subset=["price"], inplace=True)

    # 4. Convertir prix selon devise
    if "currency" in df.columns:
        df["price"] = df.apply(
            lambda row: convert_to_mad(row["price"], row.get("currency")), axis=1
        )
    else:
        df["price"] = df["price"].apply(fix_jumia_price)

    # 5. Filtrer prix hors plage réaliste
    mask_price = (df["price"] >= PRICE_MIN) & (df["price"] <= PRICE_MAX)
    removed = (~mask_price).sum()
    df = df[mask_price]
    print(f"  [clean] Prix hors plage filtrés : {removed}")

    # 6. Normaliser titres
    df["title"] = df["title"].apply(normalize_title)

    # 7. Conversions types
    if "is_gaming" in df.columns:
        df["is_gaming"] = df["is_gaming"].astype(bool)
    if "date_scraped" in df.columns:
        df["date_scraped"] = pd.to_datetime(df["date_scraped"], errors="coerce")

    df.reset_index(drop=True, inplace=True)
    print(f"  [clean] Produits restants : {len(df)}")
    return df


def clean_data(products: list) -> list:
    """Version liste-de-dicts pour compatibilité pipeline existant."""
    cleaned = []
    for p in products:
        title = str(p.get("title", "")).strip()
        price = p.get("price", None)

        if is_excluded(title):
            continue
        if price is None:
            continue

        try:
            price = float(price)
        except (ValueError, TypeError):
            continue

        price = fix_jumia_price(price)

        if not (PRICE_MIN <= price <= PRICE_MAX):
            continue

        cleaned.append({**p, "title": normalize_title(title), "price": price})

    return cleaned
