const YOUTUBE_API_KEY = 'AIzaSyBzuKRpNYPcoopwphQ3ZHKV1pyExWlXP8E';

let videosData = [];
let categoriesData = [];
let currentCategory = "all";
let currentVideoPlayer = null;
let currentEditVideo = null;
let pendingVideoForAge = null;
let searchQuery = "";
let sortOrder = "default";

const ADMIN_EMAIL = 'twinkjjjjkmnb@gmail.com';

function isAdmin() {
    const user = firebase.auth().currentUser;
    return user && user.email === ADMIN_EMAIL;
}

function detectVideoPlatform(url) {
    if (!url) return 'youtube';
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('vk.com') || url.includes('vkontakte.ru') || url.includes('vkvideo.ru')) return 'vk';
    if (url.includes('rutube.ru')) return 'rutube';
    return 'youtube';
}

function extractVideoId(url, platform) {
    if (!url) return '';
    switch (platform) {
        case 'youtube':
            const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
            return ytMatch ? ytMatch[1] : '';
        case 'vk':
            const vkMatch = url.match(/vk(?:video)?\.ru\/video(?:-?\d+_)(\d+)/);
            return vkMatch ? vkMatch[1] : '';
        case 'rutube':
            const rtMatch = url.match(/rutube\.ru\/video\/([a-f0-9]+)/);
            return rtMatch ? rtMatch[1] : '';
        default:
            return url;
    }
}

function getYouTubeThumbnail(youtubeId) {
    if (!youtubeId) return '';
    return `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
}

function getVideoThumbnail(video) {
    if (!video) return '';
    if (video.thumb && video.thumb !== '') return video.thumb;
    if (video.youtubeId) {
        return getYouTubeThumbnail(video.youtubeId);
    }
    return '';
}

function getPlatformIcon(platform, isWhite) {
    switch (platform) {
        case 'youtube': return 'fab fa-youtube';
        case 'vk': return 'fab fa-vk';
        case 'rutube': return isWhite ? 'icon-rutube-white' : 'icon-rutube';
        default: return 'fab fa-youtube';
    }
}

function getPlatformName(platform) {
    switch (platform) {
        case 'youtube': return 'YouTube';
        case 'vk': return 'VK';
        case 'rutube': return 'Rutube';
        default: return 'YouTube';
    }
}

function getAvailablePlatforms(video) {
    const platforms = [];
    if (video.urlYoutube) platforms.push({ id: 'youtube', name: 'YouTube', url: video.urlYoutube, icon: 'fab fa-youtube', color: '#ff0000' });
    if (video.urlVk) platforms.push({ id: 'vk', name: 'VK', url: video.urlVk, icon: 'fab fa-vk', color: '#2787f5' });
    if (video.urlRutube) platforms.push({ id: 'rutube', name: 'Rutube', url: video.urlRutube, icon: 'fas fa-video', color: '#00b4d8' });
    return platforms;
}

function getActivePlatform(video) {
    const platforms = getAvailablePlatforms(video);
    if (platforms.length === 0) return null;
    if (video.activePlatform && platforms.find(p => p.id === video.activePlatform)) {
        return video.activePlatform;
    }
    return platforms[0].id;
}

function getEmbedUrl(video, platformId) {
    const platforms = getAvailablePlatforms(video);
    const platform = platforms.find(p => p.id === platformId);
    if (!platform) return '';
    
    const videoId = extractVideoId(platform.url, platformId);
    
    switch (platformId) {
        case 'youtube':
            return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&controls=1`;
        case 'vk':
            const match = platform.url.match(/video(-?\d+)_(\d+)/);
            if (match) {
                return `https://vk.com/video_ext.php?oid=${match[1]}&id=${match[2]}&hd=2&autoplay=1`;
            }
            return platform.url;
        case 'rutube':
            return `https://rutube.ru/embed/${videoId}/?autoplay=1`;
        default:
            return platform.url;
    }
}

function renderVideoPage(video) {
    const platforms = getAvailablePlatforms(video);
    if (platforms.length === 0) {
        showToastMessage('Нет доступных ссылок для этого видео');
        return;
    }
    
    const container = document.getElementById('videosContainer');
    const searchBar = document.querySelector('.search-sort-bar');
    const categoryHeader = document.querySelector('.current-category-header');
    const sidebar = document.querySelector('.videos-sidebar');
    
    if (searchBar) searchBar.style.display = 'none';
    if (categoryHeader) categoryHeader.style.display = 'none';
    if (sidebar) sidebar.style.display = 'none';
    
    const activePlatform = getActivePlatform(video);
    let embedUrl = getEmbedUrl(video, activePlatform);
    
    let platformButtonsHtml = platforms.map(p => {
        const icon = p.id === 'rutube' 
            ? `<span class="${p.id === activePlatform ? 'icon-rutube-white' : 'icon-rutube'}"></span>` 
            : `<i class="${p.icon}" style="color: ${p.id === activePlatform ? 'white' : p.color};"></i>`;
        
        return `
            <button class="player-switch-btn ${p.id === activePlatform ? 'active' : ''}" 
                    onclick="switchPlayerPlatform('${p.id}')" 
                    style="border-color: ${p.color}; ${p.id === activePlatform ? 'background: ' + p.color + '; color: white;' : ''}">
                ${icon} ${p.name}
            </button>
        `;
    }).join('');
    
    container.innerHTML = `
        <div class="video-page">
            <div class="video-page-header">
                <button class="video-page-back" onclick="closeVideoPage()">
                    <i class="fas fa-arrow-left"></i> Назад к видео
                </button>
                <div class="video-page-controls">
                    ${platformButtonsHtml}
                </div>
            </div>
            <div class="video-page-player" id="videoPagePlayer">
                <div class="video-page-loader" id="videoPageLoader">
                    <i class="fas fa-spinner fa-pulse"></i>
                    <span>Загрузка видео...</span>
                </div>
                <iframe id="videoPlayerFrame" src="${embedUrl}" 
                        style="width:100%;height:100%;border:none;position:absolute;top:0;left:0;"
                        allowfullscreen 
                        allow="autoplay; encrypted-media; fullscreen; picture-in-picture;">
                </iframe>
            </div>
            <div class="video-page-info">
                <h2 class="video-page-title">${escapeHtml(video.title)}</h2>
                <div class="video-page-meta">
                    ${platforms.map(p => {
                        const icon = p.id === 'rutube' 
                            ? `<span class="icon-rutube"></span>` 
                            : `<i class="${p.icon}" style="color:${p.color};"></i>`;
                        return `<span class="video-page-platform">${icon} ${p.name}</span>`;
                    }).join('')}
                    <span class="video-page-duration"><i class="far fa-clock"></i> ${video.duration || '0:00'}</span>
                    <span class="video-page-year"><i class="far fa-calendar-alt"></i> ${video.year || ''}</span>
                </div>
                <div class="video-page-desc">${escapeHtml(video.desc) || 'Описание отсутствует'}</div>
            </div>
        </div>
    `;
    
    const loader = document.getElementById('videoPageLoader');
    const iframe = document.getElementById('videoPlayerFrame');
    
    if (iframe) {
        iframe.addEventListener('load', function() {
            if (loader) loader.style.display = 'none';
        });
        setTimeout(function() {
            if (loader) loader.style.display = 'none';
        }, 3000);
    }
    
    window._currentVideo = video;
}

