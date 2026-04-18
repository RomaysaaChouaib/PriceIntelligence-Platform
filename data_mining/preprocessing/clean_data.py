# data_mining/preprocessing/clean_data.py

import pandas as pd
import re

EXCLUDED_KEYWORDS = [
    "souris", "mouse", "sac", "bag", "accessoire", "clavier", "keyboard",
    "ecran", "écran", "moniteur", "webcam", "casque", "headset", "imprimante",
    "printer", "stylet", "hub usb", "refroidisseur", "cooling pad",
]

PRICE_CENTIMES_THRESHOLD = 100_000
PRICE_MIN = 500
PRICE_MAX = 200_000


def fix_jumia_price(price: float) -> float:
    """Corrige les prix Jumia exprimés en centimes."""
    if price > PRICE_CENTIMES_THRESHOLD:
        price = price / 100
    return price


def is_excluded(title: str) -> bool:
    """Retourne True si le produit doit être filtré (accessoire non-PC)."""
    t = title.lower()
    return any(kw in t for kw in EXCLUDED_KEYWORDS)


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
    before = len(df)
    df.drop_duplicates(subset=["title", "price"], inplace=True)
    print(f"  [clean] Doublons supprimés : {before - len(df)}")

    # 2. Filtrer accessoires
    mask_excl = df["title"].apply(is_excluded)
    df = df[~mask_excl]
    print(f"  [clean] Accessoires filtrés : {mask_excl.sum()}")

    # 3. Convertir prix en numérique
    df["price"] = pd.to_numeric(df["price"], errors="coerce")
    df.dropna(subset=["price"], inplace=True)

    # 4. Corriger prix Jumia (centimes → MAD)
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
