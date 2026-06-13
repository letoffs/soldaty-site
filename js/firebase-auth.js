// ============================================================
// FIREBASE АВТОРИЗАЦИЯ (Realtime Database)
// ============================================================

// Глобальная переменная
window.currentUser = null;

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    console.log("🔥 firebase-auth.js загружен");
    initAuth();
});

function initAuth() {
    // Слушаем изменения состояния авторизации
    auth.onAuthStateChanged(async (user) => {
        console.log("📢 onAuthStateChanged вызван, user:", user);
        
        window.currentUser = user;
        updateAuthUI();
        
        if (user) {
            console.log('✅ Пользователь вошёл:', user.email);
            await loadUserData();
        } else {
            console.log('❌ Пользователь не авторизован');
        }
    });
}

// Загрузить данные пользователя в Realtime Database
async function loadUserData() {
    if (!window.currentUser) return;
    const userRef = db.ref(`users/${window.currentUser.uid}`);
    const snapshot = await userRef.get();
    
    if (!snapshot.exists()) {
        await userRef.set({
            name: window.currentUser.displayName || window.currentUser.email.split('@')[0],
            email: window.currentUser.email,
            createdAt: new Date().toISOString(),
            avatar: window.currentUser.photoURL || ''
        });
    } else {
        // Если в базе есть аватарка — обновляем в Auth
        const userData = snapshot.val();
        if (userData.avatar && !window.currentUser.photoURL) {
            await window.currentUser.updateProfile({
                photoURL: userData.avatar
            });
            window.currentUser.photoURL = userData.avatar;
        }
    }
}

// Обновить интерфейс в зависимости от статуса авторизации
function updateAuthUI() {
    console.log("🎨 updateAuthUI вызван, currentUser:", window.currentUser);
    
    const authButtons = document.getElementById('authButtons');
    const userInfo = document.getElementById('userInfo');
    
    if (!authButtons) {
        console.error("❌ Элемент authButtons не найден!");
        return;
    }

    if (typeof initAnalytics === 'function') {
        initAnalytics();
    }
    
    if (window.currentUser) {
        // Пользователь ВОШЁЛ — показываем информацию
        if (authButtons) authButtons.style.display = 'none';
        if (userInfo) {
            userInfo.style.display = 'flex';
            const userNameSpan = document.getElementById('userName');
            const userEmailSpan = document.getElementById('userEmail');
            const userAvatarImg = document.getElementById('userAvatar');
            
            if (userNameSpan) userNameSpan.textContent = window.currentUser.displayName || window.currentUser.email;
            if (userEmailSpan) userEmailSpan.textContent = window.currentUser.email;
            if (userAvatarImg && window.currentUser.photoURL) {
                userAvatarImg.src = window.currentUser.photoURL;
            }

            // ДОБАВИТЬ: клик по аватарке или имени открывает профиль
            const userInfoBlock = document.getElementById('userInfo');
            if (userInfoBlock)
            {
                userInfoBlock.style.cursor = 'pointer';
                userInfoBlock.onclick = (e) => {
                    if (e.target.classList && e.target.classList.contains('logout-btn')) return;
                    if (e.target.closest('.logout-btn')) return;
                    window.location.href = 'profile.html';
                };
            }
        }
        
        // Разблокируем комментарии
        if (typeof enableComments === 'function') enableComments();
        
        console.log("👤 Интерфейс обновлён: пользователь ВОШЁЛ");
    } else {
        // Пользователь НЕ вошёл — показываем кнопки входа
        if (authButtons) authButtons.style.display = 'flex';
        if (userInfo) userInfo.style.display = 'none';
        
        // Блокируем комментарии
        if (typeof disableComments === 'function') disableComments();
        
        console.log("👤 Интерфейс обновлён: пользователь НЕ вошёл");
    }
}

// Регистрация
async function register(email, password, name) {
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        await userCredential.user.updateProfile({ displayName: name });
        await db.ref(`users/${userCredential.user.uid}`).set({
            name: name,
            email: email,
            createdAt: new Date().toISOString(),
            avatar: ''
        });
        alert('✅ Регистрация успешна!');
        closeAuthModal();
        return true;
    } catch (error) {
        alert('❌ Ошибка регистрации: ' + error.message);
        return false;
    }
}

