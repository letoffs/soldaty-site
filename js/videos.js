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
    { id: 7, title: "Анонсы сериалов Солдаты и Студенты (ст. прапорщик Шматко, Кабанов)", desc: "Эксклюзив 2005 года", youtubeId: "V276-Cp-0s0", duration: "1:35", year: "2005", category: "trailer" },
    // Клипы и нарезки
    { id: 8, title: "Солдаты — Юность в сапогах", desc: "Клип на песню «Юность в сапогах» с кадрами из сериала про 2-ю роту.", youtubeId: "zSGuZo0TXKU", duration: "2:01", year: "2004", category: "clip" },
    { id: 9, title: "Солдаты — Песня прапорщика Шматко «Не грусти»", desc: "Легендарная песня в исполнении Алексея Маклакова. «А прапорщик Шматко — это зверь, а не мужик!»", youtubeId: "qP1r5eOWNeA", duration: "2:00", year: "2008", category: "clip" },
    { id: 10, title: "Солдаты — Есть только миг", desc: "Душевная песня из спин-оффа «Новый год, твою дивизию» 2 серия. Отрывок, который трогает до глубины души.", youtubeId: "qirBsztWqWo", duration: "2:51", year: "2007", category: "clip" },
    { id: 11, title: "Солдаты — Три белых коня", desc: "Песня «Три белых коня» из спин-оффа «Новый год, твою дивизию» 1 серия. Новогоднее настроение по-армейски!", youtubeId: "J1XIfQkJHa0", duration: "2:48", year: "2007", category: "clip" },
    { id: 12, title: "Солдаты — Песня про зайцев", desc: "Знаменитая песня про зайцев из спин-оффа «Новый год, твою дивизию» 2 серия. «А нам всё равно, а нам всё равно...»", youtubeId: "mO4DaXcvxv0", duration: "2:34", year: "2007", category: "clip" },
    { id: 13, title: "Солдаты — Мурка", desc: "Песня «Мурка, ты мой мурёночек» из спин-оффа «Новый год, твою дивизию» 1 серия. Легендарный блатняк в армейской обработке!", youtubeId: "As2yFhGKL6E", duration: "3:02", year: "2007", category: "clip" },
    { id: 14, title: "Маклаков и 23 февраля - Когда поют солдаты", desc: "В концерте прозвучат песни из сериала Солдаты. Участвуют: Конец Фильма с композицией Юность в Сапогах, Дмитрий Маликов, Отпетые Машенники, БИ-2, Олег Газманов, Юта, а также несколько песен исполнит легендарный прапорщик Шматко (Алексей Маклаков). Увидите кадры из сериала Прапорщик. Концерт ведут: Зубов (Алексей Ошурков), Замполит Староконь (Вячеслав Гришечкин), Цлав (Руслан Сасин), Кот (Артем Григорьев), прапорщик Соколов (Иван Моховиков) и др.", youtubeId: "U-Bb6sOjqes", duration: "1:04:00", year: "2007", category: "clip", requiresAuth: true},
    // Закулисье (18+)
    { id: 15, title: "Солдаты — закулисье", desc: "Неформальные моменты со съемочной площадки. Курение, алкоголь, нецензурная лексика.", youtubeId: "HnPzAy8ylNg", duration: "23:38", year: "2007", category: "behind", is18Plus: true },
    { id: 16, title: "Солдаты — съёмочная группа", desc: "Актёры о съёмках и своих персонажах. Эксклюзивные закулисные истории.", youtubeId: "JMbIM0RKIV8", duration: "7:09", year: "2011", category: "behind" },
    // Пародии (новая категория)
    { id: 17, title: "Большая Разница — Шматко на шоу Интуиция (пародия)", desc: "Легендарная пародия от шоу «Большая Разница». Прапорщик Шматко в образе участника шоу «Интуиция». Алексей Маклаков в роли самого себя!", youtubeId: "l4IaVDIm_Ck", duration: "6:29", year: "2009", category: "parody" },
    { id: 18, title: "Большая Разница — Солдаты Римской империи (пародия)", desc: "Гениальная пародия от шоу «Большая Разница»! Если бы сериал «Солдаты» снимали во времена Римской империи. Легионеры, центурионы и... прапорщик Шматко по-римски!", youtubeId: "mRgplRji4es", duration: "7:41", year: "2009", category: "parody" },
];

// ==============================================
// КАТЕГОРИИ
// ==============================================
const categories = [
    { id: "all", name: "Все видео", icon: "fas fa-video", filter: null },
    { id: "trailer", name: "Трейлеры и анонсы", icon: "fas fa-film", filter: v => v.category === "trailer" },
    { id: "clip", name: "Клипы и нарезки", icon: "fas fa-music", filter: v => v.category === "clip" },
    { id: "parody", name: "Пародии", icon: "fas fa-laugh", filter: v => v.category === "parody" },
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
    const titleEl = document.getElementById('videoTitle');
    const descEl = document.getElementById('videoDesc');
    
    if (!modal || !container) {
        showToastMessage('❌ Ошибка открытия плеера');
        return;
    }
    
    titleEl.innerText = video.title;
    descEl.innerText = video.desc;
    container.innerHTML = '';
    
    // 🔥 ЕСЛИ ВИДЕО БЛОКИРОВАНО — ИСПОЛЬЗУЕМ ПРОКСИ
    if (video.useProxy === true && video.proxyUrl) {
        container.innerHTML = `
            <iframe 
                src="${video.proxyUrl}"
                style="width: 100%; height: 100%; border: none;"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen>
            </iframe>
        `;
        modal.style.display = 'flex';
        return;
    }
    
    // Обычный YouTube плеер для всех остальных видео
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
                // Если ошибка 150 — пробуем через прокси
                if (event.data === 150 || event.data === 101) {
                    console.log('Видео заблокировано для встраивания, пробуем прокси');
                    container.innerHTML = `
                        <iframe 
                            src="https://corsproxy.io/?url=https://www.youtube.com/embed/${video.youtubeId}"
                            style="width: 100%; height: 100%; border: none;"
                            allowfullscreen>
                        </iframe>
                    `;
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

window.onYouTubeIframeAPIReady = function() {
    console.log("✅ YouTube API готов");
    // Если есть отложенные запросы на воспроизведение - выполните их
    if (window.pendingVideo) {
        playVideoAfterCheck(window.pendingVideo);
        window.pendingVideo = null;
    }
};

// Также добавьте эту проверку
window.onerror = function(msg, url, line, col, error) {
    console.error("Ошибка:", msg, error);
    return false;
};
