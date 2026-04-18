# backend/config/views.py
import os, sys, json
import numpy as np
import pandas as pd

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, BASE_DIR)

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

# ── Scraping (inchangé) ───────────────────────────────────────────────────────
from scraping.core.scraper import JumiaScraper
from scraping.db.mysql_writer import MySQLWriter
# ── Data Mining ───────────────────────────────────────────────────────────────
from data_mining.preprocessing.clean_data import clean_dataframe
from data_mining.preprocessing.feature_engineering import add_features_dataframe
from data_mining.preprocessing.normalize import normalize_dataframe, get_price_percentiles
from data_mining.models.stats import (
    descriptive_stats, stats_by_brand, stats_by_category, gaming_vs_non_gaming
)
from data_mining.models.clustering import kmeans_clustering, find_optimal_k, cluster_summary, dbscan_clustering
from data_mining.models.anomaly import (
    detect_iqr, detect_isolation_forest, anomaly_summary, get_anomalies
)
from data_mining.models.association import run_association_analysis

CSV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'resultats_frontend.csv')


def safe_json(obj):
    if isinstance(obj, (np.integer, np.int64, np.int32)): return int(obj)
    if isinstance(obj, (np.floating, np.float64, np.float32)): return float(obj)
    if isinstance(obj, np.bool_): return bool(obj)
    if isinstance(obj, float) and (np.isnan(obj) or np.isinf(obj)): return None
    if isinstance(obj, pd.Timestamp): return str(obj)
    raise TypeError(f"Type non sérialisable: {type(obj)}")


def load_pipeline():
    """Charge et prépare le dataset CSV avec tous les modules data mining."""
    df = pd.read_csv(CSV_PATH)
    df = clean_dataframe(df)
    df = add_features_dataframe(df)
    df, _ = normalize_dataframe(df, method='robust')
    return df


# ════════════════════════════════════════════════════════════════════════════
# VUE 1 — SCRAPING (exactement comme avant)
# GET /api/search/?query=laptop
# Scrape Jumia en live, sauvegarde le CSV, retourne les produits
# ════════════════════════════════════════════════════════════════════════════

def search_view(request):
    query = request.GET.get("query", "pc portable")

    scraper = JumiaScraper()

    # 1. SCRAPING
    products = scraper.scrape(query)

    # 2. SAVE TO CSV (pour data mining)
    scraper.export_to_csv(products, CSV_PATH)

    # 3. SAVE TO MYSQL (NEW)
    db = MySQLWriter()
    db.insert_products(products)

    return JsonResponse({"products": products})


# ════════════════════════════════════════════════════════════════════════════
# VUE 2 — PRODUITS DATA MINING
# GET /api/products/?query=hp&page=1
# Lit le CSV existant, applique preprocessing, retourne produits enrichis
# ════════════════════════════════════════════════════════════════════════════

