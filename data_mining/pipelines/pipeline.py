# data_mining/pipelines/pipeline.py
"""
Pipeline principal Data Mining — PriceIntelligence Platform.

CORRECTIONS :
- Pas de perte de données : NaN imputés, pas supprimés
- Accessoires depuis export_acc CSV (fichier local) OU MySQL
- DBSCAN fonctionne avec paramètres auto-calculés
- Anomalies contextuelles (dans chaque cluster)
- Export dm_results.json complet pour le frontend
"""

import os
import sys
import json
import math
import pandas as pd
import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from scraping.db.mysql_writer import MySQLWriter

from data_mining.preprocessing.clean_data import clean_dataframe
from data_mining.preprocessing.feature_engineering import add_features_dataframe
from data_mining.preprocessing.normalize import normalize_dataframe, get_price_percentiles

from data_mining.models.stats import (
    descriptive_stats, stats_by_brand, stats_by_category,
    gaming_vs_non_gaming, correlation_price_features,
)
from data_mining.models.clustering import (
    kmeans_clustering, dbscan_clustering, find_optimal_k,
    cluster_summary,
)
from data_mining.models.anomaly import (
    detect_iqr, detect_zscore, detect_isolation_forest, detect_lof,
    detect_contextual_anomalies, anomaly_summary, prepare_anomaly_list,
)
from data_mining.models.association import (
    run_association_analysis, run_association_accessories, run_cross_association,
)


# ── Chemin du fichier export accessoires CSV ──────────────────────────────────
EXPORT_ACC_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'export_acc.csv')
RESULTS_PATH    = os.path.join(os.path.dirname(__file__), '..', 'results', 'dm_results.json')


def _safe_json(obj):
    """Convertit les types numpy en types Python natifs."""
    if isinstance(obj, (np.integer, np.int64, np.int32)): return int(obj)
    if isinstance(obj, (np.floating, np.float64, np.float32)):
        if np.isnan(obj) or np.isinf(obj): return None
        return float(obj)
    if isinstance(obj, np.bool_): return bool(obj)
    if isinstance(obj, pd.Timestamp): return str(obj)
    if isinstance(obj, pd.Series): return obj.tolist()
    if isinstance(obj, pd.DataFrame): return obj.to_dict(orient='records')
    raise TypeError(f"Type non sérialisable : {type(obj)}")


