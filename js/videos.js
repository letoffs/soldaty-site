// ==============================================
// КАТЕГОРИИ
// ==============================================
const categories = [
    { id: "all", name: "Все видео", icon: "fas fa-video", filter: null },
    { id: "trailer", name: "Трейлеры и анонсы", icon: "fas fa-film", filter: v => v.category === "trailer" },
    { id: "clip", name: "Клипы и нарезки", icon: "fas fa-music", filter: v => v.category === "clip" },
    { id: "parody", name: "Пародии", icon: "fas fa-laugh", filter: v => v.category === "parody" },
    { id: "behind", name: "Закулисье", icon: "fas fa-users", filter: v => v.category === "behind" },
    { id: "dembel", name: "Дембель", icon: "fas fa-flag-checkered", filter: v => v.category === "dembel" },
];

let videosData = [];
let currentCategory = "all";
let currentVideoPlayer = null;

const ADMIN_EMAIL = 'twinkjjjjkmnb@gmail.com';

function isAdmin() {
    const user = firebase.auth().currentUser;
    return user && user.email === ADMIN_EMAIL;
}

// ==============================================
// FIREBASE REALTIME DATABASE
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
            videosData = [];
        }
        
        renderCategories();
        renderVideos();
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        showToastMessage('❌ Ошибка загрузки видео');
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

async function updateVideoInFirebase(videoKey, updatedData) {
    try {
        await firebase.database().ref(`videos/${videoKey}`).update({
            ...updatedData,
            updatedAt: Date.now()
        });
        await loadVideosFromFirebase();
        showToastMessage('✅ Видео обновлено');
        return true;
    } catch (error) {
        console.error('Ошибка обновления:', error);
        showToastMessage('❌ Ошибка обновления');
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
// ПРЕОБРАЗОВАНИЕ В BASE64
// ==============================================
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// ==============================================
// ЗАГРУЗКА ПРЕВЬЮ - ЛИМИТ 5 МБ
// ==============================================
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 МБ

async function uploadThumbnailFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.match('image.*')) {
        showToastMessage('❌ Выберите изображение (JPG, PNG, WEBP, GIF)');
        return;
    }
    
    if (file.size > MAX_FILE_SIZE) {
        showToastMessage('❌ Файл больше 5 МБ');
        return;
    }
    
    showToastMessage('⏳ Конвертация...');
    
    try {
        const base64 = await fileToBase64(file);
        document.getElementById('newVideoThumb').value = base64;
        
        const previewDiv = document.getElementById('thumbPreview');
        const previewImg = document.getElementById('thumbPreviewImg');
        previewImg.src = base64;
        previewDiv.style.display = 'flex';
        
        const sizeKB = (base64.length / 1024).toFixed(1);
        showToastMessage(`✅ Превью готово (${sizeKB} КБ)`);
    } catch (error) {
        console.error('Ошибка:', error);
        showToastMessage('❌ Ошибка');
    }
}

async function uploadEditThumbnailFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.match('image.*')) {
        showToastMessage('❌ Выберите изображение');
        return;
    }
    
    if (file.size > MAX_FILE_SIZE) {
        showToastMessage('❌ Файл больше 5 МБ');
        return;
    }
    
    showToastMessage('⏳ Конвертация...');
    
    try {
        const base64 = await fileToBase64(file);
        document.getElementById('editVideoThumb').value = base64;
        
        const previewDiv = document.getElementById('editThumbPreview');
        const previewImg = document.getElementById('editThumbPreviewImg');
        previewImg.src = base64;
        previewDiv.style.display = 'flex';
        
        showToastMessage('✅ Превью обновлено');
    } catch (error) {
        console.error('Ошибка:', error);
        showToastMessage('❌ Ошибка');
    }
}

// ==============================================
// ПРЕДПРОСМОТР
// ==============================================
function previewThumbnailFromUrl() {
    const val = document.getElementById('newVideoThumb').value.trim();
    const previewDiv = document.getElementById('thumbPreview');
    const previewImg = document.getElementById('thumbPreviewImg');
    
    if (val) {
        previewImg.src = val;
        previewDiv.style.display = 'flex';
    } else {
        previewDiv.style.display = 'none';
    }
}

