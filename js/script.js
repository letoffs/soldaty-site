// Глобальные переменные
let currentSeason = 1;
let currentEpisodeObj = episodesData[0];
let currentPlayer = null;  // YouTube плеер
let currentRutubePlayer = null; // Rutube плеер
let currentRentvPlayer = null;     // РЕН ТВ плеер (iframe)
let currentPlatform = 'youtube'; // 'youtube', 'rutube' или 'rentv'
let currentFormRating = 0;
let autoplayEnabled = true;
let autoplayTimer = null;
let timerInterval = null;
let secondsLeft = 10;
let videoEndCheckInterval = null;
let currentVideoDuration = 0; // Длительность видео в секундах (если известна)
let videoStartTime = null;

// ========== МАППИНГ НАЗВАНИЙ ДЛЯ СПИН-ОФФОВ ==========
const seasonTitles = {
    // Основные сезоны 1-17
    1: "1 СЕЗОН",
    2: "2 СЕЗОН",
    3: "3 СЕЗОН",
    4: "4 СЕЗОН",
    5: "5 СЕЗОН",
    6: "6 СЕЗОН",
    7: "7 СЕЗОН",
    8: "8 СЕЗОН",
    9: "9 СЕЗОН",
    10: "10 СЕЗОН",
    11: "11 СЕЗОН",
    12: "12 СЕЗОН",
    13: "13 СЕЗОН",
    14: "14 СЕЗОН",
    15: "15 СЕЗОН",
    16: "16 СЕЗОН",
    17: "17 СЕЗОН",
    
    // Спин-оффы и спецвыпуски 18-30
    18: "ПРАПОРЩИК ШМАТКО (Ё-моё)",
    19: "КОЛОБКОВ. НАСТОЯЩИЙ ПОЛКОВНИК!",
    20: "БОРОДИН. ВОЗВРАЩЕНИЕ ГЕНЕРАЛА",
    21: "СМАЛЬКОВ. ДВОЙНОЙ ШАНТАЖ",
    22: "ЗДРАВСТВУЙ, РОТА, НОВЫЙ ГОД! (2004)",
    23: "23 ФЕВРАЛЯ (2005)",
    24: "НОВЫЙ ГОД, ТВОЮ ДИВИЗИЮ! (2007)",
    25: "СОЛДАТЫ. НАИЗНАНКУ (Документальный)",
    26: "СОЛДАТЫ. ДЕМБЕЛЬСКИЙ АЛЬБОМ (Ремикс)",
    27: "СОЛДАТЫ + МИСС ВСЕЛЕННАЯ",
    28: "СОЛДАТЫ РУЛЯТ",
    29: "КИНОИСТОРИИ. СОЛДАТЫ",
    30: "СОЛДАТЫ-2006 (НОВОГОДНЕЕ ШОУ)"
};

// Функция для получения отображаемого названия сезона
function getSeasonDisplayName(season) {
    if (seasonTitles[season]) {
        return seasonTitles[season];
    }
    return `${season} СЕЗОН`;
}

// ---------- ОЦЕНКИ СЕРИЙ ----------
let ratings = {};

// Получить следующую серию
function getNextEpisode() {
    const episodes = getEpisodesBySeason(currentSeason);
    const currentIndex = episodes.findIndex(ep => 
        ep.season === currentEpisodeObj.season && 
        ep.episode === currentEpisodeObj.episode
    );
    
    if (currentIndex !== -1 && currentIndex + 1 < episodes.length) {
        return episodes[currentIndex + 1];
    }
    
    const allSeasons = getSeasons();
    const currentSeasonIndex = allSeasons.findIndex(s => s === currentSeason);
    if (currentSeasonIndex !== -1 && currentSeasonIndex + 1 < allSeasons.length) {
        const nextSeason = allSeasons[currentSeasonIndex + 1];
        const nextSeasonEpisodes = getEpisodesBySeason(nextSeason);
        if (nextSeasonEpisodes.length > 0) {
            return nextSeasonEpisodes[0];
        }
    }
    return null;
}

