// soundtracks.js - исправленная версия

let songsData = [];
let currentSongIndex = 0;
let isPlaying = false;
let audioPlayer = null;
let currentUser = null;
const ADMIN_EMAIL = "twinkjjjjkmnb@gmail.com";

let isShuffle = false;
let isRepeat = false;
let shuffledPlaylist = [];
let currentSort = "default";

let playPauseBtn, prevBtn, nextBtn, currentSongTitle, currentSongArtist;
let progressBar, progressFill, currentTimeSpan, durationSpan, volumeSlider;
let shuffleBtn, repeatBtn;

// ============================================================
// ЗАГРУЗКА
// ============================================================
async function loadSongsFromFirebase() {
    const grid = document.getElementById('musicGrid');
    if (grid) grid.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-pulse"></i> Загрузка...</div>';
    
    try {
        const snapshot = await db.ref('songs').once('value');
        
        if (snapshot.exists()) {
            const songsObj = snapshot.val();
            songsData = Object.keys(songsObj).map(key => ({
                id: key,
                title: songsObj[key].title,
                artist: songsObj[key].artist,
                description: songsObj[key].description || "",
                audioUrl: songsObj[key].audioUrl,
                duration: songsObj[key].duration || "3:00",
                createdAt: songsObj[key].createdAt
            }));
            songsData.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
            console.log(`✅ ${songsData.length} песен`);
        } else {
            songsData = [];
        }
        
        document.getElementById('songCount').textContent = songsData.length;
        if (isShuffle) createShuffledPlaylist();
        renderMusicGrid();
        if (songsData.length > 0) loadSong(0);
        if (document.getElementById('adminPanel')?.style.display === 'flex') renderAdminSongsList();
    } catch (error) {
        console.error(error);
        if (grid) grid.innerHTML = '<div class="empty-music">Ошибка загрузки</div>';
    }
}

// ============================================================
// СОРТИРОВКА
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
                const durA = parseDuration(a.duration);
                const durB = parseDuration(b.duration);
                return durA - durB;
            });
            break;
        default:
            sorted.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
            break;
    }
    return sorted;
}

function parseDuration(d) {
    if (!d) return 0;
    let parts = d.split(":");
    return parts.length === 2 ? parseInt(parts[0])*60 + parseInt(parts[1]) : parseInt(parts[0]) || 0;
}

function setSortType(sortType) {
    currentSort = sortType;
    if (isShuffle) { isShuffle = false; shuffleBtn?.classList.remove('shuffle-active'); }
    renderMusicGrid();
}

function getSortedSongs() { return sortSongs(songsData, currentSort); }

// ============================================================
// ПЛЕЙЛИСТ
// ============================================================
function createShuffledPlaylist() {
    shuffledPlaylist = [...getSortedSongs()];
    for (let i = shuffledPlaylist.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledPlaylist[i], shuffledPlaylist[j]] = [shuffledPlaylist[j], shuffledPlaylist[i]];
    }
}

function getActivePlaylist() {
    if (isShuffle) {
        if (!shuffledPlaylist.length) createShuffledPlaylist();
        return shuffledPlaylist;
    }
    return getSortedSongs();
}

function toggleShuffle() {
    isShuffle = !isShuffle;
    if (isShuffle) { createShuffledPlaylist(); shuffleBtn.classList.add('shuffle-active'); showToast("Случайный порядок"); }
    else { shuffleBtn.classList.remove('shuffle-active'); showToast("Обычный порядок"); }
    renderMusicGrid();
}

function toggleRepeat() {
    isRepeat = !isRepeat;
    if (isRepeat) { repeatBtn.classList.add('repeat-active'); showToast("Повтор включён"); }
    else { repeatBtn.classList.remove('repeat-active'); showToast("Повтор выключен"); }
}

function getNextIndex() {
    if (isRepeat) return currentSongIndex;
    const active = getActivePlaylist();
    if (!active.length) return currentSongIndex;
    const pos = active.findIndex(s => s.id === songsData[currentSongIndex]?.id);
    if (pos === -1) return songsData.findIndex(s => s.id === active[0]?.id);
    if (pos + 1 >= active.length) return songsData.findIndex(s => s.id === active[0]?.id);
    return songsData.findIndex(s => s.id === active[pos + 1]?.id);
}

