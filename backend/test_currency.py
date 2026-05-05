import sys, os
sys.path.insert(0, '..')
from scraping.db.mysql_writer import MySQLWriter

db = MySQLWriter()

# Voir les devises dans la BD
db.cursor.execute("SELECT currency, price FROM products LIMIT 10")
rows = db.cursor.fetchall()
print("=== Devises dans BD ===")
for r in rows:
    print(r)

# Vérifier la conversion
db.cursor.execute("SELECT COUNT(*) FROM products WHERE currency = 'USD'")
print(f"\nProduits USD: {db.cursor.fetchone()[0]}")

db.cursor.execute("SELECT COUNT(*) FROM products WHERE currency = 'MAD'")
print(f"Produits MAD: {db.cursor.fetchone()[0]}")

db.cursor.execute("SELECT COUNT(*) FROM products WHERE currency NOT IN ('USD', 'MAD', 'EUR')")
print(f"Autres devises: {db.cursor.fetchone()[0]}")

db.close()