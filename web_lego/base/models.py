from django.db import models
from django.contrib.auth.models import User

class Website(models.Model):
    title = models.CharField(max_length=200, verbose_name="Название сайта")
    description = models.TextField(blank=True, verbose_name="Описание")
    owner = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="Владелец")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Создан")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Обновлен")
    
    # Стили и контент
    background_color = models.CharField(max_length=7, default='#ffffff', verbose_name="Цвет фона")
    text_color = models.CharField(max_length=7, default='#000000', verbose_name="Цвет текста")
    header_content = models.TextField(blank=True, verbose_name="Заголовок")
    main_content = models.TextField(blank=True, verbose_name="Основной контент")
    footer_content = models.TextField(blank=True, verbose_name="Футер")
    
    def __str__(self):
        return self.title
    
    class Meta:
        verbose_name = 'Сайт'
        verbose_name_plural = 'Сайты'