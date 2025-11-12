// Инициализация переменных
const websiteId = document.body.dataset.websiteId ? parseInt(document.body.dataset.websiteId) : null;
let selectedBlock = null;
let draggedBlock = null;
let draggedElement = null;
let dragOverElement = null;

// Drag & Drop для новых блоков из панели
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.block-type-btn').forEach(btn => {
        btn.addEventListener('dragstart', (e) => {
            draggedBlock = e.target.dataset.type;
            e.dataTransfer.effectAllowed = 'copy';
        });
    });

    const editorCanvas = document.getElementById('editor-canvas');
    const dropZone = document.getElementById('drop-zone');

    // Обработка перетаскивания существующих блоков
    document.querySelectorAll('.block-item').forEach(item => {
        item.addEventListener('dragstart', (e) => {
            draggedElement = item;
            item.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', item.outerHTML);
        });

        item.addEventListener('dragend', () => {
            item.classList.remove('dragging');
            document.querySelectorAll('.block-item').forEach(b => b.classList.remove('drag-over'));
        });

        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            if (item !== draggedElement) {
                item.classList.add('drag-over');
            }
        });

        item.addEventListener('dragleave', () => {
            item.classList.remove('drag-over');
        });

        item.addEventListener('drop', async (e) => {
            e.preventDefault();
            item.classList.remove('drag-over');
            
            if (draggedElement && draggedElement !== item) {
                // Перемещение существующего блока
                const allBlocks = Array.from(document.querySelectorAll('.block-item'));
                const draggedIndex = allBlocks.indexOf(draggedElement);
                const targetIndex = allBlocks.indexOf(item);
                
                if (draggedIndex < targetIndex) {
                    item.parentNode.insertBefore(draggedElement, item.nextSibling);
                } else {
                    item.parentNode.insertBefore(draggedElement, item);
                }
                
                await reorderBlocks();
            }
        });
    });

    if (editorCanvas) {
        editorCanvas.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (draggedBlock) {
                e.dataTransfer.dropEffect = 'copy';
            } else {
                e.dataTransfer.dropEffect = 'move';
            }
        });

        editorCanvas.addEventListener('drop', async (e) => {
            e.preventDefault();
            if (draggedBlock) {
                await createBlock(draggedBlock);
                draggedBlock = null;
            }
        });
    }

    // Выбор блока
    document.querySelectorAll('.block-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.target.closest('.block-controls')) return;
            if (e.target.closest('.block-resize-handle')) return;
            
            document.querySelectorAll('.block-item').forEach(b => b.classList.remove('selected'));
            item.classList.add('selected');
            selectedBlock = item.dataset.blockId;
            
            // Инициализируем обработчики изменения размера для блоков изображения и слайдера
            if (item.dataset.blockType === 'image' || item.dataset.blockType === 'slider') {
                initBlockResizeHandles(item);
            }
        });
    });

    // Инициализация для существующих блоков изображения и слайдера при загрузке
    document.querySelectorAll('.block-item[data-block-type="image"], .block-item[data-block-type="slider"]').forEach(item => {
        if (item.classList.contains('selected')) {
            initBlockResizeHandles(item);
        }
    });

    // Инициализация всех слайдеров в редакторе
    document.querySelectorAll('.block-content .slider-container').forEach(container => {
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

    // Закрытие модального окна при клике вне его
    const editModal = document.getElementById('edit-modal');
    if (editModal) {
        editModal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeEditModal();
            }
        });
    }
});

// Создание блока
async function createBlock(blockType) {
    if (!websiteId) {
        alert('Ошибка: ID сайта не найден');
        return;
    }
    
    try {
        const response = await fetch(`/api/websites/${websiteId}/blocks/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({
                block_type: blockType,
                data: {}
            })
        });

        const result = await response.json();
        if (result.success) {
            location.reload();
        }
    } catch (error) {
        console.error('Ошибка создания блока:', error);
        alert('Ошибка создания блока: ' + error.message);
    }
}

// Переупорядочивание блоков
async function reorderBlocks() {
    if (!websiteId) return;
    
    const blocks = Array.from(document.querySelectorAll('.block-item'));
    const blockOrders = blocks.map((block, index) => ({
        id: parseInt(block.dataset.blockId),
        order: index
    }));

    try {
        const response = await fetch(`/api/websites/${websiteId}/blocks/reorder/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({ blocks: blockOrders })
        });

        const result = await response.json();
        if (!result.success) {
            console.error('Ошибка переупорядочивания:', result.error);
        }
    } catch (error) {
        console.error('Ошибка переупорядочивания:', error);
    }
}

// Удаление блока
async function deleteBlock(blockId) {
    if (!confirm('Удалить этот блок?')) return;

    try {
        const response = await fetch(`/api/blocks/${blockId}/delete/`, {
            method: 'DELETE',
            headers: {
                'X-CSRFToken': getCookie('csrftoken')
            }
        });

        const result = await response.json();
        if (result.success) {
            const blockElement = document.querySelector(`[data-block-id="${blockId}"]`);
            if (blockElement) {
                blockElement.remove();
            }
        } else {
            alert('Ошибка удаления блока');
        }
    } catch (error) {
        console.error('Ошибка удаления блока:', error);
        alert('Ошибка удаления блока: ' + error.message);
    }
}

// Редактирование блока
function editBlock(blockId) {
    const blockElement = document.querySelector(`[data-block-id="${blockId}"]`);
    if (!blockElement) return;
    
    blockElement.classList.add('selected');
    selectedBlock = blockId;
    
    // Открываем модальное окно для редактирования
    const blockType = blockElement.dataset.blockType;
    openEditModal(blockId, blockType);
}

