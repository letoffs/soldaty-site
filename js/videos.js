let videosData = [];
let currentCategory = "all";
let currentVideoPlayer = null;
let currentEditVideo = null;
let searchQuery = "";
let sortOrder = "newest";

const ADMIN_EMAIL = 'twinkjjjjkmnb@gmail.com';

function isAdmin() {
    const user = firebase.auth().currentUser;
    return user && user.email === ADMIN_EMAIL;
}

const categories = [
    { id: "all", name: "Все видео", icon: "fas fa-video", filter: null },
    { id: "trailer", name: "Трейлеры и анонсы", icon: "fas fa-film", filter: v => v.category === "trailer" },
    { id: "clip", name: "Клипы и нарезки", icon: "fas fa-music", filter: v => v.category === "clip" },
    { id: "parody", name: "Пародии", icon: "fas fa-laugh", filter: v => v.category === "parody" },
    { id: "behind", name: "Закулисье", icon: "fas fa-users", filter: v => v.category === "behind" },
    { id: "dembel", name: "Дембель", icon: "fas fa-flag-checkered", filter: v => v.category === "dembel" },
];

// ==============================================
// FIREBASE
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
            order: Date.now(),
            createdAt: Date.now(),
            views: 0
        });
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
// ФУНКЦИИ ПОИСКА И СОРТИРОВКИ
// ==============================================
function searchVideos() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchQuery = searchInput.value;
        renderVideos();
    }
}

function clearSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = '';
        searchQuery = '';
        renderVideos();
    }
}

function setSortOrder(order) {
    sortOrder = order;
    renderVideos();
}

function getFilteredAndSortedVideos() {
    let filtered = [...videosData];
    
    const cat = categories.find(c => c.id === currentCategory);
    if (cat && cat.filter) {
        filtered = filtered.filter(cat.filter);
    }
    
    if (searchQuery && searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase().trim();
        filtered = filtered.filter(video => 
            video.title.toLowerCase().includes(query) ||
            (video.desc && video.desc.toLowerCase().includes(query))
        );
    }
    
    // ВАЖНО: order должен иметь приоритет при сортировке
    switch (sortOrder) {
        case "newest":
            filtered.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            break;
        case "oldest":
            filtered.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
            break;
        case "title-asc":
            filtered.sort((a, b) => a.title.localeCompare(b.title, 'ru'));
            break;
        case "title-desc":
            filtered.sort((a, b) => b.title.localeCompare(a.title, 'ru'));
            break;
        default:
            // 🔥 СОРТИРОВКА ПО ПОРЯДКУ (ПО УМОЛЧАНИЮ)
            // Сначала видео с order, потом без order, но createdAt тоже участвует
            filtered.sort((a, b) => {
                const orderA = a.order !== undefined ? a.order : a.createdAt;
                const orderB = b.order !== undefined ? b.order : b.createdAt;
                return (orderA || 0) - (orderB || 0);
            });
    }
    
    return filtered;
}

// ==============================================
// ЗАГРУЗКА ПРЕВЬЮ (ТОЛЬКО ССЫЛКИ)
// ==============================================
function initUrlPreview() {
    const urlInput = document.getElementById('newVideoUrlInput');
    if (!urlInput) return;
    
    urlInput.addEventListener('input', () => {
        const url = urlInput.value.trim();
        const preview = document.getElementById('urlPreview');
        const previewImg = document.getElementById('urlPreviewImg');
        
        if (url && (url.startsWith('http') || url.startsWith('https'))) {
            previewImg.src = url;
            preview.style.display = 'block';
            document.getElementById('newVideoThumb').value = url;
            document.getElementById('thumbPreview').style.display = 'none';
        } else {
            preview.style.display = 'none';
        }
    });
}

function initEditUrlPreview() {
    const urlInput = document.getElementById('editVideoUrlInput');
    if (!urlInput) return;
    
    urlInput.addEventListener('input', () => {
        const url = urlInput.value.trim();
        const preview = document.getElementById('editUrlPreview');
        const previewImg = document.getElementById('editUrlPreviewImg');
        
        if (url && (url.startsWith('http') || url.startsWith('https'))) {
            previewImg.src = url;
            preview.style.display = 'block';
            document.getElementById('editVideoThumb').value = url;
            document.getElementById('editThumbPreview').style.display = 'none';
        } else {
            preview.style.display = 'none';
        }
    });
}

