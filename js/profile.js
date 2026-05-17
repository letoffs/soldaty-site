// ============================================================
// ЛИЧНЫЙ КАБИНЕТ (profile.js)
// Загрузка аватарок через ImgBB API
// ============================================================

const profileContainer = document.getElementById('profileContainer');

// ImgBB API ключ
const IMGBB_API_KEY = "ae3a037f9fedc773fabc358051158443";

// Ждём загрузку страницы
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        checkAuthAndLoadProfile();
    }, 500);
});

// Получить URL аватарки (генерация через UI Avatars, если нет загруженной)
function getGeneratedAvatarUrl(user) {
    if (!user) {
        return 'https://ui-avatars.com/api/?background=bd8a3e&color=fff&bold=true&size=100&name=User';
    }
    
    let name = user.displayName || user.email || 'User';
    if (name.includes('@')) {
        name = name.split('@')[0];
    }
    const encodedName = encodeURIComponent(name);
    const color = localStorage.getItem('avatarColor') || 'bd8a3e';
    
    return `https://ui-avatars.com/api/?background=${color}&color=fff&bold=true&size=100&name=${encodedName}`;
}

// Конвертация файла в Base64
function convertToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
    });
}

// Загрузка аватарки через ImgBB
async function uploadAvatarToImgBB(file) {
    if (!window.currentUser) {
        alert('Войдите в аккаунт');
        return;
    }
    
    if (!file.type.startsWith('image/')) {
        alert('Пожалуйста, выберите изображение (JPEG, PNG, GIF)');
        return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
        alert('Размер изображения не должен превышать 5MB');
        return;
    }
    
    showProfileToast('⏳ Загрузка аватарки...');
    
    try {
        const base64 = await convertToBase64(file);
        
        const formData = new FormData();
        formData.append('key', IMGBB_API_KEY);
        formData.append('image', base64.split(',')[1]);
        
        const response = await fetch('https://api.imgbb.com/1/upload', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            const photoURL = result.data.url;
            
            await window.currentUser.updateProfile({ photoURL: photoURL });
            await db.ref(`users/${window.currentUser.uid}/avatar`).set(photoURL);
            
            const avatarImg = document.getElementById('profileAvatar');
            if (avatarImg) avatarImg.src = photoURL;
            
            window.currentUser.photoURL = photoURL;
            
            showProfileToast('✅ Аватарка успешно обновлена!');
        } else {
            throw new Error(result.error?.message || 'Ошибка загрузки');
        }
        
    } catch (error) {
        console.error("Ошибка загрузки аватарки:", error);
        alert('Ошибка при загрузке: ' + error.message);
    }
}

// Инициализация загрузки аватарки
function initAvatarUpload() {
    const avatarInput = document.getElementById('avatarUpload');
    if (!avatarInput) return;
    
    avatarInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        await uploadAvatarToImgBB(file);
        avatarInput.value = '';
    });
}

// Проверка авторизации
function checkAuthAndLoadProfile() {
    if (!window.currentUser) {
        profileContainer.innerHTML = `
            <div class="profile-not-logged">
                <i class="fas fa-lock"></i>
                <h2>Доступ ограничен</h2>
                <p>Чтобы просматривать личный кабинет, войдите в аккаунт.</p>
                <button onclick="window.location.href='index.html'" class="profile-btn">
                    <i class="fas fa-sign-in-alt"></i> Перейти к входу
                </button>
            </div>
        `;
        return;
    }
    loadProfileData();
}

// Загрузка данных профиля
async function loadProfileData() {
    const user = window.currentUser;
    const userComments = await loadUserComments(user.uid);
    const userRatings = await loadUserRatings(user.uid);
    const userFavorites = await loadUserFavorites(user.uid);
    renderProfile(user, userComments, userRatings, userFavorites);
}

// Загрузить комментарии пользователя
async function loadUserComments(userId) {
    try {
        const snapshot = await db.ref('comments')
            .orderByChild('userId')
            .equalTo(userId)
            .once('value');
        
        const comments = [];
        snapshot.forEach((child) => {
            comments.push({
                id: child.key,
                ...child.val()
            });
        });
        
        comments.sort((a, b) => new Date(b.date) - new Date(a.date));
        return comments;
    } catch (error) {
        console.error("Ошибка загрузки комментариев:", error);
        return [];
    }
}