function previewEditThumbnailFromUrl() {
    const val = document.getElementById('editVideoThumb').value.trim();
    const previewDiv = document.getElementById('editThumbPreview');
    const previewImg = document.getElementById('editThumbPreviewImg');
    
    if (val) {
        previewImg.src = val;
        previewDiv.style.display = 'flex';
    } else {
        previewDiv.style.display = 'none';
    }
}

function clearThumbnail() {
    document.getElementById('newVideoThumb').value = '';
    document.getElementById('thumbPreview').style.display = 'none';
    document.getElementById('thumbPreviewImg').src = '';
    document.getElementById('thumbFileInput').value = '';
    showToastMessage('🗑️ Превью удалено');
}

function clearEditThumbnail() {
    document.getElementById('editVideoThumb').value = '';
    document.getElementById('editThumbPreview').style.display = 'none';
    document.getElementById('editThumbPreviewImg').src = '';
    document.getElementById('editThumbFileInput').value = '';
    showToastMessage('🗑️ Превью удалено');
}

// ==============================================
// YOUTUBE ПРЕВЬЮ
// ==============================================
function generateThumbnailFromYouTube() {
    const youtubeId = document.getElementById('newVideoYoutubeId').value.trim();
    if (!youtubeId) {
        showToastMessage('❌ Введите YouTube ID');
        return;
    }
    const thumbUrl = `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`;
    document.getElementById('newVideoThumb').value = thumbUrl;
    
    const previewDiv = document.getElementById('thumbPreview');
    document.getElementById('thumbPreviewImg').src = thumbUrl;
    previewDiv.style.display = 'flex';
    showToastMessage('✅ Превью из YouTube');
}

function generateEditThumbnailFromYouTube() {
    const youtubeId = document.getElementById('editVideoYoutubeId').value.trim();
    if (!youtubeId) {
        showToastMessage('❌ Введите YouTube ID');
        return;
    }
    const thumbUrl = `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`;
    document.getElementById('editVideoThumb').value = thumbUrl;
    
    const previewDiv = document.getElementById('editThumbPreview');
    document.getElementById('editThumbPreviewImg').src = thumbUrl;
    previewDiv.style.display = 'flex';
    showToastMessage('✅ Превью из YouTube');
}

// ==============================================
// ДЛИТЕЛЬНОСТЬ
// ==============================================
async function fetchVideoDuration() {
    const youtubeId = document.getElementById('newVideoYoutubeId').value.trim();
    const durationInput = document.getElementById('newVideoDuration');
    if (!youtubeId) { showToastMessage('❌ Введите YouTube ID'); return; }
    
    durationInput.placeholder = '⏳...';
    try {
        const response = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${youtubeId}`);
        const data = await response.json();
        if (data && data.duration) {
            durationInput.value = formatDuration(data.duration);
            showToastMessage(`✅ Длительность: ${durationInput.value}`);
        }
    } catch (error) {}
    durationInput.placeholder = 'Длительность';
}

async function fetchEditVideoDuration() {
    const youtubeId = document.getElementById('editVideoYoutubeId').value.trim();
    const durationInput = document.getElementById('editVideoDuration');
    if (!youtubeId) { showToastMessage('❌ Введите YouTube ID'); return; }
    
    try {
        const response = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${youtubeId}`);
        const data = await response.json();
        if (data && data.duration) {
            durationInput.value = formatDuration(data.duration);
            showToastMessage(`✅ Длительность: ${durationInput.value}`);
        }
    } catch (error) {}
}