function openVideoPage(video) {
    if (!video) {
        showToastMessage('Видео недоступно');
        return;
    }
    
    if (video.is18Plus) {
        pendingVideoForAge = video;
        document.getElementById('ageVerificationModal').style.display = 'flex';
        return;
    }
    
    renderVideoPage(video);
}

function switchPlayerPlatform(platformId) {
    const video = window._currentVideo;
    if (!video) return;
    
    const iframe = document.getElementById('videoPlayerFrame');
    const loader = document.getElementById('videoPageLoader');
    const buttons = document.querySelectorAll('.player-switch-btn');
    
    if (!iframe) return;
    
    buttons.forEach(btn => {
        btn.classList.remove('active');
        btn.style.background = '';
        btn.style.color = '';
        const icon = btn.querySelector('i');
        if (icon) {
            icon.style.color = btn.style.borderColor || '#8aa07a';
        }
    });
    
    const activeBtn = Array.from(buttons).find(b => b.textContent.includes(platformId.charAt(0).toUpperCase() + platformId.slice(1)));
    if (activeBtn) {
        activeBtn.classList.add('active');
        const color = activeBtn.style.borderColor || '#bd8a3e';
        activeBtn.style.background = color;
        activeBtn.style.color = 'white';
        const icon = activeBtn.querySelector('i');
        if (icon) icon.style.color = 'white';
    }
    
    if (loader) loader.style.display = 'flex';
    
    const embedUrl = getEmbedUrl(video, platformId);
    iframe.src = embedUrl;
    
    iframe.addEventListener('load', function() {
        if (loader) loader.style.display = 'none';
    });
    setTimeout(function() {
        if (loader) loader.style.display = 'none';
    }, 3000);
}

function closeVideoPage() {
    const container = document.getElementById('videosContainer');
    const searchBar = document.querySelector('.search-sort-bar');
    const categoryHeader = document.querySelector('.current-category-header');
    const sidebar = document.querySelector('.videos-sidebar');
    
    if (searchBar) searchBar.style.display = 'flex';
    if (categoryHeader) categoryHeader.style.display = 'flex';
    if (sidebar) sidebar.style.display = 'block';
    
    renderVideos();
}

async function loadVideosFromFirebase() {
    const container = document.getElementById('videosContainer');
    const countSpan = document.getElementById('videosCount');
    
    try {
        const cached = loadFromCache();
        if (cached) {
            videosData = cached;
            console.log('📦 Данные из кеша:', videosData.length);
            renderVideos();
            renderAdminSortList();
            renderCategories();
            renderAdminCategoriesList();
            if (countSpan) countSpan.textContent = videosData.length + ' видео';
        }
        
        const snapshot = await firebase.database().ref('videos').once('value');
        const videosObj = snapshot.val();
        
        if (videosObj) {
            videosData = [];
            for (const key in videosObj) {
                if (key === 'categories') continue;
                const video = videosObj[key];
                videosData.push({
                    firebaseKey: key,
                    id: video.id || parseInt(key),
                    ...video,
                    youtubeId: video.youtubeId || extractVideoId(video.urlYoutube || '', 'youtube'),
                    vkId: video.vkId || extractVideoId(video.urlVk || '', 'vk'),
                    rutubeId: video.rutubeId || extractVideoId(video.urlRutube || '', 'rutube'),
                    category: video.category || ''
                });
            }
            
            saveToCache(videosData);
            console.log('✅ Данные обновлены из Firebase:', videosData.length);
        } else {
            videosData = [];
        }
        
        renderVideos();
        renderAdminSortList();
        renderCategories();
        renderAdminCategoriesList();
        if (countSpan) countSpan.textContent = videosData.length + ' видео';
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        if (!videosData || videosData.length === 0) {
            const cached = loadFromCache();
            if (cached) {
                videosData = cached;
                renderVideos();
                renderAdminSortList();
                renderCategories();
                renderAdminCategoriesList();
                if (countSpan) countSpan.textContent = videosData.length + ' видео (кеш)';
                showToastMessage('Загружено из кеша');
            }
        }
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
        showToastMessage('Ошибка добавления');
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
        showToastMessage('Ошибка обновления');
        return false;
    }
}

