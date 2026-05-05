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
           price = VALUES(price),
            date_scraped = VALUES(date_scraped);
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
                    str(p.get("brand", ""))[:50],
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
    # CACHE DM
    # =========================
     def get_cache(self, key):
        """Retourne le cache si valide, None sinon"""
        sql = """
        SELECT result, products_count, is_valid 
        FROM dm_cache 
        WHERE cache_key = %s AND is_valid = TRUE
        """
        self.cursor.execute(sql, (key,))
        row = self.cursor.fetchone()
        if not row:
            return None
        
        result, cached_count, is_valid = row
        current_count = self.count_all_products()
        
        # Si nouveaux produits ajoutés → cache invalide
        if current_count != cached_count:
            self.invalidate_cache(key)
            return None
        
        import json
        return json.loads(result)

    def save_cache(self, key, data):
        """Sauvegarde le résultat DM"""
        import json
        import math
        count = self.count_all_products()

        # Nettoie les valeurs non-JSON (NaN, Infinity, etc.)
        def clean(obj):
            if isinstance(obj, float) and (math.isnan(obj) or math.isinf(obj)):
                return None
            if isinstance(obj, dict):
                return {k: clean(v) for k, v in obj.items()}
            if isinstance(obj, list):
                return [clean(i) for i in obj]
            return obj

        data = clean(data)

        sql = """
        INSERT INTO dm_cache (cache_key, result, products_count, is_valid)
        VALUES (%s, %s, %s, TRUE)
        ON DUPLICATE KEY UPDATE
            result = VALUES(result),
            products_count = VALUES(products_count),
            is_valid = TRUE,
            created_at = NOW()
        """
        self.cursor.execute(sql, (key, json.dumps(data, default=str), count))
        self.conn.commit()
        print(f"✔ Cache '{key}' sauvegardé")
    def invalidate_cache(self, key=None):
        """Invalide un cache spécifique ou tout le cache"""
        if key:
            self.cursor.execute(
                "UPDATE dm_cache SET is_valid = FALSE WHERE cache_key = %s", (key,)
            )
        else:
            # Invalide TOUT le cache (quand nouveaux produits ajoutés)
            self.cursor.execute("UPDATE dm_cache SET is_valid = FALSE")
        self.conn.commit()
    # INSERT ACCESSORIES
    # =========================
    def insert_accessories(self, accessories):
        sql = """
        INSERT INTO accessories
        (category, title, price, currency, brand, source, link, image, search_query, page, in_stock, is_gaming, date_scraped)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        ON DUPLICATE KEY UPDATE 
            price = VALUES(price),
            currency = VALUES(currency),
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
                

                values = (
                    a.get("category"),
                    a.get("title"),
                    price_val,                  # Prix corrigé
                    a.get("currency", "EUR"),   # <-- AJOUT DE LA DEVISE ICI
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
    # GET ACCESSORIES BY QUERY
    # =========================
    def get_accessories_by_query(self, query):
        sql = """
        SELECT
            id, category, title, price, currency, brand, source, link, image,
            search_query, page, in_stock, is_gaming, date_scraped
        FROM accessories
        WHERE LOWER(search_query) LIKE %s
        ORDER BY id DESC
        """

        self.cursor.execute(sql, (f"%{query.lower()}%",))
        rows = self.cursor.fetchall()
        columns = [col[0] for col in self.cursor.description]

        accessories = []
        for row in rows:
            item = dict(zip(columns, row))
            item["price"] = float(item["price"]) if item["price"] is not None else 0
            item["is_gaming"] = bool(item["is_gaming"])
            item["in_stock"] = bool(item["in_stock"]) # Spécifique aux accessoires
            accessories.append(item)

        return accessories

    # =========================
    # COUNT ALL ACCESSORIES
    # =========================
    def count_all_accessories(self):
        sql = "SELECT COUNT(*) FROM accessories"
        self.cursor.execute(sql)
        return self.cursor.fetchone()[0]

    # =========================
    # GET ALL ACCESSORIES PAGINATED
    # =========================
    def get_all_accessories_paginated(self, limit, offset):
        sql = """
        SELECT *
        FROM accessories
        ORDER BY id DESC
        LIMIT %s OFFSET %s
        """
        
        self.cursor.execute(sql, (limit, offset))
        rows = self.cursor.fetchall()
        columns = [col[0] for col in self.cursor.description]

        accessories = []
        for row in rows:
            item = dict(zip(columns, row))
            item["price"] = float(item["price"]) if item["price"] is not None else 0
            item["is_gaming"] = bool(item["is_gaming"])
            item["in_stock"] = bool(item.get("in_stock", True))
            accessories.append(item)

        return accessories

    # =========================
    # COUNT ACCESSORIES SEARCH RESULTS
    # =========================
    def count_accessories_search(self, query):
        sql = """
        SELECT COUNT(*)
        FROM accessories
        WHERE LOWER(title) LIKE %s
           OR LOWER(brand) LIKE %s
           OR LOWER(search_query) LIKE %s
           OR LOWER(category) LIKE %s 
        """
        # J'ai ajouté la recherche par 'category' car c'est utile pour les accessoires
        term = f"%{query.lower()}%"
        self.cursor.execute(sql, (term, term, term, term))
        return self.cursor.fetchone()[0]

    # =========================
    # SEARCH ACCESSORIES PAGINATED
    # =========================
    def search_accessories_paginated(self, query, limit, offset):
        sql = """
        SELECT *
        FROM accessories
        WHERE LOWER(title) LIKE %s
           OR LOWER(brand) LIKE %s
           OR LOWER(search_query) LIKE %s
           OR LOWER(category) LIKE %s
        ORDER BY id DESC
        LIMIT %s OFFSET %s
        """

        term = f"%{query.lower()}%"
        self.cursor.execute(sql, (term, term, term, term, limit, offset))

        rows = self.cursor.fetchall()
        columns = [col[0] for col in self.cursor.description]

        accessories = []
        for row in rows:
            item = dict(zip(columns, row))
            item["price"] = float(item["price"]) if item["price"] is not None else 0
            item["is_gaming"] = bool(item["is_gaming"])
            item["in_stock"] = bool(item.get("in_stock", True))
            accessories.append(item)

        return accessories



    # =========================
    # 8. CLOSE CONNECTION
    # =========================
    def close(self):
        self.cursor.close()
        self.conn.close()
