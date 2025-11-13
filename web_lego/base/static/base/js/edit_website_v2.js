// Инициализация переменных
const websiteId = document.body.dataset.websiteId ? parseInt(document.body.dataset.websiteId) : null;
let selectedBlock = null;
let draggedBlock = null;
let draggedElement = null;
let isDraggingBlock = false;
let dragStartX = 0;
let dragStartY = 0;
let blockStartLeft = 0;
let blockStartTop = 0;

// Drag & Drop для новых блоков из панели
document.addEventListener('DOMContentLoaded', function () {
    const editorCanvas = document.getElementById('editor-canvas');

    // Инициализируем позиции для существующих блоков
    initializeBlockPositions();

    document.querySelectorAll('.block-type-btn').forEach(btn => {
        btn.addEventListener('dragstart', (e) => {
            draggedBlock = e.target.dataset.type;
            e.dataTransfer.effectAllowed = 'copy';
        });
    });

    // Обработка перетаскивания существующих блоков
    document.querySelectorAll('.block-item').forEach(item => {
        setupBlockEventListeners(item);
    });

    if (editorCanvas) {
        editorCanvas.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (draggedBlock) {
                e.dataTransfer.dropEffect = 'copy';
            } else if (isDraggingBlock) {
                e.dataTransfer.dropEffect = 'move';
                // Обновляем позицию перетаскиваемого блока
                if (draggedElement) {
                    const deltaX = e.clientX - dragStartX;
                    const deltaY = e.clientY - dragStartY;

                    let newLeft = blockStartLeft + deltaX;
                    let newTop = blockStartTop + deltaY;

                    // Ограничиваем позицию внутри canvas
                    const canvas = editorCanvas;
                    newLeft = Math.max(0, Math.min(newLeft, canvas.offsetWidth - draggedElement.offsetWidth));
                    newTop = Math.max(0, Math.min(newTop, canvas.offsetHeight - draggedElement.offsetHeight));

                    draggedElement.style.left = newLeft + 'px';
                    draggedElement.style.top = newTop + 'px';
                }
            }
        });

        editorCanvas.addEventListener('drop', async (e) => {
            e.preventDefault();
            if (draggedBlock) {
                // Получаем позицию для нового блока
                const rect = editorCanvas.getBoundingClientRect();
                const x = Math.max(0, e.clientX - rect.left - 75);
                const y = Math.max(0, e.clientY - rect.top - 50);

                await createBlock(draggedBlock, x, y);
                draggedBlock = null;
            } else if (isDraggingBlock && draggedElement) {
                // Сохраняем новую позицию на сервер
                await saveBlockPosition(draggedElement);
            }
        });
    }

    // Инициализация слайдеров в редакторе
    document.querySelectorAll('.block-content .slider-container').forEach(container => {
        const slides = container.querySelectorAll('.slide');
        if (slides.length > 0) {
            slides[0].classList.add('active');
            const indicators = container.querySelectorAll('.slider-indicator');
            if (indicators[0]) {
                indicators[0].classList.add('active');
            }
            startSlider(container);
        }
    });

    // Закрытие модального окна при клике вне его
    const editModal = document.getElementById('edit-modal');
    if (editModal) {
        editModal.addEventListener('click', function (e) {
            if (e.target === this) {
                closeEditModal();
            }
        });
    }
});

// Установка обработчиков событий для блока
function setupBlockEventListeners(item) {
    // Выбор блока
    item.addEventListener('click', (e) => {
        if (e.target.closest('.block-controls')) return;
        if (e.target.closest('.block-resize-handle')) return;

        document.querySelectorAll('.block-item').forEach(b => b.classList.remove('selected'));
        item.classList.add('selected');
        selectedBlock = item.dataset.blockId;

        console.log('✓ Блок выбран:', { blockId: selectedBlock, blockType: item.dataset.blockType });

        // Инициализируем обработчики изменения размера
        initBlockResizeHandles(item);
    });

    // Перетаскивание блока
    item.addEventListener('dragstart', (e) => {
        // Не позволяем перетаскивать за ручки
        if (e.target.closest('.block-resize-handle')) {
            e.preventDefault();
            return;
        }

        draggedElement = item;
        isDraggingBlock = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        blockStartLeft = item.offsetLeft;
        blockStartTop = item.offsetTop;

        item.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    });

    item.addEventListener('dragend', () => {
        isDraggingBlock = false;
        item.classList.remove('dragging');
    });
}

