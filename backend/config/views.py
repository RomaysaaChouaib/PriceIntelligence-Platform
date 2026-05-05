import os, sys, json
import numpy as np
import pandas as pd
import math

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, BASE_DIR)

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

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
    detect_iqr, detect_isolation_forest, anomaly_summary, get_anomalies
)
from data_mining.models.association import run_association_analysis


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
    df = clean_dataframe(df)
    df = add_features_dataframe(df)
    df, _ = normalize_dataframe(df, method='robust')
    return df

# ════════════════════════════════════════════════════════════════════════════
# VUE 1 — SCRAPING
# ════════════════════════════════════════════════════════════════════════════
# STOP_SCRAPING = False
# def stop_scraping_action(request):
#     """ Fonction pour demander l'arrêt """
#     global STOP_SCRAPING
#     STOP_SCRAPING = True
#     return JsonResponse({"message": "Signal d'arrêt envoyé (STOP_SCRAPING = True)"})
from config.celery import app # Assure-toi d'importer ton app Celery pour pouvoir contrôler les tâches
from django.core.cache import cache
@csrf_exempt
def stop_scraping_action(request):
    task_id = None
    
    # 1. On essaie de récupérer le task_id selon la méthode (GET ou POST)
    if request.method == "GET":
        task_id = request.GET.get("task_id")
    elif request.method == "POST":
        try:
            data = json.loads(request.body)
            task_id = data.get("task_id")
        except json.JSONDecodeError:
            task_id = request.POST.get("task_id")

    # 2. MÉTHODE DOUCE : On met le cache à True (utile si tu as mis des break dans tes boucles)
    cache.set("STOP_SCRAPING", True, 300)

    # 3. Vérification du task_id
    if not task_id:
        return JsonResponse({
            "success": False, 
            "message": "Signal d'arrêt envoyé au cache, mais impossible de tuer Celery car aucun task_id n'a été fourni."
        }, status=400)

    # 4. MÉTHODE FORTE : On tue immédiatement la tâche Celery
    try:
        from config.celery import app # Remplace par le bon nom de dossier
        app.control.revoke(task_id, terminate=True)
    except Exception as e:
        return JsonResponse({"success": False, "error": f"Erreur Celery: {str(e)}"})

    return JsonResponse({
        "success": True, 
        "message": f"Le scraping (Tâche {task_id}) a été stoppé avec succès."
    })
from .tasks import scrape_jumia_task

def scrape_jumia(request):
    query = request.GET.get("query", "pc portable").strip().lower()
    
    # On lance la tâche en arrière-plan sans attendre
    task = scrape_jumia_task.delay(query)
    
    return JsonResponse({
        "success": True,
        "task_id": task.id,  # L'ID pour suivre l'avancement
        "message": "Le scraping a commencé en arrière-plan."
    })


def scrap_amazon(request):
    global STOP_SCRAPING
    STOP_SCRAPING = False  # Reset au lancement
    
    query = request.GET.get("query", "laptop").strip().lower()
    db = MySQLWriter()
    
    try:
        # Étape 1 : On lance la récupération (Amazon est souvent long)
        products = scrape_amazon_product(query)
        
        # Étape 2 : VERIFICATION DU SIGNAL D'ARRÊT
        # Si la variable est passée à True pendant l'étape 1
        if STOP_SCRAPING:
            db.close()
            return JsonResponse({
                "success": False, 
                "message": "Scraping Amazon interrompu manuellement. Aucune insertion effectuée."
            })

        # Étape 3 : Traitement normal si pas d'arrêt
        inserted = 0
        scraped_count = len(products) if products else 0
        
        if products:
            db.insert_products(products)
            inserted = len(products)
            
        db.close()
        return JsonResponse({
            "success": True,
            "source": "scraping -> mysql",
            "query": query,
            "scraped": scraped_count,
            "inserted": inserted,
            "message": f"{inserted} produits Amazon enregistrés dans MySQL"
        })
        
    except Exception as e:
        if 'db' in locals():
            db.close()
        return JsonResponse({"success": False, "error": str(e)}, status=500)


def scrap_aliexpress(request):
    global STOP_SCRAPING
    STOP_SCRAPING = False  # Reset pour permettre un nouveau lancement
    
    query = request.GET.get("query", "laptop").strip().lower()
    db = MySQLWriter()
    
    try:
        scraper = AliexpressScraper()
        
        # Le scraper va travailler ici (max_pages=20 peut être long)
        products = scraper.scrape(query, max_pages=20)
        
        # --- VÉRIFICATION DU SIGNAL D'ARRÊT ---
        if STOP_SCRAPING:
            db.close()
            return JsonResponse({
                "success": False, 
                "message": "Processus AliExpress stoppé par l'utilisateur. Aucune insertion effectuée."
            })
        # --------------------------------------

        inserted = 0
        if products:
            db.insert_products(products)
            inserted = len(products)
            
        db.close()
        return JsonResponse({
            "success": True,
            "source": "Aliexpress -> mysql",
            "query": query,
            "scraped": len(products) if products else 0,
            "inserted": inserted,
            "message": f"{inserted} produits AliExpress enregistrés dans MySQL"
        })
        
    except Exception as e:
        if 'db' in locals():
            db.close()
        return JsonResponse({"success": False, "error": str(e)}, status=500)


