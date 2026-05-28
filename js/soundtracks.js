// soundtracks.js - ПОЛНАЯ ВЕРСИЯ С BASE64 (без ограничений, без автовоспроизведения)
console.log("✅ soundtracks.js загружен");

let songsData = [];
let currentIndex = 0;
let isPlaying = false;
let audio = null;
let currentUser = null;
const ADMIN_EMAIL = "twinkjjjjkmnb@gmail.com";
let currentSort = "default";
let pendingFileUpload = null;
let autoPlayEnabled = false; // ← ОТКЛЮЧАЕМ АВТОВОСПРОИЗВЕДЕНИЕ

// ============ КОНВЕРТАЦИЯ ФАЙЛА В BASE64 ============
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// ============ ЗАГРУЗКА ПЕСЕН ============
async function loadSongs() {
    console.log("🔄 Загрузка песен...");
    const grid = document.getElementById('musicGrid');
    if (grid) grid.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-pulse"></i> Загрузка...</div>';
    
    try {
        const snapshot = await db.ref('songs').once('value');
        
        if (snapshot.exists()) {
            const obj = snapshot.val();
            songsData = Object.keys(obj).map(key => ({
                id: key,
                title: obj[key].title || "Без названия",
                artist: obj[key].artist || "Неизвестен",
                description: obj[key].description || "",
                audioUrl: obj[key].audioUrl,
                audioBase64: obj[key].audioBase64,
                isBase64: obj[key].isBase64 || false,
                duration: obj[key].duration || "3:00",
                createdAt: obj[key].createdAt || new Date().toISOString()
            }));
            console.log(`✅ Загружено ${songsData.length} песен`);
            console.log("Base64 песен:", songsData.filter(s => s.isBase64).length);
        } else {
            songsData = [];
            console.log("📭 Нет песен");
        }
        
        document.getElementById('songCount').textContent = songsData.length;
        renderSongs();
        
        // ← УБИРАЕМ АВТОВОСПРОИЗВЕДЕНИЕ
        // if (songsData.length > 0 && audio && !audio.src) {
        //     playSong(0);
        // }
        
    } catch (error) {
        console.error("❌ Ошибка:", error);
        if (grid) grid.innerHTML = `<div class="empty-music">
            <i class="fas fa-exclamation-triangle"></i> 
            Ошибка: ${error.message}<br>
            <button onclick="loadSongs()" class="admin-btn">Повторить</button>
        </div>`;
    }
}

// ============ ОТРИСОВКА ============
function renderSongs() {
    const grid = document.getElementById('musicGrid');
    if (!grid) return;
    
    if (songsData.length === 0) {
        grid.innerHTML = `<div class="empty-music">
            <i class="fas fa-music"></i>
            <h3>Нет песен</h3>
            ${currentUser?.email === ADMIN_EMAIL ? 
                '<button onclick="window.showAddSongModal()" class="admin-btn">➕ Добавить песню</button>' : 
                '<p>Авторизуйтесь как администратор для добавления</p>'}
        </div>`;
        return;
    }
    
    let list = [...songsData];
    if (currentSort === 'artist') list.sort((a,b) => a.artist.localeCompare(b.artist, 'ru'));
    if (currentSort === 'title') list.sort((a,b) => a.title.localeCompare(b.title, 'ru'));
    
    let html = '';
    for (let i = 0; i < list.length; i++) {
        const song = list[i];
        const originalIndex = songsData.findIndex(s => s.id === song.id);
        const isActive = currentIndex === originalIndex;
        const sourceType = song.isBase64 ? '' : '';
        
        html += `<div class="music-card ${isActive ? 'active-music' : ''}" onclick="window.playSong(${originalIndex})">
            <div class="music-icon"><i class="fas ${isActive ? 'fa-play-circle' : 'fa-music'}"></i></div>
            <div class="music-info">
                <div class="music-title">${escapeHtml(song.title)} ${sourceType}</div>
                <div class="music-artist">${escapeHtml(song.artist)}</div>
                <div class="music-desc">${escapeHtml(song.description) || ''}</div>
                <div class="music-meta"><i class="far fa-clock"></i> ${song.duration}</div>
            </div>
            <div class="music-play-btn"><i class="fas fa-play-circle"></i></div>
        </div>`;
    }
    grid.innerHTML = html;
}

