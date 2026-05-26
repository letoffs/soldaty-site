// ==============================================
// ДАННЫЕ ВИДЕО
// ==============================================
const videosData = [
    // Трейлеры и анонсы
    { id: 1, title: "Солдаты — Русский трейлер", desc: "Официальный трейлер культового российского сериала об армейской жизни. Знакомство с главными героями.", youtubeId: "y53QOl2YIIs", duration: "1:01", year: "2004", category: "trailer" },
    { id: 2, title: "Солдаты — Эксклюзивный трейлер", desc: "Эксклюзивный трейлер с лучшими моментами и цитатами из сериала.", youtubeId: "jDPoJQTZCsA", duration: "0:40", year: "2004", category: "trailer" },
    { id: 3, title: "Анонс сериала Солдаты-3", desc: "Анонс третьего сезона сериала «Солдаты». Промо-ролик с легендарными персонажами.", youtubeId: "l8ieplmmp8I", duration: "0:36", year: "2005", category: "trailer" },
    { id: 4, title: "Анонс сериала Солдаты-4", desc: "Атмосферный ролик с главными героями и лучшими моментами.", youtubeId: "1mM2rcffCCs", duration: "0:49", year: "2005", category: "trailer" },
    { id: 5, title: "Анонс сериала Солдаты-5", desc: "Анонс пятого сезона с телеканала Рен ТВ. Декабрь 2005 года.", youtubeId: "A7yf8ozRfog", duration: "0:43", year: "2005", category: "trailer" },
    { id: 6, title: "Анонс сериала Солдаты-9", desc: "Анонс девятого сезона. Рен ТВ, 2006 год.", youtubeId: "G8FVtub3wVQ", duration: "0:24", year: "2006", category: "trailer" },
    // Клипы и нарезки
    { id: 7, title: "Солдаты — Юность в сапогах", desc: "Клип на песню «Юность в сапогах» с кадрами из сериала про 2-ю роту.", youtubeId: "zSGuZo0TXKU", duration: "2:01", year: "2004", category: "clip" },
    { id: 8, title: "Солдаты — Лучшие моменты", desc: "Подборка самых смешных и легендарных сцен из сериала.", youtubeId: "Qw7UYgxZ9Ik", duration: "3:45", year: "2005", category: "clip" },
    { id: 9, title: "Солдаты — Прапорщик Шматко", desc: "Лучшие цитаты легендарного прапорщика Шматко.", youtubeId: "rR2XwKl9kUY", duration: "2:30", year: "2005", category: "clip" },
    // Закулисье (18+)
    { id: 10, title: "Солдаты — закулисье", desc: "Неформальные моменты со съемочной площадки. Курение, алкоголь, нецензурная лексика.", youtubeId: "HnPzAy8ylNg", duration: "23:38", year: "2007", category: "behind", is18Plus: true },
    { id: 11, title: "Солдаты — Интервью с актёрами", desc: "Актёры о съёмках и своих персонажах.", youtubeId: "dQw4w9WgXcQ", duration: "5:22", year: "2006", category: "behind" }
];

// ==============================================
// КАТЕГОРИИ
// ==============================================
const categories = [
    { id: "all", name: "Все видео", icon: "fas fa-video", filter: null },
    { id: "trailer", name: "Трейлеры и анонсы", icon: "fas fa-film", filter: v => v.category === "trailer" },
    { id: "clip", name: "Клипы и нарезки", icon: "fas fa-music", filter: v => v.category === "clip" },
    { id: "behind", name: "Закулисье", icon: "fas fa-users", filter: v => v.category === "behind" }
];

let currentCategory = "all";
let currentVideoPlayer = null;

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

function closeVideoModal() {
    const modal = document.getElementById('videoModal');
    if (modal) modal.style.display = 'none';
    if (currentVideoPlayer && currentVideoPlayer.destroy) {
        try {
            currentVideoPlayer.destroy();
        } catch (e) {
            console.warn("Ошибка при уничтожении плеера:", e);
        }
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
                <div class="age-verification-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3>Внимание! Контент 18+</h3>
                <p>Это видео содержит сцены, которые могут быть неуместны для лиц младше 18 лет.</p>
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
        if (callback) callback();
    };
    const onCancel = () => {
        ageModal.style.display = 'none';
        showToastMessage('⛔ Доступ запрещён. Контент 18+');
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

function playVideoAfterCheck(video) {
    const modal = document.getElementById('videoModal');
    const container = document.getElementById('videoPlayer');
    if (!modal || !container) {
        showToastMessage('❌ Ошибка открытия плеера');
        return;
    }
    document.getElementById('videoTitle').innerText = video.title;
    document.getElementById('videoDesc').innerText = video.desc;
    container.innerHTML = '';
    const playerDiv = document.createElement('div');
    playerDiv.id = 'videoPlayerDiv';
    container.appendChild(playerDiv);
    const createPlayer = () => {
        try {
            currentVideoPlayer = new YT.Player('videoPlayerDiv', {
                height: '100%',
                width: '100%',
                videoId: video.youtubeId,
                playerVars: { autoplay: 1, rel: 0, modestbranding: 1 },
                events: {
                    onError: (e) => showToastMessage('❌ Ошибка загрузки видео')
                }
            });
        } catch (e) {
            showToastMessage('❌ Ошибка создания плеера');
        }
    };
    if (typeof YT !== 'undefined' && YT.Player) {
        createPlayer();
    } else {
        const interval = setInterval(() => {
            if (typeof YT !== 'undefined' && YT.Player) {
                clearInterval(interval);
                createPlayer();
            }
        }, 100);
        setTimeout(() => clearInterval(interval), 5000);
    }
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
// ОТРИСОВКА КАТЕГОРИЙ И ВИДЕО
// ==============================================
function renderCategories() {
    const container = document.getElementById('categoryList');
    if (!container) return;
    let html = '';
    categories.forEach(cat => {
        const count = cat.filter ? videosData.filter(cat.filter).length : videosData.length;
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
                renderVideos();
            }
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
        html += `
            <div class="video-card" data-id="${video.id}">
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
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
    document.querySelectorAll('.video-card').forEach(card => {
        card.addEventListener('click', () => {
            const video = videosData.find(v => v.id == card.dataset.id);
            if (video) playVideo(video);
        });
    });
}

// ==============================================
// ИНИЦИАЛИЗАЦИЯ
// ==============================================
document.addEventListener('DOMContentLoaded', () => {
    renderCategories();
    renderVideos();
    const modal = document.getElementById('videoModal');
    if (modal) {
        modal.onclick = (e) => {
            if (e.target === modal) closeVideoModal();
        };
    }
    const closeBtn = document.querySelector('#videoModal .modal-close');
    if (closeBtn) closeBtn.onclick = closeVideoModal;
});

window.onYouTubeIframeAPIReady = () => {
    console.log("YouTube API готов");
};