function generateThumbnailFromYouTube() {
    const youtubeId = document.getElementById('newVideoYoutubeId').value.trim();
    if (!youtubeId) {
        showToastMessage('❌ Введите YouTube ID');
        return;
    }
    const thumbUrl = `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`;
    document.getElementById('newVideoThumb').value = thumbUrl;
    document.getElementById('thumbPreviewImg').src = thumbUrl;
    document.getElementById('thumbPreview').style.display = 'block';
    document.getElementById('newVideoUrlInput').value = thumbUrl;
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
    document.getElementById('editThumbPreviewImg').src = thumbUrl;
    document.getElementById('editThumbPreview').style.display = 'block';
    document.getElementById('editVideoUrlInput').value = thumbUrl;
    showToastMessage('✅ Превью из YouTube');
}

// ==============================================
// ЗАГРУЗКА ФАЙЛОВ С КОМПЬЮТЕРА
// ==============================================
function uploadThumbnailFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
        showToastMessage('❌ Выберите изображение');
        return;
    }
    if (file.size > 5 * 1024 * 1024) {
        showToastMessage('❌ Файл больше 5MB');
        return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
        const imageUrl = e.target.result;
        document.getElementById('newVideoThumb').value = imageUrl;
        const previewDiv = document.getElementById('thumbPreview');
        const previewImg = document.getElementById('thumbPreviewImg');
        previewImg.src = imageUrl;
        previewDiv.style.display = 'block';
        document.getElementById('newVideoUrlInput').value = '';
        document.getElementById('urlPreview').style.display = 'none';
        showToastMessage('✅ Превью загружено');
    };
    reader.readAsDataURL(file);
}

function uploadEditThumbnailFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
        showToastMessage('❌ Выберите изображение');
        return;
    }
    if (file.size > 5 * 1024 * 1024) {
        showToastMessage('❌ Файл больше 5MB');
        return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
        const imageUrl = e.target.result;
        document.getElementById('editVideoThumb').value = imageUrl;
        const previewDiv = document.getElementById('editThumbPreview');
        const previewImg = document.getElementById('editThumbPreviewImg');
        previewImg.src = imageUrl;
        previewDiv.style.display = 'block';
        document.getElementById('editVideoUrlInput').value = '';
        document.getElementById('editUrlPreview').style.display = 'none';
        showToastMessage('✅ Превью обновлено');
    };
    reader.readAsDataURL(file);
}

// ==============================================
// ОПРЕДЕЛЕНИЕ ДЛИТЕЛЬНОСТИ
// ==============================================
async function fetchVideoDuration() {
    const youtubeId = document.getElementById('newVideoYoutubeId').value.trim();
    const durationInput = document.getElementById('newVideoDuration');
    if (!youtubeId) { showToastMessage('❌ Введите YouTube ID'); return; }
    
    durationInput.placeholder = '⏳...';
    durationInput.disabled = true;
    
    try {
        const response = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${youtubeId}`);
        const data = await response.json();
        if (data && data.duration) {
            const formatted = formatDuration(data.duration);
            durationInput.value = formatted;
            durationInput.classList.add('duration-auto');
            showToastMessage(`✅ Длительность: ${formatted}`);
            setTimeout(() => durationInput.classList.remove('duration-auto'), 2000);
        } else {
            showToastMessage('⚠️ Не удалось определить, введите вручную');
        }
    } catch (error) {
        showToastMessage('⚠️ Ошибка, введите вручную');
    } finally {
        durationInput.disabled = false;
        durationInput.placeholder = 'Длительность';
    }
}

async function fetchEditVideoDuration() {
    const youtubeId = document.getElementById('editVideoYoutubeId').value.trim();
    const durationInput = document.getElementById('editVideoDuration');
    if (!youtubeId) return;
    
    durationInput.disabled = true;
    try {
        const response = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${youtubeId}`);
        const data = await response.json();
        if (data && data.duration) {
            durationInput.value = formatDuration(data.duration);
            showToastMessage(`✅ Длительность: ${durationInput.value}`);
        }
    } catch (error) {}
    durationInput.disabled = false;
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
// ДОБАВЛЕНИЕ ВИДЕО
// ==============================================
async function addNewVideo(event) {
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
    
    const saveBtn = event.target;
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Сохранение...';
    saveBtn.disabled = true;
    
    try {
        const success = await addVideoToFirebase(videoData);
        if (success) {
            document.getElementById('newVideoTitle').value = '';
            document.getElementById('newVideoYoutubeId').value = '';
            document.getElementById('newVideoDesc').value = '';
            document.getElementById('newVideoDuration').value = '';
            document.getElementById('newVideoThumb').value = '';
            document.getElementById('newVideoUrlInput').value = '';
            document.getElementById('newVideoYear').value = '';
            document.getElementById('newVideo18Plus').checked = false;
            document.getElementById('thumbPreview').style.display = 'none';
            document.getElementById('urlPreview').style.display = 'none';
            document.getElementById('thumbFileInput').value = '';
            await loadVideosFromFirebase();
            showToastMessage('✅ Видео добавлено');
        }
    } catch (error) {
        showToastMessage('❌ Ошибка сохранения');
    } finally {
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }
}