// Запустить таймер автовоспроизведения
function startAutoplayTimer() {
    stopAutoplayTimer();
    if (!autoplayEnabled) return;
    
    const nextEpisode = getNextEpisode();
    if (!nextEpisode) return;
    
    secondsLeft = 10;
    updateTimerDisplay();
    
    const timerSpan = document.getElementById('autoplayTimer');
    if (timerSpan) {
        timerSpan.style.display = 'inline-block';
    }
    
    timerInterval = setInterval(() => {
        secondsLeft--;
        updateTimerDisplay();
        
        if (secondsLeft <= 0) {
            stopAutoplayTimer();
            stopVideoEndChecker();

            const next = getNextEpisode();
            if (next) {
                if (next.season !== currentSeason) {
                    currentSeason = next.season;
                    renderSeasonNav();
                    renderEpisodesGrid(currentSeason);
                }
                loadEpisode(next);
            }
        }
    }, 1000);
}

// Остановить таймер
function stopAutoplayTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    const timerSpan = document.getElementById('autoplayTimer');
    if (timerSpan) timerSpan.textContent = '';
}

// Обновить таймер на экране
function updateTimerDisplay() {
    const timerSpan = document.getElementById('autoplayTimer');
    if (timerSpan && autoplayEnabled && secondsLeft > 0 && timerInterval) {
        timerSpan.textContent = `↻ ${secondsLeft} сек`;
        timerSpan.style.display = 'inline-block';
    } else if (timerSpan) {
        timerSpan.textContent = '';
        timerSpan.style.display = 'none';
    }
}

// Переключение автовоспроизведения
function toggleAutoplay() {
    autoplayEnabled = !autoplayEnabled;
    if (!autoplayEnabled) {
        stopAutoplayTimer();
        stopVideoEndChecker();
    } else if (currentPlatform !== 'youtube') {
        startVideoEndChecker();
    }
}

// ========== ПРОВЕРКА ОКОНЧАНИЯ ВИДЕО ДЛЯ IFrame ПЛЕЕРОВ ==========

function startVideoEndChecker() {
    stopVideoEndChecker();
    if (!autoplayEnabled) return;
    if (currentPlatform === 'youtube') return;
    
    // Запоминаем время начала видео
    videoStartTime = Date.now();
    
    // Получаем примерную длительность из данных серии (если есть)
    if (currentEpisodeObj && currentEpisodeObj.duration) {
        currentVideoDuration = currentEpisodeObj.duration;
    } else {
        // Дефолтная длительность для серии (примерно 25-30 минут)
        currentVideoDuration = 25 * 60; // 25 минут по умолчанию
    }
    
    videoEndCheckInterval = setInterval(() => {
        if (!autoplayEnabled) return;
        
        const elapsedSeconds = (Date.now() - videoStartTime) / 1000;
        
        // Если прошло времени больше или равно длительности видео
        if (elapsedSeconds >= currentVideoDuration - 2) { // -2 секунды для точности
            console.log(`Видео на ${currentPlatform} закончилось (прошло ${Math.floor(elapsedSeconds)} сек)`);
            onVideoEnded();
        }
    }, 1000);
}

function stopVideoEndChecker() {
    if (videoEndCheckInterval) {
        clearInterval(videoEndCheckInterval);
        videoEndCheckInterval = null;
    }
    videoStartTime = null;
}

function onVideoEnded() {
    if (!autoplayEnabled) return;
    if (currentPlatform === 'youtube') return;
    
    console.log("Видео закончилось, запускаем таймер автовоспроизведения");
    stopVideoEndChecker();
    startAutoplayTimer();
}

// ---------- YouTube API ----------
function onYouTubeIframeAPIReady() {
    initPlayerSwitch();
    loadFirstEpisode();
}

function createYouTubePlayer(videoId) {
    const playerDiv = document.getElementById('youtubePlayerContainer');
    if (!playerDiv) return;
    
    playerDiv.innerHTML = '';
    
    if (currentPlayer && currentPlayer.destroy) {
        currentPlayer.destroy();
        currentPlayer = null;
    }
    
    currentPlayer = new YT.Player('youtubePlayerContainer', {
        height: '100%',
        width: '100%',
        videoId: videoId,
        playerVars: {
            'autoplay': 1,
            'rel': 0,
            'modestbranding': 1
        },
        events: {
            'onStateChange': onPlayerStateChange
        }
    });
}

