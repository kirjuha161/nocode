// Функции для управления слайдером
function changeSlide(sliderId, direction) {
    const container = document.getElementById(sliderId);
    if (!container) return;
    
    const slides = container.querySelectorAll('.slide');
    if (slides.length === 0) return;
    
    const currentSlide = container.querySelector('.slide.active');
    let currentIndex = Array.from(slides).indexOf(currentSlide);
    
    currentIndex += direction;
    if (currentIndex < 0) currentIndex = slides.length - 1;
    if (currentIndex >= slides.length) currentIndex = 0;
    
    goToSlide(sliderId, currentIndex);
}

function goToSlide(sliderId, index) {
    const container = document.getElementById(sliderId);
    if (!container) return;
    
    const slides = container.querySelectorAll('.slide');
    const indicators = container.querySelectorAll('.slider-indicator');
    
    if (index < 0 || index >= slides.length) return;
    
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
}

function startSlider(container) {
    const autoplay = container.dataset.autoplay === 'true';
    const interval = parseInt(container.dataset.interval) || 3000;
    
    if (!autoplay) return;
    
    container.sliderInterval = setInterval(() => {
        const slides = container.querySelectorAll('.slide');
        const currentSlide = container.querySelector('.slide.active');
        let currentIndex = Array.from(slides).indexOf(currentSlide);
        
        currentIndex = (currentIndex + 1) % slides.length;
        goToSlide(container.id, currentIndex);
    }, interval);
}

// Инициализация всех слайдеров
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.slider-container').forEach(container => {
        const slides = container.querySelectorAll('.slide');
        if (slides.length > 0) {
            // Активируем первый слайд
            slides[0].classList.add('active');
            const indicators = container.querySelectorAll('.slider-indicator');
            if (indicators[0]) {
                indicators[0].classList.add('active');
            }
            
            // Запускаем автопрокрутку
            startSlider(container);
        }
    });
});

