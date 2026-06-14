// ==============================================
// АДМИН-ПАНЕЛЬ ДЛЯ УПРАВЛЕНИЯ ФОТОАЛЬБОМОМ (ОПТИМИЗИРОВАННАЯ)
// ==============================================

let currentEditId = null;
let currentUserEmail = null;
let batchFiles = [];
let batchImageUrls = [];
let batchSelectMode = false;
let selectedPhotoIds = new Set();
let currentPhotosList = [];

const ADMIN_EMAILS = ['twinkjjjjkmnb@gmail.com'];

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        checkAdminAccess();
    }, 500);
});

async function checkAdminAccess() {
    const container = document.getElementById('adminContainer');
    
    if (!window.currentUser) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-lock" style="font-size: 4rem;"></i>
                <h2>Доступ запрещён</h2>
                <p>Вы не авторизованы. Войдите в аккаунт.</p>
                <button onclick="window.location.href='profile.html'" class="admin-btn" style="margin-top: 20px;">
                    <i class="fas fa-sign-in-alt"></i> Войти
                </button>
            </div>
        `;
        return;
    }
    
    currentUserEmail = window.currentUser.email;
    
    if (!ADMIN_EMAILS.includes(currentUserEmail)) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-shield-alt" style="font-size: 4rem;"></i>
                <h2>Недостаточно прав</h2>
                <p>У вас нет прав администратора.</p>
                <button onclick="window.location.href='gallery.html'" class="admin-btn" style="margin-top: 20px;">
                    <i class="fas fa-images"></i> Перейти в галерею
                </button>
            </div>
        `;
        return;
    }
    
    loadAdminPanel();
}

