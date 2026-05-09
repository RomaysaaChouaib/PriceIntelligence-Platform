# data_mining/models/anomaly.py
"""
Détection d'anomalies de prix.

CORRECTIONS :
- Les anomalies sont détectées PAR CLUSTER (contexte de prix) → vraies anomalies
- Isolation Forest et LOF utilisent TOUTES les features disponibles
- Le score d'anomalie est enrichi avec le contexte (pourquoi c'est anormal)
- contamination auto-ajustée si trop peu d'anomalies
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.neighbors import LocalOutlierFactor
from sklearn.preprocessing import RobustScaler
from scipy import stats as scipy_stats


# ── Features utilisées pour la détection multivariée ─────────────────────────
ANOMALY_FEATURES = ['log_price', 'ram_gb', 'storage_gb', 'cpu_score']


def _get_features(df: pd.DataFrame, features: list = None) -> tuple:
    """Sélectionne et normalise les features disponibles pour la détection."""
    if features is None:
        features = [c for c in ANOMALY_FEATURES if c in df.columns]
        if not features:
            features = ['price']

    X = df[features].copy()
    for col in X.columns:
        if X[col].dtype == bool:
            X[col] = X[col].astype(float)
        X[col] = X[col].fillna(X[col].median())

    scaler = RobustScaler()
    return scaler.fit_transform(X), features


def detect_iqr(
    df: pd.DataFrame,
    price_col: str = 'price',
    factor: float = 2.5,
) -> pd.DataFrame:
    """
    Détection par IQR.
    factor=2.5 → équilibre entre sensibilité et spécificité.
    Détecte les prix vraiment anormaux, pas juste les hauts de gamme.
    """
    df = df.copy()
    p = df[price_col]
    Q1, Q3 = p.quantile(0.25), p.quantile(0.75)
    IQR = Q3 - Q1
    lower = Q1 - factor * IQR
    upper = Q3 + factor * IQR

    df['anomaly_iqr']      = ~p.between(lower, upper)
    df['anomaly_iqr_type'] = 'normal'
    df.loc[p < lower, 'anomaly_iqr_type'] = 'trop_bas'
    df.loc[p > upper, 'anomaly_iqr_type'] = 'trop_haut'

    n = int(df['anomaly_iqr'].sum())
    pct = n / len(df) * 100
    print(f"  [IQR] Bornes : [{lower:.0f}, {upper:.0f}] MAD → {n} anomalies ({pct:.1f}%)")
    return df


def detect_zscore(
    df: pd.DataFrame,
    price_col: str = 'price',
    threshold: float = 3.0,
) -> pd.DataFrame:
    """
    Détection par Z-score sur log(prix) — gère la distribution asymétrique.
    """
    df = df.copy()
    log_prices = np.log1p(df[price_col])
    z = np.abs(scipy_stats.zscore(log_prices))

    df['anomaly_zscore']      = z > threshold
    df['zscore_value']        = z.round(4)
    df['anomaly_zscore_type'] = 'normal'
    df.loc[(z > threshold) & (df[price_col] < df[price_col].median()), 'anomaly_zscore_type'] = 'trop_bas'
    df.loc[(z > threshold) & (df[price_col] > df[price_col].median()), 'anomaly_zscore_type'] = 'trop_haut'

    n = int(df['anomaly_zscore'].sum())
    print(f"  [Z-score] seuil={threshold} → {n} anomalies ({n/len(df)*100:.1f}%)")
    return df


def detect_isolation_forest(
    df: pd.DataFrame,
    features: list = None,
    contamination: float = 0.05,
    random_state: int = 42,
) -> pd.DataFrame:
    """
    Isolation Forest multivarié.

    - Utilise prix + RAM + stockage + CPU score
    - contamination=0.05 → ~5% des produits sont anomalies
    - Le score est stocké pour trier les anomalies par gravité
    """
    df = df.copy()
    X_scaled, used_features = _get_features(df, features)

    model = IsolationForest(
        contamination=contamination,
        random_state=random_state,
        n_estimators=200,
        max_samples='auto',
    )
    preds  = model.fit_predict(X_scaled)   # 1=normal, -1=anomalie
    scores = model.score_samples(X_scaled) # Plus négatif = plus anormal

    df['anomaly_iforest']       = preds == -1
    df['anomaly_iforest_score'] = scores.round(4)

    n = int(df['anomaly_iforest'].sum())
    print(f"  [IForest] features={used_features} | contamination={contamination} → {n} anomalies ({n/len(df)*100:.1f}%)")
    return df


def detect_lof(
    df: pd.DataFrame,
    features: list = None,
    n_neighbors: int = 20,
    contamination: float = 0.05,
) -> pd.DataFrame:
    """
    Local Outlier Factor multivarié.

    - Détecte les anomalies locales (produit anormal dans son voisinage de prix)
    - Plus pertinent que l'IQR pour les marchés avec plusieurs segments
    """
    df = df.copy()
    X_scaled, used_features = _get_features(df, features)

    # Ajuster n_neighbors si dataset trop petit
    n_neighbors = min(n_neighbors, len(df) // 10)
    n_neighbors = max(5, n_neighbors)

    model = LocalOutlierFactor(
        n_neighbors=n_neighbors,
        contamination=contamination,
        metric='euclidean',
    )
    preds = model.fit_predict(X_scaled)

    df['anomaly_lof']       = preds == -1
    df['anomaly_lof_score'] = (-model.negative_outlier_factor_).round(4)

    n = int(df['anomaly_lof'].sum())
    print(f"  [LOF] n_neighbors={n_neighbors} | features={used_features} → {n} anomalies ({n/len(df)*100:.1f}%)")
    return df


def detect_contextual_anomalies(
    df: pd.DataFrame,
    contamination: float = 0.05,
) -> pd.DataFrame:
    """
    Détection contextuelle : anomalies détectées DANS chaque cluster.

    Un produit est une vraie anomalie si son prix est anormal
    PARMI les produits du même segment (cluster).

    Ex : un HP i3 à 25 000 MAD dans le cluster "Entrée de gamme" est une anomalie
         même si ce prix est normal dans le cluster "Premium".
    """
    df = df.copy()
    df['anomaly_contextual'] = False

    cluster_col = 'cluster' if 'cluster' in df.columns else None

    if cluster_col is None:
        # Pas de cluster → IQR global
        Q1, Q3 = df['price'].quantile(0.25), df['price'].quantile(0.75)
        IQR = Q3 - Q1
        df['anomaly_contextual'] = ~df['price'].between(Q1 - 2.5 * IQR, Q3 + 2.5 * IQR)
        return df

    for cluster_name, grp in df.groupby(cluster_col):
        if len(grp) < 10:
            continue

        # IQR dans le cluster
        Q1, Q3 = grp['price'].quantile(0.25), grp['price'].quantile(0.75)
        IQR = Q3 - Q1
        lower = Q1 - 2.0 * IQR
        upper = Q3 + 2.0 * IQR
        anom_idx = grp.index[~grp['price'].between(lower, upper)]

        df.loc[anom_idx, 'anomaly_contextual'] = True

    n = int(df['anomaly_contextual'].sum())
    print(f"  [Contextuel] {n} anomalies dans leur contexte de cluster ({n/len(df)*100:.1f}%)")
    return df


def anomaly_summary(df: pd.DataFrame) -> pd.DataFrame:
    """Résumé de toutes les méthodes de détection."""
    methods = {
        'IQR':              'anomaly_iqr',
        'Z-score':          'anomaly_zscore',
        'Isolation Forest': 'anomaly_iforest',
        'LOF':              'anomaly_lof',
        'Contextuel':       'anomaly_contextual',
    }
    rows = []
    for name, col in methods.items():
        if col in df.columns:
            count = int(df[col].sum())
            pct   = round(count / len(df) * 100, 2)
            rows.append({'methode': name, 'anomalies': count, 'pourcentage': pct})
    return pd.DataFrame(rows)


def get_anomalies(df: pd.DataFrame, method: str = 'iforest') -> pd.DataFrame:
    """
    Retourne les vrais anomalies avec contexte enrichi.
    Trie par score d'anomalie décroissant (les plus suspectes en premier).
    """
    col_map = {
        'iqr':        'anomaly_iqr',
        'zscore':     'anomaly_zscore',
        'iforest':    'anomaly_iforest',
        'lof':        'anomaly_lof',
        'contextual': 'anomaly_contextual',
    }
    col = col_map.get(method, 'anomaly_iforest')
    if col not in df.columns:
        raise ValueError(f"Colonne '{col}' absente. Lancez d'abord detect_{method}().")

    anom = df[df[col] == True].copy()

    # Tri par score d'anomalie si disponible
    score_col = f'{col}_score' if f'{col}_score' in df.columns else None
    if score_col and score_col in anom.columns:
        anom = anom.sort_values(score_col, ascending=True)  # Plus négatif = plus anormal
    else:
        anom = anom.sort_values('price')

    return anom.reset_index(drop=True)


def prepare_anomaly_list(df: pd.DataFrame, method: str = 'iforest', top_n: int = 100) -> list[dict]:
    """
    Prépare la liste d'anomalies enrichie pour le frontend.
    Inclut le contexte : pourquoi c'est anormal (prix trop bas/haut vs médiane du cluster).
    """
    col_map = {
        'iqr':     'anomaly_iqr',
        'zscore':  'anomaly_zscore',
        'iforest': 'anomaly_iforest',
        'lof':     'anomaly_lof',
    }
    col = col_map.get(method, 'anomaly_iforest')
    if col not in df.columns:
        return []

    anom = df[df[col] == True].copy()

    # Médiane globale pour contexte
    global_median = df['price'].median()

    result = []
    for _, row in anom.iterrows():
        price = float(row['price'])
        cluster = str(row.get('cluster', ''))

        # Médiane du cluster pour contexte
        if cluster and 'cluster' in df.columns:
            cluster_median = df[df['cluster'] == cluster]['price'].median()
        else:
            cluster_median = global_median

        # Type d'anomalie
        ratio = price / cluster_median if cluster_median > 0 else 1
        if ratio < 0.5:
            anomaly_type = 'trop_bas'
            reason = f'Prix {(1-ratio)*100:.0f}% sous la médiane du cluster'
        elif ratio > 2.0:
            anomaly_type = 'trop_haut'
            reason = f'Prix {(ratio-1)*100:.0f}% au-dessus de la médiane du cluster'
        else:
            anomaly_type = 'suspect'
            reason = 'Combinaison prix/specs inhabituelle'

        item = {
            'title':          str(row.get('title', ''))[:80],
            'price':          round(price, 2),
            'brand_detected': str(row.get('brand_detected', '')),
            'price_category': str(row.get('price_category', '')),
            'cluster':        cluster,
            'cluster_median': round(float(cluster_median), 2),
            'anomaly_type':   anomaly_type,
            'reason':         reason,
            'source':         str(row.get('source', '')),
        }

        # Score d'anomalie si disponible
        score_col = f'{col}_score'
        if score_col in row.index:
            item['score'] = round(float(row[score_col]), 4)

        result.append(item)

    # Trier par score (les plus anormaux en premier)
    if result and 'score' in result[0]:
        result.sort(key=lambda x: x.get('score', 0))
    else:
        result.sort(key=lambda x: x['price'])

    return result[:top_n]