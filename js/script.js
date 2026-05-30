// ========== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ==========
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
let currentVideoDuration = 0;
let videoStartTime = null;

// ========== МАППИНГ НАЗВАНИЙ ДЛЯ СПИН-ОФФОВ ==========
const seasonTitles = {
    1: "1 СЕЗОН", 2: "2 СЕЗОН", 3: "3 СЕЗОН", 4: "4 СЕЗОН",
    5: "5 СЕЗОН", 6: "6 СЕЗОН", 7: "7 СЕЗОН", 8: "8 СЕЗОН",
    9: "9 СЕЗОН", 10: "10 СЕЗОН", 11: "11 СЕЗОН", 12: "12 СЕЗОН",
    13: "13 СЕЗОН", 14: "14 СЕЗОН", 15: "15 СЕЗОН", 16: "16 СЕЗОН",
    17: "17 СЕЗОН",
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

function getSeasonDisplayName(season) {
    return seasonTitles[season] || `${season} СЕЗОН`;
}

// ========== ОЦЕНКИ СЕРИЙ ==========
let ratings = {};

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
    if (ratingValueSpan) ratingValueSpan.textContent = currentRating > 0 ? `${currentRating} / 5` : 'Не оценено';
    if (avgRatingSpan) avgRatingSpan.innerHTML = `<i class="fas fa-star"></i> ${currentRating > 0 ? currentRating.toFixed(1) : '—'}`;
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

// ========== АВТОВОСПРОИЗВЕДЕНИЕ ==========
function getNextEpisode() {
    const episodes = getEpisodesBySeason(currentSeason);
    const currentIndex = episodes.findIndex(ep => ep.season === currentEpisodeObj.season && ep.episode === currentEpisodeObj.episode);
    if (currentIndex !== -1 && currentIndex + 1 < episodes.length) return episodes[currentIndex + 1];
    
    const allSeasons = getSeasons();
    const currentSeasonIndex = allSeasons.findIndex(s => s === currentSeason);
    if (currentSeasonIndex !== -1 && currentSeasonIndex + 1 < allSeasons.length) {
        const nextSeason = allSeasons[currentSeasonIndex + 1];
        const nextSeasonEpisodes = getEpisodesBySeason(nextSeason);
        if (nextSeasonEpisodes.length > 0) return nextSeasonEpisodes[0];
    }
    return null;
}

function startAutoplayTimer() {
    stopAutoplayTimer();
    if (!autoplayEnabled) return;
    const nextEpisode = getNextEpisode();
    if (!nextEpisode) return;
    
    secondsLeft = 10;
    updateTimerDisplay();
    const timerSpan = document.getElementById('autoplayTimer');
    if (timerSpan) timerSpan.style.display = 'inline-block';
    
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

function stopAutoplayTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;
    const timerSpan = document.getElementById('autoplayTimer');
    if (timerSpan) timerSpan.textContent = '';
}

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

function toggleAutoplay() {
    autoplayEnabled = !autoplayEnabled;
    if (!autoplayEnabled) {
        stopAutoplayTimer();
        stopVideoEndChecker();
    } else if (currentPlatform !== 'youtube') {
        startVideoEndChecker();
    }
}

// ========== ПРОВЕРКА ОКОНЧАНИЯ ВИДЕО ==========
function startVideoEndChecker() {
    stopVideoEndChecker();
    if (!autoplayEnabled || currentPlatform === 'youtube') return;
    videoStartTime = Date.now();
    currentVideoDuration = (currentEpisodeObj && currentEpisodeObj.duration) ? currentEpisodeObj.duration : 25 * 60;
    
    videoEndCheckInterval = setInterval(() => {
        if (!autoplayEnabled) return;
        const elapsedSeconds = (Date.now() - videoStartTime) / 1000;
        if (elapsedSeconds >= currentVideoDuration - 2) onVideoEnded();
    }, 1000);
}

function stopVideoEndChecker() {
    if (videoEndCheckInterval) clearInterval(videoEndCheckInterval);
    videoEndCheckInterval = null;
    videoStartTime = null;
}

function onVideoEnded() {
    if (!autoplayEnabled || currentPlatform === 'youtube') return;
    stopVideoEndChecker();
    startAutoplayTimer();
}

// ========== YOUTUBE ПЛЕЕР ==========
function onYouTubeIframeAPIReady() {
    initPlayerSwitch();
    loadFirstEpisode();
}

function createYouTubePlayer(videoId) {
    const playerDiv = document.getElementById('youtubePlayerContainer');
    if (!playerDiv) return;
    playerDiv.innerHTML = '';
    if (currentPlayer && currentPlayer.destroy) currentPlayer.destroy();
    
    currentPlayer = new YT.Player('youtubePlayerContainer', {
        height: '100%', width: '100%', videoId: videoId,
        playerVars: { 'autoplay': 1, 'rel': 0, 'modestbranding': 1 },
        events: { 'onStateChange': onPlayerStateChange }
    });
}

function onPlayerStateChange(event) {
    if (event.data === 0) {
        if (autoplayEnabled) startAutoplayTimer();
    } else if (event.data === 1) {
        stopAutoplayTimer();
        stopVideoEndChecker();
        const timerSpan = document.getElementById('autoplayTimer');
        if (timerSpan) { timerSpan.style.display = 'none'; timerSpan.textContent = ''; }
    } else if (event.data === 2) {
        stopAutoplayTimer();
        const timerSpan = document.getElementById('autoplayTimer');
        if (timerSpan) timerSpan.style.display = 'none';
    }
}

// ========== RUTUBE ПЛЕЕР ==========
function loadRutubePlayer(videoId) {
    const container = document.getElementById('rutubePlayerContainer');
    if (!container) return;
    container.innerHTML = '';
    currentRutubePlayer = null;
    
    const iframe = document.createElement('iframe');
    iframe.width = '100%'; iframe.height = '100%';
    iframe.style.border = 'none'; iframe.style.position = 'absolute';
    iframe.style.top = '0'; iframe.style.left = '0';
    iframe.allowFullscreen = true;
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.referrerPolicy = 'unsafe-url';
    iframe.src = `https://rutube.ru/play/embed/${videoId}?autoplay=1`;
    iframe.onload = () => { startVideoEndChecker(); };
    
    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative'; wrapper.style.width = '100%'; wrapper.style.height = '100%';
    wrapper.appendChild(iframe);
    container.appendChild(wrapper);
    currentRutubePlayer = iframe;
}

// ========== РЕН ТВ ПЛЕЕР ==========
function loadRentvPlayer(videoId) {
    const container = document.getElementById('rentvPlayerContainer');
    if (!container) return;
    container.innerHTML = '';
    currentRentvPlayer = null;
    
    const iframe = document.createElement('iframe');
    iframe.width = '100%'; iframe.height = '100%';
    iframe.style.border = 'none'; iframe.style.position = 'absolute';
    iframe.style.top = '0'; iframe.style.left = '0';
    iframe.allowFullscreen = true;
    iframe.allow = 'autoplay; fullscreen; picture-in-picture';
    iframe.referrerPolicy = 'unsafe-url';
    iframe.src = `https://ren.tv/player/edition/embed/${videoId}`;
    iframe.onload = () => { startVideoEndChecker(); };
    
    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative'; wrapper.style.width = '100%'; wrapper.style.height = '100%';
    wrapper.appendChild(iframe);
    container.appendChild(wrapper);
    currentRentvPlayer = iframe;
}

// ========== УПРАВЛЕНИЕ ПЛЕЕРАМИ ==========
function loadVideoOnPlatform(episode) {
    stopAllPlayers();
    if (currentPlatform === 'youtube' && episode.youtubeId) {
        if (currentPlayer && currentPlayer.loadVideoById) {
            currentPlayer.loadVideoById(episode.youtubeId);
            currentPlayer.playVideo();
        } else createYouTubePlayer(episode.youtubeId);
    } else if (currentPlatform === 'rutube') {
        if (episode.rutubeId) loadRutubePlayer(episode.rutubeId);
        else showToast("❌ Эта серия недоступна на Rutube");
    } else if (currentPlatform === 'rentv') {
        if (episode.rentvId) loadRentvPlayer(episode.rentvId);
        else showToast("❌ Эта серия недоступна на РЕН ТВ");
    }
}

function stopYouTubePlayer() { if (currentPlayer) try { currentPlayer.stopVideo(); } catch(e) {} }
function stopRutubePlayer() { const c = document.getElementById('rutubePlayerContainer'); if (c) { c.innerHTML = ''; currentRutubePlayer = null; } }
function stopRentvPlayer() { const c = document.getElementById('rentvPlayerContainer'); if (c) { c.innerHTML = ''; currentRentvPlayer = null; } }
function stopAllPlayers() { stopYouTubePlayer(); stopRutubePlayer(); stopRentvPlayer(); stopVideoEndChecker(); stopAutoplayTimer(); }

function switchToYouTube() {
    stopRutubePlayer(); stopRentvPlayer(); stopVideoEndChecker();
    currentPlatform = 'youtube';
    document.getElementById('youtubePlayer').style.display = 'block';
    document.getElementById('rutubePlayer').style.display = 'none';
    document.getElementById('rentvPlayer').style.display = 'none';
    updateActiveButton('youtube');
    if (currentEpisodeObj && currentEpisodeObj.youtubeId) {
        if (currentPlayer && currentPlayer.loadVideoById) { currentPlayer.loadVideoById(currentEpisodeObj.youtubeId); currentPlayer.playVideo(); }
        else createYouTubePlayer(currentEpisodeObj.youtubeId);
    }
}

function switchToRutube() {
    stopYouTubePlayer(); stopRentvPlayer(); stopVideoEndChecker();
    currentPlatform = 'rutube';
    document.getElementById('youtubePlayer').style.display = 'none';
    document.getElementById('rutubePlayer').style.display = 'block';
    document.getElementById('rentvPlayer').style.display = 'none';
    updateActiveButton('rutube');
    if (currentEpisodeObj && currentEpisodeObj.rutubeId) loadRutubePlayer(currentEpisodeObj.rutubeId);
    else showToast("⚠️ Эта серия временно недоступна на Rutube");
}

function switchToRentv() {
    stopYouTubePlayer(); stopRutubePlayer(); stopVideoEndChecker();
    currentPlatform = 'rentv';
    document.getElementById('youtubePlayer').style.display = 'none';
    document.getElementById('rutubePlayer').style.display = 'none';
    document.getElementById('rentvPlayer').style.display = 'block';
    updateActiveButton('rentv');
    if (currentEpisodeObj && currentEpisodeObj.rentvId) loadRentvPlayer(currentEpisodeObj.rentvId);
    else showToast("⚠️ Эта серия временно недоступна на РЕН ТВ");
}

function updateActiveButton(activePlatform) {
    document.querySelectorAll('.player-switch-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.player === activePlatform) btn.classList.add('active');
    });
}