async function deleteVideoFromFirebase(video) {
    if (!video.firebaseKey) return false;
    try {
        await firebase.database().ref(`videos/${video.firebaseKey}`).remove();
        await loadVideosFromFirebase();
        showToastMessage('Видео удалено');
        return true;
    } catch (error) {
        console.error('Ошибка удаления:', error);
        showToastMessage('Ошибка удаления');
        return false;
    }
}

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
    if (currentCategory !== "all") {
        filtered = filtered.filter(v => v.category === currentCategory);
    }
    if (searchQuery && searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase().trim();
        filtered = filtered.filter(video => 
            video.title.toLowerCase().includes(query) ||
            (video.desc && video.desc.toLowerCase().includes(query))
        );
    }
    switch (sortOrder) {
        case "newest":
            filtered.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            break;
        case "oldest":
            filtered.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
            break;
        case "year-desc":
            filtered.sort((a, b) => (parseInt(b.year) || 0) - (parseInt(a.year) || 0));
            break;
        case "year-asc":
            filtered.sort((a, b) => (parseInt(a.year) || 0) - (parseInt(b.year) || 0));
            break;
        case "title-asc":
            filtered.sort((a, b) => a.title.localeCompare(b.title, 'ru'));
            break;
        case "title-desc":
            filtered.sort((a, b) => b.title.localeCompare(a.title, 'ru'));
            break;
        default:
            filtered.sort((a, b) => {
                const orderA = a.order !== undefined ? a.order : a.createdAt;
                const orderB = b.order !== undefined ? b.order : b.createdAt;
                return (orderA || 0) - (orderB || 0);
            });
    }
    return filtered;
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => m === '&' ? '&amp;' : m === '<' ? '&lt;' : '&gt;');
}

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