// ============ ПЛЕЕР ============
function initPlayer() {
    audio = document.getElementById('audioPlayer');
    if (!audio) {
        console.error("audioPlayer не найден!");
        return;
    }
    
    const playBtn = document.getElementById('playPauseBtn');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const volumeSlider = document.getElementById('volumeSlider');
    const progressBar = document.getElementById('progressBar');
    const progressFill = document.getElementById('progressFill');
    const currentTimeSpan = document.getElementById('currentTime');
    const durationSpan = document.getElementById('duration');
    
    if (playBtn) {
        playBtn.onclick = () => {
            if (!audio.src) return;
            if (isPlaying) {
                audio.pause();
                playBtn.innerHTML = '<i class="fas fa-play"></i>';
            } else {
                audio.play();
                playBtn.innerHTML = '<i class="fas fa-pause"></i>';
            }
            isPlaying = !isPlaying;
        };
    }
    
    if (prevBtn) {
        prevBtn.onclick = () => {
            let newIndex = currentIndex - 1;
            if (newIndex < 0) newIndex = songsData.length - 1;
            if (songsData[newIndex]) playSong(newIndex);
        };
    }
    
    if (nextBtn) {
        nextBtn.onclick = () => {
            let newIndex = currentIndex + 1;
            if (newIndex >= songsData.length) newIndex = 0;
            if (songsData[newIndex]) playSong(newIndex);
        };
    }
    
    if (volumeSlider) {
        volumeSlider.oninput = () => { audio.volume = volumeSlider.value; };
        audio.volume = 0.7;
    }
    
    if (progressBar) {
        progressBar.onclick = (e) => {
            if (audio.duration) {
                const rect = progressBar.getBoundingClientRect();
                const percent = (e.clientX - rect.left) / rect.width;
                audio.currentTime = percent * audio.duration;
            }
        };
    }
    
    audio.ontimeupdate = () => {
        if (audio.duration && !isNaN(audio.duration)) {
            if (progressFill) progressFill.style.width = (audio.currentTime / audio.duration) * 100 + '%';
            if (currentTimeSpan) currentTimeSpan.textContent = formatTime(audio.currentTime);
            if (durationSpan) durationSpan.textContent = formatTime(audio.duration);
        }
    };
    
    audio.onended = () => {
        let newIndex = currentIndex + 1;
        if (newIndex >= songsData.length) newIndex = 0;
        if (songsData[newIndex] && autoPlayEnabled) {
            playSong(newIndex);
        } else {
            // Останавливаем воспроизведение и меняем кнопку
            isPlaying = false;
            const playBtn = document.getElementById('playPauseBtn');
            if (playBtn) playBtn.innerHTML = '<i class="fas fa-play"></i>';
        }
    };
}

function playSong(index) {
    if (!songsData[index]) return;
    currentIndex = index;
    const song = songsData[currentIndex];
    const titleEl = document.getElementById('currentSongTitle');
    const artistEl = document.getElementById('currentSongArtist');
    if (titleEl) titleEl.textContent = song.title;
    if (artistEl) artistEl.textContent = song.artist;
    
    if (song.isBase64 && song.audioBase64) {
        audio.src = song.audioBase64;
        console.log("Воспроизведение из Base64");
    } else if (song.audioUrl) {
        audio.src = song.audioUrl;
        console.log("Воспроизведение из URL");
    } else {
        console.error("Нет аудиоданных!");
        showToast("Ошибка: нет аудиоданных");
        return;
    }
    
    audio.play();
    isPlaying = true;
    const playBtn = document.getElementById('playPauseBtn');
    if (playBtn) playBtn.innerHTML = '<i class="fas fa-pause"></i>';
    renderSongs();
}

window.playSong = playSong;