async function loadAdminPanel() {
    const container = document.getElementById('adminContainer');
    
    container.innerHTML = `
        <div class="admin-header">
            <h1 class="admin-title"> УПРАВЛЕНИЕ ФОТОАЛЬБОМОМ</h1>
            <div class="admin-actions">
                <button id="batchModeBtn" class="admin-btn">
                    <i class="fas fa-check-double"></i> Выбрать несколько
                </button>
                <button onclick="window.location.href='migrate_to_imgbb.html'" class="admin-btn" style="background: #2c3e2c; border-color: #ffc107;">
                    <i class="fas fa-exchange-alt"></i> Миграция в ImgBB
                </button>
                <button onclick="window.location.href='gallery.html'" class="admin-btn">
                    <i class="fas fa-eye"></i> Смотреть галерею
                </button>
                <button onclick="logoutAndRedirect()" class="admin-btn danger">
                    <i class="fas fa-sign-out-alt"></i> Выйти
                </button>
            </div>
        </div>

        <div id="batchActionsBar" class="batch-actions-bar">
            <div>
                <i class="fas fa-check-circle"></i>
                Выбрано: <span id="selectedCount" class="batch-selected-count">0</span> фото
                <button id="selectAllBtn" class="batch-select-all">
                    <i class="fas fa-square"></i> Выбрать все
                </button>
            </div>
            <div class="batch-actions-buttons">
                <button class="batch-action-btn edit" id="batchEditBtn">
                    <i class="fas fa-edit"></i> Редактировать
                </button>
                <button class="batch-action-btn delete" id="batchDeleteBtn">
                    <i class="fas fa-trash-alt"></i> Удалить
                </button>
                <button class="batch-action-btn cancel" id="batchCancelBtn">
                    <i class="fas fa-times"></i> Отменить
                </button>
            </div>
        </div>

        <div class="add-photo-form">
            <div class="form-title">
                <i class="fas fa-plus-circle"></i>
                <span id="formTitle">Добавить фото</span>
            </div>
            
            <div class="upload-methods">
                <div class="upload-method">
                    <h3><i class="fas fa-upload"></i> Загрузить с компьютера</h3>
                    <div class="file-input-wrapper">
                        <label class="file-input-label">
                            <i class="fas fa-folder-open"></i> Выбрать файл
                            <input type="file" id="fileInput" class="file-input" accept="image/jpeg,image/png,image/gif,image/webp">
                        </label>
                    </div>
                    <div id="filePreview" class="image-preview"></div>
                </div>
                
                <div class="upload-method">
                    <h3><i class="fas fa-link"></i> Ссылка на фото</h3>
                    <input type="url" id="urlInput" class="url-input" placeholder="https://example.com/photo.jpg">
                    <div id="urlPreview" class="image-preview"></div>
                </div>

                <div class="upload-method">
                    <h3><i class="fas fa-layer-group"></i> Массовая загрузка</h3>
                    <div class="file-input-wrapper">
                        <label class="file-input-label">
                            <i class="fas fa-images"></i> Выбрать несколько фото
                            <input type="file" id="batchFileInput" class="file-input" accept="image/jpeg,image/png,image/gif,image/webp" multiple>
                        </label>
                    </div>
                    <div id="batchPreview" class="batch-preview"></div>
                    <div id="uploadProgress" class="upload-progress" style="display: none;">
                        <div class="progress-bar">
                            <div class="progress-fill" id="progressFill"></div>
                        </div>
                        <span id="progressText" class="progress-text">0 / 0</span>
                    </div>
                    <button id="startBatchUpload" class="batch-upload-btn" style="display: none;">
                        <i class="fas fa-cloud-upload-alt"></i> Загрузить все фото
                    </button>
                </div>
            </div>
            
            <div class="optional-fields">
                <button class="toggle-optional" onclick="toggleOptional()">
                    <i class="fas fa-chevron-down" id="toggleIcon"></i> 
                    <span id="toggleText">Дополнительные данные (необязательно)</span>
                </button>
                <div id="optionalContent" class="optional-content">
                    <div class="form-group">
                        <label><i class="fas fa-tag"></i> Название (для массовой загрузки добавится номер)</label>
                        <input type="text" id="photoTitle" class="form-input" placeholder="Например: Шматко на съёмках">
                    </div>
                    <div class="form-group">
                        <label><i class="fas fa-align-left"></i> Описание</label>
                        <textarea id="photoDesc" class="form-textarea" placeholder="Описание фотографии..."></textarea>
                    </div>
                    <div class="form-group">
                        <label><i class="fas fa-folder"></i> Категория</label>
                        <select id="photoCategory" class="form-select">
                            <option value="">Без категории</option>
                            <option value="behind">Со съёмок</option>
                            <option value="actors">Актёры вне ролей</option>
                            <option value="spinoff">Спин-оффы</option>
                            <option value="iconic">Культовые моменты</option>
                            <option value="rare">Раритеты</option>
                            <option value="memes">Приколы</option>
                            <option value="adult">18+</option>
                            <option value="characters">Персонажи</option>
                            <option value="weapons">Оружие</option>
                            <option value="locations">Локации</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label><i class="fas fa-calendar"></i> Год</label>
                        <input type="number" id="photoYear" class="form-input" placeholder="2005">
                    </div>
                    <div class="form-group">
                        <label><i class="fas fa-map-marker-alt"></i> Место съёмки</label>
                        <input type="text" id="photoLocation" class="form-input" placeholder="Нахабино">
                    </div>
                </div>
            </div>
            
            <button onclick="savePhoto()" class="submit-btn" id="saveBtn">
                <i class="fas fa-save"></i> Добавить фото
            </button>
        </div>

        <h3 style="color: #ffd966; margin: 30px 0 15px 0;"><i class="fas fa-images"></i> Все фото</h3>
        <div id="photosList" class="photos-grid">
            <div class="loading"><i class="fas fa-spinner fa-pulse"></i> Загрузка...</div>
        </div>
    `;
    
    document.getElementById('batchModeBtn')?.addEventListener('click', toggleBatchSelectMode);
    document.getElementById('selectAllBtn')?.addEventListener('click', selectAllPhotos);
    document.getElementById('batchEditBtn')?.addEventListener('click', batchEditSelected);
    document.getElementById('batchDeleteBtn')?.addEventListener('click', batchDeleteSelected);
    document.getElementById('batchCancelBtn')?.addEventListener('click', toggleBatchSelectMode);
    
    initFileUpload();
    initUrlPreview();
    initBatchUpload();
    loadPhotos();
}

// ==============================================
// ОДИНОЧНАЯ ЗАГРУЗКА
// ==============================================

function initFileUpload() {
    const fileInput = document.getElementById('fileInput');
    if (!fileInput) return;
    
    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        if (!file.type.startsWith('image/')) {
            showToast('❌ Пожалуйста, выберите изображение');
            fileInput.value = '';
            return;
        }
        
        if (file.size > 10 * 1024 * 1024) {
            showToast('❌ Размер файла не должен превышать 10MB');
            fileInput.value = '';
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const imageUrl = e.target.result;
            const preview = document.getElementById('filePreview');
            preview.innerHTML = `<img src="${imageUrl}" alt="Preview">`;
            preview.style.display = 'block';
            window.currentImageUrl = imageUrl;
            
            const urlInput = document.getElementById('urlInput');
            if (urlInput) urlInput.value = '';
            document.getElementById('urlPreview').style.display = 'none';
        };
        reader.readAsDataURL(file);
    });
}