function renderAdminSortList() {
    const container = document.getElementById('adminVideosSortList');
    if (!container) return;
    if (videosData.length === 0) {
        container.innerHTML = '<div class="empty-videos" style="padding: 20px;">Нет видео для сортировки</div>';
        return;
    }
    const sorted = [...videosData].sort((a, b) => (a.order || 0) - (b.order || 0));
    let html = '';
    sorted.forEach((video, index) => {
        const thumbUrl = getVideoThumbnail(video);
        const platforms = getAvailablePlatforms(video);
        const platformIcons = platforms.map(p => `<i class="${p.icon}" style="color:${p.color};"></i>`).join(' ');
        html += `
            <div class="admin-sort-item" data-id="${video.id}" data-firebase-key="${video.firebaseKey}" data-index="${index}">
                <div class="drag-handle"><i class="fas fa-grip-vertical"></i></div>
                <img class="admin-sort-thumb" src="${thumbUrl}" alt="${escapeHtml(video.title)}" onerror="this.src='https://i.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg'">
                <div class="admin-sort-info">
                    <div class="admin-sort-title">${escapeHtml(video.title)}</div>
                    <div class="admin-sort-meta">${video.duration || '0:00'} • ${video.year || '—'} • ${platformIcons}</div>
                </div>
                <div class="admin-sort-order">${index + 1}</div>
                <div class="admin-sort-actions">
                    <button class="admin-edit-btn" onclick="openEditModal(${JSON.stringify(video).replace(/"/g, '&quot;')})" title="Редактировать">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="admin-delete-btn" onclick="deleteVideoFromFirebase(${JSON.stringify(video).replace(/"/g, '&quot;')})" title="Удалить">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
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
            const newItems = Array.from(container.querySelectorAll('.admin-sort-item'));
            const updates = [];
            for (let i = 0; i < newItems.length; i++) {
                const firebaseKey = newItems[i].dataset.firebaseKey;
                updates.push(firebase.database().ref(`videos/${firebaseKey}`).update({ order: i }));
            }
            await Promise.all(updates);
            await loadVideosFromFirebase();
            showToastMessage('Порядок видео сохранён');
            newItems.forEach((el, idx) => {
                const orderSpan = el.querySelector('.admin-sort-order');
                if (orderSpan) orderSpan.textContent = `${idx + 1}`;
            });
        });
    });
}

const originalShowAdminPanel = showAdminPanel;
showAdminPanel = function() {
    originalShowAdminPanel();
    if (isAdmin()) {
        if (document.getElementById('adminVideosSortList')) {
            renderAdminSortList();
        }
        if (document.getElementById('adminCategoriesList')) {
            renderAdminCategoriesList();
        }
    }
};

function renderVideos() {
    const container = document.getElementById('videosContainer');
    const countSpan = document.getElementById('videosCount');
    const titleSpan = document.querySelector('#currentCategoryTitle span');
    
    if (titleSpan) {
        if (currentCategory === 'all') {
            titleSpan.innerText = 'Все видео';
        } else {
            const cat = categoriesData.find(c => c.id === currentCategory);
            titleSpan.innerText = cat ? cat.name : 'Все видео';
        }
    }
    
    const filtered = getFilteredAndSortedVideos();
    if (countSpan) {
        let countText = `${filtered.length} видео`;
        if (searchQuery && searchQuery.trim()) countText += ` (найдено)`;
        countSpan.innerText = countText;
    }
    
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-videos">
                <i class="fas fa-video-slash"></i>
                <p>${searchQuery ? 'Ничего не найдено' : 'Видео временно отсутствуют'}</p>
                ${searchQuery ? '<button onclick="clearSearch()" class="clear-search-btn" style="margin-top:10px;padding:8px 20px;background:#bd8a3e;border:none;border-radius:20px;cursor:pointer;">Очистить поиск</button>' : ''}
            </div>
        `;
        return;
    }
    
    let html = '<div class="videos-grid">';
    filtered.forEach(video => {
        const ageBadge = video.is18Plus ? '<span class="age-badge-18">18+</span>' : '';
        const blurClass = video.is18Plus ? 'blurred-thumb' : '';
        const blurOverlay = video.is18Plus ? '<div class="blur-overlay"><i class="fas fa-lock"></i> Подтвердите возраст</div>' : '';
        const thumbUrl = getVideoThumbnail(video);
        const platforms = getAvailablePlatforms(video);
        const platformIcons = platforms.map(p => `<i class="${p.icon}" style="color:${p.color};"></i>`).join(' ');
        
        html += `
            <div class="video-card" data-id="${video.id}" onclick="openVideoPage(${JSON.stringify(video).replace(/"/g, '&quot;')})">
                <div class="video-thumb ${blurClass}">
                    <img src="${thumbUrl}" alt="${escapeHtml(video.title)}" loading="lazy" onerror="this.src='https://i.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg'">
                    <div class="play-overlay"><i class="fas fa-play"></i></div>
                    ${ageBadge}
                    ${blurOverlay}
                </div>
                <div class="video-info">
                    <div class="video-title">${escapeHtml(video.title)}</div>
                    <div class="video-meta">
                        <span class="video-duration"><i class="far fa-clock"></i> ${video.duration || '0:00'}</span>
                        <span class="video-year"><i class="far fa-calendar-alt"></i> ${video.year || ''}</span>
                        <span class="video-platform">${platformIcons}</span>
                    </div>
                </div>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
}

function openEditModal(video) {
    if (!video) {
        showToastMessage('Видео не найдено');
        return;
    }
    
    currentEditVideo = video;
    
    document.getElementById('editVideoId').value = video.id || '';
    document.getElementById('editVideoTitle').value = video.title || '';
    document.getElementById('editVideoUrlYoutube').value = video.urlYoutube || '';
    document.getElementById('editVideoUrlVk').value = video.urlVk || '';
    document.getElementById('editVideoUrlRutube').value = video.urlRutube || '';
    document.getElementById('editVideoDesc').value = video.desc || '';
    document.getElementById('editVideoDuration').value = video.duration || '';
    document.getElementById('editVideoThumb').value = video.thumb || '';
    document.getElementById('editVideoYear').value = video.year || '';
    document.getElementById('editVideo18Plus').checked = video.is18Plus || false;
    document.getElementById('editVideoCategory').value = video.category || '';
    
    const thumbUrl = getVideoThumbnail(video);
    if (thumbUrl) {
        document.getElementById('editThumbPreviewImg').src = thumbUrl;
        document.getElementById('editThumbPreview').style.display = 'block';
    }
    
    document.getElementById('editModal').style.display = 'flex';
}

function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
    currentEditVideo = null;
}

async function saveEditedVideo(event) {
    if (!isAdmin() || !currentEditVideo) {
        showToastMessage('Нет прав для редактирования');
        return;
    }
    
    const title = document.getElementById('editVideoTitle').value.trim();
    const urlYoutube = document.getElementById('editVideoUrlYoutube').value.trim();
    const urlVk = document.getElementById('editVideoUrlVk').value.trim();
    const urlRutube = document.getElementById('editVideoUrlRutube').value.trim();
    
    if (!title || (!urlYoutube && !urlVk && !urlRutube)) {
        showToastMessage('Заполните название и хотя бы одну ссылку');
        return;
    }
    
    const youtubeId = extractVideoId(urlYoutube, 'youtube');
    const vkId = extractVideoId(urlVk, 'vk');
    const rutubeId = extractVideoId(urlRutube, 'rutube');
    
    let duration = document.getElementById('editVideoDuration').value.trim();
    if (!duration && youtubeId) {
        const cached = await getCachedVideoData(youtubeId);
        if (cached && cached.duration) {
            duration = cached.duration;
        }
    }
    if (!duration) duration = '0:00';
    
    let thumb = document.getElementById('editVideoThumb').value.trim();
    if (!thumb && youtubeId) {
        thumb = getYouTubeThumbnail(youtubeId);
    }
    
    const updatedData = {
        title,
        urlYoutube: urlYoutube,
        urlVk: urlVk,
        urlRutube: urlRutube,
        youtubeId: youtubeId,
        vkId: vkId,
        rutubeId: rutubeId,
        desc: document.getElementById('editVideoDesc').value.trim(),
        duration: duration,
        thumb: thumb || '',
        year: document.getElementById('editVideoYear').value.trim(),
        is18Plus: document.getElementById('editVideo18Plus').checked,
        category: document.getElementById('editVideoCategory').value || ''
    };
    
    const saveBtn = event.target;
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Сохранение...';
    saveBtn.disabled = true;
    
    try {
        await firebase.database().ref(`videos/${currentEditVideo.firebaseKey}`).update(updatedData);
        closeEditModal();
        await loadVideosFromFirebase();
        renderCategories();
        renderAdminCategoriesList();
        showToastMessage('Видео обновлено');
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        showToastMessage('Ошибка сохранения');
    } finally {
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }
}

function showAdminPanel() {
    const panel = document.getElementById('adminPanel');
    if (panel && isAdmin()) {
        panel.style.display = 'block';
        showToastMessage('Админ-панель активирована');
        renderAdminSortList();
        renderAdminCategoriesList();
    } else if (!isAdmin()) {
        showToastMessage('Доступ только для администратора');
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
                showToastMessage('Сначала войдите');
                if (typeof showAuthModal === 'function') showAuthModal();
                return; 
            }
            isAdmin() ? showAdminPanel() : showToastMessage('Доступ только для администратора');
        }
    });
}

async function fetchVideoDurationFromYoutube(youtubeId) {
    if (!youtubeId) return null;
    if (!YOUTUBE_API_KEY || YOUTUBE_API_KEY === 'ВАШ_API_КЛЮЧ_YOUTUBE') return null;
    try {
        const url = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${youtubeId}&key=${YOUTUBE_API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();
        if (!data.items || data.items.length === 0) return null;
        const durationISO = data.items[0].contentDetails.duration;
        return formatDuration(durationISO);
    } catch (error) {
        console.error('Ошибка получения длительности YouTube:', error);
        return null;
    }
}

async function getCachedVideoData(youtubeId) {
    if (!youtubeId) return null;
    try {
        const snapshot = await firebase.database().ref('videoCache/' + youtubeId).once('value');
        return snapshot.val();
    } catch (error) {
        return null;
    }
}

async function saveCachedVideoData(youtubeId, data) {
    if (!youtubeId) return;
    try {
        await firebase.database().ref('videoCache/' + youtubeId).set({
            duration: data.duration || '',
            title: data.title || '',
            thumb: data.thumb || '',
            updatedAt: Date.now()
        });
    } catch (error) {
        console.error('Ошибка сохранения кеша:', error);
    }
}

function formatDuration(isoString) {
    const match = isoString.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    const hours = parseInt(match?.[1]) || 0;
    const minutes = parseInt(match?.[2]) || 0;
    const seconds = parseInt(match?.[3]) || 0;
    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

async function fetchAllDurations() {
    const urlYoutube = document.getElementById('newVideoUrlYoutube').value.trim();
    const durationInput = document.getElementById('newVideoDuration');
    
    if (!urlYoutube) {
        showToastMessage('Введите ссылку YouTube');
        return;
    }
    
    const youtubeId = extractVideoId(urlYoutube, 'youtube');
    if (!youtubeId) {
        showToastMessage('Не удалось определить YouTube ID');
        return;
    }
    
    const cached = await getCachedVideoData(youtubeId);
    if (cached && cached.duration) {
        durationInput.value = cached.duration;
        durationInput.classList.add('duration-auto');
        setTimeout(() => durationInput.classList.remove('duration-auto'), 2000);
        showToastMessage(`Длительность из кеша: ${cached.duration}`);
        return;
    }
    
    const duration = await fetchVideoDurationFromYoutube(youtubeId);
    if (duration) {
        durationInput.value = duration;
        durationInput.classList.add('duration-auto');
        setTimeout(() => durationInput.classList.remove('duration-auto'), 2000);
        showToastMessage(`Длительность: ${duration}`);
        await saveCachedVideoData(youtubeId, { duration });
    } else {
        showToastMessage('Не удалось определить длительность');
    }
}

async function fetchEditAllDurations() {
    const urlYoutube = document.getElementById('editVideoUrlYoutube').value.trim();
    const durationInput = document.getElementById('editVideoDuration');
    
    if (!urlYoutube) {
        showToastMessage('Введите ссылку YouTube');
        return;
    }
    
    const youtubeId = extractVideoId(urlYoutube, 'youtube');
    if (!youtubeId) {
        showToastMessage('Не удалось определить YouTube ID');
        return;
    }
    
    const cached = await getCachedVideoData(youtubeId);
    if (cached && cached.duration) {
        durationInput.value = cached.duration;
        durationInput.classList.add('duration-auto');
        setTimeout(() => durationInput.classList.remove('duration-auto'), 2000);
        showToastMessage(`Длительность из кеша: ${cached.duration}`);
        return;
    }
    
    const duration = await fetchVideoDurationFromYoutube(youtubeId);
    if (duration) {
        durationInput.value = duration;
        durationInput.classList.add('duration-auto');
        setTimeout(() => durationInput.classList.remove('duration-auto'), 2000);
        showToastMessage(`Длительность: ${duration}`);
        await saveCachedVideoData(youtubeId, { duration });
    } else {
        showToastMessage('Не удалось определить длительность');
    }
}

async function addNewVideo(event) {
    if (!isAdmin()) { showToastMessage('Нет прав'); return; }
    
    const title = document.getElementById('newVideoTitle').value.trim();
    const urlYoutube = document.getElementById('newVideoUrlYoutube').value.trim();
    const urlVk = document.getElementById('newVideoUrlVk').value.trim();
    const urlRutube = document.getElementById('newVideoUrlRutube').value.trim();
    
    if (!title || (!urlYoutube && !urlVk && !urlRutube)) {
        showToastMessage('Заполните название и хотя бы одну ссылку');
        return;
    }
    
    const youtubeId = extractVideoId(urlYoutube, 'youtube');
    const vkId = extractVideoId(urlVk, 'vk');
    const rutubeId = extractVideoId(urlRutube, 'rutube');
    
    let duration = document.getElementById('newVideoDuration').value.trim();
    if (!duration && youtubeId) {
        const cached = await getCachedVideoData(youtubeId);
        if (cached && cached.duration) {
            duration = cached.duration;
        } else {
            const fetched = await fetchVideoDurationFromYoutube(youtubeId);
            if (fetched) {
                duration = fetched;
                await saveCachedVideoData(youtubeId, { duration });
            }
        }
    }
    if (!duration) duration = '0:00';
    
    let thumb = document.getElementById('newVideoThumb').value.trim();
    if (!thumb && youtubeId) {
        thumb = getYouTubeThumbnail(youtubeId);
    }
    
    const categorySelect = document.getElementById('newVideoCategory');
    const selectedCategory = categorySelect ? categorySelect.value : '';
    
    const videoData = {
        title,
        urlYoutube: urlYoutube,
        urlVk: urlVk,
        urlRutube: urlRutube,
        youtubeId: youtubeId,
        vkId: vkId,
        rutubeId: rutubeId,
        desc: document.getElementById('newVideoDesc').value.trim() || '',
        duration: duration,
        thumb: thumb || '',
        year: document.getElementById('newVideoYear').value.trim() || new Date().getFullYear().toString(),
        is18Plus: document.getElementById('newVideo18Plus').checked,
        category: selectedCategory
    };
    
    const saveBtn = event.target;
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Сохранение...';
    saveBtn.disabled = true;
    
    try {
        await firebase.database().ref('videos').push(videoData);
        
        if (youtubeId && duration !== '0:00') {
            await saveCachedVideoData(youtubeId, { duration, title });
        }
        
        document.getElementById('newVideoTitle').value = '';
        document.getElementById('newVideoUrlYoutube').value = '';
        document.getElementById('newVideoUrlVk').value = '';
        document.getElementById('newVideoUrlRutube').value = '';
        document.getElementById('newVideoDesc').value = '';
        document.getElementById('newVideoDuration').value = '';
        document.getElementById('newVideoThumb').value = '';
        document.getElementById('newVideoYear').value = '';
        document.getElementById('newVideo18Plus').checked = false;
        
        await loadVideosFromFirebase();
        renderCategories();
        renderAdminCategoriesList();
        
        showToastMessage('Видео добавлено');
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        showToastMessage('Ошибка сохранения');
    } finally {
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }
}

function populateCategorySelects() {
    const selects = ['newVideoCategory', 'editVideoCategory'];
    selects.forEach(id => {
        const select = document.getElementById(id);
        if (!select) return;
        const currentValue = select.value;
        select.innerHTML = '';
        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.textContent = 'Без категории';
        select.appendChild(emptyOption);
        categoriesData.forEach(cat => {
            if (cat.id === 'all') return;
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.name;
            select.appendChild(option);
        });
        if (currentValue) {
            select.value = currentValue;
        }
    });
}

async function loadCategoriesFromFirebase() {
    try {
        const snapshot = await firebase.database().ref('videos/categories').once('value');
        const data = snapshot.val();
        if (data) {
            categoriesData = Object.entries(data).map(([key, cat]) => ({
                firebaseKey: key,
                id: cat.id || '',
                name: cat.name || '',
                icon: cat.icon || 'fas fa-folder'
            }));
        } else {
            categoriesData = [];
        }
        populateCategorySelects();
        renderCategories();
        renderAdminCategoriesList();
    } catch (error) {
        console.error('Ошибка загрузки категорий:', error);
        categoriesData = [];
        populateCategorySelects();
        renderCategories();
    }
}

function renderCategories() {
    const container = document.getElementById('categoryList');
    if (!container) return;
    let html = '';
    const allCount = videosData.length;
    html += `<div class="category-item ${currentCategory === 'all' ? 'active' : ''}" data-category="all">
                <i class="fas fa-video"></i>
                <span class="category-name">Все видео</span>
                <span class="category-count">${allCount}</span>
            </div>`;
    categoriesData.forEach(cat => {
        if (cat.id === 'all') return;
        const count = videosData.filter(v => v.category === cat.id).length;
        const icon = cat.icon || 'fas fa-folder';
        const isActive = currentCategory === cat.id;
        html += `<div class="category-item ${isActive ? 'active' : ''}" data-category="${cat.id}">
                    <i class="${icon}"></i>
                    <span class="category-name">${escapeHtml(cat.name)}</span>
                    <span class="category-count">${count}</span>
                </div>`;
    });
    container.innerHTML = html;
    document.querySelectorAll('.category-item').forEach(item => {
        item.addEventListener('click', function() {
            currentCategory = this.dataset.category;
            renderCategories();
            renderVideos();
        });
    });
}

function renderAdminCategoriesList() {
    const container = document.getElementById('adminCategoriesList');
    if (!container) return;
    if (categoriesData.length === 0) {
        container.innerHTML = '<div class="empty-videos" style="padding: 20px;">Нет категорий. Добавьте первую!</div>';
        return;
    }
    let html = '';
    categoriesData.forEach(cat => {
        if (cat.id === 'all') return;
        const firebaseKey = cat.firebaseKey || '';
        html += `
            <div class="admin-category-item" data-key="${firebaseKey}">
                <span class="admin-category-icon"><i class="${cat.icon || 'fas fa-folder'}"></i></span>
                <span class="admin-category-name">${escapeHtml(cat.name)}</span>
                <span class="admin-category-id">${escapeHtml(cat.id)}</span>
                <div class="admin-category-actions">
                    <button class="admin-edit-btn" onclick="openEditCategoryModal('${firebaseKey}')" title="Редактировать">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="admin-delete-btn" onclick="deleteCategory('${firebaseKey}')" title="Удалить">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function openEditCategoryModal(categoryKey) {
    const cat = categoriesData.find(c => c.firebaseKey === categoryKey);
    if (!cat) return;
    document.getElementById('editCategoryKey').value = categoryKey;
    document.getElementById('editCategoryId').value = cat.id || '';
    document.getElementById('editCategoryName').value = cat.name || '';
    document.getElementById('editCategoryIcon').value = cat.icon || 'fas fa-folder';
    document.getElementById('editCategoryModal').style.display = 'flex';
}

function closeEditCategoryModal() {
    document.getElementById('editCategoryModal').style.display = 'none';
}

async function saveEditedCategory(event) {
    const categoryKey = document.getElementById('editCategoryKey').value;
    const id = document.getElementById('editCategoryId').value.trim();
    const name = document.getElementById('editCategoryName').value.trim();
    const icon = document.getElementById('editCategoryIcon').value.trim() || 'fas fa-folder';
    if (!id || !name) {
        showToastMessage('Заполните ID и название');
        return;
    }
    const saveBtn = event.target;
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Сохранение...';
    saveBtn.disabled = true;
    try {
        let success;
        if (categoryKey) {
            await firebase.database().ref(`videos/categories/${categoryKey}`).update({ id, name, icon });
            success = true;
        } else {
            await firebase.database().ref('videos/categories').push({ id, name, icon });
            success = true;
        }
        if (success) {
            closeEditCategoryModal();
            await loadCategoriesFromFirebase();
            populateCategorySelects();
            renderCategories();
            renderAdminCategoriesList();
            showToastMessage('Категория сохранена');
        }
    } catch (error) {
        console.error('Ошибка сохранения категории:', error);
        showToastMessage('Ошибка сохранения');
    } finally {
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }
}

async function addCategory() {
    if (!isAdmin()) { showToastMessage('Нет прав'); return; }
    const id = document.getElementById('newCategoryId').value.trim();
    const name = document.getElementById('newCategoryName').value.trim();
    const icon = document.getElementById('newCategoryIcon').value.trim() || 'fas fa-folder';
    if (!id || !name) { showToastMessage('Заполните ID и название'); return; }
    try {
        await firebase.database().ref('videos/categories').push({ id, name, icon });
        showToastMessage('Категория добавлена');
        await loadCategoriesFromFirebase();
        populateCategorySelects();
        renderCategories();
        renderAdminCategoriesList();
        document.getElementById('newCategoryId').value = '';
        document.getElementById('newCategoryName').value = '';
        document.getElementById('newCategoryIcon').value = 'fas fa-folder';
    } catch (error) {
        console.error('Ошибка добавления категории:', error);
        showToastMessage('Ошибка добавления категории');
    }
}

async function deleteCategory(categoryKey) {
    if (!categoryKey) return;
    const cat = categoriesData.find(c => c.firebaseKey === categoryKey);
    if (!cat) return;
    if (!confirm(`Удалить категорию "${cat.name}"?`)) return;
    try {
        await firebase.database().ref(`videos/categories/${categoryKey}`).remove();
        showToastMessage('Категория удалена');
        await loadCategoriesFromFirebase();
        populateCategorySelects();
        renderCategories();
        renderAdminCategoriesList();
    } catch (error) {
        console.error('Ошибка удаления категории:', error);
        showToastMessage('Ошибка удаления категории');
    }
}

function initUrlPreview() {
    const urlInput = document.getElementById('newVideoUrlInput');
    if (!urlInput) return;
    urlInput.addEventListener('input', function() {
        const url = this.value.trim();
        const preview = document.getElementById('urlPreview');
        const previewImg = document.getElementById('urlPreviewImg');
        const thumbInput = document.getElementById('newVideoThumb');
        if (url && (url.startsWith('http') || url.startsWith('https'))) {
            previewImg.src = url;
            preview.style.display = 'block';
            thumbInput.value = url;
            document.getElementById('thumbPreview').style.display = 'none';
        } else {
            preview.style.display = 'none';
        }
    });
}

function initEditUrlPreview() {
    const urlInput = document.getElementById('editVideoUrlInput');
    if (!urlInput) return;
    urlInput.addEventListener('input', function() {
        const url = this.value.trim();
        const preview = document.getElementById('editUrlPreview');
        const previewImg = document.getElementById('editUrlPreviewImg');
        const thumbInput = document.getElementById('editVideoThumb');
        if (url && (url.startsWith('http') || url.startsWith('https'))) {
            previewImg.src = url;
            preview.style.display = 'block';
            thumbInput.value = url;
            document.getElementById('editThumbPreview').style.display = 'none';
        } else {
            preview.style.display = 'none';
        }
    });
}

function uploadThumbnailFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
        showToastMessage('Выберите изображение');
        return;
    }
    if (file.size > 5 * 1024 * 1024) {
        showToastMessage('Файл больше 5MB');
        return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
        const imageUrl = e.target.result;
        document.getElementById('newVideoThumb').value = imageUrl;
        document.getElementById('thumbPreviewImg').src = imageUrl;
        document.getElementById('thumbPreview').style.display = 'block';
        document.getElementById('newVideoUrlInput').value = '';
        document.getElementById('urlPreview').style.display = 'none';
        showToastMessage('Превью загружено');
    };
    reader.readAsDataURL(file);
}

function uploadEditThumbnailFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
        showToastMessage('Выберите изображение');
        return;
    }
    if (file.size > 5 * 1024 * 1024) {
        showToastMessage('Файл больше 5MB');
        return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
        const imageUrl = e.target.result;
        document.getElementById('editVideoThumb').value = imageUrl;
        document.getElementById('editThumbPreviewImg').src = imageUrl;
        document.getElementById('editThumbPreview').style.display = 'block';
        document.getElementById('editVideoUrlInput').value = '';
        document.getElementById('editUrlPreview').style.display = 'none';
        showToastMessage('Превью обновлено');
    };
    reader.readAsDataURL(file);
}

