# backend/config/views.py
import os, sys, json
import numpy as np
import pandas as pd
import math
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, BASE_DIR)

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

# ── Scraping ───────────────────────────────────────────────────────
from scraping.db.mysql_writer import MySQLWriter
######### Jumia ##################
from scraping.core.scraper import scrape_product
########## Amazon ##################
from scraping.core.scraper_amazon import scrape_amazon_product,AmazonScraper
############ Aliexpress ############
from scraping.core.scraper_aliex import AliexpressScraper
# ── Data Mining ───────────────────────────────────────────────────────────────
# Preprocessing
from data_mining.preprocessing.clean_data import clean_dataframe
from data_mining.preprocessing.feature_engineering import add_features_dataframe
from data_mining.preprocessing.normalize import normalize_dataframe, get_price_percentiles
# Stats
from data_mining.models.stats import (
    descriptive_stats, stats_by_brand, stats_by_category, gaming_vs_non_gaming
)
# Clustering
from data_mining.models.clustering import kmeans_clustering, find_optimal_k, cluster_summary, dbscan_clustering
# Anomalie
from data_mining.models.anomaly import (
    detect_iqr, detect_isolation_forest, anomaly_summary, get_anomalies
)
# Association
from data_mining.models.association import run_association_analysis

# chemin csv
CSV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'resultats_frontend.csv')


# corrige erreurs JSON avec numpy
def safe_json(obj):
    if isinstance(obj, (np.integer, np.int64, np.int32)): return int(obj)
    if isinstance(obj, (np.floating, np.float64, np.float32)): return float(obj)
    if isinstance(obj, np.bool_): return bool(obj)
    if isinstance(obj, float) and (np.isnan(obj) or np.isinf(obj)): return None
    if isinstance(obj, pd.Timestamp): return str(obj) #date → string
    raise TypeError(f"Type non sérialisable: {type(obj)}")


def load_pipeline():
    """Charge et prépare le dataset CSV avec tous les modules data mining."""
    df = pd.read_csv(CSV_PATH)
    df = clean_dataframe(df)
    df = add_features_dataframe(df)
    df, _ = normalize_dataframe(df, method='robust') #method='robust' → résistant aux outliers
    return df


# ════════════════════════════════════════════════════════════════════════════
# VUE 1 — SCRAPING (exactement comme avant)
# ════════════════════════════════════════════════════════════════════════════

# scrapping jumia:
def scrape_jumia(request):
    query = request.GET.get("query", "pc portable").strip().lower()

    db = MySQLWriter()

    try:
        # scraper = JumiaScraper()
        # products = scraper.scrape(query)
        products=scrape_product(query)

        inserted = 0
        if products:
            db.insert_products(products)
            inserted = len(products)

        db.close()

        return JsonResponse({
            "success": True,
            "source": "scraping -> mysql",
            "query": query,
            "scraped": len(products),
            "inserted": inserted,
            "message": f"{inserted} produits enregistrés dans MySQL"
        })

    except Exception as e:
        db.close()
        return JsonResponse({
            "success": False,
            "error": str(e)
        }, status=500)

# scrapping amazon:
def scrap_amazon(request):
    # 1. Récupérer le mot-clé depuis l'URL
    query = request.GET.get("query", "laptop").strip().lower()

    # 2. Initialiser la connexion à la base de données
    db = MySQLWriter()

    try:
        # 3. Initialiser le scraper Amazon
        # scraper = AmazonScraper()
        # products = scraper.scrape(query, max_pages=20)
        products = scrape_amazon_product(query)

        inserted = 0
        scraped_count = len(products) if products else 0
        # csv_filename = None

        if products:
            # 5. Sauvegarder en CSV
            # csv_filename = f"amazon_{query.replace(' ', '_')}.csv"
            # scraper.export_to_csv(products, csv_filename)
            
            # 6. Insérer dans la base de données
            db.insert_products(products)
            inserted = len(products)

        # 7. Fermer la connexion proprement
        db.close()

        # 8. Retourner la réponse JSON
        return JsonResponse({
            "success": True,
            "source": "scraping ->mysql",
            "query": query,
            "scraped": scraped_count,
            "inserted": inserted,
            "message": f"{inserted} produits Amazon enregistrés dans MySQL"
        })

    except Exception as e:
       # En cas de crash, on ferme la DB et on renvoie l'erreur
        if 'db' in locals():
            db.close()
        return JsonResponse({
            "success": False,
            "error": str(e)
        }, status=500)

