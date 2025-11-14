#!/bin/bash

# Ждем готовности базы данных
if [ -n "$POSTGRES_DB" ]; then
    echo "Waiting for PostgreSQL..."
    while ! nc -z db 5432; do
        sleep 0.1
    done
    echo "PostgreSQL started"
fi

# Выполняем миграции
python manage.py migrate --noinput

# Собираем статические файлы
python manage.py collectstatic --noinput || true

# Запускаем команду
exec "$@"