// Модальное окно для редактирования блока
function openEditModal(blockId, blockType) {
    const modal = document.getElementById('edit-modal');
    const modalBody = document.getElementById('edit-modal-body');
    
    if (!modal || !modalBody) return;
    
    if (blockType === 'text') {
        // Получаем информацию о блоке текста
        fetch(`/api/blocks/${blockId}/`, {
            method: 'GET',
            headers: {
                'X-CSRFToken': getCookie('csrftoken')
            }
        })
        .then(response => response.json())
        .then(data => {
            const textData = data.block?.data || {};
            const content = textData.content || 'Текст блока';
            const size = textData.size || '16px';
            const align = textData.align || 'left';
            
            modalBody.innerHTML = `
                <h3 style="color: #7c3aed; margin-bottom: 1.5rem;">📄 Редактировать текст</h3>
                <form id="text-edit-form">
                    <div class="form-group">
                        <label class="form-label">Текст</label>
                        <textarea id="text-content-input" class="form-input" rows="4" placeholder="Введите текст">${content}</textarea>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Размер шрифта</label>
                        <input type="text" id="text-size-input" class="form-input" placeholder="16px" value="${size}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Выравнивание</label>
                        <select id="text-align-input" class="form-input">
                            <option value="left" ${align === 'left' ? 'selected' : ''}>Слева</option>
                            <option value="center" ${align === 'center' ? 'selected' : ''}>По центру</option>
                            <option value="right" ${align === 'right' ? 'selected' : ''}>Справа</option>
                            <option value="justify" ${align === 'justify' ? 'selected' : ''}>По ширине</option>
                        </select>
                    </div>
                    <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
                        <button type="button" class="btn" onclick="saveTextBlock(${blockId})">💾 Сохранить</button>
                        <button type="button" class="btn btn-secondary" onclick="closeEditModal()">Отмена</button>
                    </div>
                </form>
            `;
            
            modal.classList.add('active');
        })
        .catch(error => {
            console.error('Ошибка загрузки данных блока:', error);
            alert('Ошибка загрузки данных блока');
        });
    } else if (blockType === 'heading') {
        // Получаем информацию о блоке заголовка
        fetch(`/api/blocks/${blockId}/`, {
            method: 'GET',
            headers: {
                'X-CSRFToken': getCookie('csrftoken')
            }
        })
        .then(response => response.json())
        .then(data => {
            const headingData = data.block?.data || {};
            const content = headingData.content || 'Заголовок';
            const level = headingData.level || 'h1';
            const align = headingData.align || 'left';
            
            modalBody.innerHTML = `
                <h3 style="color: #7c3aed; margin-bottom: 1.5rem;">📝 Редактировать заголовок</h3>
                <form id="heading-edit-form">
                    <div class="form-group">
                        <label class="form-label">Текст заголовка</label>
                        <input type="text" id="heading-content-input" class="form-input" placeholder="Заголовок" value="${content}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Уровень заголовка</label>
                        <select id="heading-level-input" class="form-input">
                            <option value="h1" ${level === 'h1' ? 'selected' : ''}>H1 - Самый большой</option>
                            <option value="h2" ${level === 'h2' ? 'selected' : ''}>H2</option>
                            <option value="h3" ${level === 'h3' ? 'selected' : ''}>H3</option>
                            <option value="h4" ${level === 'h4' ? 'selected' : ''}>H4</option>
                            <option value="h5" ${level === 'h5' ? 'selected' : ''}>H5</option>
                            <option value="h6" ${level === 'h6' ? 'selected' : ''}>H6 - Самый маленький</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Выравнивание</label>
                        <select id="heading-align-input" class="form-input">
                            <option value="left" ${align === 'left' ? 'selected' : ''}>Слева</option>
                            <option value="center" ${align === 'center' ? 'selected' : ''}>По центру</option>
                            <option value="right" ${align === 'right' ? 'selected' : ''}>Справа</option>
                        </select>
                    </div>
                    <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
                        <button type="button" class="btn" onclick="saveHeadingBlock(${blockId})">💾 Сохранить</button>
                        <button type="button" class="btn btn-secondary" onclick="closeEditModal()">Отмена</button>
                    </div>
                </form>
            `;
            
            modal.classList.add('active');
        })
        .catch(error => {
            console.error('Ошибка загрузки данных блока:', error);
            alert('Ошибка загрузки данных блока');
        });
    } else if (blockType === 'image') {
        // Получаем информацию о блоке
        fetch(`/api/blocks/${blockId}/`, {
            method: 'GET',
            headers: {
                'X-CSRFToken': getCookie('csrftoken')
            }
        })
        .then(response => response.json())
        .then(data => {
            const currentImageUrl = data.block?.image_url || '';
            modalBody.innerHTML = `
                <h3 style="color: #7c3aed; margin-bottom: 1.5rem;">🖼️ Редактировать изображение</h3>
                <form id="image-edit-form" enctype="multipart/form-data">
                    <div class="form-group">
                        <label class="form-label">Загрузить изображение</label>
                        <div class="file-input-wrapper">
                            <label for="image-file-input" class="file-input-label">
                                📁 Выбрать файл
                            </label>
                            <input type="file" id="image-file-input" name="image" accept="image/*" class="form-input" style="display: none;">
                        </div>
                        <p style="font-size: 0.75rem; color: #6b7280; margin-top: 0.5rem; text-align: center;">
                            💡 Перетащите за края изображения для изменения размера
                        </p>
                        <div id="image-preview-wrapper" style="display: ${currentImageUrl ? 'block' : 'none'}; text-align: center;">
                            ${currentImageUrl ? `
                                <div class="image-preview-container" id="current-image-container">
                                    <img src="${currentImageUrl}" alt="Текущее изображение" class="image-preview" id="current-image-preview">
                                    <div class="resize-handle se" data-handle="se"></div>
                                    <div class="resize-handle sw" data-handle="sw"></div>
                                    <div class="resize-handle ne" data-handle="ne"></div>
                                    <div class="resize-handle nw" data-handle="nw"></div>
                                    <div class="resize-handle e" data-handle="e"></div>
                                    <div class="resize-handle w" data-handle="w"></div>
                                    <div class="resize-handle n" data-handle="n"></div>
                                    <div class="resize-handle s" data-handle="s"></div>
                                </div>
                            ` : ''}
                            <div class="image-preview-container" id="image-preview-container" style="display: none;">
                                <img id="image-preview" class="image-preview">
                                <div class="resize-handle se" data-handle="se"></div>
                                <div class="resize-handle sw" data-handle="sw"></div>
                                <div class="resize-handle ne" data-handle="ne"></div>
                                <div class="resize-handle nw" data-handle="nw"></div>
                                <div class="resize-handle e" data-handle="e"></div>
                                <div class="resize-handle w" data-handle="w"></div>
                                <div class="resize-handle n" data-handle="n"></div>
                                <div class="resize-handle s" data-handle="s"></div>
                            </div>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Или введите URL изображения</label>
                        <input type="text" id="image-url-input" class="form-input" placeholder="https://example.com/image.jpg" value="${data.block?.data?.url || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Альтернативный текст (alt)</label>
                        <input type="text" id="image-alt-input" class="form-input" placeholder="Описание изображения" value="${data.block?.data?.alt || 'Изображение'}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Размер изображения</label>
                        <div class="size-controls">
                            <div class="size-input-group">
                                <input type="text" id="image-width-input" class="size-input" placeholder="Ширина" value="${data.block?.data?.width || '100%'}">
                                <input type="text" id="image-height-input" class="size-input" placeholder="Высота" value="${data.block?.data?.height || 'auto'}">
                            </div>
                            <button type="button" class="size-btn" onclick="increaseImageSize()" title="Увеличить">➕</button>
                            <button type="button" class="size-btn" onclick="decreaseImageSize()" title="Уменьшить">➖</button>
                        </div>
                        <div class="size-preset-btns">
                            <button type="button" class="size-preset-btn" onclick="setImageSize('100%', 'auto')">100%</button>
                            <button type="button" class="size-preset-btn" onclick="setImageSize('50%', 'auto')">50%</button>
                            <button type="button" class="size-preset-btn" onclick="setImageSize('25%', 'auto')">25%</button>
                            <button type="button" class="size-preset-btn" onclick="setImageSize('800px', 'auto')">800px</button>
                            <button type="button" class="size-preset-btn" onclick="setImageSize('400px', '400px')">400x400</button>
                            <button type="button" class="size-preset-btn" onclick="setImageSize('200px', '200px')">200x200</button>
                        </div>
                    </div>
                    <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
                        <button type="button" class="btn" onclick="saveImageBlock(${blockId})">💾 Сохранить</button>
                        <button type="button" class="btn btn-secondary" onclick="closeEditModal()">Отмена</button>
                    </div>
                </form>
            `;
            
            // Предпросмотр загружаемого изображения
            const fileInput = document.getElementById('image-file-input');
            const preview = document.getElementById('image-preview');
            const currentPreview = document.getElementById('current-image-preview');
            const widthInput = document.getElementById('image-width-input');
            const heightInput = document.getElementById('image-height-input');
            
            const currentContainer = document.getElementById('current-image-container');
            const previewContainer = document.getElementById('image-preview-container');
            
            // Функция для обновления предпросмотра размера
            function updatePreviewSize() {
                const width = widthInput.value || '100%';
                const height = heightInput.value || 'auto';
                
                // Парсим значение для применения
                let widthValue = width;
                let heightValue = height;
                
                // Если это процент, применяем как есть, иначе конвертируем в px
                if (width && !width.includes('%') && !width.includes('px')) {
                    widthValue = width + 'px';
                }
                if (height && height !== 'auto' && !height.includes('%') && !height.includes('px')) {
                    heightValue = height + 'px';
                }
                
                if (preview && previewContainer && previewContainer.style.display !== 'none') {
                    preview.style.width = widthValue;
                    preview.style.height = heightValue;
                    previewContainer.style.width = widthValue;
                }
                if (currentPreview && currentContainer && currentContainer.style.display !== 'none') {
                    currentPreview.style.width = widthValue;
                    currentPreview.style.height = heightValue;
                    currentContainer.style.width = widthValue;
                }
            }
            
            // Функция для обновления полей ввода из размера контейнера
            function updateSizeInputs(container) {
                if (!container) return;
                const computedStyle = window.getComputedStyle(container);
                const width = computedStyle.width;
                const height = computedStyle.height;
                
                if (widthInput) {
                    widthInput.value = width;
                }
                if (heightInput && height !== 'auto') {
                    heightInput.value = height;
                }
            }
            
            // Инициализация размера для текущего изображения
            if (currentContainer) {
                // Устанавливаем начальный размер на основе данных блока
                const initialWidth = widthInput.value || '100%';
                const initialHeight = heightInput.value || 'auto';
                
                const currentImg = currentContainer.querySelector('.image-preview');
                if (currentImg) {
                    // Если размер в процентах, оставляем как есть, иначе применяем
                    if (initialWidth && !initialWidth.includes('%')) {
                        const widthPx = initialWidth.includes('px') ? initialWidth : initialWidth + 'px';
                        currentImg.style.width = widthPx;
                        currentContainer.style.width = widthPx;
                    } else {
                        currentImg.style.width = initialWidth;
                        currentContainer.style.width = initialWidth;
                    }
                    
                    if (initialHeight && initialHeight !== 'auto') {
                        const heightPx = initialHeight.includes('px') ? initialHeight : initialHeight + 'px';
                        currentImg.style.height = heightPx;
                    } else {
                        currentImg.style.height = initialHeight;
                    }
                }
                updatePreviewSize();
            }
            
            // Обновление размера при изменении полей
            if (widthInput) {
                widthInput.addEventListener('input', updatePreviewSize);
            }
            if (heightInput) {
                heightInput.addEventListener('input', updatePreviewSize);
            }
            
            if (fileInput) {
                fileInput.addEventListener('change', function(e) {
                    const file = e.target.files[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = function(e) {
                            if (preview) preview.src = e.target.result;
                            if (previewContainer) previewContainer.style.display = 'block';
                            const wrapper = document.getElementById('image-preview-wrapper');
                            if (wrapper) wrapper.style.display = 'block';
                            if (currentContainer) {
                                currentContainer.style.display = 'none';
                            }
                            updatePreviewSize();
                            initResizeHandles(previewContainer);
                        };
                        reader.readAsDataURL(file);
                    }
                });
            }
            
            // Инициализация обработчиков изменения размера
            function initResizeHandles(container) {
                if (!container) return;
                
                const handles = container.querySelectorAll('.resize-handle');
                let isResizing = false;
                let startX, startY, startWidth, startHeight;
                
                handles.forEach(handle => {
                    handle.addEventListener('mousedown', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        isResizing = true;
                        startX = e.clientX;
                        startY = e.clientY;
                        
                        const img = container.querySelector('.image-preview');
                        if (img) {
                            startWidth = img.offsetWidth;
                            startHeight = img.offsetHeight;
                        }
                        
                        const handleType = handle.dataset.handle;
                        
                        document.addEventListener('mousemove', handleMouseMove);
                        document.addEventListener('mouseup', handleMouseUp);
                        
                        function handleMouseMove(e) {
                            if (!isResizing) return;
                            
                            const deltaX = e.clientX - startX;
                            const deltaY = e.clientY - startY;
                            
                            let newWidth = startWidth;
                            let newHeight = startHeight;
                            
                            // Определяем направление изменения размера
                            if (handleType.includes('e')) {
                                newWidth = startWidth + deltaX;
                            }
                            if (handleType.includes('w')) {
                                newWidth = startWidth - deltaX;
                            }
                            if (handleType.includes('s')) {
                                newHeight = startHeight + deltaY;
                            }
                            if (handleType.includes('n')) {
                                newHeight = startHeight - deltaY;
                            }
                            
                            // Ограничения минимального размера
                            newWidth = Math.max(50, newWidth);
                            newHeight = Math.max(50, newHeight);
                            
                            // Применяем размеры
                            const img = container.querySelector('.image-preview');
                            if (img) {
                                img.style.width = newWidth + 'px';
                                img.style.height = newHeight + 'px';
                                container.style.width = newWidth + 'px';
                            }
                            
                            // Обновляем поля ввода
                            if (widthInput) {
                                widthInput.value = newWidth + 'px';
                            }
                            if (heightInput) {
                                heightInput.value = newHeight + 'px';
                            }
                        }
                        
                        function handleMouseUp() {
                            isResizing = false;
                            document.removeEventListener('mousemove', handleMouseMove);
                            document.removeEventListener('mouseup', handleMouseUp);
                        }
                    });
                });
            }
            
            // Инициализация для текущего изображения
            if (currentContainer) {
                initResizeHandles(currentContainer);
            }
        })
        .catch(error => {
            console.error('Ошибка загрузки данных блока:', error);
            alert('Ошибка загрузки данных блока');
        });
        
        modal.classList.add('active');
    } else if (blockType === 'slider') {
        // Получаем информацию о блоке слайдера
        fetch(`/api/blocks/${blockId}/`, {
            method: 'GET',
            headers: {
                'X-CSRFToken': getCookie('csrftoken')
            }
        })
        .then(response => response.json())
        .then(data => {
            const images = data.block?.data?.images || [];
            const autoplay = data.block?.data?.autoplay !== false;
            const interval = data.block?.data?.interval || 3000;
            
            // Инициализируем массив изображений
            sliderImages = [...images];
            
            const imagesList = images.map((img, idx) => `
                <div class="slider-image-item" data-index="${idx}">
                    <img src="${img}" alt="Slide ${idx + 1}" style="max-width: 150px; max-height: 100px; object-fit: cover; border-radius: 8px;">
                    <div class="slider-image-controls">
                        <button type="button" class="slider-remove-btn" onclick="removeSliderImage(${idx})" title="Удалить">🗑️</button>
                    </div>
                </div>
            `).join('');
            
            modalBody.innerHTML = `
                <h3 style="color: #7c3aed; margin-bottom: 1.5rem;">🎠 Редактировать слайдер</h3>
                <form id="slider-edit-form" enctype="multipart/form-data">
                    <div class="form-group">
                        <label class="form-label">Добавить изображение</label>
                        <div class="file-input-wrapper">
                            <label for="slider-file-input" class="file-input-label">
                                📁 Выбрать файл
                            </label>
                            <input type="file" id="slider-file-input" name="image" accept="image/*" class="form-input" style="display: none;" multiple>
                        </div>
                        <div class="form-group" style="margin-top: 1rem;">
                            <label class="form-label">Или введите URL изображения</label>
                            <div style="display: flex; gap: 0.5rem;">
                                <input type="text" id="slider-url-input" class="form-input" placeholder="https://example.com/image.jpg">
                                <button type="button" class="btn" onclick="addSliderImageFromUrl()" style="width: auto; margin: 0;">Добавить</button>
                            </div>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Изображения в слайдере (${images.length})</label>
                        <div id="slider-images-list" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 1rem; margin-top: 1rem; min-height: 100px;">
                            ${imagesList || '<p style="color: #6b7280; text-align: center; grid-column: 1/-1;">Нет изображений</p>'}
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">
                            <input type="checkbox" id="slider-autoplay" ${autoplay ? 'checked' : ''}>
                            Автопрокрутка
                        </label>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Интервал автопрокрутки (мс)</label>
                        <input type="number" id="slider-interval" class="form-input" value="${interval}" min="1000" step="500">
                    </div>
                    <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
                        <button type="button" class="btn" onclick="saveSliderBlock(${blockId})">💾 Сохранить</button>
                        <button type="button" class="btn btn-secondary" onclick="closeEditModal()">Отмена</button>
                    </div>
                </form>
            `;
            
            // Обработка загрузки файлов
            const fileInput = document.getElementById('slider-file-input');
            if (fileInput) {
                fileInput.addEventListener('change', function(e) {
                    const files = Array.from(e.target.files);
                    files.forEach(file => {
                        const reader = new FileReader();
                        reader.onload = function(e) {
                            addSliderImageToList(e.target.result);
                        };
                        reader.readAsDataURL(file);
                    });
                });
            }
            
            modal.classList.add('active');
        })
        .catch(error => {
            console.error('Ошибка загрузки данных блока:', error);
            alert('Ошибка загрузки данных блока');
        });
    } else if (blockType === 'button') {
        // Получаем информацию о блоке кнопки
        fetch(`/api/blocks/${blockId}/`, {
            method: 'GET',
            headers: {
                'X-CSRFToken': getCookie('csrftoken')
            }
        })
        .then(response => response.json())
        .then(data => {
            const buttonData = data.block?.data || {};
            const text = buttonData.text || 'Кнопка';
            const link = buttonData.link || '#';
            const style = buttonData.style || 'primary';
            const align = buttonData.align || 'left';
            const bgColor = buttonData.bg_color || '';
            const textColor = buttonData.text_color || '';
            const size = buttonData.size || 'medium';
            const borderRadius = buttonData.border_radius || '8px';
            
            modalBody.innerHTML = `
                <h3 style="color: #7c3aed; margin-bottom: 1.5rem;">🔘 Редактировать кнопку</h3>
                <form id="button-edit-form">
                    <div class="form-group">
                        <label class="form-label">Текст кнопки</label>
                        <input type="text" id="button-text-input" class="form-input" placeholder="Текст кнопки" value="${text}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Ссылка</label>
                        <input type="text" id="button-link-input" class="form-input" placeholder="https://example.com или #" value="${link}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Выравнивание</label>
                        <select id="button-align-input" class="form-input">
                            <option value="left" ${align === 'left' ? 'selected' : ''}>Слева</option>
                            <option value="center" ${align === 'center' ? 'selected' : ''}>По центру</option>
                            <option value="right" ${align === 'right' ? 'selected' : ''}>Справа</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Размер</label>
                        <select id="button-size-input" class="form-input">
                            <option value="small" ${size === 'small' ? 'selected' : ''}>Маленький</option>
                            <option value="medium" ${size === 'medium' ? 'selected' : ''}>Средний</option>
                            <option value="large" ${size === 'large' ? 'selected' : ''}>Большой</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Стиль (если не используется кастомный цвет)</label>
                        <select id="button-style-input" class="form-input">
                            <option value="primary" ${style === 'primary' ? 'selected' : ''}>Основной (фиолетовый)</option>
                            <option value="secondary" ${style === 'secondary' ? 'selected' : ''}>Вторичный (серый)</option>
                            <option value="success" ${style === 'success' ? 'selected' : ''}>Успех (зеленый)</option>
                            <option value="danger" ${style === 'danger' ? 'selected' : ''}>Опасность (красный)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Цвет фона (кастомный)</label>
                        <div class="color-input">
                            <input type="color" id="button-bg-color-input" value="${bgColor || '#8b5cf6'}">
                            <input type="text" id="button-bg-color-text" class="form-input" placeholder="#8b5cf6" value="${bgColor}">
                        </div>
                        <p style="font-size: 0.75rem; color: #6b7280; margin-top: 0.5rem;">Оставьте пустым для использования стиля выше</p>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Цвет текста</label>
                        <div class="color-input">
                            <input type="color" id="button-text-color-input" value="${textColor || '#ffffff'}">
                            <input type="text" id="button-text-color-text" class="form-input" placeholder="#ffffff" value="${textColor}">
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Скругление углов</label>
                        <input type="text" id="button-border-radius-input" class="form-input" placeholder="8px" value="${borderRadius}">
                    </div>
                    <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
                        <button type="button" class="btn" onclick="saveButtonBlock(${blockId})">💾 Сохранить</button>
                        <button type="button" class="btn btn-secondary" onclick="closeEditModal()">Отмена</button>
                    </div>
                </form>
            `;
            
            // Синхронизация color picker с текстовым полем
            const bgColorInput = document.getElementById('button-bg-color-input');
            const bgColorText = document.getElementById('button-bg-color-text');
            const textColorInput = document.getElementById('button-text-color-input');
            const textColorText = document.getElementById('button-text-color-text');
            
            if (bgColorInput && bgColorText) {
                bgColorInput.addEventListener('input', (e) => {
                    bgColorText.value = e.target.value;
                });
                bgColorText.addEventListener('input', (e) => {
                    if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
                        bgColorInput.value = e.target.value;
                    }
                });
            }
            
            if (textColorInput && textColorText) {
                textColorInput.addEventListener('input', (e) => {
                    textColorText.value = e.target.value;
                });
                textColorText.addEventListener('input', (e) => {
                    if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
                        textColorInput.value = e.target.value;
                    }
                });
            }
            
            modal.classList.add('active');
        })
        .catch(error => {
            console.error('Ошибка загрузки данных блока:', error);
            alert('Ошибка загрузки данных блока');
        });
    } else if (blockType === 'video') {
        // Получаем информацию о блоке видео
        fetch(`/api/blocks/${blockId}/`, {
            method: 'GET',
            headers: {
                'X-CSRFToken': getCookie('csrftoken')
            }
        })
        .then(response => response.json())
        .then(data => {
            const videoData = data.block?.data || {};
            const url = videoData.url || '';
            const width = videoData.width || '100%';
            const height = videoData.height || '400px';
            const autoplay = videoData.autoplay || false;
            
            modalBody.innerHTML = `
                <h3 style="color: #7c3aed; margin-bottom: 1.5rem;">🎥 Редактировать видео</h3>
                <form id="video-edit-form">
                    <div class="form-group">
                        <label class="form-label">URL видео</label>
                        <input type="text" id="video-url-input" class="form-input" placeholder="https://example.com/video.mp4" value="${url}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Ширина</label>
                        <input type="text" id="video-width-input" class="form-input" placeholder="100%" value="${width}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Высота</label>
                        <input type="text" id="video-height-input" class="form-input" placeholder="400px" value="${height}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">
                            <input type="checkbox" id="video-autoplay-input" ${autoplay ? 'checked' : ''}>
                            Автовоспроизведение
                        </label>
                    </div>
                    <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
                        <button type="button" class="btn" onclick="saveVideoBlock(${blockId})">💾 Сохранить</button>
                        <button type="button" class="btn btn-secondary" onclick="closeEditModal()">Отмена</button>
                    </div>
                </form>
            `;
            
            modal.classList.add('active');
        })
        .catch(error => {
            console.error('Ошибка загрузки данных блока:', error);
            alert('Ошибка загрузки данных блока');
        });
    } else {
        alert('Редактирование этого типа блока будет доступно в следующей версии');
    }
}

