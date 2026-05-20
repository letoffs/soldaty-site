const videosData = [
    // ========== КАТЕГОРИЯ: ТРЕЙЛЕРЫ И АНОНСЫ ==========
    {
        id: 1,
        title: "Солдаты — Русский трейлер",
        desc: "Официальный трейлер культового российского сериала об армейской жизни. Знакомство с главными героями: прапорщиком Шматко, Михаилом Медведевым, Кузьмой Соколовым и другими.",
        youtubeId: "y53QOl2YIIs",
        duration: "1:01",
        year: "2004",
        category: "trailer"
    },
    {
        id: 2,
        title: "Солдаты — Эксклюзивный трейлер",
        desc: "Эксклюзивный трейлер с лучшими моментами и цитатами из сериала. «Ё-моё!», «Настоящий полковник!» и другие легендарные фразы.",
        youtubeId: "jDPoJQTZCsA",
        duration: "0:40",
        year: "2004",
        category: "trailer"
    },
    {
        id: 3,
        title: "Анонс сериала Солдаты-3",
        desc: "Анонс третьего сезона сериала «Солдаты». Промо-ролик с кадрами из сериала и легендарными персонажами.",
        youtubeId: "l8ieplmmp8I",
        duration: "0:36",
        year: "2005",
        category: "trailer"
    },
    {
        id: 4,
        title: "Анонс сериала Солдаты-4",
        desc: "Ещё один анонс сериала «Солдаты». Атмосферный ролик с главными героями и лучшими моментами.",
        youtubeId: "1mM2rcffCCs",
        duration: "0:49",
        year: "2005",
        category: "trailer"
    },
    {
        id: 5,
        title: "Анонс сериала Солдаты-5",
        desc: "Анонс пятого сезона сериала «Солдаты» с телеканала Рен ТВ. Декабрь 2005 года. Уникальный промо-ролик середины нулевых.",
        youtubeId: "A7yf8ozRfog",
        duration: "0:43",
        year: "2005",
        category: "trailer"
    },
    {
        id: 6,
        title: "Анонс сериала Солдаты-5",
        desc: "Анонс пятого сезона сериала «Солдаты» с телеканала Рен ТВ. 2005 год. Атмосферный промо-ролик с кадрами из сериала.",
        youtubeId: "6IVCCODVfCM",
        duration: "0:33",
        year: "2005",
        category: "trailer"
    },
    {
        id: 7,
        title: "Анонс сериала Солдаты-9 (Рен ТВ, 2006)",
        desc: "Анонс девятого сезона сериала «Солдаты» с телеканала Рен ТВ. 2006 год. Промо-ролик к выходу новых серий легендарного армейского сериала.",
        youtubeId: "G8FVtub3wVQ",
        duration: "0:24",
        year: "2006",
        category: "trailer"
    },

    // ========== КАТЕГОРИЯ: КЛИПЫ И НАРЕЗКИ ==========
    {
        id: 8,
        title: "Солдаты (2 рота) — Юность в сапогах",
        desc: "Клип на песню «Юность в сапогах» с кадрами из сериала про 2-ю роту. Легендарный армейский настрой!",
        youtubeId: "zSGuZo0TXKU",
        duration: "2:01",
        year: "2004",
        category: "clip"
    },
    {
        id: 9,
        title: "Солдаты — закулисья. 18+",
        desc: "Представляем вашему вниманию подборку неформальных рабочих моментов со съемочной площадки популярного российского комедийного сериала о буднях военнослужащих. В кадр попали неудачные дубли, живое общение актеров и закулисная атмосфера, пропитанная специфическим юмором и нецензурной лексикой, которая обычно остается вне финальных версий эпизодов..",
        youtubeId: "HnPzAy8ylNg",
        duration: "23:38",
        year: "200?",
        category: "clip"
    }
];

// === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===
let currentVideoPlayer = null;

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
    }, 2000);
}

