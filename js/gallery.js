// ==============================================
// ГАЛЕРЕЯ — С АВТОМАТИЧЕСКИМ ОБНОВЛЕНИЕМ
// ==============================================

let galleryData = [];
let currentFilter = 'all';
let isAdultVerified = false;

function checkAdultStatus() {
    // Проверяем, подтверждён ли возраст
    const adultVerified = localStorage.getItem('adultVerified');
    if (adultVerified === 'true') {
        isAdultVerified = true;
    }
}

function showAdultWarning() {
    const warning = confirm('⚠️ Вам есть 18 лет? Контент для взрослых может содержать сцены насилия, нецензурную лексику и другие материалы, не предназначенные для несовершеннолетних.\n\nНажмите "ОК", если вам есть 18 лет.');
    if (warning) {
        localStorage.setItem('adultVerified', 'true');
        isAdultVerified = true;
        renderGallery(); // Перерисовываем галерею
    }
}

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
        
        renderGallery();
        renderFilters();
        renderStats();
        
    } catch (error) {
        console.error('Ошибка:', error);
        container.innerHTML = '<div class="empty-gallery"><i class="fas fa-exclamation-triangle"></i><p>Ошибка загрузки</p></div>';
    }
}

function renderStats() {
    const container = document.getElementById('galleryStats');
    if (!container) return;
    
    const total = galleryData.length;
    container.innerHTML = `
        <div class="stat-badge"><i class="fas fa-images"></i> Всего фото: ${total}</div>
        <div class="stat-badge"><i class="fas fa-camera"></i> Эксклюзивные кадры</div>
        <div class="stat-badge"><i class="fas fa-calendar-alt"></i> 2004-2013</div>
    `;
}

function renderFilters() {
    const container = document.getElementById('galleryFilters');
    if (!container) return;
    
    const categories = [
        { id: 'all', name: 'Все' },
        { id: 'behind', name: 'Со съёмок' },
        { id: 'actors', name: 'Актёры' },
        { id: 'spinoff', name: 'Спин-оффы' },
        { id: 'iconic', name: 'Моменты' },
        { id: 'rare', name: 'Раритеты' },
        { id: 'memes', name: 'Приколы' },
        { id: 'adult', name: '18+' }
    ];
    
    let html = '';
    categories.forEach(cat => {
        const count = cat.id === 'all' ? galleryData.length : galleryData.filter(p => p.category === cat.id).length;
        html += `
            <button class="filter-btn ${currentFilter === cat.id ? 'active' : ''}" data-filter="${cat.id}">
                ${cat.name} ${cat.id !== 'all' ? `(${count})` : ''}
            </button>
        `;
    });
    container.innerHTML = html;
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentFilter = btn.dataset.filter;
            renderFilters();
            renderGallery();
        });
    });
}

function renderGallery() {
    const container = document.getElementById('galleryGrid');
    if (!container) return;
    
    let filtered = galleryData;
    if (currentFilter !== 'all') {
        filtered = galleryData.filter(photo => photo.category === currentFilter);
    }
    
    // Если раздел 18+ и пользователь не подтвердил возраст
    if (currentFilter === 'adult' && !isAdultVerified) {
        container.innerHTML = `
            <div class="empty-gallery" style="cursor: pointer;" onclick="showAdultWarning()">
                <i class="fas fa-lock" style="font-size: 4rem; color: #ff4444;"></i>
                <p style="font-size: 1.2rem; margin-top: 15px;">🔞 Контент 18+</p>
                <p>Для просмотра подтвердите свой возраст</p>
                <button class="verify-age-btn" onclick="showAdultWarning()">Подтвердить возраст</button>
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
        
        // Добавляем специальный класс для 18+ фото
        const adultClass = (photo.category === 'adult' && !isAdultVerified) ? 'adult-photo blurred' : (photo.category === 'adult' ? 'adult-photo' : '');
        
        html += `
            <div class="gallery-card ${adultClass}" onclick="openPhoto('${photo.id}')">
                <div class="gallery-image">
                    <img src="${photo.image}" alt="Фото" loading="lazy" onerror="this.src='https://via.placeholder.com/400x400?text=Error'">
                    <div class="image-overlay">
                        <div class="zoom-icon"><i class="fas fa-search-plus"></i></div>
                    </div>
                </div>
                <div class="gallery-info">
                    ${photo.title ? `<div class="gallery-title" title="${escapeHtml(photo.title)}">${escapeHtml(shortTitle)}</div>` : ''}
                    ${photo.desc ? `<div class="gallery-desc">${escapeHtml(photo.desc.substring(0, 60))}${photo.desc.length > 60 ? '...' : ''}</div>` : ''}
                    <div class="gallery-meta">
                        ${photo.year ? `<span><i class="far fa-calendar-alt"></i> ${photo.year}</span>` : ''}
                        ${photo.location ? `<span><i class="fas fa-map-marker-alt"></i> ${escapeHtml(photo.location.substring(0, 20))}</span>` : ''}
                        ${photo.category === 'adult' ? `<span class="adult-badge"><i class="fas fa-exclamation-triangle"></i> 18+</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

const style = document.createElement('style');
style.textContent = `
    .verify-age-btn {
        background: #bd8a3e;
        border: none;
        padding: 12px 30px;
        border-radius: 40px;
        font-size: 1rem;
        font-weight: bold;
        cursor: pointer;
        margin-top: 20px;
        transition: all 0.2s;
    }
    .verify-age-btn:hover {
        background: #ffb347;
        transform: scale(1.02);
    }
    .adult-badge {
        background: #ff4444;
        color: white;
        padding: 2px 6px;
        border-radius: 10px;
        font-size: 0.6rem;
    }
`;
document.head.appendChild(style);

function openPhoto(id) {
    const photo = galleryData.find(p => p.id === id);
    if (!photo) return;
    
    const modal = document.getElementById('photoModal');
    const img = document.getElementById('modalPhotoImg');
    const title = document.getElementById('modalPhotoTitle');
    const desc = document.getElementById('modalPhotoDesc');
    
    img.src = photo.image;
    title.innerHTML = photo.title ? `<i class="fas fa-image"></i> ${escapeHtml(photo.title)}` : '<i class="fas fa-image"></i> Фото';
    desc.innerHTML = photo.desc || (photo.year ? `${photo.year} год` : '');
    
    modal.style.display = 'flex';
}

function closePhotoModal() {
    document.getElementById('photoModal').style.display = 'none';
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => m === '&' ? '&amp;' : m === '<' ? '&lt;' : '&gt;');
}

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
});

window.loadGalleryFromFirebase = loadGalleryFromFirebase;
