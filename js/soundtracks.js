// soundtracks.js - полная версия

// Глобальные переменные
let songsData = [];
let currentSongIndex = 0;
let isPlaying = false;
let audioPlayer = null;
let currentUser = null;
const ADMIN_EMAIL = "twinkjjjjkmnb@gmail.com";

// Функции плеера
let isShuffle = false;
let isRepeat = false;
let shuffledPlaylist = [];

// Сортировка
let currentSort = "default";

// Для загрузки файлов
let pendingAudioFile = null;
let pendingEditAudioFile = null;

// DOM элементы
let playPauseBtn, prevBtn, nextBtn, currentSongTitle, currentSongArtist;
let progressBar, progressFill, currentTimeSpan, durationSpan, volumeSlider;
let shuffleBtn, repeatBtn;

// ============================================================
// ФУНКЦИИ СОРТИРОВКИ
// ============================================================

function sortSongs(songs, sortType) {
    const sorted = [...songs];
    
    switch(sortType) {
        case "artist":
            sorted.sort((a, b) => (a.artist || "").localeCompare(b.artist || "", "ru"));
            break;
        case "artist-desc":
            sorted.sort((a, b) => (b.artist || "").localeCompare(a.artist || "", "ru"));
            break;
        case "title":
            sorted.sort((a, b) => (a.title || "").localeCompare(b.title || "", "ru"));
            break;
        case "title-desc":
            sorted.sort((a, b) => (b.title || "").localeCompare(a.title || "", "ru"));
            break;
        case "duration":
            sorted.sort((a, b) => {
                const durA = parseDuration(a.duration || "0:00");
                const durB = parseDuration(b.duration || "0:00");
                return durA - durB;
            });
            break;
        default:
            sorted.sort((a, b) => {
                if (a.createdAt && b.createdAt) {
                    return new Date(b.createdAt) - new Date(a.createdAt);
                }
                return b.id.localeCompare(a.id);
            });
            break;
    }
    return sorted;
}

function parseDuration(duration) {
    if (!duration) return 0;
    const parts = duration.split(":");
    if (parts.length === 2) {
        return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    }
    return parseInt(parts[0]) || 0;
}

function setSortType(sortType) {
    currentSort = sortType;
    
    // Обновляем выпадающий список
    const select = document.getElementById('sortSelect');
    if (select) select.value = sortType;
    
    // Если перемешивание включено, выключаем его
    if (isShuffle) {
        isShuffle = false;
        shuffleBtn.classList.remove('shuffle-active');
    }
    
    renderMusicGrid();
}

function getSortedSongs() {
    return sortSongs(songsData, currentSort);
}

// ============================================================
// ФУНКЦИИ ПЛЕЙЛИСТА
// ============================================================

function createShuffledPlaylist() {
    let songsToShuffle = getSortedSongs();
    shuffledPlaylist = [...songsToShuffle];
    for (let i = shuffledPlaylist.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledPlaylist[i], shuffledPlaylist[j]] = [shuffledPlaylist[j], shuffledPlaylist[i]];
    }
}

function getActivePlaylist() {
    if (isShuffle) {
        if (shuffledPlaylist.length === 0 || shuffledPlaylist.length !== songsData.length) {
            createShuffledPlaylist();
        }
        return shuffledPlaylist;
    }
    return getSortedSongs();
}

function toggleShuffle() {
    isShuffle = !isShuffle;
    if (isShuffle) {
        createShuffledPlaylist();
        shuffleBtn.classList.add('shuffle-active');
        showToast("Случайный порядок включён");
    } else {
        shuffleBtn.classList.remove('shuffle-active');
        showToast("Случайный порядок выключен");
    }
    renderMusicGrid();
}

function toggleRepeat() {
    isRepeat = !isRepeat;
    if (isRepeat) {
        repeatBtn.classList.add('repeat-active');
        showToast("Повтор включён");
    } else {
        repeatBtn.classList.remove('repeat-active');
        showToast("Повтор выключен");
    }
}

function getNextIndex() {
    if (isRepeat) return currentSongIndex;
    
    const activePlaylist = getActivePlaylist();
    if (activePlaylist.length === 0) return currentSongIndex;
    
    const currentSong = songsData[currentSongIndex];
    const currentPosition = activePlaylist.findIndex(song => song.id === currentSong.id);
    
    if (currentPosition === -1) {
        const firstSong = activePlaylist[0];
        return songsData.findIndex(song => song.id === firstSong.id);
    }
    
    if (currentPosition + 1 >= activePlaylist.length) {
        const firstSong = activePlaylist[0];
        return songsData.findIndex(song => song.id === firstSong.id);
    }
    
    const nextSong = activePlaylist[currentPosition + 1];
    return songsData.findIndex(song => song.id === nextSong.id);
}

