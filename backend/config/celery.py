import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

app = Celery('config')

# 🔥 IMPORTANT
app.config_from_object('django.conf:settings', namespace='CELERY')

# 🔥 FORCE Redis (très important)
app.conf.broker_url = "redis://127.0.0.1:6379/0"
app.conf.result_backend = "redis://127.0.0.1:6379/0"

app.autodiscover_tasks()