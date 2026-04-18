# data_mining/models/association.py
"""
Règles d'association entre caractéristiques produits.
Implémentation manuelle de l'algorithme Apriori (sans mlxtend)
basée sur itertools + pandas.

Objectif : trouver des patterns du type :
  "Si marque=HP ET prix=milieu_de_gamme → is_gaming=False avec confiance 92%"
"""

import pandas as pd
import numpy as np
from itertools import combinations
from collections import defaultdict


# ── Helpers ─────────────────────────────────────────────────────────────────

def _encode_transactions(df: pd.DataFrame, columns: list) -> list[frozenset]:
    """
    Transforme le DataFrame en liste de transactions (frozensets d'items).
    Chaque item est de la forme "colonne=valeur".
    """
    transactions = []
    for _, row in df[columns].iterrows():
        items = frozenset(f"{col}={row[col]}" for col in columns if pd.notna(row[col]))
        transactions.append(items)
    return transactions


def _get_frequent_1_itemsets(transactions: list, min_support: float) -> dict:
    """Comptage des items fréquents (taille 1)."""
    n = len(transactions)
    counts = defaultdict(int)
    for trans in transactions:
        for item in trans:
            counts[frozenset([item])] += 1
    return {k: v / n for k, v in counts.items() if v / n >= min_support}


def _generate_candidates(prev_frequent: list, k: int) -> list:
    """Génère les candidats de taille k à partir des fréquents de taille k-1."""
    candidates = set()
    prev_list = list(prev_frequent)
    for i in range(len(prev_list)):
        for j in range(i + 1, len(prev_list)):
            union = prev_list[i] | prev_list[j]
            if len(union) == k:
                candidates.add(union)
    return list(candidates)


def apriori(
    transactions: list,
    min_support: float = 0.1,
    max_len: int = 3,
) -> dict:
    """
    Algorithme Apriori.

    Retourne un dict {frozenset(items): support} pour tous les itemsets fréquents.
    """
    n = len(transactions)
    frequent_itemsets = {}

    # k = 1
    freq_k = _get_frequent_1_itemsets(transactions, min_support)
    frequent_itemsets.update(freq_k)

    current_freq = list(freq_k.keys())

    for k in range(2, max_len + 1):
        if not current_freq:
            break
        candidates = _generate_candidates(current_freq, k)
        counts = defaultdict(int)
        for trans in transactions:
            for cand in candidates:
                if cand.issubset(trans):
                    counts[cand] += 1
        new_freq = {k: v / n for k, v in counts.items() if v / n >= min_support}
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
    """
    Génère les règles d'association à partir des itemsets fréquents.

    Retourne un DataFrame trié par lift décroissant avec colonnes :
    antecedent, consequent, support, confidence, lift.
    """
    rules = []
    total_items = sum(1 for k in frequent_itemsets if len(k) == 1)

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
                    "antecedent":  ", ".join(sorted(antecedent)),
                    "consequent":  ", ".join(sorted(consequent)),
                    "support":     round(support, 4),
                    "confidence":  round(confidence, 4),
                    "lift":        round(lift, 4),
                })

    if not rules:
        return pd.DataFrame(columns=["antecedent", "consequent", "support", "confidence", "lift"])

    df_rules = pd.DataFrame(rules).drop_duplicates()
    return df_rules.sort_values("lift", ascending=False).reset_index(drop=True)


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

    Colonnes par défaut : brand_detected, price_category, is_gaming
    """
    if columns is None:
        columns = [c for c in ["brand_detected", "price_category", "is_gaming", "cluster"]
                   if c in df.columns]
        if not columns:
            raise ValueError("Aucune colonne catégorielle disponible pour l'analyse.")

    print(f"  [assoc] Colonnes : {columns}")
    print(f"  [assoc] min_support={min_support}, min_confidence={min_confidence}, min_lift={min_lift}")

    # Convertir is_gaming en string lisible
    df_enc = df[columns].copy()
    for col in df_enc.columns:
        df_enc[col] = df_enc[col].astype(str)

    transactions = _encode_transactions(df_enc, columns)
    print(f"  [assoc] {len(transactions)} transactions")

    freq_items = apriori(transactions, min_support=min_support, max_len=max_len)
    print(f"  [assoc] {len(freq_items)} itemsets fréquents trouvés")

    rules = generate_rules(freq_items, min_confidence=min_confidence, min_lift=min_lift)
    print(f"  [assoc] {len(rules)} règles générées")

    return rules


def top_rules_by_consequent(rules: pd.DataFrame, consequent_contains: str, n: int = 10) -> pd.DataFrame:
    """Filtre les règles dont le conséquent contient une valeur donnée."""
    mask = rules["consequent"].str.contains(consequent_contains, case=False, na=False)
    return rules[mask].head(n)
