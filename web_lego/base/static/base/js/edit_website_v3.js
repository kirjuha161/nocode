// === ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ===
const websiteId = document.body.dataset.websiteId ? parseInt(document.body.dataset.websiteId) : null;
let selectedBlock = null;
let draggedBlockType = null;
let draggedBlockElement = null;
let isMovingBlock = false;
let isResizingBlock = false;

// === ИНИЦИАЛИЗАЦИЯ ===
document.addEventListener('DOMContentLoaded', function () {
    console.log('✓ Инициализация редактора');

    const editorCanvas = document.getElementById('editor-canvas');
    if (!editorCanvas) {
        console.error('Canvas не найден!');
        return;
    }

    // Загружаем позиции и размеры существующих блоков
    loadBlockPositions();

    // Настраиваем обработчики для новых блоков из панели
    setupPanelDragHandlers();

    // Настраиваем обработчики для существующих блоков
    setupExistingBlockHandlers();

    // Настраиваем обработчики canvas для drop
    setupCanvasDropHandlers(editorCanvas);

    // Закрытие модального окна при клике вне его
    setupModalHandlers();
});

// === ЗАГРУЗКА ПОЗИЦИЙ БЛОКОВ ===
function loadBlockPositions() {
    const blocks = document.querySelectorAll('.block-item');
    console.log('📍 Загружаем позиции для', blocks.length, 'блоков');

    blocks.forEach((item, index) => {
        const blockId = item.dataset.blockId;

        // Получаем сохраненные данные
        fetch(`/api/blocks/${blockId}/`, {
            method: 'GET',
            headers: { 'X-CSRFToken': getCookie('csrftoken') }
        })
            .then(response => response.json())
            .then(data => {
                if (!data.success) {
                    console.warn('❌ Ошибка получения блока:', blockId, data.error);
                    // Позиция по умолчанию при ошибке
                    applyDefaultPosition(item, index);
                    return;
                }

                const blockData = data.block?.data || {};

                console.log('📦 Данные блока:', blockId, blockData);

                // Если позиция сохранена, применяем её
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

                // Применяем размер если есть (поддерживаем числа и строки)
                if (blockData.width !== undefined && blockData.width !== null) {
                    item.style.width = (typeof blockData.width === 'number') ? blockData.width + 'px' : blockData.width;
                } else {
                    item.style.width = '300px';
                }

                if (blockData.height !== undefined && blockData.height !== null) {
                    item.style.height = (typeof blockData.height === 'number') ? blockData.height + 'px' : blockData.height;
                } else {
                    item.style.height = '200px';
                }

                // Устанавливаем dataset proportional, если задан
                if (blockData.proportional !== undefined) {
                    item.dataset.proportional = blockData.proportional ? 'true' : 'false';
                } else {
                    // по умолчанию для изображений/видео - сохранять пропорции
                    if (item.dataset.blockType === 'image' || item.dataset.blockType === 'video') {
                        item.dataset.proportional = 'true';
                    } else {
                        item.dataset.proportional = 'false';
                    }
                }
                // Устанавливаем режим object-fit, если задан
                if (blockData.fit) {
                    item.dataset.fit = blockData.fit;
                } else {
                    item.dataset.fit = 'contain';
                }
                // Подгоняем внутренние медиа-элементы под новый размер
                try { adjustInnerForMedia(item); } catch (e) { console.warn('adjustInnerForMedia load error', e); }
                console.log('✓ Позиция загружена для блока', blockId, {
                    left: item.style.left,
                    top: item.style.top,
                    width: item.style.width,
                    height: item.style.height
                });
            })
            .catch(error => {
                console.warn('⚠️ Ошибка загрузки позиции блока:', blockId, error);
                applyDefaultPosition(item, index);
            });
    });
}

function applyDefaultPosition(item, index) {
    item.style.left = (index * 30) + 'px';
    item.style.top = (index * 30) + 'px';
    item.style.width = '300px';
    item.dataset.proportional = 'false';
    console.log('🎯 Позиция по умолчанию для блока', item.dataset.blockId);
}

