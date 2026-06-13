// ==============================================
// ДАННЫЕ ВИДЕО
// ==============================================
const defaultVideos = [
];

let videosData = [];
let currentCategory = "all";
let currentVideoPlayer = null;

// Категории
const categories = [
    { id: "all", name: "Все видео", icon: "fas fa-video", filter: null },
    { id: "trailer", name: "Трейлеры и анонсы", icon: "fas fa-film", filter: v => v.category === "trailer" },
    { id: "clip", name: "Клипы и нарезки", icon: "fas fa-music", filter: v => v.category === "clip" },
    { id: "parody", name: "Пародии", icon: "fas fa-laugh", filter: v => v.category === "parody" },
    { id: "behind", name: "Закулисье", icon: "fas fa-users", filter: v => v.category === "behind" },
    { id: "dembel", name: "Дембель", icon: "fas fa-flag-checkered", filter: v => v.category === "dembel" },
];

// ==============================================
// FIREBASE ФУНКЦИИ
// ==============================================
async function loadVideosFromFirebase() {
    try {
        const snapshot = await firebase.database().ref('videos').once('value');
        const videosObj = snapshot.val();
        
        if (videosObj && Object.keys(videosObj).length > 0) {
            videosData = Object.entries(videosObj).map(([key, video]) => ({
                firebaseKey: key,
                id: video.id || parseInt(key),
                ...video
            }));
            videosData.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        } else {
            videosData = [...defaultVideos];
            await saveDefaultVideosToFirebase();
        }
        
        renderCategories();
        renderVideos();
    } catch (error) {
        console.error('Ошибка загрузки видео:', error);
        showToastMessage('❌ Ошибка загрузки видео');
    }
}

async function saveDefaultVideosToFirebase() {
    for (const video of defaultVideos) {
        await firebase.database().ref('videos').push({
            ...video,
            id: video.id,
            createdAt: Date.now()
        });
    }
}

async function addVideoToFirebase(videoData) {
    try {
        const newId = Date.now();
        await firebase.database().ref('videos').push({
            ...videoData,
            id: newId,
            createdAt: Date.now(),
            views: 0
        });
        await loadVideosFromFirebase();
        showToastMessage('✅ Видео добавлено');
        return true;
    } catch (error) {
        console.error('Ошибка добавления:', error);
        showToastMessage('❌ Ошибка добавления');
        return false;
    }
}

async function deleteVideoFromFirebase(video) {
    if (!video.firebaseKey) return false;
    try {
        await firebase.database().ref(`videos/${video.firebaseKey}`).remove();
        await loadVideosFromFirebase();
        showToastMessage('🗑️ Видео удалено');
        return true;
    } catch (error) {
        console.error('Ошибка удаления:', error);
        showToastMessage('❌ Ошибка удаления');
        return false;
    }
}

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
    setTimeout(() => toast.classList.remove('show'), 2500);
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => m === '&' ? '&amp;' : m === '<' ? '&lt;' : '&gt;');
}

function closeVideoModal() {
    const modal = document.getElementById('videoModal');
    if (modal) modal.style.display = 'none';
    if (currentVideoPlayer && currentVideoPlayer.destroy) {
        try { currentVideoPlayer.destroy(); } catch(e) {}
        currentVideoPlayer = null;
    }
    const container = document.getElementById('videoPlayer');
    if (container) container.innerHTML = '';
}

// ==============================================
// ПРОВЕРКА ВОЗРАСТА
// ==============================================
function showAgeVerificationModal(video, callback) {
    let ageModal = document.getElementById('ageVerificationModal');
    if (!ageModal) {
        ageModal = document.createElement('div');
        ageModal.id = 'ageVerificationModal';
        ageModal.className = 'modal age-verification-modal';
        ageModal.innerHTML = `
            <div class="modal-content age-verification-content">
                <div class="age-verification-icon"><i class="fas fa-exclamation-triangle"></i></div>
                <h3>Внимание! Контент 18+</h3>
                <p>Это видео содержит сцены, которые могут быть неуместны для лиц младше 18 лет.</p>
                <div class="age-verification-buttons">
                    <button id="ageConfirmBtn" class="age-confirm-btn"><i class="fas fa-check-circle"></i> Мне есть 18 лет</button>
                    <button id="ageCancelBtn" class="age-cancel-btn"><i class="fas fa-times-circle"></i> Меньше 18 лет</button>
                </div>
            </div>
        `;
        document.body.appendChild(ageModal);
    }
    ageModal.style.display = 'flex';
    
    const onConfirm = () => {
        ageModal.style.display = 'none';
        if (callback) callback();
    };
    const onCancel = () => {
        ageModal.style.display = 'none';
        showToastMessage('⛔ Доступ запрещён. Контент 18+');
    };
    
    const confirmBtn = document.getElementById('ageConfirmBtn');
    const cancelBtn = document.getElementById('ageCancelBtn');
    const newConfirm = confirmBtn.cloneNode(true);
    const newCancel = cancelBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirm, confirmBtn);
    cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);
    newConfirm.addEventListener('click', onConfirm);
    newCancel.addEventListener('click', onCancel);
}