// ==============================================
// РЕДАКТИРОВАНИЕ
// ==============================================
function openEditModal(video) {
    currentEditVideo = video;
    document.getElementById('editThumbPreview').style.display = 'none';
    document.getElementById('editThumbPreviewImg').src = '';
    document.getElementById('editUrlPreview').style.display = 'none';
    document.getElementById('editUrlPreviewImg').src = '';
    document.getElementById('editVideoId').value = video.id;
    document.getElementById('editVideoTitle').value = video.title || '';
    document.getElementById('editVideoYoutubeId').value = video.youtubeId || '';
    document.getElementById('editVideoDesc').value = video.desc || '';
    document.getElementById('editVideoDuration').value = video.duration || '';
    document.getElementById('editVideoThumb').value = video.thumb || '';
    document.getElementById('editVideoUrlInput').value = video.thumb || '';
    document.getElementById('editVideoYear').value = video.year || '';
    document.getElementById('editVideoCategory').value = video.category || 'trailer';
    document.getElementById('editVideo18Plus').checked = video.is18Plus || false;
    
    if (video.thumb && video.thumb !== '') {
        document.getElementById('editThumbPreviewImg').src = video.thumb;
        document.getElementById('editThumbPreview').style.display = 'block';
    } else {
        document.getElementById('editThumbPreview').style.display = 'none';
    }
    
    document.getElementById('editModal').style.display = 'flex';
}

function closeEditModal() {
    document.getElementById('editThumbPreview').style.display = 'none';
    document.getElementById('editThumbPreviewImg').src = '';
    document.getElementById('editUrlPreview').style.display = 'none';
    document.getElementById('editUrlPreviewImg').src = '';
    document.getElementById('editVideoUrlInput').value = '';
    document.getElementById('editModal').style.display = 'none';
    currentEditVideo = null;
}

async function saveEditedVideo(event) {
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
    
    const saveBtn = event.target;
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Сохранение...';
    saveBtn.disabled = true;
    
    try {
        const success = await updateVideoInFirebase(currentEditVideo.firebaseKey, updatedData);
        if (success) {
            closeEditModal();
            await loadVideosFromFirebase();
            showToastMessage('✅ Видео обновлено');
        }
    } catch (error) {
        showToastMessage('❌ Ошибка обновления');
    } finally {
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }
}

// ==============================================
// ОЧИСТКА ПРЕВЬЮ
// ==============================================
function clearUrlInput() {
    const urlInput = document.getElementById('newVideoUrlInput');
    const preview = document.getElementById('urlPreview');
    const thumbInput = document.getElementById('newVideoThumb');
    const thumbPreview = document.getElementById('thumbPreview');
    
    if (urlInput) urlInput.value = '';
    if (preview) preview.style.display = 'none';
    if (thumbInput) thumbInput.value = '';
    if (thumbPreview) thumbPreview.style.display = 'none';
    
    showToastMessage('🗑️ Превью удалено, будет из YouTube');
}