function formatTime(s) {
    if (isNaN(s) || !isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return m + ':' + (sec < 10 ? '0' + sec : sec);
}

// ============ СОРТИРОВКА ============
window.setSortType = function(type) {
    currentSort = type;
    renderSongs();
};

// ============ МОДАЛЬНЫЕ ОКНА ============
window.showAuthModal = () => {
    const modal = document.getElementById('authModal');
    if (modal) modal.style.display = 'flex';
};
window.closeAuthModal = () => {
    const modal = document.getElementById('authModal');
    if (modal) modal.style.display = 'none';
};

window.showAddSongModal = () => {
    if (currentUser?.email === ADMIN_EMAIL) {
        const modal = document.getElementById('addSongModal');
        if (modal) modal.style.display = 'flex';
    } else {
        showToast("Доступ только для администратора");
        window.showAuthModal();
    }
};
window.closeAddSongModal = () => {
    const modal = document.getElementById('addSongModal');
    if (modal) modal.style.display = 'none';
    document.getElementById('newSongTitle').value = '';
    document.getElementById('newSongArtist').value = '';
    document.getElementById('newSongDescription').value = '';
    document.getElementById('newSongUrl').value = '';
    document.getElementById('newSongDuration').value = '';
    document.getElementById('selectedFileName').style.display = 'none';
    document.getElementById('uploadProgress').style.display = 'none';
    pendingFileUpload = null;
};

window.closeEditSongModal = () => {
    const modal = document.getElementById('editSongModal');
    if (modal) modal.style.display = 'none';
};

// ============ ВЫБОР ФАЙЛА ============
window.handleFileSelect = async function(event) {
    console.log("🔵 handleFileSelect вызвана");
    const file = event.target.files[0];
    if (!file) {
        console.log("Файл не выбран");
        return;
    }
    
    console.log("Выбран файл:", file.name, file.size, file.type);
    
    if (!file.type.match('audio/mpeg')) {
        showToast("Пожалуйста, выберите MP3 файл");
        return;
    }
    
    pendingFileUpload = file;
    const fileNameDisplay = document.getElementById('selectedFileName');
    
    // Показываем индикатор определения длительности
    showToast("Определение длительности...");
    
    try {
        // Автоматически определяем длительность
        const duration = await getMp3Duration(file);
        const durationInput = document.getElementById('newSongDuration');
        if (durationInput) {
            durationInput.value = duration;
            console.log("✅ Длительность определена:", duration);
        }
        showToast(`Длительность: ${duration}`);
    } catch (error) {
        console.warn("Не удалось определить длительность:", error);
        showToast("Не удалось определить длительность, укажите вручную");
    }
    
    if (fileNameDisplay) {
        const sizeMB = (file.size / 1024 / 1024).toFixed(2);
        fileNameDisplay.textContent = `📁 Выбран: ${file.name} (${sizeMB} МБ)`;
        fileNameDisplay.style.display = 'block';
    }
    
    const urlInput = document.getElementById('newSongUrl');
    if (urlInput) urlInput.value = '';
    
    showToast(`Файл выбран: ${file.name}`);
    console.log("✅ Файл сохранён для Base64 конвертации");
};

// ============ ДОБАВЛЕНИЕ ПЕСНИ (BASE64) ============
window.addNewSong = async function() {
    console.log("🔵 addNewSong вызвана");
    
    const title = document.getElementById('newSongTitle')?.value.trim();
    const artist = document.getElementById('newSongArtist')?.value.trim();
    const description = document.getElementById('newSongDescription')?.value.trim();
    const audioUrl = document.getElementById('newSongUrl')?.value.trim();
    let duration = document.getElementById('newSongDuration')?.value.trim();
    
    if (!title) {
        showToast("Введите название песни");
        return;
    }
    
    if (!artist) {
        showToast("Введите исполнителя");
        return;
    }
    
    let finalAudioData = null;
    let isBase64 = false;
    
    if (pendingFileUpload) {
        showToast("Конвертация MP3 в Base64...");
        try {
            // Если длительность ещё не определена, определяем сейчас
            if (!duration) {
                try {
                    duration = await getMp3Duration(pendingFileUpload);
                    document.getElementById('newSongDuration').value = duration;
                } catch (e) {
                    duration = "3:00";
                }
            }
            
            finalAudioData = await fileToBase64(pendingFileUpload);
            isBase64 = true;
            console.log("✅ Файл сконвертирован в Base64, длина:", finalAudioData.length);
            showToast("Файл сконвертирован!");
        } catch (error) {
            showToast("Ошибка конвертации: " + error.message);
            return;
        }
    } else if (!audioUrl) {
        showToast("Укажите URL аудиофайла или загрузите MP3 файл");
        return;
    }
    
    let finalDuration = duration && duration !== "" ? duration : "3:00";
    
    try {
        showToast("Сохранение песни...");
        
        const songData = {
            title: title,
            artist: artist,
            description: description || "",
            duration: finalDuration,
            createdAt: new Date().toISOString(),
            createdBy: currentUser?.email || "unknown"
        };
        
        if (isBase64 && finalAudioData) {
            songData.audioBase64 = finalAudioData;
            songData.isBase64 = true;
        } else if (audioUrl) {
            songData.audioUrl = audioUrl;
            songData.isBase64 = false;
        }
        
        await db.ref('songs').push(songData);
        
        showToast("✅ Песня добавлена!");
        window.closeAddSongModal();
        pendingFileUpload = null;
        await loadSongs();
        
    } catch (error) {
        console.error("Ошибка:", error);
        showToast("Ошибка: " + error.message);
    }
};

// ============ РЕДАКТИРОВАНИЕ ============
window.editSong = function(id) {
    const song = songsData.find(s => s.id === id);
    if (!song) return;
    
    document.getElementById('editSongId').value = id;
    document.getElementById('editSongTitle').value = song.title;
    document.getElementById('editSongArtist').value = song.artist;
    document.getElementById('editSongDescription').value = song.description || '';
    document.getElementById('editSongUrl').value = song.audioUrl || '';
    document.getElementById('editSongDuration').value = song.duration;
    
    document.getElementById('editSongModal').style.display = 'flex';
};

window.updateSong = async function() {
    const id = document.getElementById('editSongId').value;
    const title = document.getElementById('editSongTitle').value.trim();
    const artist = document.getElementById('editSongArtist').value.trim();
    const description = document.getElementById('editSongDescription').value.trim();
    const audioUrl = document.getElementById('editSongUrl').value.trim();
    const duration = document.getElementById('editSongDuration').value.trim();
    
    if (!title || !artist) {
        showToast("Заполните название и исполнителя");
        return;
    }
    
    try {
        const updateData = {
            title, artist, description,
            duration: duration || "3:00",
            updatedAt: new Date().toISOString()
        };
        
        if (audioUrl) {
            updateData.audioUrl = audioUrl;
            updateData.isBase64 = false;
            updateData.audioBase64 = null;
        }
        
        await db.ref(`songs/${id}`).update(updateData);
        showToast("Песня обновлена!");
        window.closeEditSongModal();
        await loadSongs();
        
        if (songsData[currentIndex]?.id === id) {
            playSong(currentIndex);
        }
    } catch (error) {
        showToast("Ошибка: " + error.message);
    }
};

// ============ УДАЛЕНИЕ ============
window.deleteSong = async function(id, title) {
    if (!confirm(`Удалить песню "${title}"?`)) return;
    
    try {
        await db.ref(`songs/${id}`).remove();
        showToast(`Песня "${title}" удалена`);
        
        if (songsData[currentIndex]?.id === id) {
            if (songsData.length > 1) {
                const newIndex = currentIndex === 0 ? 0 : currentIndex - 1;
                playSong(newIndex);
            } else {
                audio.src = '';
                isPlaying = false;
                document.getElementById('currentSongTitle').textContent = 'Выберите песню';
                document.getElementById('currentSongArtist').textContent = '';
                const playBtn = document.getElementById('playPauseBtn');
                if (playBtn) playBtn.innerHTML = '<i class="fas fa-play"></i>';
            }
        }
        await loadSongs();
    } catch (error) {
        showToast("Ошибка: " + error.message);
    }
};

// ============ АВТОРИЗАЦИЯ ============
window.login = async () => {
    const email = document.getElementById('loginEmail').value;
    const pass = document.getElementById('loginPassword').value;
    try {
        await auth.signInWithEmailAndPassword(email, pass);
        showToast("Вход выполнен");
        window.closeAuthModal();
    } catch(e) { showToast(e.message); }
};

window.register = async () => {
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const pass = document.getElementById('registerPassword').value;
    try {
        const cred = await auth.createUserWithEmailAndPassword(email, pass);
        await cred.user.updateProfile({ displayName: name });
        showToast("Регистрация успешна");
        window.closeAuthModal();
    } catch(e) { showToast(e.message); }
};

window.loginWithGoogle = async () => {
    try {
        await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
        showToast("Вход через Google выполнен");
        window.closeAuthModal();
    } catch(e) { showToast(e.message); }
};

window.logout = async () => {
    await auth.signOut();
    showToast("Вы вышли");
};

window.showLoginForm = () => {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
};
window.showRegisterForm = () => {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
};

window.showAdminPanel = () => {
    if (currentUser?.email === ADMIN_EMAIL) {
        document.getElementById('adminPanel').style.display = 'flex';
        renderAdminSongsList();
    } else {
        showToast("Доступ только для администратора");
        window.showAuthModal();
    }
};
window.hideAdminPanel = () => {
    document.getElementById('adminPanel').style.display = 'none';
};

function renderAdminSongsList() {
    const container = document.getElementById('adminSongsList');
    if (!container) return;
    if (!songsData.length) {
        container.innerHTML = '<div class="empty-music">Нет песен</div>';
        return;
    }
    let html = '';
    for (let i = 0; i < songsData.length; i++) {
        const s = songsData[i];
        const sourceType = s.isBase64 ? 'Base64' : '🔗 URL';
        html += `<div class="admin-song-item">
            <div>
                <b>${escapeHtml(s.title)}</b><br>
                <small>${escapeHtml(s.artist)}</small><br>
                <small style="color:#8aa07a">${sourceType}</small>
            </div>
            <div>
                <button onclick="window.editSong('${s.id}')" class="edit-song-btn"><i class="fas fa-edit"></i></button>
                <button onclick="window.deleteSong('${s.id}','${escapeHtml(s.title)}')" class="delete-song-btn"><i class="fas fa-trash-alt"></i></button>
            </div>
        </div>`;
    }
    container.innerHTML = html;
}

// ============ ОПРЕДЕЛЕНИЕ ДЛИТЕЛЬНОСТИ MP3 ============
function getMp3Duration(file) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const audio = new Audio();
        
        audio.addEventListener('loadedmetadata', () => {
            const duration = audio.duration;
            URL.revokeObjectURL(url);
            
            if (isNaN(duration)) {
                reject(new Error("Не удалось определить длительность"));
            } else {
                const minutes = Math.floor(duration / 60);
                const seconds = Math.floor(duration % 60);
                const formattedDuration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                resolve(formattedDuration);
            }
        });
        
        audio.addEventListener('error', () => {
            URL.revokeObjectURL(url);
            reject(new Error("Ошибка загрузки аудио"));
        });
        
        audio.src = url;
    });
}