function initUrlPreview() {
    const urlInput = document.getElementById('urlInput');
    if (!urlInput) return;
    
    urlInput.addEventListener('input', () => {
        const url = urlInput.value.trim();
        const preview = document.getElementById('urlPreview');
        
        if (url && (url.startsWith('http') || url.startsWith('https'))) {
            preview.innerHTML = `<img src="${url}" alt="Preview" onerror="this.src='https://via.placeholder.com/200x200?text=Invalid+URL'">`;
            preview.style.display = 'block';
            window.currentImageUrl = url;
            
            const fileInput = document.getElementById('fileInput');
            if (fileInput) fileInput.value = '';
            document.getElementById('filePreview').style.display = 'none';
        } else {
            preview.style.display = 'none';
            window.currentImageUrl = null;
        }
    });
}

// ==============================================
// МАССОВАЯ ЗАГРУЗКА ФОТОГРАФИЙ (ОПТИМИЗИРОВАННАЯ)
// ==============================================

function initBatchUpload() {
    const batchInput = document.getElementById('batchFileInput');
    if (!batchInput) return;
    
    batchInput.addEventListener('change', (event) => {
        const files = Array.from(event.target.files);
        
        const imageFiles = files.filter(file => file.type.startsWith('image/'));
        
        if (imageFiles.length === 0) {
            showToast('❌ Пожалуйста, выберите изображения');
            return;
        }
        
        if (imageFiles.length > 50) {
            showToast('⚠️ Максимум 50 фото за раз');
            return;
        }
        
        batchFiles = imageFiles;
        batchImageUrls = [];
        
        const previewContainer = document.getElementById('batchPreview');
        previewContainer.innerHTML = '';
        
        imageFiles.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                batchImageUrls[index] = e.target.result;
                
                const previewItem = document.createElement('div');
                previewItem.className = 'batch-preview-item';
                previewItem.innerHTML = `
                    <img src="${e.target.result}" alt="Preview">
                    <div class="remove-preview" data-index="${index}">
                        <i class="fas fa-times"></i>
                    </div>
                `;
                previewContainer.appendChild(previewItem);
                
                previewItem.querySelector('.remove-preview').addEventListener('click', (e) => {
                    e.stopPropagation();
                    removeFromBatch(index);
                });
            };
            reader.readAsDataURL(file);
        });
        
        const uploadBtn = document.getElementById('startBatchUpload');
        if (uploadBtn) uploadBtn.style.display = 'flex';
        
        const progressDiv = document.getElementById('uploadProgress');
        if (progressDiv) progressDiv.style.display = 'none';
    });
    
    const startBtn = document.getElementById('startBatchUpload');
    if (startBtn) {
        startBtn.addEventListener('click', startBatchUpload);
    }
}

function removeFromBatch(indexToRemove) {
    batchFiles = batchFiles.filter((_, idx) => idx !== indexToRemove);
    batchImageUrls = batchImageUrls.filter((_, idx) => idx !== indexToRemove);
    
    const previewContainer = document.getElementById('batchPreview');
    previewContainer.innerHTML = '';
    
    batchFiles.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const previewItem = document.createElement('div');
            previewItem.className = 'batch-preview-item';
            previewItem.innerHTML = `
                <img src="${e.target.result}" alt="Preview">
                <div class="remove-preview" data-index="${index}">
                    <i class="fas fa-times"></i>
                </div>
            `;
            previewContainer.appendChild(previewItem);
            
            previewItem.querySelector('.remove-preview').addEventListener('click', (e) => {
                e.stopPropagation();
                removeFromBatch(index);
            });
        };
        reader.readAsDataURL(file);
    });
    
    if (batchFiles.length === 0) {
        const uploadBtn = document.getElementById('startBatchUpload');
        if (uploadBtn) uploadBtn.style.display = 'none';
    }
}

