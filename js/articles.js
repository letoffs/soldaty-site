// ========== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ==========
let allArticles = [];
let currentArticleId = null;
let currentArticleData = null;
let isOpeningFromUrl = false;

// ========== ФУНКЦИИ ШАРИНГА ==========
function getCurrentArticleUrl() {
    return window.location.href;
}

function shareVk() {
    const url = getCurrentArticleUrl();
    const title = currentArticleData?.title || 'Статья';
    window.open(`https://vk.com/share.php?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`, '_blank', 'width=600,height=400');
}

function shareTelegram() {
    const url = getCurrentArticleUrl();
    const title = currentArticleData?.title || 'Статья';
    window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`, '_blank', 'width=600,height=400');
}

function shareOk() {
    const url = getCurrentArticleUrl();
    const title = currentArticleData?.title || 'Статья';
    window.open(`https://connect.ok.ru/dk?st.cmd=WidgetSharePreview&st.shareUrl=${encodeURIComponent(url)}&st.comments=${encodeURIComponent(title)}`, '_blank', 'width=600,height=400');
}

function shareWhatsapp() {
    const url = getCurrentArticleUrl();
    const title = currentArticleData?.title || 'Статья';
    window.open(`https://wa.me/?text=${encodeURIComponent(title + ' ' + url)}`, '_blank', 'width=600,height=400');
}

function shareViber() {
    const url = getCurrentArticleUrl();
    const title = currentArticleData?.title || 'Статья';
    window.open(`viber://forward?text=${encodeURIComponent(title + ' ' + url)}`);
}

async function copyLink(btnElement) {
    const url = getCurrentArticleUrl();
    try {
        await navigator.clipboard.writeText(url);
        const originalIcon = btnElement.innerHTML;
        btnElement.innerHTML = '<i class="fas fa-check"></i>';
        btnElement.classList.add('copied');
        setTimeout(() => {
            btnElement.innerHTML = originalIcon;
            btnElement.classList.remove('copied');
        }, 2000);
    } catch (err) {
        showToast('❌ Не удалось скопировать ссылку');
    }
}

// ========== ЛАЙКИ (только для авторизованных) ==========
async function likeArticle(articleId, btnElement) {
    if (!window.currentUser) {
        showToast('🔒 Войдите, чтобы ставить лайки');
        if (typeof showAuthModal === 'function') showAuthModal();
        return;
    }
    
    const likeRef = db.ref(`articles/${articleId}/likes/${window.currentUser.uid}`);
    const snapshot = await likeRef.once('value');
    const isLiked = snapshot.val() === true;
    
    if (isLiked) {
        await likeRef.remove();
        showToast('👍 Лайк убран');
        
        if (typeof logEvent === 'function') {
            logEvent('article_unlike', { 
                articleId: articleId, 
                title: currentArticleData?.title 
            });
        }
    } else {
        await likeRef.set(true);
        showToast('❤️ Спасибо за лайк!');
        
        if (typeof logEvent === 'function') {
            logEvent('article_like', { 
                articleId: articleId, 
                title: currentArticleData?.title 
            });
        }
    }
    
    await updateLikeCount(articleId);
    
    if (btnElement) {
        const likeCount = await getLikeCount(articleId);
        const userLiked = !isLiked;
        if (userLiked) {
            btnElement.classList.add('liked');
            btnElement.innerHTML = '<i class="fas fa-heart"></i> <span class="like-count">' + likeCount + '</span>';
        } else {
            btnElement.classList.remove('liked');
            btnElement.innerHTML = '<i class="far fa-heart"></i> <span class="like-count">' + likeCount + '</span>';
        }
    }
}

async function getLikeCount(articleId) {
    const snapshot = await db.ref(`articles/${articleId}/likeCount`).once('value');
    return snapshot.val() || 0;
}

async function updateLikeCount(articleId) {
    const snapshot = await db.ref(`articles/${articleId}/likes`).once('value');
    const likes = snapshot.val() || {};
    const likeCount = Object.keys(likes).length;
    await db.ref(`articles/${articleId}/likeCount`).set(likeCount);
    
    const likeCountSpan = document.getElementById('likeCount');
    const likeCountDisplay = document.getElementById('likeCountDisplay');
    if (likeCountSpan) likeCountSpan.textContent = likeCount;
    if (likeCountDisplay) likeCountDisplay.textContent = likeCount;
}