function initPlayerSwitch() {
    document.querySelectorAll('.player-switch-btn').forEach(btn => {
        btn.removeEventListener('click', handleSwitchClick);
        btn.addEventListener('click', handleSwitchClick);
    });
}

function handleSwitchClick(e) {
    const platform = e.currentTarget.dataset.player;
    stopAllPlayers();
    if (platform === 'youtube') switchToYouTube();
    else if (platform === 'rutube') switchToRutube();
    else if (platform === 'rentv') switchToRentv();
}

// ========== ЗАГРУЗКА ЭПИЗОДА ==========
function loadEpisode(episode) {
    if (!episode) return;
    currentEpisodeObj = episode;
    const seasonDisplay = getSeasonDisplayName(episode.season);
    if (episode.season >= 18) {
        document.getElementById('currentSeriesTitle').innerHTML = `${seasonDisplay} · ${episode.episode} серия &nbsp;|&nbsp; ${episode.title}`;
    } else {
        document.getElementById('currentSeriesTitle').innerHTML = `Солдаты ${episode.season} сезон · ${episode.episode} серия &nbsp;|&nbsp; ${episode.title}`;
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
    if (firstEpisodes.length) loadEpisode(firstEpisodes[0]);
}

// ========== КОММЕНТАРИИ ==========
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
    if (!window.currentUser) { alert('Только зарегистрированные пользователи могут оставлять комментарии!'); return false; }
    if (!text.trim()) { alert("Пожалуйста, введите текст комментария"); return false; }
    const userName = currentUser.displayName || currentUser.email.split('@')[0];
    const newComment = {
        id: Date.now(), name: userName, text: text.trim().substring(0, 500),
        date: new Date().toLocaleString('ru-RU'), season: currentEpisodeObj.season,
        episode: currentEpisodeObj.episode, seriesTitle: currentEpisodeObj.title,
        rating: currentFormRating, userId: currentUser.uid, userAvatar: currentUser.photoURL || ''
    };
    comments.unshift(newComment);
    saveComments();
    return true;
}