async function startBatchUpload() {
    if (batchFiles.length === 0) {
        showToast('❌ Нет фото для загрузки');
        return;
    }
    
    const commonData = {
        title: document.getElementById('photoTitle')?.value.trim() || '',
        desc: document.getElementById('photoDesc')?.value.trim() || '',
        category: document.getElementById('photoCategory')?.value || '',
        year: document.getElementById('photoYear')?.value ? parseInt(document.getElementById('photoYear').value) : null,
        location: document.getElementById('photoLocation')?.value.trim() || ''
    };
    
    const progressDiv = document.getElementById('uploadProgress');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const uploadBtn = document.getElementById('startBatchUpload');
    
    progressDiv.style.display = 'block';
    uploadBtn.disabled = true;
    uploadBtn.style.opacity = '0.5';
    
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < batchFiles.length; i++) {
        const imageUrl = batchImageUrls[i];
        
        const percent = ((i + 1) / batchFiles.length) * 100;
        progressFill.style.width = `${percent}%`;
        progressText.innerText = `Загрузка: ${i + 1} из ${batchFiles.length}`;
        
        try {
            const photoData = {
                image: imageUrl,
                createdAt: Date.now(),
                createdBy: currentUserEmail,
                updatedAt: Date.now(),
                updatedBy: currentUserEmail
            };
            
            if (commonData.title) {
                photoData.title = `${commonData.title} (${i + 1})`;
            }
            if (commonData.desc) photoData.desc = commonData.desc;
            if (commonData.category) photoData.category = commonData.category;
            if (commonData.year) photoData.year = commonData.year;
            if (commonData.location) photoData.location = commonData.location;
            
            const newRef = db.ref('gallery').push();
            const photoId = newRef.key;
            photoData.id = photoId;
            await newRef.set(photoData);
            
            // ОПТИМИЗАЦИЯ: добавляем фото в начало списка БЕЗ полной перерисовки
            const newPhoto = { id: photoId, ...photoData };
            currentPhotosList.unshift(newPhoto);
            
            // Добавляем карточку в DOM без перерисовки всего списка
            addPhotoToDOM(newPhoto, true);
            
            successCount++;
            await new Promise(resolve => setTimeout(resolve, 50));
            
        } catch (error) {
            console.error(`Ошибка загрузки:`, error);
            failCount++;
        }
    }
    
    progressFill.style.width = '100%';
    progressText.innerText = `Готово! ${successCount} загружено, ${failCount} ошибок`;
    
    showToast(`✅ Загружено ${successCount} фото из ${batchFiles.length}`);
    
    // Обновляем галерею только один раз в конце
    await forceGalleryUpdate();
    
    setTimeout(() => {
        resetBatchUpload();
    }, 2000);
}

// Функция для добавления одного фото в DOM
function addPhotoToDOM(photo, isNew = true) {
    const container = document.getElementById('photosList');
    if (!container) return;
    
    // Убираем сообщение "Нет фотографий" если оно есть
    if (container.querySelector('.empty-state')) {
        renderPhotosList(currentPhotosList);
        return;
    }
    
    const isSelected = selectedPhotoIds.has(photo.id);
    const selectedClass = isSelected ? 'selected' : '';
    const selectModeAttr = batchSelectMode ? `onclick="toggleSelectPhoto('${photo.id}')"` : '';
    
    const photoHtml = `
        <div class="admin-photo-card ${selectedClass}" data-id="${photo.id}" ${selectModeAttr}>
            ${batchSelectMode ? `<div class="checkbox-indicator"><i class="fas ${isSelected ? 'fa-check-circle' : 'fa-circle'}"></i></div>` : ''}
            <img src="${photo.image}" alt="Фото" onerror="this.src='https://via.placeholder.com/200x200?text=Error'">
            <div class="admin-photo-actions">
                <button class="edit-btn" onclick="event.stopPropagation(); editPhoto('${photo.id}')" title="Редактировать">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="delete-btn" onclick="event.stopPropagation(); deletePhoto('${photo.id}')" title="Удалить">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
            <div class="admin-photo-info">
                ${photo.title ? `<span style="color:#ffd966">${escapeHtml(photo.title.substring(0, 30))}</span><br>` : ''}
                ${photo.category ? `<span style="color:#8aa07a"><i class="fas fa-folder"></i> ${escapeHtml(photo.category)}</span><br>` : ''}
                ${photo.year ? `<span><i class="far fa-calendar-alt"></i> ${photo.year}</span>` : ''}
                ${!photo.title && !photo.year && !photo.category ? '<span style="color:#8aa07a">Нет данных</span>' : ''}
            </div>
        </div>
    `;
    
    if (isNew) {
        container.insertAdjacentHTML('afterbegin', photoHtml);
    } else {
        container.insertAdjacentHTML('beforeend', photoHtml);
    }
}

