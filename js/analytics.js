// ============================================================
// АНАЛИТИКА (только для администратора)
// ============================================================

// ID администратора (ваш email)
const ADMIN_EMAIL = "twinkjjjjkmnb@gmail.com";

// Флаг, включена ли аналитика
let analyticsEnabled = false;

// Инициализация
function initAnalytics() {
    if (!window.currentUser) return;
    
    // Проверяем, администратор ли пользователь
    if (window.currentUser.email === ADMIN_EMAIL) {
        analyticsEnabled = true;
        console.log("🔐 Администратор: аналитика включена");
        
        // Показываем кнопку для доступа к аналитике (только админу)
        showAdminButton();
    } else {
        console.log("👤 Обычный пользователь: аналитика выключена");
        analyticsEnabled = false;
    }
}

// Показать кнопку для входа в админ-панель
function showAdminButton() {
    let adminBtn = document.getElementById('adminAnalyticsBtn');
    if (!adminBtn) {
        adminBtn = document.createElement('button');
        adminBtn.id = 'adminAnalyticsBtn';
        adminBtn.innerHTML = '<i class="fas fa-chart-line"></i>';
        adminBtn.title = 'Админ-панель аналитики';
        adminBtn.className = 'admin-analytics-btn';
        adminBtn.onclick = () => window.location.href = 'analytics.html';
        document.body.appendChild(adminBtn);
    }
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
        const eventRef = db.ref(`analytics/events`).push();
        await eventRef.set(event);
        
        // Обновляем дневную статистику
        await updateDailyStats(eventType);
    } catch (error) {
        console.error("Ошибка записи аналитики:", error);
    }
}

// Обновить дневную статистику
async function updateDailyStats(eventType) {
    const today = new Date().toISOString().split('T')[0];
    const statsRef = db.ref(`analytics/daily_stats/${today}/${eventType}`);
    
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
    logEvent('comment', { 
        season, 
        episode, 
        text: text.substring(0, 100) // только начало
    });
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