# scrapping aliexpress:
def scrap_aliexpress(request):
    """
    Vue backend pour scraper AliExpress, sauvegarder en CSV et insérer dans MySQL.
    """
    # 1. Récupérer le mot-clé depuis l'URL (ex: ?query=clavier+mecanique)
    query = request.GET.get("query", "laptop").strip().lower()

    # 2. Initialiser la connexion à la base de données
    db = MySQLWriter()

    try:
        # 3. Initialiser le scraper AliExpress
        scraper = AliexpressScraper()
        products = scraper.scrape(query, max_pages=20)

        inserted = 0
        csv_filename = None

        if products:
            # 5. Sauvegarder en CSV
            csv_filename = f"aliexpress_{query.replace(' ', '_')}.csv"
            scraper.export_to_csv(products, csv_filename)
            
            # 6. Insérer dans la base de données MySQL
            db.insert_products(products)
            inserted = len(products)

        # 7. Fermer la connexion proprement
        db.close()

        # 8. Retourner la réponse JSON de succès
        return JsonResponse({
            "success": True,
            "source": "Aliexpress -> csv & mysql",
            "query": query,
            "scraped": len(products) if products else 0,
            "inserted": inserted,
            "csv_file": csv_filename,
            "message": f"{inserted} produits AliExpress enregistrés dans MySQL et exportés dans {csv_filename}"
        })

    except Exception as e:
        # En cas d'erreur (timeout, blocage, etc.), on ferme la DB et on renvoie l'erreur
        if db:
            db.close()
        return JsonResponse({
            "success": False,
            "error": str(e)
        }, status=500)

# scrapping all
from concurrent.futures import ThreadPoolExecutor, as_completed
@csrf_exempt
def scrape_all(request):
    query = request.GET.get("query", "laptop").strip().lower()

    db = MySQLWriter()

    results = {
        "jumia": [],
        "amazon": [],
        "aliexpress": []
    }

    errors = []
    total_inserted = 0  # On va compter les insertions au fur et à mesure

    try:
        # ─────────────────────────────────────────────
        # THREADING : lancer les 3 scrapers en parallèle
        # ─────────────────────────────────────────────
        with ThreadPoolExecutor(max_workers=3) as executor:

            futures = {
                executor.submit(scrape_product, query): "jumia",
                executor.submit(scrape_amazon_product, query): "amazon",
                executor.submit(lambda q: AliexpressScraper().scrape(q, max_pages=20), query): "aliexpress",
            }

            # as_completed se déclenche dès qu'UN thread (un scraper) a terminé
            for future in as_completed(futures):
                source = futures[future]

                try:
                    data = future.result()
                    
                    if data:
                        results[source] = data
                        
                        # ─────────────────────────────────────────────
                        # INSERTION IMMÉDIATE (sans attendre les autres)
                        # ─────────────────────────────────────────────
                        try:
                            db.insert_products(data)
                            total_inserted += len(data)
                            print(f"✅ [{source}] inséré immédiatement : {len(data)} produits")
                        except Exception as db_err:
                            errors.append(f"DB Error for {source}: {str(db_err)}")
                    else:
                        results[source] = []

                except Exception as e:
                    errors.append(f"{source} error: {str(e)}")
                    results[source] = []

        # ─────────────────────────────────────────────
        # FIN DU SCRAPING (Tous les threads sont terminés)
        # ─────────────────────────────────────────────
        db.close()
        
        total_scraped = len(results["jumia"]) + len(results["amazon"]) + len(results["aliexpress"])

        # ─────────────────────────────────────────────
        # RESPONSE JSON
        # ─────────────────────────────────────────────
        return JsonResponse({
            "success": True,
            "query": query,

            # détail par source
            "jumia_count": len(results["jumia"]),
            "amazon_count": len(results["amazon"]),
            "aliexpress_count": len(results["aliexpress"]),

            # global
            "total_scraped": total_scraped,
            "inserted": total_inserted,

            # erreurs éventuelles
            "errors": errors,

            "message": f"{total_inserted} produits enregistrés depuis 3 sources"
        })

    except Exception as e:
        db.close()
        return JsonResponse({
            "success": False,
            "error": str(e)
        }, status=500)
# search dans mysql
def search_view(request):
    query = request.GET.get("query", "").strip().lower()

    page = int(request.GET.get("page", 1))
    limit = int(request.GET.get("limit", 20))
    offset = (page - 1) * limit

    db = MySQLWriter()

    # 🔍 Si utilisateur cherche un mot -> filtrer dans la BD
    if query:
        all_products = db.get_products_by_query(query)
        total = len(all_products)
        products = all_products[offset: offset + limit]

    else:
        # 📦 Sans recherche = tous les produits
        total = db.count_all_products()
        products = db.get_all_products_paginated(limit, offset)

    db.close()

    return JsonResponse({
        "source": "mysql only",
        "query": query,
        "total": total,
        "page": page,
        "pages": (total // limit) + (1 if total % limit else 0),
        "products": products
    })
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
