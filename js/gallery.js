// ==============================================
// ГАЛЕРЕЯ — С АВТОМАТИЧЕСКИМ ОБНОВЛЕНИЕМ
// ==============================================

let galleryData = [];
let currentFilter = 'all';

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
        { id: 'rare', name: 'Раритеты' }
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
    
    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-gallery"><i class="fas fa-camera"></i><p>Фотографий в этой категории пока нет</p></div>';
        return;
    }
    
    // Убираем лишний div.gallery-grid — контейнер уже сам является grid-контейнером
    // Просто добавляем карточки напрямую
    let html = '';
    filtered.forEach(photo => {
        // Обрезаем длинное название
        let shortTitle = photo.title || '';
        if (shortTitle.length > 25) shortTitle = shortTitle.substring(0, 22) + '...';
        
        html += `
            <div class="gallery-card" onclick="openPhoto('${photo.id}')">
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
                    </div>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

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