function clearUrlInput() {
    document.getElementById('newVideoUrlInput').value = '';
    document.getElementById('urlPreview').style.display = 'none';
    document.getElementById('newVideoThumb').value = '';
    document.getElementById('thumbPreview').style.display = 'none';
    showToastMessage('Превью удалено');
}

function clearEditUrlInput() {
    document.getElementById('editVideoUrlInput').value = '';
    document.getElementById('editUrlPreview').style.display = 'none';
    document.getElementById('editVideoThumb').value = '';
    document.getElementById('editThumbPreview').style.display = 'none';
    showToastMessage('Превью удалено');
}

function clearEditThumb() {
    clearEditUrlInput();
}

function generateThumbnailFromYouTube() {
    const youtubeId = document.getElementById('newVideoYoutubeId').value.trim() || document.getElementById('newVideoUrlYoutube').value.trim();
    if (!youtubeId) {
        showToastMessage('Введите YouTube ID или ссылку');
        return;
    }
    const id = extractVideoId(youtubeId, 'youtube') || youtubeId;
    const thumbUrl = getYouTubeThumbnail(id);
    if (thumbUrl) {
        document.getElementById('newVideoThumb').value = thumbUrl;
        document.getElementById('thumbPreviewImg').src = thumbUrl;
        document.getElementById('thumbPreview').style.display = 'block';
        document.getElementById('newVideoUrlInput').value = thumbUrl;
        showToastMessage('Превью из YouTube');
    }
}