// ========== ПРОВЕРКА URL ПАРАМЕТРА ==========
function checkUrlForArticle() {
    const urlParams = new URLSearchParams(window.location.search);
    const articleId = urlParams.get('id');
    
    if (articleId && articleId !== currentArticleId && !isOpeningFromUrl) {
        isOpeningFromUrl = true;
        setTimeout(() => {
            openArticle(articleId);
            setTimeout(() => {
                isOpeningFromUrl = false;
            }, 1000);
        }, 300);
    }
}

// ========== ЗАГРУЗКА СПИСКА СТАТЕЙ ==========
async function loadArticles() {
    const container = document.getElementById('articlesGrid');
    if (!container) return;
    
    container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-pulse"></i> Загрузка статей...</div>';
    
    try {
        const snapshot = await db.ref('articles').once('value');
        const articles = snapshot.val() || {};
        allArticles = Object.entries(articles).map(([id, data]) => ({ id, ...data }));
        displayArticles();
        
        setTimeout(() => {
            checkUrlForArticle();
        }, 100);
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        container.innerHTML = '<div class="empty-gallery"><i class="fas fa-exclamation-triangle"></i><p>Ошибка загрузки статей</p></div>';
    }
}

function displayArticles() {
    // Сортировка: сначала закреплённые, потом по дате публикации (новые сверху)
    const sortedArticles = [...allArticles].sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return (b.publishedAt || b.createdAt) - (a.publishedAt || a.createdAt);
    });
    
    const count = sortedArticles.length;
    const articlesCountElem = document.getElementById('articlesCount');
    if (articlesCountElem) {
        articlesCountElem.textContent = `${count} ${getDeclension(count, 'статья', 'статьи', 'статей')}`;
    }
    
    const container = document.getElementById('articlesGrid');
    if (!container) return;
    
    if (count === 0) {
        container.innerHTML = '<div class="empty-gallery"><i class="fas fa-newspaper"></i><p>Пока нет статей. Скоро появятся!</p></div>';
        return;
    }
    
    container.innerHTML = sortedArticles.map(article => {
        const publishDate = article.publishedAt || article.createdAt;
        const updateDate = article.updatedAt;
        let dateDisplay = new Date(publishDate).toLocaleString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        if (updateDate && updateDate > publishDate) {
            const updateDisplay = new Date(updateDate).toLocaleString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            dateDisplay += ` <span style="color: #8aa07a; font-size: 0.7rem;">(изменено: ${updateDisplay})</span>`;
        }

        const escapedTitle = escapeHtml(article.title);
        const escapedExcerpt = escapeHtml(article.excerpt || article.content.replace(/<[^>]*>/g, '').substring(0, 150));
        const articleId = article.id;
        const likeCount = article.likeCount || 0;
        const likeText = getDeclension(likeCount, 'лайк', 'лайка', 'лайков');
        const viewText = getDeclension(article.views || 0, 'просмотр', 'просмотра', 'просмотров');
        
        return `
            <div class="article-card" data-id="${article.id}">
                <div class="article-card-inner">
                    ${article.image ? `
                        <div class="article-card-image" data-id="${article.id}">
                            <img src="${article.image}" alt="${escapeHtml(article.title)}" onerror="this.style.display='none'">
                        </div>
                    ` : ''}
                    <div class="article-card-content">
                        <h3 data-id="${article.id}">${escapeHtml(article.title)}</h3>
                        <p>${escapeHtml(article.excerpt || article.content.replace(/<[^>]*>/g, '').substring(0, 150))}...</p>
                        <div class="article-meta">
                            <span><i class="far fa-calendar-alt"></i> ${dateDisplay}</span>
                            <span><i class="far fa-eye"></i> ${article.views || 0} ${viewText}</span>
                            <span><i class="far fa-heart"></i> ${likeCount} ${likeText}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    attachArticleClickHandlers();
}

function attachArticleClickHandlers() {
    document.querySelectorAll('.article-card').forEach(card => {
        card.removeEventListener('click', handleCardClick);
        card.addEventListener('click', handleCardClick);
    });
}

function handleCardClick(event) {
    event.stopPropagation();
    
    let articleId = this.getAttribute('data-id');
    
    if (!articleId) {
        const image = this.querySelector('.article-card-image');
        const title = this.querySelector('h3');
        articleId = image?.getAttribute('data-id') || title?.getAttribute('data-id');
    }
    
    if (articleId) {
        openArticle(articleId);
    }
}

// ========== ОТКРЫТИЕ СТАТЬИ ==========
async function openArticle(id) {
    if (!id) return;
    
    const detailView = document.getElementById('articleDetailView');
    if (currentArticleId === id && detailView && detailView.style.display === 'block') {
        return;
    }
    
    currentArticleId = id;
    
    const newUrl = `${window.location.pathname}?id=${id}`;
    window.history.pushState({ articleId: id }, '', newUrl);
    
    try {
        const articleFullContent = document.getElementById('articleFullContent');
        if (articleFullContent) {
            articleFullContent.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-pulse"></i> Загрузка статьи...</div>';
        }
        
        const snapshot = await db.ref(`articles/${id}`).once('value');
        currentArticleData = snapshot.val();
        
        if (!currentArticleData) {
            showToast('❌ Статья не найдена');
            return;
        }
        
        // Обновление просмотров (без transaction)
        try {
            const viewsRef = db.ref(`articles/${id}/views`);
            const viewsSnapshot = await viewsRef.once('value');
            const currentViews = viewsSnapshot.val() || 0;
            await viewsRef.set(currentViews + 1);
            console.log(`👁️ Просмотр статьи: ${currentViews + 1}`);
        } catch (error) {
            console.log("Просмотр не засчитан:", error.message);
        }
        
        // Логируем просмотр статьи в аналитику
        if (typeof logEvent === 'function') {
            logEvent('article_view', { 
                articleId: id, 
                title: currentArticleData.title 
            });
        }
        
        const publishDate = currentArticleData.publishedAt || currentArticleData.createdAt;
        const updateDate = currentArticleData.updatedAt;
        
        // Форматируем дату публикации
        let dateDisplay = new Date(publishDate).toLocaleString('ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // Если есть изменения и они отличаются от даты публикации
        if (updateDate && updateDate > publishDate) {
            const updateDisplay = new Date(updateDate).toLocaleString('ru-RU', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            dateDisplay += ` <span class="edited-date">(изменено: ${updateDisplay})</span>`;
        }
        
        const likeCount = currentArticleData.likeCount || 0;
        const likeText = getDeclension(likeCount, 'лайк', 'лайка', 'лайков');
        const viewsCount = (currentArticleData.views || 0) + 1;
        const viewText = getDeclension(viewsCount, 'просмотр', 'просмотра', 'просмотров');
        
        document.title = `${escapeHtml(currentArticleData.title)} | Солдаты`;
        
        const isAuthenticated = !!window.currentUser;
        
        let userLiked = false;
        if (isAuthenticated && currentArticleData.likes) {
            userLiked = currentArticleData.likes[window.currentUser.uid] === true;
        }
        
        const commentsDisabled = currentArticleData.commentsDisabled === true;
        
        if (articleFullContent) {
            articleFullContent.innerHTML = `
                <h1 class="article-full-title">${escapeHtml(currentArticleData.title)}</h1>
                <div class="article-full-meta">
                    <span><i class="far fa-calendar-alt"></i> ${dateDisplay}</span>
                    <span><i class="far fa-eye"></i> ${viewsCount} ${viewText}</span>
                    <span><i class="far fa-heart"></i> ${likeCount} ${likeText}</span>
                </div>
                ${currentArticleData.image ? `<img src="${currentArticleData.image}" alt="${escapeHtml(currentArticleData.title)}" class="article-full-image" onerror="this.style.display='none'">` : ''}
                <div class="article-full-text">
                    ${currentArticleData.content}
                </div>
                <div class="article-actions">
                    <button class="like-btn ${userLiked ? 'liked' : ''}" id="likeButton" onclick="likeArticle('${id}', this)" ${!isAuthenticated ? 'disabled style="opacity:0.6; cursor:not-allowed;"' : ''}>
                        <i class="${userLiked ? 'fas' : 'far'} fa-heart"></i>
                        <span class="like-count" id="likeCount">${likeCount}</span>
                    </button>
                    <div class="share-buttons">
                        <button class="share-btn vk" onclick="shareVk()" title="Поделиться ВКонтакте">
                            <i class="fab fa-vk"></i>
                        </button>
                        <button class="share-btn tg" onclick="shareTelegram()" title="Поделиться в Telegram">
                            <i class="fab fa-telegram-plane"></i>
                        </button>
                        <button class="share-btn ok" onclick="shareOk()" title="Поделиться в Одноклассниках">
                            <i class="fab fa-odnoklassniki"></i>
                        </button>
                        <button class="share-btn whatsapp" onclick="shareWhatsapp()" title="Поделиться в WhatsApp">
                            <i class="fab fa-whatsapp"></i>
                        </button>
                        <button class="share-btn viber" onclick="shareViber()" title="Поделиться в Viber">
                            <i class="fab fa-viber"></i>
                        </button>
                        <button class="share-btn copy" onclick="copyLink(this)" title="Копировать ссылку">
                            <i class="fas fa-link"></i>
                        </button>
                    </div>
                </div>
            `;
        }
        
        // Обработка комментариев
        const commentsSection = document.getElementById('commentsFullSection');
        if (commentsSection) {
            if (commentsDisabled) {
                commentsSection.style.display = 'block';
                commentsSection.innerHTML = `
                    <h3><i class="fas fa-comments"></i> Комментарии <span id="commentsFullCount">0</span></h3>
                    <div class="comment-empty">🔇 Комментарии к этой статье отключены автором</div>
                `;
            } else {
                commentsSection.style.display = 'block';
                commentsSection.innerHTML = `
                    <h3><i class="fas fa-comments"></i> Комментарии <span id="commentsFullCount">0</span></h3>
                    <div class="comment-form-article">
                        <textarea id="commentFullText" rows="3" placeholder="Поделитесь своим мнением..."></textarea>
                        <button onclick="submitFullComment()" class="submit-comment-btn"><i class="fas fa-paper-plane"></i> Оставить комментарий</button>
                    </div>
                    <div id="commentsFullList" class="comments-list">
                        <div class="comment-empty">💬 Нет комментариев. Будьте первым!</div>
                    </div>
                `;
                loadFullComments();
            }
        }
        
        const listView = document.getElementById('articlesListView');
        if (listView) listView.style.display = 'none';
        if (detailView) detailView.style.display = 'block';
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
    } catch (error) {
        console.error('Ошибка открытия статьи:', error);
        showToast('❌ Не удалось загрузить статью');
    }
}

function backToList() {
    document.title = 'Солдаты — Новости и статьи';
    
    const newUrl = window.location.pathname;
    window.history.pushState({}, '', newUrl);
    
    const listView = document.getElementById('articlesListView');
    const detailView = document.getElementById('articleDetailView');
    if (listView) listView.style.display = 'block';
    if (detailView) detailView.style.display = 'none';
    
    currentArticleId = null;
    currentArticleData = null;
    
    loadArticles();
}

// ========== КОММЕНТАРИИ (только для авторизованных) ==========
async function loadFullComments() {
    if (!currentArticleId) return;
    
    // Проверяем, отключены ли комментарии
    if (currentArticleData?.commentsDisabled) {
        const container = document.getElementById('commentsFullList');
        if (container) {
            container.innerHTML = '<div class="comment-empty">🔇 Комментарии к этой статье отключены</div>';
        }
        return;
    }
    
    try {
        const snapshot = await db.ref(`articles/${currentArticleId}/comments`).once('value');
        const comments = snapshot.val() || {};
        const commentsArray = Object.entries(comments).map(([id, data]) => ({ id, ...data })).reverse();
        
        const count = commentsArray.length;
        const commentText = getDeclension(count, 'комментарий', 'комментария', 'комментариев');
        const commentsCountElem = document.getElementById('commentsFullCount');
        if (commentsCountElem) commentsCountElem.textContent = `${count} ${commentText}`;
        
        const container = document.getElementById('commentsFullList');
        if (!container) return;
        
        if (count === 0) {
            container.innerHTML = '<div class="comment-empty">💬 Нет комментариев. Будьте первым!</div>';
            return;
        }
        
        container.innerHTML = commentsArray.map(comment => {
            const isAuthor = window.currentUser && comment.userId === window.currentUser.uid;
            return `
                <div class="comment-item">
                    <div class="comment-avatar">
                        ${comment.userAvatar ? `<img src="${comment.userAvatar}" alt="">` : '<div class="avatar-placeholder"><i class="fas fa-user"></i></div>'}
                    </div>
                    <div class="comment-content">
                        <div class="comment-author">${escapeHtml(comment.author)}</div>
                        <div class="comment-date">${new Date(comment.date).toLocaleDateString('ru-RU')} ${new Date(comment.date).toLocaleTimeString('ru-RU', {hour:'2-digit', minute:'2-digit'})}</div>
                        <div class="comment-text">${escapeHtml(comment.text)}</div>
                        ${isAuthor ? `<button class="delete-comment-btn" onclick="deleteComment('${comment.id}')"><i class="fas fa-trash-alt"></i> Удалить</button>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Ошибка загрузки комментариев:', error);
    }
}

async function submitFullComment() {
    if (!currentArticleId) return;
    
    // Проверяем, отключены ли комментарии
    if (currentArticleData?.commentsDisabled) {
        showToast('🔇 Комментарии к этой статье отключены');
        return;
    }
    
    if (!window.currentUser) {
        showToast('🔒 Только зарегистрированные пользователи могут оставлять комментарии');
        if (typeof showAuthModal === 'function') showAuthModal();
        return;
    }
    
    const text = document.getElementById('commentFullText');
    if (!text) return;
    
    const textValue = text.value.trim();
    
    if (!textValue) {
        showToast('❌ Введите текст комментария');
        return;
    }
    
    const userName = window.currentUser.displayName || window.currentUser.email.split('@')[0];
    
    const commentData = {
        author: userName,
        text: textValue,
        date: Date.now(),
        articleId: currentArticleId,
        userId: window.currentUser.uid,
        userAvatar: window.currentUser.photoURL || ''
    };
    
    try {
        const newRef = db.ref(`articles/${currentArticleId}/comments`).push();
        await newRef.set(commentData);
        
        if (typeof logEvent === 'function') {
            logEvent('article_comment', { 
                articleId: currentArticleId, 
                title: currentArticleData?.title,
                commentLength: textValue.length 
            });
        }
        
        showToast('✅ Комментарий добавлен');
        text.value = '';
        loadFullComments();
    } catch (error) {
        console.error('Ошибка:', error);
        showToast('❌ Ошибка добавления комментария');
    }
}

async function deleteComment(commentId) {
    if (!window.currentUser) return;
    
    if (!confirm('Удалить комментарий?')) return;
    
    try {
        await db.ref(`articles/${currentArticleId}/comments/${commentId}`).remove();
        showToast('✅ Комментарий удалён');
        loadFullComments();
    } catch (error) {
        console.error('Ошибка:', error);
        showToast('❌ Ошибка удаления');
    }
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
function getDeclension(num, one, two, five) {
    let n = Math.abs(num) % 100;
    if (n >= 5 && n <= 20) return five;
    n %= 10;
    if (n === 1) return one;
    if (n >= 2 && n <= 4) return two;
    return five;
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => m === '&' ? '&amp;' : m === '<' ? '&lt;' : '&gt;');
}

function showToast(message) {
    let toast = document.getElementById('toastMessage');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toastMessage';
        toast.className = 'toast-message';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
}

// ========== ЗАКРЫТИЕ МОДАЛЬНЫХ ОКОН ==========
window.onclick = function(event) {
    const authModal = document.getElementById('authModal');
    if (event.target === authModal && typeof closeAuthModal === 'function') {
        closeAuthModal();
    }
};

// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', function() {
    loadArticles();
});

// ========== ОБРАБОТКА КНОПКИ НАЗАД В БРАУЗЕРЕ ==========
window.addEventListener('popstate', function(event) {
    const detailView = document.getElementById('articleDetailView');
    if (event.state === null && detailView && detailView.style.display === 'block') {
        backToList();
    }
});

// ========== ПАСХАЛКА ДЛЯ АДМИН-ПАНЕЛИ ==========
(function() {
    document.addEventListener('DOMContentLoaded', function() {
        const secretBtn = document.getElementById('secretVersion');
        if (secretBtn) {
            let clickCount = 0;
            let clickTimer = null;
            secretBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                clickCount++;
                if (clickTimer) clearTimeout(clickTimer);
                clickTimer = setTimeout(() => clickCount = 0, 1000);
                if (clickCount >= 3) {
                    clickCount = 0;
                    window.location.href = 'admin-articles.html';
                }
            });
            secretBtn.title = '⚡ Кликните 3 раза для доступа к админ-панели';
        }
    });
})();