// Функции для управления слайдером
// Делаем функции глобальными для доступа через onclick
window.changeSlide = function(sliderId, direction) {
    const container = document.getElementById(sliderId);
    if (!container) {
        console.warn('Slider container not found:', sliderId);
        return;
    }

    const slides = container.querySelectorAll('.slide');
    if (slides.length === 0) {
        console.warn('No slides found in container:', sliderId);
        return;
    }

    const currentSlide = container.querySelector('.slide.active');
    let currentIndex = Array.from(slides).indexOf(currentSlide);
    
    // Если активного слайда нет, начинаем с первого
    if (currentIndex === -1) {
        currentIndex = 0;
    }

    currentIndex += direction;
    if (currentIndex < 0) currentIndex = slides.length - 1;
    if (currentIndex >= slides.length) currentIndex = 0;

    goToSlide(sliderId, currentIndex);
};

window.goToSlide = function(sliderId, index) {
    const container = document.getElementById(sliderId);
    if (!container) {
        console.warn('Slider container not found:', sliderId);
        return;
    }

    const slides = container.querySelectorAll('.slide');
    const indicators = container.querySelectorAll('.slider-indicator');

    if (slides.length === 0) {
        console.warn('No slides found in container:', sliderId);
        return;
    }

    if (index < 0 || index >= slides.length) {
        console.warn('Invalid slide index:', index, 'for container:', sliderId);
        return;
    }

    // Убираем активный класс
    slides.forEach(slide => slide.classList.remove('active'));
    indicators.forEach(indicator => indicator.classList.remove('active'));

    // Добавляем активный класс
    slides[index].classList.add('active');
    if (indicators[index]) {
        indicators[index].classList.add('active');
    }

    // Сбрасываем автопрокрутку
    if (container.sliderInterval) {
        clearInterval(container.sliderInterval);
        startSlider(container);
    }
};

function startSlider(container) {
    if (!container) return;
    
    // Очищаем предыдущий интервал, если есть
    if (container.sliderInterval) {
        clearInterval(container.sliderInterval);
    }
    
    const autoplay = container.dataset.autoplay === 'true';
    const interval = parseInt(container.dataset.interval) || 3000;

    if (!autoplay) return;

    container.sliderInterval = setInterval(() => {
        const slides = container.querySelectorAll('.slide');
        if (slides.length === 0) {
            clearInterval(container.sliderInterval);
            return;
        }
        
        const currentSlide = container.querySelector('.slide.active');
        let currentIndex = Array.from(slides).indexOf(currentSlide);
        
        // Если активного слайда нет, начинаем с первого
        if (currentIndex === -1) {
            currentIndex = 0;
        }

        currentIndex = (currentIndex + 1) % slides.length;
        goToSlide(container.id, currentIndex);
    }, interval);
}

// Инициализация всех слайдеров
function initSliders() {
    document.querySelectorAll('.slider-container').forEach(container => {
        const slides = container.querySelectorAll('.slide');
        if (slides.length > 0) {
            // Активируем первый слайд
            slides.forEach(slide => slide.classList.remove('active'));
            slides[0].classList.add('active');
            
            const indicators = container.querySelectorAll('.slider-indicator');
            indicators.forEach(indicator => indicator.classList.remove('active'));
            if (indicators[0]) {
                indicators[0].classList.add('active');
            }

            // Запускаем автопрокрутку
            startSlider(container);
        }
    });
}

document.addEventListener('DOMContentLoaded', function () {
    initSliders();
    
    // Применяем адаптивное поведение для .site-canvas
    applyResponsiveBehavior();
    
    // Обновляем при изменении размера окна (с дебаунсом)
    let resizeTimer = null;
    window.addEventListener('resize', function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(applyResponsiveBehavior, 150);
    });
});

// Также инициализируем слайдеры, если DOM уже загружен
if (document.readyState === 'loading') {
    // DOM еще загружается, ждем DOMContentLoaded
} else {
    // DOM уже загружен
    initSliders();
}

function applyResponsiveBehavior() {
    const canvas = document.querySelector('.site-canvas');
    if (!canvas) return;

    const breakpoint = 768; // px
    const width = window.innerWidth || document.documentElement.clientWidth;

    if (width <= breakpoint) {
        const mode = canvas.dataset.responsive || 'stack';
        if (mode === 'scale') {
            makeScale(canvas);
        } else {
            makeStack(canvas);
        }
    } else {
        restoreDesktop(canvas);
    }
}

function makeStack(canvas) {
    canvas.classList.add('stacked');
    canvas.classList.remove('scaled');

    const blocks = Array.from(canvas.querySelectorAll('.block-item'));
    blocks.forEach(b => {
        // Сбрасываем абсолютное позиционирование и даём блоку потоковое положение
        b.style.position = 'relative';
        b.style.left = '';
        b.style.top = '';
        // Ширина 100% для удобства на мобильных
        b.style.width = '100%';
        b.style.height = 'auto';
        b.style.boxSizing = 'border-box';
    });
    // Сбросим трансформации, если были
    canvas.style.transform = '';
    canvas.style.width = '';
}

function makeScale(canvas) {
    canvas.classList.remove('stacked');
    canvas.classList.add('scaled');

    const blocks = Array.from(canvas.querySelectorAll('.block-item'));
    if (blocks.length === 0) return;

    // Рассчитываем габаритную ширину по сохранённым позициям/размерам
    let minLeft = Infinity, maxRight = -Infinity;
    blocks.forEach(b => {
        const rect = b.getBoundingClientRect();
        // Попытка читать inline left/top/width/height при необходимости
        const left = parseFloat(b.style.left) || b.offsetLeft || 0;
        const w = parseFloat(b.style.width) || b.offsetWidth || rect.width;
        minLeft = Math.min(minLeft, left);
        maxRight = Math.max(maxRight, left + w);
    });

    if (!isFinite(minLeft) || !isFinite(maxRight)) return;

    const boundingWidth = Math.max(1, maxRight - minLeft);
    const containerWidth = canvas.parentElement ? canvas.parentElement.clientWidth : window.innerWidth;
    const scale = Math.min(1, containerWidth / boundingWidth);

    // Устанавливаем ширину canvas в исходных пикселях, затем масштабируем
    canvas.style.width = boundingWidth + 'px';
    canvas.style.transformOrigin = 'top left';
    canvas.style.transform = `scale(${scale})`;
}

function restoreDesktop(canvas) {
    canvas.classList.remove('stacked');
    canvas.classList.remove('scaled');
    const blocks = Array.from(canvas.querySelectorAll('.block-item'));
    blocks.forEach(b => {
        // Восстанавливаем абсолютное поведение — inline-стили, установленные шаблоном, должны присутствовать
        b.style.position = 'absolute';
        // не трогаем left/top/width/height тут — это вернёт значения из inline стилей шаблона
        b.style.boxSizing = '';
        b.style.width = b.getAttribute('data-original-width') || b.style.width;
        b.style.height = b.getAttribute('data-original-height') || b.style.height;
    });
    canvas.style.transform = '';
    canvas.style.width = '';
}

