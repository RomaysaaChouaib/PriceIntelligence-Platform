# data_mining/preprocessing/feature_engineering.py

import pandas as pd
import numpy as np
import re

# Marques connues
BRAND_PATTERNS = {
    "Apple":     r"\bapple\b|\bmacbook\b|\bmac\b",
    "HP":        r"\bhp\b|\belitebook\b|\bprobook\b|\bomen\b|\bvictus\b|\benvy\b|\bpavillon\b|\bpavilion\b",
    "Dell":      r"\bdell\b|\blatitude\b|\bvostro\b|\bxps\b|\binspiro[n]?\b",
    "Lenovo":    r"\blenovo\b|\bthinkpad\b|\bideapad\b|\blegion\b|\byoga\b",
    "Asus":      r"\basus\b|\brog\b|\bvivobook\b|\bzenbook\b|\bexpertbook\b",
    "Acer":      r"\bacer\b|\baspire\b|\bswift\b|\bpredator\b|\bnitro\b",
    "MSI":       r"\bmsi\b|\bmodern\b|\bcreator\b",
    "Samsung":   r"\bsamsung\b",
    "Toshiba":   r"\btoshiba\b|\bdynabook\b",
    "Huawei":    r"\bhuawei\b|\bmatebook\b",
    "Microsoft": r"\bmicrosoft\b|\bsurface\b",
    "Xiaomi":    r"\bxiaomi\b|\bmi\s+notebook\b|\bredmibook\b",
    "Gpd":       r"\bgpd\b",
}


def detect_brand(title: str, brand_col: str = "") -> str:
    t = title.lower()
    for brand, pattern in BRAND_PATTERNS.items():
        if re.search(pattern, t):
            return brand
    if brand_col and isinstance(brand_col, str) and len(brand_col) > 1:
        return brand_col.strip().title()
    return "Autre"


def extract_ram(title: str) -> int | None:
    patterns = [
        r'(\d+)\s*go\b',
        r'(\d+)\s*gb\b',
        r'(\d+)\s*g\s+ram',
        r'ram\s*(\d+)',
        r'(\d+)g\b',
    ]
    t = title.lower()
    for pat in patterns:
        m = re.search(pat, t)
        if m:
            val = int(m.group(1))
            if val in (2, 4, 6, 8, 12, 16, 24, 32, 48, 64):
                return val
    return None


def extract_storage(title: str) -> int | None:
    t = title.lower()
    m = re.search(r'(\d+)\s*to\b', t)
    if m:
        return int(m.group(1)) * 1000
    m = re.search(r'(\d+)\s*(?:go|gb)\s*(?:ssd|hdd|nvme|emmc)', t)
    if m:
        return int(m.group(1))
    m = re.search(r'(?:ssd|hdd|nvme)\s*(\d+)\s*(?:go|gb)', t)
    if m:
        return int(m.group(1))
    # Stockage seul (ex: "256Go")
    m = re.search(r'(\d+)\s*(?:go|gb)', t)
    if m:
        val = int(m.group(1))
        if val in (32, 64, 128, 256, 512, 1000, 2000):
            return val
    return None


def extract_storage_type(title: str) -> str:
    """Détecte le type de stockage : SSD, HDD ou Inconnu."""
    t = title.lower()
    if re.search(r'\bssd\b|\bnvme\b|\bemmc\b', t):
        return 'SSD'
    if re.search(r'\bhdd\b|\bdisque dur\b', t):
        return 'HDD'
    return 'Inconnu'


def extract_cpu_score(title: str) -> int:
    """
    Convertit le CPU en score numérique pour le clustering.
    Plus le score est élevé, plus le CPU est puissant.
    """
    t = title.lower()

    # Intel Core
    if re.search(r'\bi9\b|core\s*i9', t):   return 9
    if re.search(r'\bi7\b|core\s*i7', t):   return 7
    if re.search(r'\bi5\b|core\s*i5', t):   return 5
    if re.search(r'\bi3\b|core\s*i3', t):   return 3

    # AMD Ryzen
    if re.search(r'ryzen\s*9', t):          return 9
    if re.search(r'ryzen\s*7', t):          return 7
    if re.search(r'ryzen\s*5', t):          return 5
    if re.search(r'ryzen\s*3', t):          return 3

    # Apple Silicon
    if re.search(r'\bm3\s*(pro|max|ultra)\b', t): return 9
    if re.search(r'\bm2\s*(pro|max|ultra)\b', t): return 8
    if re.search(r'\bm1\s*(pro|max|ultra)\b', t): return 7
    if re.search(r'\bm[123]\b', t):               return 6

    # Celeron / Pentium / Atom (bas de gamme)
    if re.search(r'\bceleron\b|\bpentium\b|\batom\b|\bn\d{4}\b', t): return 1

    return 0  # Inconnu