function formatDuration(isoDuration) {
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return '0:00';
    const hours = parseInt(match[1]) || 0;
    const minutes = parseInt(match[2]) || 0;
    const seconds = parseInt(match[3]) || 0;
    if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// ==============================================
// ДОБАВЛЕНИЕ
// ==============================================
async function addNewVideo() {
    if (!isAdmin()) { showToastMessage('⛔ Нет прав'); return; }
    
    const title = document.getElementById('newVideoTitle').value.trim();
    const youtubeId = document.getElementById('newVideoYoutubeId').value.trim();
    if (!title || !youtubeId) { showToastMessage('❌ Заполните название и YouTube ID'); return; }
    
    let duration = document.getElementById('newVideoDuration').value.trim();
    if (!duration) duration = "0:00";
    
    const videoData = {
        title, youtubeId,
        desc: document.getElementById('newVideoDesc').value.trim() || "",
        duration,
        thumb: document.getElementById('newVideoThumb').value.trim() || "",
        year: document.getElementById('newVideoYear').value.trim() || new Date().getFullYear().toString(),
        category: document.getElementById('newVideoCategory').value,
        is18Plus: document.getElementById('newVideo18Plus').checked
    };
    
    await addVideoToFirebase(videoData);
    
    document.getElementById('newVideoTitle').value = '';
    document.getElementById('newVideoYoutubeId').value = '';
    document.getElementById('newVideoDesc').value = '';
    document.getElementById('newVideoDuration').value = '';
    document.getElementById('newVideoThumb').value = '';
    document.getElementById('newVideoYear').value = '';
    document.getElementById('newVideo18Plus').checked = false;
    document.getElementById('thumbPreview').style.display = 'none';
    document.getElementById('thumbFileInput').value = '';
}

// ==============================================
// РЕДАКТИРОВАНИЕ
// ==============================================
let currentEditVideo = null;

function openEditModal(video) {
    currentEditVideo = video;
    document.getElementById('editVideoId').value = video.id;
    document.getElementById('editVideoTitle').value = video.title || '';
    document.getElementById('editVideoYoutubeId').value = video.youtubeId || '';
    document.getElementById('editVideoDesc').value = video.desc || '';
    document.getElementById('editVideoDuration').value = video.duration || '';
    document.getElementById('editVideoThumb').value = video.thumb || '';
    document.getElementById('editVideoYear').value = video.year || '';
    document.getElementById('editVideoCategory').value = video.category || 'trailer';
    document.getElementById('editVideo18Plus').checked = video.is18Plus || false;
    
    if (video.thumb) {
        document.getElementById('editThumbPreviewImg').src = video.thumb;
        document.getElementById('editThumbPreview').style.display = 'flex';
    } else {
        document.getElementById('editThumbPreview').style.display = 'none';
    }
    
    document.getElementById('editModal').style.display = 'flex';
}

function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
    currentEditVideo = null;
}

async function saveEditedVideo() {
    if (!isAdmin() || !currentEditVideo) return;
    
    const updatedData = {
        title: document.getElementById('editVideoTitle').value.trim(),
        youtubeId: document.getElementById('editVideoYoutubeId').value.trim(),
        desc: document.getElementById('editVideoDesc').value.trim(),
        duration: document.getElementById('editVideoDuration').value.trim() || "0:00",
        thumb: document.getElementById('editVideoThumb').value.trim(),
        year: document.getElementById('editVideoYear').value.trim(),
        category: document.getElementById('editVideoCategory').value,
        is18Plus: document.getElementById('editVideo18Plus').checked
    };
    
    if (!updatedData.title || !updatedData.youtubeId) {
        showToastMessage('❌ Название и YouTube ID обязательны');
        return;
    }
    
    await updateVideoInFirebase(currentEditVideo.firebaseKey, updatedData);
    closeEditModal();
}