// Загрузить оценки пользователя
async function loadUserRatings(userId) {
    try {
        const snapshot = await db.ref(`ratings/${userId}`).once('value');
        return snapshot.val() || {};
    } catch (error) {
        console.error("Ошибка загрузки оценок:", error);
        return {};
    }
}

// Загрузить избранное пользователя
async function loadUserFavorites(userId) {
    try {
        const snapshot = await db.ref(`favorites/${userId}`).once('value');
        const favorites = snapshot.val() || {};
        return Object.keys(favorites).filter(key => favorites[key] === true);
    } catch (error) {
        console.error("Ошибка загрузки избранного:", error);
        return [];
    }
}

// Отобразить профиль
function renderProfile(user, comments, ratings, favorites) {
    // Если у пользователя есть загруженная аватарка — используем её
    let avatarUrl = user.photoURL;
    if (!avatarUrl) {
        avatarUrl = getGeneratedAvatarUrl(user);
    }
    
    const html = `
        <div class="profile-header">
            <div class="profile-avatar">
                <img src="${avatarUrl}" alt="avatar" id="profileAvatar">
                <label for="avatarUpload" class="change-avatar-btn">
                    <i class="fas fa-camera"></i>
                </label>
                <input type="file" id="avatarUpload" accept="image/jpeg,image/png,image/gif" style="display: none;">
            </div>
            <div class="profile-info">
                <h1 id="profileName">${escapeHtml(user.displayName || user.email.split('@')[0])}</h1>
                <p><i class="fas fa-envelope"></i> ${escapeHtml(user.email)}</p>
                <p><i class="fas fa-calendar-alt"></i> На сайте с: ${new Date(user.metadata?.creationTime || Date.now()).toLocaleDateString('ru-RU')}</p>
            </div>
            <button onclick="logoutAndRedirect()" class="logout-profile-btn">
                <i class="fas fa-sign-out-alt"></i> Выйти
            </button>
        </div>
        
        <div class="profile-stats">
            <div class="stat-card">
                <i class="fas fa-comments"></i>
                <span class="stat-number">${comments.length}</span>
                <span class="stat-label">комментариев</span>
            </div>
            <div class="stat-card">
                <i class="fas fa-star"></i>
                <span class="stat-number">${Object.keys(ratings).length}</span>
                <span class="stat-label">оценок</span>
            </div>
            <div class="stat-card">
                <i class="fas fa-heart"></i>
                <span class="stat-number">${favorites.length}</span>
                <span class="stat-label">в избранном</span>
            </div>
        </div>
        
        <div class="profile-tabs">
            <button class="profile-tab active" onclick="showTab('comments')"><i class="fas fa-comments"></i> Мои комментарии</button>
            <button class="profile-tab" onclick="showTab('ratings')"><i class="fas fa-star"></i> Мои оценки</button>
            <button class="profile-tab" onclick="showTab('favorites')"><i class="fas fa-heart"></i> Избранное</button>
            <button class="profile-tab" onclick="showTab('settings')"><i class="fas fa-cog"></i> Настройки</button>
        </div>
        
        <div id="commentsTab" class="profile-tab-content active">
            ${renderCommentsList(comments)}
        </div>
        
        <div id="ratingsTab" class="profile-tab-content">
            ${renderRatingsList(ratings)}
        </div>
        
        <div id="favoritesTab" class="profile-tab-content">
            ${renderFavoritesList(favorites)}
        </div>
        
        <div id="settingsTab" class="profile-tab-content">
            ${renderSettingsTab(user)}
        </div>
    `;
    
    profileContainer.innerHTML = html;
    initAvatarUpload();
}

