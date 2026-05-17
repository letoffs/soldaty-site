// ============================================================
// САУНДТРЕКИ (music.js) — ИСПРАВЛЕННАЯ ВЕРСИЯ
// ============================================================

// Определяем базовый путь для аудиофайлов
const baseAudioPath = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'resources/soundtracks/' 
    : '/soldaty-site/resources/soundtracks/';

console.log("Базовый путь к аудио:", baseAudioPath);

// БАЗА ДАННЫХ САУНДТРЕКОВ
const songsData = [
    {
        id: 1,
        title: "Юность в сапогах",
        artist: "Конец фильма",
        description: "Главный хит сериала, неофициальный гимн. Открывает многие серии.",
        audioUrl: baseAudioPath + "yunost_v_sapogakh.mp3",
        duration: "3:06",
    },
    {
        id: 2,
        title: "Дембельская",
        artist: "Конец фильма",
        description: "Песня о возвращении домой, которую в сериале исполняет сержант Фомин",
        audioUrl: baseAudioPath + "Dembelskaya.mp3",
        duration: "3:21",
    },
    {
        id: 3,
        title: "Жили-были",
        artist: "Юта",
        description: "Лирическая и трогательная песня, которая звучит в драматических моментах",
        audioUrl: baseAudioPath + "zhili-byli.mp3",
        duration: "4:45",
    },
    {
        id: 4,
        title: "Прапорщик-блюз",
        artist: "Конец фильма",
        description: "«Визитная карточка» прапорщика Шматко.",
        audioUrl: baseAudioPath + "Praporshhik-blyuz.mp3",
        duration: "4:05",
    },
    {
        id: 5,
        title: "Та самая девчонка / Отчизне служи",
        artist: "Юта",
        description: "Романтическая композиция о любви и службе",
        audioUrl: baseAudioPath + "YUta_-_Ta_samaya_devchonka_48098087.mp3",
        duration: "2:23",
    },
    {
        id: 6,
        title: "Хорошо",
        artist: "Юта feat. Конец фильма",
        description: "Спокойная, «уютная» песня",
        audioUrl: baseAudioPath + "YUta_-_KHorosho_iz_ser_Soldaty_67370349.mp3",
        duration: "3:15",
    },
];

// Глобальные переменные
let currentSongIndex = 0;
let isPlaying = false;
let audioPlayer = null;

// DOM элементы
const playPauseBtn = document.getElementById('playPauseBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const currentSongTitle = document.getElementById('currentSongTitle');
const currentSongArtist = document.getElementById('currentSongArtist');
const progressBar = document.getElementById('progressBar');
const progressFill = document.getElementById('progressFill');
const currentTimeSpan = document.getElementById('currentTime');
const durationSpan = document.getElementById('duration');
const volumeSlider = document.getElementById('volumeSlider');

// Загрузить текущую песню
function loadSong(index) {
    const song = songsData[index];
    if (!song) return;
    
    console.log("Загружаем:", song.title, song.audioUrl);
    
    currentSongTitle.textContent = song.title;
    currentSongArtist.textContent = song.artist;
    audioPlayer.src = song.audioUrl;
    
    renderMusicGrid();
}

// Воспроизвести/Пауза
function togglePlay() {
    if (!audioPlayer.src) return;
    
    if (isPlaying) {
        audioPlayer.pause();
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        isPlaying = false;
    } else {
        const playPromise = audioPlayer.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
                isPlaying = true;
            }).catch((error) => {
                console.log("Автовоспроизведение заблокировано:", error);
                const msg = document.createElement('div');
                msg.textContent = 'Нажмите ещё раз для воспроизведения';
                msg.style.cssText = 'position:fixed;bottom:100px;left:20px;background:#bd8a3e;color:#0f1a0f;padding:8px 16px;border-radius:20px;z-index:1001;font-size:12px;';
                document.body.appendChild(msg);
                setTimeout(() => msg.remove(), 2000);
            });
        }
    }
}

// Следующий трек
function nextSong() {
    currentSongIndex = (currentSongIndex + 1) % songsData.length;
    loadSong(currentSongIndex);
    if (isPlaying) {
        audioPlayer.play().catch(e => console.log(e));
    }
}

// Предыдущий трек
function prevSong() {
    currentSongIndex = (currentSongIndex - 1 + songsData.length) % songsData.length;
    loadSong(currentSongIndex);
    if (isPlaying) {
        audioPlayer.play().catch(e => console.log(e));
    }
}

// Обновить прогресс-бар
function updateProgress() {
    if (audioPlayer.duration) {
        const percent = (audioPlayer.currentTime / audioPlayer.duration) * 100;
        progressFill.style.width = `${percent}%`;
        currentTimeSpan.textContent = formatTime(audioPlayer.currentTime);
        durationSpan.textContent = formatTime(audioPlayer.duration);
    }
}

// Форматировать время
function formatTime(seconds) {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Перемотка по клику
function setProgress(e) {
    const rect = progressBar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    if (audioPlayer.duration) {
        audioPlayer.currentTime = percent * audioPlayer.duration;
    }
}

// Отрисовать список песен
function renderMusicGrid() {
    const grid = document.getElementById('musicGrid');
    if (!grid) return;
    
    grid.innerHTML = songsData.map((song, index) => `
        <div class="music-card ${currentSongIndex === index ? 'active-music' : ''}" onclick="playSongByIndex(${index})">
            <div class="music-icon">
                <i class="fas fa-music"></i>
            </div>
            <div class="music-info">
                <div class="music-title">${escapeHtml(song.title)}</div>
                <div class="music-artist">${escapeHtml(song.artist)}</div>
                <div class="music-desc">${escapeHtml(song.description)}</div>
                <div class="music-meta">
                    <span><i class="far fa-clock"></i> ${song.duration}</span>
                </div>
            </div>
            <div class="music-play-btn">
                <i class="fas fa-play-circle"></i>
            </div>
        </div>
    `).join('');
}

// Воспроизвести песню по индексу
function playSongByIndex(index) {
    currentSongIndex = index;
    loadSong(currentSongIndex);
    audioPlayer.play().catch(e => console.log("Автовоспроизведение заблокировано"));
    isPlaying = true;
    playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
    renderMusicGrid();
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

// Инициализация
window.onload = () => {
    audioPlayer = document.getElementById('audioPlayer');
    
    if (audioPlayer) {
        audioPlayer.setAttribute('playsinline', '');
        audioPlayer.setAttribute('webkit-playsinline', '');
        audioPlayer.preload = 'metadata';
    }

    loadSong(0);
    renderMusicGrid();
    
    if (playPauseBtn) playPauseBtn.onclick = togglePlay;
    if (prevBtn) prevBtn.onclick = prevSong;
    if (nextBtn) nextBtn.onclick = nextSong;
    if (audioPlayer) {
        audioPlayer.ontimeupdate = updateProgress;
        audioPlayer.onended = nextSong;
    }
    if (progressBar) progressBar.onclick = setProgress;
    if (volumeSlider) {
        volumeSlider.oninput = (e) => {
            if (audioPlayer) audioPlayer.volume = e.target.value;
        };
    }
    
    console.log("✅ Музыкальный плеер загружен");
    console.log("Базовый путь:", baseAudioPath);
    console.log("Первый трек:", songsData[0].audioUrl);
};