function closeVideoModal() {
    const modal = document.getElementById('videoModal');
    if (modal) modal.style.display = 'none';
    
    if (currentVideoPlayer && currentVideoPlayer.destroy) {
        try {
            currentVideoPlayer.destroy();
        } catch(e) {
            console.warn("Ошибка при уничтожении плеера:", e);
        }
        currentVideoPlayer = null;
    }
    
    const container = document.getElementById('videoPlayer');
    if (container) container.innerHTML = '';
}

function playVideo(video) {
    if (!video || !video.youtubeId) {
        showToastMessage('❌ Видео временно недоступно');
        return;
    }
    
    const modal = document.getElementById('videoModal');
    const container = document.getElementById('videoPlayer');
    
    if (!modal || !container) {
        console.error("Модальное окно или контейнер не найдены!");
        showToastMessage('❌ Ошибка: окно просмотра не найдено');
        return;
    }
    
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
                playerVars: { 'autoplay': 1, 'rel': 0, 'modestbranding': 1 },
                events: {
                    'onReady': (event) => event.target.playVideo(),
                    'onError': (event) => {
                        let errorMsg = '❌ Ошибка загрузки видео';
                        if (event.data === 5) errorMsg = '❌ Видео недоступно в этом регионе';
                        if (event.data === 100) errorMsg = '❌ Видео не найдено';
                        showToastMessage(errorMsg);
                    }
                }
            });
        } catch(e) {
            console.error("Ошибка создания плеера:", e);
            showToastMessage('❌ Не удалось создать плеер');
        }
    };
    
    if (typeof YT === 'undefined' || !YT.Player) {
        const checkYT = setInterval(() => {
            if (typeof YT !== 'undefined' && YT.Player) {
                clearInterval(checkYT);
                createPlayer();
            }
        }, 100);
        setTimeout(() => clearInterval(checkYT), 5000);
    } else {
        createPlayer();
    }
    
    modal.style.display = 'flex';
}

function renderVideos() {
    const container = document.getElementById('videosContainer');
    if (!container) return;
    
    const categories = {
        trailer: { title: "🎬 Трейлеры и анонсы", videos: videosData.filter(v => v.category === 'trailer') },
        clip: { title: "🎵 Клипы и нарезки", videos: videosData.filter(v => v.category === 'clip') }
    };
    
    let html = '';
    for (const [key, cat] of Object.entries(categories)) {
        if (cat.videos.length === 0) continue;
        html += `<div class="video-category"><h3 class="category-title">${cat.title}</h3><div class="videos-grid">`;
        cat.videos.forEach(video => {
            html += `
                <div class="video-card" data-id="${video.id}">
                    <div class="video-thumb">
                        <img src="https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg" alt="${video.title}" loading="lazy">
                        <div class="play-overlay"><i class="fas fa-play"></i></div>
                    </div>
                    <div class="video-info">
                        <div class="video-title">${escapeHtml(video.title)}</div>
                        <div class="video-desc">${escapeHtml(video.desc)}</div>
                        <div class="video-meta"><span class="video-duration"><i class="far fa-clock"></i> ${video.duration}</span><span class="video-year"><i class="far fa-calendar-alt"></i> ${video.year}</span></div>
                    </div>
                </div>
            `;
        });
        html += `</div></div>`;
    }
    container.innerHTML = html || '<div class="empty-videos">Видео временно недоступны</div>';
    
    document.querySelectorAll('.video-card').forEach(card => {
        card.onclick = () => playVideo(videosData.find(v => v.id == card.dataset.id));
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => m === '&' ? '&amp;' : m === '<' ? '&lt;' : '&gt;');
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    renderVideos();
    const closeBtn = document.querySelector('#videoModal .modal-close');
    if (closeBtn) closeBtn.onclick = closeVideoModal;
    const modal = document.getElementById('videoModal');
    if (modal) modal.onclick = (e) => { if (e.target === modal) closeVideoModal(); };
});

window.onYouTubeIframeAPIReady = () => console.log("YouTube API готов");
