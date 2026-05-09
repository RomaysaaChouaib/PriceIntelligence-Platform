# data_mining/preprocessing/feature_engineering.py
"""
Feature engineering pour les produits laptops.

CORRECTIONS :
- extract_ram : gère "8192Mo", "4Go RAM" avant "256Go SSD", "8gb" anglais
- extract_storage : gère "256 SSD" sans unité, "1To", évite confusion RAM/storage
- extract_cpu_score : ajout Intel Ultra, Core i9/i7 13th/14th gen
- stats_by_brand : fallback sur colonne 'brand' si 'brand_detected' absent
"""

import pandas as pd
import numpy as np
import re


# ── Marques connues ──────────────────────────────────────────────────────────
BRAND_PATTERNS = {
    "Apple":     r"\bapple\b|\bmacbook\b|\bmac\s*book\b",
    "HP":        r"\bhp\b|\belitebook\b|\bprobook\b|\bomen\b|\bvictus\b|\benvy\b|\bpavill?on\b|\bspectre\b",
    "Dell":      r"\bdell\b|\blatitude\b|\bvostro\b|\bxps\b|\binspiro[n]?\b|\bg\d+\b",
    "Lenovo":    r"\blenovo\b|\bthinkpad\b|\bideapad\b|\blegion\b|\byoga\b|\bslim\s*\d+\b",
    "Asus":      r"\basus\b|\brog\b|\bvivobook\b|\bzenbook\b|\bexpertbook\b|\btuf\b|\bproart\b",
    "Acer":      r"\bacer\b|\baspire\b|\bswift\b|\bpredator\b|\bnitro\b|\bextensa\b|\bconceptd\b",
    "MSI":       r"\bmsi\b|\bmodern\b|\bcreator\b|\bstealth\b|\braider\b|\bprestige\b",
    "Samsung":   r"\bsamsung\b|\bgalaxy\s*book\b",
    "Toshiba":   r"\btoshiba\b|\bdynabook\b",
    "Huawei":    r"\bhuawei\b|\bmatebook\b",
    "Microsoft": r"\bmicrosoft\b|\bsurface\b",
    "Xiaomi":    r"\bxiaomi\b|\bmi\s+notebook\b|\bredmibook\b|\bmi\s+laptop\b",
    "Gpd":       r"\bgpd\b",
    "LG":        r"\blg\b|\bgram\b",
    "Razer":     r"\brazer\b|\bblade\b",
    "Teclast":   r"\bteclast\b",
    "Chuwi":     r"\bchuwi\b",
    "Jumper":    r"\bjumper\b",
    "Jumia":     r"\bjumia\b",
}

# Valeurs RAM valides en Go
VALID_RAM_VALUES = {2, 4, 6, 8, 10, 12, 16, 18, 24, 32, 48, 64, 128}

# Valeurs stockage valides en Go
VALID_STORAGE_VALUES = {16, 32, 64, 128, 256, 480, 512, 500, 1000, 2000, 4000}


def detect_brand(title: str, brand_col: str = "") -> str:
    t = (title or "").lower()
    for brand, pattern in BRAND_PATTERNS.items():
        if re.search(pattern, t):
            return brand
    # Fallback sur colonne brand de la DB
    if brand_col and isinstance(brand_col, str) and len(brand_col.strip()) > 1:
        b = brand_col.strip().title()
        # Normalisation des variantes communes
        if b.lower() in ('hp', 'h.p'):
            return 'HP'
        return b
    return "Autre"