def products_view(request):
    try:
        df = load_pipeline()

        query = request.GET.get('query', '').lower().strip()
        page  = int(request.GET.get('page', 1))
        limit = int(request.GET.get('limit', 20))

        if query:
            df = df[df['title'].str.lower().str.contains(query, na=False)]

        total  = len(df)
        start  = (page - 1) * limit
        page_df = df.iloc[start: start + limit]

        products = []
        for _, row in page_df.iterrows():
            products.append({
                'title':          str(row.get('title', '')),
                'price':          float(row['price']),
                'brand':          str(row.get('brand', '')),
                'brand_detected': str(row.get('brand_detected', '')),
                'source':         str(row.get('source', '')),
                'link':           str(row.get('link', '')),
                'image':          str(row.get('image', '')),
                'is_gaming':      bool(row.get('is_gaming', False)),
                'price_category': str(row.get('price_category', '')),
                'ram_gb':         int(row['ram_gb'])     if pd.notna(row.get('ram_gb'))     else None,
                'storage_gb':     int(row['storage_gb']) if pd.notna(row.get('storage_gb')) else None,
            })

        return JsonResponse({
            'total':    total,
            'page':     page,
            'pages':    (total + limit - 1) // limit,
            'products': products,
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


# ════════════════════════════════════════════════════════════════════════════
# VUE 3 — STATISTIQUES
# GET /api/stats/
# ════════════════════════════════════════════════════════════════════════════

def stats_view(request):
    try:
        df = load_pipeline()

        stats       = descriptive_stats(df)
        by_brand    = stats_by_brand(df).head(10).to_dict(orient='records')
        by_cat      = stats_by_category(df).to_dict(orient='records')
        gaming      = gaming_vs_non_gaming(df)
        percentiles = get_price_percentiles(df)

        counts, edges = np.histogram(df['price'], bins=12)
        distribution = [
            {
                'label': f"{int(edges[i]):,}–{int(edges[i+1]):,}",
                'count': int(counts[i]),
                'min':   round(float(edges[i]), 0),
                'max':   round(float(edges[i+1]), 0),
            }
            for i in range(len(counts))
        ]

        return JsonResponse({
            'stats':        stats,
            'by_brand':     by_brand,
            'by_category':  by_cat,
            'gaming':       gaming,
            'percentiles':  {k: round(float(v), 2) for k, v in percentiles.items()},
            'distribution': distribution,
        }, json_dumps_params={'default': safe_json})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


# ════════════════════════════════════════════════════════════════════════════
# VUE 4 — CLUSTERING
# GET /api/clustering/
# ════════════════════════════════════════════════════════════════════════════

def clustering_view(request):
    """GET /api/clustering/?algo=kmeans  ou  ?algo=dbscan"""
    try:
        algo = request.GET.get('algo', 'kmeans').lower()
        df   = load_pipeline()

        if algo == 'dbscan':
            # DBSCAN — paramètres auto
            eps         = float(request.GET.get('eps', 0.5))
            min_samples = int(request.GET.get('min_samples', 5))
            df      = dbscan_clustering(df, eps=eps, min_samples=min_samples)
            summary = cluster_summary(df)
            extra   = {'algo': 'dbscan', 'eps': eps, 'min_samples': min_samples,
                       'n_clusters': int(df['cluster'].nunique())}
        else:
            # KMEANS — k optimal automatique
            scores  = find_optimal_k(df, k_range=range(2, 7))
            best_k  = int(scores.loc[scores['silhouette'].idxmax(), 'k'])
            df      = kmeans_clustering(df, n_clusters=best_k)
            summary = cluster_summary(df)
            extra   = {'algo': 'kmeans', 'best_k': best_k,
                       'silhouette': round(float(scores['silhouette'].max()), 4),
                       'k_scores': scores.to_dict(orient='records')}

        scatter = []
        for _, row in df.sample(min(300, len(df)), random_state=42).iterrows():
            scatter.append({
                'title':   str(row['title'])[:60],
                'price':   float(row['price']),
                'cluster': str(row['cluster']),
                'brand':   str(row.get('brand_detected', '')),
                'gaming':  bool(row.get('is_gaming', False)),
            })

        return JsonResponse({
            **extra,
            'summary': summary.to_dict(orient='records'),
            'scatter': scatter,
        }, json_dumps_params={'default': safe_json})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


# ════════════════════════════════════════════════════════════════════════════
# VUE 5 — ANOMALIES
# GET /api/anomalies/
# ════════════════════════════════════════════════════════════════════════════

def anomalies_view(request):
    try:
        df = load_pipeline()
        df = detect_iqr(df)
        df = detect_isolation_forest(df)

        anom_df = get_anomalies(df, method='iforest')
        anomalies = []
        for _, row in anom_df.iterrows():
            anomalies.append({
                'title':          str(row['title'])[:80],
                'price':          float(row['price']),
                'brand_detected': str(row.get('brand_detected', '')),
                'price_category': str(row.get('price_category', '')),
            })

        return JsonResponse({
            'summary':   anomaly_summary(df).to_dict(orient='records'),
            'anomalies': anomalies,
            'total':     len(anomalies),
        }, json_dumps_params={'default': safe_json})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


# ════════════════════════════════════════════════════════════════════════════
# VUE 6 — RÈGLES D'ASSOCIATION
# GET /api/association/
# ════════════════════════════════════════════════════════════════════════════

def association_view(request):
    try:
        df    = load_pipeline()
        df    = kmeans_clustering(df, n_clusters=4)
        rules = run_association_analysis(
            df, min_support=0.08, min_confidence=0.60, min_lift=1.2
        )
        return JsonResponse({
            'total': len(rules),
            'rules': rules.to_dict(orient='records') if not rules.empty else [],
        }, json_dumps_params={'default': safe_json})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
