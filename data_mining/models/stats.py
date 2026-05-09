# data_mining/models/stats.py
"""
Statistiques descriptives sur les prix et produits.

CORRECTIONS :
- stats_by_brand : fallback sur colonne 'brand' si 'brand_detected' absent
- descriptive_stats : robuste aux NaN
- gaming_vs_non_gaming : robuste si colonne absente
- corrélation prix/features ajoutée
"""

import pandas as pd
import numpy as np
from scipy import stats as scipy_stats


def descriptive_stats(df: pd.DataFrame, price_col: str = "price") -> dict:
    """Calcule les statistiques descriptives complètes des prix."""
    p = df[price_col].dropna()
    if len(p) == 0:
        return {}

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
        "cv":       round(float(p.std() / p.mean() * 100), 2) if p.mean() != 0 else 0,
    }
    return result


def stats_by_brand(
    df: pd.DataFrame,
    brand_col: str = "brand_detected",
    price_col: str = "price",
) -> pd.DataFrame:
    """
    Statistiques de prix agrégées par marque.

    CORRECTION : fallback sur 'brand' si 'brand_detected' absent.
    """
    # Fallback si brand_detected absent
    if brand_col not in df.columns:
        if "brand" in df.columns:
            brand_col = "brand"
        else:
            return pd.DataFrame()

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

    order = [
        "entrée_de_gamme", "milieu_de_gamme_bas",
        "milieu_de_gamme", "haut_de_gamme", "premium"
    ]
    grp = df.groupby("price_category")["price"].agg(
        count="count",
        mean="mean",
        median="median",
        min="min",
        max="max",
    ).round(2)
    grp = grp.reindex([c for c in order if c in grp.index])
    return grp.reset_index()


def price_distribution(
    df: pd.DataFrame,
    price_col: str = "price",
    bins: int = 12,
) -> pd.DataFrame:
    """Distribution du prix en tranches."""
    p = df[price_col].dropna()
    if len(p) == 0:
        return pd.DataFrame()

    counts, edges = np.histogram(p, bins=bins)
    rows = []
    for i in range(len(counts)):
        rows.append({
            "label":        f"{int(edges[i]):,}–{int(edges[i+1]):,}",
            "min":          round(float(edges[i]), 0),
            "max":          round(float(edges[i+1]), 0),
            "count":        int(counts[i]),
            "pourcentage":  round(counts[i] / counts.sum() * 100, 2),
        })
    return pd.DataFrame(rows)


def gaming_vs_non_gaming(df: pd.DataFrame) -> dict:
    """Compare les stats prix gaming vs non-gaming."""
    if "is_gaming" not in df.columns:
        return {}

    gaming     = df[df["is_gaming"] == True]["price"].dropna()
    non_gaming = df[df["is_gaming"] == False]["price"].dropna()

    def _stats(s: pd.Series) -> dict:
        if len(s) == 0:
            return {"count": 0, "mean": 0, "median": 0, "min": 0, "max": 0}
        return {
            "count":  int(len(s)),
            "mean":   round(float(s.mean()), 2),
            "median": round(float(s.median()), 2),
            "min":    round(float(s.min()), 2),
            "max":    round(float(s.max()), 2),
        }

    result = {
        "gaming":     _stats(gaming),
        "non_gaming": _stats(non_gaming),
    }

    # Test Mann-Whitney (non paramétrique, résistant aux outliers)
    if len(gaming) >= 5 and len(non_gaming) >= 5:
        stat, pval = scipy_stats.mannwhitneyu(gaming, non_gaming, alternative="two-sided")
        result["mannwhitney"] = {
            "statistic": round(float(stat), 4),
            "pvalue":    round(float(pval), 6),
            "significant": bool(pval < 0.05),
        }

    return result


def correlation_price_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Corrélation Spearman entre prix et features numériques.
    Résistante aux distributions asymétriques et outliers.
    """
    num_cols = [c for c in [
        "price", "log_price", "ram_gb", "storage_gb",
        "cpu_score", "price_per_gb_ram"
    ] if c in df.columns]

    if len(num_cols) < 2:
        return pd.DataFrame()

    corr = df[num_cols].corr(method="spearman").round(4)
    return corr


def stats_by_source(df: pd.DataFrame) -> list[dict]:
    """
    Stats prix par plateforme source — pour le Boxplot comparatif.
    Retourne une liste de dicts [{source, count, min, q1, median, q3, max, mean}].
    """
    if "source" not in df.columns:
        return []

    result = []
    for src, grp in df.groupby("source"):
        p = grp["price"].dropna()
        if len(p) < 3:
            continue
        result.append({
            "source":  str(src),
            "count":   int(len(p)),
            "min":     round(float(p.min()), 2),
            "q1":      round(float(p.quantile(0.25)), 2),
            "median":  round(float(p.median()), 2),
            "mean":    round(float(p.mean()), 2),
            "q3":      round(float(p.quantile(0.75)), 2),
            "max":     round(float(p.max()), 2),
            "std":     round(float(p.std()), 2),
        })
    return sorted(result, key=lambda x: x["median"])