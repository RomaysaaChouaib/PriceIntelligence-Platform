"""
Règles d'association entre caractéristiques produits.
Implémentation manuelle de l'algorithme Apriori (sans mlxtend).

CORRECTIONS :
- Vérification que les colonnes nécessaires existent avant l'appel
- Fallback sur colonnes disponibles si cluster absent
- Support minimal abaissé pour les petits datasets
- Meilleure discrétisation des valeurs continues
"""

import pandas as pd
import numpy as np
from itertools import combinations
from collections import defaultdict


# ── Helpers ──────────────────────────────────────────────────────────────────

def _encode_transactions(df: pd.DataFrame, columns: list) -> list:
    """Transforme le DataFrame en liste de transactions (frozensets d'items)."""
    transactions = []
    for _, row in df[columns].iterrows():
        items = frozenset(
            f"{col}={row[col]}"
            for col in columns
            if pd.notna(row[col]) and str(row[col]).strip() not in ('', 'nan', 'None')
        )
        if items:
            transactions.append(items)
    return transactions


def _get_frequent_1_itemsets(transactions: list, min_support: float) -> dict:
    n = len(transactions)
    counts = defaultdict(int)
    for trans in transactions:
        for item in trans:
            counts[frozenset([item])] += 1
    return {k: v / n for k, v in counts.items() if v / n >= min_support}


def _generate_candidates(prev_frequent: list, k: int) -> list:
    candidates = set()
    for i in range(len(prev_frequent)):
        for j in range(i + 1, len(prev_frequent)):
            union = prev_frequent[i] | prev_frequent[j]
            if len(union) == k:
                candidates.add(union)
    return list(candidates)


def apriori(
    transactions: list,
    min_support: float = 0.1,
    max_len: int = 3,
) -> dict:
    n = len(transactions)
    frequent_itemsets = {}

    freq_k = _get_frequent_1_itemsets(transactions, min_support)
    frequent_itemsets.update(freq_k)
    current_freq = list(freq_k.keys())

    for size in range(2, max_len + 1):
        if not current_freq:
            break
        candidates = _generate_candidates(current_freq, size)
        counts = defaultdict(int)
        for trans in transactions:
            for cand in candidates:
                if cand.issubset(trans):
                    counts[cand] += 1
        new_freq = {itemset: v / n for itemset, v in counts.items() if v / n >= min_support}
        if not new_freq:
            break
        frequent_itemsets.update(new_freq)
        current_freq = list(new_freq.keys())

    return frequent_itemsets


def generate_rules(
    frequent_itemsets: dict,
    min_confidence: float = 0.6,
    min_lift: float = 1.0,
) -> pd.DataFrame:
    rules = []

    for itemset, support in frequent_itemsets.items():
        if len(itemset) < 2:
            continue
        items_list = list(itemset)
        for size in range(1, len(items_list)):
            for antecedent in combinations(items_list, size):
                antecedent = frozenset(antecedent)
                consequent = itemset - antecedent

                ant_support = frequent_itemsets.get(antecedent, 0)
                if ant_support == 0:
                    continue

                confidence = support / ant_support
                if confidence < min_confidence:
                    continue

                cons_support = frequent_itemsets.get(consequent, 0)
                lift = confidence / cons_support if cons_support > 0 else 0

                if lift < min_lift:
                    continue

                rules.append({
                    "antecedent": ", ".join(sorted(antecedent)),
                    "consequent": ", ".join(sorted(consequent)),
                    "support":    round(support, 4),
                    "confidence": round(confidence, 4),
                    "lift":       round(lift, 4),
                })

    if not rules:
        return pd.DataFrame(columns=["antecedent", "consequent", "support", "confidence", "lift"])

    return pd.DataFrame(rules).drop_duplicates().sort_values("lift", ascending=False).reset_index(drop=True)


# ── CORRECTION 4 : vérification des colonnes + fallback ──────────────────────
def _select_columns(df: pd.DataFrame, preferred: list) -> list:
    """
    Sélectionne les colonnes disponibles parmi la liste préférée.
    Retourne au minimum ['price_category'] si elle existe.
    """
    available = [c for c in preferred if c in df.columns]

    if not available:
        # Fallback : créer price_category si manquant
        if 'price_category' not in df.columns and 'price' in df.columns:
            df['price_category'] = pd.cut(
                df['price'],
                bins=[0, 3000, 7000, 12000, 22000, float('inf')],
                labels=['entree', 'milieu_bas', 'milieu', 'haut', 'premium']
            ).astype(str)
            available = ['price_category']
        else:
            raise ValueError(
                f"Aucune colonne disponible parmi {preferred}. "
                f"Colonnes présentes : {list(df.columns)}"
            )

    return available


def _adapt_support(df: pd.DataFrame, base_support: float = 0.08) -> float:
    """
    Adapte le min_support à la taille du dataset.
    Pour les petits datasets, un support trop élevé ne trouve rien.
    """
    n = len(df)
    if n < 100:
        return max(0.03, base_support / 3)
    elif n < 500:
        return max(0.05, base_support / 2)
    return base_support


