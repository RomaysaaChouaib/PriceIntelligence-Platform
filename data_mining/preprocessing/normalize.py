# data_mining/preprocessing/normalize.py
"""
Normalisation des données.

CORRECTIONS :
- normalize_dataframe : impute NaN par médiane AVANT normalisation (pas de perte de lignes)
- Toutes les colonnes numériques disponibles peuvent être normalisées
- get_price_percentiles : robuste aux NaN
"""

import pandas as pd
import numpy as np
from sklearn.preprocessing import MinMaxScaler, StandardScaler, RobustScaler


def normalize_prices(products: list) -> list:
    """
    Normalisation Min-Max des prix (version liste-de-dicts).
    Ajoute la clé 'price_normalized' à chaque produit.
    """
    if not products:
        return products

    prices = [p["price"] for p in products if p.get("price") is not None]
    if not prices:
        return products

    min_price = min(prices)
    max_price = max(prices)

    if max_price == min_price:
        for p in products:
            p["price_normalized"] = 0.0
        return products

    for p in products:
        price = p.get("price")
        if price is not None:
            p["price_normalized"] = round((price - min_price) / (max_price - min_price), 6)
        else:
            p["price_normalized"] = None

    return products


def normalize_dataframe(
    df: pd.DataFrame,
    method: str = "robust",
    columns: list = None,
) -> tuple[pd.DataFrame, object]:
    """
    Normalise les colonnes numériques d'un DataFrame.

    Paramètres
    ----------
    df      : DataFrame source
    method  : 'minmax' | 'standard' | 'robust' (défaut : robust)
    columns : colonnes à normaliser (défaut : price + log_price)

    CORRECTION : NaN imputés par la médiane avant normalisation.
    Les colonnes originales sont préservées, les colonnes *_scaled sont ajoutées.

    Retourne (df_avec_scaled, scaler_fitté)
    """
    df = df.copy()

    if columns is None:
        columns = [c for c in ["price", "log_price"] if c in df.columns]

    # Ne garder que les colonnes vraiment présentes
    columns = [c for c in columns if c in df.columns]
    if not columns:
        return df, None

    scalers = {
        "minmax":   MinMaxScaler(),
        "standard": StandardScaler(),
        "robust":   RobustScaler(),
    }
    scaler = scalers.get(method, RobustScaler())

    # Imputation NaN par médiane — SANS supprimer de lignes
    data = df[columns].copy()
    for col in data.columns:
        if data[col].dtype == bool or data[col].dtype == object:
            data[col] = data[col].astype(float)
        median_val = data[col].median()
        if pd.isna(median_val):
            median_val = 0.0
        data[col] = data[col].fillna(median_val)

    scaled = scaler.fit_transform(data)

    for i, col in enumerate(columns):
        df[f"{col}_scaled"] = scaled[:, i].round(6)

    print(f"  [normalize] Méthode={method} | Colonnes={columns}")
    return df, scaler


def get_price_percentiles(df: pd.DataFrame, price_col: str = "price") -> dict:
    """Retourne les percentiles clés du prix."""
    p = df[price_col].dropna()
    if len(p) == 0:
        return {}
    return {
        "p10":    round(float(p.quantile(0.10)), 2),
        "p25":    round(float(p.quantile(0.25)), 2),
        "median": round(float(p.median()), 2),
        "p75":    round(float(p.quantile(0.75)), 2),
        "p90":    round(float(p.quantile(0.90)), 2),
        "mean":   round(float(p.mean()), 2),
        "std":    round(float(p.std()), 2),
    }