from concurrent.futures import ThreadPoolExecutor, as_completed
from .tasks import scrape_all_task 

def scrape_all(request):
    query = request.GET.get("query", "laptop").strip().lower()
    
    # On lance la tâche globale en arrière-plan sans attendre
    task = scrape_all_task.delay(query)
    
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
        "status": res.status, # PENDING, PROGRESS, SUCCESS
        "result": res.result if res.ready() else None
    })
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


def products_view(request):
    try:
        query = request.GET.get('query', '').lower().strip()
        page  = int(request.GET.get('page', 1))
        limit = int(request.GET.get('limit', 20))
        df = load_from_db()
        if query:
            df = df[df['title'].str.lower().str.contains(query, na=False)]
        total   = len(df)
        start   = (page - 1) * limit
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
        return JsonResponse({'source': 'mysql', 'total': total, 'page': page,
            'pages': (total + limit - 1) // limit, 'products': products})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


def stats_view(request):
    try:
        db = MySQLWriter()
        cached = db.get_cache('stats')
        if cached:
            db.close()
            return JsonResponse(cached)
        db.close()

        df          = load_from_db()
        stats       = descriptive_stats(df)
        by_brand    = stats_by_brand(df).head(10).to_dict(orient='records')
        by_cat      = stats_by_category(df).to_dict(orient='records')
        gaming      = gaming_vs_non_gaming(df)
        percentiles = get_price_percentiles(df)
        counts, edges = np.histogram(df['price'], bins=12)
        distribution = [{'label': f"{int(edges[i]):,}–{int(edges[i+1]):,}",
            'count': int(counts[i]), 'min': round(float(edges[i]), 0),
            'max': round(float(edges[i+1]), 0)} for i in range(len(counts))]

        result = {'source': 'mysql', 'stats': stats, 'by_brand': by_brand,
            'by_category': by_cat, 'gaming': gaming,
            'percentiles': {k: round(float(v), 2) for k, v in percentiles.items()},
            'distribution': distribution}

        db2 = MySQLWriter()
        db2.save_cache('stats', result)
        db2.close()
        return JsonResponse(result, json_dumps_params={'default': safe_json})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


def clustering_view(request):
    try:
        algo      = request.GET.get('algo', 'kmeans').lower()
        cache_key = f'clustering_{algo}'

        db = MySQLWriter()
        cached = db.get_cache(cache_key)
        if cached:
            db.close()
            return JsonResponse(cached)
        db.close()

        df = load_from_db()
        if algo == 'dbscan':
            eps         = float(request.GET.get('eps', 2.0))
            min_samples = int(request.GET.get('min_samples', 30))
            df      = dbscan_clustering(df, eps=eps, min_samples=min_samples)
            summary = cluster_summary(df)
            extra   = {'algo': 'dbscan', 'eps': eps,
                    'min_samples': min_samples, 'n_clusters': int(df['cluster'].nunique())}
        else:
            df      = kmeans_clustering(df, n_clusters=4, features=['log_price'])
            summary = cluster_summary(df)
            extra   = {'algo': 'kmeans', 'best_k': 4}

        scatter = []
        for _, row in df.sample(min(300, len(df)), random_state=42).iterrows():
            scatter.append({'title': str(row['title'])[:60], 'price': float(row['price']),
                'cluster': str(row['cluster']), 'brand': str(row.get('brand_detected', '')),
                'gaming': bool(row.get('is_gaming', False))})

        result = {'source': 'mysql', **extra,
                  'summary': summary.to_dict(orient='records'), 'scatter': scatter}

        # Nettoie les valeurs non-JSON (NaN, Infinity) avant sauvegarde
        import json
        clean_result = json.loads(json.dumps(result, default=safe_json))

        db2 = MySQLWriter()
        db2.save_cache(cache_key, clean_result)
        db2.close()
        return JsonResponse(clean_result, json_dumps_params={'default': safe_json})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

def anomalies_view(request):
    try:
        db = MySQLWriter()
        cached = db.get_cache('anomalies')
        if cached:
            db.close()
            return JsonResponse(cached)
        db.close()

        df = load_from_db()
        df = detect_iqr(df)
        df = detect_isolation_forest(df)
        anom_df   = get_anomalies(df, method='iforest')
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
        db = MySQLWriter()
        cached = db.get_cache('association')
        if cached:
            db.close()
            return JsonResponse(cached)
        db.close()

        df    = load_from_db()
        df = kmeans_clustering(df, n_clusters=4, features=['log_price'])
        rules = run_association_analysis(df, min_support=0.08, min_confidence=0.60, min_lift=1.2)
        rules_list = rules.to_dict(orient='records') if not rules.empty else []

        result = {'source': 'mysql', 'total': len(rules_list), 'rules': rules_list}

        db2 = MySQLWriter()
        db2.save_cache('association', result)
        db2.close()
        return JsonResponse(result, json_dumps_params={'default': safe_json})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
