from django.contrib import admin
from .models import Website, Block

@admin.register(Website)
class WebsiteAdmin(admin.ModelAdmin):
    list_display = ('title', 'owner', 'created_at', 'updated_at')
    list_filter = ('created_at', 'owner')
    search_fields = ('title', 'description')
    fieldsets = (
        ('Основная информация', {
            'fields': ('title', 'description', 'owner')
        }),
        ('Общие настройки', {
            'fields': ('background_color', 'text_color', 'font_family')
        }),
        ('Header', {
            'fields': ('header_show', 'header_logo', 'header_company_name', 'header_background_color', 'header_text_color')
        }),
        ('Footer', {
            'fields': ('footer_show', 'footer_content', 'footer_background_color', 'footer_text_color')
        }),
    )

@admin.register(Block)
class BlockAdmin(admin.ModelAdmin):
    list_display = ('id', 'website', 'block_type', 'order', 'is_active', 'created_at')
    list_filter = ('block_type', 'is_active', 'created_at')
    search_fields = ('website__title',)
    ordering = ('website', 'order')