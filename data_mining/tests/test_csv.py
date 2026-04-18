# data_mining/tests/test_csv.py
"""
Test d'intégration sur le vrai CSV backend.
Valide le pipeline complet de bout en bout.
"""

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

import pandas as pd
import numpy as np

from data_mining.preprocessing.clean_data import clean_dataframe
from data_mining.preprocessing.feature_engineering import add_features_dataframe
from data_mining.preprocessing.normalize import normalize_dataframe, get_price_percentiles

CSV_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "backend", "resultats_frontend.csv")


def load_and_prepare():
    df = pd.read_csv(CSV_PATH)
    df = clean_dataframe(df)
    df = add_features_dataframe(df)
    df, _ = normalize_dataframe(df, method="robust")
    return df


def test_integration_pipeline():
    print("\n" + "="*60)
    print("TEST D'INTÉGRATION — Pipeline complet sur CSV réel")
    print("="*60)

    # 1. Chargement
    df_raw = pd.read_csv(CSV_PATH)
    print(f"\n📥 Données brutes : {len(df_raw)} lignes, colonnes: {list(df_raw.columns)}")

    # 2. Nettoyage
    df = clean_dataframe(df_raw)
    print(f"\n✅ Après nettoyage : {len(df)} produits")
    assert len(df) > 0, "Le nettoyage a supprimé tous les produits!"

    # 3. Feature engineering
    df = add_features_dataframe(df)
    print(f"\n🔧 Features ajoutées : {[c for c in df.columns if c not in df_raw.columns]}")
    assert "brand_detected" in df.columns
    assert "price_category" in df.columns
    assert "log_price" in df.columns

    # 4. Normalisation
    df, scaler = normalize_dataframe(df, method="robust")
    assert "price_scaled" in df.columns

    # 5. Stats
    percentiles = get_price_percentiles(df)
    print(f"\n📊 Percentiles prix (MAD):")
    for k, v in percentiles.items():
        print(f"    {k:8s} : {v:,.0f}")

    # 6. Distribution marques
    print(f"\n🏷️  Top 5 marques détectées:")
    print(df["brand_detected"].value_counts().head(5).to_string())

    # 7. Catégories de gamme
    print(f"\n💰 Répartition par gamme:")
    print(df["price_category"].value_counts().to_string())

    # 8. Gaming
    gaming_count = df["is_gaming"].sum()
    print(f"\n🎮 Produits gaming : {gaming_count} ({gaming_count/len(df)*100:.1f}%)")

    # 9. RAM détectée
    ram_detected = df["ram_gb"].notna().sum()
    print(f"\n🧠 RAM détectée dans le titre : {ram_detected} produits")

    print("\n✅ Test d'intégration RÉUSSI")
    return df


if __name__ == "__main__":
    df = test_integration_pipeline()
    print(f"\nDataFrame final : {df.shape}")
    print(df[["title", "price", "brand_detected", "price_category", "is_gaming"]].head(10).to_string())