// Инициализация позиций блоков из данных
function initializeBlockPositions() {
    document.querySelectorAll('.block-item').forEach((item, index) => {
        const blockId = item.dataset.blockId;

        // Получаем сохраненную позицию и размер
        fetch(`/api/blocks/${blockId}/`, {
            method: 'GET',
            headers: {
                'X-CSRFToken': getCookie('csrftoken')
            }
        })
            .then(response => response.json())
            .then(data => {
                if (data.success && data.block.data) {
                    const blockData = data.block.data;

                    // Устанавливаем позицию
                    if (blockData.position_x !== undefined && blockData.position_x !== null) {
                        item.style.left = blockData.position_x + 'px';
                    } else {
                        item.style.left = (index * 30) + 'px';
                    }

                    if (blockData.position_y !== undefined && blockData.position_y !== null) {
                        item.style.top = blockData.position_y + 'px';
                    } else {
                        item.style.top = (index * 30) + 'px';
                    }

                    // Устанавливаем размер
                    if (blockData.width) {
                        item.style.width = blockData.width;
                    }

                    if (blockData.height) {
                        item.style.height = blockData.height;
                    }
                }
            })
            .catch(error => {
                console.error('Ошибка загрузки позиции блока:', error);
                // Устанавливаем позицию по умолчанию
                item.style.left = (index * 30) + 'px';
                item.style.top = (index * 30) + 'px';
            });
    });
}

// Сохранение позиции блока
async function saveBlockPosition(blockElement) {
    const blockId = blockElement.dataset.blockId;

    try {
        const response = await fetch(`/api/blocks/${blockId}/`, {
            method: 'GET',
            headers: {
                'X-CSRFToken': getCookie('csrftoken')
            }
        });

        const result = await response.json();
        if (result.success) {
            const currentData = result.block.data || {};

            // Обновляем позицию и размер
            const newData = {
                ...currentData,
                position_x: Math.round(blockElement.offsetLeft),
                position_y: Math.round(blockElement.offsetTop),
                width: blockElement.style.width || 'auto',
                height: blockElement.style.height || 'auto'
            };

            await updateBlockData(blockId, newData, false);
        }
    } catch (error) {
        console.error('Ошибка сохранения позиции:', error);
    }
}

// Создание блока
async function createBlock(blockType, posX = 0, posY = 0) {
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
                data: {
                    position_x: posX,
                    position_y: posY,
                    width: '300px',
                    height: 'auto'
                }
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

    // Получаем информацию о блоке
    const blockType = blockElement.dataset.blockType;
    openEditModal(blockId, blockType);
}

