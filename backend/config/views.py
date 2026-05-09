from linecache import cache
import os, sys, json
import numpy as np
import pandas as pd
import math

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, BASE_DIR)

STOP_SCRAPING = False

# Chemin vers le fichier de résultats DM précalculés
DM_RESULTS_PATH = os.path.join(BASE_DIR, 'data_mining', 'results', 'dm_results.json')

def _load_dm_results():
    """Charge le fichier dm_results.json précalculé."""
    try:
        with open(DM_RESULTS_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"[DM] Impossible de charger dm_results.json : {e}")
        return {}

from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, BASE_DIR)

# Scraping
from scraping.db.mysql_writer import MySQLWriter
from scraping.core.scraper import scrape_product
from scraping.core.scraper_amazon import scrape_amazon_product, AmazonScraper
from scraping.core.scraper_aliex import AliexpressScraper

from data_mining.preprocessing.clean_data import clean_dataframe
from data_mining.preprocessing.feature_engineering import add_features_dataframe
from data_mining.preprocessing.normalize import normalize_dataframe, get_price_percentiles
from data_mining.models.stats import (
    descriptive_stats, stats_by_brand, stats_by_category, gaming_vs_non_gaming
)
from data_mining.models.clustering import kmeans_clustering, find_optimal_k, cluster_summary, dbscan_clustering
from data_mining.models.anomaly import (
    detect_iqr, detect_isolation_forest, detect_lof, anomaly_summary, get_anomalies
)
from data_mining.models.association import run_association_analysis, run_association_accessories, run_cross_association
from data_mining.visualization.prepare_data import prepare_pca_scatter


def safe_json(obj):
    if isinstance(obj, (np.integer, np.int64, np.int32)): return int(obj)
    if isinstance(obj, (np.floating, np.float64, np.float32)): return float(obj)
    if isinstance(obj, np.bool_): return bool(obj)
    if isinstance(obj, float) and (np.isnan(obj) or np.isinf(obj)): return None
    if isinstance(obj, pd.Timestamp): return str(obj)
    raise TypeError(f"Type non sérialisable: {type(obj)}")


def load_from_db():
    db = MySQLWriter()
    try:
        total = db.count_all_products()
        raw_products = db.get_all_products_paginated(limit=total, offset=0)
    finally:
        db.close()

    if not raw_products:
        return pd.DataFrame(columns=[
            'title', 'price', 'brand', 'source', 'link',
            'image', 'search_query', 'page', 'is_gaming', 'date_scraped'
        ])

    df = pd.DataFrame(raw_products)
    df['price'] = pd.to_numeric(df['price'], errors='coerce')
    df = df[(df['price'] >= 1500) & (df['price'] <= 150_000)]
    df = clean_dataframe(df)
    df = add_features_dataframe(df)
    df, _ = normalize_dataframe(df, method='robust')
    return df

# ════════════════════════════════════════════════════════════════════════════
# SCRAPING VIEWS (inchangées)
# ════════════════════════════════════════════════════════════════════════════
# STOP_SCRAPING = False
# def stop_scraping_action(request):
#     """ Fonction pour demander l'arrêt """
#     global STOP_SCRAPING
#     STOP_SCRAPING = True
#     return JsonResponse({"message": "Signal d'arrêt envoyé (STOP_SCRAPING = True)"})
from config.celery import app 
from django.core.cache import cache

@csrf_exempt
def stop_scraping_action(request):
    task_id = None
    if request.method == "GET":
        task_id = request.GET.get("task_id")
    elif request.method == "POST":
        try:
            data = json.loads(request.body)
            task_id = data.get("task_id")
        except json.JSONDecodeError:
            task_id = request.POST.get("task_id")

    cache.set("STOP_SCRAPING", True, 300)

    if not task_id:
        return JsonResponse({
            "success": False,
            "message": "Signal d'arrêt envoyé, mais aucun task_id fourni."
        }, status=400)

    try:
        app.control.revoke(task_id, terminate=True)
    except Exception as e:
        return JsonResponse({"success": False, "error": f"Erreur Celery: {str(e)}"})

    return JsonResponse({
        "success": True, 
        "message": f"Le scraping (Tâche {task_id}) a été stoppé avec succès."
    })
