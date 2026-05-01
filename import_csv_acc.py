import csv
import sys
import os

# Ajout du chemin pour trouver le dossier scraping
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from scraping.db.mysql_writer import MySQLWriter

def import_accessories_csv_to_db(csv_filepath):
    """Lit un fichier CSV d'accessoires et les insère dans la table accessories."""
    
    if not os.path.exists(csv_filepath):
        print(f"❌ Erreur : Le fichier '{csv_filepath}' n'existe pas.")
        return

    accessories_to_insert = []

    print(f"📂 Lecture du fichier d'accessoires : {csv_filepath}...")
    
    # Utilisation de utf-8-sig pour éviter les problèmes de caractères spéciaux au début du fichier
    with open(csv_filepath, mode='r', encoding='utf-8-sig') as file:
        reader = csv.DictReader(file)
        
        for row in reader:
            # On adapte le dictionnaire pour la table accessories
            accessory = {
                "category": row.get("category", "mouse"), 
                "title": row.get("title", ""),
                "price": row.get("price", "0"),
                "old_price": row.get("old_price") if row.get("old_price") != "" else None,
                "brand": row.get("brand", "Inconnu"),
                "source": row.get("source", ""),
                "link": row.get("link", ""),
                "image": row.get("image", ""),
                "search_query": row.get("search_query", ""),
                "page": int(row.get("page", 1)) if row.get("page") else 1,
                "in_stock": str(row.get("in_stock")).strip().lower() == "true",
                "is_gaming": str(row.get("is_gaming")).strip().lower() == "true",
                "date_scraped": row.get("date_scraped", "")
            }
            accessories_to_insert.append(accessory)

    if not accessories_to_insert:
        print("⚠️ Aucun accessoire trouvé dans le fichier CSV.")
        return

    print(f"⏳ Insertion de {len(accessories_to_insert)} accessoires dans la base de données...")

    # Connexion à la base de données et appel de la méthode spécifique aux accessoires
    db = MySQLWriter()
    try:
        # 🔥 ATTENTION : On utilise insert_accessories ici, pas insert_products
        db.insert_accessories(accessories_to_insert)
        print("✅ Importation des accessoires terminée avec succès !")
    except Exception as e:
        print("❌ Erreur lors de l'insertion en base de données :", e)
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("👉 Utilisation : python import_accessories_csv.py <nom_du_fichier.csv>")
    else:
        fichier_csv = sys.argv[1]
        import_accessories_csv_to_db(fichier_csv)