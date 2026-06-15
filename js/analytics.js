// ============================================================
// АНАЛИТИКА (для всех пользователей — и гостей, и зарегистрированных)
// ============================================================

const ADMIN_EMAIL = "twinkjjjjkmnb@gmail.com";

// Генерация ID для незарегистрированного пользователя (хранится в localStorage)
function getAnonymousId() {
    let anonymousId = localStorage.getItem('anonymous_id');
    if (!anonymousId) {
        anonymousId = 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('anonymous_id', anonymousId);
    }
    return anonymousId;
}

// Получить информацию о пользователе (регистрация или аноним)
function getUserInfo() {
    if (window.currentUser) {
        return {
            isAuth: true,
            id: window.currentUser.uid,
            email: window.currentUser.email,
            name: window.currentUser.displayName || 'Без имени'
        };
    } else {
        return {
            isAuth: false,
            id: getAnonymousId(),
            email: 'anonymous@guest',
            name: 'Гость'
        };
    }
}

// Записать событие
async function logEvent(eventType, eventData) {
    const userInfo = getUserInfo();
    
    const event = {
        type: eventType,
        data: eventData,
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        userId: userInfo.id,
        userEmail: userInfo.email,
        userName: userInfo.name,
        isAuth: userInfo.isAuth,
        userAgent: navigator.userAgent,
        page: window.location.pathname,
        referrer: document.referrer || 'direct'
    };
    
    try {
        await firebase.database().ref('analytics/events').push().set(event);
        await updateDailyStats(eventType, userInfo.isAuth);
        console.log(`📊 Аналитика: ${eventType}`, eventData);
    } catch (error) {
        console.error("Ошибка записи аналитики:", error);
    }
}

// Обновить дневную статистику (с разделением на авторизованных и гостей)
async function updateDailyStats(eventType, isAuth) {
    const today = new Date().toISOString().split('T')[0];
    const userType = isAuth ? 'registered' : 'guest';
    
    const statsRef = firebase.database().ref(`analytics/daily_stats/${today}/${eventType}/${userType}`);
    const snapshot = await statsRef.once('value');
    const currentCount = snapshot.val() || 0;
    await statsRef.set(currentCount + 1);
}

// Флаг, включена ли аналитика
let analyticsEnabled = false;

// Инициализация
function initAnalytics() {
    console.log("🔍 initAnalytics вызван");
    
    if (!window.currentUser) {
        console.log("👤 Гость: аналитика включена (ограниченно)");
        analyticsEnabled = true;
        // Кнопку админ-панели НЕ показываем гостям
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
        analyticsEnabled = true;
        console.log("👤 Обычный пользователь: аналитика включена");
        analyticsEnabled = true;
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