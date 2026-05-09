import pandas as pd
import numpy as np
import re
import os
from sqlalchemy import create_engine
from dotenv import load_dotenv

load_dotenv()

LAPTOP_KEYWORDS = ['laptop', 'ordinateur', 'notebook', 'pc portable', 'computer', 'macbook']

# Taux de conversion vers MAD
CONVERSION_RATES = {
    'MAD': 1.0,
    '': 1.0,
    'EUR': 11.0,
    '€': 11.0,
    'USD': 10.0,
    '$': 10.0,
    'GBP': 13.0,
    '£': 13.0,
}

# Fourchette de prix réaliste par type de produit (en MAD)
PRICE_BOUNDS = {
    'laptop': (500, 150_000),
    'accessory': (10, 20_000),
}


def get_db_engine():
    user = os.getenv("DB_USER")
    password = os.getenv("DB_PASSWORD")
    host = os.getenv("DB_HOST")
    db_name = os.getenv("DB_NAME")
    return create_engine(f"mysql+mysqlconnector://{user}:{password}@{host}/{db_name}")


# ── CORRECTION 1 : parsing robuste du prix ───────────────────────────────────
def fix_price_logic(price, currency="MAD", source=""):
    """
    Convertit un prix brut (str ou float) en float MAD.

    Gère :
    - Virgule décimale française : "199,00" → 199.0
    - Séparateurs de milliers : "1.999,00" → 1999.0
    - Centimes Jumia : 299900 → 2999 MAD  (uniquement si source == 'Jumia')
    - Conversion de devise vers MAD
    """
    if price is None or (isinstance(price, float) and np.isnan(price)):
        return np.nan

    price_str = str(price).strip()

    # Supprimer tout sauf chiffres, virgule, point
    price_str = re.sub(r'[^\d,.]', '', price_str)

    if not price_str:
        return np.nan

    # Gérer le format "1.999,00" (point = séparateur milliers, virgule = décimal)
    if ',' in price_str and '.' in price_str:
        # Si virgule après point : format européen  1.999,00
        if price_str.index(',') > price_str.index('.'):
            price_str = price_str.replace('.', '').replace(',', '.')
        else:
            # Format US 1,999.00 → supprimer virgule
            price_str = price_str.replace(',', '')
    elif ',' in price_str:
        # "199,00" → virgule = décimal français
        price_str = price_str.replace(',', '.')

    # Plusieurs points restants → garder seulement le dernier comme décimal
    parts = price_str.split('.')
    if len(parts) > 2:
        price_str = ''.join(parts[:-1]) + '.' + parts[-1]

    try:
        p = float(price_str)
    except ValueError:
        return np.nan

    if p <= 0:
        return np.nan

    # Correction centimes Jumia
    # Jumia stocke les prix en centimes (ex: 299900 = 2999.00 MAD)
    #if str(source).strip().lower() == 'jumia' and p > 10_000:
    # p = p / 100

    # Conversion devise → MAD
    rate = CONVERSION_RATES.get(str(currency).strip(), None)
    if rate is None:
        # Essayer en majuscules
        rate = CONVERSION_RATES.get(str(currency).strip().upper(), 1.0)

    return round(p * rate, 2)


def clean_dataframe(df: pd.DataFrame, product_type: str = 'laptop') -> pd.DataFrame:
    """
    Nettoyage complet d'un DataFrame de produits.

    Étapes :
    1. Conversion et validation des prix
    2. Suppression des doublons exacts
    3. Filtrage des prix hors bornes réalistes
    4. Normalisation des titres
    5. Conversions de types
    """
    df = df.copy()
    if df.empty:
        return df

    # ── 1. Conversion des prix ───────────────────────────────────────────
    source_col = df.get('source', pd.Series([''] * len(df)))
    currency_col = df.get('currency', pd.Series(['MAD'] * len(df)))

    df['price'] = df.apply(
        lambda r: fix_price_logic(
            r.get('price'),
            r.get('currency', 'MAD'),
            r.get('source', '')
        ),
        axis=1
    )

    # ── 2. Suppression des lignes sans prix valide ───────────────────────
    n_before = len(df)
    df = df.dropna(subset=['price'])
    df = df[df['price'] > 0]
    print(f"  [clean] Prix invalides supprimés : {n_before - len(df)}")

    # ── 3. Filtre prix réaliste ──────────────────────────────────────────
    pmin, pmax = PRICE_BOUNDS.get(product_type, (1, 1_000_000))
    n_before = len(df)
    df = df[(df['price'] >= pmin) & (df['price'] <= pmax)]
    print(f"  [clean] Hors bornes [{pmin}-{pmax}] supprimés : {n_before - len(df)}")

    # ── 4. Suppression des doublons (titre + prix + source) ──────────────
    n_before = len(df)
    if 'link' in df.columns:
        df = df.drop_duplicates(subset=['link'])
    else:
        df = df.drop_duplicates(subset=['title', 'price', 'source'])
    print(f"  [clean] Doublons supprimés : {n_before - len(df)}")

    # ── 5. Normalisation des titres ──────────────────────────────────────
    df['title'] = df['title'].apply(lambda x: re.sub(r'\s+', ' ', str(x).strip()))

    # ── 6. Conversions de types ──────────────────────────────────────────
    if 'is_gaming' in df.columns:
        df['is_gaming'] = df['is_gaming'].fillna(False)
        # Gérer "True"/"False" en string
        df['is_gaming'] = df['is_gaming'].apply(
            lambda x: bool(x) if not isinstance(x, str)
            else x.strip().lower() in ('true', '1', 'yes')
        )
    if 'date_scraped' in df.columns:
        df['date_scraped'] = pd.to_datetime(df['date_scraped'], errors='coerce')

    df.reset_index(drop=True, inplace=True)
    print(f"  [clean] Dataset final : {len(df)} lignes")
    return df


def load_csv_safe(filepath: str) -> pd.DataFrame:
    """Charge un CSV en gérant les lignes malformées (titres avec virgules)."""
    try:
        return pd.read_csv(filepath, on_bad_lines='skip')
    except Exception as e:
        print(f"  [load_csv] Erreur {filepath}: {e}")
        return pd.DataFrame()


def run_global_cleaning():
    """Pipeline complet de nettoyage depuis MySQL."""
    print("Démarrage du nettoyage...")
    engine = get_db_engine()

    try:
        df_raw = pd.read_sql("SELECT * FROM accessories", engine)
        print(f"Données brutes : {len(df_raw)} lignes")

        pattern = '|'.join(LAPTOP_KEYWORDS)
        mask_laptops = df_raw['title'].str.contains(pattern, case=False, na=False)

        df_laptops_raw = df_raw[mask_laptops].copy()
        df_acc_raw = df_raw[~mask_laptops].copy()

        df_laptops_final = clean_dataframe(df_laptops_raw, product_type='laptop')
        df_acc_final = clean_dataframe(df_acc_raw, product_type='accessory')

        print(f"Sauvegarde 'products' ({len(df_laptops_final)} lignes)...")
        df_laptops_final.to_sql('products', engine, if_exists='replace', index=False)

        print(f"Sauvegarde 'accessories_cleaned' ({len(df_acc_final)} lignes)...")
        df_acc_final.to_sql('accessories_cleaned', engine, if_exists='replace', index=False)

        print(f"\nTerminé ! Total : {len(df_laptops_final) + len(df_acc_final)} lignes.")

    except Exception as e:
        print(f"Erreur : {e}")
        raise


if __name__ == "__main__":
    run_global_cleaning()