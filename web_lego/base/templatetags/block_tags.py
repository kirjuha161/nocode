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
        styles.append(f"background-color: {block.background_color};")
    if block.text_color:
        styles.append(f"color: {block.text_color};")
    if block.padding:
        styles.append(f"padding: {block.padding};")
    if block.margin:
        styles.append(f"margin: {block.margin};")

    style_attr = " ".join(styles)

    # Рендеринг в зависимости от типа блока
    if block_type == "heading":
        level = data.get("level", "h1")
        content = data.get("content", "Заголовок")
        align = data.get("align", "left")
        return mark_safe(
            f'<{level} style="text-align: {align}; {style_attr}">{content}</{level}>'
        )

    elif block_type == "text":
        content = data.get("content", "Текст блока")
        size = data.get("size", "16px")
        align = data.get("align", "left")
        return mark_safe(
            f'<p style="font-size: {size}; text-align: {align}; {style_attr}">{content}</p>'
        )

    elif block_type == "image":
        # Приоритет: загруженное изображение > URL из данных
        image_url = ""
        if block.image:
            image_url = block.image.url
        else:
            image_url = data.get("url", "")

        alt = data.get("alt", "Изображение")
        width = data.get("width", "100%")
        height = data.get("height", "auto")
        # Если сохранены числовые значения — добавляем px
        if isinstance(width, (int, float)):
            width = f"{width}px"
        if isinstance(height, (int, float)):
            height = f"{height}px"

        if image_url:
            return mark_safe(
                f'<img src="{image_url}" alt="{alt}" style="width: {width}; height: {height}; {style_attr}" />'
            )
        else:
            return mark_safe(
                f'<div style="background: #e5e7eb; min-height: 200px; display: flex; align-items: center; justify-content: center; {style_attr}">🖼️ Изображение</div>'
            )

    elif block_type == "video":
        url = data.get("url", "")
        width = data.get("width", "100%")
        height = data.get("height", "400px")
        if isinstance(width, (int, float)):
            width = f"{width}px"
        if isinstance(height, (int, float)):
            height = f"{height}px"
        autoplay = data.get("autoplay", False)
        if url:
            autoplay_attr = "autoplay" if autoplay else ""
            return mark_safe(
                f'<video src="{url}" width="{width}" height="{height}" controls {autoplay_attr} style="{style_attr}"></video>'
            )
        else:
            return mark_safe(
                f'<div style="background: #e5e7eb; min-height: 200px; display: flex; align-items: center; justify-content: center; {style_attr}">🎥 Видео</div>'
            )

    elif block_type == "button":
        text = data.get("text", "Кнопка")
        link = data.get("link", "#")
        style = data.get("style", "primary")
        align = data.get("align", "left")
        bg_color = data.get("bg_color", "")
        text_color = data.get("text_color", "")
        size = data.get("size", "medium")
        border_radius = data.get("border_radius", "8px")

        # Стили кнопки
        button_styles = {
            "primary": "background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white;",
            "secondary": "background: #e5e7eb; color: #374151;",
            "success": "background: #10b981; color: white;",
            "danger": "background: #ef4444; color: white;",
        }

        # Если задан кастомный цвет, используем его
        if bg_color:
            btn_style = f"background: {bg_color};"
            if text_color:
                btn_style += f" color: {text_color};"
            else:
                btn_style += " color: white;"
        else:
            btn_style = button_styles.get(style, button_styles["primary"])

        # Размеры кнопки
        size_styles = {
            "small": "padding: 0.5rem 1rem; font-size: 0.875rem;",
            "medium": "padding: 0.75rem 1.5rem; font-size: 1rem;",
            "large": "padding: 1rem 2rem; font-size: 1.125rem;",
        }
        size_style = size_styles.get(size, size_styles["medium"])

        return mark_safe(
            f'<div style="text-align: {align}; {style_attr}"><a href="{link}" style="{btn_style} {size_style} border-radius: {border_radius}; text-decoration: none; display: inline-block; font-weight: 600; transition: all 0.3s ease;">{text}</a></div>'
        )

    elif block_type == "slider":
        images = data.get("images", [])
        autoplay = data.get("autoplay", True)
        interval = data.get("interval", 3000)
        width = data.get("width", "100%")
        height = data.get("height", "auto")
        if isinstance(width, (int, float)):
            width = f"{width}px"
        if isinstance(height, (int, float)):
            height = f"{height}px"

        if images:
            # Слайдер с навигацией и индикаторами
            slider_id = f"slider-{block.id}"
            slides = "".join(
                [
                    f'<div class="slide" data-slide-index="{idx}"><img src="{img}" style="width: 100%; height: auto; display: block;" alt="Slide {idx + 1}" /></div>'
                    for idx, img in enumerate(images)
                ]
            )

            # Индикаторы
            indicators = "".join(
                [
                    f'<span class="slider-indicator" data-slide="{idx}" onclick="goToSlide(\'{slider_id}\', {idx})"></span>'
                    for idx in range(len(images))
                ]
            )

            # Кнопки навигации
            nav_buttons = f"""
                <button class="slider-btn slider-prev" onclick="changeSlide(\'{slider_id}\', -1)">‹</button>
                <button class="slider-btn slider-next" onclick="changeSlide(\'{slider_id}\', 1)">›</button>
            """

            # Добавляем размеры к стилям
            size_styles = f"width: {width}; height: {height};"
            full_style = f"{size_styles} {style_attr}" if style_attr else size_styles

            slider_html = f"""
                <div class="slider-container" id="{slider_id}" data-autoplay="{str(autoplay).lower()}" data-interval="{interval}" style="{full_style}">
                    <div class="slider">
                        {slides}
                    </div>
                    <div class="slider-indicators">
                        {indicators}
                    </div>
                    {nav_buttons}
                </div>
            """
            return mark_safe(slider_html)
        else:
            size_styles = f"width: {width}; height: {height};"
            full_style = f"{size_styles} {style_attr}" if style_attr else size_styles
            return mark_safe(
                f'<div style="background: #e5e7eb; min-height: 300px; display: flex; align-items: center; justify-content: center; {full_style}">🎠 Слайдер (добавьте изображения)</div>'
            )

    elif block_type == "section":
        content = data.get("content", "")
        columns = data.get("columns", 1)
        return mark_safe(
            f'<div style="display: grid; grid-template-columns: repeat({columns}, 1fr); gap: 1rem; {style_attr}">{content}</div>'
        )

    else:
        return mark_safe(
            f'<div style="{style_attr}">Неизвестный тип блока: {block_type}</div>'
        )
