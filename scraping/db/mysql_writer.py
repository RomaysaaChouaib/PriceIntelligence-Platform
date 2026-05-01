import os
from pathlib import Path
from dotenv import load_dotenv
import mysql.connector

# On définit le chemin vers le dossier backend
env_path = Path(__file__).resolve().parent.parent.parent / '.env'
load_dotenv(dotenv_path=env_path)
class MySQLWriter:
    def __init__(self):
      # On récupère les valeurs depuis le .env
        # os.getenv("NOM_VARIABLE", "VALEUR_PAR_DEFAUT")
        db_host = os.getenv("DB_HOST", "127.0.0.1")
        db_user = os.getenv("DB_USER", "root")
        db_pass = os.getenv("DB_PASSWORD") 
        db_name = os.getenv("DB_NAME", "price_project")

        try:
            self.conn = mysql.connector.connect(
                host=db_host,
                user=db_user,
                password=db_pass,
                database=db_name,
                port=3306
            )
            self.cursor = self.conn.cursor()
            # print("Connexion réussie à la base de données")
        except mysql.connector.Error as err:
            print(f"Erreur de connexion MySQL : {err}")
            raise
        #Cursor = outil pour exécuter SQL
    # =========================
    # 1. INSERT FROM SCRAPING
    # =========================
    def insert_products(self, products):
        # Ajout de 'currency' et de la gestion des doublons (ON DUPLICATE KEY UPDATE)
        sql = """
        INSERT INTO products
        (title, price, currency, brand, source, link, image, search_query, page, is_gaming, date_scraped)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        ON DUPLICATE KEY UPDATE 
            price = IF(price != VALUES(price), VALUES(price), price),
            date_scraped = IF(price != VALUES(price), VALUES(date_scraped), date_scraped);
        """

        count = 0

        for p in products:
            try:
                # --- NETTOYAGE DU PRIX ---
                raw_price = str(p.get("price", "0"))
                if raw_price in ("N/A", "None", ""):
                    final_price = 0.0
                else:
                    # Enlever les espaces (classiques et insécables) et remplacer la virgule par un point
                    clean_price = raw_price.replace(" ", "").replace("\u202f", "").replace("\xa0", "")
                    clean_price = clean_price.replace(",", ".")
                    try:
                        final_price = float(clean_price)
                    except ValueError:
                        final_price = 0.0
                # -------------------------

                values = (
                    p.get("title"),
                    final_price,       # Prix nettoyé au format float
                    p.get("currency"), # <--- NOUVEAU CHAMP ICI
                    p.get("brand"),
                    p.get("source"),
                    p.get("link"),
                    p.get("image"),
                    p.get("search_query"),
                    int(p.get("page", 1)) if p.get("page") else 1,
                    bool(p.get("is_gaming", False)),
                    p.get("date_scraped")
                )

                self.cursor.execute(sql, values)
                count += 1

            except Exception as e:
                print("Insert error:", e)

        self.conn.commit()
        print(f"✔ {count} products inserted into MySQL")

    # =========================
    # 2. GET PRODUCTS BY QUERY
    # =========================
    def get_products_by_query(self, query):
        sql = """
        SELECT
            id, title, price, currency, brand, source, link, image,
            search_query, page, is_gaming, date_scraped
        FROM products
        WHERE LOWER(search_query) LIKE %s
        ORDER BY id DESC
        """

        self.cursor.execute(sql, (f"%{query.lower()}%",))
        #% = contient
        rows = self.cursor.fetchall()
        #récupère résultats
        columns = [col[0] for col in self.cursor.description]

        products = []
        for row in rows:
            item = dict(zip(columns, row))
            #transforme tuple → dictionnaire
            item["price"] = float(item["price"]) if item["price"] is not None else 0
            item["is_gaming"] = bool(item["is_gaming"])
            products.append(item)

        return products

    # =========================
    # 3. COUNT ALL PRODUCTS
    # =========================
    def count_all_products(self):
        sql = "SELECT COUNT(*) FROM products"
        self.cursor.execute(sql)
        return self.cursor.fetchone()[0]

    # =========================
    # 4. GET ALL PAGINATED
    # =========================
    def get_all_products_paginated(self, limit, offset):
        sql = """
        SELECT *
        FROM products
        ORDER BY id DESC
        LIMIT %s OFFSET %s
        """
        # limit = nb produits/page
        # offset = décalage
        self.cursor.execute(sql, (limit, offset))
        rows = self.cursor.fetchall()
        columns = [col[0] for col in self.cursor.description]

        products = []
        for row in rows:
            item = dict(zip(columns, row))
            item["price"] = float(item["price"]) if item["price"] is not None else 0
            item["is_gaming"] = bool(item["is_gaming"])
            products.append(item)

        return products

    # =========================
    # 5. COUNT SEARCH RESULTS
    # =========================
    def count_products_search(self, query):
        sql = """
        SELECT COUNT(*)
        FROM products
        WHERE LOWER(title) LIKE %s
           OR LOWER(brand) LIKE %s
           OR LOWER(search_query) LIKE %s
        """

        term = f"%{query.lower()}%"
        self.cursor.execute(sql, (term, term, term))
        return self.cursor.fetchone()[0]

    # =========================
    # 6. SEARCH PAGINATED
    # =========================
    def search_products_paginated(self, query, limit, offset):
        sql = """
        SELECT *
        FROM products
        WHERE LOWER(title) LIKE %s
           OR LOWER(brand) LIKE %s
           OR LOWER(search_query) LIKE %s
        ORDER BY id DESC
        LIMIT %s OFFSET %s
        """

        term = f"%{query.lower()}%"
        self.cursor.execute(sql, (term, term, term, limit, offset))

        rows = self.cursor.fetchall()
        columns = [col[0] for col in self.cursor.description]

        products = []
        for row in rows:
            item = dict(zip(columns, row))
            item["price"] = float(item["price"]) if item["price"] is not None else 0
            item["is_gaming"] = bool(item["is_gaming"])
            products.append(item)

        return products

    # =========================
    # 7. CLOSE CONNECTION
    # =========================
    def close(self):
    # INSERT ACCESSORIES
    # =========================
    def insert_accessories(self, accessories):
        sql = """
        INSERT INTO accessories
        (category, title, price, currency, old_price, brand, source, link, image, search_query, page, in_stock, is_gaming, date_scraped)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        ON DUPLICATE KEY UPDATE 
            price = VALUES(price),
            currency = VALUES(currency),
            old_price = VALUES(old_price),
            date_scraped = VALUES(date_scraped);
        """

        count = 0
        for a in accessories:
            try:
                # --- TRAITEMENT DU PRIX ---
                raw_price = a.get("price", "0")
                if raw_price == "N/A" or not raw_price:
                    price_val = 0.0
                else:
                    # Remplacer la virgule par un point
                    price_val = float(str(raw_price).replace(',', '.'))
                
                # --- TRAITEMENT DE L'ANCIEN PRIX ---
                raw_old_price = a.get("old_price", None)
                if raw_old_price == "N/A" or not raw_old_price:
                    old_price_val = None
                else:
                    # Remplacer la virgule par un point
                    old_price_val = float(str(raw_old_price).replace(',', '.'))

                values = (
                    a.get("category"),
                    a.get("title"),
                    price_val,                  # Prix corrigé
                    a.get("currency", "EUR"),   # <-- AJOUT DE LA DEVISE ICI
                    old_price_val,              # Ancien prix corrigé
                    a.get("brand"),
                    a.get("source"),
                    a.get("link"),
                    a.get("image"),
                    a.get("search_query"),
                    int(a.get("page", 1)),
                    bool(a.get("in_stock", True)),
                    bool(a.get("is_gaming", False)),
                    a.get("date_scraped")
                )
                self.cursor.execute(sql, values)
                count += 1
            except Exception as e:
                print(f"Erreur insertion accessoire: {e} | Données: Prix='{a.get('price')}', Old='{a.get('old_price')}'")

        self.conn.commit()
        print(f"✔ {count} accessoires insérés dans MySQL")
    # =========================
    # 8. CLOSE CONNECTION
    # =========================
    def close(self):
        self.cursor.close()
        self.conn.close()