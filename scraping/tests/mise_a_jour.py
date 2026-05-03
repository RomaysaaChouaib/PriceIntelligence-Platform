import pandas as pd
import pymysql
import re
from datetime import datetime

def update_db_from_csv(csv_file):
    connection = None
    try:
        # 1. Connexion à la base de données avec tes identifiants
        connection = pymysql.connect(
            host='127.0.0.1',
            user='root',
            password='#salmasalma!@',
            db='price_project' 
        )
        cursor = connection.cursor()

        # 2. Lecture du fichier CSV
        print(f"📂 Lecture du fichier {csv_file}...")
        df = pd.read_csv(csv_file)

        # 3. La requête SQL magique (Insert ou Update)
        sql = """
        INSERT INTO products 
            (title, price, currency, brand, source, link, image, search_query, page, is_gaming, date_scraped)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE 
            price = VALUES(price),
            date_scraped = VALUES(date_scraped);
        """

        count = 0
        
        # 4. Parcourir chaque ligne du CSV et l'envoyer à MySQL
        for index, row in df.iterrows():
            # Nettoyage de sécurité pour le prix au cas où
            raw_price = str(row.get('price', '0'))
            clean_price = re.sub(r'[^\d.]', '', raw_price.replace(',', '.'))
            try:
                final_price = float(clean_price)
            except ValueError:
                final_price = 0.0

            # Préparation des données de la ligne
            values = (
                str(row.get('title', 'Sans titre')),
                final_price,
                str(row.get('currency', 'MAD')),
                str(row.get('brand', 'Inconnu')),
                str(row.get('source', 'AliExpress')),
                str(row['link']), # Le lien est obligatoire
                str(row.get('image', '')),
                str(row.get('search_query', '')),
                int(row.get('page', 1)) if pd.notna(row.get('page')) else 1,
                bool(row.get('is_gaming', False)),
                str(row.get('date_scraped', datetime.now().strftime("%Y-%m-%d %H:%M:%S")))
            )

            # Exécuter l'insertion/mise à jour
            cursor.execute(sql, values)
            count += 1

        # Valider les modifications dans la base de données
        connection.commit()
        print(f"✅ Succès ! {count} produits mis à jour ou insérés depuis le CSV.")

    except FileNotFoundError:
        print(f"❌ Erreur : Le fichier '{csv_file}' est introuvable. As-tu bien lancé le scraper avant ?")
    except Exception as e:
        print(f"❌ Erreur lors de la base de données : {e}")
    finally:
        # Toujours fermer la connexion à la fin
        if connection and connection.open:
            connection.close()
            print("🔌 Connexion MySQL fermée.")

# --- EXÉCUTION ---
if __name__ == "__main__":
    # Remplace par le nom du fichier CSV que ton scraper génère
    nom_du_fichier_csv = "test_aliexpress_laptops.csv" 
    
    print("-" * 50)
    print("🚀 Démarrage de la mise à jour depuis le CSV vers MySQL")
    print("-" * 50)
    
    update_db_from_csv(nom_du_fichier_csv)