function generateEditThumbnailFromYouTube() {
    const youtubeId = document.getElementById('editVideoYoutubeId').value.trim() || document.getElementById('editVideoUrlYoutube').value.trim();
    if (!youtubeId) {
        showToastMessage('Введите YouTube ID или ссылку');
        return;
    }
    const id = extractVideoId(youtubeId, 'youtube') || youtubeId;
    const thumbUrl = getYouTubeThumbnail(id);
    if (thumbUrl) {
        document.getElementById('editVideoThumb').value = thumbUrl;
        document.getElementById('editThumbPreviewImg').src = thumbUrl;
        document.getElementById('editThumbPreview').style.display = 'block';
        document.getElementById('editVideoUrlInput').value = thumbUrl;
        showToastMessage('Превью из YouTube');
    }
}

function detectVideoFromUrl(platform) {
    let urlInput;
    let idInput;
    
    if (platform === 'youtube') {
        urlInput = document.getElementById('newVideoUrlYoutube');
        idInput = 'newVideoYoutubeId';
    } else if (platform === 'vk') {
        urlInput = document.getElementById('newVideoUrlVk');
        idInput = 'newVideoVkId';
    } else if (platform === 'rutube') {
        urlInput = document.getElementById('newVideoUrlRutube');
        idInput = 'newVideoRutubeId';
    }
    
    if (!urlInput) return;
    const url = urlInput.value.trim();
    if (!url) { showToastMessage('Введите ссылку'); return; }
    
    const videoId = extractVideoId(url, platform);
    if (videoId) {
        document.getElementById(idInput).value = videoId;
        showToastMessage(`ID определён: ${videoId}`);
        if (platform === 'youtube') {
            const thumbUrl = getYouTubeThumbnail(videoId);
            if (thumbUrl) {
                document.getElementById('newVideoThumb').value = thumbUrl;
                document.getElementById('thumbPreviewImg').src = thumbUrl;
                document.getElementById('thumbPreview').style.display = 'block';
            }
            fetchAllDurations();
        }
    } else {
        showToastMessage(`ID не определён для ${getPlatformName(platform)}`);
    }
}