function playVideoAfterCheck(video) {
    const modal = document.getElementById('videoModal');
    const container = document.getElementById('videoPlayer');
    const titleEl = document.getElementById('videoTitle');
    const descEl = document.getElementById('videoDesc');
    
    if (!modal || !container) return;
    
    titleEl.innerText = video.title;
    descEl.innerText = video.desc;
    container.innerHTML = '';
    
    const playerDiv = document.createElement('div');
    playerDiv.id = 'videoPlayerDiv';
    container.appendChild(playerDiv);
    
    currentVideoPlayer = new YT.Player('videoPlayerDiv', {
        height: '100%',
        width: '100%',
        videoId: video.youtubeId,
        playerVars: { autoplay: 1, rel: 0, modestbranding: 1 },
        events: {
            onError: (event) => {
                if (event.data === 150 || event.data === 101) {
                    container.innerHTML = `<iframe src="https://corsproxy.io/?url=https://www.youtube.com/embed/${video.youtubeId}" style="width:100%;height:100%;border:none;" allowfullscreen></iframe>`;
                } else {
                    showToastMessage('❌ Ошибка загрузки видео');
                }
            }
        }
    });
    modal.style.display = 'flex';
}

function playVideo(video) {
    if (!video || !video.youtubeId) {
        showToastMessage('❌ Видео недоступно');
        return;
    }
    if (video.is18Plus === true) {
        showAgeVerificationModal(video, () => playVideoAfterCheck(video));
        return;
    }
    playVideoAfterCheck(video);
}

// ==============================================
// ОТРИСОВКА
// ==============================================
function renderCategories() {
    const container = document.getElementById('categoryList');
    if (!container) return;
    
    let html = '';
    categories.forEach(cat => {
        const count = cat.filter ? videosData.filter(cat.filter).length : videosData.length;
        html += `<div class="category-item ${currentCategory === cat.id ? 'active' : ''}" data-category="${cat.id}">
                    <i class="${cat.icon}"></i>
                    <span class="category-name">${cat.name}</span>
                    <span class="category-count">${count}</span>
                </div>`;
    });
    container.innerHTML = html;
    
    document.querySelectorAll('.category-item').forEach(item => {
        item.addEventListener('click', () => {
            currentCategory = item.dataset.category;
            renderCategories();
            renderVideos();
        });
    });
}

function renderVideos() {
    const container = document.getElementById('videosContainer');
    const countSpan = document.getElementById('videosCount');
    const titleSpan = document.querySelector('#currentCategoryTitle span');
    const currentCat = categories.find(c => c.id === currentCategory);
    if (titleSpan && currentCat) titleSpan.innerText = currentCat.name;
    
    let filtered = videosData;
    const cat = categories.find(c => c.id === currentCategory);
    if (cat && cat.filter) filtered = videosData.filter(cat.filter);
    if (countSpan) countSpan.innerText = `${filtered.length} видео`;
    
    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-videos"><i class="fas fa-video-slash"></i> Видео в этой категории временно отсутствуют</div>';
        return;
    }
    
    let html = '<div class="videos-grid">';
    filtered.forEach(video => {
        const ageBadge = video.is18Plus ? '<span class="age-badge-18">18+</span>' : '';
        const blurClass = video.is18Plus ? 'blurred-thumb' : '';
        const blurOverlay = video.is18Plus ? '<div class="blur-overlay"><i class="fas fa-lock"></i> Подтвердите возраст</div>' : '';
        
        // Кнопки админа (видны только при isAdmin)
        const adminControls = `<div class="video-admin-controls">
            <button class="admin-delete-btn" onclick="event.stopPropagation(); deleteVideoFromFirebase(${JSON.stringify(video).replace(/"/g, '&quot;')})"><i class="fas fa-trash"></i></button>
        </div>`;
        
        html += `<div class="video-card" data-id="${video.id}">
                    ${adminControls}
                    <div class="video-thumb ${blurClass}">
                        <img src="https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg" alt="${escapeHtml(video.title)}" loading="lazy">
                        <div class="play-overlay"><i class="fas fa-play"></i></div>
                        ${ageBadge}
                        ${blurOverlay}
                    </div>
                    <div class="video-info">
                        <div class="video-title">${escapeHtml(video.title)}</div>
                        <div class="video-desc">${escapeHtml(video.desc)}</div>
                        <div class="video-meta">
                            <span class="video-duration"><i class="far fa-clock"></i> ${video.duration}</span>
                            <span class="video-year"><i class="far fa-calendar-alt"></i> ${video.year}</span>
                        </div>
                    </div>
                </div>`;
    });
    html += '</div>';
    container.innerHTML = html;
    
    document.querySelectorAll('.video-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('.admin-delete-btn')) return;
            const video = videosData.find(v => v.id == card.dataset.id);
            if (video) playVideo(video);
        });
    });
}

// ==============================================
// ИНИЦИАЛИЗАЦИЯ
// ==============================================
document.addEventListener('DOMContentLoaded', () => {
    loadVideosFromFirebase();
    
    const modal = document.getElementById('videoModal');
    if (modal) modal.onclick = (e) => { if (e.target === modal) closeVideoModal(); };
    const closeBtn = document.querySelector('#videoModal .modal-close');
    if (closeBtn) closeBtn.onclick = closeVideoModal;
});

window.onYouTubeIframeAPIReady = function() {
    console.log("✅ YouTube API готов");
};

window.addVideoToFirebase = addVideoToFirebase;
window.deleteVideoFromFirebase = deleteVideoFromFirebase;
window.showToastMessage = showToastMessage;
