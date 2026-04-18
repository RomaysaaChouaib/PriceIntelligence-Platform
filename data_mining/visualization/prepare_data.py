# data_mining/visualization/prepare_data.py
"""
Prépare les données pour la visualisation frontend (React/Chart.js).
Génère des structures JSON prêtes à l'emploi.
"""

import pandas as pd
import numpy as np
import json


def prepare_price_distribution(df: pd.DataFrame, bins: int = 10) -> list[dict]:
    """
    Histogramme de distribution des prix.
    Retourne une liste [{label, count, min_price, max_price}].
    """
    p = df["price"].dropna()
    counts, edges = np.histogram(p, bins=bins)
    result = []
    for i in range(len(counts)):
        label = f"{int(edges[i]):,}–{int(edges[i+1]):,} MAD"
        result.append({
            "label":     label,
            "count":     int(counts[i]),
            "min_price": round(float(edges[i]), 2),
            "max_price": round(float(edges[i+1]), 2),
        })
    return result


def prepare_brand_stats(df: pd.DataFrame, top_n: int = 8) -> list[dict]:
    """
    Stats par marque pour un bar chart.
    Retourne [{brand, count, mean_price, median_price}].
    """
    brand_col = "brand_detected" if "brand_detected" in df.columns else "brand"
    grp = df.groupby(brand_col)["price"].agg(
        count="count", mean="mean", median="median"
    ).round(2).sort_values("count", ascending=False).head(top_n)
    result = []
    for brand, row in grp.iterrows():
        result.append({
            "brand":        brand,
            "count":        int(row["count"]),
            "mean_price":   float(row["mean"]),
            "median_price": float(row["median"]),
        })
    return result


def prepare_cluster_data(df: pd.DataFrame) -> list[dict]:
    """
    Données de clustering pour un scatter plot.
    Retourne [{title, price, cluster, brand, is_gaming}].
    """
    if "cluster" not in df.columns:
        return []
    cols = ["title", "price", "cluster"]
    for c in ["brand_detected", "is_gaming", "cluster_id"]:
        if c in df.columns:
            cols.append(c)

    sample = df[cols].head(500)  # Limiter pour le frontend
    return sample.replace({np.nan: None}).to_dict(orient="records")


def prepare_cluster_summary(df: pd.DataFrame) -> list[dict]:
    """Résumé des clusters pour affichage tableau."""
    if "cluster" not in df.columns:
        return []
    grp = df.groupby("cluster")["price"].agg(
        count="count", mean="mean", median="median", min="min", max="max"
    ).round(2).reset_index()
    return grp.to_dict(orient="records")


def prepare_anomalies(df: pd.DataFrame, method: str = "iforest") -> list[dict]:
    """
    Liste des anomalies pour le frontend.
    """
    col_map = {
        "iqr":     "anomaly_iqr",
        "zscore":  "anomaly_zscore",
        "iforest": "anomaly_iforest",
    }
    col = col_map.get(method, "anomaly_iforest")
    if col not in df.columns:
        return []

    anom = df[df[col] == True][["title", "price", "brand_detected"]
                                 if "brand_detected" in df.columns
                                 else ["title", "price"]].copy()
    anom = anom.sort_values("price").head(100)
    return anom.replace({np.nan: None}).to_dict(orient="records")


def prepare_association_rules(rules: pd.DataFrame, top_n: int = 20) -> list[dict]:
    """Top règles d'association pour visualisation."""
    if rules is None or rules.empty:
        return []
    top = rules.head(top_n)
    return top.to_dict(orient="records")


def prepare_all_for_frontend(df: pd.DataFrame, results: dict) -> dict:
    """
    Regroupe toutes les données en un seul dict JSON-serializable.
    À exposer via une API REST Django.
    """
    payload = {
        "stats":             results.get("stats", {}),
        "percentiles":       results.get("percentiles", {}),
        "gaming_stats":      results.get("gaming_stats", {}),
        "price_distribution": prepare_price_distribution(df),
        "brand_stats":       prepare_brand_stats(df),
        "cluster_scatter":   prepare_cluster_data(df),
        "cluster_summary":   prepare_cluster_summary(df),
        "anomalies":         prepare_anomalies(df),
        "association_rules": prepare_association_rules(results.get("rules", pd.DataFrame())),
    }
    return payload


def to_json(payload: dict, path: str = None) -> str:
    """Sérialise le payload en JSON, optionnellement vers un fichier."""
    def convert(obj):
        if isinstance(obj, (np.integer, np.int64)):
            return int(obj)
        if isinstance(obj, (np.floating, np.float64)):
            return float(obj)
        if isinstance(obj, np.bool_):
            return bool(obj)
        if isinstance(obj, pd.Timestamp):
            return str(obj)
        raise TypeError(f"Type non sérialisable : {type(obj)}")

    js = json.dumps(payload, default=convert, ensure_ascii=False, indent=2)
    if path:
        with open(path, "w", encoding="utf-8") as f:
            f.write(js)
        print(f"  [viz] JSON exporté : {path}")
    return js