function clearEditUrlInput() {
    const urlInput = document.getElementById('editVideoUrlInput');
    const preview = document.getElementById('editUrlPreview');
    const thumbInput = document.getElementById('editVideoThumb');
    const thumbPreview = document.getElementById('editThumbPreview');
    
    if (urlInput) urlInput.value = '';
    if (preview) preview.style.display = 'none';
    if (thumbInput) thumbInput.value = '';
    if (thumbPreview) thumbPreview.style.display = 'none';
    
    showToastMessage('🗑️ Превью удалено, будет из YouTube');
}

function clearEditThumb() {
    clearEditUrlInput();
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

async function moveVideoUp(video) {
    if (!isAdmin()) return;
    
    const currentIndex = videosData.findIndex(v => v.id === video.id);
    if (currentIndex <= 0) return;
    
    const prevVideo = videosData[currentIndex - 1];
    
    // Меняем порядок (используем поле order, если есть, или createdAt)
    const currentOrder = video.order || video.createdAt;
    const prevOrder = prevVideo.order || prevVideo.createdAt;
    
    try {
        await firebase.database().ref(`videos/${video.firebaseKey}`).update({ order: prevOrder });
        await firebase.database().ref(`videos/${prevVideo.firebaseKey}`).update({ order: currentOrder });
        await loadVideosFromFirebase();
        showToastMessage('⬆️ Видео перемещено вверх');
    } catch (error) {
        console.error('Ошибка перемещения:', error);
        showToastMessage('❌ Ошибка перемещения');
    }
}

async function moveVideoDown(video) {
    if (!isAdmin()) return;
    
    const currentIndex = videosData.findIndex(v => v.id === video.id);
    if (currentIndex >= videosData.length - 1) return;
    
    const nextVideo = videosData[currentIndex + 1];
    
    const currentOrder = video.order || video.createdAt;
    const nextOrder = nextVideo.order || nextVideo.createdAt;
    
    try {
        await firebase.database().ref(`videos/${video.firebaseKey}`).update({ order: nextOrder });
        await firebase.database().ref(`videos/${nextVideo.firebaseKey}`).update({ order: currentOrder });
        await loadVideosFromFirebase();
        showToastMessage('⬇️ Видео перемещено вниз');
    } catch (error) {
        console.error('Ошибка перемещения:', error);
        showToastMessage('❌ Ошибка перемещения');
    }
}

function renderAdminSortList() {
    const container = document.getElementById('adminVideosSortList');
    if (!container) return;
    
    if (videosData.length === 0) {
        container.innerHTML = '<div class="empty-videos" style="padding: 20px;">Нет видео для сортировки</div>';
        return;
    }
    
    // Сортируем по order или createdAt
    const sorted = [...videosData].sort((a, b) => {
        const orderA = a.order !== undefined ? a.order : a.createdAt;
        const orderB = b.order !== undefined ? b.order : b.createdAt;
        return (orderA || 0) - (orderB || 0);
    });
    
    let html = '';
    sorted.forEach((video, index) => {
        const thumbUrl = video.thumb && video.thumb !== '' 
            ? video.thumb 
            : `https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg`;
        
        html += `
            <div class="admin-sort-item" data-id="${video.id}" data-firebase-key="${video.firebaseKey}" data-index="${index}">
                <div class="drag-handle"><i class="fas fa-grip-vertical"></i></div>
                <img class="admin-sort-thumb" src="${thumbUrl}" alt="${escapeHtml(video.title)}" onerror="this.src='https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg'">
                <div class="admin-sort-info">
                    <div class="admin-sort-title">${escapeHtml(video.title)}</div>
                    <div class="admin-sort-meta">${video.duration} • ${video.year || '—'}</div>
                </div>
                <div class="admin-sort-order">${index + 1}</div>
            </div>
        `;
    });
    container.innerHTML = html;
    
    initDragAndDrop();
}

function initDragAndDrop() {
    const items = document.querySelectorAll('.admin-sort-item');
    let draggedItem = null;
    
    items.forEach(item => {
        item.setAttribute('draggable', 'true');
        
        item.addEventListener('dragstart', (e) => {
            draggedItem = item;
            e.dataTransfer.effectAllowed = 'move';
            item.classList.add('dragging');
        });
        
        item.addEventListener('dragend', (e) => {
            item.classList.remove('dragging');
            draggedItem = null;
        });
        
        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        });
        
        item.addEventListener('drop', async (e) => {
            e.preventDefault();
            if (!draggedItem || draggedItem === item) return;
            
            const container = document.getElementById('adminVideosSortList');
            const itemsArray = Array.from(container.querySelectorAll('.admin-sort-item'));
            const fromIndex = itemsArray.indexOf(draggedItem);
            const toIndex = itemsArray.indexOf(item);
            
            if (fromIndex < toIndex) {
                item.parentNode.insertBefore(draggedItem, item.nextSibling);
            } else {
                item.parentNode.insertBefore(draggedItem, item);
            }
            
            // Обновляем порядок в Firebase
            const newItems = Array.from(container.querySelectorAll('.admin-sort-item'));
            const updates = [];
            
            for (let i = 0; i < newItems.length; i++) {
                const firebaseKey = newItems[i].dataset.firebaseKey;
                const newOrder = i;
                updates.push(firebase.database().ref(`videos/${firebaseKey}`).update({ order: newOrder }));
            }
            
            await Promise.all(updates);
            await loadVideosFromFirebase();
            showToastMessage('✅ Порядок видео сохранён');
            
            // Обновляем номера
            newItems.forEach((el, idx) => {
                const orderSpan = el.querySelector('.admin-sort-order');
                if (orderSpan) orderSpan.textContent = `#${idx + 1}`;
            });
        });
    });
}

