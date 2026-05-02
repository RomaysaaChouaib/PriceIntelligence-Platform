# data_mining/pipelines/pipeline.py
"""
Pipeline principal de data mining.
Orchestration : Chargement → Nettoyage → Features → Normalisation
             → Stats → Clustering → Anomalies → Association
"""

import os
import pandas as pd
import numpy as np

from data_mining.preprocessing.clean_data import clean_dataframe
from data_mining.preprocessing.feature_engineering import add_features_dataframe
from data_mining.preprocessing.normalize import normalize_dataframe, get_price_percentiles

from data_mining.models.stats import (
    descriptive_stats, stats_by_brand, stats_by_category,
    gaming_vs_non_gaming, correlation_price_features,
)
from data_mining.models.clustering import (
    kmeans_clustering, find_optimal_k, cluster_summary,
)
from data_mining.models.anomaly import (
    detect_iqr, detect_zscore, detect_isolation_forest, anomaly_summary, get_anomalies,
)
from data_mining.models.association import run_association_analysis


# Chemin par défaut vers le CSV du backend
DEFAULT_CSV = os.path.join(
    os.path.dirname(__file__), "..", "..", "backend", "resultats_frontend.csv"
)


class PriceIntelligencePipeline:
    """
    Pipeline complet de data mining pour PriceIntelligence.

    Usage :
        pipeline = PriceIntelligencePipeline()
        results  = pipeline.run()
        print(results["stats"])
        print(results["cluster_summary"])
        print(results["anomalies"])
        print(results["rules"])
    """

    import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from scraping.db.mysql_writer import MySQLWriter

class PriceIntelligencePipeline:

    def __init__(self, n_clusters: int = 4):
        # ← supprime csv_path complètement
        self.n_clusters = n_clusters
        self.df_raw     = None
        self.df         = None
        self.results    = {}

    def load(self) -> "PriceIntelligencePipeline":
        print(f"\n{'='*60}")
        print(f"[Pipeline] Chargement depuis MySQL...")
        db = MySQLWriter()
        try:
            total = db.count_all_products()
            raw   = db.get_all_products_paginated(limit=total, offset=0)
        finally:
            db.close()
        self.df_raw = pd.DataFrame(raw)
        print(f"[Pipeline] {len(self.df_raw)} produits chargés depuis MySQL")
        return self

    # ── Prétraitement ─────────────────────────────────────────────────────

    def preprocess(self) -> "PriceIntelligencePipeline":
        print(f"\n[Pipeline] ── Prétraitement ──")
        df = clean_dataframe(self.df_raw)
        df = add_features_dataframe(df)
        df, _ = normalize_dataframe(df, method="robust")
        self.df = df
        print(f"[Pipeline] Dataset final : {len(self.df)} produits, {len(self.df.columns)} colonnes")
        return self

    # ── Statistiques ──────────────────────────────────────────────────────

    def compute_stats(self) -> "PriceIntelligencePipeline":
        print(f"\n[Pipeline] ── Statistiques ──")
        df = self.df
        self.results["stats"]          = descriptive_stats(df)
        self.results["stats_by_brand"] = stats_by_brand(df)
        self.results["stats_by_cat"]   = stats_by_category(df)
        self.results["gaming_stats"]   = gaming_vs_non_gaming(df)
        self.results["correlation"]    = correlation_price_features(df)
        self.results["percentiles"]    = get_price_percentiles(df)
        print(f"  Stats calculées : {list(self.results.keys())}")
        return self

    # ── Clustering ────────────────────────────────────────────────────────

    def run_clustering(self) -> "PriceIntelligencePipeline":
        print(f"\n[Pipeline] ── Clustering ──")

        # Trouver k optimal
        scores = find_optimal_k(self.df, k_range=range(2, 7))
        best_k = int(scores.loc[scores["silhouette"].idxmax(), "k"])
        print(f"  k optimal selon silhouette : {best_k}")
        self.results["optimal_k_scores"] = scores

        # KMeans avec k optimal
        self.df = kmeans_clustering(self.df, n_clusters=best_k)
        self.results["cluster_summary"] = cluster_summary(self.df)
        self.results["n_clusters"]      = best_k
        return self

    # ── Détection d'anomalies ─────────────────────────────────────────────

    def run_anomaly_detection(self) -> "PriceIntelligencePipeline":
        print(f"\n[Pipeline] ── Anomalies ──")
        df = self.df
        df = detect_iqr(df)
        df = detect_zscore(df)
        df = detect_isolation_forest(df)
        self.df = df

        self.results["anomaly_summary"] = anomaly_summary(df)
        self.results["anomalies"]       = get_anomalies(df, method="iforest")
        print(f"  {len(self.results['anomalies'])} anomalies (Isolation Forest)")
        return self

    # ── Règles d'association ──────────────────────────────────────────────

    def run_association(self) -> "PriceIntelligencePipeline":
        print(f"\n[Pipeline] ── Règles d'association ──")
        try:
            rules = run_association_analysis(
                self.df,
                min_support=0.08,
                min_confidence=0.60,
                min_lift=1.2,
            )
            self.results["rules"] = rules
        except Exception as e:
            print(f"  [assoc] Erreur : {e}")
            self.results["rules"] = pd.DataFrame()
        return self

    # ── Run complet ───────────────────────────────────────────────────────

    def run(self) -> dict:
        """Lance le pipeline complet et retourne tous les résultats."""
        (
            self.load()
                .preprocess()
                .compute_stats()
                .run_clustering()
                .run_anomaly_detection()
                .run_association()
        )
        self.results["df"] = self.df
        print(f"\n{'='*60}")
        print(f"[Pipeline] ✅ Terminé — {len(self.results)} résultats disponibles")
        return self.results

    # ── Export ────────────────────────────────────────────────────────────

    def export(self, output_dir: str = ".") -> None:
        """Export désactivé — les données sont dans MySQL/dm_cache."""
        print("[Pipeline] données stockées dans MySQL.")