function onPlayerStateChange(event) {
    if (event.data === 0) { // Видео закончилось
        console.log("YouTube видео закончилось");
        if (autoplayEnabled) {
            startAutoplayTimer();
        }
    } else if (event.data === 1) { // Видео играет
        stopAutoplayTimer();
        stopVideoEndChecker();
        const timerSpan = document.getElementById('autoplayTimer');
        if (timerSpan) {
            timerSpan.style.display = 'none';
            timerSpan.textContent = '';
        }
    } else if (event.data === 2) { // Пауза
        stopAutoplayTimer();
        const timerSpan = document.getElementById('autoplayTimer');
        if (timerSpan) timerSpan.style.display = 'none';
    }
}

// ---------- RUTUBE ПЛЕЕР ----------
function loadRutubePlayer(videoId) {
    const container = document.getElementById('rutubePlayerContainer');
    if (!container) return;
    
    container.innerHTML = '';
    currentRutubePlayer = null;
    
    const iframe = document.createElement('iframe');
    iframe.width = '100%';
    iframe.height = '100%';
    iframe.style.border = 'none';
    iframe.style.position = 'absolute';
    iframe.style.top = '0';
    iframe.style.left = '0';
    iframe.allowFullscreen = true;
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.referrerPolicy = 'unsafe-url';
    iframe.src = `https://rutube.ru/play/embed/${videoId}?autoplay=1`;
    
    // Добавляем обработчик загрузки
    iframe.onload = () => {
        console.log("Rutube плеер загружен, запускаем проверку окончания видео");
        startVideoEndChecker();
    };
    
    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    wrapper.style.width = '100%';
    wrapper.style.height = '100%';
    wrapper.appendChild(iframe);
    
    container.appendChild(wrapper);
    currentRutubePlayer = iframe;
}

// ---------- РЕН ТВ ПЛЕЕР ----------
function loadRentvPlayer(videoId) {
    const container = document.getElementById('rentvPlayerContainer');
    if (!container) return;
    
    container.innerHTML = '';
    currentRentvPlayer = null;
    
    const iframe = document.createElement('iframe');
    iframe.width = '100%';
    iframe.height = '100%';
    iframe.style.border = 'none';
    iframe.style.position = 'absolute';
    iframe.style.top = '0';
    iframe.style.left = '0';
    iframe.allowFullscreen = true;
    iframe.allow = 'autoplay; fullscreen; picture-in-picture';
    iframe.referrerPolicy = 'unsafe-url';
    iframe.src = `https://ren.tv/player/edition/embed/${videoId}`;
    
    iframe.onload = () => {
        console.log("РЕН ТВ плеер загружен, запускаем проверку окончания видео");
        startVideoEndChecker();
    };
    
    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    wrapper.style.width = '100%';
    wrapper.style.height = '100%';
    wrapper.appendChild(iframe);
    
    container.appendChild(wrapper);
    currentRentvPlayer = iframe;
}

// ---------- УПРАВЛЕНИЕ ПЛЕЕРАМИ ----------
function loadVideoOnPlatform(episode) {
    console.log("loadVideoOnPlatform, платформа:", currentPlatform);
    stopAllPlayers();
    
    if (currentPlatform === 'youtube') {
        if (episode.youtubeId) {
            if (currentPlayer && currentPlayer.loadVideoById) {
                currentPlayer.loadVideoById(episode.youtubeId);
                currentPlayer.playVideo();
            } else {
                createYouTubePlayer(episode.youtubeId);
            }
        }
    } else if (currentPlatform === 'rutube') {
        if (episode.rutubeId) {
            loadRutubePlayer(episode.rutubeId);
        } else {
            showToast("❌ Эта серия недоступна на Rutube");
        }
    } else if (currentPlatform === 'rentv') {
        if (episode.rentvId) {
            loadRentvPlayer(episode.rentvId);
        } else {
            showToast("❌ Эта серия недоступна на РЕН ТВ");
            const container = document.getElementById('rentvPlayerContainer');
            if (container) {
                container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#fff;background:#1a1a2a;">📺 Видео временно недоступно</div>';
            }
        }
    }
}

function stopYouTubePlayer() {
    if (currentPlayer) {
        try {
            currentPlayer.stopVideo();
            console.log("YouTube плеер остановлен");
        } catch(e) {
            console.warn("Ошибка при остановке YouTube:", e);
        }
    }
}

function stopRutubePlayer() {
    const container = document.getElementById('rutubePlayerContainer');
    if (container) {
        container.innerHTML = '';
        currentRutubePlayer = null;
        console.log("Rutube плеер остановлен");
    }
}

