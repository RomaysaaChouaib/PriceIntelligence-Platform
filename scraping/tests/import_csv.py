import csv
import sys
import os

# On importe ta classe MySQLWriter (vérifie que le chemin d'import correspond à ton projet)
# --- LA CORRECTION EST ICI ---
# On dit à Python d'inclure le dossier actuel (backend) dans son chemin de recherche
# Cela permet de trouver le dossier "scraping" sans erreur !
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Maintenant l'importation va fonctionner :
from scraping.db.mysql_writer import MySQLWriter

def import_csv_to_db(csv_filepath):
    """Lit un fichier CSV et insère ses données dans la base MySQL."""
    
    if not os.path.exists(csv_filepath):
        print(f"❌ Erreur : Le fichier '{csv_filepath}' n'existe pas.")
        return

    products_to_insert = []

    print(f"📂 Lecture du fichier {csv_filepath}...")
    
    # --- CORRECTION ICI : 'utf-8-sig' au lieu de 'utf-8' pour régler le bug du title ---
    with open(csv_filepath, mode='r', encoding='utf-8-sig') as file:
        reader = csv.DictReader(file)
        
        for row in reader:
            # On reformate chaque ligne en un dictionnaire que ton MySQLWriter comprend
            product = {
                "title": row.get("title", ""),
                "price": row.get("price", "0"), # Le MySQLWriter va automatiquement corriger la virgule !
                "currency": row.get("currency", ""),
                "brand": row.get("brand", ""),
                "source": row.get("source", ""),
                "link": row.get("link", ""),
                "image": row.get("image", ""),
                "search_query": row.get("search_query", ""),
                "page": int(row.get("page", 1)) if row.get("page") else 1,
                # Convertir le texte "True"/"False" du CSV en vrai booléen Python
                "is_gaming": str(row.get("is_gaming")).strip().lower() == "true",
                "date_scraped": row.get("date_scraped", "")
            }
            products_to_insert.append(product)

    if not products_to_insert:
        print("⚠️ Aucun produit trouvé dans le fichier CSV.")
        return

    print(f"⏳ Insertion de {len(products_to_insert)} produits dans la base de données...")

    # Connexion à la base de données et insertion
    db = MySQLWriter()
    try:
        db.insert_products(products_to_insert)
        print("✅ Importation terminée avec succès !")
    except Exception as e:
        print("❌ Erreur lors de l'insertion en base de données :", e)
    finally:
        db.close()

if __name__ == "__main__":
    # Vérifier si l'utilisateur a bien fourni le nom du fichier en commande
    if len(sys.argv) < 2:
        print("👉 Utilisation : python import_csv.py <nom_du_fichier.csv>")
    else:
        fichier_csv = sys.argv[1]
        import_csv_to_db(fichier_csv)