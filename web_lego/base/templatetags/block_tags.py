from django import template
from django.utils.safestring import mark_safe

register = template.Library()

@register.filter
def render_block(block):
    """Рендерит блок в HTML с расширяемой архитектурой"""
    data = block.get_data()
    block_type = block.block_type
    
    # Получаем стили блока
    styles = []
    if block.background_color:
        styles.append(f'background-color: {block.background_color};')
    if block.text_color:
        styles.append(f'color: {block.text_color};')
    if block.padding:
        styles.append(f'padding: {block.padding};')
    if block.margin:
        styles.append(f'margin: {block.margin};')
    
    style_attr = ' '.join(styles)
    
    # Рендеринг в зависимости от типа блока
    if block_type == 'heading':
        level = data.get('level', 'h1')
        content = data.get('content', 'Заголовок')
        align = data.get('align', 'left')
        return mark_safe(f'<{level} style="text-align: {align}; {style_attr}">{content}</{level}>')
    
    elif block_type == 'text':
        content = data.get('content', 'Текст блока')
        size = data.get('size', '16px')
        align = data.get('align', 'left')
        return mark_safe(f'<p style="font-size: {size}; text-align: {align}; {style_attr}">{content}</p>')
    
    elif block_type == 'image':
        url = data.get('url', '')
        alt = data.get('alt', 'Изображение')
        width = data.get('width', '100%')
        height = data.get('height', 'auto')
        if url:
            return mark_safe(f'<img src="{url}" alt="{alt}" style="width: {width}; height: {height}; {style_attr}" />')
        else:
            return mark_safe(f'<div style="background: #e5e7eb; min-height: 200px; display: flex; align-items: center; justify-content: center; {style_attr}">🖼️ Изображение</div>')
    
    elif block_type == 'video':
        url = data.get('url', '')
        width = data.get('width', '100%')
        height = data.get('height', '400px')
        autoplay = data.get('autoplay', False)
        if url:
            autoplay_attr = 'autoplay' if autoplay else ''
            return mark_safe(f'<video src="{url}" width="{width}" height="{height}" controls {autoplay_attr} style="{style_attr}"></video>')
        else:
            return mark_safe(f'<div style="background: #e5e7eb; min-height: 200px; display: flex; align-items: center; justify-content: center; {style_attr}">🎥 Видео</div>')
    
    elif block_type == 'button':
        text = data.get('text', 'Кнопка')
        link = data.get('link', '#')
        style = data.get('style', 'primary')
        align = data.get('align', 'left')
        
        # Стили кнопки
        button_styles = {
            'primary': 'background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white;',
            'secondary': 'background: #e5e7eb; color: #374151;',
            'success': 'background: #10b981; color: white;',
            'danger': 'background: #ef4444; color: white;',
        }
        btn_style = button_styles.get(style, button_styles['primary'])
        
        return mark_safe(f'<div style="text-align: {align}; {style_attr}"><a href="{link}" style="{btn_style} padding: 0.75rem 1.5rem; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: 600;">{text}</a></div>')
    
    elif block_type == 'slider':
        images = data.get('images', [])
        if images:
            # Простой слайдер на HTML/CSS
            slides = ''.join([f'<div class="slide"><img src="{img}" style="width: 100%; height: auto;" /></div>' for img in images])
            return mark_safe(f'<div class="slider" style="{style_attr}">{slides}</div>')
        else:
            return mark_safe(f'<div style="background: #e5e7eb; min-height: 300px; display: flex; align-items: center; justify-content: center; {style_attr}">🎠 Слайдер (добавьте изображения)</div>')
    
    elif block_type == 'section':
        content = data.get('content', '')
        columns = data.get('columns', 1)
        return mark_safe(f'<div style="display: grid; grid-template-columns: repeat({columns}, 1fr); gap: 1rem; {style_attr}">{content}</div>')
    
    else:
        return mark_safe(f'<div style="{style_attr}">Неизвестный тип блока: {block_type}</div>')