// === ОБРАБОТЧИКИ ПАНЕЛИ БЛОКОВ ===
function setupPanelDragHandlers() {
    document.querySelectorAll('.block-type-btn').forEach(btn => {
        btn.addEventListener('dragstart', (e) => {
            draggedBlockType = e.target.dataset.type;
            e.dataTransfer.effectAllowed = 'copy';
            console.log('📦 Начали перетаскивать блок типа:', draggedBlockType);
        });

        btn.addEventListener('dragend', () => {
            draggedBlockType = null;
        });
    });
}

// === ОБРАБОТЧИКИ СУЩЕСТВУЮЩИХ БЛОКОВ ===
function setupExistingBlockHandlers() {
    document.querySelectorAll('.block-item').forEach(item => {
        // Клик для выбора блока
        item.addEventListener('click', (e) => {
            if (e.target.closest('.block-controls') || e.target.closest('.block-resize-handle')) {
                return;
            }

            document.querySelectorAll('.block-item').forEach(b => b.classList.remove('selected'));
            item.classList.add('selected');
            selectedBlock = item.dataset.blockId;

            console.log('✓ Блок выбран:', selectedBlock);

            // Инициализируем ручки для изменения размера
            initResizeHandles(item);
        });

        // Перетаскивание блока для перемещения
        item.addEventListener('mousedown', (e) => {
            // Не начинаем движение если кликнули на кнопку или ручку
            if (e.target.closest('.block-controls') || e.target.closest('.block-resize-handle')) {
                return;
            }

            // Только левая кнопка мыши
            if (e.button !== 0) return;

            e.preventDefault();

            draggedBlockElement = item;
            isMovingBlock = true;

            const canvasRect = item.parentElement.getBoundingClientRect();
            const itemRect = item.getBoundingClientRect();
            const offsetX = e.clientX - itemRect.left;
            const offsetY = e.clientY - itemRect.top;

            const startX = item.offsetLeft;
            const startY = item.offsetTop;

            console.log('🔄 Начали перемещать блок');

            item.classList.add('dragging');

            function onMouseMove(moveEvent) {
                if (!isMovingBlock) return;

                const canvasRect = item.parentElement.getBoundingClientRect();

                let newLeft = moveEvent.clientX - canvasRect.left - offsetX;
                let newTop = moveEvent.clientY - canvasRect.top - offsetY;

                // Ограничиваем внутри canvas
                newLeft = Math.max(0, Math.min(newLeft, canvasRect.width - item.offsetWidth));
                newTop = Math.max(0, Math.min(newTop, canvasRect.height - item.offsetHeight));

                item.style.left = newLeft + 'px';
                item.style.top = newTop + 'px';

                // Периодическое логирование
                if (!item.dataset.lastDragLog || Date.now() - item.dataset.lastDragLog > 300) {
                    console.log('📍 Moving block:', { left: newLeft, top: newTop });
                    item.dataset.lastDragLog = Date.now();
                }
            }

            function onMouseUp() {
                if (!isMovingBlock) return;

                isMovingBlock = false;
                item.classList.remove('dragging');

                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);

                // Сохраняем новую позицию
                saveBlockPosition(item);

                console.log('✓ Блок переместили');
            }

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    });
}

// === ОБРАБОТЧИКИ CANVAS ===
function setupCanvasDropHandlers(canvas) {
    canvas.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (draggedBlockType) {
            e.dataTransfer.dropEffect = 'copy';
        }
    });

    canvas.addEventListener('drop', async (e) => {
        e.preventDefault();

        if (draggedBlockType) {
            // Получаем позицию drop
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left - 75; // Половина стандартной ширины
            const y = e.clientY - rect.top - 50;  // Половина стандартной высоты

            console.log('📍 Создаём блок на позиции:', x, y);

            await createBlock(draggedBlockType, Math.max(0, x), Math.max(0, y));
            draggedBlockType = null;
        }
    });
}

// === ОБРАБОТЧИКИ МОДАЛЕЙ ===
function setupModalHandlers() {
    const editModal = document.getElementById('edit-modal');
    if (!editModal) return;

    editModal.addEventListener('click', function (e) {
        if (e.target === this) {
            closeEditModal();
        }
    });
}