function getPrevIndex() {
    const active = getActivePlaylist();
    if (!active.length) return currentSongIndex;
    const pos = active.findIndex(s => s.id === songsData[currentSongIndex]?.id);
    if (pos === -1) return songsData.findIndex(s => s.id === active[active.length-1]?.id);
    if (pos - 1 < 0) return songsData.findIndex(s => s.id === active[active.length-1]?.id);
    return songsData.findIndex(s => s.id === active[pos - 1]?.id);
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
    if (prevBtn) prevBtn.onclick = () => { loadSong(getPrevIndex()); if (isPlaying) audioPlayer.play(); };
    if (nextBtn) nextBtn.onclick = () => { loadSong(getNextIndex()); if (isPlaying) audioPlayer.play(); };
    if (shuffleBtn) shuffleBtn.onclick = toggleShuffle;
    if (repeatBtn) repeatBtn.onclick = toggleRepeat;
    
    // ИСПРАВЛЕНО: убрана проверка авторизации
    if (progressBar) {
        progressBar.onclick = (e) => {
            if (audioPlayer && audioPlayer.duration) {
                const rect = progressBar.getBoundingClientRect();
                const percent = (e.clientX - rect.left) / rect.width;
                audioPlayer.currentTime = percent * audioPlayer.duration;
            }
        };
    }
    
    if (volumeSlider) {
        volumeSlider.oninput = (e) => { if (audioPlayer) audioPlayer.volume = e.target.value; };
    }
    
    if (audioPlayer) {
        audioPlayer.onended = () => { 
            if (isRepeat) { 
                audioPlayer.currentTime = 0; 
                audioPlayer.play(); 
            } else { 
                loadSong(getNextIndex()); 
                if (isPlaying) audioPlayer.play(); 
            } 
        };
        
        audioPlayer.ontimeupdate = () => { 
            if (audioPlayer.duration) {
                progressFill.style.width = `${(audioPlayer.currentTime / audioPlayer.duration) * 100}%`;
                currentTimeSpan.textContent = formatTime(audioPlayer.currentTime);
                durationSpan.textContent = formatTime(audioPlayer.duration);
            }
        };
    }
}