// ==============================================
// ВСПОМОГАТЕЛЬНЫЕ
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
            onError: () => {
                container.innerHTML = `<iframe src="https://corsproxy.io/?url=https://www.youtube.com/embed/${video.youtubeId}" style="width:100%;height:100%;border:none;" allowfullscreen></iframe>`;
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
        
        let thumbUrl = video.thumb && video.thumb !== '' 
            ? video.thumb 
            : `https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg`;
        
        const adminControls = isAdmin() ? `<div class="video-admin-controls">
            <button class="admin-edit-btn" onclick="event.stopPropagation(); openEditModal(${JSON.stringify(video).replace(/"/g, '&quot;')})"><i class="fas fa-edit"></i></button>
            <button class="admin-delete-btn" onclick="event.stopPropagation(); deleteVideoFromFirebase(${JSON.stringify(video).replace(/"/g, '&quot;')})"><i class="fas fa-trash"></i></button>
        </div>` : '';
        
        html += `<div class="video-card" data-id="${video.id}">
                    ${adminControls}
                    <div class="video-thumb ${blurClass}">
                        <img src="${thumbUrl}" alt="${escapeHtml(video.title)}" loading="lazy" onerror="this.src='https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg'">
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
            if (e.target.closest('.admin-delete-btn') || e.target.closest('.admin-edit-btn')) return;
            const video = videosData.find(v => v.id == card.dataset.id);
            if (video) playVideo(video);
        });
    });
}

// ==============================================
// АДМИНКА И ПАСХАЛКА
// ==============================================
function showAdminPanel() {
    const panel = document.getElementById('adminPanel');
    if (panel && isAdmin()) {
        panel.style.display = 'block';
        showToastMessage('🔐 Админ-панель активирована');
    } else if (!isAdmin()) {
        showToastMessage('⛔ Доступ только для администратора');
    }
}

function hideAdminPanel() {
    const panel = document.getElementById('adminPanel');
    if (panel) panel.style.display = 'none';
}

let clickCount = 0;
let clickTimer = null;

function initSecretAdminButton() {
    const secretBtn = document.getElementById('secretAdminBtn');
    if (!secretBtn) return;
    secretBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        clickCount++;
        if (clickTimer) clearTimeout(clickTimer);
        clickTimer = setTimeout(() => clickCount = 0, 1000);
        if (clickCount === 3) {
            clickCount = 0;
            clearTimeout(clickTimer);
            const user = firebase.auth().currentUser;
            if (!user) { 
                showToastMessage('🔐 Сначала войдите');
                if (typeof showAuthModal === 'function') showAuthModal();
                return; 
            }
            isAdmin() ? showAdminPanel() : showToastMessage('⛔ Доступ только для администратора');
        }
    });
}

// ==============================================
// ЗАПУСК
// ==============================================
document.addEventListener('DOMContentLoaded', () => {
    loadVideosFromFirebase();
    initSecretAdminButton();
    
    const modal = document.getElementById('videoModal');
    if (modal) modal.onclick = (e) => { if (e.target === modal) closeVideoModal(); };
    const closeBtn = document.querySelector('#videoModal .modal-close');
    if (closeBtn) closeBtn.onclick = closeVideoModal;
    
    const youtubeIdInput = document.getElementById('newVideoYoutubeId');
    if (youtubeIdInput) {
        youtubeIdInput.addEventListener('blur', function() {
            if (this.value.trim() && !document.getElementById('newVideoDuration').value.trim()) {
                fetchVideoDuration();
            }
        });
    }
    
    const thumbInput = document.getElementById('newVideoThumb');
    if (thumbInput) thumbInput.addEventListener('input', previewThumbnailFromUrl);
    const editThumbInput = document.getElementById('editVideoThumb');
    if (editThumbInput) editThumbInput.addEventListener('input', previewEditThumbnailFromUrl);
});

window.onYouTubeIframeAPIReady = function() {};

// ЭКСПОРТ
window.addVideoToFirebase = addVideoToFirebase;
window.updateVideoInFirebase = updateVideoInFirebase;
window.deleteVideoFromFirebase = deleteVideoFromFirebase;
window.showToastMessage = showToastMessage;
window.showAdminPanel = showAdminPanel;
window.hideAdminPanel = hideAdminPanel;
window.addNewVideo = addNewVideo;
window.openEditModal = openEditModal;
window.closeEditModal = closeEditModal;
window.saveEditedVideo = saveEditedVideo;
window.generateThumbnailFromYouTube = generateThumbnailFromYouTube;
window.generateEditThumbnailFromYouTube = generateEditThumbnailFromYouTube;
window.fetchVideoDuration = fetchVideoDuration;
window.fetchEditVideoDuration = fetchEditVideoDuration;
window.uploadThumbnailFile = uploadThumbnailFile;
window.uploadEditThumbnailFile = uploadEditThumbnailFile;
window.clearThumbnail = clearThumbnail;
window.clearEditThumbnail = clearEditThumbnail;