function resetBatchUpload() {
    batchFiles = [];
    batchImageUrls = [];
    
    const batchInput = document.getElementById('batchFileInput');
    if (batchInput) batchInput.value = '';
    
    const previewContainer = document.getElementById('batchPreview');
    if (previewContainer) previewContainer.innerHTML = '';
    
    const progressDiv = document.getElementById('uploadProgress');
    if (progressDiv) progressDiv.style.display = 'none';
    
    const uploadBtn = document.getElementById('startBatchUpload');
    if (uploadBtn) {
        uploadBtn.style.display = 'none';
        uploadBtn.disabled = false;
        uploadBtn.style.opacity = '1';
    }
}

// ==============================================
// ГРУППОВОЕ ВЫДЕЛЕНИЕ, РЕДАКТИРОВАНИЕ И УДАЛЕНИЕ
// ==============================================

function toggleBatchSelectMode() {
    batchSelectMode = !batchSelectMode;
    
    if (!batchSelectMode) {
        selectedPhotoIds.clear();
        const grid = document.getElementById('photosList');
        if (grid) grid.classList.remove('select-mode');
        document.getElementById('batchActionsBar')?.classList.remove('show');
        const batchBtn = document.getElementById('batchModeBtn');
        if (batchBtn) batchBtn.classList.remove('active');
    } else {
        const grid = document.getElementById('photosList');
        if (grid) grid.classList.add('select-mode');
        updateBatchActionsBar();
        const batchBtn = document.getElementById('batchModeBtn');
        if (batchBtn) batchBtn.classList.add('active');
    }
    
    renderPhotosList(currentPhotosList);
}