function detectEditVideoFromUrl() {
    const url = document.getElementById('editVideoUrlYoutube').value.trim();
    if (!url) { showToastMessage('Введите ссылку YouTube'); return; }
    const videoId = extractVideoId(url, 'youtube');
    if (videoId) {
        document.getElementById('editVideoYoutubeId').value = videoId;
        showToastMessage(`ID определён: ${videoId}`);
        fetchEditAllDurations();
    } else {
        showToastMessage('ID не определён');
    }
}

const CACHE_KEY = 'soldaty_videos_cache';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000;

function saveToCache(data) {
    try {
        const cacheData = {
            data: data,
            timestamp: Date.now()
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (e) {
        console.warn('Не удалось сохранить кеш:', e);
    }
}

function loadFromCache() {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const cacheData = JSON.parse(raw);
        if (Date.now() - cacheData.timestamp > CACHE_EXPIRY) {
            localStorage.removeItem(CACHE_KEY);
            return null;
        }
        return cacheData.data;
    } catch (e) {
        return null;
    }
}

function isOnline() {
    return navigator.onLine;
}

function confirmAge() {
    const day = document.getElementById('ageDay').value;
    const month = document.getElementById('ageMonth').value;
    const year = document.getElementById('ageYear').value;
    
    if (!day || !month || !year) {
        showAgeError('Заполните все поля даты рождения');
        return;
    }
    
    const birthDate = new Date(year, month - 1, day);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    
    if (age >= 18) {
        document.getElementById('ageVerificationModal').style.display = 'none';
        document.getElementById('ageError').style.display = 'none';
        if (pendingVideoForAge) {
            renderVideoPage(pendingVideoForAge);
            pendingVideoForAge = null;
        }
    } else {
        showAgeError('Вам должно быть 18 лет для просмотра этого видео');
    }
}

function showAgeError(message) {
    const errorEl = document.getElementById('ageError');
    errorEl.querySelector('span').textContent = message;
    errorEl.style.display = 'flex';
    setTimeout(() => {
        errorEl.style.display = 'none';
    }, 5000);
}

function cancelAgeVerification() {
    document.getElementById('ageVerificationModal').style.display = 'none';
    document.getElementById('ageError').style.display = 'none';
    pendingVideoForAge = null;
    document.getElementById('ageDay').value = '';
    document.getElementById('ageMonth').value = '';
    document.getElementById('ageYear').value = '';
}

function populateYears() {
    const select = document.getElementById('ageYear');
    const currentYear = new Date().getFullYear();
    for (let year = currentYear; year >= 1900; year--) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        select.appendChild(option);
    }
}