from . import tasks

def scrape_jumia(request):
    query = request.GET.get("query", "pc portable").strip().lower()
    
    # On lance la tâche en arrière-plan sans attendre
    task = tasks.scrape_jumia_task.delay(query)
    
    return JsonResponse({
        "success": True,
        "task_id": task.id,  # L'ID pour suivre l'avancement
        "message": "Le scraping a commencé en arrière-plan."
    })


def scrap_amazon(request):
    global STOP_SCRAPING
    STOP_SCRAPING = False
    query = request.GET.get("query", "laptop").strip().lower()
    db = MySQLWriter()
    try:
        products = scrape_amazon_product(query)
        if STOP_SCRAPING:
            db.close()
            return JsonResponse({"success": False, "message": "Scraping Amazon interrompu."})
        inserted = 0
        if products:
            db.insert_products(products)
            inserted = len(products)
            for ck in ['stats', 'clustering_kmeans', 'clustering_dbscan', 'anomalies', 'association', 'pca']:
                db.save_cache(ck, None)
        db.close()
        return JsonResponse({"success": True, "source": "scraping -> mysql", "query": query,
                             "scraped": len(products) if products else 0, "inserted": inserted,
                             "message": f"{inserted} produits Amazon enregistrés"})
    except Exception as e:
        if 'db' in locals(): db.close()
        return JsonResponse({"success": False, "error": str(e)}, status=500)


def scrap_aliexpress(request):
    global STOP_SCRAPING
    STOP_SCRAPING = False
    query = request.GET.get("query", "laptop").strip().lower()
    db = MySQLWriter()
    try:
        scraper = AliexpressScraper()
        products = scraper.scrape(query, max_pages=20)
        if STOP_SCRAPING:
            db.close()
            return JsonResponse({"success": False, "message": "Scraping AliExpress interrompu."})
        inserted = 0
        if products:
            db.insert_products(products)
            inserted = len(products)
            for ck in ['stats', 'clustering_kmeans', 'clustering_dbscan', 'anomalies', 'association', 'pca']:
                db.save_cache(ck, None)
        db.close()
        return JsonResponse({"success": True, "source": "Aliexpress -> mysql", "query": query,
                             "scraped": len(products) if products else 0, "inserted": inserted,
                             "message": f"{inserted} produits AliExpress enregistrés"})
    except Exception as e:
        if 'db' in locals(): db.close()
        return JsonResponse({"success": False, "error": str(e)}, status=500)


from concurrent.futures import ThreadPoolExecutor, as_completed

def scrape_all(request):
    query = request.GET.get("query", "laptop").strip().lower()
    
    # On lance la tâche globale en arrière-plan sans attendre
    task = tasks.scrape_all_task.delay(query)
    
    return JsonResponse({
        "success": True,
        "task_id": task.id,  # L'ID pour suivre l'avancement ou pour le forcer à s'arrêter
        "message": "Le scraping global (Jumia, Amazon, Aliexpress) a commencé en arrière-plan."
    })
# Ancienne version de scrape_all (sans Celery, avec vérification du signal d'arrêt)
# @csrf_exempt
# def scrape_all(request):
#     global STOP_SCRAPING
#     STOP_SCRAPING = False # On réinitialise à chaque appel
    
#     query = request.GET.get("query", "laptop").strip().lower()
#     db = MySQLWriter()
#     results = {"jumia": [], "amazon": [], "aliexpress": []}
#     errors = []
#     total_inserted = 0

#     try:
#         with ThreadPoolExecutor(max_workers=3) as executor:
#             futures = {
#                 executor.submit(scrape_product, query): "jumia",
#                 executor.submit(scrape_amazon_product, query): "amazon",
#                 executor.submit(lambda q: AliexpressScraper().scrape(q, max_pages=20), query): "aliexpress",
#             }

#             for future in as_completed(futures):
#                 source = futures[future]
                
