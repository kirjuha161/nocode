Web Lego - Конструктор одностраничных сайтов
Конструктор для создания одностраничных сайтов без программирования


Технологии
Backend: Django 4.2+

Frontend: HTML, CSS, JavaScript

База данных: SQLite (по умолчанию) / PostgreSQL (в Docker)

Контейнеризация: Docker, Docker Compose

Быстрый старт
Запуск с Docker 
bash
# Клонирование репоэитория
git clone <repository-url>
cd nocode/web_lego

# Запуск проекта
docker-compose up --build

# В новом терминале - миграции
docker-compose exec web python manage.py migrate

# Создание суперпользователя (опционально)
docker-compose exec web python manage.py createsuperuser
Откройте браузер: http://localhost:8000

Локальная установка
bash
# Создание виртуального окружения
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate  # Windows

# Установка зависимостей
pip install -r requirements.txt

# Настройка базы данных
python manage.py migrate

# Создание администратора
python manage.py createsuperuser

# Запуск сервера
python manage.py runserver



Команды Docker
Команда	Описание
docker-compose up	Запуск проекта
docker-compose up -d	Запуск в фоновом режиме
docker-compose down	Остановка проекта
docker-compose up --build	Пересборка и запуск
docker-compose exec web python manage.py <command>	Выполнение команд Django
docker-compose logs -f web	Просмотр логов

Проект уже настроен для работы с PostgreSQL в Docker Compose. База данных автоматически создается при первом запуске.

Разработка
Рекомендации для разработчиков:

Виртуальное окружение

bash
python -m venv venv
source venv/bin/activate
Установка зависимостей

bash
pip install -r requirements.txt
Миграции

bash
python manage.py migrate


bash
python manage.py runserver
