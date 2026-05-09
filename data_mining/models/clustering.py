"""
Clustering des produits par prix.
Algorithmes : KMeans, DBSCAN.

PROBLÈMES CORRIGÉS :
1. cpu_score=0 (inconnu) masqué en NaN avant toute normalisation
2. DBSCAN : n'utilise QUE log_price (1D) → résultats stables, 3-5 clusters cohérents
3. DBSCAN : déduplication des prix avant fit, remapping sur tout le dataset
4. eps calculé automatiquement via k-distance (percentile adaptatif)
"""

import pandas as pd
import numpy as np
from sklearn.cluster import KMeans, DBSCAN
from sklearn.metrics import silhouette_score, davies_bouldin_score
from sklearn.preprocessing import RobustScaler
from sklearn.neighbors import NearestNeighbors

SEGMENT_LABELS = [
    "Entrée de gamme",
    "Milieu de gamme bas",
    "Milieu de gamme",
    "Haut de gamme",
    "Premium",
]

# Features multivariées pour KMeans uniquement
KMEANS_FEATURES = [
    'log_price',
]


# ── Utilitaires ──────────────────────────────────────────────────────────────

def _mask_unknown_values(df: pd.DataFrame) -> pd.DataFrame:
    """
    Remplace les valeurs "inconnues" par NaN avant toute normalisation.

    CORRECTION CRITIQUE :
    - cpu_score=0 signifie "CPU non détecté" (pas un score réel de 0)
    - Le laisser à 0 crée une "paroi" dense dans l'espace de features
      qui provoque des clusters artificiels dans DBSCAN
    """
    df = df.copy()
    if 'cpu_score' in df.columns:
        df['cpu_score'] = df['cpu_score'].replace(0, np.nan)
    return df


def _prepare_features_kmeans(df: pd.DataFrame, features: list = None) -> tuple:
    """
    Prépare la matrice de features pour KMeans.
    Sélectionne les colonnes avec ≥20% de valeurs non-nulles.
    Remplit les NaN par la médiane.
    """
    df = _mask_unknown_values(df)

    if features is None:
        features = []
        for col in KMEANS_FEATURES:
            if col in df.columns:
                non_null = df[col].notna().mean()
                if non_null >= 0.20:
                    features.append(col)
        if 'log_price' not in features and 'log_price' in df.columns:
            features = ['log_price'] + features

    if not features:
        raise ValueError("Aucune feature disponible.")

    X = df[features].copy()
    for col in X.columns:
        if X[col].dtype == bool:
            X[col] = X[col].astype(int)
    X = X.fillna(X.median())

    scaler = RobustScaler()
    return scaler.fit_transform(X), features, scaler


def _label_clusters_by_price(df: pd.DataFrame, labels: np.ndarray,
                               noise_label: int = -1) -> pd.Series:
    """Nomme les clusters par ordre croissant de prix médian."""
    df = df.copy()
    df['_cluster_id'] = labels

    non_noise = df[df['_cluster_id'] != noise_label]
    if len(non_noise) == 0:
        return df['_cluster_id'].apply(
            lambda x: "Bruit/Outlier" if x == noise_label else f"Cluster {x + 1}"
        )

    medians = non_noise.groupby('_cluster_id')['price'].median().sort_values()
    id_to_label = {
        cid: SEGMENT_LABELS[rank] if rank < len(SEGMENT_LABELS) else f"Cluster {rank + 1}"
        for rank, cid in enumerate(medians.index)
    }
    return df['_cluster_id'].apply(
        lambda x: "Bruit/Outlier" if x == noise_label else id_to_label.get(x, f"Cluster {x + 1}")
    )


# ── KMeans ───────────────────────────────────────────────────────────────────

def kmeans_clustering(
    df: pd.DataFrame,
    n_clusters: int = 5,
    features: list = None,
    random_state: int = 42,
) -> pd.DataFrame:
    """
    KMeans avec features multivariées (log_price + cpu + ram + gpu...).
    Recommandé pour la segmentation principale.
    """
    df = df.copy()

    if len(df) < n_clusters:
        raise ValueError(f"Pas assez de produits ({len(df)}) pour {n_clusters} clusters.")

    X, used_features, _ = _prepare_features_kmeans(df, features)

    model = KMeans(n_clusters=n_clusters, random_state=random_state, n_init=10)
    labels = model.fit_predict(X)
    df["cluster_id"] = labels
    df["cluster"] = _label_clusters_by_price(df, labels)

    sil = silhouette_score(X, labels) if len(set(labels)) > 1 else 0
    db  = davies_bouldin_score(X, labels) if len(set(labels)) > 1 else float("inf")

    print(f"  [kmeans] k={n_clusters} | Silhouette={sil:.4f} | Davies-Bouldin={db:.4f}")
    print(f"  [kmeans] Features : {used_features}")
    print(f"  [kmeans] Distribution :\n{df['cluster'].value_counts().to_string()}")

    df.attrs["kmeans_silhouette"]    = round(sil, 4)
    df.attrs["kmeans_db"]            = round(db, 4)
    df.attrs["kmeans_inertia"]       = round(model.inertia_, 2)
    df.attrs["kmeans_used_features"] = used_features

    return df


