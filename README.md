Web Lego - Конструктор одностраничных сайтов
Конструктор для создания одностраничных сайтов без программирования

Возможности
Функциональность	Описание
Визуальный редактор	Создание сайтов через интерфейс перетаскивания
Блоки контента	Текст, заголовки, изображения, видео, кнопки, слайдеры
Медиа	Загрузка изображений или использование URL
Кастомизация	Настройка цветов, размеров и позиций блоков
Адаптивность	Автоматическая адаптация под мобильные устройства
Аккаунты	Регистрация и авторизация пользователей
Управление	Сохранение и работа с несколькими сайтами
Технологии
Backend: Django 4.2+

Frontend: HTML, CSS, JavaScript

База данных: SQLite (по умолчанию) / PostgreSQL (в Docker)

Контейнеризация: Docker, Docker Compose

Быстрый старт
Запуск с Docker (Рекомендуется)
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
Использование
Регистрация - Создайте аккаунт на главной странице

Создание сайта - Перейдите в Dashboard → "Создать сайт"

Редактирование

Перетаскивание блоков из панели слева на canvas

Кликните на блок для редактирования содержимого

Изменение размера перетаскиванием углов блока

Настройка параметров в правой панели

Просмотр - Нажмите "Открыть сайт" для просмотра результата

Команды Docker
Команда	Описание
docker-compose up	Запуск проекта
docker-compose up -d	Запуск в фоновом режиме
docker-compose down	Остановка проекта
docker-compose up --build	Пересборка и запуск
docker-compose exec web python manage.py <command>	Выполнение команд Django
docker-compose logs -f web	Просмотр логов
Настройка
Переменные окружения
Для production настройте следующие переменные:

text
SECRET_KEY=your-secret-key-here
DEBUG=False
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
DATABASE_URL=postgres://user:password@host:port/database
Использование PostgreSQL
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
Сервер разработки

bash
python manage.py runserver
Известные проблемы
Проблема	Решение
SQLite в production	Используйте PostgreSQL для production окружения
Параллельные запросы	PostgreSQL решает проблемы с блокировками