function loadSong(index) {
    if (!songsData.length || index >= songsData.length) return;
    currentSongIndex = index;
    let song = songsData[currentSongIndex];
    currentSongTitle.textContent = song.title;
    currentSongArtist.textContent = song.artist;
    audioPlayer.src = song.audioUrl;
    audioPlayer.load();
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

function formatTime(s) { 
    if (isNaN(s)) return "0:00"; 
    let m = Math.floor(s / 60); 
    let sec = Math.floor(s % 60); 
    return `${m}:${sec.toString().padStart(2, '0')}`; 
}

function playSongByIndex(i) { 
    loadSong(i); 
    audioPlayer.play().catch(e => console.log("Play error:", e)); 
    isPlaying = true; 
    playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>'; 
}

// ============================================================
// ОТРИСОВКА
// ============================================================
function renderMusicGrid() {
    let grid = document.getElementById('musicGrid');
    if (!grid) return;
    if (!songsData.length) { 
        grid.innerHTML = '<div class="empty-music">Нет песен</div>'; 
        return; 
    }
    
    let songs = getActivePlaylist();
    grid.innerHTML = songs.map(song => {
        let realIndex = songsData.findIndex(s => s.id === song.id);
        return `<div class="music-card ${currentSongIndex === realIndex ? 'active-music' : ''}" onclick="playSongByIndex(${realIndex})">
            <div class="music-icon"><i class="fas fa-music"></i></div>
            <div class="music-info">
                <div class="music-title">${escapeHtml(song.title)}</div>
                <div class="music-artist">${escapeHtml(song.artist)}</div>
                <div class="music-desc">${escapeHtml(song.description)}</div>
                <div class="music-meta"><i class="far fa-clock"></i> ${song.duration}</div>
            </div>
            <div class="music-play-btn"><i class="fas fa-play-circle"></i></div>
        </div>`;
    }).join('');
}

// ============================================================
// ДОБАВЛЕНИЕ (только URL)
// ============================================================
async function addNewSong() {
    let title = document.getElementById('newSongTitle').value.trim();
    let artist = document.getElementById('newSongArtist').value.trim();
    let description = document.getElementById('newSongDescription').value.trim();
    let audioUrl = document.getElementById('newSongUrl').value.trim();
    let duration = document.getElementById('newSongDuration').value.trim();
    
    if (!title || !artist) { showToast("Заполните название и исполнителя", "error"); return; }
    if (!audioUrl) { showToast("Укажите ссылку на аудиофайл", "error"); return; }
    if (!duration) { showToast("Укажите длительность", "error"); return; }
    
    try {
        await db.ref('songs').push({ 
            title, artist, description, audioUrl, duration, 
            createdAt: new Date().toISOString(), 
            createdBy: currentUser?.email 
        });
        showToast("Песня добавлена!");
        closeAddSongModal();
        document.getElementById('newSongTitle').value = '';
        document.getElementById('newSongArtist').value = '';
        document.getElementById('newSongDescription').value = '';
        document.getElementById('newSongUrl').value = '';
        document.getElementById('newSongDuration').value = '';
        await loadSongsFromFirebase();
    } catch(e) { showToast("Ошибка", "error"); }
}

function editSong(id) {
    let song = songsData.find(s => s.id === id);
    if (!song) return;
    document.getElementById('editSongId').value = id;
    document.getElementById('editSongTitle').value = song.title;
    document.getElementById('editSongArtist').value = song.artist;
    document.getElementById('editSongDescription').value = song.description || '';
    document.getElementById('editSongUrl').value = song.audioUrl;
    document.getElementById('editSongDuration').value = song.duration;
    document.getElementById('editSongModal').style.display = 'flex';
}

async function updateSong() {
    let id = document.getElementById('editSongId').value;
    let title = document.getElementById('editSongTitle').value.trim();
    let artist = document.getElementById('editSongArtist').value.trim();
    let description = document.getElementById('editSongDescription').value.trim();
    let audioUrl = document.getElementById('editSongUrl').value.trim();
    let duration = document.getElementById('editSongDuration').value.trim();
    
    if (!title || !artist) { showToast("Заполните название и исполнителя", "error"); return; }
    if (!audioUrl) { showToast("Укажите URL", "error"); return; }
    
    try {
        await db.ref(`songs/${id}`).update({ 
            title, artist, description, audioUrl, duration, 
            updatedAt: new Date().toISOString() 
        });
        showToast("Обновлено!");
        closeEditSongModal();
        await loadSongsFromFirebase();
        if (songsData[currentSongIndex]?.id === id) { 
            loadSong(currentSongIndex); 
            if (isPlaying) audioPlayer.play(); 
        }
    } catch(e) { showToast("Ошибка", "error"); }
}

async function deleteSong(id, title) {
    if (!confirm(`Удалить "${title}"?`)) return;
    try {
        await db.ref(`songs/${id}`).remove();
        showToast("Удалено");
        await loadSongsFromFirebase();
        if (songsData.length === 0) { 
            audioPlayer.src = ''; 
            isPlaying = false; 
            playPauseBtn.innerHTML = '<i class="fas fa-play"></i>'; 
            currentSongTitle.textContent = 'Выберите песню'; 
            currentSongArtist.textContent = ''; 
        } else if (songsData[currentSongIndex]?.id === id) { 
            loadSong(0); 
            if (isPlaying) audioPlayer.play(); 
        }
    } catch(e) { showToast("Ошибка", "error"); }
}

function renderAdminSongsList() {
    let container = document.getElementById('adminSongsList');
    if (!container) return;
    if (!songsData.length) { 
        container.innerHTML = '<div class="empty-music">Нет песен</div>'; 
        return; 
    }
    container.innerHTML = songsData.map(s => `<div class="admin-song-item">
        <div><b>${escapeHtml(s.title)}</b><br><small>${escapeHtml(s.artist)}</small></div>
        <div>
            <button onclick="editSong('${s.id}')" class="edit-song-btn"><i class="fas fa-edit"></i></button>
            <button onclick="deleteSong('${s.id}','${escapeHtml(s.title)}')" class="delete-song-btn"><i class="fas fa-trash-alt"></i></button>
        </div>
    </div>`).join('');
}

function showAdminPanel() { 
    document.getElementById('adminPanel').style.display = 'block'; 
    renderAdminSongsList(); 
}

function hideAdminPanel() { 
    document.getElementById('adminPanel').style.display = 'none'; 
}

function showAddSongModal() { 
    document.getElementById('addSongModal').style.display = 'flex'; 
}

function closeAddSongModal() { 
    document.getElementById('addSongModal').style.display = 'none'; 
}

function closeEditSongModal() { 
    document.getElementById('editSongModal').style.display = 'none'; 
}

function escapeHtml(s) { 
    if (!s) return ''; 
    return s.replace(/[&<>]/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[m])); 
}

function showToast(msg, type='success') { 
    let t = document.createElement('div'); 
    t.className = 'toast-message'; 
    t.innerHTML = `<i class="fas ${type==='success'?'fa-check-circle':'fa-exclamation-circle'}"></i> ${msg}`; 
    document.body.appendChild(t); 
    setTimeout(()=>t.remove(),3000); 
}

// ============================================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================================
document.addEventListener('DOMContentLoaded', () => { 
    initPlayer(); 
    loadSongsFromFirebase(); 
    
    // Слушаем изменения авторизации
    if (typeof auth !== 'undefined') {
        auth.onAuthStateChanged((user) => {
            currentUser = user;
            console.log("Auth state changed:", user ? user.email : "not logged");
        });
    }
});

// Экспорт
window.playSongByIndex = playSongByIndex;
window.addNewSong = addNewSong;
window.editSong = editSong;
window.updateSong = updateSong;
window.deleteSong = deleteSong;
window.showAdminPanel = showAdminPanel;
window.hideAdminPanel = hideAdminPanel;
window.showAddSongModal = showAddSongModal;
window.closeAddSongModal = closeAddSongModal;
window.closeEditSongModal = closeEditSongModal;
window.setSortType = setSortType;