function deleteComment(commentId) {
    if (confirm("Удалить этот комментарий?")) {
        comments = comments.filter(c => c.id !== commentId);
        saveComments();
    }
}

function renderComments() {
    const commentsList = document.getElementById('commentsList');
    const commentsCountSpan = document.getElementById('commentsCount');
    if (!commentsList) return;
    const seriesComments = comments.filter(c => c.season === currentEpisodeObj.season && c.episode === currentEpisodeObj.episode);
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
                <button class="comment-delete" data-id="${c.id}" title="Удалить комментарий"><i class="fas fa-trash-alt"></i></button>
            </div>
            <div class="comment-text">${escapeHtml(c.text)}</div>
        </div>
    `).join('');
    document.querySelectorAll('.comment-delete').forEach(btn => btn.onclick = () => deleteComment(parseInt(btn.dataset.id)));
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

// ========== НАВИГАЦИЯ ==========
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
        if (currentEpisodeObj?.season === ep.season && currentEpisodeObj?.episode === ep.episode) card.classList.add('active-ep');
        card.innerHTML = `<div class="ep-num">${ep.episode} серия</div><div class="ep-name">${ep.title.length > 20 ? ep.title.slice(0, 18) + '…' : ep.title}</div>`;
        card.onclick = () => loadEpisode(ep);
        grid.appendChild(card);
    });
    if (episodes.length === 0) grid.innerHTML = '<div style="padding:20px;text-align:center;">🚧 Скоро добавятся серии этого сезона</div>';
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
        if (unavailableSeasons.includes(s)) { btn.classList.add('unavailable'); btn.disabled = true; btn.title = '⏳ Временно недоступно'; }
        if (s === currentSeason && !unavailableSeasons.includes(s)) { btn.classList.add('active'); showSeasonDescription(s); }
        btn.onclick = () => {
            if (unavailableSeasons.includes(s)) { showToast('⏳ Этот сезон временно недоступен'); return; }
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
        metaHtml = `<div class="season-meta">
            <span class="season-meta-item"><i class="fas fa-calendar-alt"></i> ${desc.year}</span>
            <span class="season-meta-item"><i class="fas fa-clock"></i> ${desc.dateRange}</span>
            <span class="season-meta-item"><i class="fas fa-tv"></i> ${desc.episodes} серий</span>
        </div>`;
    }
    contentDiv.innerHTML = metaHtml + `<div class="season-description-text">${desc.content}</div>`;
    block.style.display = 'block';
}

function navigateToPrevEpisode() {
    const episodes = getEpisodesBySeason(currentSeason);
    const currentIndex = episodes.findIndex(ep => ep.season === currentEpisodeObj.season && ep.episode === currentEpisodeObj.episode);
    if (currentIndex > 0) loadEpisode(episodes[currentIndex - 1]);
    else {
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
        } else showToast("⏮️ Это первая серия сериала");
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
    } else showToast("🏁 Это последняя серия сериала");
}

// ========== ИЗБРАННОЕ ==========
async function checkFavoriteStatus(season, episode) {
    if (!window.currentUser) return false;
    const key = `${season}_${episode}`;
    try {
        const snapshot = await db.ref(`favorites/${window.currentUser.uid}/${key}`).once('value');
        return snapshot.val() === true;
    } catch (error) { return false; }
}

async function updateFavoriteButton() {
    const btn = document.getElementById('favoriteBtn');
    if (!btn) return;
    if (!window.currentUser) {
        btn.innerHTML = '<i class="far fa-heart"></i> В избранное';
        btn.classList.remove('active');
        return;
    }
    const isFav = await checkFavoriteStatus(currentEpisodeObj.season, currentEpisodeObj.episode);
    if (isFav) {
        btn.innerHTML = '<i class="fas fa-heart"></i> В избранном';
        btn.classList.add('active');
    } else {
        btn.innerHTML = '<i class="far fa-heart"></i> В избранное';
        btn.classList.remove('active');
    }
}

async function toggleFavorite() {
    if (!window.currentUser) {
        alert('Войдите в аккаунт, чтобы добавлять серии в избранное!');
        if (typeof showAuthModal === 'function') showAuthModal();
        return;
    }
    const key = `${currentEpisodeObj.season}_${currentEpisodeObj.episode}`;
    const favRef = db.ref(`favorites/${window.currentUser.uid}/${key}`);
    const isFav = await checkFavoriteStatus(currentEpisodeObj.season, currentEpisodeObj.episode);
    if (isFav) { await favRef.remove(); showToast('❌ Серия удалена из избранного'); }
    else { await favRef.set(true); showToast('✅ Серия добавлена в избранное'); }
    await updateFavoriteButton();
}

// ========== УВЕДОМЛЕНИЯ ==========
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
    setTimeout(() => toast.classList.remove('show'), 2000);
}

// ========== ВРЕМЯ И ПОГОДА (С ВЫБОРОМ ГОРОДА) ==========
const cities = {
    moskau: { name: 'Москва', lat: 55.7558, lon: 37.6173 },
    spb: { name: 'Санкт-Петербург', lat: 59.9343, lon: 30.3351 },
    kiev: { name: 'Киев', lat: 50.4501, lon: 30.5234 },
    minsk: { name: 'Минск', lat: 53.9045, lon: 27.5615 },
    almaty: { name: 'Алматы', lat: 43.2220, lon: 76.8512 },
    london: { name: 'Лондон', lat: 51.5074, lon: -0.1278 },
    newyork: { name: 'Нью-Йорк', lat: 40.7128, lon: -74.0060 },
    berlin: { name: 'Берлин', lat: 52.5200, lon: 13.4050 },
    paris: { name: 'Париж', lat: 48.8566, lon: 2.3522 },
    rome: { name: 'Рим', lat: 41.9028, lon: 12.4964 },
    madrid: { name: 'Мадрид', lat: 40.4168, lon: -3.7038 },
    istanbul: { name: 'Стамбул', lat: 41.0082, lon: 28.9784 },
    beijing: { name: 'Пекин', lat: 39.9042, lon: 116.4074 },
    tokyo: { name: 'Токио', lat: 35.6895, lon: 139.6917 }
};

async function fetchWeatherByCoords(lat, lon, cityName) {
    try {
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=auto`);
        const data = await response.json();
        if (data.current_weather) {
            const temp = Math.round(data.current_weather.temperature);
            const weatherCode = data.current_weather.weathercode;
            const weatherInfo = getWeatherInfo(weatherCode);
            const weatherIcon = document.getElementById('weatherIcon');
            const weatherTemp = document.getElementById('weatherTemp');
            const weatherLocation = document.getElementById('weatherLocation');
            if (weatherIcon) weatherIcon.textContent = weatherInfo.icon;
            if (weatherTemp) weatherTemp.textContent = `${temp}°C`;
            if (weatherLocation) weatherLocation.textContent = cityName;
            const selectedCity = document.getElementById('citySelect')?.value;
            if (selectedCity && selectedCity !== 'auto') localStorage.setItem('selectedCity', selectedCity);
        }
    } catch (error) { showWeatherError(); }
}