function getPrevIndex() {
    const activePlaylist = getActivePlaylist();
    if (activePlaylist.length === 0) return currentSongIndex;
    
    const currentSong = songsData[currentSongIndex];
    const currentPosition = activePlaylist.findIndex(song => song.id === currentSong.id);
    
    if (currentPosition === -1) {
        const lastSong = activePlaylist[activePlaylist.length - 1];
        return songsData.findIndex(song => song.id === lastSong.id);
    }
    
    if (currentPosition - 1 < 0) {
        const lastSong = activePlaylist[activePlaylist.length - 1];
        return songsData.findIndex(song => song.id === lastSong.id);
    }
    
    const prevSong = activePlaylist[currentPosition - 1];
    return songsData.findIndex(song => song.id === prevSong.id);
}

// ============================================================
// ОПРЕДЕЛЕНИЕ ДЛИТЕЛЬНОСТИ
// ============================================================

function getAudioDuration(file) {
    return new Promise((resolve, reject) => {
        const audio = new Audio();
        const url = URL.createObjectURL(file);
        audio.addEventListener('loadedmetadata', () => {
            const duration = audio.duration;
            URL.revokeObjectURL(url);
            if (isNaN(duration)) {
                reject(new Error("Не удалось определить длительность"));
            } else {
                const mins = Math.floor(duration / 60);
                const secs = Math.floor(duration % 60);
                resolve(`${mins}:${secs.toString().padStart(2, '0')}`);
            }
        });
        audio.addEventListener('error', () => {
            URL.revokeObjectURL(url);
            reject(new Error("Ошибка загрузки аудиофайла"));
        });
        audio.src = url;
    });
}

// ============================================================
// ЗАГРУЗКА ПЕСЕН ИЗ FIREBASE
// ============================================================

async function loadSongsFromFirebase() {
    const grid = document.getElementById('musicGrid');
    if (grid) {
        grid.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-pulse"></i> Загрузка музыки...</div>';
    }
    
    try {
        const snapshot = await db.ref('songs').once('value');
        
        if (snapshot.exists()) {
            const songsObj = snapshot.val();
            songsData = Object.keys(songsObj).map(key => ({ id: key, ...songsObj[key] }));
            console.log(`✅ Загружено ${songsData.length} песен`);
        } else {
            songsData = [];
        }
        
        updateSongCount();
        if (isShuffle) createShuffledPlaylist();
        renderMusicGrid();
        
        if (songsData.length > 0 && (!audioPlayer || !audioPlayer.src)) {
            loadSong(0);
        }
        
        if (document.getElementById('adminPanel')?.style.display === 'flex') {
            renderAdminSongsList();
        }
    } catch (error) {
        console.error("Ошибка загрузки:", error);
        if (grid) grid.innerHTML = '<div class="empty-music"><i class="fas fa-exclamation-triangle"></i> Ошибка загрузки</div>';
    }
}

function updateSongCount() {
    const countSpan = document.getElementById('songCount');
    if (countSpan) countSpan.textContent = songsData.length;
}

// ============================================================
// ЗАГРУЗКА ФАЙЛОВ
// ============================================================

