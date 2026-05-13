# simulate_drop.py
from scraping.db.mysql_writer import MySQLWriter
from scraping.services.notification import check_price_drop

def test_notification():
    writer = MySQLWriter()
    print("🚀 Connexion MySQL établie pour le test...")
    
    # AJOUT : link, source, et ORDER BY RAND()
    query = """
        SELECT title, price, currency, link, source 
        FROM products 
        WHERE price > 0 
        ORDER BY RAND() 
        LIMIT 20
    """
    writer.cursor.execute(query)
    rows = writer.cursor.fetchall() 
    
    if rows:
        print(f"📦 {len(rows)} produits récupérés aléatoirement pour le test.\n")
        
        for index, row in enumerate(rows, start=1):
            title = row[0]
            db_price = float(row[1])
            currency = row[2] if row[2] else "MAD"
            link = row[3]     # <-- Récupération du lien
            source = row[4]   # <-- Récupération de la source
            
            # Simulation d'une baisse de 25%
            scraped_price_simulated = db_price * 0.75
            
            short_title = title[:60] + "..." if len(title) > 60 else title
            
            print(f"--- TEST {index}/20 SUR : {short_title} ---")
            print(f"🏪 Source : {source}")
            print(f"Prix en DB : {db_price:.2f} {currency}")
            print(f"Prix simulé : {scraped_price_simulated:.2f} {currency}")
            
            # On passe aussi le lien et la source à la fonction
            check_price_drop(title, scraped_price_simulated, db_price, currency, link, source)
            print("-" * 60) 
            
    else:
        print("❌ Aucun produit trouvé en base pour tester.")
    
    writer.close()

if __name__ == "__main__":
    test_notification()