// === СОХРАНЕНИЕ ПОЗИЦИИ БЛОКА ===
async function saveBlockPosition(blockElement) {
    const blockId = blockElement.dataset.blockId;

    try {
        const response = await fetch(`/api/blocks/${blockId}/`, {
            method: 'GET',
            headers: { 'X-CSRFToken': getCookie('csrftoken') }
        });

        const result = await response.json();
        if (!result.success) {
            console.error('Ошибка при получении блока:', result.error);
            return;
        }

        const currentData = result.block.data || {};

        // Вычисляем размеры числовыми значениями (px -> numbers)
        const newWidth = Math.round(blockElement.offsetWidth);
        const newHeight = Math.round(blockElement.offsetHeight);

        // Сохраняем флаг proportional если присутствует в dataset
        const proportional = blockElement.dataset.proportional === 'true';
        // Сохраняем режим fit если есть
        const fit = blockElement.dataset.fit || null;

        const newData = {
            ...currentData,
            position_x: Math.round(blockElement.offsetLeft),
            position_y: Math.round(blockElement.offsetTop),
            width: newWidth,
            height: newHeight,
            proportional: proportional
            , fit: fit
        };

        console.log('💾 Сохраняем позицию:', {
            blockId: blockId,
            left: newData.position_x,
            top: newData.position_y,
            width: newData.width,
            height: newData.height
        });

        await updateBlockData(blockId, newData, false);
    } catch (error) {
        console.error('Ошибка сохранения позиции:', error);
    }
}