// Модальное окно для редактирования блока
function openEditModal(blockId, blockType) {
    const modal = document.getElementById('edit-modal');
    const modalBody = document.getElementById('edit-modal-body');

    if (!modal || !modalBody) return;

    if (blockType === 'text') {
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
            });
    } else if (blockType === 'image') {
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
                    </div>
                    <div class="form-group">
                        <label class="form-label">Или введите URL изображения</label>
                        <input type="text" id="image-url-input" class="form-input" placeholder="https://example.com/image.jpg" value="${data.block?.data?.url || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Альтернативный текст (alt)</label>
                        <input type="text" id="image-alt-input" class="form-input" placeholder="Описание изображения" value="${data.block?.data?.alt || 'Изображение'}">
                    </div>
                    <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
                        <button type="button" class="btn" onclick="saveImageBlock(${blockId})">💾 Сохранить</button>
                        <button type="button" class="btn btn-secondary" onclick="closeEditModal()">Отмена</button>
                    </div>
                </form>
            `;

                const fileInput = document.getElementById('image-file-input');
                if (fileInput) {
                    fileInput.addEventListener('change', function (e) {
                        const file = e.target.files[0];
                        if (file) {
                            const reader = new FileReader();
                            reader.onload = function (e) {
                                // Можно добавить предпросмотр
                            };
                            reader.readAsDataURL(file);
                        }
                    });
                }

                modal.classList.add('active');
            });
    } else if (blockType === 'button') {
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
                    <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
                        <button type="button" class="btn" onclick="saveButtonBlock(${blockId})">💾 Сохранить</button>
                        <button type="button" class="btn btn-secondary" onclick="closeEditModal()">Отмена</button>
                    </div>
                </form>
            `;

                modal.classList.add('active');
            });
    } else if (blockType === 'slider') {
        fetch(`/api/blocks/${blockId}/`, {
            method: 'GET',
            headers: {
                'X-CSRFToken': getCookie('csrftoken')
            }
        })
            .then(response => response.json())
            .then(data => {
                const images = data.block?.data?.images || [];

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
                    </div>
                    <div class="form-group">
                        <label class="form-label">Изображения в слайдере (${images.length})</label>
                        <div id="slider-images-list" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 1rem; margin-top: 1rem; min-height: 100px;">
                            ${imagesList || '<p style="color: #6b7280; text-align: center; grid-column: 1/-1;">Нет изображений</p>'}
                        </div>
                    </div>
                    <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
                        <button type="button" class="btn" onclick="saveSliderBlock(${blockId})">💾 Сохранить</button>
                        <button type="button" class="btn btn-secondary" onclick="closeEditModal()">Отмена</button>
                    </div>
                </form>
            `;

                const fileInput = document.getElementById('slider-file-input');
                if (fileInput) {
                    fileInput.addEventListener('change', function (e) {
                        const files = Array.from(e.target.files);
                        files.forEach(file => {
                            const reader = new FileReader();
                            reader.onload = function (e) {
                                addSliderImageToList(e.target.result);
                            };
                            reader.readAsDataURL(file);
                        });
                    });
                }

                modal.classList.add('active');
            });
    } else if (blockType === 'video') {
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

                modalBody.innerHTML = `
                <h3 style="color: #7c3aed; margin-bottom: 1.5rem;">🎥 Редактировать видео</h3>
                <form id="video-edit-form">
                    <div class="form-group">
                        <label class="form-label">URL видео</label>
                        <input type="text" id="video-url-input" class="form-input" placeholder="https://example.com/video.mp4" value="${url}">
                    </div>
                    <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
                        <button type="button" class="btn" onclick="saveVideoBlock(${blockId})">💾 Сохранить</button>
                        <button type="button" class="btn btn-secondary" onclick="closeEditModal()">Отмена</button>
                    </div>
                </form>
            `;

                modal.classList.add('active');
            });
    }
}

function closeEditModal() {
    const modal = document.getElementById('edit-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Функции для сохранения блоков
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

async function saveImageBlock(blockId) {
    const fileInput = document.getElementById('image-file-input');
    const urlInput = document.getElementById('image-url-input');
    const altInput = document.getElementById('image-alt-input');

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
                await updateBlockData(blockId, {
                    alt: altInput.value,
                    url: result.image_url
                });
                closeEditModal();
            }
        } catch (error) {
            console.error('Ошибка загрузки изображения:', error);
            alert('Ошибка загрузки изображения: ' + error.message);
        }
    } else {
        await updateBlockData(blockId, {
            url: urlInput.value,
            alt: altInput.value
        });
        closeEditModal();
    }
}

async function saveButtonBlock(blockId) {
    const textInput = document.getElementById('button-text-input');
    const linkInput = document.getElementById('button-link-input');

    const buttonData = {
        text: textInput.value || 'Кнопка',
        link: linkInput.value || '#'
    };

    await updateBlockData(blockId, buttonData);
    closeEditModal();
}

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

async function saveSliderBlock(blockId) {
    if (!sliderImages) sliderImages = [];

    await updateBlockData(blockId, {
        images: sliderImages,
        autoplay: true,
        interval: 3000
    });
    closeEditModal();
}

async function saveVideoBlock(blockId) {
    const urlInput = document.getElementById('video-url-input');

    const videoData = {
        url: urlInput.value || ''
    };

    await updateBlockData(blockId, videoData);
    closeEditModal();
}

// Обновление данных блока
async function updateBlockData(blockId, newData, reload = true) {
    try {
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
            }
        } else {
            alert('Ошибка обновления блока: ' + result.error);
        }
    } catch (error) {
        console.error('Ошибка обновления блока:', error);
        alert('Ошибка обновления блока: ' + error.message);
    }
}

// Инициализация обработчиков изменения размера для всех блоков
function initBlockResizeHandles(blockItem) {
    const blockId = blockItem.dataset.blockId;
    const blockType = blockItem.dataset.blockType;
    const handles = blockItem.querySelectorAll('.block-resize-handle');

    console.log('🔧 Инициализация ручек для блока:', { blockId, blockType, handlesCount: handles.length });

    if (handles.length === 0) {
        console.log('⚠️ Ручки не найдены для блока', blockId);
        return;
    }

    // Проверяем, не инициализированы ли уже обработчики
    if (blockItem.dataset.resizeInitialized === 'true') {
        console.log('ℹ️ Обработчики уже инициализированы');
        return;
    }
    blockItem.dataset.resizeInitialized = 'true';

    // Создаем обработчик для каждой ручки
    handles.forEach(handle => {
        handle.addEventListener('mousedown', createResizeHandler(blockId, blockType, blockItem, handle));
    });
}

// Функция для создания обработчика изменения размера
function createResizeHandler(blockId, blockType, blockItem, handle) {
    return function (e) {
        e.preventDefault();
        e.stopPropagation();

        const handleType = handle.dataset.handle;
        let startX = e.clientX;
        let startY = e.clientY;

        let startWidth = blockItem.offsetWidth;
        let startHeight = blockItem.offsetHeight;
        let startLeft = blockItem.offsetLeft;
        let startTop = blockItem.offsetTop;

        // Добавляем класс для визуализации процесса изменения размера
        handle.classList.add('resizing');
        blockItem.style.transition = 'none';

        // Функция обработки перемещения мыши
        const handleMouseMove = (moveEvent) => {
            const deltaX = moveEvent.clientX - startX;
            const deltaY = moveEvent.clientY - startY;

            let newWidth = startWidth;
            let newHeight = startHeight;
            let newLeft = startLeft;
            let newTop = startTop;

            // Определяем направление изменения размера в зависимости от типа ручки
            if (handleType.includes('e')) {
                newWidth = startWidth + deltaX;
            }
            if (handleType.includes('w')) {
                newWidth = startWidth - deltaX;
                newLeft = startLeft + deltaX;
            }
            if (handleType.includes('s')) {
                newHeight = startHeight + deltaY;
            }
            if (handleType.includes('n')) {
                newHeight = startHeight - deltaY;
                newTop = startTop + deltaY;
            }

            // Ограничения минимального размера
            newWidth = Math.max(100, newWidth);
            newHeight = Math.max(50, newHeight);

            // Применяем размеры и позицию к элементу
            blockItem.style.width = newWidth + 'px';
            blockItem.style.height = newHeight + 'px';
            blockItem.style.left = newLeft + 'px';
            blockItem.style.top = newTop + 'px';
        };

        // Функция завершения изменения размера
        const handleMouseUp = async () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);

            handle.classList.remove('resizing');
            blockItem.style.transition = '';

            // Получаем финальный размер и позицию
            const finalWidth = blockItem.offsetWidth;
            const finalHeight = blockItem.offsetHeight;
            const finalLeft = blockItem.offsetLeft;
            const finalTop = blockItem.offsetTop;

            // Сохраняем на сервер
            try {
                const response = await fetch(`/api/blocks/${blockId}/`, {
                    method: 'GET',
                    headers: {
                        'X-CSRFToken': getCookie('csrftoken')
                    }
                });

                const result = await response.json();
                if (result.success) {
                    const currentData = result.block.data || {};

                    // Обновляем размеры и позицию
                    const newData = {
                        ...currentData,
                        width: finalWidth + 'px',
                        height: finalHeight + 'px',
                        position_x: finalLeft,
                        position_y: finalTop
                    };

                    // Отправляем обновление на сервер
                    await updateBlockData(blockId, newData, false);
                }
            } catch (error) {
                console.error('Ошибка при завершении изменения размера:', error);
            }
        };

        // Добавляем обработчики
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };
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

    slides.forEach(slide => slide.classList.remove('active'));
    indicators.forEach(indicator => indicator.classList.remove('active'));

    slides[index].classList.add('active');
    if (indicators[index]) {
        indicators[index].classList.add('active');
    }

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