#                 # --- AJOUT SÉCURITÉ STOP ---
#                 if STOP_SCRAPING:
#                     errors.append(f"Interruption : Les données de {source} ont été ignorées.")
#                     continue 
#                 # ---------------------------

#                 try:
#                     data = future.result()
                    
#                     if data:
#                         results[source] = data
                        
#                         # Deuxième vérification juste avant l'écriture MySQL
#                         if not STOP_SCRAPING:
#                             try:
#                                 db.insert_products(data)
#                                 total_inserted += len(data)
#                                 print(f"✅ [{source}] inséré immédiatement : {len(data)} produits")
#                             except Exception as db_err:
#                                 errors.append(f"DB Error for {source}: {str(db_err)}")
#                     else:
#                         results[source] = []

#                 except Exception as e:
#                     errors.append(f"{source} error: {str(e)}")
#                     results[source] = []

#         db.close()
        
#         total_scraped = len(results["jumia"]) + len(results["amazon"]) + len(results["aliexpress"])

#         return JsonResponse({
#             "success": not STOP_SCRAPING,
#             "query": query,
#             "jumia_count": len(results["jumia"]),
#             "amazon_count": len(results["amazon"]),
#             "aliexpress_count": len(results["aliexpress"]),
#             "total_scraped": total_scraped,
#             "inserted": total_inserted,
#             "errors": errors,
#             "message": "Scraping interrompu" if STOP_SCRAPING else f"{total_inserted} produits enregistrés"
#         })
#     except Exception as e:
#         if 'db' in locals(): db.close()
#         return JsonResponse({"success": False, "error": str(e)}, status=500)


from celery.result import AsyncResult

def check_status(request, task_id):
    res = AsyncResult(task_id)
    return JsonResponse({
        "task_id": task_id,
        "status": res.status,
        "result": res.result if res.ready() else None
    })


# ════════════════════════════════════════════════════════════════════════════
# PRODUITS & RECHERCHE
# ════════════════════════════════════════════════════════════════════════════

