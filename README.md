"# PriceIntelligence-Platform" 
python import_csv.py  amazon_laptop.csv

pip install celery redis

"# lancer un worker pour ne planter pas interafce "
pip install django-redis

C:\Program Files\Redis>redis-server.exe
celery -A config worker --loglevel=info --pool=solo