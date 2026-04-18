# data_mining/models/stats.py
"""
Statistiques descriptives sur les prix et produits.
"""

import pandas as pd
import numpy as np
from scipy import stats as scipy_stats


def descriptive_stats(df: pd.DataFrame, price_col: str = "price") -> dict:
    """
    Calcule les statistiques descriptives complètes des prix.
    """
    p = df[price_col].dropna()

    result = {
        "count":    int(len(p)),
        "mean":     round(float(p.mean()), 2),
        "median":   round(float(p.median()), 2),
        "std":      round(float(p.std()), 2),
        "min":      round(float(p.min()), 2),
        "max":      round(float(p.max()), 2),
        "p25":      round(float(p.quantile(0.25)), 2),
        "p75":      round(float(p.quantile(0.75)), 2),
        "p90":      round(float(p.quantile(0.90)), 2),
        "iqr":      round(float(p.quantile(0.75) - p.quantile(0.25)), 2),
        "skewness": round(float(scipy_stats.skew(p)), 4),
        "kurtosis": round(float(scipy_stats.kurtosis(p)), 4),
        "cv":       round(float(p.std() / p.mean() * 100), 2),  # Coefficient de variation %
    }
    return result


def stats_by_brand(df: pd.DataFrame, brand_col: str = "brand_detected", price_col: str = "price") -> pd.DataFrame:
    """
    Statistiques de prix agrégées par marque.
    """
    grp = df.groupby(brand_col)[price_col].agg(
        count="count",
        mean="mean",
        median="median",
        std="std",
        min="min",
        max="max",
        p25=lambda x: x.quantile(0.25),
        p75=lambda x: x.quantile(0.75),
    ).round(2)
    grp["cv"] = (grp["std"] / grp["mean"] * 100).round(2)
    return grp.sort_values("count", ascending=False).reset_index()


def stats_by_category(df: pd.DataFrame) -> pd.DataFrame:
    """Statistiques par catégorie de gamme."""
    if "price_category" not in df.columns:
        return pd.DataFrame()
    order = ["entrée_de_gamme", "milieu_de_gamme_bas", "milieu_de_gamme", "haut_de_gamme", "premium"]
    grp = df.groupby("price_category")["price"].agg(
        count="count", mean="mean", median="median", min="min", max="max"
    ).round(2)
    grp = grp.reindex([c for c in order if c in grp.index])
    return grp.reset_index()


def price_distribution(df: pd.DataFrame, price_col: str = "price", bins: int = 10) -> pd.DataFrame:
    """
    Distribution du prix en tranches.
    Retourne un DataFrame avec [tranche, count, pourcentage].
    """
    p = df[price_col].dropna()
    cut, bin_edges = pd.cut(p, bins=bins, retbins=True, include_lowest=True)
    dist = cut.value_counts(sort=False).reset_index()
    dist.columns = ["tranche", "count"]
    dist["pourcentage"] = (dist["count"] / dist["count"].sum() * 100).round(2)
    dist["tranche"] = dist["tranche"].astype(str)
    return dist


def gaming_vs_non_gaming(df: pd.DataFrame) -> dict:
    """Compare les stats prix gaming vs non-gaming."""
    if "is_gaming" not in df.columns:
        return {}
    gaming    = df[df["is_gaming"] == True]["price"]
    non_gaming = df[df["is_gaming"] == False]["price"]

    result = {
        "gaming": {
            "count":  int(len(gaming)),
            "mean":   round(float(gaming.mean()), 2) if len(gaming) else 0,
            "median": round(float(gaming.median()), 2) if len(gaming) else 0,
        },
        "non_gaming": {
            "count":  int(len(non_gaming)),
            "mean":   round(float(non_gaming.mean()), 2) if len(non_gaming) else 0,
            "median": round(float(non_gaming.median()), 2) if len(non_gaming) else 0,
        },
    }

    # Test Mann-Whitney (non paramétrique)
    if len(gaming) >= 5 and len(non_gaming) >= 5:
        stat, pval = scipy_stats.mannwhitneyu(gaming, non_gaming, alternative="two-sided")
        result["mannwhitney"] = {"statistic": round(stat, 4), "pvalue": round(pval, 6)}

    return result


def correlation_price_features(df: pd.DataFrame) -> pd.DataFrame:
    """Corrélation entre prix et features numériques."""
    num_cols = [c for c in ["price", "ram_gb", "storage_gb", "log_price"] if c in df.columns]
    if len(num_cols) < 2:
        return pd.DataFrame()
    corr = df[num_cols].corr(method="spearman").round(4)
    return corr
