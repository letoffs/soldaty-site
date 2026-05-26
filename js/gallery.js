// ==============================================
// ГАЛЕРЕЯ — ПРОСМОТР ФОТО С ОБНОВЛЕНИЕМ В РЕАЛЬНОМ ВРЕМЕНИ
// ==============================================

let galleryData = [];
let currentFilter = 'all';

// Подписка на изменения в Firebase (реальное время)
function subscribeToGalleryUpdates() {
    const galleryRef = db.ref('gallery');
    
    // Слушаем изменения в реальном времени
    galleryRef.on('value', (snapshot) => {
        const photos = snapshot.val() || {};
        galleryData = Object.entries(photos).map(([id, data]) => ({
            id,
            ...data
        })).reverse();
        
        // Обновляем отображение
        renderAll();
    });
}

// Рендер всего
function renderAll() {
    renderStats();
    renderFilters();
    renderGallery();
}

// Рендер статистики
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

// Рендер фильтров
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
        html += `
            <button class="filter-btn ${currentFilter === cat.id ? 'active' : ''}" data-filter="${cat.id}">
                ${cat.name}
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

// Рендер галереи
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
    
    let html = '<div class="gallery-grid">';
    filtered.forEach(photo => {
        html += `
            <div class="gallery-card" onclick="openPhoto('${photo.id}')">
                <div class="gallery-image">
                    <img src="${photo.image}" alt="Фото" loading="lazy" onerror="this.src='https://via.placeholder.com/400x400?text=Error'">
                    <div class="image-overlay">
                        <div class="zoom-icon"><i class="fas fa-search-plus"></i></div>
                    </div>
                </div>
                <div class="gallery-info">
                    ${photo.title ? `<div class="gallery-title">${escapeHtml(photo.title)}</div>` : ''}
                    ${photo.desc ? `<div class="gallery-desc">${escapeHtml(photo.desc.substring(0, 80))}${photo.desc.length > 80 ? '...' : ''}</div>` : ''}
                    <div class="gallery-meta">
                        ${photo.year ? `<span><i class="far fa-calendar-alt"></i> ${photo.year}</span>` : ''}
                        ${photo.location ? `<span><i class="fas fa-map-marker-alt"></i> ${escapeHtml(photo.location)}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
}

// Открыть фото в модальном окне
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

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    subscribeToGalleryUpdates();
    
    const modal = document.getElementById('photoModal');
    if (modal) {
        modal.onclick = (e) => {
            if (e.target === modal) closePhotoModal();
        };
    }
});