def extract_ram(title: str) -> int | None:
    """
    Extrait la RAM en Go depuis le titre.

    CORRECTIONS :
    - "8192Mo" → 8 Go (conversion Mo→Go)
    - Priorité aux patterns explicites "X Go RAM" ou "RAM X Go"
    - Évite de confondre stockage et RAM (ex: "256Go SSD 4Go RAM" → 4)
    - Gère l'anglais : 8GB, 16GB, etc.
    """
    t = (title or "").lower()

    # 1. Mo → Go (ex: "8192Mo RAM")
    m = re.search(r'(\d+)\s*mo\b', t)
    if m:
        val_mo = int(m.group(1))
        val_go = val_mo // 1024
        if val_go in VALID_RAM_VALUES:
            return val_go

    # 2. Contexte explicite "X Go RAM" ou "RAM X Go/GB"
    for pat in [
        r'(\d+)\s*(?:go|gb)\s*(?:ram|ddr\d*|lpddr\d*|sdram)',
        r'(?:ram|memoire|memory|mem)\s*:?\s*(\d+)\s*(?:go|gb|g\b)',
    ]:
        m = re.search(pat, t)
        if m:
            val = int(m.group(1))
            if val in VALID_RAM_VALUES:
                return val

    # 3. Pattern "XGo" ou "X GB" isolé — on prend la DERNIÈRE occurrence
    #    pour éviter la confusion avec le stockage (ex: "256Go SSD 8Go RAM")
    matches = list(re.finditer(r'(\d+)\s*(?:go|gb|g)\b', t))
    # Chercher en sens inverse (dernier match)
    for m in reversed(matches):
        val = int(m.group(1))
        if val in VALID_RAM_VALUES:
            # Vérifier que ce n'est pas suivi de "ssd/hdd/nvme/emmc"
            after = t[m.end():m.end()+10]
            if not re.search(r'ssd|hdd|nvme|emmc|disque|stor', after):
                return val

    # 4. Fallback — premier match valide
    for m in matches:
        val = int(m.group(1))
        if val in VALID_RAM_VALUES:
            return val

    return None


def extract_storage(title: str) -> int | None:
    """
    Extrait le stockage en Go depuis le titre.

    CORRECTIONS :
    - Priorité à "X Go SSD/HDD/NVMe/eMMC" (contexte explicite)
    - "1To" / "2To" → 1000/2000 Go
    - "256 SSD" sans unité → 256 Go
    - Évite les valeurs de RAM (2,4,6,8,12,16,24,32,48,64 Go sans contexte stockage)
    """
    t = (title or "").lower()

    # 1. Téraoctets : "1To", "2 To", "1TB", "2TB"
    m = re.search(r'(\d+(?:\.\d+)?)\s*(?:to|tb)\b', t)
    if m:
        return int(float(m.group(1)) * 1000)

    # 2. Contexte explicite "X Go/GB SSD/HDD/NVMe/eMMC"
    m = re.search(r'(\d+)\s*(?:go|gb|g)\s*(?:ssd|hdd|nvme|emmc|disque|flash)', t)
    if m:
        val = int(m.group(1))
        if val in VALID_STORAGE_VALUES:
            return val

    # 3. Contexte inverse "SSD/HDD/NVMe X Go/GB"
    m = re.search(r'(?:ssd|hdd|nvme|emmc)\s*[\s:]*(\d+)\s*(?:go|gb|g)\b', t)
    if m:
        val = int(m.group(1))
        if val in VALID_STORAGE_VALUES:
            return val

    # 4. "X SSD" ou "X HDD" sans unité (ex: "256 SSD")
    m = re.search(r'(\d+)\s+(?:ssd|hdd|nvme)', t)
    if m:
        val = int(m.group(1))
        if val in VALID_STORAGE_VALUES:
            return val

    # 5. Recherche toutes occurrences "X Go/GB" → prendre la PREMIÈRE
    #    qui correspond à une valeur stockage (pas RAM)
    matches = list(re.finditer(r'(\d+)\s*(?:go|gb|g)\b', t))
    for m in matches:
        val = int(m.group(1))
        if val in VALID_STORAGE_VALUES and val not in VALID_RAM_VALUES:
            return val

    # 6. Si valeur valide stockage ET RAM (ex: 64 eMMC), vérifier contexte
    for m in matches:
        val = int(m.group(1))
        if val in VALID_STORAGE_VALUES:
            # On regarde les 15 chars avant pour contexte stockage
            before = t[max(0, m.start()-15):m.start()]
            after  = t[m.end():m.end()+15]
            if re.search(r'ssd|hdd|nvme|emmc|disque|stor', before + after):
                return val

    return None