function stopRentvPlayer() {
    const container = document.getElementById('rentvPlayerContainer');
    if (container) {
        container.innerHTML = '';
        currentRentvPlayer = null;
        console.log("РЕН ТВ плеер остановлен");
    }
}

function stopAllPlayers() {
    console.log("Останавливаем все плееры...");
    stopYouTubePlayer();
    stopRutubePlayer();
    stopRentvPlayer();
    stopVideoEndChecker();
    stopAutoplayTimer();
}

function switchToYouTube() {
    console.log("switchToYouTube вызван");
    stopRutubePlayer();
    stopRentvPlayer();
    stopVideoEndChecker();
    
    currentPlatform = 'youtube';
    
    document.getElementById('youtubePlayer').style.display = 'block';
    document.getElementById('rutubePlayer').style.display = 'none';
    document.getElementById('rentvPlayer').style.display = 'none';
    
    updateActiveButton('youtube');
    
    if (currentEpisodeObj && currentEpisodeObj.youtubeId) {
        if (currentPlayer && currentPlayer.loadVideoById) {
            currentPlayer.loadVideoById(currentEpisodeObj.youtubeId);
            currentPlayer.playVideo();
        } else {
            createYouTubePlayer(currentEpisodeObj.youtubeId);
        }
    }
}

function switchToRutube() {
    console.log("switchToRutube вызван");
    stopYouTubePlayer();
    stopRentvPlayer();
    stopVideoEndChecker();
    
    currentPlatform = 'rutube';
    
    document.getElementById('youtubePlayer').style.display = 'none';
    document.getElementById('rutubePlayer').style.display = 'block';
    document.getElementById('rentvPlayer').style.display = 'none';
    
    updateActiveButton('rutube');
    
    if (currentEpisodeObj && currentEpisodeObj.rutubeId) {
        loadRutubePlayer(currentEpisodeObj.rutubeId);
    } else {
        showToast("⚠️ Эта серия временно недоступна на Rutube");
    }
}

function switchToRentv() {
    console.log("switchToRentv вызван");
    stopYouTubePlayer();
    stopRutubePlayer();
    stopVideoEndChecker();
    
    currentPlatform = 'rentv';
    
    document.getElementById('youtubePlayer').style.display = 'none';
    document.getElementById('rutubePlayer').style.display = 'none';
    document.getElementById('rentvPlayer').style.display = 'block';
    
    updateActiveButton('rentv');
    
    if (currentEpisodeObj && currentEpisodeObj.rentvId) {
        loadRentvPlayer(currentEpisodeObj.rentvId);
    } else {
        showToast("⚠️ Эта серия временно недоступна на РЕН ТВ");
        const container = document.getElementById('rentvPlayerContainer');
        if (container) {
            container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#fff;background:#1a1a2a;">📺 Видео временно недоступно</div>';
        }
    }
}

function updateActiveButton(activePlatform) {
    const btns = document.querySelectorAll('.player-switch-btn');
    btns.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.player === activePlatform) {
            btn.classList.add('active');
        }
    });
}

function initPlayerSwitch() {
    const switchBtns = document.querySelectorAll('.player-switch-btn');
    console.log("Найдено кнопок переключателя:", switchBtns.length);
    
    switchBtns.forEach(btn => {
        btn.removeEventListener('click', handleSwitchClick);
        btn.addEventListener('click', handleSwitchClick);
    });
}

function handleSwitchClick(e) {
    const platform = e.currentTarget.dataset.player;
    console.log("Клик по кнопке:", platform);
    stopAllPlayers();
    
    if (platform === 'youtube') {
        switchToYouTube();
    } else if (platform === 'rutube') {
        switchToRutube();
    } else if (platform === 'rentv') {
        switchToRentv();
    }
}

// Загрузить эпизод
function loadEpisode(episode) {
    if (!episode) {
        console.warn("Нет данных о серии");
        return;
    }
    
    if (typeof logEpisodeView === 'function') {
        logEpisodeView(episode.season, episode.episode, episode.title);
    }
    
    currentEpisodeObj = episode;
    
    const seasonDisplay = getSeasonDisplayName(episode.season);
    
    if (episode.season >= 18) {
        document.getElementById('currentSeriesTitle').innerHTML = 
            `${seasonDisplay} · ${episode.episode} серия &nbsp;|&nbsp; ${episode.title}`;
    } else {
        document.getElementById('currentSeriesTitle').innerHTML = 
            `Солдаты ${episode.season} сезон · ${episode.episode} серия &nbsp;|&nbsp; ${episode.title}`;
    }
    
    document.getElementById('currentSeriesDesc').innerHTML = episode.desc;
    
    stopAllPlayers();
    loadVideoOnPlatform(episode);
    
    renderComments();
    renderEpisodesGrid(currentSeason);
    updateRatingDisplay();
    stopAutoplayTimer();
    secondsLeft = 10;
    updateTimerDisplay();

    updateFavoriteButton();
}

