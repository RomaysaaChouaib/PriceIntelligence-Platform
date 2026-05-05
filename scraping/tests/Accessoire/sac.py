import sys
import os
from datetime import datetime

# Ajout du chemin pour trouver le dossier scraping
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# --- Imports des classes (adapte les chemins selon ton projet) ---
from scraping.spiders.Sac import SacLaptopAliexpressScraper
from scraping.core.cleaner import remove_duplicates
from scraping.db.mysql_writer import MySQLWriter

def run_single_amazon_search():
    # Configuration
    query = "sac_laptop"
    pages_to_scrape = 7
    
    print("=" * 60)
    print(f"🚀 Lancement du scraping Amazon pour : {query}")
    print("=" * 60)

    # 1. Initialisation du scraper et de la DB
    scraper = SacLaptopAliexpressScraper()
    db = MySQLWriter()
    
    try:
        # 2. Exécution du scraping
        print(f"⏳ Extraction des données sur {pages_to_scrape} pages...")
        raw_results = scraper.scrape(query, max_pages=pages_to_scrape)
        
        # 3. Nettoyage des doublons (si ta fonction remove_duplicates est prête)
        cleaned_results = remove_duplicates(raw_results)
        print(f"✅ Scraping terminé : {len(cleaned_results)} produits uniques trouvés.")

        if cleaned_results:
            # 4. Insertion directe en base de données
            print(f"\n💾 Lancement de l'insertion dans MySQL (Table: accessories)...")
            try:
                # On utilise bien insert_accessories comme vu précédemment
                db.insert_accessories(cleaned_results)
                print(f"✔ Insertion réussie ! ({len(cleaned_results)} produits ajoutés/mis à jour)")
            except Exception as e:
                print(f"❌ Erreur lors de l'insertion BD : {e}")
            
            # 5. Petit affichage de vérification des 3 premiers produits
            print("\n🔍 Aperçu des résultats :")
            for p in cleaned_results[:3]:
                print(f"- {p.get('title', '')[:60]}...")
                print(f"  Prix: {p.get('price')} {p.get('currency')} | Source: {p.get('source')}")
                print("-" * 30)
        else:
            print("⚠️ Aucun produit trouvé ou extrait.")

    except Exception as e:
        print(f"❌ Erreur générale durant le processus : {e}")
    
    finally:
        # Toujours fermer la connexion à la base de données
        db.close()
        print("\n" + "=" * 60)
        print("🏁 Fin du script Amazon")
        print("=" * 60)

if __name__ == "__main__":
    run_single_amazon_search()