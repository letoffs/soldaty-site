// ==============================================
// АДМИН-ПАНЕЛЬ ДЛЯ УПРАВЛЕНИЯ ФОТОАЛЬБОМОМ
// ==============================================

let currentEditId = null;
let currentUserEmail = null;
let batchFiles = [];
let batchImageUrls = [];

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
            <h1 class="admin-title"><i class="fas fa-crown"></i> УПРАВЛЕНИЕ ФОТОАЛЬБОМОМ</h1>
            <div class="admin-actions">
                <button onclick="window.location.href='gallery.html'" class="admin-btn">
                    <i class="fas fa-eye"></i> Смотреть галерею
                </button>
                <button onclick="logoutAndRedirect()" class="admin-btn danger">
                    <i class="fas fa-sign-out-alt"></i> Выйти
                </button>
            </div>
        </div>

        <div class="add-photo-form">
            <div class="form-title">
                <i class="fas fa-plus-circle"></i>
                <span id="formTitle">Добавить фото</span>
            </div>
            
            <div class="upload-methods">
                <!-- Способ 1: Одиночная загрузка с компьютера -->
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
                
                <!-- Способ 2: Ссылка на фото -->
                <div class="upload-method">
                    <h3><i class="fas fa-link"></i> Ссылка на фото</h3>
                    <input type="url" id="urlInput" class="url-input" placeholder="https://example.com/photo.jpg">
                    <div id="urlPreview" class="image-preview"></div>
                </div>

                <!-- Способ 3: Массовая загрузка -->
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
// МАССОВАЯ ЗАГРУЗКА ФОТОГРАФИЙ
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
            photoData.id = newRef.key;
            await newRef.set(photoData);
            
            successCount++;
            await new Promise(resolve => setTimeout(resolve, 100));
            
        } catch (error) {
            console.error(`Ошибка загрузки:`, error);
            failCount++;
        }
    }
    
    progressFill.style.width = '100%';
    progressText.innerText = `Готово! ${successCount} загружено, ${failCount} ошибок`;
    
    showToast(`✅ Загружено ${successCount} фото из ${batchFiles.length}`);
    
    await loadPhotos();
    await forceGalleryUpdate();
    
    setTimeout(() => {
        resetBatchUpload();
    }, 2000);
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
        } else {
            const newRef = db.ref('gallery').push();
            photoData.id = newRef.key;
            photoData.createdAt = Date.now();
            photoData.createdBy = currentUserEmail;
            await newRef.set(photoData);
            showToast('✅ Фото добавлено');
        }
        
        await loadPhotos();
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
        showToast('✅ Фото удалено');
        await loadPhotos();
        await forceGalleryUpdate();
        if (currentEditId === id) resetForm();
        
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
        
        const photosArray = Object.entries(photos).map(([id, data]) => ({ id, ...data })).reverse();
        
        if (photosArray.length === 0) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-camera"></i><p>Нет фотографий. Добавьте первую!</p></div>';
            return;
        }
        
        let html = '';
        photosArray.forEach(photo => {
            html += `
                <div class="admin-photo-card">
                    <img src="${photo.image}" alt="Фото" onerror="this.src='https://via.placeholder.com/200x200?text=Error'">
                    <div class="admin-photo-actions">
                        <button class="edit-btn" onclick="editPhoto('${photo.id}')" title="Редактировать">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="delete-btn" onclick="deletePhoto('${photo.id}')" title="Удалить">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                    <div class="admin-photo-info">
                        ${photo.title ? `<span style="color:#ffd966">${escapeHtml(photo.title.substring(0, 30))}</span><br>` : ''}
                        ${photo.year ? `<span><i class="far fa-calendar-alt"></i> ${photo.year}</span>` : ''}
                        ${!photo.title && !photo.year ? '<span style="color:#8aa07a">Нет данных</span>' : ''}
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Ошибка:', error);
        container.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Ошибка загрузки</p></div>';
    }
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
