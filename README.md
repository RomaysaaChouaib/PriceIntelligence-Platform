"# PriceIntelligence-Platform" 
+python import_csv.py  amazon_laptop.csv
# pour exporter d'apres sql:
+mysqldump -u root -p price_project accessories > export_acc.sql
# lancer un worker pour ne planter pas interafce 
+pip install celery redis
+pip install django-redis

C:\Program Files\Redis>redis-server.exe

+celery -A config worker --loglevel=info --pool=solo

# pour vider file d'attente :celery -A config purge


2. Lancer le planificateur (Le "Beat")
Pour que cela fonctionne, tu dois avoir deux processus qui tournent en plus de serveur Django :

Le Worker: Il exécute les tâches.

Le Beat : Il surveille l'heure et envoie les tâches au worker.

Le Serveur Django :
python manage.py runserver

Le Worker Celery (L'exécuteur) 

Le Celery Beat (L'horloge) :
celery -A config beat -l info