// ============ ВСПОМОГАТЕЛЬНЫЕ ============
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[m]));
}

function showToast(msg) {
    const t = document.createElement('div');
    t.className = 'toast-message';
    t.innerHTML = '<i class="fas fa-info-circle"></i> ' + msg;
    t.style.cssText = 'position:fixed;bottom:30px;left:50%;transform:translateX(-50%);background:#0f1a0f;color:#ffd966;padding:12px 24px;border-radius:50px;border:1px solid #bd8a3e;z-index:3000;font-size:14px;';
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

// ============ СЕКРЕТНАЯ КНОПКА ============
let clickCount = 0, clickTimer;
document.addEventListener('DOMContentLoaded', () => {
    const secretBtn = document.getElementById('secretAdminBtn');
    if (secretBtn) {
        secretBtn.addEventListener('click', () => {
            clickCount++;
            clearTimeout(clickTimer);
            clickTimer = setTimeout(() => clickCount = 0, 1000);
            if (clickCount >= 3) {
                clickCount = 0;
                window.showAdminPanel();
            }
        });
    }
});

// ============ ОТСЛЕЖИВАНИЕ ПОЛЬЗОВАТЕЛЯ ============
auth.onAuthStateChanged((user) => {
    currentUser = user;
    const authDiv = document.getElementById('authButtons');
    const userDiv = document.getElementById('userInfo');
    if (user && authDiv && userDiv) {
        authDiv.style.display = 'none';
        userDiv.style.display = 'flex';
        const userName = document.getElementById('userName');
        const userEmail = document.getElementById('userEmail');
        if (userName) userName.textContent = user.displayName || user.email;
        if (userEmail) userEmail.textContent = user.email;
    } else if (authDiv && userDiv) {
        authDiv.style.display = 'flex';
        userDiv.style.display = 'none';
    }
});

// ============ СТАРТ ============
document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 Старт");
    initPlayer();
    loadSongs();
});

window.loadSongs = loadSongs;