// Отобразить список комментариев
function renderCommentsList(comments) {
    if (comments.length === 0) {
        return '<div class="profile-empty"><i class="fas fa-comment-slash"></i> Вы ещё не оставили ни одного комментария</div>';
    }
    
    return `
        <div class="profile-comments-list">
            ${comments.map(comment => `
                <div class="profile-comment-item" data-comment-id="${comment.id}">
                    <div class="comment-header">
                        <span class="comment-series">${comment.season} сезон · ${comment.episode} серия</span>
                        <span class="comment-date">${new Date(comment.date).toLocaleString('ru-RU')}</span>
                    </div>
                    <div class="comment-text">${escapeHtml(comment.text)}</div>
                    <div class="comment-actions">
                        <a href="index.html?season=${comment.season}&episode=${comment.episode}" class="comment-link">
                            <i class="fas fa-eye"></i> Перейти к серии
                        </a>
                        ${comment.rating > 0 ? `<span class="comment-rating-badge"><i class="fas fa-star"></i> ${comment.rating}/5</span>` : ''}
                        <button onclick="deleteCommentFromProfile('${comment.id}')" class="delete-comment-btn" title="Удалить комментарий">
                            <i class="fas fa-trash-alt"></i> Удалить
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Отобразить список оценок
function renderRatingsList(ratings) {
    const ratingsArray = Object.entries(ratings);
    
    if (ratingsArray.length === 0) {
        return '<div class="profile-empty"><i class="fas fa-star-half-alt"></i> Вы ещё не оценили ни одной серии</div>';
    }
    
    return `
        <div class="profile-ratings-list">
            ${ratingsArray.map(([key, value]) => {
                const [season, episode] = key.split('_');
                return `
                    <div class="profile-rating-item">
                        <div class="rating-info">
                            <span class="rating-series">${season} сезон · ${episode} серия</span>
                            <div class="rating-stars">
                                ${renderStars(value)}
                            </div>
                        </div>
                        <a href="index.html?season=${season}&episode=${episode}" class="rating-link">
                            <i class="fas fa-eye"></i> Перейти
                        </a>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

// Отобразить список избранного
function renderFavoritesList(favorites) {
    if (favorites.length === 0) {
        return '<div class="profile-empty"><i class="fas fa-heart-broken"></i> У вас пока нет избранных серий</div>';
    }
    
    return `
        <div class="profile-favorites-list">
            ${favorites.map(key => {
                const [season, episode] = key.split('_');
                return `
                    <div class="profile-favorite-item" data-key="${key}">
                        <div class="favorite-info">
                            <i class="fas fa-heart favorite-icon"></i>
                            <span class="favorite-series">${season} сезон · ${episode} серия</span>
                        </div>
                        <div class="favorite-actions">
                            <a href="index.html?season=${season}&episode=${episode}" class="favorite-link">
                                <i class="fas fa-play-circle"></i> Смотреть
                            </a>
                            <button onclick="removeFromFavorites('${key}')" class="remove-favorite-btn" title="Удалить из избранного">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

// Отобразить звёзды
function renderStars(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        stars += `<i class="fas fa-star ${i <= rating ? 'active' : ''}"></i>`;
    }
    return stars;
}

// Отобразить настройки
function renderSettingsTab(user) {
    const userColor = localStorage.getItem('avatarColor') || 'bd8a3e';
    
    return `
        <div class="profile-settings">
            <form id="profileSettingsForm" class="settings-form">
                <h3><i class="fas fa-user-edit"></i> Редактирование профиля</h3>
                
                <div class="form-group">
                    <label><i class="fas fa-user"></i> Имя пользователя</label>
                    <input type="text" id="settingsName" class="settings-input" value="${escapeHtml(user.displayName || '')}" placeholder="Ваше имя">
                </div>
                
                <div class="form-group">
                    <label><i class="fas fa-palette"></i> Цвет аватарки (если нет загруженного фото)</label>
                    <div class="avatar-colors">
                        <div class="color-option ${userColor === 'bd8a3e' ? 'active' : ''}" style="background: #bd8a3e;" onclick="setAvatarColor('bd8a3e')"></div>
                        <div class="color-option ${userColor === '4caf50' ? 'active' : ''}" style="background: #4caf50;" onclick="setAvatarColor('4caf50')"></div>
                        <div class="color-option ${userColor === '2196f3' ? 'active' : ''}" style="background: #2196f3;" onclick="setAvatarColor('2196f3')"></div>
                        <div class="color-option ${userColor === 'ff9800' ? 'active' : ''}" style="background: #ff9800;" onclick="setAvatarColor('ff9800')"></div>
                        <div class="color-option ${userColor === '9c27b0' ? 'active' : ''}" style="background: #9c27b0;" onclick="setAvatarColor('9c27b0')"></div>
                        <div class="color-option ${userColor === 'f44336' ? 'active' : ''}" style="background: #f44336;" onclick="setAvatarColor('f44336')"></div>
                    </div>
                </div>
                
                <div class="form-group">
                    <label><i class="fas fa-envelope"></i> Email</label>
                    <input type="email" class="settings-input" value="${escapeHtml(user.email)}" readonly disabled>
                </div>
                
                <div class="form-divider"></div>
                
                <h3><i class="fas fa-lock"></i> Смена пароля</h3>
                
                <div class="form-group">
                    <label><i class="fas fa-key"></i> Новый пароль</label>
                    <input type="password" id="settingsNewPassword" class="settings-input" placeholder="Введите новый пароль">
                </div>
                
                <div class="form-group">
                    <label><i class="fas fa-check-circle"></i> Подтверждение пароля</label>
                    <input type="password" id="settingsConfirmPassword" class="settings-input" placeholder="Повторите пароль">
                </div>
                
                <div class="settings-buttons">
                    <button type="button" onclick="saveProfileSettings()" class="settings-save-btn">
                        <i class="fas fa-save"></i> Сохранить изменения
                    </button>
                    <button type="button" onclick="showTab('comments')" class="settings-cancel-btn">
                        <i class="fas fa-times"></i> Отмена
                    </button>
                </div>
                
                <div id="settingsMessage" class="settings-message"></div>
            </form>
            
            <div class="danger-zone">
                <h3><i class="fas fa-exclamation-triangle"></i> Опасная зона</h3>
                <p>Удаление аккаунта — необратимое действие. Все ваши комментарии и данные будут удалены.</p>
                <button onclick="deleteAccount()" class="danger-btn">
                    <i class="fas fa-trash-alt"></i> Удалить аккаунт
                </button>
            </div>
        </div>
    `;
}

// Переключение вкладок
function showTab(tabName) {
    document.querySelectorAll('.profile-tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.profile-tab').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const activeTab = document.getElementById(`${tabName}Tab`);
    if (activeTab) activeTab.classList.add('active');
    
    const buttons = document.querySelectorAll('.profile-tab');
    const tabMap = { comments: 0, ratings: 1, favorites: 2, settings: 3 };
    if (buttons[tabMap[tabName]]) {
        buttons[tabMap[tabName]].classList.add('active');
    }
}

// Удалить комментарий
async function deleteCommentFromProfile(commentId) {
    if (!window.currentUser) return;
    if (!confirm('Удалить комментарий?')) return;
    
    try {
        await db.ref(`comments/${commentId}`).remove();
        const commentItem = document.querySelector(`.profile-comment-item[data-comment-id="${commentId}"]`);
        if (commentItem) commentItem.remove();
        
        const remainingComments = document.querySelectorAll('.profile-comment-item');
        if (remainingComments.length === 0) {
            document.getElementById('commentsTab').innerHTML = '<div class="profile-empty"><i class="fas fa-comment-slash"></i> Вы ещё не оставили ни одного комментария</div>';
        }
        
        document.querySelector('.stat-card:first-child .stat-number').textContent = remainingComments.length;
        showProfileToast('✅ Комментарий удалён');
    } catch (error) {
        alert('Ошибка удаления');
    }
}

// Удалить из избранного
async function removeFromFavorites(key) {
    if (!window.currentUser) return;
    if (!confirm('Удалить серию из избранного?')) return;
    
    try {
        await db.ref(`favorites/${window.currentUser.uid}/${key}`).remove();
        const item = document.querySelector(`.profile-favorite-item[data-key="${key}"]`);
        if (item) item.remove();
        
        const remainingItems = document.querySelectorAll('.profile-favorite-item');
        if (remainingItems.length === 0) {
            document.getElementById('favoritesTab').innerHTML = '<div class="profile-empty"><i class="fas fa-heart-broken"></i> У вас пока нет избранных серий</div>';
        }
        
        document.querySelector('.stat-card:last-child .stat-number').textContent = remainingItems.length;
        showProfileToast('✅ Серия удалена из избранного');
    } catch (error) {
        alert('Ошибка удаления');
    }
}

// Сохранить настройки
async function saveProfileSettings() {
    const newName = document.getElementById('settingsName')?.value.trim();
    const newPassword = document.getElementById('settingsNewPassword')?.value;
    const confirmPassword = document.getElementById('settingsConfirmPassword')?.value;
    
    if (!newName) {
        showSettingsMessage('Имя не может быть пустым', 'error');
        return;
    }
    
    try {
        await window.currentUser.updateProfile({ displayName: newName });
        await db.ref(`users/${window.currentUser.uid}/name`).set(newName);
        
        if (newPassword) {
            if (newPassword.length < 6) {
                showSettingsMessage('Пароль должен быть не менее 6 символов', 'error');
                return;
            }
            if (newPassword !== confirmPassword) {
                showSettingsMessage('Пароли не совпадают', 'error');
                return;
            }
            await window.currentUser.updatePassword(newPassword);
            showSettingsMessage('Пароль изменён!', 'success');
        }
        
        document.getElementById('profileName').textContent = newName;
        showSettingsMessage('Профиль обновлён!', 'success');
        
        // Обновляем аватарку если нет загруженного фото
        if (!window.currentUser.photoURL) {
            const avatarImg = document.getElementById('profileAvatar');
            if (avatarImg) avatarImg.src = getGeneratedAvatarUrl(window.currentUser);
        }
        
        document.getElementById('settingsNewPassword').value = '';
        document.getElementById('settingsConfirmPassword').value = '';
        
    } catch (error) {
        showSettingsMessage('Ошибка: ' + error.message, 'error');
    }
}

// Установить цвет аватарки
function setAvatarColor(color) {
    localStorage.setItem('avatarColor', color);
    if (!window.currentUser.photoURL) {
        const avatarImg = document.getElementById('profileAvatar');
        if (avatarImg) avatarImg.src = getGeneratedAvatarUrl(window.currentUser);
    }
    showProfileToast(`🎨 Цвет аватарки изменён`);
}

function showSettingsMessage(text, type) {
    const messageDiv = document.getElementById('settingsMessage');
    if (messageDiv) {
        messageDiv.textContent = text;
        messageDiv.className = `settings-message ${type}`;
        setTimeout(() => {
            messageDiv.textContent = '';
            messageDiv.className = 'settings-message';
        }, 3000);
    }
}

function showProfileToast(message) {
    let toast = document.getElementById('profileToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'profileToast';
        toast.className = 'profile-toast';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
}

// Удаление аккаунта
async function deleteAccount() {
    if (!confirm('Удалить аккаунт? Это необратимо!')) return;
    const password = prompt('Введите пароль для подтверждения:');
    if (!password) return;
    
    try {
        const credential = firebase.auth.EmailAuthProvider.credential(window.currentUser.email, password);
        await window.currentUser.reauthenticateWithCredential(credential);
        
        await db.ref(`users/${window.currentUser.uid}`).remove();
        await db.ref(`ratings/${window.currentUser.uid}`).remove();
        await db.ref(`favorites/${window.currentUser.uid}`).remove();
        
        const commentsSnapshot = await db.ref('comments').orderByChild('userId').equalTo(window.currentUser.uid).once('value');
        const updates = {};
        commentsSnapshot.forEach(child => { updates[`comments/${child.key}`] = null; });
        await db.ref().update(updates);
        
        await window.currentUser.delete();
        alert('Аккаунт удалён');
        window.location.href = 'index.html';
    } catch (error) {
        alert('Ошибка: ' + error.message);
    }
}

async function logoutAndRedirect() {
    await auth.signOut();
    window.location.href = 'index.html';
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, (m) => m === '&' ? '&amp;' : m === '<' ? '&lt;' : '&gt;');
}