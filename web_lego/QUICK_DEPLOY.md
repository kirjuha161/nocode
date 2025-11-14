# Быстрый деплой Web Lego

## 🚀 Самый простой способ - Render.com (Бесплатно)

1. Зарегистрируйтесь на [render.com](https://render.com)
2. Нажмите "New +" → "Web Service"
3. Подключите ваш GitHub репозиторий
4. Настройки:
   - **Name**: web-lego (или любое другое)
   - **Environment**: Python 3
   - **Build Command**: `pip install -r requirements.txt && python manage.py collectstatic --noinput`
   - **Start Command**: `gunicorn --config gunicorn_config.py web_lego.wsgi:application`
5. Добавьте PostgreSQL:
   - "New +" → "PostgreSQL"
   - Скопируйте **Internal Database URL**
6. В настройках Web Service добавьте переменные окружения:
   ```
   DEBUG=0
   SECRET_KEY=сгенерируйте-через-python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
   ALLOWED_HOSTS=your-app-name.onrender.com
   DATABASE_URL=вставьте-скопированный-url-из-шага-5
   ```
7. Нажмите "Create Web Service"
8. Дождитесь деплоя (5-10 минут)
9. После деплоя выполните миграции:
   - В Render Dashboard → ваш сервис → Shell
   - Выполните: `python manage.py migrate`
   - Создайте суперпользователя: `python manage.py createsuperuser`

Готово! Ваш сайт доступен по адресу: `https://your-app-name.onrender.com`

---

## 🐳 Деплой через Docker (если Docker установлен)

```bash
# 1. Создайте .env файл
cat > .env << EOF
DEBUG=0
SECRET_KEY=$(python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())")
ALLOWED_HOSTS=your-domain.com,your-ip-address
POSTGRES_PASSWORD=strong-password-here
EOF

# 2. Запустите production версию
docker-compose -f docker-compose.prod.yml up -d --build

# 3. Выполните миграции
docker-compose -f docker-compose.prod.yml exec web python manage.py migrate

# 4. Создайте суперпользователя
docker-compose -f docker-compose.prod.yml exec web python manage.py createsuperuser
```

Сайт будет доступен на порту 8000: `http://your-server-ip:8000`

---

## 📝 Важные настройки перед деплоем

1. **Сгенерируйте SECRET_KEY**:
   ```bash
   python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
   ```

2. **Настройте ALLOWED_HOSTS** - укажите ваш домен или IP адрес

3. **Убедитесь, что DEBUG=0** в production

---

## 🔧 Локальный тест production настроек

Перед деплоем протестируйте локально:

```bash
# Установите зависимости
pip install -r requirements.txt

# Соберите статику
python manage.py collectstatic --noinput

# Запустите через gunicorn
gunicorn --config gunicorn_config.py web_lego.wsgi:application
```

Откройте http://localhost:8000 и проверьте работу.

---

## 📚 Подробная инструкция

Смотрите файл `DEPLOY.md` для детальных инструкций по деплою на VPS и другие платформы.