function populateDays() {
    const select = document.getElementById('ageDay');
    for (let day = 1; day <= 31; day++) {
        const option = document.createElement('option');
        option.value = day;
        option.textContent = day;
        select.appendChild(option);
    }
}

window.addEventListener('online', function() {
    showToastMessage('Соединение восстановлено');
    loadVideosFromFirebase();
});

window.addEventListener('offline', function() {
    showToastMessage('Нет соединения, данные из кеша');
});

document.addEventListener('DOMContentLoaded', function() {
    populateYears();
    populateDays();
    loadCategoriesFromFirebase();
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
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchVideos();
            }
        });
    }
});

window.loadVideosFromFirebase = loadVideosFromFirebase;
window.loadCategoriesFromFirebase = loadCategoriesFromFirebase;
window.addNewVideo = addNewVideo;
window.openEditModal = openEditModal;
window.closeEditModal = closeEditModal;
window.saveEditedVideo = saveEditedVideo;
window.showAdminPanel = showAdminPanel;
window.hideAdminPanel = hideAdminPanel;
window.addCategory = addCategory;
window.openEditCategoryModal = openEditCategoryModal;
window.closeEditCategoryModal = closeEditCategoryModal;
window.saveEditedCategory = saveEditedCategory;
window.deleteCategory = deleteCategory;
window.renderAdminCategoriesList = renderAdminCategoriesList;
window.renderCategories = renderCategories;
window.detectVideoFromUrl = detectVideoFromUrl;
window.detectEditVideoFromUrl = detectEditVideoFromUrl;
window.generateThumbnailFromYouTube = generateThumbnailFromYouTube;
window.generateEditThumbnailFromYouTube = generateEditThumbnailFromYouTube;
window.uploadThumbnailFile = uploadThumbnailFile;
window.uploadEditThumbnailFile = uploadEditThumbnailFile;
window.clearUrlInput = clearUrlInput;
window.clearEditUrlInput = clearEditUrlInput;
window.clearEditThumb = clearEditThumb;
window.searchVideos = searchVideos;
window.clearSearch = clearSearch;
window.setSortOrder = setSortOrder;
window.openVideoPage = openVideoPage;
window.closeVideoPage = closeVideoPage;
window.switchPlayerPlatform = switchPlayerPlatform;
window.getAvailablePlatforms = getAvailablePlatforms;
window.fetchAllDurations = fetchAllDurations;
window.fetchEditAllDurations = fetchEditAllDurations;
window.confirmAge = confirmAge;
window.cancelAgeVerification = cancelAgeVerification;