// Вход по email
async function login(email, password) {
    try {
        await auth.signInWithEmailAndPassword(email, password);
        alert('✅ Вход выполнен!');
        closeAuthModal();
        return true;
    } catch (error) {
        alert('❌ Ошибка входа: ' + error.message);
        return false;
    }
}

// Вход через Google
async function loginWithGoogle() {
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        const result = await auth.signInWithPopup(provider);
        console.log("✅ Google вход успешен:", result.user);
        alert('✅ Вход через Google выполнен!');
        closeAuthModal();
        return true;
    } catch (error) {
        console.error("❌ Ошибка Google входа:", error);
        alert('❌ Ошибка входа через Google: ' + error.message);
        return false;
    }
}

if (typeof logAuthEvent === 'function') {
    logAuthEvent('login', 'google');
}

// Выход
async function logout() {
    try {
        await auth.signOut();
        alert('✅ Вы вышли из аккаунта');
    } catch (error) {
        alert('❌ Ошибка выхода: ' + error.message);
    }
}

// Блокировка комментариев
function disableComments() {
    const commentTextarea = document.getElementById('commentText');
    const submitBtn = document.getElementById('submitCommentBtn');
    const starsContainer = document.getElementById('formStarsContainer');
    
    if (commentTextarea) {
        commentTextarea.disabled = true;
        commentTextarea.placeholder = '🔒 Войдите, чтобы оставить комментарий';
        commentTextarea.style.opacity = '0.6';
    }
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.5';
        submitBtn.style.cursor = 'not-allowed';
    }
    if (starsContainer) {
        starsContainer.style.opacity = '0.5';
        starsContainer.style.pointerEvents = 'none';
    }
    
    if (!document.getElementById('loginWarning')) {
        const commentForm = document.querySelector('.comment-form');
        if (commentForm) {
            const warning = document.createElement('div');
            warning.id = 'loginWarning';
            warning.className = 'login-warning';
            warning.innerHTML = `
                <i class="fas fa-lock"></i> 
                <a href="#" onclick="showAuthModal(); return false;">Войдите</a> или 
                <a href="#" onclick="showAuthModal(); return false;">зарегистрируйтесь</a>, 
                чтобы оставлять комментарии
            `;
            commentForm.parentNode.insertBefore(warning, commentForm.nextSibling);
        }
    }
}

function enableComments() {
    const commentTextarea = document.getElementById('commentText');
    const submitBtn = document.getElementById('submitCommentBtn');
    const starsContainer = document.getElementById('formStarsContainer');
    const warning = document.getElementById('loginWarning');
    
    if (commentTextarea) {
        commentTextarea.disabled = false;
        commentTextarea.placeholder = 'Поделитесь впечатлением о серии...';
        commentTextarea.style.opacity = '1';
    }
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
        submitBtn.style.cursor = 'pointer';
    }
    if (starsContainer) {
        starsContainer.style.opacity = '1';
        starsContainer.style.pointerEvents = 'auto';
    }
    if (warning) warning.remove();
}

// Модальное окно
function showAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) modal.style.display = 'flex';
}

function closeAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) modal.style.display = 'none';
}

function showLoginForm() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const tabs = document.querySelectorAll('.modal-tab');
    
    if (loginForm) loginForm.style.display = 'block';
    if (registerForm) registerForm.style.display = 'none';
    if (tabs[0]) tabs[0].classList.add('active');
    if (tabs[1]) tabs[1].classList.remove('active');
}

function showRegisterForm() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const tabs = document.querySelectorAll('.modal-tab');
    
    if (loginForm) loginForm.style.display = 'none';
    if (registerForm) registerForm.style.display = 'block';
    if (tabs[0]) tabs[0].classList.remove('active');
    if (tabs[1]) tabs[1].classList.add('active');
}


// Сохранить комментарий в БД
async function saveCommentToDB(season, episode, seriesTitle, text, rating) {
    if (!window.currentUser) return false;
    
    try {
        const commentRef = db.ref('comments').push();
        await commentRef.set({
            userId: window.currentUser.uid,
            userName: window.currentUser.displayName || window.currentUser.email.split('@')[0],
            userAvatar: window.currentUser.photoURL || '',
            season: season,
            episode: episode,
            seriesTitle: seriesTitle,
            text: text,
            rating: rating || 0,
            date: new Date().toISOString()
        });
        return true;
    } catch (error) {
        console.error('Ошибка сохранения комментария:', error);
        return false;
    }
}
