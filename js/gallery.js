// ==============================================
// ГАЛЕРЕЯ — С БОКОВОЙ ПАНЕЛЬЮ И НАВИГАЦИЕЙ
// ==============================================

let galleryData = [];
let currentCategory = 'all';
let currentPhotoIndex = 0;
let currentFilteredPhotos = [];

// Категории как в видео
const categories = [
    { id: "all", name: "Все фото", icon: "fas fa-images", filter: null },
    { id: "behind", name: "Со съёмок", icon: "fas fa-video", filter: p => p.category === "behind" },
    { id: "actors", name: "Актёры", icon: "fas fa-user", filter: p => p.category === "actors" },
    { id: "spinoff", name: "Спин-оффы", icon: "fas fa-tv", filter: p => p.category === "spinoff" },
    { id: "iconic", name: "Моменты", icon: "fas fa-star", filter: p => p.category === "iconic" },
    { id: "rare", name: "Раритеты", icon: "fas fa-camera-retro", filter: p => p.category === "rare" },
    { id: "memes", name: "Приколы", icon: "fas fa-laugh", filter: p => p.category === "memes" },
    { id: "adult", name: "18+", icon: "fas fa-lock", filter: p => p.category === "adult" },
    { id: "posters", name: "Постеры", icon: "fas fa-image", filter: p => p.category === "posters" }
];

let isAdultVerified = false;

// ==============================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ==============================================
function showToastMessage(message) {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast-message';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2500);
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => m === '&' ? '&amp;' : m === '<' ? '&lt;' : '&gt;');
}

// ==============================================
// ПРОВЕРКА ВОЗРАСТА
// ==============================================
function checkAdultStatus() {
    const adultVerified = localStorage.getItem('galleryAdultVerified');
    if (adultVerified === 'true') {
        isAdultVerified = true;
    }
}