const originalShowAdminPanel = showAdminPanel;
showAdminPanel = function() {
    originalShowAdminPanel();
    if (isAdmin() && document.getElementById('adminVideosSortList')) {
        renderAdminSortList();
    }
};

// ==============================================
// ОТРИСОВКА
// ==============================================
function renderCategories() {
    const container = document.getElementById('categoryList');
    if (!container) return;
    
    let html = '';
    categories.forEach(cat => {
        let count = 0;
        if (cat.filter) {
            count = videosData.filter(cat.filter).length;
        } else {
            count = videosData.length;
        }
        
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
    
    const filtered = getFilteredAndSortedVideos();
    
    if (countSpan) {
        let countText = `${filtered.length} видео`;
        if (searchQuery && searchQuery.trim()) countText += ` (найдено)`;
        countSpan.innerText = countText;
    }
    
    if (filtered.length === 0) {
        let emptyMessage = '<div class="empty-videos"><i class="fas fa-video-slash"></i>';
        if (searchQuery && searchQuery.trim()) {
            emptyMessage += `<p>Ничего не найдено по запросу "${escapeHtml(searchQuery)}"</p>
                            <button onclick="clearSearch()" class="clear-search-btn" style="margin-top: 10px; padding: 8px 20px; background: #bd8a3e; border: none; border-radius: 20px; cursor: pointer;">Очистить поиск</button>`;
        } else {
            emptyMessage += '<p>Видео в этой категории временно отсутствуют</p>';
        }
        emptyMessage += '</div>';
        container.innerHTML = emptyMessage;
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
            <button class="admin-move-up" onclick="event.stopPropagation(); moveVideoUp(${JSON.stringify(video).replace(/"/g, '&quot;')})" title="Переместить выше"><i class="fas fa-arrow-up"></i></button>
            <button class="admin-move-down" onclick="event.stopPropagation(); moveVideoDown(${JSON.stringify(video).replace(/"/g, '&quot;')})" title="Переместить ниже"><i class="fas fa-arrow-down"></i></button>
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
            const video = filtered.find(v => v.id == card.dataset.id);
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
    initUrlPreview();
    initEditUrlPreview();
    
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) {
        searchBtn.addEventListener('click', searchVideos);
    }
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchVideos();
            }
        });
    }
    
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
});

window.onYouTubeIframeAPIReady = function() {};

// ==============================================
// ЭКСПОРТ ФУНКЦИЙ
// ==============================================
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
window.searchVideos = searchVideos;
window.clearSearch = clearSearch;
window.setSortOrder = setSortOrder;
window.clearUrlInput = clearUrlInput;
window.clearEditUrlInput = clearEditUrlInput;
window.clearEditThumb = clearEditThumb;
window.moveVideoUp = moveVideoUp;
window.moveVideoDown = moveVideoDown;
