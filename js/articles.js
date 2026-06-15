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

// ========== ПРОВЕРКА URL ПАРАМЕТРА ==========
function checkUrlForArticle() {
    const urlParams = new URLSearchParams(window.location.search);
    const articleId = urlParams.get('id');
    
    if (articleId && articleId !== currentArticleId && !isOpeningFromUrl) {
        isOpeningFromUrl = true;
        // Даем время на полную загрузку DOM и отрисовку списка
        setTimeout(() => {
            openArticle(articleId);
            // Сбрасываем флаг через некоторое время
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
        allArticles = Object.entries(articles).map(([id, data]) => ({ id, ...data })).reverse();
        displayArticles();
        
        // После отображения списка проверяем URL
        setTimeout(() => {
            checkUrlForArticle();
        }, 100);
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        container.innerHTML = '<div class="empty-gallery"><i class="fas fa-exclamation-triangle"></i><p>Ошибка загрузки статей</p></div>';
    }
}

function displayArticles() {
    const count = allArticles.length;
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
    
    container.innerHTML = allArticles.map(article => {
        const date = new Date(article.createdAt).toLocaleDateString('ru-RU');
        const escapedTitle = escapeHtml(article.title);
        const escapedExcerpt = escapeHtml(article.excerpt || article.content.replace(/<[^>]*>/g, '').substring(0, 150));
        const articleId = article.id;
        
        return `
            <div class="article-card" data-id="${articleId}">
                <div class="article-card-inner">
                    ${article.image ? `
                        <div class="article-card-image" data-id="${articleId}">
                            <img src="${article.image}" alt="${escapedTitle}" onerror="this.style.display='none'">
                        </div>
                    ` : ''}
                    <div class="article-card-content">
                        <h3 data-id="${articleId}">${escapedTitle}</h3>
                        <p>${escapedExcerpt}...</p>
                        <div class="article-meta">
                            <span><i class="far fa-calendar-alt"></i> ${date}</span>
                            <span><i class="far fa-eye"></i> ${article.views || 0} просмотров</span>
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
    
    // Если уже открыта эта же статья, не перезагружаем
    const detailView = document.getElementById('articleDetailView');
    if (currentArticleId === id && detailView && detailView.style.display === 'block') {
        return;
    }
    
    currentArticleId = id;
    
    // Обновляем URL без перезагрузки страницы
    const newUrl = `${window.location.pathname}?id=${id}`;
    window.history.pushState({ articleId: id }, '', newUrl);
    
    try {
        // Показываем загрузку
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
        
        // Увеличиваем счётчик просмотров
        await db.ref(`articles/${id}/views`).transaction(views => (views || 0) + 1);
        
        const date = new Date(currentArticleData.createdAt).toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' });
        
        // Обновляем заголовок страницы
        document.title = `${escapeHtml(currentArticleData.title)} | Солдаты`;
        
        // Показываем контент статьи
        if (articleFullContent) {
            articleFullContent.innerHTML = `
                <h1 class="article-full-title">${escapeHtml(currentArticleData.title)}</h1>
                <div class="article-full-meta">
                    <span><i class="far fa-calendar-alt"></i> ${date}</span>
                    <span><i class="far fa-eye"></i> ${(currentArticleData.views || 0) + 1} просмотров</span>
                </div>
                ${currentArticleData.image ? `<img src="${currentArticleData.image}" alt="${escapeHtml(currentArticleData.title)}" class="article-full-image" onerror="this.style.display='none'">` : ''}
                <div class="article-full-text">
                    ${currentArticleData.content}
                </div>
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
            `;
        }
        
        // Показываем блок комментариев и загружаем их
        const commentsSection = document.getElementById('commentsFullSection');
        if (commentsSection) {
            commentsSection.style.display = 'block';
        }
        loadFullComments();
        
        // Переключаем видимость
        const listView = document.getElementById('articlesListView');
        if (listView) listView.style.display = 'none';
        if (detailView) detailView.style.display = 'block';
        
        // Прокручиваем вверх
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
    } catch (error) {
        console.error('Ошибка открытия статьи:', error);
        showToast('❌ Не удалось загрузить статью');
    }
}

function backToList() {
    // Возвращаем заголовок страницы
    document.title = 'Солдаты — Новости и статьи';
    
    // Убираем параметр из URL
    const newUrl = window.location.pathname;
    window.history.pushState({}, '', newUrl);
    
    // Переключаем видимость
    const listView = document.getElementById('articlesListView');
    const detailView = document.getElementById('articleDetailView');
    if (listView) listView.style.display = 'block';
    if (detailView) detailView.style.display = 'none';
    
    // Очищаем данные текущей статьи
    currentArticleId = null;
    currentArticleData = null;
    
    // Обновляем список
    loadArticles();
}

// ========== КОММЕНТАРИИ К СТАТЬЕ ==========
async function loadFullComments() {
    if (!currentArticleId) return;
    
    try {
        const snapshot = await db.ref(`articles/${currentArticleId}/comments`).once('value');
        const comments = snapshot.val() || {};
        const commentsArray = Object.entries(comments).map(([id, data]) => ({ id, ...data })).reverse();
        
        const count = commentsArray.length;
        const commentsCountElem = document.getElementById('commentsFullCount');
        if (commentsCountElem) commentsCountElem.textContent = count;
        
        const container = document.getElementById('commentsFullList');
        if (!container) return;
        
        if (count === 0) {
            container.innerHTML = '<div class="comment-empty">💬 Нет комментариев. Будьте первым!</div>';
            return;
        }
        
        container.innerHTML = commentsArray.map(comment => `
            <div class="comment-item">
                <div class="comment-author">${escapeHtml(comment.author)}</div>
                <div class="comment-date">${new Date(comment.date).toLocaleDateString('ru-RU')}</div>
                <div class="comment-text">${escapeHtml(comment.text)}</div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Ошибка загрузки комментариев:', error);
    }
}

async function submitFullComment() {
    if (!currentArticleId) return;
    
    const author = document.getElementById('commentFullAuthor');
    const text = document.getElementById('commentFullText');
    
    if (!author || !text) return;
    
    const authorValue = author.value.trim();
    const textValue = text.value.trim();
    
    if (!authorValue) {
        showToast('❌ Введите ваше имя');
        return;
    }
    if (!textValue) {
        showToast('❌ Введите текст комментария');
        return;
    }
    
    const commentData = {
        author: authorValue,
        text: textValue,
        date: Date.now(),
        articleId: currentArticleId
    };
    
    try {
        const newRef = db.ref(`articles/${currentArticleId}/comments`).push();
        await newRef.set(commentData);
        showToast('✅ Комментарий добавлен');
        author.value = '';
        text.value = '';
        loadFullComments();
    } catch (error) {
        console.error('Ошибка:', error);
        showToast('❌ Ошибка добавления комментария');
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