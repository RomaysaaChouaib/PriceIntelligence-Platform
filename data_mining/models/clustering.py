# data_mining/models/clustering.py
"""
Clustering des produits par prix et caractéristiques.
Algorithmes : KMeans, DBSCAN, Agglomeratif.
"""

import pandas as pd
import numpy as np
from sklearn.cluster import KMeans, DBSCAN, AgglomerativeClustering
from sklearn.metrics import silhouette_score, davies_bouldin_score
from sklearn.preprocessing import RobustScaler


# Noms lisibles des segments (attribués après tri par prix médian)
SEGMENT_LABELS = [
    "Entrée de gamme",
    "Milieu de gamme bas",
    "Milieu de gamme",
    "Haut de gamme",
    "Premium",
]


def _prepare_features(df: pd.DataFrame, features: list = None) -> np.ndarray:
    """Prépare la matrice de features normalisée."""
    if features is None:
        features = [c for c in ["log_price", "ram_gb", "storage_gb"] if c in df.columns]
    X = df[features].copy()
    # Remplir valeurs manquantes par la médiane
    X = X.fillna(X.median())
    scaler = RobustScaler()
    return scaler.fit_transform(X), features


def kmeans_clustering(
    df: pd.DataFrame,
    n_clusters: int = 4,
    features: list = None,
    random_state: int = 42,
) -> pd.DataFrame:
    """
    KMeans clustering sur les produits.

    Retourne le DataFrame avec une colonne 'cluster' (label lisible)
    et une colonne 'cluster_id' (entier).
    """
    df = df.copy()
    X, used_features = _prepare_features(df, features)

    if len(df) < n_clusters:
        raise ValueError(f"Pas assez de produits ({len(df)}) pour {n_clusters} clusters.")

    model = KMeans(n_clusters=n_clusters, random_state=random_state, n_init=10)
    labels = model.fit_predict(X)

    df["cluster_id"] = labels

    # Trier clusters par prix médian et attribuer label lisible
    medians = df.groupby("cluster_id")["price"].median().sort_values()
    id_to_label = {}
    for rank, cid in enumerate(medians.index):
        if rank < len(SEGMENT_LABELS):
            id_to_label[cid] = SEGMENT_LABELS[rank]
        else:
            id_to_label[cid] = f"Cluster {rank + 1}"
    df["cluster"] = df["cluster_id"].map(id_to_label)

    # Métriques
    sil   = silhouette_score(X, labels) if len(set(labels)) > 1 else 0
    db    = davies_bouldin_score(X, labels) if len(set(labels)) > 1 else float("inf")

    print(f"  [kmeans] k={n_clusters} | Silhouette={sil:.4f} | Davies-Bouldin={db:.4f}")
    print(f"  [kmeans] Features utilisées : {used_features}")
    print(f"  [kmeans] Distribution clusters :\n{df['cluster'].value_counts().to_string()}")

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
    """
    Cherche le k optimal via Silhouette et Davies-Bouldin.
    Retourne un DataFrame avec les scores pour chaque k.
    """
    X, _ = _prepare_features(df, features)
    results = []
    for k in k_range:
        if k >= len(df):
            break
        model = KMeans(n_clusters=k, random_state=42, n_init=10)
        labels = model.fit_predict(X)
        sil = silhouette_score(X, labels)
        db  = davies_bouldin_score(X, labels)
        results.append({
            "k": k,
            "inertia":   round(model.inertia_, 2),
            "silhouette": round(sil, 4),
            "davies_bouldin": round(db, 4),
        })
    return pd.DataFrame(results)


def dbscan_clustering(
    df: pd.DataFrame,
    eps: float = 0.5,
    min_samples: int = 5,
    features: list = None,
) -> pd.DataFrame:
    """
    DBSCAN clustering — détecte automatiquement le nombre de clusters
    et identifie les outliers (label = -1).
    """
    df = df.copy()
    X, _ = _prepare_features(df, features)

    model = DBSCAN(eps=eps, min_samples=min_samples)
    labels = model.fit_predict(X)
    df["cluster_id"] = labels

    n_clusters = len(set(labels)) - (1 if -1 in labels else 0)
    n_outliers  = (labels == -1).sum()

    print(f"  [dbscan] eps={eps} min_samples={min_samples}")
    print(f"  [dbscan] Clusters trouvés : {n_clusters}, Outliers : {n_outliers}")

    df["cluster"] = df["cluster_id"].apply(
        lambda x: "Outlier" if x == -1 else f"Cluster {x + 1}"
    )
    return df


def agglomerative_clustering(
    df: pd.DataFrame,
    n_clusters: int = 4,
    features: list = None,
) -> pd.DataFrame:
    """Clustering hiérarchique agglomératif."""
    df = df.copy()
    X, _ = _prepare_features(df, features)

    model = AgglomerativeClustering(n_clusters=n_clusters, linkage="ward")
    labels = model.fit_predict(X)
    df["cluster_id"] = labels

    medians = df.groupby("cluster_id")["price"].median().sort_values()
    id_to_label = {cid: SEGMENT_LABELS[rank] if rank < len(SEGMENT_LABELS) else f"Cluster {rank+1}"
                   for rank, cid in enumerate(medians.index)}
    df["cluster"] = df["cluster_id"].map(id_to_label)

    sil = silhouette_score(X, labels) if len(set(labels)) > 1 else 0
    print(f"  [agglomerative] k={n_clusters} | Silhouette={sil:.4f}")
    return df


def cluster_summary(df: pd.DataFrame) -> pd.DataFrame:
    """
    Résumé statistique par cluster.
    """
    if "cluster" not in df.columns:
        return pd.DataFrame()

    cols = {
        "price": ["count", "mean", "median", "min", "max", "std"],
    }
    summary = df.groupby("cluster")["price"].agg(
        count="count",
        mean="mean",
        median="median",
        min="min",
        max="max",
        std="std",
    ).round(2)

    if "brand_detected" in df.columns:
        top_brand = df.groupby("cluster")["brand_detected"].agg(
            lambda x: x.value_counts().index[0] if len(x) > 0 else "N/A"
        )
        summary["top_brand"] = top_brand

    if "is_gaming" in df.columns:
        gaming_pct = df.groupby("cluster")["is_gaming"].mean().round(3) * 100
        summary["gaming_%"] = gaming_pct.round(1)

    return summary.reset_index()