def run_association_analysis(
    df: pd.DataFrame,
    columns: list = None,
    min_support: float = 0.08,
    min_confidence: float = 0.6,
    min_lift: float = 1.2,
    max_len: int = 3,
) -> pd.DataFrame:
    """
    Pipeline complet : encode → apriori → règles.

    Colonnes utilisées par ordre de priorité :
    brand_detected, price_category, is_gaming, has_gpu, cluster
    """
    # CORRECTION : sélection des colonnes avec fallback
    if columns is None:
        preferred = ["brand_detected", "price_category", "is_gaming", "has_gpu", "cluster"]
        columns = _select_columns(df, preferred)

    # CORRECTION : adapter le support à la taille du dataset
    min_support = _adapt_support(df, min_support)

    print(f"  [assoc] Colonnes : {columns}")
    print(f"  [assoc] min_support={min_support:.3f} | min_confidence={min_confidence} | min_lift={min_lift}")

    # Discrétisation : convertir les booléens en labels lisibles
    df_enc = df[columns].copy()
    for col in df_enc.columns:
        if df_enc[col].dtype == bool:
            df_enc[col] = df_enc[col].map({True: f"{col}=Oui", False: f"{col}=Non"})
        else:
            df_enc[col] = df_enc[col].astype(str)

    transactions = _encode_transactions(df_enc, columns)
    print(f"  [assoc] {len(transactions)} transactions")

    if len(transactions) == 0:
        print("  [assoc] Aucune transaction valide.")
        return pd.DataFrame(columns=["antecedent", "consequent", "support", "confidence", "lift"])

    freq_items = apriori(transactions, min_support=min_support, max_len=max_len)
    print(f"  [assoc] {len(freq_items)} itemsets fréquents")

    rules = generate_rules(freq_items, min_confidence=min_confidence, min_lift=min_lift)
    print(f"  [assoc] {len(rules)} règles générées")

    return rules


def run_association_accessories(
    acc: pd.DataFrame,
    min_support: float = 0.05,
    min_confidence: float = 0.5,
    min_lift: float = 1.0,
) -> pd.DataFrame:
    """Règles d'association sur les accessoires."""
    acc = acc.copy()

    if "price_range" not in acc.columns:
        def _price_range(row):
            cat   = str(row.get("accessory_category", "")).lower()
            price = float(row.get("price", 0))
            if cat == "souris":  return "bas" if price < 100 else ("moyen" if price < 500 else "haut")
            if cat == "stand":   return "bas" if price < 100 else ("moyen" if price < 400 else "haut")
            return "bas" if price < 50 else ("moyen" if price < 200 else "haut")
        acc["price_range"] = acc.apply(_price_range, axis=1)

    preferred = ["accessory_category", "source", "price_range"]
    columns = _select_columns(acc, preferred)

    if "is_gaming" in acc.columns:
        acc["is_gaming_str"] = acc["is_gaming"].map(
            {True: "gaming=Oui", False: "gaming=Non", 1: "gaming=Oui", 0: "gaming=Non"}
        ).fillna("gaming=Non")
        columns.append("is_gaming_str")

    min_support = _adapt_support(acc, min_support)
    print(f"  [assoc-acc] Colonnes : {columns}")

    df_enc = acc[columns].copy().astype(str)
    transactions = _encode_transactions(df_enc, columns)
    print(f"  [assoc-acc] {len(transactions)} transactions")

    freq_items = apriori(transactions, min_support=min_support, max_len=3)
    rules = generate_rules(freq_items, min_confidence=min_confidence, min_lift=min_lift)
    print(f"  [assoc-acc] {len(rules)} règles générées")
    return rules


def run_cross_association(
    df_laptop: pd.DataFrame,
    acc: pd.DataFrame,
    sample_size: int = 3000,
    min_support: float = 0.05,
    min_confidence: float = 0.4,
    min_lift: float = 1.0,
) -> pd.DataFrame:
    """Règles d'association croisées laptop × accessoires."""
    # Colonnes laptop
    lap_cols = [c for c in ["price_category", "brand_detected", "is_gaming"] if c in df_laptop.columns]
    if not lap_cols:
        print("  [cross-assoc] Pas assez de colonnes laptop.")
        return pd.DataFrame()

    lap = df_laptop[lap_cols].copy()
    lap.columns = [f"laptop_{c}" for c in lap_cols]
    lap = lap.sample(min(sample_size, len(lap)), random_state=42).reset_index(drop=True)

    # Colonnes accessoires
    acc_cols = [c for c in ["accessory_category", "price_range"] if c in acc.columns]
    if not acc_cols:
        print("  [cross-assoc] Pas assez de colonnes accessoires.")
        return pd.DataFrame()

    acc_s = acc[acc_cols].copy()
    acc_s.columns = [f"acc_{c}" for c in acc_cols]
    acc_s = acc_s.sample(min(sample_size, len(acc_s)), random_state=42).reset_index(drop=True)

    n = min(len(lap), len(acc_s))
    combined = pd.concat([lap.iloc[:n].reset_index(drop=True),
                          acc_s.iloc[:n].reset_index(drop=True)], axis=1)

    for col in combined.columns:
        combined[col] = combined[col].astype(str)

    min_support = _adapt_support(combined, min_support)
    transactions = _encode_transactions(combined, list(combined.columns))
    print(f"  [cross-assoc] {len(transactions)} paniers simulés")

    freq_items = apriori(transactions, min_support=min_support, max_len=3)
    rules = generate_rules(freq_items, min_confidence=min_confidence, min_lift=min_lift)
    print(f"  [cross-assoc] {len(rules)} règles croisées")
    return rules


def top_rules_by_consequent(rules: pd.DataFrame, consequent_contains: str, n: int = 10) -> pd.DataFrame:
    """Filtre les règles dont le conséquent contient une valeur donnée."""
    if rules.empty:
        return rules
    mask = rules["consequent"].str.contains(consequent_contains, case=False, na=False)
    return rules[mask].head(n)