function loadFirstEpisode() {
    const firstEpisodes = getEpisodesBySeason(currentSeason);
    if (firstEpisodes.length) {
        loadEpisode(firstEpisodes[0]);
    }
}

// ---------- КОММЕНТАРИИ И ОЦЕНКИ (остаются без изменений) ----------
function loadRatings() {
    const saved = localStorage.getItem('soldaty_ratings');
    ratings = saved ? JSON.parse(saved) : {};
    updateRatingDisplay();
}

function saveRatings() {
    localStorage.setItem('soldaty_ratings', JSON.stringify(ratings));
}

function setRating(value) {
    const key = `${currentEpisodeObj.season}_${currentEpisodeObj.episode}`;
    ratings[key] = value;
    saveRatings();
    updateRatingDisplay();
    if (typeof logRating === 'function') {
        logRating(currentEpisodeObj.season, currentEpisodeObj.episode, value);
    }
}

function getCurrentRating() {
    const key = `${currentEpisodeObj.season}_${currentEpisodeObj.episode}`;
    return ratings[key] || 0;
}

function updateRatingDisplay() {
    const starsContainer = document.getElementById('starsContainer');
    const ratingValueSpan = document.getElementById('ratingValue');
    const avgRatingSpan = document.getElementById('avgRating');
    
    if (!starsContainer) return;
    
    const currentRating = getCurrentRating();
    
    starsContainer.innerHTML = '';
    for (let i = 1; i <= 5; i++) {
        const star = document.createElement('i');
        star.className = `fas fa-star star ${i <= currentRating ? 'selected' : ''}`;
        star.setAttribute('data-value', i);
        star.onclick = () => setRating(i);
        star.onmouseenter = () => highlightStars(i);
        star.onmouseleave = () => resetStarsHighlight();
        starsContainer.appendChild(star);
    }
    
    if (ratingValueSpan) {
        ratingValueSpan.textContent = currentRating > 0 ? `${currentRating} / 5` : 'Не оценено';
    }
    if (avgRatingSpan) {
        avgRatingSpan.innerHTML = `<i class="fas fa-star"></i> ${currentRating > 0 ? currentRating.toFixed(1) : '—'}`;
    }
}

function highlightStars(value) {
    document.querySelectorAll('.star').forEach((star, index) => {
        if (index < value) star.classList.add('hover');
        else star.classList.remove('hover');
    });
}

function resetStarsHighlight() {
    document.querySelectorAll('.star').forEach(star => star.classList.remove('hover'));
}

// ---------- КОММЕНТАРИИ ----------
let comments = [];

function loadComments() {
    const saved = localStorage.getItem('soldaty_comments');
    comments = saved ? JSON.parse(saved) : [];
    renderComments();
}

function saveComments() {
    localStorage.setItem('soldaty_comments', JSON.stringify(comments));
    renderComments();
}

function addComment(text) {
    if (!window.currentUser) {
        alert('Только зарегистрированные пользователи могут оставлять комментарии!');
        return false;
    }
    
    if (!text.trim()) {
        alert("Пожалуйста, введите текст комментария");
        return false;
    }

    if (typeof logComment === 'function') {
        logComment(currentEpisodeObj.season, currentEpisodeObj.episode, text);
    }
    
    const userName = currentUser.displayName || currentUser.email.split('@')[0];
    
    const newComment = {
        id: Date.now(),
        name: userName,
        text: text.trim().substring(0, 500),
        date: new Date().toLocaleString('ru-RU'),
        season: currentEpisodeObj.season,
        episode: currentEpisodeObj.episode,
        seriesTitle: currentEpisodeObj.title,
        rating: currentFormRating,
        userId: currentUser.uid,
        userAvatar: currentUser.photoURL || ''
    };
    
    comments.unshift(newComment);
    saveComments();
    
    if (window.saveCommentToDB) {
        window.saveCommentToDB(
            currentEpisodeObj.season, 
            currentEpisodeObj.episode, 
            currentEpisodeObj.title, 
            text, 
            currentFormRating
        );
    }
    
    return true;
}

