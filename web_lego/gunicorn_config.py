# Gunicorn конфигурация для production
import multiprocessing
import os

# Количество воркеров (рекомендуется: 2 * CPU cores + 1)
workers = int(os.environ.get('GUNICORN_WORKERS', multiprocessing.cpu_count() * 2 + 1))

# Адрес и порт
bind = os.environ.get('GUNICORN_BIND', '0.0.0.0:8000')

# Тип воркеров
worker_class = 'sync'

# Таймауты
timeout = 120
keepalive = 5

# Логирование
accesslog = '-'
errorlog = '-'
loglevel = os.environ.get('LOG_LEVEL', 'info')

# Перезагрузка при изменении кода (только для разработки)
reload = os.environ.get('GUNICORN_RELOAD', 'False').lower() == 'true'

# Имя приложения
proc_name = 'web_lego'

# Максимальное количество запросов на воркер перед перезапуском
max_requests = 1000
max_requests_jitter = 50

