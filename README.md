"# PriceIntelligence-Platform" 
python import_csv.py  amazon_laptop.csv
# pour exporter d'apres sql:
mysqldump -u root -p price_project accessories > export_acc.sql
"# lancer un worker pour ne planter pas interafce "
pip install celery redis
pip install django-redis

C:\Program Files\Redis>redis-server.exe

+celery -A config worker --loglevel=info --pool=solo