// Функции для работы со слайдером
let sliderImages = [];

function addSliderImageToList(imageUrl) {
    if (!sliderImages) sliderImages = [];
    sliderImages.push(imageUrl);
    updateSliderImagesList();
}

function removeSliderImage(index) {
    if (!sliderImages) return;
    sliderImages.splice(index, 1);
    updateSliderImagesList();
}

function updateSliderImagesList() {
    const list = document.getElementById('slider-images-list');
    if (!list) return;
    
    if (!sliderImages || sliderImages.length === 0) {
        list.innerHTML = '<p style="color: #6b7280; text-align: center; grid-column: 1/-1;">Нет изображений</p>';
        return;
    }
    
    list.innerHTML = sliderImages.map((img, idx) => `
        <div class="slider-image-item" data-index="${idx}">
            <img src="${img}" alt="Slide ${idx + 1}" style="max-width: 150px; max-height: 100px; object-fit: cover; border-radius: 8px;">
            <div class="slider-image-controls">
                <button type="button" class="slider-remove-btn" onclick="removeSliderImage(${idx})" title="Удалить">🗑️</button>
            </div>
        </div>
    `).join('');
}

function addSliderImageFromUrl() {
    const urlInput = document.getElementById('slider-url-input');
    if (urlInput && urlInput.value.trim()) {
        addSliderImageToList(urlInput.value.trim());
        urlInput.value = '';
    }
}