async function fetchWeather() {
    const citySelect = document.getElementById('citySelect');
    const selectedValue = citySelect ? citySelect.value : 'auto';
    if (selectedValue !== 'auto' && cities[selectedValue]) {
        const city = cities[selectedValue];
        await fetchWeatherByCoords(city.lat, city.lon, city.name);
        return;
    }
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                const cityName = await getCityNameByCoords(lat, lon);
                await fetchWeatherByCoords(lat, lon, cityName);
            },
            () => fetchWeatherByIP()
        );
    } else fetchWeatherByIP();
}

async function getCityNameByCoords(lat, lon) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`);
        const data = await response.json();
        return data.address?.city || data.address?.town || data.address?.village || 'Ваш город';
    } catch { return 'Ваш город'; }
}

async function fetchWeatherByIP() {
    try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        if (data.city && data.latitude && data.longitude) await fetchWeatherByCoords(data.latitude, data.longitude, data.city);
        else {
            const defaultCity = cities.moskau;
            await fetchWeatherByCoords(defaultCity.lat, defaultCity.lon, defaultCity.name);
            if (document.getElementById('citySelect')) document.getElementById('citySelect').value = 'moskau';
        }
    } catch {
        const defaultCity = cities.moskau;
        await fetchWeatherByCoords(defaultCity.lat, defaultCity.lon, defaultCity.name);
    }
}

function showWeatherError() {
    const weatherIcon = document.getElementById('weatherIcon');
    const weatherTemp = document.getElementById('weatherTemp');
    const weatherLocation = document.getElementById('weatherLocation');
    if (weatherIcon) weatherIcon.textContent = '🌡️';
    if (weatherTemp) weatherTemp.textContent = '--°C';
    if (weatherLocation) weatherLocation.textContent = 'Ошибка';
}

function getWeatherInfo(code) {
    const weatherMap = {
        0: { icon: '☀️' }, 1: { icon: '🌤️' }, 2: { icon: '⛅' }, 3: { icon: '☁️' },
        45: { icon: '🌫️' }, 48: { icon: '🌫️' }, 51: { icon: '🌧️' }, 53: { icon: '🌧️' },
        55: { icon: '🌧️' }, 56: { icon: '🌨️' }, 57: { icon: '🌨️' }, 61: { icon: '🌧️' },
        63: { icon: '🌧️' }, 65: { icon: '🌧️' }, 66: { icon: '🌨️' }, 67: { icon: '🌨️' },
        71: { icon: '🌨️' }, 73: { icon: '🌨️' }, 75: { icon: '🌨️' }, 77: { icon: '❄️' },
        80: { icon: '🌦️' }, 81: { icon: '🌦️' }, 82: { icon: '🌦️' }, 85: { icon: '🌨️' },
        86: { icon: '🌨️' }, 95: { icon: '⛈️' }, 96: { icon: '⛈️' }, 99: { icon: '⛈️' }
    };
    return weatherMap[code] || { icon: '🌡️' };
}

function updateTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const days = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
    const timeElement = document.getElementById('currentTime');
    const dateElement = document.getElementById('currentDate');
    if (timeElement) timeElement.textContent = `${hours}:${minutes}:${seconds}`;
    if (dateElement) dateElement.textContent = `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
}