function showAgeVerificationModal(callback) {
    let ageModal = document.getElementById('ageVerificationModal');
    if (!ageModal) {
        ageModal = document.createElement('div');
        ageModal.id = 'ageVerificationModal';
        ageModal.className = 'modal age-verification-modal';
        ageModal.innerHTML = `
            <div class="modal-content age-verification-content">
                <div class="age-verification-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3>Внимание! Контент 18+</h3>
                <p>Эти фотографии содержат материалы, которые могут быть неуместны для лиц младше 18 лет.</p>
                <p>Курение, алкоголь, нецензурная лексика и армейский юмор.</p>
                <div class="age-verification-buttons">
                    <button id="ageConfirmBtn" class="age-confirm-btn">
                        <i class="fas fa-check-circle"></i> Мне есть 18 лет
                    </button>
                    <button id="ageCancelBtn" class="age-cancel-btn">
                        <i class="fas fa-times-circle"></i> Меньше 18 лет
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(ageModal);
    }
    
    ageModal.style.display = 'flex';
    
    const confirmBtn = document.getElementById('ageConfirmBtn');
    const cancelBtn = document.getElementById('ageCancelBtn');
    
    const onConfirm = () => {
        ageModal.style.display = 'none';
        localStorage.setItem('galleryAdultVerified', 'true');
        isAdultVerified = true;
        renderGallery();
        if (callback) callback();
    };
    
    const onCancel = () => {
        ageModal.style.display = 'none';
        showToastMessage('⛔ Доступ запрещён. Контент 18+');
        currentCategory = 'all';
        renderCategories();
        renderGallery();
    };
    
    const newConfirm = confirmBtn.cloneNode(true);
    const newCancel = cancelBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirm, confirmBtn);
    cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);
    
    newConfirm.addEventListener('click', onConfirm);
    newCancel.addEventListener('click', onCancel);
    
    ageModal.onclick = (e) => {
        if (e.target === ageModal) onCancel();
    };
}

// ==============================================
// ЗАГРУЗКА ДАННЫХ ИЗ FIREBASE
// ==============================================
function checkForUpdates() {
    const lastUpdate = localStorage.getItem('galleryTimestamp');
    const lastProcessed = sessionStorage.getItem('lastProcessedTimestamp');
    
    if (lastUpdate && lastUpdate !== lastProcessed) {
        sessionStorage.setItem('lastProcessedTimestamp', lastUpdate);
        console.log('🔄 Обнаружено обновление, перезагружаем...');
        loadGalleryFromFirebase();
    }
}

async function loadGalleryFromFirebase() {
    const container = document.getElementById('galleryGrid');
    if (!container) return;
    
    if (galleryData.length === 0) {
        container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-pulse"></i> Загрузка...</div>';
    }
    
    try {
        const snapshot = await db.ref('gallery').once('value');
        const photos = snapshot.val() || {};
        
        galleryData = Object.entries(photos).map(([id, data]) => ({ id, ...data })).reverse();
        
        console.log('✅ Загружено фото:', galleryData.length);
        
        renderCategories();
        renderGallery();
        
    } catch (error) {
        console.error('Ошибка:', error);
        container.innerHTML = '<div class="empty-gallery"><i class="fas fa-exclamation-triangle"></i><p>Ошибка загрузки</p></div>';
    }
}

// ==============================================
// ОТРИСОВКА КАТЕГОРИЙ
// ==============================================
function renderCategories() {
    const container = document.getElementById('categoryList');
    if (!container) return;
    
    let html = '';
    categories.forEach(cat => {
        let count = 0;
        if (cat.filter) {
            count = galleryData.filter(cat.filter).length;
        } else {
            count = galleryData.length;
        }
        
        html += `
            <div class="category-item ${currentCategory === cat.id ? 'active' : ''}" data-category="${cat.id}">
                <i class="${cat.icon}"></i>
                <span class="category-name">${cat.name}</span>
                <span class="category-count">${count}</span>
            </div>
        `;
    });
    container.innerHTML = html;
    
    document.querySelectorAll('.category-item').forEach(item => {
        item.addEventListener('click', () => {
            const catId = item.dataset.category;
            if (catId) {
                currentCategory = catId;
                renderCategories();
                renderGallery();
            }
        });
    });
}

// ==============================================
// ПОЛУЧЕНИЕ ОТФИЛЬТРОВАННЫХ ФОТО
// ==============================================
function getCurrentFilteredPhotos() {
    let filtered = galleryData;
    const cat = categories.find(c => c.id === currentCategory);
    if (cat && cat.filter) {
        filtered = galleryData.filter(cat.filter);
    }
    return filtered;
}

// ==============================================
// ОТРИСОВКА ГАЛЕРЕИ
// ==============================================
function renderGallery() {
    const container = document.getElementById('galleryGrid');
    const countSpan = document.getElementById('galleryCount');
    const titleSpan = document.querySelector('#currentCategoryTitle span');
    
    if (!container) return;
    
    const currentCat = categories.find(c => c.id === currentCategory);
    if (titleSpan && currentCat) titleSpan.innerText = currentCat.name;
    
    let filtered = getCurrentFilteredPhotos();
    
    if (countSpan) {
        countSpan.innerHTML = `<i class="fas fa-camera"></i> ${filtered.length} фото`;
    }
    
    if (currentCategory === 'adult' && !isAdultVerified) {
        container.innerHTML = `
            <div class="empty-gallery" style="cursor: pointer;" onclick="showAgeVerificationModal()">
                <i class="fas fa-lock" style="font-size: 4rem; color: #ff4444;"></i>
                <p style="font-size: 1.2rem; margin-top: 15px;">🔞 Контент 18+</p>
                <p>Для просмотра подтвердите свой возраст</p>
                <button class="verify-age-btn" onclick="showAgeVerificationModal()">Подтвердить возраст</button>
            </div>
        `;
        return;
    }
    
    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-gallery"><i class="fas fa-camera"></i><p>Фотографий в этой категории пока нет</p></div>';
        return;
    }
    
    let html = '';
    filtered.forEach(photo => {
        let shortTitle = photo.title || '';
        if (shortTitle.length > 25) shortTitle = shortTitle.substring(0, 22) + '...';
        
        const ageBadge = (photo.category === 'adult' || photo.is18Plus) ? '<span class="age-badge">🔞 18+</span>' : '';
        const blurClass = (photo.category === 'adult' || photo.is18Plus) && !isAdultVerified ? 'blurred-thumb' : '';
        const blurOverlay = (photo.category === 'adult' || photo.is18Plus) && !isAdultVerified ? 
            '<div class="blur-overlay"><i class="fas fa-lock"></i> Подтвердите возраст</div>' : '';
        
        html += `
            <div class="gallery-card" data-photo-id="${photo.id}" data-photo-index="${filtered.indexOf(photo)}">
                <div class="gallery-image ${blurClass}">
                    <img src="${photo.image}" alt="Фото" loading="lazy" onerror="this.src='https://via.placeholder.com/400x400?text=Error'">
                    <div class="image-overlay">
                        <div class="zoom-icon"><i class="fas fa-search-plus"></i></div>
                    </div>
                    ${ageBadge}
                    ${blurOverlay}
                </div>
                <div class="gallery-info">
                    ${photo.title ? `<div class="gallery-title" title="${escapeHtml(photo.title)}">${escapeHtml(shortTitle)}</div>` : ''}
                    ${photo.desc ? `<div class="gallery-desc">${escapeHtml(photo.desc.substring(0, 60))}${photo.desc.length > 60 ? '...' : ''}</div>` : ''}
                    <div class="gallery-meta">
                        ${photo.year ? `<span><i class="far fa-calendar-alt"></i> ${photo.year}</span>` : ''}
                        ${photo.location ? `<span><i class="fas fa-map-marker-alt"></i> ${escapeHtml(photo.location.substring(0, 20))}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
    
    // Добавляем обработчики кликов на карточки
    document.querySelectorAll('.gallery-card').forEach(card => {
        card.addEventListener('click', (e) => {
            const photoId = card.dataset.photoId;
            const photoIndex = parseInt(card.dataset.photoIndex);
            openPhoto(photoId, photoIndex);
        });
    });
}

// ==============================================
// ОТКРЫТИЕ ФОТО С НАВИГАЦИЕЙ
// ==============================================
function openPhoto(id, index) {
    const photo = galleryData.find(p => p.id === id);
    if (!photo) return;
    
    if ((photo.category === 'adult' || photo.is18Plus) && !isAdultVerified) {
        showAgeVerificationModal(() => openPhoto(id, index));
        return;
    }
    
    currentPhotoIndex = index;
    currentFilteredPhotos = getCurrentFilteredPhotos();
    
    updatePhotoModal();
    
    const modal = document.getElementById('photoModal');
    modal.style.display = 'flex';
}

function updatePhotoModal() {
    const photo = currentFilteredPhotos[currentPhotoIndex];
    if (!photo) return;
    
    const img = document.getElementById('modalPhotoImg');
    const title = document.getElementById('modalPhotoTitle');
    const desc = document.getElementById('modalPhotoDesc');
    const counter = document.getElementById('photoCounter');
    
    img.src = photo.image;
    title.innerHTML = photo.title ? `<i class="fas fa-image"></i> ${escapeHtml(photo.title)}` : '<i class="fas fa-image"></i> Фото';
    desc.innerHTML = photo.desc || (photo.year ? `${photo.year} год` : '');
    counter.innerHTML = `${currentPhotoIndex + 1} из ${currentFilteredPhotos.length}`;
}

function nextPhoto() {
    if (currentPhotoIndex < currentFilteredPhotos.length - 1) {
        currentPhotoIndex++;
        updatePhotoModal();
    } else {
        showToastMessage('📸 Это последнее фото');
    }
}

function prevPhoto() {
    if (currentPhotoIndex > 0) {
        currentPhotoIndex--;
        updatePhotoModal();
    } else {
        showToastMessage('📸 Это первое фото');
    }
}

function closePhotoModal() {
    document.getElementById('photoModal').style.display = 'none';
}

// ==============================================
// ИНИЦИАЛИЗАЦИЯ
// ==============================================
document.addEventListener('DOMContentLoaded', () => {
    checkAdultStatus();
    loadGalleryFromFirebase();
    setInterval(checkForUpdates, 1000);
    
    const modal = document.getElementById('photoModal');
    if (modal) {
        modal.onclick = (e) => {
            if (e.target === modal) closePhotoModal();
        };
    }
    
    // Обработчики навигации
    const prevBtn = document.getElementById('prevPhotoBtn');
    const nextBtn = document.getElementById('nextPhotoBtn');
    
    if (prevBtn) prevBtn.addEventListener('click', prevPhoto);
    if (nextBtn) nextBtn.addEventListener('click', nextPhoto);
    
    // Клавиши клавиатуры
    document.addEventListener('keydown', (e) => {
        if (modal && modal.style.display === 'flex') {
            if (e.key === 'ArrowLeft') {
                prevPhoto();
            } else if (e.key === 'ArrowRight') {
                nextPhoto();
            } else if (e.key === 'Escape') {
                closePhotoModal();
            }
        }
    });
});

window.loadGalleryFromFirebase = loadGalleryFromFirebase;