def extract_storage_type(title: str) -> str:
    """Détecte le type de stockage : SSD, HDD, eMMC ou Inconnu."""
    t = (title or "").lower()
    if re.search(r'\bnvme\b|\bm\.2\b', t):
        return 'NVMe SSD'
    if re.search(r'\bssd\b', t):
        return 'SSD'
    if re.search(r'\bemmc\b|\bflash\b', t):
        return 'eMMC'
    if re.search(r'\bhdd\b|\bdisque\s*dur\b|\bhard\s*disk\b', t):
        return 'HDD'
    return 'Inconnu'


def extract_cpu_score(title: str) -> int:
    """
    Score CPU numérique (0-10) pour le clustering.

    CORRECTIONS :
    - Ajout Intel Core Ultra (série 100/200)
    - Ajout AMD Ryzen AI
    - Pentium / Celeron = 1
    - Score 0 = CPU inconnu (ne bloque pas le clustering)
    """
    t = (title or "").lower()

    # Intel Core Ultra (série haut de gamme 2024)
    if re.search(r'\bcore\s*ultra\s*9\b|\bultra\s*9\b', t):       return 10
    if re.search(r'\bcore\s*ultra\s*7\b|\bultra\s*7\b', t):       return 8
    if re.search(r'\bcore\s*ultra\s*5\b|\bultra\s*5\b', t):       return 6

    # Intel Core classique (i3/i5/i7/i9)
    if re.search(r'\bi9\b|core\s*i9', t):    return 9
    if re.search(r'\bi7\b|core\s*i7', t):    return 7
    if re.search(r'\bi5\b|core\s*i5', t):    return 5
    if re.search(r'\bi3\b|core\s*i3', t):    return 3

    # AMD Ryzen
    if re.search(r'ryzen\s*(?:ai\s*)?9|ryzen\s*9', t):    return 9
    if re.search(r'ryzen\s*(?:ai\s*)?7|ryzen\s*7', t):    return 7
    if re.search(r'ryzen\s*(?:ai\s*)?5|ryzen\s*5', t):    return 5
    if re.search(r'ryzen\s*3', t):                         return 3

    # Apple Silicon
    if re.search(r'\bm[34]\s*(pro|max|ultra)\b', t): return 10
    if re.search(r'\bm[12]\s*(pro|max|ultra)\b', t): return 9
    if re.search(r'\bm[34]\b', t):                   return 8
    if re.search(r'\bm[12]\b', t):                   return 7

    # Qualcomm Snapdragon (ARM laptops)
    if re.search(r'\bsnapdragon\s*x\s*(elite|plus)\b', t): return 8
    if re.search(r'\bsnapdragon\b', t):                     return 5

    # Bas de gamme
    if re.search(r'\bceleron\b|\bpentium\b|\batom\b|\bn\d{4}\b|\bn[34]\d{3}\b', t):
        return 1

    return 0  # Inconnu — ne supprime pas le produit