def search_view(request):
    query  = request.GET.get("query", "").strip().lower()
    page   = int(request.GET.get("page", 1))
    limit  = int(request.GET.get("limit", 20))
    offset = (page - 1) * limit
    db = MySQLWriter()
    if query:
        all_products = db.get_products_by_query(query)
        total    = len(all_products)
        products = all_products[offset: offset + limit]
    else:
        total    = db.count_all_products()
        products = db.get_all_products_paginated(limit, offset)
    db.close()
    return JsonResponse({"source": "mysql", "query": query, "total": total,
        "page": page, "pages": (total // limit) + (1 if total % limit else 0),
        "products": products})

    return JsonResponse({
        "source": "mysql only",
        "query": query,
        "total": total,
        "page": page,
        "pages": (total // limit) + (1 if total % limit else 0),
        "products": products
    })

# Accessoire de Laptop:
# 1-souris
def scrape_all_souris(request):
    query = request.GET.get("query", "souris").strip().lower()
    
    # On lance la tâche globale en arrière-plan sans attendre
    task = tasks.scrape_all_mouse_task.delay(query)
    
    return JsonResponse({
        "success": True,
        "task_id": task.id,  # L'ID pour suivre l'avancement ou pour le forcer à s'arrêter
        "message": "Le scraping global (Jumia, Amazon, Aliexpress) a commencé en arrière-plan."
    })

# 2-sac:
def scrape_all_sac(request):
    query = request.GET.get("query", "sac_laptop").strip().lower()
    
    # On lance la tâche globale en arrière-plan sans attendre
    task = tasks.scrape_all_sac_task.delay(query)
    
    return JsonResponse({
        "success": True,
        "task_id": task.id,  # L'ID pour suivre l'avancement ou pour le forcer à s'arrêter
        "message": "Le scraping global (Jumia, Amazon, Aliexpress) a commencé en arrière-plan."
    })

# 3-usb:
def scrape_all_usb(request):
    query = request.GET.get("query", "usb_flash_drive").strip().lower()
    
    # On lance la tâche globale en arrière-plan sans attendre
    task = tasks.scrape_all_usb_task.delay(query)
    
    return JsonResponse({
        "success": True,
        "task_id": task.id,  # L'ID pour suivre l'avancement ou pour le forcer à s'arrêter
        "message": "Le scraping global (Jumia, Amazon, Aliexpress) a commencé en arrière-plan."
    })

#4-laptop stand:
def scrape_all_laptop_stand(request):
    query = request.GET.get("query", "laptop_stand").strip().lower()
    
    # On lance la tâche globale en arrière-plan sans attendre
    task = tasks.scrape_all_laptop_stand_task.delay(query)
    
    return JsonResponse({
        "success": True,
        "task_id": task.id,  # L'ID pour suivre l'avancement ou pour le forcer à s'arrêter
        "message": "Le scraping global (Jumia, Amazon, Aliexpress) a commencé en arrière-plan."
    })


#5-cooling pad:
def scrape_all_cooling_pad(request):
    query = request.GET.get("query", "cooling_pad").strip().lower()
    
    # On lance la tâche globale en arrière-plan sans attendre
    task = tasks.scrape_all_cooling_pad_task.delay(query)
    
    return JsonResponse({
        "success": True,
        "task_id": task.id,  # L'ID pour suivre l'avancement ou pour le forcer à s'arrêter
        "message": "Le scraping global (Jumia, Amazon, Aliexpress) a commencé en arrière-plan."
    })



# affichage des produits accessoires depuis MySQL uniquement
def search_accessoire_view(request):
    query  = request.GET.get("query", "").strip().lower()
    page   = int(request.GET.get("page", 1))
    limit  = int(request.GET.get("limit", 20))
    offset = (page - 1) * limit
    db = MySQLWriter()
    if query:
        all_acc = db.get_accessories_by_query(query)
        total = len(all_acc)
        accessories = all_acc[offset: offset + limit]
    else:
        total = db.count_all_accessories()
        accessories = db.get_all_accessories_paginated(limit, offset)
    db.close()
    return JsonResponse({"source": "mysql", "query": query, "total": total,
        "page": page, "pages": (total // limit) + (1 if total % limit else 0),
        "accessories": accessories})

    return JsonResponse({
        "source": "mysql only",
        "query": query,
        "total": total,
        "page": page,
        "pages": (total // limit) + (1 if total % limit else 0),
        "accessories": accessories  # J'ai renommé la clé "products" en "accessories" pour plus de logique
    })

# ════════════════════════════════════════════════════════════════════════════
# VUE 2 — PRODUITS DATA MINING  (maintenant depuis MySQL)
# ════════════════════════════════════════════════════════════════════════════

def products_view(request):
    try:
        query  = request.GET.get('query', '').strip()
        page   = int(request.GET.get('page', 1))
        limit  = int(request.GET.get('limit', 20))
        offset = (page - 1) * limit
        db = MySQLWriter()
        try:
            if query:
                total = db.count_products_search(query)
                raw   = db.search_products_paginated(query, limit, offset)
            else:
                total = db.count_all_products()
                raw   = db.get_all_products_paginated(limit, offset)
        finally:
            db.close()

        products = [{'title': str(r.get('title', '')), 'price': float(r.get('price', 0)),
                     'brand': str(r.get('brand', '')), 'source': str(r.get('source', '')),
                     'link': str(r.get('link', '')), 'image': str(r.get('image', '')),
                     'is_gaming': bool(r.get('is_gaming', False)),
                     'currency': str(r.get('currency', 'MAD'))} for r in raw]

        return JsonResponse({'source': 'mysql', 'total': total, 'page': page,
                             'pages': max(1, (total + limit - 1) // limit), 'products': products})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


# ════════════════════════════════════════════════════════════════════════════
# DATA MINING — Sert dm_results.json en priorité, calcule en fallback
# ════════════════════════════════════════════════════════════════════════════

def stats_view(request):
    """
    Sert d'abord le cache MySQL, puis dm_results.json, puis calcule depuis la DB.
    """
    try:
        # 1. Cache MySQL
        db = MySQLWriter()
        cached = db.get_cache('stats')
        if cached:
            db.close()
            return JsonResponse(cached,safe=False)
        db.close()

        # 2. Données précalculées dm_results.json
        dm = _load_dm_results()
        lap = dm.get('laptops', {})
        if lap and lap.get('stats'):
            s = lap['stats']
            # Reconstruction du format attendu par le frontend
            result = {
                'source': 'dm_results',
                'stats': {
                    'count':    s.get('count', 0),
                    'mean':     s.get('mean', 0),
                    'median':   s.get('median', 0),
                    'std':      s.get('std', 0),
                    'min':      s.get('min', 0),
                    'max':      s.get('max', 0),
                    'p25':      s.get('q1', 0),
                    'p75':      s.get('q3', 0),
                    'iqr':      s.get('iqr', 0),
                    'skewness': s.get('skewness', 0),
                    'kurtosis': s.get('kurtosis', 0),
                    'cv':       round(s.get('std', 0) / s.get('mean', 1) * 100, 2) if s.get('mean') else 0,
                },
                'by_brand':    lap.get('brand_bar', []),
                'by_source':   lap.get('boxplot_by_source', []),
                'distribution': lap.get('histogram', []),
                'by_category': [],
                'gaming': {},
            }
            return JsonResponse(result)

        # 3. Calcul depuis la DB (fallback)
        df = load_from_db()
        stats    = descriptive_stats(df)
        by_brand = stats_by_brand(df).head(10).to_dict(orient='records')
        by_cat   = stats_by_category(df).to_dict(orient='records')
        gaming   = gaming_vs_non_gaming(df)
        percentiles = get_price_percentiles(df)

        by_source = []
        if 'source' in df.columns:
            for src, grp in df.groupby('source'):
                p = grp['price']
                by_source.append({'source': str(src), 'count': int(len(grp)),
                    'min': float(p.min()), 'q1': float(p.quantile(0.25)),
                    'median': float(p.median()), 'mean': round(float(p.mean()), 2),
                    'q3': float(p.quantile(0.75)), 'max': float(p.max()),
                    'std': round(float(p.std()), 2)})

        counts, edges = np.histogram(df['price'], bins=12)
        distribution = [{'label': f"{int(edges[i]):,}–{int(edges[i+1]):,}",
            'count': int(counts[i])} for i in range(len(counts))]

        result = {'source': 'mysql', 'stats': stats, 'by_brand': by_brand,
            'by_category': by_cat, 'by_source': by_source, 'gaming': gaming,
            'percentiles': {k: round(float(v), 2) for k, v in percentiles.items()},
            'distribution': distribution}

        db2 = MySQLWriter()
        db2.save_cache('stats', result)
        db2.close()
        return JsonResponse(result, json_dumps_params={'default': safe_json},safe=False)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


def clustering_view(request):
    try:
        algo      = request.GET.get('algo', 'kmeans').lower()
        cache_key = f'clustering_{algo}'

        # 1. Cache MySQL
        db = MySQLWriter()
        cached = db.get_cache(cache_key)
        if cached:
            db.close()
            # 🔥 CORRECTION ICI : ajout de safe=False
            return JsonResponse(cached, safe=False)
        db.close()

        # 2. dm_results.json (kmeans uniquement)
        if algo == 'kmeans':
            dm = _load_dm_results()
            lap = dm.get('laptops', {})
            if lap and lap.get('kmeans_summary'):
                result = {
                    'source':  'dm_results',
                    'algo':    'kmeans',
                    'best_k':  lap.get('best_k', 4),
                    'summary': lap['kmeans_summary'],
                    'scatter': lap.get('cluster_scatter', []),
                    'radar':   lap.get('radar_clusters', []),
                    'k_scores': lap.get('k_scores', []),
                }
                return JsonResponse(result)

        # 3. Calcul depuis la DB
        df = load_from_db()
        if algo == 'dbscan':
            eps_param         = request.GET.get('eps')
            min_samples_param = request.GET.get('min_samples')
            eps         = float(eps_param) if eps_param else None
            min_samples = int(min_samples_param) if min_samples_param else None
            df = dbscan_clustering(df, eps=eps, min_samples=min_samples)
            summary = cluster_summary(df)
            extra   = {'algo': 'dbscan', 'eps': eps, 'min_samples': min_samples,
                    'n_clusters': int(df['cluster_id'].nunique() - (1 if -1 in df['cluster_id'].values else 0)),
                    'n_outliers': int((df['cluster_id'] == -1).sum())}
        else:
            k_scores = find_optimal_k(df, k_range=range(2, 7))

            min_size = max(10, len(df) * 0.01)
            valid_rows = []
            for _, row in k_scores.iterrows():
                k = int(row['k'])
                temp = kmeans_clustering(df.copy(), n_clusters=k)
                if temp['cluster'].value_counts().min() >= min_size:
                    valid_rows.append(row)

            best_k = int(pd.DataFrame(valid_rows).loc[
                pd.DataFrame(valid_rows)['silhouette'].idxmax(), 'k'
            ]) if valid_rows else 5

            df = kmeans_clustering(df, n_clusters=best_k)
            summary  = cluster_summary(df)
            sil      = float(k_scores['silhouette'].max())
            extra    = {'algo': 'kmeans', 'best_k': best_k,
                        'silhouette': round(sil, 4),
                        'k_scores': k_scores.to_dict(orient='records')}

        scatter = []
        for _, row in df.sample(min(300, len(df)), random_state=42).iterrows():
            scatter.append({'title': str(row['title'])[:60], 'price': float(row['price']),
                'cluster': str(row['cluster']), 'brand': str(row.get('brand_detected', '')),
                'gaming': bool(row.get('is_gaming', False))})

        result = {'source': 'mysql', **extra,
                  'summary': summary.to_dict(orient='records'), 'scatter': scatter}
        clean_result = json.loads(json.dumps(result, default=safe_json))

        db2 = MySQLWriter()
        db2.save_cache(cache_key, clean_result)
        db2.close()
        return JsonResponse(clean_result, json_dumps_params={'default': safe_json})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


def anomalies_view(request):
    try:
        # 1. Cache MySQL
        db = MySQLWriter()
        cached = db.get_cache('anomalies')
        if cached:
            db.close()
            # 🔥 CORRECTION ICI : ajout de safe=False
            return JsonResponse(cached, safe=False)
        db.close()

        # 2. dm_results.json
        dm = _load_dm_results()
        lap = dm.get('laptops', {})
        if lap and lap.get('anomalies'):
            anomalies = lap['anomalies']
            result = {
                'source': 'dm_results',
                'total': len(anomalies),
                'anomalies': anomalies,
                'summary': [
                    {'methode': 'Isolation Forest', 'anomalies': len(anomalies),
                     'pourcentage': round(len(anomalies) / lap['stats']['count'] * 100, 2)
                     if lap.get('stats', {}).get('count') else 0}
                ],
            }
            return JsonResponse(result)

        # 3. Calcul depuis la DB
        df = load_from_db()
        df = detect_iqr(df)
        df = detect_isolation_forest(df)
        df = detect_lof(df)
        anom_df = get_anomalies(df, method='iforest')
        anomalies = []
        for _, row in anom_df.iterrows():
            anomalies.append({'title': str(row['title'])[:80], 'price': float(row['price']),
                'brand_detected': str(row.get('brand_detected', '')),
                'price_category': str(row.get('price_category', ''))})

        result = {'source': 'mysql', 'summary': anomaly_summary(df).to_dict(orient='records'),
                  'anomalies': anomalies, 'total': len(anomalies)}

        db2 = MySQLWriter()
        db2.save_cache('anomalies', result)
        db2.close()
        return JsonResponse(result, json_dumps_params={'default': safe_json})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


def association_view(request):
    try:
        # 1. Cache MySQL
        db = MySQLWriter()
        cached = db.get_cache('association')
        if cached:
            db.close()
            # 🔥 CORRECTION ICI : ajout de safe=False
            return JsonResponse(cached, safe=False)
        db.close()

        # 2. dm_results.json
        dm = _load_dm_results()
        lap = dm.get('laptops', {})
        if lap and lap.get('association_rules'):
            rules = lap['association_rules']
            result = {
                'source': 'dm_results',
                'total': len(rules),
                'rules': rules,
            }
            return JsonResponse(result)

        # 3. Calcul depuis la DB
        df = load_from_db()
        k_scores = find_optimal_k(df, k_range=range(2, 6))
        best_k   = int(k_scores.loc[k_scores['silhouette'].idxmax(), 'k'])
        df = kmeans_clustering(df, n_clusters=best_k)
        rules = run_association_analysis(df, min_support=0.08, min_confidence=0.60, min_lift=1.2)
        rules_list = rules.to_dict(orient='records') if not rules.empty else []

        result = {'source': 'mysql', 'total': len(rules_list), 'rules': rules_list}
        db2 = MySQLWriter()
        db2.save_cache('association', result)
        db2.close()
        return JsonResponse(result, json_dumps_params={'default': safe_json})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


def association_accessories_view(request):
    """Règles d'association accessoires + cross-association laptops × accessoires."""
    try:
        # 1. Cache MySQL
        db = MySQLWriter()
        cached = db.get_cache('association_accessories')
        if cached:
            db.close()
            return JsonResponse(cached)
        db.close()

        # 2. dm_results.json
        dm = _load_dm_results()
        acc_dm    = dm.get('accessories', {})
        cross_dm  = dm.get('cross_association', [])

        if acc_dm and acc_dm.get('association_rules'):
            result = {
                'source': 'dm_results',
                'rules_accessories': acc_dm['association_rules'],
                'rules_cross': cross_dm,
                'stats_by_category': acc_dm.get('stats_by_category', []),
                'boxplot_categories': acc_dm.get('boxplot_categories', []),
                'boxplot_sources':    acc_dm.get('boxplot_sources', []),
                'histogram_all':      acc_dm.get('histogram_all', []),
                'total_acc_rules':    len(acc_dm['association_rules']),
                'total_cross_rules':  len(cross_dm),
            }
            return JsonResponse(result)

        # 3. Calcul depuis la DB
        acc = _load_accessories_from_db()
        if acc.empty:
            return JsonResponse({'error': 'Aucune donnée accessoire'}, status=404)

        rules_acc  = run_association_accessories(acc, min_support=0.05, min_confidence=0.5, min_lift=1.0)
        rules_list = rules_acc.to_dict(orient='records') if not rules_acc.empty else []
        df_lap     = load_from_db()
        rules_cross = run_cross_association(df_lap, acc, sample_size=3000)
        cross_list  = rules_cross.to_dict(orient='records') if not rules_cross.empty else []

        result = {'source': 'mysql', 'rules_accessories': rules_list, 'rules_cross': cross_list,
                  'total_acc_rules': len(rules_list), 'total_cross_rules': len(cross_list)}
        clean_result = json.loads(json.dumps(result, default=safe_json))
        db2 = MySQLWriter()
        db2.save_cache('association_accessories', clean_result)
        db2.close()
        return JsonResponse(clean_result, json_dumps_params={'default': safe_json})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


def _load_accessories_from_db():
    RATES = {"MAD": 1.0, "USD": 10.0, "EUR": 11.0, "GBP": 13.0}
    PRICE_RANGES = {"souris": (20, 8_000), "stand": (10, 5_000), "usb": (5, 3_000)}
    db = MySQLWriter()
    try:
        total = db.count_all_accessories()
        raw   = db.get_all_accessories_paginated(limit=total, offset=0)
    finally:
        db.close()
    if not raw:
        return pd.DataFrame()
    acc = pd.DataFrame(raw)
    acc["price"] = pd.to_numeric(acc["price"], errors="coerce")
    if "currency" in acc.columns:
        acc["price"] = acc.apply(lambda r: r["price"] * RATES.get(str(r.get("currency", "MAD")).strip().upper(), 1.0), axis=1)
    acc = acc[acc["price"] > 0].dropna(subset=["price"])
    if "category" in acc.columns and "accessory_category" not in acc.columns:
        acc = acc.rename(columns={"category": "accessory_category"})
    clean = []
    for cat, g in acc.groupby("accessory_category"):
        pmin, pmax = PRICE_RANGES.get(str(cat).lower(), (1, 100_000))
        clean.append(g[(g["price"] >= pmin) & (g["price"] <= pmax)])
    if not clean:
        return pd.DataFrame()
    acc = pd.concat(clean, ignore_index=True)
    def _price_range(row):
        cat = str(row.get("accessory_category", "")).lower()
        price = float(row.get("price", 0))
        if cat == "souris": return "bas" if price < 100 else ("moyen" if price < 500 else "haut")
        if cat == "stand":  return "bas" if price < 100 else ("moyen" if price < 400 else "haut")
        return "bas" if price < 50 else ("moyen" if price < 200 else "haut")
    acc["price_range"] = acc.apply(_price_range, axis=1)
    return acc.reset_index(drop=True)


def pca_view(request):
    try:
        # 1. Cache MySQL
        db = MySQLWriter()
        cached = db.get_cache('pca')
        if cached:
            db.close()
            return JsonResponse(cached)
        db.close()

        # 2. dm_results.json
        dm = _load_dm_results()
        lap = dm.get('laptops', {})
        if lap and lap.get('pca_scatter'):
            scatter = lap['pca_scatter']
            result = {'source': 'dm_results', 'total': len(scatter), 'pca_scatter': scatter}
            return JsonResponse(result)

        # 3. Calcul depuis la DB
        df = load_from_db()
        df = kmeans_clustering(df, n_clusters=4, features=['log_price'])
        scatter = prepare_pca_scatter(df)
        result = {'source': 'mysql', 'total': len(scatter), 'pca_scatter': scatter}
        db2 = MySQLWriter()
        db2.save_cache('pca', result)
        db2.close()
        return JsonResponse(result, json_dumps_params={'default': safe_json})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


# ════════════════════════════════════════════════════════════════════════════
# EXPORT CSV
# ════════════════════════════════════════════════════════════════════════════

import csv

def export_csv_view(request):
    try:
        df = load_from_db()
        cols = ['title', 'price', 'brand_detected', 'source', 'price_category', 'ram_gb', 'storage_gb', 'is_gaming']
        export_cols = [c for c in cols if c in df.columns]
        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = 'attachment; filename="price_intelligence_export.csv"'
        response.write('\ufeff')
        writer = csv.DictWriter(response, fieldnames=export_cols)
        writer.writeheader()
        for _, row in df[export_cols].iterrows():
            writer.writerow({col: ('' if pd.isna(row[col]) else row[col]) for col in export_cols})
        return response
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


# ════════════════════════════════════════════════════════════════════════════
# HISTORIQUE DES RECHERCHES
# ════════════════════════════════════════════════════════════════════════════

@csrf_exempt
def search_history_view(request):
    if request.method == 'GET':
        history = request.session.get('search_history', [])
        return JsonResponse({'history': history, 'total': len(history)})

    elif request.method == 'POST':
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'error': 'JSON invalide'}, status=400)
        query = data.get('query', '').strip()
        if not query:
            return JsonResponse({'error': 'query requis'}, status=400)
        history = request.session.get('search_history', [])
        import datetime
        entry = {'query': query, 'source': data.get('source', 'jumia'),
                 'count': data.get('count', 0),
                 'date': datetime.datetime.now().strftime('%Y-%m-%d %H:%M')}
        history.insert(0, entry)
        request.session['search_history'] = history[:50]
        request.session.modified = True
        return JsonResponse({'success': True, 'entry': entry})

    elif request.method == 'DELETE':
        request.session['search_history'] = []
        request.session.modified = True
        return JsonResponse({'success': True})

    return JsonResponse({'error': 'Méthode non autorisée'}, status=405)
