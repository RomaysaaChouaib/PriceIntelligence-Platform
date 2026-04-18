# data_mining/models/anomaly.py
"""
Détection d'anomalies de prix (produits trop chers, trop bon marché, erreurs de scraping).
Méthodes : IQR, Z-score, Isolation Forest, LOF.
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.neighbors import LocalOutlierFactor
from sklearn.preprocessing import RobustScaler
from scipy import stats as scipy_stats


def detect_iqr(df: pd.DataFrame, price_col: str = "price", factor: float = 1.5) -> pd.DataFrame:
    """
    Détection par IQR (méthode boîte à moustaches).
    factor=1.5 → outliers modérés, factor=3.0 → outliers extrêmes.
    """
    df = df.copy()
    p = df[price_col]
    Q1, Q3 = p.quantile(0.25), p.quantile(0.75)
    IQR = Q3 - Q1
    lower = Q1 - factor * IQR
    upper = Q3 + factor * IQR

    df["anomaly_iqr"]       = ~p.between(lower, upper)
    df["anomaly_iqr_type"]  = "normal"
    df.loc[p < lower, "anomaly_iqr_type"] = "trop_bas"
    df.loc[p > upper, "anomaly_iqr_type"] = "trop_haut"

    n = df["anomaly_iqr"].sum()
    print(f"  [IQR] Borne basse={lower:.0f} MAD, haute={upper:.0f} MAD → {n} anomalies")
    return df


def detect_zscore(df: pd.DataFrame, price_col: str = "price", threshold: float = 3.0) -> pd.DataFrame:
    """
    Détection par Z-score sur log(prix) pour gérer la distribution asymétrique.
    """
    df = df.copy()
    log_prices = np.log1p(df[price_col])
    z = np.abs(scipy_stats.zscore(log_prices))

    df["anomaly_zscore"]       = z > threshold
    df["zscore_value"]         = z.round(4)
    df["anomaly_zscore_type"]  = "normal"
    df.loc[(z > threshold) & (df[price_col] < df[price_col].median()), "anomaly_zscore_type"] = "trop_bas"
    df.loc[(z > threshold) & (df[price_col] > df[price_col].median()), "anomaly_zscore_type"] = "trop_haut"

    n = df["anomaly_zscore"].sum()
    print(f"  [Z-score] seuil={threshold} → {n} anomalies")
    return df


def detect_isolation_forest(
    df: pd.DataFrame,
    features: list = None,
    contamination: float = 0.05,
    random_state: int = 42,
) -> pd.DataFrame:
    """
    Isolation Forest — détecte les anomalies multivariées.
    contamination : proportion estimée d'anomalies (0.05 = 5%)
    """
    df = df.copy()

    if features is None:
        features = [c for c in ["log_price", "ram_gb", "storage_gb"] if c in df.columns]
        if not features:
            features = ["price"]

    X = df[features].fillna(df[features].median())
    scaler = RobustScaler()
    X_scaled = scaler.fit_transform(X)

    model = IsolationForest(contamination=contamination, random_state=random_state, n_estimators=100)
    preds = model.fit_predict(X_scaled)          # 1 = normal, -1 = anomalie
    scores = model.score_samples(X_scaled)       # Plus négatif = plus anormal

    df["anomaly_iforest"]        = preds == -1
    df["anomaly_iforest_score"]  = scores.round(4)

    n = df["anomaly_iforest"].sum()
    print(f"  [IForest] contamination={contamination} | {n} anomalies détectées | features={features}")
    return df


def detect_lof(
    df: pd.DataFrame,
    features: list = None,
    n_neighbors: int = 20,
    contamination: float = 0.05,
) -> pd.DataFrame:
    """
    Local Outlier Factor — détecte les anomalies locales.
    """
    df = df.copy()

    if features is None:
        features = [c for c in ["log_price", "ram_gb", "storage_gb"] if c in df.columns]
        if not features:
            features = ["price"]

    X = df[features].fillna(df[features].median())
    scaler = RobustScaler()
    X_scaled = scaler.fit_transform(X)

    model = LocalOutlierFactor(n_neighbors=n_neighbors, contamination=contamination)
    preds = model.fit_predict(X_scaled)

    df["anomaly_lof"]       = preds == -1
    df["anomaly_lof_score"] = -model.negative_outlier_factor_

    n = df["anomaly_lof"].sum()
    print(f"  [LOF] n_neighbors={n_neighbors} | {n} anomalies détectées")
    return df


def anomaly_summary(df: pd.DataFrame) -> pd.DataFrame:
    """
    Résumé des anomalies détectées, toutes méthodes confondues.
    """
    methods = {
        "IQR":            "anomaly_iqr",
        "Z-score":        "anomaly_zscore",
        "Isolation Forest": "anomaly_iforest",
        "LOF":            "anomaly_lof",
    }
    rows = []
    for name, col in methods.items():
        if col in df.columns:
            count = df[col].sum()
            pct   = round(count / len(df) * 100, 2)
            rows.append({"methode": name, "anomalies": int(count), "pourcentage": pct})

    return pd.DataFrame(rows)


def get_anomalies(df: pd.DataFrame, method: str = "iforest") -> pd.DataFrame:
    """
    Retourne uniquement les lignes anomalies selon la méthode choisie.
    method : 'iqr' | 'zscore' | 'iforest' | 'lof'
    """
    col_map = {
        "iqr":     "anomaly_iqr",
        "zscore":  "anomaly_zscore",
        "iforest": "anomaly_iforest",
        "lof":     "anomaly_lof",
    }
    col = col_map.get(method)
    if col not in df.columns:
        raise ValueError(f"Colonne '{col}' absente. Lancez d'abord detect_{method}().")
    return df[df[col] == True].sort_values("price").reset_index(drop=True)