def _clean_for_json(obj):
    """Nettoie récursivement les NaN/Inf pour JSON."""
    if isinstance(obj, float) and (math.isnan(obj) or math.isinf(obj)):
        return None
    if isinstance(obj, dict):
        return {k: _clean_for_json(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_clean_for_json(i) for i in obj]
    return obj


class PriceIntelligencePipeline:
    """
    Pipeline complet Data Mining.

    Usage :
        pipeline = PriceIntelligencePipeline()
        results  = pipeline.run()

    Ou étape par étape :
        pipeline.load().preprocess().compute_stats()
                .run_clustering().run_anomaly_detection()
                .load_accessories().run_association()
    """

    def __init__(self, n_clusters: int = None, algo: str = 'kmeans'):
        self.n_clusters = n_clusters   # None = auto (silhouette)
        self.algo       = algo
        self.df_raw     = None
        self.df         = None
        self.df_accessories = pd.DataFrame()
        self.results    = {}

    # ══════════════════════════════════════════════════════════════════════
    # 1. CHARGEMENT
    # ══════════════════════════════════════════════════════════════════════

    def load(self) -> 'PriceIntelligencePipeline':
        """Charge les produits laptops depuis MySQL."""
        print(f"\n{'='*60}")
        print("[Pipeline] Chargement depuis MySQL...")
        db = MySQLWriter()
        try:
            total = db.count_all_products()
            raw = db.get_all_products_paginated(limit=total, offset=0)
            # Filtre prix réaliste laptops
            df_temp = pd.DataFrame(raw)
            df_temp['price'] = pd.to_numeric(df_temp['price'], errors='coerce')
            df_temp = df_temp[(df_temp['price'] >= 1500) & (df_temp['price'] <= 150_000)]
            raw = df_temp.to_dict(orient='records')
            print(f"[Pipeline] Après filtre prix 1500-150k : {len(raw)} produits")
        finally:
            db.close()
        self.df_raw = pd.DataFrame(raw)
        print(f"[Pipeline] {len(self.df_raw)} produits bruts chargés")
        return self

    # ══════════════════════════════════════════════════════════════════════
    # 2. PRÉTRAITEMENT
    # ══════════════════════════════════════════════════════════════════════

    def preprocess(self) -> 'PriceIntelligencePipeline':
        """
        Nettoyage + feature engineering + normalisation.
        Aucune ligne n'est supprimée à cause de NaN dans les features.
        """
        print(f"\n[Pipeline] ── Prétraitement ──")
        df = clean_dataframe(self.df_raw)
        df = add_features_dataframe(df)
        df, _ = normalize_dataframe(df, method='robust')
        self.df = df
        print(f"[Pipeline] Dataset final : {len(df)} produits × {len(df.columns)} colonnes")
        print(f"  RAM disponible : {df['ram_gb'].notna().sum()}/{len(df)} ({df['ram_gb'].notna().mean()*100:.0f}%)")
        print(f"  Stockage disponible : {df['storage_gb'].notna().sum()}/{len(df)} ({df['storage_gb'].notna().mean()*100:.0f}%)")
        return self

    # ══════════════════════════════════════════════════════════════════════
    # 3. STATISTIQUES
    # ══════════════════════════════════════════════════════════════════════

    def compute_stats(self) -> 'PriceIntelligencePipeline':
        print(f"\n[Pipeline] ── Statistiques ──")
        df = self.df
        self.results['stats']          = descriptive_stats(df)
        self.results['stats_by_brand'] = stats_by_brand(df)
        self.results['stats_by_cat']   = stats_by_category(df)
        self.results['gaming_stats']   = gaming_vs_non_gaming(df)
        self.results['percentiles']    = get_price_percentiles(df)

        # Histogramme
        counts, edges = np.histogram(df['price'], bins=12)
        self.results['histogram'] = [
            {'label': f"{int(edges[i]):,}–{int(edges[i+1]):,}", 'count': int(counts[i])}
            for i in range(len(counts))
        ]

        # Brand bar
        brand_col = 'brand_detected' if 'brand_detected' in df.columns else 'brand'
        brand_grp = df.groupby(brand_col)['price'].agg(
            count='count', mean='mean', median='median'
        ).sort_values('count', ascending=False).head(10).round(2)
        self.results['brand_bar'] = brand_grp.reset_index().to_dict(orient='records')

        # Boxplot par source
        by_source = []
        if 'source' in df.columns:
            for src, grp in df.groupby('source'):
                p = grp['price']
                by_source.append({
                    'source': str(src), 'count': int(len(grp)),
                    'min': float(p.min()), 'q1': float(p.quantile(0.25)),
                    'median': float(p.median()), 'mean': round(float(p.mean()), 2),
                    'q3': float(p.quantile(0.75)), 'max': float(p.max()),
                })
        self.results['boxplot_by_source'] = by_source
        print(f"  Stats calculées pour {self.results['stats']['count']} produits")
        return self

    # ══════════════════════════════════════════════════════════════════════
    # 4. CLUSTERING
    # ══════════════════════════════════════════════════════════════════════

    def run_clustering(self) -> 'PriceIntelligencePipeline':
        print(f"\n[Pipeline] ── Clustering ──")
        df = self.df

        # ── KMeans ───────────────────────────────────────────────────────
        k_scores = find_optimal_k(df, k_range=range(2, 8))

        # Exclure les k avec un cluster trop petit (< 1% des données)
        min_size = max(10, len(df) * 0.01)
        valid_rows = []
        for _, row in k_scores.iterrows():
            k = int(row['k'])
            temp = kmeans_clustering(df.copy(), n_clusters=k)
            if temp['cluster'].value_counts().min() >= min_size:
                valid_rows.append(row)

        if valid_rows:
            valid_scores = pd.DataFrame(valid_rows)
            best_k = int(valid_scores.loc[valid_scores['silhouette'].idxmax(), 'k'])
        else:
            best_k = 5  # fallback si aucun k valide

        n_k = self.n_clusters or max(best_k, 5)
        print(f"  k optimal (silhouette) : {best_k} → utilisation k={n_k}")
        self.results['k_scores'] = k_scores.to_dict(orient='records')
        self.results['best_k']   = n_k

        df_kmeans = kmeans_clustering(df.copy(), n_clusters=n_k)
        kmeans_sum = cluster_summary(df_kmeans)
        self.results['kmeans_summary']   = kmeans_sum.to_dict(orient='records')
        scatter = []
        for _, row in df_kmeans.sample(min(300, len(df_kmeans)), random_state=42).iterrows():
            scatter.append({
                'title':  str(row['title'])[:60],
                'price':  float(row['price']),
                'cluster': str(row['cluster']),
                'brand':  str(row.get('brand_detected', '')),
                'gaming': bool(row.get('is_gaming', False))
            })
        self.results['cluster_scatter'] = scatter
        self.results['pca_scatter']     = []
        self.results['radar_clusters']  = []

        # On conserve df avec clusters KMeans pour la suite (anomalies, association)
        self.df = df_kmeans

        # ── DBSCAN ───────────────────────────────────────────────────────
        try:
            df_dbscan = dbscan_clustering(df.copy())  # paramètres auto
            dbscan_sum = cluster_summary(df_dbscan)
            self.results['dbscan_summary'] = dbscan_sum.to_dict(orient='records')
            self.results['dbscan_attrs'] = {
                'eps':        df_dbscan.attrs.get('dbscan_eps', 0),
                'min_samples': df_dbscan.attrs.get('dbscan_min_samples', 0),
                'n_clusters': df_dbscan.attrs.get('dbscan_n_clusters', 0),
                'n_outliers': df_dbscan.attrs.get('dbscan_n_outliers', 0),
                'silhouette': df_dbscan.attrs.get('dbscan_silhouette', 0),
            }
        except Exception as e:
            print(f"  [DBSCAN] Erreur : {e}")
            self.results['dbscan_summary'] = []
            self.results['dbscan_attrs']   = {}

        return self

    # ══════════════════════════════════════════════════════════════════════
    # 5. ANOMALIES
    # ══════════════════════════════════════════════════════════════════════

    def run_anomaly_detection(self) -> 'PriceIntelligencePipeline':
        print(f"\n[Pipeline] ── Détection d'anomalies ──")
        df = self.df

        df = detect_iqr(df, factor=2.5)
        df = detect_zscore(df, threshold=3.0)
        df = detect_isolation_forest(df, contamination=0.05)
        df = detect_lof(df, contamination=0.05)
        df = detect_contextual_anomalies(df)

        self.df = df
        self.results['anomaly_summary'] = anomaly_summary(df).to_dict(orient='records')
        # Anomalies Isolation Forest (les plus fiables, multivariées)
        self.results['anomalies'] = prepare_anomaly_list(df, method='iforest', top_n=150)
        print(f"  {len(self.results['anomalies'])} anomalies IForest enrichies")
        return self

    # ══════════════════════════════════════════════════════════════════════
    # 6. ACCESSOIRES
    # ══════════════════════════════════════════════════════════════════════

    def load_accessories(self) -> 'PriceIntelligencePipeline':
        """
        Charge les accessoires depuis :
        1. export_acc.csv (si présent à la racine du projet)
        2. Table MySQL 'accessories' (fallback)
        """
        print(f"\n[Pipeline] ── Chargement accessoires ──")

        # ── Depuis CSV (export_acc) ───────────────────────────────────────
        if os.path.exists(EXPORT_ACC_PATH):
            print(f"  Lecture depuis {EXPORT_ACC_PATH}")
            try:
                acc = pd.read_csv(EXPORT_ACC_PATH, encoding='utf-8-sig')
                print(f"  {len(acc)} lignes dans export_acc.csv")
                self.df_accessories = self._prepare_accessories(acc)
                print(f"  {len(self.df_accessories)} accessoires valides")
                return self
            except Exception as e:
                print(f"  [CSV] Erreur : {e} → fallback MySQL")

        # ── Depuis MySQL ──────────────────────────────────────────────────
        try:
            db = MySQLWriter()
            total = db.count_all_accessories()
            raw   = db.get_all_accessories_paginated(limit=total, offset=0)
            db.close()
            if raw:
                acc = pd.DataFrame(raw)
                self.df_accessories = self._prepare_accessories(acc)
                print(f"  {len(self.df_accessories)} accessoires depuis MySQL")
            else:
                print("  Aucun accessoire en base MySQL.")
        except Exception as e:
            print(f"  [MySQL acc] Erreur : {e}")

        return self

    def _prepare_accessories(self, acc: pd.DataFrame) -> pd.DataFrame:
        """Nettoie et prépare le DataFrame accessoires."""
        RATES = {'MAD': 1.0, 'DH': 1.0, 'USD': 10.0, 'EUR': 11.0, 'GBP': 13.0}
        PRICE_RANGES = {
            'souris': (10, 10_000),
            'stand':  (10,  5_000),
            'usb':    (5,   3_000),
        }

        acc = acc.copy()
        acc['price'] = pd.to_numeric(acc.get('price', pd.Series()), errors='coerce')

        # Conversion devise
        if 'currency' in acc.columns:
            acc['price'] = acc.apply(
                lambda r: r['price'] * RATES.get(str(r.get('currency', 'MAD')).upper(), 1.0),
                axis=1
            )

        acc = acc[acc['price'] > 0].dropna(subset=['price'])

        # Normaliser nom colonne catégorie
        if 'category' in acc.columns and 'accessory_category' not in acc.columns:
            acc = acc.rename(columns={'category': 'accessory_category'})

        if 'accessory_category' not in acc.columns:
            # Essayer de deviner depuis le nom de colonne ou titre
            acc['accessory_category'] = 'divers'

        # Filtre prix par catégorie
        cleaned = []
        for cat, grp in acc.groupby('accessory_category'):
            pmin, pmax = PRICE_RANGES.get(str(cat).lower(), (1, 100_000))
            cleaned.append(grp[(grp['price'] >= pmin) & (grp['price'] <= pmax)])

        if not cleaned:
            return pd.DataFrame()

        acc = pd.concat(cleaned, ignore_index=True)

        # Price range pour association
        def _price_range(row):
            cat   = str(row.get('accessory_category', '')).lower()
            price = float(row.get('price', 0))
            if cat == 'souris': return 'bas' if price < 100 else ('moyen' if price < 500 else 'haut')
            if cat == 'stand':  return 'bas' if price < 100 else ('moyen' if price < 400 else 'haut')
            return 'bas' if price < 50 else ('moyen' if price < 200 else 'haut')

        acc['price_range'] = acc.apply(_price_range, axis=1)

        # is_gaming si absent
        if 'is_gaming' not in acc.columns:
            acc['is_gaming'] = acc.get('title', pd.Series('')).str.lower().str.contains(
                'gaming|gamer|rog|predator', na=False
            )

        return acc.reset_index(drop=True)

    # ══════════════════════════════════════════════════════════════════════
    # 7. ASSOCIATION
    # ══════════════════════════════════════════════════════════════════════

    def run_association(self) -> 'PriceIntelligencePipeline':
        print(f"\n[Pipeline] ── Règles d'association ──")

        # Laptops
        try:
            rules = run_association_analysis(
                self.df,
                min_support=0.08, min_confidence=0.60, min_lift=1.2,
            )
            self.results['rules'] = rules.to_dict(orient='records') if not rules.empty else []
            print(f"  {len(self.results['rules'])} règles laptops")
        except Exception as e:
            print(f"  [assoc laptops] Erreur : {e}")
            self.results['rules'] = []

        # Accessoires
        if not self.df_accessories.empty:
            try:
                rules_acc = run_association_accessories(
                    self.df_accessories,
                    min_support=0.05, min_confidence=0.5, min_lift=1.0,
                )
                self.results['rules_accessories'] = rules_acc.to_dict(orient='records') if not rules_acc.empty else []
                print(f"  {len(self.results['rules_accessories'])} règles accessoires")
            except Exception as e:
                print(f"  [assoc acc] Erreur : {e}")
                self.results['rules_accessories'] = []

            # Statistiques accessoires pour le frontend
            try:
                acc_stats_by_cat = []
                for cat, grp in self.df_accessories.groupby('accessory_category'):
                    p = grp['price']
                    acc_stats_by_cat.append({
                        'category': str(cat), 'count': int(len(grp)),
                        'mean': round(float(p.mean()), 2), 'median': round(float(p.median()), 2),
                        'min': round(float(p.min()), 2), 'max': round(float(p.max()), 2),
                        'q1': round(float(p.quantile(0.25)), 2), 'q3': round(float(p.quantile(0.75)), 2),
                    })
                self.results['acc_stats_by_cat'] = acc_stats_by_cat

                # Boxplot accessoires par catégorie
                self.results['acc_boxplot'] = acc_stats_by_cat
            except Exception as e:
                print(f"  [acc stats] Erreur : {e}")

            # Cross association
            try:
                rules_cross = run_cross_association(
                    self.df, self.df_accessories, sample_size=3000,
                )
                self.results['rules_cross'] = rules_cross.to_dict(orient='records') if not rules_cross.empty else []
                print(f"  {len(self.results['rules_cross'])} règles croisées laptop×accessoires")
            except Exception as e:
                print(f"  [cross assoc] Erreur : {e}")
                self.results['rules_cross'] = []
        else:
            print("  Pas d'accessoires → association accessoires ignorée")
            self.results['rules_accessories'] = []
            self.results['rules_cross'] = []

        return self

    # ══════════════════════════════════════════════════════════════════════
    # 8. EXPORT → dm_results.json
    # ══════════════════════════════════════════════════════════════════════

    def export_json(self) -> 'PriceIntelligencePipeline':
        """
        Exporte tous les résultats vers data_mining/results/dm_results.json.
        Ce fichier est servi directement par Django en fallback.
        """
        print(f"\n[Pipeline] ── Export JSON ──")

        payload = {
            'laptops': {
                'stats':              self.results.get('stats', {}),
                'best_k':             self.results.get('best_k', 4),
                'k_scores':           self.results.get('k_scores', []),
                'kmeans_summary':     self.results.get('kmeans_summary', []),
                'dbscan_summary':     self.results.get('dbscan_summary', []),
                'dbscan_attrs':       self.results.get('dbscan_attrs', {}),
                'histogram':          self.results.get('histogram', []),
                'boxplot_by_source':  self.results.get('boxplot_by_source', []),
                'cluster_scatter':    self.results.get('cluster_scatter', []),
                'pca_scatter':        self.results.get('pca_scatter', []),
                'brand_bar':          self.results.get('brand_bar', []),
                'radar_clusters':     self.results.get('radar_clusters', []),
                'anomalies':          self.results.get('anomalies', []),
                'anomaly_summary':    self.results.get('anomaly_summary', []),
                'association_rules':  self.results.get('rules', []),
            },
            'accessories': {
                'stats_by_category':  self.results.get('acc_stats_by_cat', []),
                'boxplot_categories': self.results.get('acc_boxplot', []),
                'association_rules':  self.results.get('rules_accessories', []),
            },
            'cross_association':      self.results.get('rules_cross', []),
        }

        payload = _clean_for_json(payload)

        os.makedirs(os.path.dirname(RESULTS_PATH), exist_ok=True)
        with open(RESULTS_PATH, 'w', encoding='utf-8') as f:
            json.dump(payload, f, ensure_ascii=False, indent=2, default=_safe_json)

        print(f"  ✅ dm_results.json exporté : {RESULTS_PATH}")
        return self

    # ══════════════════════════════════════════════════════════════════════
    # RUN COMPLET
    # ══════════════════════════════════════════════════════════════════════

    def run(self) -> dict:
        """Lance le pipeline complet."""
        (
            self.load()
                .preprocess()
                .compute_stats()
                .run_clustering()
                .run_anomaly_detection()
                .load_accessories()
                .run_association()
                .export_json()
        )
        print(f"\n{'='*60}")
        print(f"[Pipeline] ✅ Terminé")
        return self.results


# ── Lancement direct ──────────────────────────────────────────────────────────
if __name__ == '__main__':
    pipeline = PriceIntelligencePipeline()
    pipeline.run()