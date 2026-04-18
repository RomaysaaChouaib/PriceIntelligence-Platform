from scraping.db.mysql_writer import MySQLWriter

db = MySQLWriter()

db.import_csv_to_db("scraping/tests/resultats_frontend.csv")

db.close()