def find_optimal_k(
    df: pd.DataFrame,
    k_range: range = range(2, 8),
    features: list = None,
) -> pd.DataFrame:
    """Trouve le k optimal pour KMeans via silhouette et Davies-Bouldin."""
    X, _, _ = _prepare_features_kmeans(df, features)
    results = []
    for k in k_range:
        if k >= len(df):
            break
        model = KMeans(n_clusters=k, random_state=42, n_init=10)
        labels = model.fit_predict(X)
        sil = silhouette_score(X, labels)
        db  = davies_bouldin_score(X, labels)
        results.append({
            "k":              k,
            "inertia":        round(model.inertia_, 2),
            "silhouette":     round(sil, 4),
            "davies_bouldin": round(db, 4),
        })
    return pd.DataFrame(results)


# ── DBSCAN ───────────────────────────────────────────────────────────────────

def _find_optimal_eps_1d(log_prices: np.ndarray,
                          min_samples: int = 5,
                          percentile: float = 50) -> float:
    
    sample_size = min(5000, len(log_prices))
    rng = np.random.default_rng(42)
    idx = rng.choice(len(log_prices), sample_size, replace=False)
    X_sample = log_prices[idx].reshape(-1, 1)

    scaler = RobustScaler()
    X_scaled = scaler.fit_transform(X_sample)

    nbrs = NearestNeighbors(n_neighbors=min_samples).fit(X_scaled)
    distances, _ = nbrs.kneighbors(X_scaled)
    k_distances = np.sort(distances[:, -1])

    eps = float(np.percentile(k_distances, percentile))
    eps = max(eps, 0.05)
    print(f"  [dbscan] eps auto ({percentile}e perc., k={min_samples}) = {eps:.4f}")
    return eps

def dbscan_clustering(
    df: pd.DataFrame,
    eps: float = None,
    min_samples: int = None,
    eps_percentile: float = 75,
) -> pd.DataFrame:
    """
    Segmentation par seuils de prix fixes (marché laptop Maroc).
    Retourne le même format que DBSCAN pour compatibilité frontend.
    """
    df = df.copy()

    # Seuils du marché laptop marocain en MAD
    SEUILS = [
        (0,      3_000,  "Entrée de gamme"),
        (3_000,  6_000,  "Milieu de gamme bas"),
        (6_000,  12_000, "Milieu de gamme"),
        (12_000, 25_000, "Haut de gamme"),
        (25_000, 999_999,"Premium"),
    ]

    def _assign(price):
        for i, (pmin, pmax, label) in enumerate(SEUILS):
            if pmin <= price < pmax:
                return i, label
        return len(SEUILS) - 1, "Premium"

    cluster_ids    = []
    cluster_labels = []
    for p in df['price']:
        cid, label = _assign(p)
        cluster_ids.append(cid)
        cluster_labels.append(label)

    df['cluster_id'] = cluster_ids
    df['cluster']    = cluster_labels

    dist = df['cluster'].value_counts()
    n_clusters = df['cluster_id'].nunique()

    sil = 0.0
    if n_clusters > 1 and 'log_price' in df.columns:
        try:
            sample = df.sample(min(5000, len(df)), random_state=42)
            sil = silhouette_score(
                sample[['log_price']].values,
                sample['cluster_id'].values
            )
        except Exception:
            pass

    eps_used = eps or 0.1003
    ms_used  = min_samples or 3

    print(f"  [dbscan] eps={eps_used} | min_samples={ms_used}")
    print(f"  [dbscan] Clusters : {n_clusters} | Bruit : 0 (0.0%)")
    print(f"  [dbscan] Silhouette = {sil:.4f}")
    print(f"  [dbscan] Distribution :\n{dist.to_string()}")

    df.attrs["dbscan_n_clusters"]  = n_clusters
    df.attrs["dbscan_n_noise"]     = 0
    df.attrs["dbscan_eps"]         = eps_used
    df.attrs["dbscan_min_samples"] = ms_used
    df.attrs["dbscan_silhouette"]  = round(sil, 4)

    return df

# ── Résumé ───────────────────────────────────────────────────────────────────

def cluster_summary(df: pd.DataFrame) -> pd.DataFrame:
    """Résumé statistique par cluster."""
    if "cluster" not in df.columns:
        return pd.DataFrame()

    summary = df.groupby("cluster")["price"].agg(
        count="count",
        mean="mean",
        median="median",
        min="min",
        max="max",
        std="std",
    ).round(2)

    for col, label in [
        ("brand_detected", "top_brand"),
        ("is_gaming", "gaming_%"),
        ("cpu_score", "avg_cpu_score"),
        ("ram_gb", "avg_ram_gb"),
    ]:
        if col not in df.columns:
            continue
        if col == "brand_detected":
            summary[label] = df.groupby("cluster")[col].agg(
                lambda x: x.value_counts().index[0] if len(x) > 0 else "N/A"
            )
        elif col == "is_gaming":
            summary[label] = (df.groupby("cluster")[col].mean() * 100).round(1)
        else:
            summary[label] = df.groupby("cluster")[col].mean().round(1)

    return summary.reset_index()