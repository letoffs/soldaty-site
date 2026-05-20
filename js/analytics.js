// ============================================================
// АНАЛИТИКА (только для администратора)
// ============================================================

// ID администратора (ваш email)
const ADMIN_EMAIL = "twinkjjjjkmnb@gmail.com";

// Флаг, включена ли аналитика
let analyticsEnabled = false;

// Инициализация
function initAnalytics() {
    console.log("🔍 initAnalytics вызван");
    
    if (!window.currentUser) {
        console.log("❌ Нет пользователя");
        return;
    }
    
    console.log("👤 Пользователь:", window.currentUser.email);
    
    // Проверяем, администратор ли пользователь
    if (window.currentUser.email === ADMIN_EMAIL) {
        analyticsEnabled = true;
        console.log("🔐 Администратор: аналитика включена");
        
        // Показываем кнопку для доступа к аналитике
        showAdminButton();
    } else {
        console.log("👤 Обычный пользователь: аналитика выключена");
        analyticsEnabled = false;
    }
}

// Показать кнопку для входа в админ-панель
function showAdminButton() {
    // Удаляем старую кнопку, если есть
    const oldBtn = document.getElementById('adminAnalyticsBtn');
    if (oldBtn) oldBtn.remove();
    
    // Создаём новую кнопку
    const adminBtn = document.createElement('button');
    adminBtn.id = 'adminAnalyticsBtn';
    adminBtn.innerHTML = '<i class="fas fa-chart-line"></i>';
    adminBtn.title = 'Админ-панель аналитики';
    adminBtn.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background: #1e2a1e;
        border: 2px solid #bd8a3e;
        color: #bd8a3e;
        cursor: pointer;
        z-index: 9999;
        transition: all 0.2s;
        font-size: 1.2rem;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    adminBtn.onmouseenter = () => {
        adminBtn.style.background = '#bd8a3e';
        adminBtn.style.color = '#0f1a0f';
        adminBtn.style.transform = 'scale(1.1)';
    };
    adminBtn.onmouseleave = () => {
        adminBtn.style.background = '#1e2a1e';
        adminBtn.style.color = '#bd8a3e';
        adminBtn.style.transform = 'scale(1)';
    };
    adminBtn.onclick = () => {
        window.location.href = 'analytics.html';
    };
    
    document.body.appendChild(adminBtn);
    console.log("✅ Кнопка админ-панели добавлена");
}

// Записать событие
async function logEvent(eventType, eventData) {
    if (!analyticsEnabled) return;
    
    const event = {
        type: eventType,
        data: eventData,
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        userId: window.currentUser?.uid || 'anonymous',
        userEmail: window.currentUser?.email || 'anonymous',
        userAgent: navigator.userAgent,
        page: window.location.pathname
    };
    
    try {
        await firebase.database().ref('analytics/events').push().set(event);
        await updateDailyStats(eventType);
    } catch (error) {
        console.error("Ошибка записи аналитики:", error);
    }
}

// Обновить дневную статистику
async function updateDailyStats(eventType) {
    const today = new Date().toISOString().split('T')[0];
    const statsRef = firebase.database().ref(`analytics/daily_stats/${today}/${eventType}`);
    const snapshot = await statsRef.once('value');
    const currentCount = snapshot.val() || 0;
    await statsRef.set(currentCount + 1);
}

// Записать просмотр страницы
function logPageView(pageName) {
    logEvent('page_view', { page: pageName });
}

// Записать просмотр серии
function logEpisodeView(season, episode, title) {
    logEvent('episode_view', { season, episode, title });
}

// Записать комментарий
function logComment(season, episode, text) {
    logEvent('comment', { season, episode, text: text.substring(0, 100) });
}

// Записать оценку
function logRating(season, episode, rating) {
    logEvent('rating', { season, episode, rating });
}

// Записать результат викторины
function logQuizResult(level, score, total, passed) {
    logEvent('quiz_result', { level, score, total, passed });
}

// Записать вход/выход
function logAuthEvent(action, method) {
    logEvent('auth', { action, method });
}
