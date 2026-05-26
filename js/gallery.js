// ==============================================
// ГАЛЕРЕЯ — ПРОСМОТР ФОТО ИЗ FIREBASE
// ==============================================

let galleryData = [];
let currentFilter = "all";

// Загрузка фото
async function loadGallery() {
    const container = document.getElementById('galleryGrid');
    if (!container) return;
    
    container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-pulse"></i> Загрузка...</div>';
    
    try {
        const snapshot = await firebase.database().ref('gallery').once('value');
        const photos = snapshot.val() || {};
        
        galleryData = Object.entries(photos).map(([id, data]) => ({ id, ...data })).reverse();
        renderGallery();
        
    } catch (error) {
        console.error('Ошибка:', error);
        container.innerHTML = '<div class="empty-gallery"><i class="fas fa-exclamation-triangle"></i><p>Ошибка загрузки</p></div>';
    }
}

function renderGallery() {
    const container = document.getElementById('galleryGrid');
    if (!container) return;
    
    if (galleryData.length === 0) {
        container.innerHTML = '<div class="empty-gallery"><i class="fas fa-camera"></i><p>Фотографий пока нет</p></div>';
        return;
    }
    
    let html = '<div class="gallery-grid">';
    galleryData.forEach(photo => {
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

document.addEventListener('DOMContentLoaded', loadGallery);