// === СОЗДАНИЕ БЛОКА ===
async function createBlock(blockType, posX = 0, posY = 0) {
    if (!websiteId) {
        alert('Ошибка: ID сайта не найден');
        return;
    }

    try {
        const payload = {
            block_type: blockType,
            data: {
                position_x: Math.round(posX),
                position_y: Math.round(posY),
                // разумные значения по умолчанию
                width: 300,
                height: 200,
                proportional: (blockType === 'image' || blockType === 'video'),
                fit: 'contain'
            }
        };

        const response = await fetch(`/api/websites/${websiteId}/blocks/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        if (result.success) {
            // Перезагрузим страницу, чтобы блок отрисовался
            location.reload();
        } else {
            console.error('Ошибка создания блока:', result.error);
            alert('Ошибка создания блока: ' + (result.error || 'Неизвестная ошибка'));
        }
    } catch (error) {
        console.error('Ошибка создания блока:', error);
        alert('Ошибка создания блока: ' + error.message);
    }
}

// === РЕДАКТИРОВАНИЕ БЛОКА ===
function editBlock(blockId) {
    const blockElement = document.querySelector(`[data-block-id="${blockId}"]`);
    if (!blockElement) return;

    blockElement.classList.add('selected');
    selectedBlock = blockId;

    const blockType = blockElement.dataset.blockType;
    openEditModal(blockId, blockType);
}

// === ИНИЦИАЛИЗАЦИЯ РУЧЕК ИЗМЕНЕНИЯ РАЗМЕРА ===
function initResizeHandles(blockItem) {
    const blockId = blockItem.dataset.blockId;

    // Удаляем старые обработчики
    if (blockItem.dataset.resizeInitialized === 'true') return;
    blockItem.dataset.resizeInitialized = 'true';

    const handles = blockItem.querySelectorAll('.block-resize-handle');

    handles.forEach(handle => {
        handle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();

            isResizingBlock = true;

            const handleType = handle.dataset.handle;
            const startX = e.clientX;
            const startY = e.clientY;
            const startWidth = blockItem.offsetWidth;
            const startHeight = blockItem.offsetHeight;
            const startLeft = blockItem.offsetLeft;
            const startTop = blockItem.offsetTop;

            handle.classList.add('resizing');
            blockItem.style.transition = 'none';

            console.log('🔧 Начали менять размер, тип ручки:', handleType);

            function onMouseMove(moveEvent) {
                if (!isResizingBlock) return;

                const deltaX = moveEvent.clientX - startX;
                const deltaY = moveEvent.clientY - startY;

                let newWidth = startWidth;
                let newHeight = startHeight;
                let newLeft = startLeft;
                let newTop = startTop;

                // Правая ручка/угол - расширяем вправо
                if (handleType.includes('e')) {
                    newWidth = startWidth + deltaX;
                }

                // Левая ручка/угол - расширяем влево (двигаем элемент)
                if (handleType.includes('w')) {
                    newWidth = startWidth - deltaX;
                    newLeft = startLeft + deltaX;
                }

                // Нижняя ручка/угол - расширяем вниз
                if (handleType.includes('s')) {
                    newHeight = startHeight + deltaY;
                }

                // Верхняя ручка/угол - расширяем вверх (двигаем элемент)
                if (handleType.includes('n')) {
                    newHeight = startHeight - deltaY;
                    newTop = startTop + deltaY;
                }

                // Если включен proportional, сохраняем соотношение сторон
                if (blockItem.dataset.proportional === 'true') {
                    const aspect = startWidth / startHeight || 1;
                    // Если это угол (обе оси) - выбираем ось, по которой движение сильнее
                    if ((handleType.includes('e') || handleType.includes('w')) && (handleType.includes('n') || handleType.includes('s'))) {
                        if (Math.abs(deltaX) > Math.abs(deltaY)) {
                            newHeight = Math.max(50, Math.round(newWidth / aspect));
                            // при изменении height сдвиг top если верхняя ручка
                            if (handleType.includes('n')) {
                                newTop = startTop + (startHeight - newHeight);
                            }
                        } else {
                            newWidth = Math.max(100, Math.round(newHeight * aspect));
                            if (handleType.includes('w')) {
                                newLeft = startLeft + (startWidth - newWidth);
                            }
                        }
                    } else if (handleType.includes('e') || handleType.includes('w')) {
                        newHeight = Math.max(50, Math.round(newWidth / aspect));
                        if (handleType.includes('w')) {
                            newLeft = startLeft + (startWidth - newWidth);
                        }
                    } else if (handleType.includes('n') || handleType.includes('s')) {
                        newWidth = Math.max(100, Math.round(newHeight * aspect));
                        if (handleType.includes('w')) {
                            newLeft = startLeft + (startWidth - newWidth);
                        }
                        if (handleType.includes('n')) {
                            newTop = startTop + (startHeight - newHeight);
                        }
                    }
                }

                // Минимальные размеры
                newWidth = Math.max(100, newWidth);
                newHeight = Math.max(50, newHeight);

                blockItem.style.width = newWidth + 'px';
                blockItem.style.height = newHeight + 'px';
                // Показать бейдж с размерами
                showSizeBadge(blockItem, newWidth, newHeight);
                blockItem.style.left = newLeft + 'px';
                blockItem.style.top = newTop + 'px';

                // Подгоняем внутренние элементы (img / video / iframe) чтобы они соответствовали контейнеру
                try {
                    adjustInnerForMedia(blockItem);
                } catch (err) {
                    // не критично, просто выводим лог
                    console.warn('adjustInnerForMedia error', err);
                }

                // Периодическое логирование (каждые 200ms)
                if (!blockItem.dataset.lastLogTime || Date.now() - blockItem.dataset.lastLogTime > 200) {
                    console.log('📏 Resize:', {
                        handle: handleType,
                        width: newWidth,
                        height: newHeight,
                        left: newLeft,
                        top: newTop
                    });
                    blockItem.dataset.lastLogTime = Date.now();
                }
            }

            function onMouseUp() {
                isResizingBlock = false;
                handle.classList.remove('resizing');
                blockItem.style.transition = '';

                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);

                // Сохраняем новый размер и позицию
                // Перед сохранением убедимся, что внутренние элементы подогнаны
                try { adjustInnerForMedia(blockItem); } catch (e) { }
                // Удаляем бейдж
                removeSizeBadge(blockItem);
                saveBlockPosition(blockItem);

                console.log('✓ Размер изменен');
            }

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    });
}

// === МОДАЛЬНОЕ ОКНО РЕДАКТИРОВАНИЯ ===
function openEditModal(blockId, blockType) {
    const modal = document.getElementById('edit-modal');
    const modalBody = document.getElementById('edit-modal-body');

    if (!modal || !modalBody) return;

    fetch(`/api/blocks/${blockId}/`, {
        method: 'GET',
        headers: { 'X-CSRFToken': getCookie('csrftoken') }
    })
        .then(response => response.json())
        .then(data => {
            const blockData = data.block?.data || {};

            let html = '';

            if (blockType === 'text') {
                const content = blockData.content || 'Текст блока';
                const size = blockData.size || '16px';
                const align = blockData.align || 'left';

                html = `
                <h3 style="color: #7c3aed; margin-bottom: 1.5rem;">📄 Редактировать текст</h3>
                <form id="edit-form">
                    <div class="form-group">
                        <label class="form-label">Текст</label>
                        <textarea id="field-content" class="form-input" rows="4">${content}</textarea>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Размер шрифта</label>
                        <input type="text" id="field-size" class="form-input" value="${size}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Выравнивание</label>
                        <select id="field-align" class="form-input">
                            <option value="left" ${align === 'left' ? 'selected' : ''}>Слева</option>
                            <option value="center" ${align === 'center' ? 'selected' : ''}>По центру</option>
                            <option value="right" ${align === 'right' ? 'selected' : ''}>Справа</option>
                        </select>
                    </div>
                </form>
            `;
            } else if (blockType === 'heading') {
                const content = blockData.content || 'Заголовок';
                const level = blockData.level || 'h1';
                const align = blockData.align || 'left';

                html = `
                <h3 style="color: #7c3aed; margin-bottom: 1.5rem;">📝 Редактировать заголовок</h3>
                <form id="edit-form">
                    <div class="form-group">
                        <label class="form-label">Текст</label>
                        <input type="text" id="field-content" class="form-input" value="${content}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Уровень</label>
                        <select id="field-level" class="form-input">
                            <option value="h1" ${level === 'h1' ? 'selected' : ''}>H1</option>
                            <option value="h2" ${level === 'h2' ? 'selected' : ''}>H2</option>
                            <option value="h3" ${level === 'h3' ? 'selected' : ''}>H3</option>
                            <option value="h4" ${level === 'h4' ? 'selected' : ''}>H4</option>
                            <option value="h5" ${level === 'h5' ? 'selected' : ''}>H5</option>
                            <option value="h6" ${level === 'h6' ? 'selected' : ''}>H6</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Выравнивание</label>
                        <select id="field-align" class="form-input">
                            <option value="left" ${align === 'left' ? 'selected' : ''}>Слева</option>
                            <option value="center" ${align === 'center' ? 'selected' : ''}>По центру</option>
                            <option value="right" ${align === 'right' ? 'selected' : ''}>Справа</option>
                        </select>
                    </div>
                </form>
            `;
            } else if (blockType === 'image') {
                const url = blockData.url || '';
                const alt = blockData.alt || 'Изображение';
                const fit = blockData.fit || 'contain';

                html = `
                <h3 style="color: #7c3aed; margin-bottom: 1.5rem;">🖼️ Редактировать изображение</h3>
                <form id="edit-form" enctype="multipart/form-data">
                    <div class="form-group">
                        <label class="form-label">Загрузить файл</label>
                        <input type="file" id="field-image" class="form-input" accept="image/*">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Или URL изображения</label>
                        <input type="text" id="field-url" class="form-input" value="${url}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Альтернативный текст</label>
                        <input type="text" id="field-alt" class="form-input" value="${alt}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Режим заполнения (object-fit)</label>
                        <select id="field-fit" class="form-input">
                            <option value="contain" ${fit === 'contain' ? 'selected' : ''}>contain</option>
                            <option value="cover" ${fit === 'cover' ? 'selected' : ''}>cover</option>
                            <option value="fill" ${fit === 'fill' ? 'selected' : ''}>fill</option>
                            <option value="none" ${fit === 'none' ? 'selected' : ''}>none</option>
                            <option value="scale-down" ${fit === 'scale-down' ? 'selected' : ''}>scale-down</option>
                        </select>
                    </div>
                </form>
            `;
            } else if (blockType === 'button') {
                const text = blockData.text || 'Кнопка';
                const link = blockData.link || '#';

                html = `
                <h3 style="color: #7c3aed; margin-bottom: 1.5rem;">🔘 Редактировать кнопку</h3>
                <form id="edit-form">
                    <div class="form-group">
                        <label class="form-label">Текст</label>
                        <input type="text" id="field-text" class="form-input" value="${text}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Ссылка</label>
                        <input type="text" id="field-link" class="form-input" value="${link}">
                    </div>
                </form>
            `;
            } else if (blockType === 'video') {
                const url = blockData.url || '';
                const fit = blockData.fit || 'contain';

                html = `
                <h3 style="color: #7c3aed; margin-bottom: 1.5rem;">🎥 Редактировать видео</h3>
                <form id="edit-form">
                    <div class="form-group">
                        <label class="form-label">URL видео</label>
                        <input type="text" id="field-url" class="form-input" value="${url}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Режим заполнения (object-fit)</label>
                        <select id="field-fit" class="form-input">
                            <option value="contain" ${fit === 'contain' ? 'selected' : ''}>contain</option>
                            <option value="cover" ${fit === 'cover' ? 'selected' : ''}>cover</option>
                            <option value="fill" ${fit === 'fill' ? 'selected' : ''}>fill</option>
                            <option value="none" ${fit === 'none' ? 'selected' : ''}>none</option>
                            <option value="scale-down" ${fit === 'scale-down' ? 'selected' : ''}>scale-down</option>
                        </select>
                    </div>
                </form>
            `;
            } else if (blockType === 'slider') {
                const images = blockData.images || [];
                html = `
                <h3 style="color: #7c3aed; margin-bottom: 1.5rem;">🎠 Редактировать слайдер</h3>
                <form id="edit-form">
                    <div class="form-group">
                        <label class="form-label">Добавить изображение</label>
                        <input type="file" id="field-image" class="form-input" accept="image/*" multiple>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Текущие изображения (${images.length})</label>
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;">
                            ${images.map((img, idx) => `<img src="${img}" style="max-width: 100%; border-radius: 8px;">`).join('')}
                        </div>
                    </div>
                </form>
            `;
            }

            modalBody.innerHTML = html + `
            <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
                <button type="button" class="btn" onclick="saveEditedBlock('${blockId}', '${blockType}')">💾 Сохранить</button>
                <button type="button" class="btn btn-secondary" onclick="closeEditModal()">Отмена</button>
            </div>
        `;

            modal.classList.add('active');
        })
        .catch(error => {
            console.error('Ошибка загрузки данных:', error);
            alert('Ошибка загрузки данных блока');
        });
}

function closeEditModal() {
    const modal = document.getElementById('edit-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

async function saveEditedBlock(blockId, blockType) {
    const newData = {};

    if (blockType === 'text') {
        newData.content = document.getElementById('field-content')?.value || '';
        newData.size = document.getElementById('field-size')?.value || '16px';
        newData.align = document.getElementById('field-align')?.value || 'left';
    } else if (blockType === 'heading') {
        newData.content = document.getElementById('field-content')?.value || '';
        newData.level = document.getElementById('field-level')?.value || 'h1';
        newData.align = document.getElementById('field-align')?.value || 'left';
    } else if (blockType === 'image') {
        const fileInput = document.getElementById('field-image');
        if (fileInput && fileInput.files.length > 0) {
            const formData = new FormData();
            formData.append('image', fileInput.files[0]);

            try {
                const response = await fetch(`/api/blocks/${blockId}/upload-image/`, {
                    method: 'POST',
                    headers: { 'X-CSRFToken': getCookie('csrftoken') },
                    body: formData
                });

                const result = await response.json();
                if (result.success) {
                    newData.url = result.image_url;
                }
            } catch (error) {
                console.error('Ошибка загрузки:', error);
                return;
            }
        } else {
            newData.url = document.getElementById('field-url')?.value || '';
        }
        newData.alt = document.getElementById('field-alt')?.value || 'Изображение';
        // Сохраняем режим object-fit если выбран
        const fitField = document.getElementById('field-fit');
        if (fitField) newData.fit = fitField.value || 'contain';
    } else if (blockType === 'button') {
        newData.text = document.getElementById('field-text')?.value || 'Кнопка';
        newData.link = document.getElementById('field-link')?.value || '#';
    } else if (blockType === 'video') {
        newData.url = document.getElementById('field-url')?.value || '';
        // Сохраняем режим object-fit для видео
        const fitFieldVideo = document.getElementById('field-fit');
        if (fitFieldVideo) newData.fit = fitFieldVideo.value || 'contain';
    }

    await updateBlockData(blockId, newData);
    closeEditModal();
}

// === ОБНОВЛЕНИЕ ДАННЫХ БЛОКА ===
async function updateBlockData(blockId, newData, reload = true) {
    try {
        const response = await fetch(`/api/blocks/${blockId}/update/`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({ data: newData })
        });

        const result = await response.json();
        if (result.success) {
            if (reload) {
                location.reload();
            }
            console.log('✓ Данные блока обновлены');
        } else {
            alert('Ошибка: ' + result.error);
        }
    } catch (error) {
        console.error('Ошибка обновления:', error);
        alert('Ошибка обновления блока: ' + error.message);
    }
}

// === ПРЕДПРОСМОТР ===
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

// === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===
function adjustInnerForMedia(blockItem) {
    // Подгоняем внутренние img/video/iframe так, чтобы они заполняли контейнер при свободном ресайзе
    if (!blockItem) return;

    // Ищем изображение внутри блока
    const img = blockItem.querySelector('img');
    if (img) {
        // Стремимся, чтобы изображение всегда оставалось в пределах контейнера
        const fit = blockItem.dataset.fit || 'contain';
        if (blockItem.dataset.proportional === 'true') {
            // Сохраняем пропорции — масштабируем, не искажая
            img.style.width = 'auto';
            img.style.height = 'auto';
            img.style.maxWidth = '100%';
            img.style.maxHeight = '100%';
            img.style.objectFit = fit;
            img.style.display = 'block';
            img.style.margin = '0 auto';
        } else {
            // Растягиваем под контейнер (может обрезаться в зависимости от object-fit)
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = fit;
            img.style.display = 'block';
            img.style.margin = '0';
        }
    }

    // Видео или iframe
    const video = blockItem.querySelector('video');
    if (video) {
        const fit = blockItem.dataset.fit || 'contain';
        if (blockItem.dataset.proportional === 'true') {
            video.style.width = 'auto';
            video.style.height = 'auto';
            video.style.maxWidth = '100%';
            video.style.maxHeight = '100%';
        } else {
            video.style.width = '100%';
            video.style.height = '100%';
        }
        video.style.objectFit = fit;
        video.style.display = 'block';
    }

    const iframe = blockItem.querySelector('iframe');
    if (iframe) {
        const fit = blockItem.dataset.fit || 'contain';
        if (blockItem.dataset.proportional === 'true') {
            iframe.style.width = 'auto';
            iframe.style.height = 'auto';
            iframe.style.maxWidth = '100%';
            iframe.style.maxHeight = '100%';
        } else {
            iframe.style.width = '100%';
            iframe.style.height = '100%';
        }
        iframe.style.objectFit = fit;
        iframe.style.display = 'block';
    }
}

function showSizeBadge(blockItem, width, height) {
    let badge = blockItem.querySelector('.size-badge');
    if (!badge) {
        badge = document.createElement('div');
        badge.className = 'size-badge';
        blockItem.appendChild(badge);
    }
    badge.textContent = width + '×' + height + ' px';
}

function removeSizeBadge(blockItem) {
    const badge = blockItem.querySelector('.size-badge');
    if (badge) badge.remove();
}

// Удаление блока (используется из шаблона через onclick)
async function deleteBlock(blockId) {
    if (!confirm('Удалить этот блок?')) return;

    try {
        const response = await fetch(`/api/blocks/${blockId}/delete/`, {
            method: 'DELETE',
            headers: { 'X-CSRFToken': getCookie('csrftoken') }
        });

        const result = await response.json();
        if (result.success) {
            const blockElement = document.querySelector(`[data-block-id="${blockId}"]`);
            if (blockElement) blockElement.remove();
            console.log('✓ Блок удалён:', blockId);
        } else {
            alert('Ошибка удаления блока: ' + (result.error || 'Неизвестная ошибка'));
        }
    } catch (error) {
        console.error('Ошибка удаления блока:', error);
        alert('Ошибка удаления блока: ' + error.message);
    }
}

// Toggle proportional flag from UI
async function toggleProportional(blockId, checked) {
    const blockElement = document.querySelector(`[data-block-id="${blockId}"]`);
    if (blockElement) {
        blockElement.dataset.proportional = checked ? 'true' : 'false';
    }

    try {
        // Получаем текущие данные и обновляем флаг
        const resp = await fetch(`/api/blocks/${blockId}/`, { method: 'GET', headers: { 'X-CSRFToken': getCookie('csrftoken') } });
        const result = await resp.json();
        if (!result.success) return;
        const currentData = result.block.data || {};
        const newData = { ...currentData, proportional: !!checked };
        await updateBlockData(blockId, newData, false);
        // Подогнать медиа-элементы немедленно
        if (blockElement) { try { adjustInnerForMedia(blockElement); } catch (e) { } }
    } catch (err) {
        console.error('toggleProportional error', err);
    }
}

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

// === СЛАЙДЕРЫ (для редактора) ===
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