async function handleAudioFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('audio/')) {
        showToast("Выберите аудиофайл (MP3, WAV, OGG)", "error");
        return;
    }
    
    pendingAudioFile = file;
    
    const fileNameSpan = document.getElementById('selectedFileName');
    const durationInput = document.getElementById('newSongDuration');
    
    if (fileNameSpan) {
        const sizeMB = (file.size / 1024 / 1024).toFixed(2);
        fileNameSpan.innerHTML = `<i class="fas fa-spinner fa-pulse"></i> ${file.name} (${sizeMB} МБ) - определение длительности...`;
    }
    
    try {
        const duration = await getAudioDuration(file);
        if (durationInput) durationInput.value = duration;
        if (fileNameSpan) {
            const sizeMB = (file.size / 1024 / 1024).toFixed(2);
            fileNameSpan.innerHTML = `<i class="fas fa-check-circle"></i> ${file.name} (${sizeMB} МБ) - ${duration}`;
        }
        showToast(`Длительность: ${duration}`);
    } catch (error) {
        if (fileNameSpan) {
            const sizeMB = (file.size / 1024 / 1024).toFixed(2);
            fileNameSpan.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${file.name} (${sizeMB} МБ) - длительность не определена`;
        }
        showToast("Не удалось определить длительность, укажите вручную", "error");
    }
    
    document.getElementById('newSongUrl').value = '';
}

async function handleEditAudioFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('audio/')) {
        showToast("Выберите аудиофайл (MP3, WAV, OGG)", "error");
        return;
    }
    
    pendingEditAudioFile = file;
    
    const fileNameSpan = document.getElementById('editSelectedFileName');
    const durationInput = document.getElementById('editSongDuration');
    
    if (fileNameSpan) {
        const sizeMB = (file.size / 1024 / 1024).toFixed(2);
        fileNameSpan.innerHTML = `<i class="fas fa-spinner fa-pulse"></i> ${file.name} (${sizeMB} МБ) - определение длительности...`;
    }
    
    try {
        const duration = await getAudioDuration(file);
        if (durationInput) durationInput.value = duration;
        if (fileNameSpan) {
            const sizeMB = (file.size / 1024 / 1024).toFixed(2);
            fileNameSpan.innerHTML = `<i class="fas fa-check-circle"></i> ${file.name} (${sizeMB} МБ) - ${duration}`;
        }
        showToast(`Длительность: ${duration}`);
    } catch (error) {
        if (fileNameSpan) {
            const sizeMB = (file.size / 1024 / 1024).toFixed(2);
            fileNameSpan.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${file.name} (${sizeMB} МБ) - длительность не определена`;
        }
        showToast("Не удалось определить длительность", "error");
    }
    
    document.getElementById('editSongUrl').value = '';
}

function uploadAndSaveSong(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
}

// ============================================================
// ДОБАВЛЕНИЕ ПЕСНИ
// ============================================================

async function addNewSong() {
    const title = document.getElementById('newSongTitle').value.trim();
    const artist = document.getElementById('newSongArtist').value.trim();
    const description = document.getElementById('newSongDescription').value.trim();
    const urlInput = document.getElementById('newSongUrl').value.trim();
    let duration = document.getElementById('newSongDuration').value.trim();
    
    if (!title || !artist) {
        showToast("Заполните название и исполнителя", "error");
        return;
    }
    
    let audioUrl = urlInput;
    
    if (pendingAudioFile) {
        const addBtn = document.getElementById('addSongBtn');
        addBtn.disabled = true;
        addBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Загрузка...';
        
        try {
            if (!duration) {
                try {
                    duration = await getAudioDuration(pendingAudioFile);
                    document.getElementById('newSongDuration').value = duration;
                } catch(e) {}
            }
            audioUrl = await uploadAndSaveSong(pendingAudioFile);
        } catch (error) {
            showToast("Ошибка чтения файла", "error");
            addBtn.disabled = false;
            addBtn.innerHTML = '<i class="fas fa-save"></i> Сохранить';
            return;
        }
        
        addBtn.disabled = false;
        addBtn.innerHTML = '<i class="fas fa-save"></i> Сохранить';
    }
    
    if (!audioUrl) {
        showToast("Укажите URL или выберите файл", "error");
        return;
    }
    
    try {
        await db.ref('songs').push({
            title, artist, description: description || "",
            audioUrl, duration: duration || "3:00",
            createdAt: new Date().toISOString(),
            createdBy: currentUser?.email || ADMIN_EMAIL,
            fileName: pendingAudioFile?.name || null,
            fileSize: pendingAudioFile?.size || null
        });
        
        showToast("Песня добавлена!");
        closeAddSongModal();
        pendingAudioFile = null;
        document.getElementById('audioFileInput').value = '';
        document.getElementById('selectedFileName').innerHTML = '';
        document.getElementById('newSongTitle').value = '';
        document.getElementById('newSongArtist').value = '';
        document.getElementById('newSongDescription').value = '';
        document.getElementById('newSongUrl').value = '';
        document.getElementById('newSongDuration').value = '';
        
        await loadSongsFromFirebase();
    } catch (error) {
        showToast("Ошибка добавления", "error");
    }
}

// ============================================================
// РЕДАКТИРОВАНИЕ ПЕСНИ
// ============================================================

