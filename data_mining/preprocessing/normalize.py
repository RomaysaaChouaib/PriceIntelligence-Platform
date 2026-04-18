# data_mining/preprocessing/normalize.py

import pandas as pd
import numpy as np
from sklearn.preprocessing import MinMaxScaler, StandardScaler, RobustScaler


def normalize_prices(products: list) -> list:
    """
    Normalisation Min-Max des prix (version liste-de-dicts, compatible pipeline).
    Ajoute la clé 'price_normalized' à chaque produit.
    """
    if not products:
        return products

    prices = [p["price"] for p in products]
    min_price = min(prices)
    max_price = max(prices)

    if max_price == min_price:
        for p in products:
            p["price_normalized"] = 0.0
        return products

    for p in products:
        p["price_normalized"] = (p["price"] - min_price) / (max_price - min_price)

    return products


def normalize_dataframe(
    df: pd.DataFrame,
    method: str = "robust",
    columns: list = None
) -> pd.DataFrame:
    """
    Normalise les colonnes numériques d'un DataFrame.

    Paramètres
    ----------
    df      : DataFrame source
    method  : 'minmax' | 'standard' | 'robust' (défaut : robust, résiste aux outliers)
    columns : liste de colonnes à normaliser (défaut : price + log_price)

    Retourne un nouveau DataFrame avec colonnes supplémentaires *_scaled.
    """
    df = df.copy()

    if columns is None:
        columns = [c for c in ["price", "log_price"] if c in df.columns]

    scalers = {
        "minmax":   MinMaxScaler(),
        "standard": StandardScaler(),
        "robust":   RobustScaler(),
    }
    scaler = scalers.get(method, RobustScaler())

    data = df[columns].fillna(df[columns].median())
    scaled = scaler.fit_transform(data)

    for i, col in enumerate(columns):
        df[f"{col}_scaled"] = scaled[:, i]

    print(f"  [normalize] Méthode={method}, colonnes={columns}")
    return df, scaler


def get_price_percentiles(df: pd.DataFrame, price_col: str = "price") -> dict:
    """Retourne les percentiles clés du prix pour contexte."""
    p = df[price_col]
    return {
        "p10": p.quantile(0.10),
        "p25": p.quantile(0.25),
        "median": p.median(),
        "p75": p.quantile(0.75),
        "p90": p.quantile(0.90),
        "mean": p.mean(),
        "std": p.std(),
    }