def extract_cpu_generation(title: str) -> int | None:
    """Extrait la génération du processeur Intel."""
    t = title.lower()
    patterns = [
        r'(\d+)[eèéúþ]+me?\s*g[eé]n',
        r'(\d+)th\s*gen',
        r'(\d+)e\s*gen',
        r'generation\s*(\d+)',
        r'gen\s*(\d+)',
        r'-(\d+)(?:th|[eè]me)',
    ]
    for pat in patterns:
        m = re.search(pat, t)
        if m:
            val = int(m.group(1))
            if 4 <= val <= 14:
                return val
    return None


def has_dedicated_gpu(title: str) -> bool:
    """Détecte si le laptop a une carte graphique dédiée."""
    t = title.lower()
    return bool(re.search(
        r'\brtx\b|\bgtx\b|\bradeon\s*rx\b|\brx\s*\d+\b|\bgeforce\b|\bnvidia\b|\bamd\s*gpu\b',
        t
    ))


def is_tactile(title: str) -> bool:
    """Détecte si le laptop est tactile."""
    t = title.lower()
    return bool(re.search(r'\btactile\b|\btouch\b|\btouchscreen\b', t))


def is_refurbished(title: str) -> bool:
    """Détecte si le laptop est reconditionné."""
    t = title.lower()
    return bool(re.search(r'\bremis\b|\brecondition\b|\brefurb\b|\bneuf\b|\brenew\b', t))


def price_category(price: float) -> str:
    if price < 3000:    return "entrée_de_gamme"
    elif price < 7000:  return "milieu_de_gamme_bas"
    elif price < 12000: return "milieu_de_gamme"
    elif price < 22000: return "haut_de_gamme"
    else:               return "premium"


def is_gaming_title(title: str) -> bool:
    gaming_kw = ["gaming", "gamer", "game", "rog", "predator", "nitro",
                 "legion", "omen", "victus", "tuf", "g15", "g14", "rtx", "gtx"]
    t = title.lower()
    return any(kw in t for kw in gaming_kw)


def ram_category(ram: int | None) -> str:
    """Catégorie RAM pour le clustering usage."""
    if ram is None:    return "Inconnu"
    if ram <= 4:       return "Basique (≤4GB)"
    if ram <= 8:       return "Standard (8GB)"
    if ram <= 16:      return "Performant (16GB)"
    return "Haute perf (≥32GB)"


def add_features_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """
    Ajoute toutes les features dérivées au DataFrame :
    - brand_detected   : marque normalisée
    - ram_gb           : RAM en Go
    - storage_gb       : Stockage en Go
    - storage_type     : SSD / HDD / Inconnu
    - cpu_score        : score CPU (1-9)
    - cpu_generation   : génération Intel
    - has_gpu          : GPU dédié (bool)
    - is_tactile       : écran tactile (bool)
    - is_refurbished   : reconditionné (bool)
    - price_category   : catégorie de gamme
    - ram_category     : catégorie RAM
    - is_gaming        : booléen gaming
    - log_price        : log10 du prix
    - price_per_gb_ram : ratio prix/RAM
    """
    df = df.copy()

    brand_col = df["brand"] if "brand" in df.columns else pd.Series([""] * len(df))

    df["brand_detected"]  = [detect_brand(t, b) for t, b in zip(df["title"], brand_col)]
    df["ram_gb"]          = df["title"].apply(extract_ram)
    df["storage_gb"]      = df["title"].apply(extract_storage)
    df["storage_type"]    = df["title"].apply(extract_storage_type)
    df["cpu_score"]       = df["title"].apply(extract_cpu_score)
    df["cpu_generation"]  = df["title"].apply(extract_cpu_generation)
    df["has_gpu"]         = df["title"].apply(has_dedicated_gpu)
    df["is_tactile"]      = df["title"].apply(is_tactile)
    df["is_refurbished"]  = df["title"].apply(is_refurbished)
    df["price_category"]  = df["price"].apply(price_category)
    df["ram_category"]    = df["ram_gb"].apply(ram_category)

    is_gaming_from_title = df["title"].apply(is_gaming_title)
    if "is_gaming" in df.columns:
        df["is_gaming"] = df["is_gaming"] | is_gaming_from_title
    else:
        df["is_gaming"] = is_gaming_from_title

    df["log_price"] = np.log10(df["price"].clip(lower=1))

    df["price_per_gb_ram"] = df.apply(
        lambda r: r["price"] / r["ram_gb"] if pd.notna(r["ram_gb"]) and r["ram_gb"] > 0 else None,
        axis=1
    )

    return df


def add_features(products: list) -> list:
    for p in products:
        price = p.get("price", 0)
        title = p.get("title", "")
        brand = p.get("brand", "")
        p["price_category"] = price_category(price)
        p["brand_detected"] = detect_brand(title, brand)
        p["ram_gb"]         = extract_ram(title)
        p["storage_gb"]     = extract_storage(title)
        p["cpu_score"]      = extract_cpu_score(title)
        p["has_gpu"]        = has_dedicated_gpu(title)
        p["is_gaming"]      = bool(p.get("is_gaming", False)) or is_gaming_title(title)
    return products