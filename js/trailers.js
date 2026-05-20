// ==============================================
// ТРЕЙЛЕРЫ И ПРОМО-РОЛИКИ
// ==============================================

// Данные о трейлерах
const trailersData = [
    {
        id: 1,
        title: "Солдаты — Русский трейлер",
        desc: "Официальный трейлер культового российского сериала об армейской жизни. Знакомство с главными героями: прапорщиком Шматко, Михаилом Медведевым, Кузьмой Соколовым и другими.",
        youtubeId: "y53QOl2YIIs",
        duration: "1:01",
        year: "2004"
    },
    {
        id: 2,
        title: "Солдаты — Эксклюзивный трейлер",
        desc: "Эксклюзивный трейлер с лучшими моментами и цитатами из сериала. «Ё-моё!», «Настоящий полковник!» и другие легендарные фразы.",
        youtubeId: "jDPoJQTZCsA",
        duration: "0:40",
        year: "2004"
    },
    {
        id: 3,
        title: "Анонс сериала Солдаты-5",
        desc: "Анонс пятого сезона сериала «Солдаты» с телеканала Рен ТВ. Декабрь 2005 года. Уникальный промо-ролик середины нулевых.",
        youtubeId: "A7yf8ozRfog",
        duration: "0:43",
        year: "2005"
    },
    {
        id: 4,
        title: "Анонс сериала Солдаты-5",
        desc: "Анонс пятого сезона сериала «Солдаты» с телеканала Рен ТВ. 2005 год. Атмосферный промо-ролик с кадрами из сериала.",
        youtubeId: "6IVCCODVfCM",
        duration: "0:33",
        year: "2005"
    }
];

// Переменные
let currentTrailerPlayer = null;

// Функция для уведомлений
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

// Закрыть модальное окно
function closeTrailerModal() {
    const modal = document.getElementById('trailerModal');
    if (modal) {
        modal.style.display = 'none';
    }
    
    if (currentTrailerPlayer && currentTrailerPlayer.destroy) {
        try {
            currentTrailerPlayer.destroy();
        } catch(e) {
            console.warn("Ошибка при уничтожении плеера:", e);
        }
        currentTrailerPlayer = null;
    }
    
    // Очищаем контейнер
    const container = document.getElementById('trailerPlayer');
    if (container) {
        container.innerHTML = '';
    }
}

// Воспроизвести трейлер
function playTrailer(trailer) {
    console.log("playTrailer вызван:", trailer);
    
    if (!trailer || !trailer.youtubeId) {
        showToastMessage('❌ Видео временно недоступно');
        return;
    }
    
    const modal = document.getElementById('trailerModal');
    const container = document.getElementById('trailerPlayer');
    
    if (!modal) {
        console.error("Модальное окно #trailerModal не найдено!");
        showToastMessage('❌ Ошибка: модальное окно не найдено');
        return;
    }
    
    if (!container) {
        console.error("Контейнер #trailerPlayer не найден!");
        showToastMessage('❌ Ошибка: контейнер плеера не найден');
        return;
    }
    
    // Очищаем контейнер
    container.innerHTML = '';
    
    // Создаём новый div для плеера
    const playerDiv = document.createElement('div');
    playerDiv.id = 'trailerPlayerDiv';
    container.appendChild(playerDiv);
    
    // Проверяем, загружен ли YouTube API
    if (typeof YT === 'undefined' || !YT.Player) {
        console.warn("YouTube API не загружен, загружаем...");
        showToastMessage('⏳ Загрузка плеера...');
        
        // Ждём загрузки YouTube API
        const checkYT = setInterval(() => {
            if (typeof YT !== 'undefined' && YT.Player) {
                clearInterval(checkYT);
                createAndPlayPlayer(trailer, playerDiv.id);
            }
        }, 100);
        
        setTimeout(() => {
            clearInterval(checkYT);
            if (!currentTrailerPlayer) {
                showToastMessage('❌ Не удалось загрузить плеер');
            }
        }, 5000);
        
        modal.style.display = 'flex';
        return;
    }
    
    createAndPlayPlayer(trailer, playerDiv.id);
    modal.style.display = 'flex';
}

function createAndPlayPlayer(trailer, playerDivId) {
    try {
        currentTrailerPlayer = new YT.Player(playerDivId, {
            height: '100%',
            width: '100%',
            videoId: trailer.youtubeId,
            playerVars: {
                'autoplay': 1,
                'rel': 0,
                'modestbranding': 1
            },
            events: {
                'onReady': function(event) {
                    console.log("Плеер готов, видео воспроизводится");
                    event.target.playVideo();
                },
                'onError': function(event) {
                    console.error('YouTube ошибка:', event);
                    let errorMsg = '❌ Ошибка загрузки видео';
                    if (event.data === 2) errorMsg = '❌ Неверный ID видео';
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
}

// Рендер сетки трейлеров
function renderTrailers() {
    const grid = document.getElementById('trailersGrid');
    if (!grid) {
        console.error("Контейнер #trailersGrid не найден!");
        return;
    }
    
    if (!trailersData || trailersData.length === 0) {
        grid.innerHTML = '<div class="trailer-empty"><i class="fas fa-video-slash"></i> Трейлеры временно недоступны</div>';
        return;
    }
    
    grid.innerHTML = '';
    
    trailersData.forEach(trailer => {
        const card = document.createElement('div');
        card.className = 'trailer-card';
        card.onclick = () => playTrailer(trailer);
        
        const thumbUrl = `https://img.youtube.com/vi/${trailer.youtubeId}/mqdefault.jpg`;
        
        card.innerHTML = `
            <div class="trailer-thumb">
                <img src="${thumbUrl}" alt="${trailer.title}" loading="lazy" onerror="this.src='https://placehold.co/320x180/1a2a1a/bd8a3e?text=No+Preview'">
                <div class="play-overlay">
                    <i class="fas fa-play"></i>
                </div>
            </div>
            <div class="trailer-info">
                <div class="trailer-title">${escapeHtml(trailer.title)}</div>
                <div class="trailer-desc">${escapeHtml(trailer.desc)}</div>
                <div class="trailer-meta">
                    <span class="trailer-duration"><i class="far fa-clock"></i> ${trailer.duration}</span>
                    <span class="trailer-year"><i class="far fa-calendar-alt"></i> ${trailer.year}</span>
                </div>
            </div>
        `;
        
        grid.appendChild(card);
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM загружен, инициализация трейлеров...");
    renderTrailers();
    
    // Закрытие по крестику
    const closeBtn = document.querySelector('#trailerModal .modal-close');
    if (closeBtn) {
        closeBtn.onclick = closeTrailerModal;
    }
    
    // Закрытие по клику вне окна
    const modal = document.getElementById('trailerModal');
    if (modal) {
        modal.onclick = function(e) {
            if (e.target === modal) {
                closeTrailerModal();
            }
        };
    }
});

// Обработчик для YouTube API
window.onYouTubeIframeAPIReady = function() {
    console.log("YouTube API готов");
};