function deleteComment(commentId) {
    if (confirm("Удалить этот комментарий?")) {
        comments = comments.filter(c => c.id !== commentId);
        saveComments();
    }
}

function checkAuthAndSubmit() {
    if (!window.currentUser) {
        alert('Войдите, чтобы оставить комментарий');
        if (typeof showAuthModal === 'function') showAuthModal();
        return;
    }
    
    const textInput = document.getElementById('commentText');
    if (!textInput) return;
    
    const commentText = textInput.value;
    if (!commentText.trim()) {
        alert("Введите текст комментария");
        return;
    }
    
    if (addComment(commentText)) {
        textInput.value = '';
        currentFormRating = 0;
        updateFormStarsDisplay();
    }
}

function renderComments() {
    const commentsList = document.getElementById('commentsList');
    const commentsCountSpan = document.getElementById('commentsCount');
    if (!commentsList) return;
    
    const seriesComments = comments.filter(c => 
        c.season === currentEpisodeObj.season && 
        c.episode === currentEpisodeObj.episode
    );
    
    if (commentsCountSpan) commentsCountSpan.textContent = seriesComments.length;
    
    if (seriesComments.length === 0) {
        commentsList.innerHTML = '<div class="comment-empty">💬 Нет комментариев. Будьте первым!</div>';
        return;
    }
    
    commentsList.innerHTML = seriesComments.map(c => `
        <div class="comment-card">
            <div class="comment-header">
                <div class="comment-header-left">
                ${c.userAvatar ? `<img src="${c.userAvatar}" class="comment-avatar">` : '<div class="comment-avatar-placeholder"><i class="fas fa-user"></i></div>'}
                <div>
                    <div class="comment-author">${escapeHtml(c.name)}</div>
                    <div class="comment-meta">
                        <span class="comment-series">${c.season} сезон · ${c.episode} серия</span>
                        <span class="comment-date"><i class="far fa-clock"></i> ${c.date}</span>
                    </div>
                </div>
            </div>
            ${c.rating && c.rating > 0 ? `<span class="comment-rating"><i class="fas fa-star"></i> ${c.rating}/5</span>` : ''}
            <button class="comment-delete" data-id="${c.id}" title="Удалить комментарий">
                <i class="fas fa-trash-alt"></i>
            </button>
            </div>
            <div class="comment-text">${escapeHtml(c.text)}</div>
        </div>
    `).join('');
    
    document.querySelectorAll('.comment-delete').forEach(btn => {
        btn.onclick = () => deleteComment(parseInt(btn.dataset.id));
    });
    updateRatingDisplay();
}

function updateFormStarsDisplay() {
    const container = document.getElementById('formStarsContainer');
    const valueSpan = document.getElementById('formRatingValue');
    if (!container) return;
    
    container.innerHTML = '';
    for (let i = 1; i <= 5; i++) {
        const star = document.createElement('i');
        star.className = `fas fa-star star ${i <= currentFormRating ? 'selected' : ''}`;
        star.onclick = () => { currentFormRating = i; updateFormStarsDisplay(); };
        star.onmouseenter = () => highlightFormStars(i);
        star.onmouseleave = () => resetFormStarsHighlight();
        container.appendChild(star);
    }
    if (valueSpan) valueSpan.textContent = currentFormRating > 0 ? `${currentFormRating} / 5` : 'Не выбрано';
}

function highlightFormStars(value) {
    document.querySelectorAll('#formStarsContainer .star').forEach((star, idx) => {
        if (idx < value) star.classList.add('hover');
        else star.classList.remove('hover');
    });
}

function resetFormStarsHighlight() {
    document.querySelectorAll('#formStarsContainer .star').forEach(star => star.classList.remove('hover'));
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => m === '&' ? '&amp;' : m === '<' ? '&lt;' : '&gt;');
}

// ---------- НАВИГАЦИЯ ----------
function getSeasons() {
    const seasonsSet = new Set();
    episodesData.forEach(ep => seasonsSet.add(ep.season));
    return Array.from(seasonsSet).sort((a, b) => a - b);
}

function getEpisodesBySeason(season) {
    return episodesData.filter(ep => ep.season === season).sort((a, b) => a.episode - b.episode);
}

