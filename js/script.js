// Глобальные переменные
let currentSeason = 1;
let currentEpisodeObj = episodesData[0];
let currentPlayer = null;  // YouTube плеер
let currentFormRating = 0;
let autoplayEnabled = true;
let autoplayTimer = null;
let timerInterval = null;
let secondsLeft = 10;

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
    
    timerInterval = setInterval(() => {
        secondsLeft--;
        updateTimerDisplay();
        
        if (secondsLeft <= 0) {
            stopAutoplayTimer();
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
    } else if (timerSpan) {
        timerSpan.textContent = '';
    }
}

// Переключение автовоспроизведения
function toggleAutoplay() {
    autoplayEnabled = !autoplayEnabled;
    if (!autoplayEnabled) {
        stopAutoplayTimer();
    }
}

// ---------- YouTube API ----------
function onYouTubeIframeAPIReady() {
    loadFirstEpisode();
}

function createYouTubePlayer(videoId) {
    const container = document.getElementById('youtubePlayer');
    if (!container) return;
    
    container.innerHTML = '';
    const playerDiv = document.createElement('div');
    playerDiv.id = 'youtubePlayerDiv';
    container.appendChild(playerDiv);
    
    currentPlayer = new YT.Player('youtubePlayerDiv', {
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
    // event.data: -1 (не начато), 0 (завершено), 1 (играет), 2 (пауза), 3 (буферизация)
    if (event.data === 0) { // Видео закончилось
        if (autoplayEnabled) {
            startAutoplayTimer();
        }
    } else if (event.data === 1) { // Видео играет
        stopAutoplayTimer();
    } else if (event.data === 2) { // Пауза
        stopAutoplayTimer();
    }
}

// Загрузить эпизод
function loadEpisode(episode) {
    if (!episode || !episode.youtubeId) {
        console.warn("Нет YouTube ID для этой серии");
        return;
    }
    
    currentEpisodeObj = episode;
    
    document.getElementById('currentSeriesTitle').innerHTML = 
        `Солдаты ${episode.season} сезон · ${episode.episode} серия &nbsp;|&nbsp; ${episode.title}`;
    document.getElementById('currentSeriesDesc').innerHTML = episode.desc;
    
    if (currentPlayer && currentPlayer.loadVideoById) {
        currentPlayer.loadVideoById(episode.youtubeId);
        currentPlayer.playVideo();
    } else {
        createYouTubePlayer(episode.youtubeId);
    }
    
    renderComments();
    renderEpisodesGrid(currentSeason);
    updateRatingDisplay();
    stopAutoplayTimer();
    secondsLeft = 10;
    updateTimerDisplay();

    if (typeof checkFavoriteStatus === 'function') {
        checkFavoriteStatus();
    }
}

function loadFirstEpisode() {
    const firstEpisodes = getEpisodesBySeason(currentSeason);
    if (firstEpisodes.length) {
        loadEpisode(firstEpisodes[0]);
    }
}


// ---------- КОММЕНТАРИИ И ОЦЕНКИ ----------
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
    
    // Берём имя из профиля Firebase
    const userName = currentUser.displayName || currentUser.email.split('@')[0];
    
    const newComment = {
        id: Date.now(),
        name: userName,  // ← автоматически из профиля
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
    
    // Сохраняем в Firebase
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
    console.log("currentUser:", window.currentUser);
    
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

function renderSeasonNav() {
    const seasons = getSeasons();
    const nav = document.getElementById('seasonNav');
    if (!nav) return;
    nav.innerHTML = '';
    seasons.forEach(s => {
        const btn = document.createElement('button');
        btn.innerText = `${s} СЕЗОН`;
        btn.className = 'season-btn';
        if (s === currentSeason) btn.classList.add('active');
        btn.onclick = () => {
            currentSeason = s;
            renderSeasonNav();
            renderEpisodesGrid(currentSeason);
            const episodesOfSeason = getEpisodesBySeason(currentSeason);
            if (episodesOfSeason.length) loadEpisode(episodesOfSeason[0]);
        };
        nav.appendChild(btn);
    });
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
            if (!textInput) {
                console.error("Поле commentText не найдено");
                return;
            }
            
            const commentText = textInput.value;
            if (!commentText || !commentText.trim()) {
                alert("Введите текст комментария");
                return;
            }
            
            if (addComment(commentText)) {
                textInput.value = '';
                if (typeof currentFormRating !== 'undefined') {
                    currentFormRating = 0;
                    if (typeof updateFormStarsDisplay === 'function') updateFormStarsDisplay();
                }
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
    
    console.log("✅ Сайт «Солдаты» готов! Автовоспроизведение работает с YouTube API.");
};

// После загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    // Обработчик клика на аватарку (если она существует)
    const userAvatar = document.getElementById('userAvatar');
    if (userAvatar) {
        userAvatar.style.cursor = 'pointer';
        userAvatar.onclick = () => {
            if (window.currentUser) {
                window.location.href = 'profile.html';
            }
        };
    }
    
    // Обработчик клика на имя пользователя
    const userName = document.getElementById('userName');
    if (userName) {
        userName.style.cursor = 'pointer';
        userName.onclick = () => {
            if (window.currentUser) {
                window.location.href = 'profile.html';
            }
        };
    }
});

// Глобальная функция для YouTube API
window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;

// ========== ИЗБРАННОЕ ==========
let isFavorite = false;

// Проверить, добавлена ли серия в избранное
async function checkFavoriteStatus() {
    if (!window.currentUser) {
        isFavorite = false;
        updateFavoriteButton();
        return;
    }
    
    const key = `${currentEpisodeObj.season}_${currentEpisodeObj.episode}`;
    try {
        const snapshot = await db.ref(`favorites/${window.currentUser.uid}/${key}`).once('value');
        isFavorite = snapshot.val() === true;
        updateFavoriteButton();
    } catch (error) {
        console.error("Ошибка проверки избранного:", error);
        isFavorite = false;
        updateFavoriteButton();
    }
}

// Обновить внешний вид кнопки
function updateFavoriteButton() {
    const btn = document.getElementById('favoriteBtn');
    if (!btn) return;
    
    if (isFavorite) {
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
        showAuthModal();
        return;
    }
    
    const key = `${currentEpisodeObj.season}_${currentEpisodeObj.episode}`;
    const favRef = db.ref(`favorites/${window.currentUser.uid}/${key}`);
    
    try {
        if (isFavorite) {
            await favRef.remove();
            isFavorite = false;
            showToast('❌ Серия удалена из избранного');
        } else {
            await favRef.set(true);
            isFavorite = true;
            showToast('✅ Серия добавлена в избранное');
        }
        updateFavoriteButton();
    } catch (error) {
        console.error("Ошибка:", error);
        alert('Ошибка при сохранении. Попробуйте позже.');
    }
}

// Всплывающее уведомление
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