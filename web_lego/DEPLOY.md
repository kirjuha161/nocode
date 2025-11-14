# Инструкция по деплою Web Lego

## Варианты деплоя

### 1. Деплой на облачную платформу (Рекомендуется)

#### Render.com (Бесплатный тариф доступен)

1. Создайте аккаунт на [Render.com](https://render.com)
2. Подключите ваш GitHub репозиторий
3. Создайте новый Web Service
4. Настройки:
   - **Build Command**: `pip install -r requirements.txt && python manage.py collectstatic --noinput`
   - **Start Command**: `gunicorn --config gunicorn_config.py web_lego.wsgi:application`
   - **Environment Variables**:
     ```
     DEBUG=0
     SECRET_KEY=ваш-секретный-ключ
     ALLOWED_HOSTS=your-app.onrender.com
     POSTGRES_DB=web_lego
     POSTGRES_USER=web_lego
     POSTGRES_PASSWORD=ваш-пароль
     POSTGRES_HOST=ваш-postgres-host
     POSTGRES_PORT=5432
     ```
5. Создайте PostgreSQL базу данных на Render
6. Деплой автоматически запустится

#### Railway.app

1. Создайте аккаунт на [Railway.app](https://railway.app)
2. Подключите GitHub репозиторий
3. Добавьте PostgreSQL базу данных
4. Настройте переменные окружения
5. Railway автоматически определит Django и задеплоит

#### Heroku

1. Установите Heroku CLI
2. Войдите: `heroku login`
3. Создайте приложение: `heroku create your-app-name`
4. Добавьте PostgreSQL: `heroku addons:create heroku-postgresql:hobby-dev`
5. Настройте переменные:
   ```bash
   heroku config:set DEBUG=0
   heroku config:set SECRET_KEY=ваш-секретный-ключ
   heroku config:set ALLOWED_HOSTS=your-app.herokuapp.com
   ```
6. Деплой: `git push heroku main`
7. Миграции: `heroku run python manage.py migrate`

### 2. Деплой на VPS (DigitalOcean, AWS, Hetzner и т.д.)

#### Шаг 1: Подготовка сервера

```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка необходимых пакетов
sudo apt install -y python3-pip python3-venv nginx postgresql git
```

#### Шаг 2: Клонирование проекта

```bash
cd /var/www
sudo git clone https://github.com/your-username/web_lego.git
cd web_lego
```

#### Шаг 3: Настройка виртуального окружения

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

#### Шаг 4: Настройка базы данных PostgreSQL

```bash
sudo -u postgres psql
```

В PostgreSQL:
```sql
CREATE DATABASE web_lego;
CREATE USER web_lego_user WITH PASSWORD 'ваш-пароль';
ALTER ROLE web_lego_user SET client_encoding TO 'utf8';
ALTER ROLE web_lego_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE web_lego_user SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE web_lego TO web_lego_user;
\q
```

#### Шаг 5: Настройка Django

Создайте файл `.env`:
```bash
nano .env
```

Содержимое:
```
DEBUG=0
SECRET_KEY=ваш-очень-длинный-секретный-ключ
ALLOWED_HOSTS=your-domain.com,www.your-domain.com,your-server-ip
POSTGRES_DB=web_lego
POSTGRES_USER=web_lego_user
POSTGRES_PASSWORD=ваш-пароль
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
```

Обновите `settings.py` для чтения из `.env` (или используйте переменные окружения).

#### Шаг 6: Миграции и статика

```bash
python manage.py migrate
python manage.py collectstatic --noinput
python manage.py createsuperuser
```

#### Шаг 7: Настройка Gunicorn

Создайте systemd сервис `/etc/systemd/system/web_lego.service`:

```ini
[Unit]
Description=Web Lego Gunicorn daemon
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/web_lego
ExecStart=/var/www/web_lego/venv/bin/gunicorn --config gunicorn_config.py web_lego.wsgi:application
Restart=always

[Install]
WantedBy=multi-user.target
```

Запустите сервис:
```bash
sudo systemctl daemon-reload
sudo systemctl start web_lego
sudo systemctl enable web_lego
```

#### Шаг 8: Настройка Nginx

Скопируйте `nginx.conf` в `/etc/nginx/sites-available/web_lego` и обновите пути и домен.

Создайте симлинк:
```bash
sudo ln -s /etc/nginx/sites-available/web_lego /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### Шаг 9: Настройка SSL (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

### 3. Деплой через Docker

#### Production деплой:

```bash
# Создайте .env файл с переменными окружения
cp .env.example .env
# Отредактируйте .env

# Запустите production версию
docker-compose -f docker-compose.prod.yml up -d --build

# Миграции
docker-compose -f docker-compose.prod.yml exec web python manage.py migrate
docker-compose -f docker-compose.prod.yml exec web python manage.py createsuperuser
```

## Генерация SECRET_KEY

```python
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

## Важные замечания

1. **Никогда не используйте DEBUG=1 в production**
2. **Всегда используйте сильный SECRET_KEY**
3. **Настройте ALLOWED_HOSTS правильно**
4. **Используйте HTTPS в production**
5. **Регулярно делайте бэкапы базы данных**
6. **Настройте мониторинг и логирование**

## Проверка работы

После деплоя проверьте:
- Сайт открывается по домену/IP
- Статические файлы загружаются
- Медиа файлы загружаются
- Формы работают
- Админ-панель доступна

## Обновление

```bash
git pull
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput
sudo systemctl restart web_lego  # или перезапустите Docker контейнер
```