function renderEpisodesGrid(season) {
    const episodes = getEpisodesBySeason(season);
    const grid = document.getElementById('episodesGrid');
    if (!grid) return;
    grid.innerHTML = '';
    
    episodes.forEach(ep => {
        const card = document.createElement('div');
        card.className = 'episode-card';
        if (currentEpisodeObj?.season === ep.season && currentEpisodeObj?.episode === ep.episode) {
            card.classList.add('active-ep');
        }
        card.innerHTML = `<div class="ep-num">${ep.episode} серия</div><div class="ep-name">${ep.title.length > 20 ? ep.title.slice(0, 18) + '…' : ep.title}</div>`;
        card.onclick = () => loadEpisode(ep);
        grid.appendChild(card);
    });
    
    if (episodes.length === 0) {
        grid.innerHTML = '<div style="padding:20px;text-align:center;">🚧 Скоро добавятся серии этого сезона</div>';
    }
}

const unavailableSeasons = [26, 30];

function renderSeasonNav() {
    const seasons = getSeasons();
    const nav = document.getElementById('seasonNav');
    if (!nav) return;
    nav.innerHTML = '';
    
    seasons.sort((a, b) => a - b);
    
    seasons.forEach(s => {
        const btn = document.createElement('button');
        btn.innerText = getSeasonDisplayName(s);
        btn.className = 'season-btn';
        
        if (s >= 18) btn.classList.add('spinoff');
        if (unavailableSeasons.includes(s)) {
            btn.classList.add('unavailable');
            btn.disabled = true;
            btn.title = '⏳ Временно недоступно';
        }
        
        if (s === currentSeason && !unavailableSeasons.includes(s)) {
            btn.classList.add('active');
            showSeasonDescription(s);
        }
        
        btn.onclick = () => {
            if (unavailableSeasons.includes(s)) {
                showToast('⏳ Этот сезон временно недоступен');
                return;
            }
            currentSeason = s;
            renderSeasonNav();
            renderEpisodesGrid(currentSeason);
            const episodesOfSeason = getEpisodesBySeason(currentSeason);
            if (episodesOfSeason.length) loadEpisode(episodesOfSeason[0]);
            showSeasonDescription(s);
        };
        nav.appendChild(btn);
    });
}

function showSeasonDescription(season) {
    const block = document.getElementById('seasonDescriptionBlock');
    const titleSpan = document.getElementById('seasonDescriptionTitle');
    const contentDiv = document.getElementById('seasonDescriptionContent');
    
    if (!block) return;
    
    const desc = getSeasonDescription(season);
    titleSpan.innerHTML = `<i class="fas fa-info-circle"></i> ${desc.title}`;
    
    let metaHtml = '';
    if (desc.year && desc.year !== '—') {
        metaHtml = `
            <div class="season-meta">
                <span class="season-meta-item"><i class="fas fa-calendar-alt"></i> ${desc.year}</span>
                <span class="season-meta-item"><i class="fas fa-clock"></i> ${desc.dateRange}</span>
                <span class="season-meta-item"><i class="fas fa-tv"></i> ${desc.episodes} серий</span>
            </div>
        `;
    }
    
    contentDiv.innerHTML = metaHtml + `<div class="season-description-text">${desc.content}</div>`;
    block.style.display = 'block';
}

function navigateToPrevEpisode() {
    const episodes = getEpisodesBySeason(currentSeason);
    const currentIndex = episodes.findIndex(ep => 
        ep.season === currentEpisodeObj.season && 
        ep.episode === currentEpisodeObj.episode
    );
    
    if (currentIndex > 0) {
        loadEpisode(episodes[currentIndex - 1]);
    } else {
        const allSeasons = getSeasons();
        const currentSeasonIndex = allSeasons.findIndex(s => s === currentSeason);
        if (currentSeasonIndex > 0) {
            const prevSeason = allSeasons[currentSeasonIndex - 1];
            const prevSeasonEpisodes = getEpisodesBySeason(prevSeason);
            if (prevSeasonEpisodes.length > 0) {
                currentSeason = prevSeason;
                renderSeasonNav();
                renderEpisodesGrid(currentSeason);
                loadEpisode(prevSeasonEpisodes[prevSeasonEpisodes.length - 1]);
            }
        } else {
            showToast("⏮️ Это первая серия сериала");
        }
    }
}