function editSong(songId) {
    const song = songsData.find(s => s.id === songId);
    if (!song) return;
    
    document.getElementById('editSongId').value = songId;
    document.getElementById('editSongTitle').value = song.title;
    document.getElementById('editSongArtist').value = song.artist;
    document.getElementById('editSongDescription').value = song.description || '';
    document.getElementById('editSongUrl').value = song.audioUrl || '';
    document.getElementById('editSongDuration').value = song.duration || '3:00';
    document.getElementById('editSelectedFileName').innerHTML = '';
    
    pendingEditAudioFile = null;
    document.getElementById('editAudioFileInput').value = '';
    document.getElementById('editSongModal').style.display = 'flex';
}

async function updateSong() {
    const songId = document.getElementById('editSongId').value;
    const title = document.getElementById('editSongTitle').value.trim();
    const artist = document.getElementById('editSongArtist').value.trim();
    const description = document.getElementById('editSongDescription').value.trim();
    const urlInput = document.getElementById('editSongUrl').value.trim();
    let duration = document.getElementById('editSongDuration').value.trim();
    
    if (!title || !artist) {
        showToast("Заполните название и исполнителя", "error");
        return;
    }
    
    let audioUrl = urlInput;
    
    if (pendingEditAudioFile) {
        const editBtn = document.getElementById('editSongBtn');
        editBtn.disabled = true;
        editBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Загрузка...';
        
        try {
            if (!duration) {
                try {
                    duration = await getAudioDuration(pendingEditAudioFile);
                    document.getElementById('editSongDuration').value = duration;
                } catch(e) {}
            }
            audioUrl = await uploadAndSaveSong(pendingEditAudioFile);
        } catch (error) {
            showToast("Ошибка чтения файла", "error");
            editBtn.disabled = false;
            editBtn.innerHTML = '<i class="fas fa-save"></i> Сохранить изменения';
            return;
        }
        
        editBtn.disabled = false;
        editBtn.innerHTML = '<i class="fas fa-save"></i> Сохранить изменения';
    }
    
    if (!audioUrl) {
        showToast("Укажите URL или выберите файл", "error");
        return;
    }
    
    try {
        await db.ref(`songs/${songId}`).update({
            title, artist, description: description || "",
            audioUrl, duration: duration || "3:00",
            updatedAt: new Date().toISOString(),
            updatedBy: currentUser?.email || ADMIN_EMAIL,
            fileName: pendingEditAudioFile?.name || null,
            fileSize: pendingEditAudioFile?.size || null
        });
        
        showToast("Песня обновлена!");
        closeEditSongModal();
        pendingEditAudioFile = null;
        
        const currentSong = songsData[currentSongIndex];
        if (currentSong && currentSong.id === songId) {
            if (currentSongTitle) currentSongTitle.textContent = title;
            if (currentSongArtist) currentSongArtist.textContent = artist;
            if (audioPlayer && audioPlayer.src === currentSong.audioUrl) {
                audioPlayer.src = audioUrl;
                if (isPlaying) audioPlayer.play();
            }
        }
        
        await loadSongsFromFirebase();
    } catch (error) {
        showToast("Ошибка обновления", "error");
    }
}

function closeEditSongModal() {
    document.getElementById('editSongModal').style.display = 'none';
    pendingEditAudioFile = null;
    document.getElementById('editAudioFileInput').value = '';
    document.getElementById('editSelectedFileName').innerHTML = '';
}

// ============================================================
// УДАЛЕНИЕ ПЕСНИ
// ============================================================

async function deleteSong(songId, songTitle) {
    if (!confirm(`Удалить "${songTitle}"?`)) return;
    
    try {
        await db.ref(`songs/${songId}`).remove();
        showToast("Песня удалена");
        
        if (songsData[currentSongIndex]?.id === songId) {
            if (songsData.length > 1) {
                nextSong();
            } else {
                audioPlayer?.pause();
                audioPlayer.src = '';
                isPlaying = false;
                if (playPauseBtn) playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
                if (currentSongTitle) currentSongTitle.textContent = 'Выберите песню';
                if (currentSongArtist) currentSongArtist.textContent = '';
            }
        }
        
        await loadSongsFromFirebase();
    } catch (error) {
        showToast("Ошибка удаления", "error");
    }
}

// ============================================================
// АДМИН-ПАНЕЛЬ
// ============================================================

function showAdminPanel() {
    const panel = document.getElementById('adminPanel');
    if (panel) {
        panel.style.display = 'block';
        renderAdminSongsList();
    }
}

function hideAdminPanel() {
    document.getElementById('adminPanel').style.display = 'none';
}