def extract_cpu_generation(title: str) -> int | None:
    """Extrait la génération du processeur Intel (4e à 14e gen)."""
    t = (title or "").lower()
    patterns = [
        r'(\d+)[eèéúþ]+me?\s*g[eé]n',
        r'(\d+)th\s*gen',
        r'(\d+)e\s*gen',
        r'generation\s*(\d+)',
        r'gen\s*(\d+)',
        r'-(\d+)(?:th|[eè]me)',
        # Modèles Intel (ex: i7-1260P → 12e gen, i7-1165G7 → 11e gen)
        r'i[357]-(\d{2})\d{2,}',
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
    t = (title or "").lower()
    return bool(re.search(
        r'\brtx\b|\bgtx\b|\bradeon\s*rx\b|\brx\s*\d+\b|\bgeforce\b'
        r'|\bnvidia\b|\bamd\s*gpu\b|\bquadro\b|\barc\s*a\d+\b',
        t
    ))


def is_tactile(title: str) -> bool:
    t = (title or "").lower()
    return bool(re.search(r'\btactile\b|\btouch\b|\btouchscreen\b|\b2-in-1\b|\b2in1\b', t))


def is_refurbished(title: str) -> bool:
    t = (title or "").lower()
    return bool(re.search(
        r'\brecondition\b|\brefurb\b|\brenew\b|\bremis\s*[àa]\s*neuf\b'
        r'|\bgrade\s*[abc]\b|\bgrade[abc]\b|\bused\b|\boccasion\b',
        t
    ))


def price_category(price: float) -> str:
    """Catégorie de gamme basée sur le prix MAD."""
    if price < 3000:    return "entrée_de_gamme"
    elif price < 7000:  return "milieu_de_gamme_bas"
    elif price < 12000: return "milieu_de_gamme"
    elif price < 22000: return "haut_de_gamme"
    else:               return "premium"


def is_gaming_title(title: str) -> bool:
    gaming_kw = [
        "gaming", "gamer", "game", "rog", "predator", "nitro",
        "legion", "omen", "victus", "tuf", "g15", "g14", "g16",
        "rtx", "gtx", "geforce", "strix", "raider", "helios",
        "katana", "sword", "stealth", "blade",
    ]
    t = (title or "").lower()
    return any(kw in t for kw in gaming_kw)


def ram_category(ram: int | None) -> str:
    if ram is None:  return "Inconnu"
    if ram <= 4:     return "Basique (≤4GB)"
    if ram <= 8:     return "Standard (8GB)"
    if ram <= 16:    return "Performant (16GB)"
    return "Haute perf (≥32GB)"


def add_features_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """
    Ajoute toutes les features dérivées au DataFrame.

    Features ajoutées :
    - brand_detected    : marque normalisée
    - ram_gb            : RAM en Go (int ou NaN)
    - storage_gb        : Stockage en Go (int ou NaN)
    - storage_type      : SSD / HDD / eMMC / NVMe SSD / Inconnu
    - cpu_score         : score CPU 0-10
    - cpu_generation    : génération Intel (int ou NaN)
    - has_gpu           : GPU dédié (bool)
    - is_tactile        : écran tactile (bool)
    - is_refurbished    : reconditionné (bool)
    - price_category    : gamme de prix
    - ram_category      : catégorie RAM
    - is_gaming         : gaming (bool — depuis DB + titre)
    - log_price         : log10(price)
    - price_per_gb_ram  : ratio prix/RAM

    NOTE : les NaN dans ram_gb/storage_gb sont conservés
    et imputés par la médiane dans les modèles.
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
        df["is_gaming"] = df["is_gaming"].astype(bool) | is_gaming_from_title
    else:
        df["is_gaming"] = is_gaming_from_title

    df["log_price"] = np.log10(df["price"].clip(lower=1))

    df["price_per_gb_ram"] = df.apply(
        lambda r: round(r["price"] / r["ram_gb"], 2)
        if pd.notna(r["ram_gb"]) and r["ram_gb"] > 0 else None,
        axis=1
    )

    # Rapport RAM extraction
    n_ram = df["ram_gb"].notna().sum()
    n_sto = df["storage_gb"].notna().sum()
    print(f"  [features] RAM extraite : {n_ram}/{len(df)} ({n_ram/len(df)*100:.0f}%)")
    print(f"  [features] Stockage extrait : {n_sto}/{len(df)} ({n_sto/len(df)*100:.0f}%)")

    return df


def add_features(products: list) -> list:
    """Version liste-de-dicts pour compatibilité pipeline."""
    for p in products:
        price = p.get("price", 0)
        title = p.get("title", "")
        brand = p.get("brand", "")
        p["price_category"] = price_category(price)
        p["brand_detected"] = detect_brand(title, brand)
        p["ram_gb"]         = extract_ram(title)
        p["storage_gb"]     = extract_storage(title)
        p["storage_type"]   = extract_storage_type(title)
        p["cpu_score"]      = extract_cpu_score(title)
        p["has_gpu"]        = has_dedicated_gpu(title)
        p["is_gaming"]      = bool(p.get("is_gaming", False)) or is_gaming_title(title)
        p["log_price"]      = float(np.log10(max(price, 1)))
    return products