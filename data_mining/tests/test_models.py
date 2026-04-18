# data_mining/tests/test_models.py
"""
Tests unitaires pour tous les modèles data mining.
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

import pytest
import pandas as pd
import numpy as np

from data_mining.preprocessing.clean_data import clean_data, clean_dataframe, fix_jumia_price, is_excluded
from data_mining.preprocessing.feature_engineering import (
    add_features, add_features_dataframe, detect_brand, extract_ram, extract_storage, price_category
)
from data_mining.preprocessing.normalize import normalize_prices, normalize_dataframe

from data_mining.models.stats import (
    descriptive_stats, stats_by_brand, gaming_vs_non_gaming
)
from data_mining.models.clustering import (
    kmeans_clustering, find_optimal_k, cluster_summary
)
from data_mining.models.anomaly import (
    detect_iqr, detect_zscore, detect_isolation_forest, anomaly_summary
)
from data_mining.models.association import run_association_analysis


# ── Fixtures ──────────────────────────────────────────────────────────────────

def make_sample_df(n=50):
    """DataFrame de test réaliste."""
    np.random.seed(42)
    titles = [
        "HP EliteBook 840 G5 Core i5 8Go 256Go SSD",
        "Dell Latitude 5420 i7 16Go 512Go SSD",
        "Lenovo ThinkPad X1 Carbon 16Go 1To SSD",
        "Asus VivoBook 15 8Go 512Go SSD",
        "MacBook Air M2 8Go 256Go",
        "Acer Aspire 5 i5 8Go 256Go",
        "MSI Gaming GF63 16Go 512Go RTX",
        "Asus ROG Strix Gaming i7 16Go 512Go",
        "PC Bureau Dell OptiPlex i5 8Go",
        "Lenovo IdeaPad 3 4Go 256Go",
    ]
    brands = ["HP", "Dell", "Lenovo", "Asus", "Apple", "Acer", "MSI", "Asus", "Dell", "Lenovo"]
    prices = [8500, 12000, 22000, 6500, 18000, 5500, 15000, 19000, 7000, 3500]

    rows = []
    for i in range(n):
        idx = i % len(titles)
        noise = np.random.uniform(0.85, 1.15)
        rows.append({
            "title":        titles[idx],
            "price":        int(prices[idx] * noise),
            "brand":        brands[idx],
            "source":       "Jumia",
            "is_gaming":    "gaming" in titles[idx].lower() or "rog" in titles[idx].lower(),
            "search_query": "pc portable",
            "page":         1,
        })
    return pd.DataFrame(rows)


# ── Preprocessing ─────────────────────────────────────────────────────────────

class TestCleanData:

    def test_fix_jumia_price_centimes(self):
        assert fix_jumia_price(1299900) == pytest.approx(12999.0)

    def test_fix_jumia_price_normal(self):
        assert fix_jumia_price(8500) == 8500

    def test_is_excluded_souris(self):
        assert is_excluded("Souris gaming Logitech") is True

    def test_is_excluded_laptop(self):
        assert is_excluded("HP EliteBook 840 Core i5") is False

    def test_clean_data_removes_accessories(self):
        products = [
            {"title": "HP EliteBook 840", "price": 8500},
            {"title": "Souris Logitech Gaming", "price": 150},
            {"title": "Dell Latitude i7", "price": 12000},
        ]
        result = clean_data(products)
        assert len(result) == 2
        assert all("souris" not in p["title"].lower() for p in result)

    def test_clean_data_removes_invalid_price(self):
        products = [
            {"title": "HP EliteBook", "price": None},
            {"title": "Dell Laptop", "price": -100},
            {"title": "Lenovo ThinkPad", "price": 9000},
        ]
        result = clean_data(products)
        assert len(result) == 1

    def test_clean_dataframe_shape(self):
        df = make_sample_df(50)
        cleaned = clean_dataframe(df)
        assert len(cleaned) > 0
        assert "price" in cleaned.columns

    def test_clean_dataframe_no_duplicates(self):
        df = make_sample_df(50)
        # Ajouter doublons explicites
        df = pd.concat([df, df.head(5)], ignore_index=True)
        cleaned = clean_dataframe(df)
        assert cleaned.duplicated(subset=["title", "price"]).sum() == 0


class TestFeatureEngineering:

    def test_detect_brand_hp(self):
        assert detect_brand("HP EliteBook 840 Core i5") == "HP"

    def test_detect_brand_apple_macbook(self):
        assert detect_brand("MacBook Air M2 8Go") == "Apple"

    def test_detect_brand_rog(self):
        assert detect_brand("Asus ROG Strix Gaming") == "Asus"

    def test_extract_ram_8go(self):
        assert extract_ram("HP EliteBook 8Go RAM 256SSD") == 8

    def test_extract_ram_16gb(self):
        assert extract_ram("Dell Latitude 16GB DDR4") == 16

    def test_extract_ram_none(self):
        assert extract_ram("Laptop sans specs") is None

    def test_extract_storage_256ssd(self):
        assert extract_storage("HP EliteBook 256Go SSD") == 256

    def test_extract_storage_1to(self):
        assert extract_storage("Laptop 1To HDD") == 1000

    def test_price_category_entree(self):
        assert price_category(2000) == "entrée_de_gamme"

    def test_price_category_premium(self):
        assert price_category(30000) == "premium"

    def test_add_features_dataframe(self):
        df = make_sample_df(20)
        df_feat = add_features_dataframe(df)
        assert "brand_detected" in df_feat.columns
        assert "price_category" in df_feat.columns
        assert "log_price" in df_feat.columns


class TestNormalize:

    def test_normalize_prices_minmax(self):
        products = [{"price": 1000}, {"price": 5000}, {"price": 10000}]
        result = normalize_prices(products)
        assert result[0]["price_normalized"] == pytest.approx(0.0)
        assert result[-1]["price_normalized"] == pytest.approx(1.0)

    def test_normalize_prices_identical(self):
        products = [{"price": 5000}, {"price": 5000}]
        result = normalize_prices(products)
        assert all(p["price_normalized"] == 0.0 for p in result)

    def test_normalize_dataframe(self):
        df = make_sample_df(20)
        df["log_price"] = np.log10(df["price"])
        df_norm, scaler = normalize_dataframe(df, method="robust")
        assert "price_scaled" in df_norm.columns
        assert "log_price_scaled" in df_norm.columns


# ── Models ────────────────────────────────────────────────────────────────────

class TestStats:

    def setup_method(self):
        df = make_sample_df(50)
        self.df = add_features_dataframe(df)

    def test_descriptive_stats_keys(self):
        stats = descriptive_stats(self.df)
        for key in ["count", "mean", "median", "std", "min", "max", "p25", "p75"]:
            assert key in stats

    def test_stats_by_brand_shape(self):
        result = stats_by_brand(self.df)
        assert isinstance(result, pd.DataFrame)
        assert "brand_detected" in result.columns
        assert len(result) > 0

    def test_gaming_vs_non_gaming(self):
        result = gaming_vs_non_gaming(self.df)
        assert "gaming" in result
        assert "non_gaming" in result


class TestClustering:

    def setup_method(self):
        df = make_sample_df(60)
        self.df = add_features_dataframe(df)

    def test_kmeans_returns_cluster_col(self):
        result = kmeans_clustering(self.df, n_clusters=3)
        assert "cluster" in result.columns

    def test_kmeans_n_clusters(self):
        result = kmeans_clustering(self.df, n_clusters=3)
        assert result["cluster"].nunique() <= 3

    def test_find_optimal_k(self):
        scores = find_optimal_k(self.df, k_range=range(2, 5))
        assert "k" in scores.columns
        assert "silhouette" in scores.columns
        assert len(scores) > 0

    def test_cluster_summary(self):
        df_clust = kmeans_clustering(self.df, n_clusters=3)
        summary = cluster_summary(df_clust)
        assert isinstance(summary, pd.DataFrame)
        assert len(summary) > 0


class TestAnomaly:

    def setup_method(self):
        df = make_sample_df(60)
        self.df = add_features_dataframe(df)
        # Ajouter quelques anomalies évidentes
        outliers = pd.DataFrame([
            {"title": "Laptop ultra cheap", "price": 100, "brand": "X",
             "is_gaming": False, "log_price": 2.0, "brand_detected": "Autre",
             "price_category": "entrée_de_gamme"},
            {"title": "Laptop ultra premium", "price": 190000, "brand": "X",
             "is_gaming": False, "log_price": 5.28, "brand_detected": "Autre",
             "price_category": "premium"},
        ])
        self.df = pd.concat([self.df, outliers], ignore_index=True)

    def test_detect_iqr_adds_column(self):
        result = detect_iqr(self.df)
        assert "anomaly_iqr" in result.columns

    def test_detect_zscore_adds_column(self):
        result = detect_zscore(self.df)
        assert "anomaly_zscore" in result.columns

    def test_detect_iforest_adds_column(self):
        result = detect_isolation_forest(self.df)
        assert "anomaly_iforest" in result.columns

    def test_anomaly_summary(self):
        df = detect_iqr(self.df)
        df = detect_zscore(df)
        df = detect_isolation_forest(df)
        summary = anomaly_summary(df)
        assert isinstance(summary, pd.DataFrame)
        assert len(summary) >= 3


class TestAssociation:

    def setup_method(self):
        df = make_sample_df(80)
        self.df = add_features_dataframe(df)

    def test_rules_returns_dataframe(self):
        rules = run_association_analysis(
            self.df,
            min_support=0.05,
            min_confidence=0.5,
            min_lift=1.0,
        )
        assert isinstance(rules, pd.DataFrame)

    def test_rules_columns(self):
        rules = run_association_analysis(
            self.df,
            min_support=0.05,
            min_confidence=0.5,
            min_lift=1.0,
        )
        if not rules.empty:
            for col in ["antecedent", "consequent", "support", "confidence", "lift"]:
                assert col in rules.columns

    def test_rules_lift_sorted(self):
        rules = run_association_analysis(
            self.df,
            min_support=0.05,
            min_confidence=0.5,
            min_lift=1.0,
        )
        if len(rules) > 1:
            lifts = rules["lift"].tolist()
            assert lifts == sorted(lifts, reverse=True)
