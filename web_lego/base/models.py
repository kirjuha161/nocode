from django.db import models
from django.contrib.auth.models import User

# Типы блоков
BLOCK_TYPES = [
    ('text', 'Текст'),
    ('heading', 'Заголовок'),
    ('image', 'Изображение'),
    ('video', 'Видео'),
    ('button', 'Кнопка'),
    ('slider', 'Слайдер'),
    ('section', 'Секция'),
]

class Website(models.Model):
    title = models.CharField(max_length=200, verbose_name="Название сайта", default="Мой сайт")
    description = models.TextField(blank=True, verbose_name="Описание")
    owner = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="Владелец")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Создан")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Обновлен")
    
    # Общие стили
    background_color = models.CharField(max_length=7, default='#ffffff', verbose_name="Цвет фона")
    text_color = models.CharField(max_length=7, default='#000000', verbose_name="Цвет текста")
    font_family = models.CharField(max_length=100, default='Arial, sans-serif', verbose_name="Шрифт")
    
    # Настройки Header
    header_logo = models.ImageField(upload_to='logos/', blank=True, null=True, verbose_name="Логотип")
    header_company_name = models.CharField(max_length=200, blank=True, default='', verbose_name="Название компании")
    header_background_color = models.CharField(max_length=7, default='#ffffff', verbose_name="Цвет фона Header")
    header_text_color = models.CharField(max_length=7, default='#000000', verbose_name="Цвет текста Header")
    header_show = models.BooleanField(default=True, verbose_name="Показывать Header")
    
    # Настройки Footer
    footer_background_color = models.CharField(max_length=7, default='#f3f4f6', verbose_name="Цвет фона Footer")
    footer_text_color = models.CharField(max_length=7, default='#000000', verbose_name="Цвет текста Footer")
    footer_content = models.TextField(blank=True, verbose_name="Содержимое Footer", default='<p>© 2024 Мой сайт</p>')
    footer_show = models.BooleanField(default=True, verbose_name="Показывать Footer")
    
    def __str__(self):
        return self.title
    
    class Meta:
        verbose_name = 'Сайт'
        verbose_name_plural = 'Сайты'


class Block(models.Model):
    """Модель для блоков лендинга с расширяемой архитектурой"""
    website = models.ForeignKey(Website, on_delete=models.CASCADE, related_name='blocks', verbose_name="Сайт")
    block_type = models.CharField(max_length=50, choices=BLOCK_TYPES, verbose_name="Тип блока")
    order = models.IntegerField(default=0, verbose_name="Порядок")
    is_active = models.BooleanField(default=True, verbose_name="Активен")
    
    # Универсальное поле для хранения данных блока в JSON формате
    # Это позволяет легко расширять функциональность без изменения схемы БД
    data = models.JSONField(default=dict, verbose_name="Данные блока")
    
    # Стили блока
    background_color = models.CharField(max_length=7, blank=True, null=True, verbose_name="Цвет фона")
    text_color = models.CharField(max_length=7, blank=True, null=True, verbose_name="Цвет текста")
    padding = models.CharField(max_length=50, default='20px', verbose_name="Отступы")
    margin = models.CharField(max_length=50, default='0', verbose_name="Внешние отступы")
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Создан")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Обновлен")
    
    class Meta:
        ordering = ['order']
        verbose_name = 'Блок'
        verbose_name_plural = 'Блоки'
    
    def __str__(self):
        return f"{self.get_block_type_display()} - {self.website.title}"
    
    def get_data(self):
        """Получить данные блока с дефолтными значениями"""
        defaults = {
            'text': {'content': 'Текст блока', 'size': '16px', 'align': 'left'},
            'heading': {'content': 'Заголовок', 'level': 'h1', 'align': 'left'},
            'image': {'url': '', 'alt': 'Изображение', 'width': '100%', 'height': 'auto'},
            'video': {'url': '', 'width': '100%', 'height': '400px', 'autoplay': False},
            'button': {'text': 'Кнопка', 'link': '#', 'style': 'primary', 'align': 'left'},
            'slider': {'images': [], 'autoplay': True, 'interval': 3000},
            'section': {'content': '', 'columns': 1},
        }
        block_defaults = defaults.get(self.block_type, {})
        data = self.data.copy() if self.data else {}
        return {**block_defaults, **data}