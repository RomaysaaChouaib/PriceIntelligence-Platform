# data_mining/preprocessing/feature_engineering.py

import pandas as pd
import re

# Marques connues (ordre important : les plus spécifiques en premier)
BRAND_PATTERNS = {
    "Apple":   r"\bapple\b|\bmacbook\b|\bmac\b",
    "HP":      r"\bhp\b|\belitebook\b|\bprobook\b|\bomen\b|\bvictus\b|\benvy\b|\bpavillon\b|\bpavilion\b",
    "Dell":    r"\bdell\b|\blatitude\b|\bvostro\b|\bxps\b|\binspiro[n]?\b",
    "Lenovo":  r"\blenovo\b|\bthinkpad\b|\bideapad\b|\blegion\b|\byoga\b",
    "Asus":    r"\basus\b|\brog\b|\bvivobook\b|\bzenbook\b|\bexpertbook\b",
    "Acer":    r"\bacer\b|\baspire\b|\bswift\b|\bpredator\b|\bnitro\b",
    "MSI":     r"\bmsi\b|\bmodern\b|\bcreator\b",
    "Samsung": r"\bsamsung\b",
    "Toshiba": r"\btoshiba\b|\bdynabook\b",
    "Huawei":  r"\bhuawei\b|\bmatebook\b",
    "Microsoft": r"\bmicrosoft\b|\bsurface\b",
}


def detect_brand(title: str, brand_col: str = "") -> str:
    """Détecte la marque à partir du titre ou de la colonne brand."""
    t = title.lower()
    for brand, pattern in BRAND_PATTERNS.items():
        if re.search(pattern, t):
            return brand
    # Fallback sur la colonne brand existante
    if brand_col and isinstance(brand_col, str) and len(brand_col) > 1:
        return brand_col.strip().title()
    return "Autre"


def extract_ram(title: str) -> int | None:
    """Extrait la RAM en Go depuis le titre."""
    patterns = [
        r'(\d+)\s*go\b',
        r'(\d+)\s*gb\b',
        r'(\d+)\s*g\s+ram',
        r'ram\s*(\d+)',
    ]
    t = title.lower()
    for pat in patterns:
        m = re.search(pat, t)
        if m:
            val = int(m.group(1))
            if val in (2, 4, 8, 12, 16, 24, 32, 48, 64):
                return val
    return None


def extract_storage(title: str) -> int | None:
    """Extrait le stockage en Go depuis le titre."""
    t = title.lower()
    # SSD/HDD en To
    m = re.search(r'(\d+)\s*to\b', t)
    if m:
        return int(m.group(1)) * 1000
    # SSD/HDD en Go
    m = re.search(r'(\d+)\s*(?:go|gb)\s*(?:ssd|hdd|nvme|emmc)', t)
    if m:
        return int(m.group(1))
    m = re.search(r'(?:ssd|hdd|nvme)\s*(\d+)\s*(?:go|gb)', t)
    if m:
        return int(m.group(1))
    return None


def price_category(price: float) -> str:
    """Catégorie de prix adaptée au marché marocain."""
    if price < 4000:
        return "entrée_de_gamme"
    elif price < 8000:
        return "milieu_de_gamme_bas"
    elif price < 15000:
        return "milieu_de_gamme"
    elif price < 25000:
        return "haut_de_gamme"
    else:
        return "premium"


def is_gaming_title(title: str) -> bool:
    """Détecte si le produit est gaming depuis le titre."""
    gaming_kw = ["gaming", "gamer", "game", "rog", "predator", "nitro",
                 "legion", "omen", "victus", "tuf", "g15", "g14", "rtx", "gtx"]
    t = title.lower()
    return any(kw in t for kw in gaming_kw)


def add_features_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """
    Ajoute des features dérivées au DataFrame :
      - brand_detected : marque normalisée
      - ram_gb         : RAM en Go (si extractable)
      - storage_gb     : Stockage en Go (si extractable)
      - price_category : catégorie de gamme
      - is_gaming      : booléen gaming (fusionné titre + colonne)
      - log_price      : log10 du prix (pour clustering)
      - price_per_gb_ram : ratio prix/RAM
    """
    df = df.copy()

    brand_col = df["brand"] if "brand" in df.columns else pd.Series([""] * len(df))

    df["brand_detected"] = [
        detect_brand(t, b) for t, b in zip(df["title"], brand_col)
    ]
    df["ram_gb"]       = df["title"].apply(extract_ram)
    df["storage_gb"]   = df["title"].apply(extract_storage)
    df["price_category"] = df["price"].apply(price_category)

    is_gaming_from_title = df["title"].apply(is_gaming_title)
    if "is_gaming" in df.columns:
        df["is_gaming"] = df["is_gaming"] | is_gaming_from_title
    else:
        df["is_gaming"] = is_gaming_from_title

    import numpy as np
    df["log_price"] = np.log10(df["price"].clip(lower=1))

    df["price_per_gb_ram"] = df.apply(
        lambda r: r["price"] / r["ram_gb"] if pd.notna(r["ram_gb"]) and r["ram_gb"] > 0 else None,
        axis=1
    )

    return df


def add_features(products: list) -> list:
    """Version liste-de-dicts pour compatibilité pipeline existant."""
    for p in products:
        price = p.get("price", 0)
        title = p.get("title", "")
        brand = p.get("brand", "")

        p["price_category"] = price_category(price)
        p["brand_detected"] = detect_brand(title, brand)
        p["ram_gb"]          = extract_ram(title)
        p["storage_gb"]      = extract_storage(title)
        p["is_gaming"]       = bool(p.get("is_gaming", False)) or is_gaming_title(title)

    return products