function toggleSelectPhoto(photoId) {
    if (!batchSelectMode) return;
    
    if (selectedPhotoIds.has(photoId)) {
        selectedPhotoIds.delete(photoId);
    } else {
        selectedPhotoIds.add(photoId);
    }
    
    updateBatchActionsBar();
    
    const card = document.querySelector(`.admin-photo-card[data-id="${photoId}"]`);
    if (card) {
        if (selectedPhotoIds.has(photoId)) {
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
    }
}

function selectAllPhotos() {
    if (selectedPhotoIds.size === currentPhotosList.length && currentPhotosList.length > 0) {
        selectedPhotoIds.clear();
    } else {
        currentPhotosList.forEach(photo => {
            selectedPhotoIds.add(photo.id);
        });
    }
    
    updateBatchActionsBar();
    renderPhotosList(currentPhotosList);
}

function updateBatchActionsBar() {
    const bar = document.getElementById('batchActionsBar');
    const countSpan = document.getElementById('selectedCount');
    const selectAllBtn = document.getElementById('selectAllBtn');
    
    if (!bar) return;
    
    const count = selectedPhotoIds.size;
    
    if (count > 0 && batchSelectMode) {
        bar.classList.add('show');
        if (countSpan) countSpan.textContent = count;
        if (selectAllBtn) {
            const allSelected = count === currentPhotosList.length && currentPhotosList.length > 0;
            selectAllBtn.innerHTML = allSelected ? 
                '<i class="fas fa-check-square"></i> Снять все' : 
                '<i class="fas fa-square"></i> Выбрать все';
        }
    } else {
        bar.classList.remove('show');
    }
}

function batchEditSelected() {
    if (selectedPhotoIds.size === 0) {
        showToast('❌ Не выбрано ни одного фото');
        return;
    }
    
    const modalHtml = `
        <div id="batchEditModal" class="batch-edit-modal">
            <div class="modal-content">
                <h3 style="color: #ffd966; margin-bottom: 20px;">
                    <i class="fas fa-edit"></i> Массовое редактирование
                </h3>
                <p style="margin-bottom: 20px;">Выбрано фото: <strong>${selectedPhotoIds.size}</strong></p>
                
                <div class="form-group">
                    <label><i class="fas fa-tag"></i> Название</label>
                    <input type="text" id="batchTitle" class="form-input" placeholder="Оставить без изменений">
                </div>
                
                <div class="form-group">
                    <label><i class="fas fa-align-left"></i> Описание</label>
                    <textarea id="batchDesc" class="form-textarea" placeholder="Оставить без изменений"></textarea>
                </div>
                
                <div class="form-group">
                    <label><i class="fas fa-folder"></i> Категория</label>
                    <select id="batchCategory" class="form-select">
                        <option value="">Не изменять</option>
                        <option value="behind">Со съёмок</option>
                        <option value="actors">Актёры вне ролей</option>
                        <option value="spinoff">Спин-оффы</option>
                        <option value="iconic">Культовые моменты</option>
                        <option value="rare">Раритеты</option>
                        <option value="memes">Приколы</option>
                        <option value="adult">18+</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label><i class="fas fa-calendar"></i> Год</label>
                    <input type="number" id="batchYear" class="form-input" placeholder="Оставить без изменений">
                </div>
                
                <div class="form-group">
                    <label><i class="fas fa-map-marker-alt"></i> Место съёмки</label>
                    <input type="text" id="batchLocation" class="form-input" placeholder="Оставить без изменений">
                </div>
                
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button onclick="confirmBatchEdit()" class="submit-btn" style="margin: 0;">
                        <i class="fas fa-save"></i> Применить ко всем
                    </button>
                    <button onclick="closeBatchEditModal()" class="admin-btn">
                        <i class="fas fa-times"></i> Отмена
                    </button>
                </div>
            </div>
        </div>
    `;
    
    const oldModal = document.getElementById('batchEditModal');
    if (oldModal) oldModal.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function closeBatchEditModal() {
    const modal = document.getElementById('batchEditModal');
    if (modal) modal.remove();
}

async function confirmBatchEdit() {
    const batchTitle = document.getElementById('batchTitle')?.value.trim();
    const batchDesc = document.getElementById('batchDesc')?.value.trim();
    const batchCategory = document.getElementById('batchCategory')?.value;
    const batchYear = document.getElementById('batchYear')?.value;
    const batchLocation = document.getElementById('batchLocation')?.value.trim();
    
    const updateData = {};
    if (batchTitle) updateData.title = batchTitle;
    if (batchDesc) updateData.desc = batchDesc;
    if (batchCategory) updateData.category = batchCategory;
    if (batchYear) updateData.year = parseInt(batchYear);
    if (batchLocation) updateData.location = batchLocation;
    
    if (Object.keys(updateData).length === 0) {
        showToast('❌ Ни одно поле не заполнено для обновления');
        return;
    }
    
    updateData.updatedAt = Date.now();
    updateData.updatedBy = currentUserEmail;
    
    closeBatchEditModal();
    
    showToast(`🔄 Обновление ${selectedPhotoIds.size} фото...`);
    
    let successCount = 0;
    let failCount = 0;
    
    for (const photoId of selectedPhotoIds) {
        try {
            await db.ref(`gallery/${photoId}`).update(updateData);
            successCount++;
        } catch (error) {
            console.error(`Ошибка обновления ${photoId}:`, error);
            failCount++;
        }
    }
    
    showToast(`✅ Обновлено: ${successCount}, ошибок: ${failCount}`);
    
    await loadPhotos();
    await forceGalleryUpdate();
    toggleBatchSelectMode();
}

async function batchDeleteSelected() {
    if (selectedPhotoIds.size === 0) {
        showToast('❌ Не выбрано ни одного фото');
        return;
    }
    
    const confirmed = confirm(`Вы уверены, что хотите удалить ${selectedPhotoIds.size} фото? Это действие необратимо!`);
    if (!confirmed) return;
    
    showToast(`🔄 Удаление ${selectedPhotoIds.size} фото...`);
    
    let successCount = 0;
    let failCount = 0;
    
    for (const photoId of selectedPhotoIds) {
        try {
            await db.ref(`gallery/${photoId}`).remove();
            successCount++;
        } catch (error) {
            console.error(`Ошибка удаления ${photoId}:`, error);
            failCount++;
        }
    }
    
    showToast(`✅ Удалено: ${successCount}, ошибок: ${failCount}`);
    
    await loadPhotos();
    await forceGalleryUpdate();
    toggleBatchSelectMode();
}

// ==============================================
// ОБЩИЕ ФУНКЦИИ
// ==============================================

function toggleOptional() {
    const content = document.getElementById('optionalContent');
    const icon = document.getElementById('toggleIcon');
    const text = document.getElementById('toggleText');
    
    if (content.classList.contains('show')) {
        content.classList.remove('show');
        icon.className = 'fas fa-chevron-down';
        text.innerText = 'Дополнительные данные (необязательно)';
    } else {
        content.classList.add('show');
        icon.className = 'fas fa-chevron-up';
        text.innerText = 'Скрыть дополнительные данные';
    }
}

async function savePhoto() {
    const imageUrl = window.currentImageUrl;
    
    if (!imageUrl) {
        showToast('❌ Выберите изображение или введите ссылку');
        return;
    }
    
    const photoData = {
        image: imageUrl,
        updatedAt: Date.now(),
        updatedBy: currentUserEmail
    };
    
    const title = document.getElementById('photoTitle')?.value.trim();
    if (title && title !== '') photoData.title = title;
    
    const desc = document.getElementById('photoDesc')?.value.trim();
    if (desc && desc !== '') photoData.desc = desc;
    
    const category = document.getElementById('photoCategory')?.value;
    if (category && category !== '' && category !== 'other') photoData.category = category;
    
    const year = document.getElementById('photoYear')?.value;
    if (year && year !== '' && year >= 2004 && year <= 2013) photoData.year = parseInt(year);
    
    const location = document.getElementById('photoLocation')?.value.trim();
    if (location && location !== '') photoData.location = location;
    
    try {
        if (currentEditId) {
            await db.ref(`gallery/${currentEditId}`).update(photoData);
            showToast('✅ Фото обновлено');
            await loadPhotos();
        } else {
            const newRef = db.ref('gallery').push();
            photoData.id = newRef.key;
            photoData.createdAt = Date.now();
            photoData.createdBy = currentUserEmail;
            await newRef.set(photoData);
            
            // Оптимизация: добавляем фото в начало списка без полной перерисовки
            const newPhoto = { id: newRef.key, ...photoData };
            currentPhotosList.unshift(newPhoto);
            addPhotoToDOM(newPhoto, true);
            
            showToast('✅ Фото добавлено');
        }
        
        await forceGalleryUpdate();
        resetForm();
        
    } catch (error) {
        console.error('Ошибка:', error);
        showToast('❌ Ошибка сохранения: ' + error.message);
    }
}

async function forceGalleryUpdate() {
    try {
        const snapshot = await db.ref('gallery').once('value');
        const allPhotos = snapshot.val() || {};
        
        localStorage.setItem('galleryData', JSON.stringify(allPhotos));
        localStorage.setItem('galleryTimestamp', Date.now().toString());
        localStorage.setItem('forceGalleryReload', Date.now().toString());
        
        console.log('✅ Галерея принудительно обновлена');
        
        if (typeof window.loadGalleryFromFirebase === 'function') {
            window.loadGalleryFromFirebase();
        }
        
    } catch (e) {
        console.error('Ошибка:', e);
    }
}

async function editPhoto(id) {
    if (batchSelectMode) {
        toggleBatchSelectMode();
    }
    
    try {
        const snapshot = await db.ref(`gallery/${id}`).once('value');
        const photo = snapshot.val();
        
        if (!photo) {
            showToast('❌ Фото не найдено');
            return;
        }
        
        currentEditId = id;
        
        document.getElementById('formTitle').innerHTML = '<i class="fas fa-edit"></i> Редактировать фото';
        document.getElementById('saveBtn').innerHTML = '<i class="fas fa-save"></i> Обновить фото';
        
        window.currentImageUrl = photo.image;
        
        const filePreview = document.getElementById('filePreview');
        filePreview.innerHTML = `<img src="${photo.image}" alt="Preview">`;
        filePreview.style.display = 'block';
        
        const urlInput = document.getElementById('urlInput');
        if (urlInput) urlInput.value = photo.image;
        
        document.getElementById('photoTitle').value = photo.title || '';
        document.getElementById('photoDesc').value = photo.desc || '';
        document.getElementById('photoCategory').value = photo.category || '';
        document.getElementById('photoYear').value = photo.year || '';
        document.getElementById('photoLocation').value = photo.location || '';
        
        if (photo.title || photo.desc || photo.category || photo.year || photo.location) {
            const content = document.getElementById('optionalContent');
            if (!content.classList.contains('show')) {
                toggleOptional();
            }
        }
        
        showToast('✏️ Режим редактирования');
        
    } catch (error) {
        console.error('Ошибка:', error);
        showToast('❌ Ошибка загрузки');
    }
}

async function deletePhoto(id) {
    if (!confirm('Удалить это фото?')) return;
    
    try {
        await db.ref(`gallery/${id}`).remove();
        
        // Оптимизация: удаляем фото из списка без перерисовки
        currentPhotosList = currentPhotosList.filter(photo => photo.id !== id);
        const card = document.querySelector(`.admin-photo-card[data-id="${id}"]`);
        if (card) card.remove();
        
        showToast('✅ Фото удалено');
        await forceGalleryUpdate();
        if (currentEditId === id) resetForm();
        
        // Если список стал пустым, показываем сообщение
        if (currentPhotosList.length === 0) {
            const container = document.getElementById('photosList');
            if (container) {
                container.innerHTML = '<div class="empty-state"><i class="fas fa-camera"></i><p>Нет фотографий. Добавьте первую!</p></div>';
            }
        }
        
    } catch (error) {
        console.error('Ошибка:', error);
        showToast('❌ Ошибка удаления');
    }
}

async function loadPhotos() {
    const container = document.getElementById('photosList');
    if (!container) return;
    
    container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-pulse"></i> Загрузка...</div>';
    
    try {
        const snapshot = await db.ref('gallery').once('value');
        const photos = snapshot.val() || {};
        
        currentPhotosList = Object.entries(photos).map(([id, data]) => ({ id, ...data })).reverse();
        
        renderPhotosList(currentPhotosList);
        
    } catch (error) {
        console.error('Ошибка:', error);
        container.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Ошибка загрузки</p></div>';
    }
}

function renderPhotosList(photosArray) {
    const container = document.getElementById('photosList');
    if (!container) return;
    
    if (photosArray.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-camera"></i><p>Нет фотографий. Добавьте первую!</p></div>';
        return;
    }
    
    let html = '';
    photosArray.forEach(photo => {
        const isSelected = selectedPhotoIds.has(photo.id);
        const selectedClass = isSelected ? 'selected' : '';
        const selectModeAttr = batchSelectMode ? `onclick="toggleSelectPhoto('${photo.id}')"` : '';
        
        html += `
            <div class="admin-photo-card ${selectedClass}" data-id="${photo.id}" ${selectModeAttr}>
                ${batchSelectMode ? `<div class="checkbox-indicator"><i class="fas ${isSelected ? 'fa-check-circle' : 'fa-circle'}"></i></div>` : ''}
                <img src="${photo.image}" alt="Фото" onerror="this.src='https://via.placeholder.com/200x200?text=Error'">
                <div class="admin-photo-actions">
                    <button class="edit-btn" onclick="event.stopPropagation(); editPhoto('${photo.id}')" title="Редактировать">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="delete-btn" onclick="event.stopPropagation(); deletePhoto('${photo.id}')" title="Удалить">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
                <div class="admin-photo-info">
                    ${photo.title ? `<span style="color:#ffd966">${escapeHtml(photo.title.substring(0, 30))}</span><br>` : ''}
                    ${photo.category ? `<span style="color:#8aa07a"><i class="fas fa-folder"></i> ${escapeHtml(photo.category)}</span><br>` : ''}
                    ${photo.year ? `<span><i class="far fa-calendar-alt"></i> ${photo.year}</span>` : ''}
                    ${!photo.title && !photo.year && !photo.category ? '<span style="color:#8aa07a">Нет данных</span>' : ''}
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function resetForm() {
    currentEditId = null;
    window.currentImageUrl = null;
    
    document.getElementById('formTitle').innerHTML = '<i class="fas fa-plus-circle"></i> Добавить фото';
    document.getElementById('saveBtn').innerHTML = '<i class="fas fa-save"></i> Добавить фото';
    
    document.getElementById('fileInput').value = '';
    document.getElementById('filePreview').innerHTML = '';
    document.getElementById('filePreview').style.display = 'none';
    
    document.getElementById('urlInput').value = '';
    document.getElementById('urlPreview').innerHTML = '';
    document.getElementById('urlPreview').style.display = 'none';
    
    document.getElementById('photoTitle').value = '';
    document.getElementById('photoDesc').value = '';
    document.getElementById('photoCategory').value = '';
    document.getElementById('photoYear').value = '';
    document.getElementById('photoLocation').value = '';
    
    resetBatchUpload();
    
    const content = document.getElementById('optionalContent');
    if (content.classList.contains('show')) {
        toggleOptional();
    }
}

async function logoutAndRedirect() {
    await auth.signOut();
    window.location.href = 'index.html';
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => m === '&' ? '&amp;' : m === '<' ? '&lt;' : '&gt;');
}

function showToast(message) {
    let toast = document.getElementById('adminToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'adminToast';
        toast.className = 'toast-message';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && batchSelectMode) {
        toggleBatchSelectMode();
    }
});