async function saveSliderBlock(blockId) {
    const autoplayEl = document.getElementById('slider-autoplay');
    const intervalEl = document.getElementById('slider-interval');
    
    if (!autoplayEl || !intervalEl) {
        alert('Ошибка: элементы формы не найдены');
        return;
    }
    
    const autoplay = autoplayEl.checked;
    const interval = parseInt(intervalEl.value) || 3000;
    
    if (!sliderImages) sliderImages = [];
    
    await updateBlockData(blockId, {
        images: sliderImages,
        autoplay: autoplay,
        interval: interval
    });
    closeEditModal();
}

function closeEditModal() {
    const modal = document.getElementById('edit-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Функции для управления размером изображения
function setImageSize(width, height) {
    const widthInput = document.getElementById('image-width-input');
    const heightInput = document.getElementById('image-height-input');
    if (widthInput) {
        widthInput.value = width;
        widthInput.dispatchEvent(new Event('input'));
    }
    if (heightInput) {
        heightInput.value = height;
        heightInput.dispatchEvent(new Event('input'));
    }
}

function increaseImageSize() {
    const widthInput = document.getElementById('image-width-input');
    const heightInput = document.getElementById('image-height-input');
    
    if (widthInput) {
        const currentWidth = widthInput.value;
        const newWidth = adjustSize(currentWidth, true);
        widthInput.value = newWidth;
        // Триггерим событие input для обновления предпросмотра
        widthInput.dispatchEvent(new Event('input'));
    }
    
    if (heightInput && heightInput.value !== 'auto') {
        const currentHeight = heightInput.value;
        const newHeight = adjustSize(currentHeight, true);
        heightInput.value = newHeight;
        // Триггерим событие input для обновления предпросмотра
        heightInput.dispatchEvent(new Event('input'));
    }
}

function decreaseImageSize() {
    const widthInput = document.getElementById('image-width-input');
    const heightInput = document.getElementById('image-height-input');
    
    if (widthInput) {
        const currentWidth = widthInput.value;
        const newWidth = adjustSize(currentWidth, false);
        widthInput.value = newWidth;
        // Триггерим событие input для обновления предпросмотра
        widthInput.dispatchEvent(new Event('input'));
    }
    
    if (heightInput && heightInput.value !== 'auto') {
        const currentHeight = heightInput.value;
        const newHeight = adjustSize(currentHeight, false);
        heightInput.value = newHeight;
        // Триггерим событие input для обновления предпросмотра
        heightInput.dispatchEvent(new Event('input'));
    }
}

function adjustSize(value, increase) {
    if (!value || value === 'auto') {
        return increase ? '150px' : '100px';
    }
    
    // Парсим значение (может быть в px, %, или просто число)
    const match = value.match(/^(\d+\.?\d*)(px|%|em|rem)?$/);
    if (match) {
        let num = parseFloat(match[1]);
        const unit = match[2] || 'px';
        
        // Для процентов изменяем на 10%, для пикселей на 50px
        const step = unit === '%' ? 10 : 50;
        
        if (increase) {
            num = Math.min(num + step, unit === '%' ? 100 : 2000);
        } else {
            num = Math.max(num - step, unit === '%' ? 10 : 50);
        }
        
        // Убираем десятичные знаки, если они не нужны
        num = num % 1 === 0 ? Math.floor(num) : Math.round(num * 10) / 10;
        
        return num + unit;
    }
    // Если не удалось распарсить, возвращаем значение по умолчанию
    return increase ? '150px' : '100px';
}

// Сохранение блока изображения
async function saveImageBlock(blockId) {
    const fileInput = document.getElementById('image-file-input');
    const urlInput = document.getElementById('image-url-input');
    const altInput = document.getElementById('image-alt-input');
    const widthInput = document.getElementById('image-width-input');
    const heightInput = document.getElementById('image-height-input');
    
    // Если выбрано изображение для загрузки
    if (fileInput && fileInput.files.length > 0) {
        const formData = new FormData();
        formData.append('image', fileInput.files[0]);
        
        try {
            const response = await fetch(`/api/blocks/${blockId}/upload-image/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': getCookie('csrftoken')
                },
                body: formData
            });
            
            const result = await response.json();
            if (result.success) {
                // Обновляем данные блока (alt, url, width, height)
                await updateBlockData(blockId, {
                    alt: altInput.value,
                    url: result.image_url,
                    width: widthInput.value || '100%',
                    height: heightInput.value || 'auto'
                });
                closeEditModal();
            } else {
                alert('Ошибка загрузки изображения: ' + result.error);
            }
        } catch (error) {
            console.error('Ошибка загрузки изображения:', error);
            alert('Ошибка загрузки изображения: ' + error.message);
        }
    } else {
        // Обновляем только данные (URL, alt, width, height)
        await updateBlockData(blockId, {
            url: urlInput.value,
            alt: altInput.value,
            width: widthInput.value || '100%',
            height: heightInput.value || 'auto'
        });
        closeEditModal();
    }
}

// Сохранение блока кнопки
async function saveButtonBlock(blockId) {
    const textInput = document.getElementById('button-text-input');
    const linkInput = document.getElementById('button-link-input');
    const alignInput = document.getElementById('button-align-input');
    const sizeInput = document.getElementById('button-size-input');
    const styleInput = document.getElementById('button-style-input');
    const bgColorText = document.getElementById('button-bg-color-text');
    const textColorText = document.getElementById('button-text-color-text');
    const borderRadiusInput = document.getElementById('button-border-radius-input');
    
    const buttonData = {
        text: textInput.value || 'Кнопка',
        link: linkInput.value || '#',
        align: alignInput.value || 'left',
        size: sizeInput.value || 'medium',
        style: styleInput.value || 'primary',
        border_radius: borderRadiusInput.value || '8px'
    };
    
    // Добавляем кастомные цвета только если они заданы
    if (bgColorText && bgColorText.value.trim()) {
        buttonData.bg_color = bgColorText.value.trim();
    }
    if (textColorText && textColorText.value.trim()) {
        buttonData.text_color = textColorText.value.trim();
    }
    
    await updateBlockData(blockId, buttonData);
    closeEditModal();
}

// Сохранение блока видео
async function saveVideoBlock(blockId) {
    const urlInput = document.getElementById('video-url-input');
    const widthInput = document.getElementById('video-width-input');
    const heightInput = document.getElementById('video-height-input');
    const autoplayInput = document.getElementById('video-autoplay-input');
    
    const videoData = {
        url: urlInput.value || '',
        width: widthInput.value || '100%',
        height: heightInput.value || '400px',
        autoplay: autoplayInput.checked || false
    };
    
    await updateBlockData(blockId, videoData);
    closeEditModal();
}

// Сохранение блока текста
async function saveTextBlock(blockId) {
    const contentInput = document.getElementById('text-content-input');
    const sizeInput = document.getElementById('text-size-input');
    const alignInput = document.getElementById('text-align-input');
    
    const textData = {
        content: contentInput.value || 'Текст блока',
        size: sizeInput.value || '16px',
        align: alignInput.value || 'left'
    };
    
    await updateBlockData(blockId, textData);
    closeEditModal();
}

// Сохранение блока заголовка
async function saveHeadingBlock(blockId) {
    const contentInput = document.getElementById('heading-content-input');
    const levelInput = document.getElementById('heading-level-input');
    const alignInput = document.getElementById('heading-align-input');
    
    const headingData = {
        content: contentInput.value || 'Заголовок',
        level: levelInput.value || 'h1',
        align: alignInput.value || 'left'
    };
    
    await updateBlockData(blockId, headingData);
    closeEditModal();
}

// Обновление данных блока
async function updateBlockData(blockId, newData, reload = true) {
    try {
        // Получаем текущие данные блока
        const response = await fetch(`/api/blocks/${blockId}/update/`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({
                data: newData
            })
        });

        const result = await response.json();
        if (result.success) {
            if (reload) {
                location.reload();
            } else {
                // Обновляем размер элемента без перезагрузки
                const blockItem = document.querySelector(`[data-block-id="${blockId}"]`);
                if (blockItem) {
                    const blockType = blockItem.dataset.blockType;
                    let targetElement = null;
                    
                    if (blockType === 'image') {
                        targetElement = blockItem.querySelector('.block-content img');
                    } else if (blockType === 'slider') {
                        targetElement = blockItem.querySelector('.block-content .slider-container') || 
                                     blockItem.querySelector('.block-content > div');
                    }
                    
                    if (targetElement) {
                        if (newData.width) {
                            targetElement.style.width = newData.width;
                        }
                        if (newData.height) {
                            targetElement.style.height = newData.height;
                        }
                    }
                }
            }
        } else {
            alert('Ошибка обновления блока: ' + result.error);
        }
    } catch (error) {
        console.error('Ошибка обновления блока:', error);
        alert('Ошибка обновления блока: ' + error.message);
    }
}

// Предпросмотр
function openPreview() {
    const modal = document.getElementById('preview-modal');
    if (modal) {
        modal.classList.add('active');
    }
}

function closePreview() {
    const modal = document.getElementById('preview-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Вспомогательная функция для получения CSRF токена
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// Инициализация обработчиков изменения размера для блока изображения или слайдера
function initBlockResizeHandles(blockItem) {
    const blockId = blockItem.dataset.blockId;
    const blockType = blockItem.dataset.blockType;
    const handles = blockItem.querySelectorAll('.block-resize-handle');
    
    // Для изображения берем img, для слайдера - slider-container
    let targetElement = null;
    if (blockType === 'image') {
        targetElement = blockItem.querySelector('.block-content img');
    } else if (blockType === 'slider') {
        // Для слайдера ищем контейнер слайдера
        targetElement = blockItem.querySelector('.block-content .slider-container');
        // Если не нашли, ищем первый div внутри block-content
        if (!targetElement) {
            targetElement = blockItem.querySelector('.block-content > div');
        }
    }
    
    if (!targetElement || handles.length === 0) {
        console.log('Не найден targetElement или handles для блока', blockId, blockType);
        return;
    }
    
    // Проверяем, не инициализированы ли уже обработчики
    if (blockItem.dataset.resizeInitialized === 'true') return;
    blockItem.dataset.resizeInitialized = 'true';
    
    let isResizing = false;
    let startX, startY, startWidth, startHeight;
    let currentData = null;
    
    // Получаем текущие данные блока и устанавливаем начальный размер
    fetch(`/api/blocks/${blockId}/`, {
        method: 'GET',
        headers: {
            'X-CSRFToken': getCookie('csrftoken')
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            currentData = data.block.data || {};
            
            // Устанавливаем начальный размер из данных
            if (currentData.width) {
                targetElement.style.width = currentData.width;
            }
            if (currentData.height) {
                targetElement.style.height = currentData.height;
            } else if (blockType === 'slider' && !currentData.height) {
                // Для слайдера по умолчанию auto
                targetElement.style.height = 'auto';
            }
        }
    })
    .catch(error => {
        console.error('Ошибка загрузки данных блока:', error);
    });
    
    handles.forEach(handle => {
        handle.addEventListener('mousedown', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            isResizing = true;
            startX = e.clientX;
            startY = e.clientY;
            
            // Получаем текущий размер элемента
            const computedStyle = window.getComputedStyle(targetElement);
            const widthValue = computedStyle.width;
            const heightValue = computedStyle.height;
            
            // Парсим размеры, учитывая проценты и пиксели
            if (widthValue && widthValue !== 'auto' && widthValue !== '0px' && !widthValue.includes('%')) {
                startWidth = parseFloat(widthValue);
            } else {
                startWidth = targetElement.offsetWidth || 400;
            }
            
            if (heightValue && heightValue !== 'auto' && heightValue !== '0px' && !heightValue.includes('%')) {
                startHeight = parseFloat(heightValue);
            } else {
                startHeight = targetElement.offsetHeight || 300;
            }
            
            const handleType = handle.dataset.handle;
            
            function handleBlockResize(e) {
                if (!isResizing) return;
                
                const deltaX = e.clientX - startX;
                const deltaY = e.clientY - startY;
                
                let newWidth = startWidth;
                let newHeight = startHeight;
                
                // Определяем направление изменения размера
                if (handleType.includes('e')) {
                    newWidth = startWidth + deltaX;
                }
                if (handleType.includes('w')) {
                    newWidth = startWidth - deltaX;
                }
                if (handleType.includes('s')) {
                    newHeight = startHeight + deltaY;
                }
                if (handleType.includes('n')) {
                    newHeight = startHeight - deltaY;
                }
                
                // Ограничения минимального размера
                newWidth = Math.max(50, newWidth);
                newHeight = Math.max(50, newHeight);
                
                // Применяем размеры к элементу
                targetElement.style.width = newWidth + 'px';
                targetElement.style.height = newHeight + 'px';
            }
            
            function handleBlockResizeEnd() {
                if (!isResizing) return;
                
                isResizing = false;
                document.removeEventListener('mousemove', handleBlockResize);
                document.removeEventListener('mouseup', handleBlockResizeEnd);
                
                // Получаем финальный размер
                const finalWidth = targetElement.offsetWidth;
                const finalHeight = targetElement.offsetHeight;
                
                // Обновляем данные блока через API
                const newData = {
                    ...currentData,
                    width: finalWidth + 'px',
                    height: finalHeight + 'px'
                };
                
                updateBlockData(blockId, newData, false); // false = не перезагружать страницу
            }
            
            document.addEventListener('mousemove', handleBlockResize);
            document.addEventListener('mouseup', handleBlockResizeEnd);
        });
    });
}

// Функции для управления слайдером в редакторе
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