function renderAdminSongsList() {
    const container = document.getElementById('adminSongsList');
    if (!container) return;
    
    if (songsData.length === 0) {
        container.innerHTML = '<div class="empty-music" style="padding: 20px;">Нет песен</div>';
        return;
    }
    
    container.innerHTML = songsData.map(song => `
        <div class="admin-song-item">
            <div class="admin-song-info">
                <div class="admin-song-title">${escapeHtml(song.title)}</div>
                <div class="admin-song-artist">${escapeHtml(song.artist)}</div>
                ${song.duration ? `<div class="admin-song-duration">${song.duration}</div>` : ''}
            </div>
            <div class="admin-song-actions">
                <button onclick="editSong('${song.id}')" class="edit-song-btn" title="Редактировать">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteSong('${song.id}', '${escapeHtml(song.title)}')" class="delete-song-btn" title="Удалить">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// ============================================================
// ПЛЕЕР
// ============================================================

function initPlayer() {
    audioPlayer = document.getElementById('audioPlayer');
    playPauseBtn = document.getElementById('playPauseBtn');
    prevBtn = document.getElementById('prevBtn');
    nextBtn = document.getElementById('nextBtn');
    shuffleBtn = document.getElementById('shuffleBtn');
    repeatBtn = document.getElementById('repeatBtn');
    currentSongTitle = document.getElementById('currentSongTitle');
    currentSongArtist = document.getElementById('currentSongArtist');
    progressBar = document.getElementById('progressBar');
    progressFill = document.getElementById('progressFill');
    currentTimeSpan = document.getElementById('currentTime');
    durationSpan = document.getElementById('duration');
    volumeSlider = document.getElementById('volumeSlider');
    
    if (playPauseBtn) playPauseBtn.onclick = togglePlay;
    if (prevBtn) prevBtn.onclick = prevSong;
    if (nextBtn) nextBtn.onclick = nextSong;
    if (shuffleBtn) shuffleBtn.onclick = toggleShuffle;
    if (repeatBtn) repeatBtn.onclick = toggleRepeat;
    if (progressBar) progressBar.onclick = setProgress;
    if (volumeSlider) volumeSlider.oninput = (e) => { if (audioPlayer) audioPlayer.volume = e.target.value; };
    if (audioPlayer) audioPlayer.onended = () => { if (isRepeat) { audioPlayer.currentTime = 0; audioPlayer.play(); } else { nextSong(); } };
    if (audioPlayer) audioPlayer.ontimeupdate = updateProgress;
}

function loadSong(index) {
    if (!songsData.length || index >= songsData.length) return;
    
    currentSongIndex = index;
    const song = songsData[currentSongIndex];
    if (currentSongTitle) currentSongTitle.textContent = song.title;
    if (currentSongArtist) currentSongArtist.textContent = song.artist;
    if (audioPlayer) {
        audioPlayer.src = song.audioUrl;
        audioPlayer.load();
    }
    renderMusicGrid();
}

function togglePlay() {
    if (!audioPlayer?.src) return;
    
    if (isPlaying) {
        audioPlayer.pause();
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    } else {
        audioPlayer.play().catch(e => console.log("Play error:", e));
        playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
    }
    isPlaying = !isPlaying;
}

function nextSong() {
    if (!songsData.length) return;
    loadSong(getNextIndex());
    if (isPlaying && audioPlayer) {
        audioPlayer.play();
        playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
    }
}

function prevSong() {
    if (!songsData.length) return;
    loadSong(getPrevIndex());
    if (isPlaying && audioPlayer) {
        audioPlayer.play();
        playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
    }
}

function updateProgress() {
    if (audioPlayer?.duration && !isNaN(audioPlayer.duration)) {
        const percent = (audioPlayer.currentTime / audioPlayer.duration) * 100;
        if (progressFill) progressFill.style.width = `${percent}%`;
        if (currentTimeSpan) currentTimeSpan.textContent = formatTime(audioPlayer.currentTime);
        if (durationSpan) durationSpan.textContent = formatTime(audioPlayer.duration);
    }
}

function formatTime(seconds) {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function setProgress(e) {
    if (!progressBar || !audioPlayer?.duration) return;
    const rect = progressBar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    audioPlayer.currentTime = percent * audioPlayer.duration;
}

function playSongByIndex(index) {
    currentSongIndex = index;
    loadSong(currentSongIndex);
    audioPlayer?.play().catch(e => console.log("Play error:", e));
    isPlaying = true;
    playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
}

// ============================================================
// ОТРИСОВКА
// ============================================================

function renderMusicGrid() {
    const grid = document.getElementById('musicGrid');
    if (!grid) return;
    
    if (songsData.length === 0) {
        grid.innerHTML = '<div class="empty-music"><i class="fas fa-music"></i> Нет песен<br><small>Войдите как админ для добавления</small></div>';
        return;
    }
    
    const songsToDisplay = isShuffle ? getActivePlaylist() : getSortedSongs();
    
    const songsHtml = songsToDisplay.map(song => {
        const realIndex = songsData.findIndex(s => s.id === song.id);
        return `
        <div class="music-card ${currentSongIndex === realIndex ? 'active-music' : ''}" onclick="playSongByIndex(${realIndex})">
            <div class="music-icon"><i class="fas fa-music"></i></div>
            <div class="music-info">
                <div class="music-title">${escapeHtml(song.title)}</div>
                <div class="music-artist">${escapeHtml(song.artist)}</div>
                <div class="music-desc">${escapeHtml(song.description || '')}</div>
                <div class="music-meta"><span><i class="far fa-clock"></i> ${song.duration || '3:00'}</span></div>
            </div>
            <div class="music-play-btn"><i class="fas fa-play-circle"></i></div>
        </div>
    `}).join('');
    
    grid.innerHTML = songsHtml;
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${message}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function showAddSongModal() {
    document.getElementById('addSongModal').style.display = 'flex';
}

function closeAddSongModal() {
    document.getElementById('addSongModal').style.display = 'none';
    pendingAudioFile = null;
    document.getElementById('audioFileInput').value = '';
    document.getElementById('selectedFileName').innerHTML = '';
    document.getElementById('newSongTitle').value = '';
    document.getElementById('newSongArtist').value = '';
    document.getElementById('newSongDescription').value = '';
    document.getElementById('newSongUrl').value = '';
    document.getElementById('newSongDuration').value = '';
}

// ============================================================
// Drag and drop
// ============================================================

function setupDragAndDrop() {
    const uploadArea = document.getElementById('fileUploadArea');
    if (!uploadArea) return;
    
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#ffd966';
        uploadArea.style.background = '#2a3a2a';
    });
    
    uploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#bd8a3e';
        uploadArea.style.background = '#1e2a1e';
    });
    
    uploadArea.addEventListener('drop', async (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#bd8a3e';
        uploadArea.style.background = '#1e2a1e';
        
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('audio/')) {
            pendingAudioFile = file;
            const fileNameSpan = document.getElementById('selectedFileName');
            const durationInput = document.getElementById('newSongDuration');
            
            if (fileNameSpan) {
                const sizeMB = (file.size / 1024 / 1024).toFixed(2);
                fileNameSpan.innerHTML = `<i class="fas fa-spinner fa-pulse"></i> ${file.name} (${sizeMB} МБ) - определение длительности...`;
            }
            
            try {
                const duration = await getAudioDuration(file);
                if (durationInput) durationInput.value = duration;
                if (fileNameSpan) {
                    const sizeMB = (file.size / 1024 / 1024).toFixed(2);
                    fileNameSpan.innerHTML = `<i class="fas fa-check-circle"></i> ${file.name} (${sizeMB} МБ) - ${duration}`;
                }
                showToast(`Длительность: ${duration}`);
            } catch (error) {
                if (fileNameSpan) {
                    const sizeMB = (file.size / 1024 / 1024).toFixed(2);
                    fileNameSpan.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${file.name} (${sizeMB} МБ) - длительность не определена`;
                }
                showToast("Не удалось определить длительность", "error");
            }
            
            document.getElementById('newSongUrl').value = '';
        } else {
            showToast("Перетащите аудиофайл", "error");
        }
    });
}

// ============================================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log("🎵 Страница саундтреков загружена");
    
    initPlayer();
    loadSongsFromFirebase();
    setupDragAndDrop();
    
    if (typeof auth !== 'undefined') {
        auth.onAuthStateChanged((user) => {
            currentUser = user;
        });
    }
});

// Экспорт функций
window.playSongByIndex = playSongByIndex;
window.showAddSongModal = showAddSongModal;
window.closeAddSongModal = closeAddSongModal;
window.addNewSong = addNewSong;
window.editSong = editSong;
window.updateSong = updateSong;
window.closeEditSongModal = closeEditSongModal;
window.deleteSong = deleteSong;
window.showAdminPanel = showAdminPanel;
window.hideAdminPanel = hideAdminPanel;
window.handleAudioFileSelect = handleAudioFileSelect;
window.handleEditAudioFileSelect = handleEditAudioFileSelect;
window.setSortType = setSortType;