function initCitySelector() {
    const citySelect = document.getElementById('citySelect');
    if (!citySelect) return;
    const savedCity = localStorage.getItem('selectedCity');
    if (savedCity && citySelect.querySelector(`option[value="${savedCity}"]`)) citySelect.value = savedCity;
    citySelect.addEventListener('change', () => fetchWeather());
}

function initTimeAndWeather() {
    updateTime();
    setInterval(updateTime, 1000);
    initCitySelector();
    fetchWeather();
    setInterval(fetchWeather, 30 * 60 * 1000);
}

// ========== PWA УСТАНОВКА ПРИЛОЖЕНИЯ ==========
let deferredInstallPrompt = null;

function initPWAInstall() {
    const installContainer = document.getElementById('installAppContainer');
    const installBtn = document.getElementById('installAppBtn');
    if (!installContainer || !installBtn) return;
    
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredInstallPrompt = e;
        installContainer.style.display = 'block';
    });
    
    installBtn.addEventListener('click', async () => {
        if (!deferredInstallPrompt) {
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
            const message = isIOS ? '📱 Нажмите "Поделиться" → "На экран Домой"' : '📱 Нажмите ⋮ → "Установить приложение"';
            showToast(message);
            return;
        }
        deferredInstallPrompt.prompt();
        const choiceResult = await deferredInstallPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') installContainer.style.display = 'none';
        deferredInstallPrompt = null;
    });
    
    if (window.matchMedia('(display-mode: standalone)').matches) installContainer.style.display = 'none';
}

