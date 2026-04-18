import mysql.connector
import csv


class MySQLWriter:
    def __init__(self):
        self.conn = mysql.connector.connect(
            host="127.0.0.1",
            user="root",
            password="#salmasalma!@",
            database="price_project"
        )
        self.cursor = self.conn.cursor()

    # =========================
    # 1. INSERT FROM SCRAPING
    # =========================
    def insert_products(self, products):
        sql = """
        INSERT INTO products 
        (title, price, brand, source, link, image, search_query, page, is_gaming, date_scraped)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """

        for p in products:
            values = (
                p.get("title"),
                p.get("price"),
                p.get("brand"),
                p.get("source"),
                p.get("link"),
                p.get("image"),
                p.get("search_query"),
                p.get("page"),
                p.get("is_gaming"),
                p.get("date_scraped")
            )

            self.cursor.execute(sql, values)

        self.conn.commit()
        print(f"✔ {len(products)} products inserted into MySQL")

    # =========================
    # 2. IMPORT FROM CSV
    # =========================
    def import_csv_to_db(self, file_path):
        sql = """
        INSERT INTO products 
        (title, price, brand, source, link, image, search_query, page, is_gaming, date_scraped)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """

        with open(file_path, encoding="utf-8-sig") as file:
            reader = csv.DictReader(file)

            count = 0

            for row in reader:
                try:
                    values = (
                        row["title"],
                        float(row["price"]) if row["price"] else 0,
                        row["brand"],
                        row["source"],
                        row["link"],
                        row["image"],
                        row["search_query"],
                        int(row["page"]),
                        row["is_gaming"] == "True",
                        row["date_scraped"]
                    )

                    self.cursor.execute(sql, values)
                    count += 1

                except Exception as e:
                    print("Skipping row error:", e)

        self.conn.commit()
        print(f"✔ {count} rows imported from CSV into MySQL")

    # =========================
    # 3. CLOSE CONNECTION
    # =========================
    def close(self):
        self.cursor.close()
        self.conn.close()