function navigateToNextEpisode() {
    const nextEpisode = getNextEpisode();
    if (nextEpisode) {
        if (nextEpisode.season !== currentSeason) {
            currentSeason = nextEpisode.season;
            renderSeasonNav();
            renderEpisodesGrid(currentSeason);
        }
        loadEpisode(nextEpisode);
    } else {
        showToast("🏁 Это последняя серия сериала");
    }
}

// ---------- ЗАПУСК ----------
window.onload = () => {
    renderSeasonNav();
    renderEpisodesGrid(currentSeason);
    loadComments();
    loadRatings();
    updateFormStarsDisplay();
    
    const submitBtn = document.getElementById('submitCommentBtn');
    if (submitBtn) {
        submitBtn.onclick = () => {
            if (!window.currentUser) {
                alert('Войдите, чтобы оставить комментарий');
                if (typeof showAuthModal === 'function') showAuthModal();
                return;
            }
            const textInput = document.getElementById('commentText');
            if (!textInput) return;
            const commentText = textInput.value;
            if (!commentText || !commentText.trim()) {
                alert("Введите текст комментария");
                return;
            }
            if (addComment(commentText)) {
                textInput.value = '';
                currentFormRating = 0;
                updateFormStarsDisplay();
            }
        };
    }
    
    const autoplayToggle = document.getElementById('autoplayToggle');
    if (autoplayToggle) {
        autoplayToggle.checked = autoplayEnabled;
        autoplayToggle.onchange = toggleAutoplay;
    }
    
    const favoriteBtn = document.getElementById('favoriteBtn');
    if (favoriteBtn) {
        favoriteBtn.onclick = toggleFavorite;
    }
    
    console.log("✅ Сайт «Солдаты» готов!");
};

document.addEventListener('DOMContentLoaded', () => {
    const userAvatar = document.getElementById('userAvatar');
    if (userAvatar) {
        userAvatar.style.cursor = 'pointer';
        userAvatar.onclick = () => {
            if (window.currentUser) window.location.href = 'profile.html';
        };
    }
    const userName = document.getElementById('userName');
    if (userName) {
        userName.style.cursor = 'pointer';
        userName.onclick = () => {
            if (window.currentUser) window.location.href = 'profile.html';
        };
    }
});

window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;

// ========== ИЗБРАННОЕ ==========
let isFavorite = false;

async function checkFavoriteStatus(season, episode) {
    if (!window.currentUser) {
        return;
    }
    const key = `${season}_${episode}`;
    try {
        const snapshot = await db.ref(`favorites/${window.currentUser.uid}/${key}`).once('value');
        return snapshot.val() === true;
    } catch (error) {
        console.error("Ошибка проверки избранного:", error);
        return false;
    }
}

// Обновить кнопку для текущей серии
async function updateFavoriteButton() {
    const btn = document.getElementById('favoriteBtn');
    if (!btn) return;
    
    if (!window.currentUser) {
        btn.innerHTML = '<i class="far fa-heart"></i> В избранное';
        btn.classList.remove('active');
        return;
    }
    
    // Проверяем статус ТЕКУЩЕЙ серии
    const isFav = await checkFavoriteStatus(currentEpisodeObj.season, currentEpisodeObj.episode);
    
    if (isFav) {
        btn.innerHTML = '<i class="fas fa-heart"></i> В избранном';
        btn.classList.add('active');
    } else {
        btn.innerHTML = '<i class="far fa-heart"></i> В избранное';
        btn.classList.remove('active');
    }
}

// Добавить/удалить из избранного
async function toggleFavorite() {
    if (!window.currentUser) {
        alert('Войдите в аккаунт, чтобы добавлять серии в избранное!');
        if (typeof showAuthModal === 'function') showAuthModal();
        return;
    }
    
    const key = `${currentEpisodeObj.season}_${currentEpisodeObj.episode}`;
    const favRef = db.ref(`favorites/${window.currentUser.uid}/${key}`);
    
    try {
        const isFav = await checkFavoriteStatus(currentEpisodeObj.season, currentEpisodeObj.episode);
        
        if (isFav) {
            await favRef.remove();
            showToast('❌ Серия удалена из избранного');
        } else {
            await favRef.set(true);
            showToast('✅ Серия добавлена в избранное');
        }
        
        // Обновляем кнопку
        await updateFavoriteButton();
    } catch (error) {
        console.error("Ошибка:", error);
        alert('Ошибка при сохранении. Попробуйте позже.');
    }
}


function showToast(message) {
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