window.addEventListener('appinstalled', () => {
    const installContainer = document.getElementById('installAppContainer');
    if (installContainer) installContainer.style.display = 'none';
    showToast('🎉 Спасибо за установку приложения "Солдаты"!');
});

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('✅ Service Worker зарегистрирован:', reg.scope))
            .catch(err => console.error('❌ Ошибка SW:', err));
    });
}

// ========== ЗАПУСК ==========
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
            const commentText = textInput?.value;
            if (!commentText?.trim()) { alert("Введите текст комментария"); return; }
            if (addComment(commentText)) {
                textInput.value = '';
                currentFormRating = 0;
                updateFormStarsDisplay();
            }
        };
    }
    
    const autoplayToggle = document.getElementById('autoplayToggle');
    if (autoplayToggle) { autoplayToggle.checked = autoplayEnabled; autoplayToggle.onchange = toggleAutoplay; }
    
    const favoriteBtn = document.getElementById('favoriteBtn');
    if (favoriteBtn) favoriteBtn.onclick = toggleFavorite;
    
    initTimeAndWeather();
    initPWAInstall();
};

document.addEventListener('DOMContentLoaded', () => {
    const userAvatar = document.getElementById('userAvatar');
    if (userAvatar) {
        userAvatar.style.cursor = 'pointer';
        userAvatar.onclick = () => { if (window.currentUser) window.location.href = 'profile.html'; };
    }
    const userName = document.getElementById('userName');
    if (userName) {
        userName.style.cursor = 'pointer';
        userName.onclick = () => { if (window.currentUser) window.location.href = 'profile.html'; };
    }
});

window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;
