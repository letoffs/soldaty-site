let heroesData = [];
let filteredHeroesData = [];
let currentHero = null;
let isAdmin = false;
let adminClicks = 0;
let adminClickTimer = null;
let editingHeroId = null;
let draggedHeroId = null;
let dragScrollInterval = null;
let dragOverTimeout = null;
let selectedAdminId = null;
const SCROLL_SPEED = 25;
const SCROLL_ZONE = 60;

function getHeroUrl(heroId) {
    const baseUrl = window.location.href.split('?')[0].split('#')[0];
    return baseUrl + '?hero=' + heroId;
}

function loadHeroFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const heroId = params.get('hero');
    if (heroId) {
        const hero = heroesData.find(h => h.id == heroId);
        if (hero) {
            openHeroPage(hero.id);
            history.pushState({ hero: heroId }, '', getHeroUrl(heroId));
        }
    }
}

function updateUrlWithHero(heroId) {
    const url = getHeroUrl(heroId);
    history.pushState({ hero: heroId }, '', url);
}

function clearHeroFromUrl() {
    const baseUrl = window.location.href.split('?')[0];
    history.pushState({}, '', baseUrl);
}

function checkAdminStatus() {
    const user = firebase.auth().currentUser;
    if (user && user.email === 'twinkjjjjkmnb@gmail.com') {
        isAdmin = true;
        return true;
    }
    return false;
}

function loadHeroesFromFirebase() {
    const grid = document.getElementById('heroesGrid');
    if (!grid) {
        console.error("❌ Элемент heroesGrid не найден!");
        return;
    }

    grid.innerHTML = `
        <div style="text-align: center; padding: 40px; grid-column: 1/-1;">
            <i class="fas fa-spinner fa-spin" style="font-size: 3rem; color: #bd8a3e;"></i>
            <p style="color: #ccc; margin-top: 15px;">Загрузка персонажей...</p>
        </div>
    `;

    const heroesRef = firebase.database().ref('heroes');
    
    heroesRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (!data) {
            grid.innerHTML = `
                <div style="text-align: center; padding: 40px; grid-column: 1/-1;">
                    <p style="color: #ccc;">Нет данных о персонажах</p>
                </div>
            `;
            updateHeroesCount(0);
            return;
        }

        heroesData = Object.values(data);
        heroesData.sort((a, b) => (a.order || 0) - (b.order || 0));
        renderHeroes();
        loadHeroFromUrl();
        console.log(`✅ Загружено ${heroesData.length} персонажей из Firebase`);
    }, (error) => {
        console.error('Ошибка загрузки:', error);
        grid.innerHTML = `
            <div style="text-align: center; padding: 40px; grid-column: 1/-1;">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #ff6b6b;"></i>
                <p style="color: #ccc; margin-top: 15px;">Ошибка загрузки данных</p>
            </div>
        `;
        updateHeroesCount(0);
    });
}

function renderHeroes() {
    const grid = document.getElementById('heroesGrid');
    if (!grid) {
        console.error("❌ Элемент heroesGrid не найден!");
        return;
    }
    
    if (!heroesData || !heroesData.length) {
        grid.innerHTML = '<div class="info-message">📭 Нет данных о персонажах.</div>';
        updateHeroesCount(0);
        return;
    }
    
    heroesData.sort((a, b) => (a.order || 0) - (b.order || 0));
    
    const searchQuery = document.getElementById('heroesSearchInput')?.value?.toLowerCase().trim() || '';
    
    if (searchQuery) {
        filteredHeroesData = heroesData.filter(hero => {
            const name = hero.name.toLowerCase();
            const actor = hero.actor.toLowerCase();
            const zvanie = (hero.zvanie || '').toLowerCase();
            const description = (hero.description || '').toLowerCase();
            const positions = (hero.positions || []).join(' ').toLowerCase();
            const status = (hero.status || '').toLowerCase();
            return name.includes(searchQuery) || 
                   actor.includes(searchQuery) || 
                   zvanie.includes(searchQuery) ||
                   description.includes(searchQuery) ||
                   positions.includes(searchQuery) ||
                   status.includes(searchQuery);
        });
    } else {
        filteredHeroesData = [...heroesData];
    }
    
    if (!filteredHeroesData.length) {
        grid.innerHTML = `
            <div class="heroes-no-results">
                <i class="fas fa-search"></i>
                <p>Ничего не найдено по запросу "${escapeHtml(searchQuery)}"</p>
            </div>
        `;
        updateHeroesCount(0);
        return;
    }
    
    grid.innerHTML = filteredHeroesData.map(hero => {
        const positions = (hero.positions || []).slice(0, 3).join(', ');
        const statusClass = hero.status === 'Гражданский' ? 'civilian' : 'military';
        const statusDisplay = hero.status && hero.status !== 'Неизвестно' ? hero.status : 'Военный';
        const hasZvanie = hero.zvanie && hero.zvanie.trim() !== '' && hero.zvanie !== 'Неизвестно';
        
        return `
        <div class="hero-card" onclick="openHeroPage(${hero.id})">
            <div class="hero-image">
                <img src="${escapeHtml(hero.imageUrl)}" alt="${escapeHtml(hero.name)}" onerror="this.style.display='none'">
                <div class="hero-overlay">
                    <i class="fas fa-search-plus"></i>
                    <span>Подробнее</span>
                </div>
            </div>
            <div class="hero-info">
                <h2 class="hero-name">${escapeHtml(hero.name)}</h2>
                <div class="hero-actor">${escapeHtml(hero.actor)}</div>
                ${hasZvanie ? `<div class="hero-role">${escapeHtml(hero.zvanie)}</div>` : ''}
                ${positions ? `<div class="hero-positions">${escapeHtml(positions)}</div>` : ''}
                <div class="hero-status">
                    <span class="status-badge ${statusClass}">
                        ${escapeHtml(statusDisplay)}
                    </span>
                </div>
                <p class="hero-description">${escapeHtml(hero.description)}</p>
            </div>
        </div>
    `}).join('');
    
    updateHeroesCount(filteredHeroesData.length);
}

function filterHeroes() {
    const input = document.getElementById('heroesSearchInput');
    const clearBtn = document.querySelector('.heroes-search-clear');
    
    if (input) {
        if (input.value.length > 0) {
            clearBtn.style.display = 'block';
        } else {
            clearBtn.style.display = 'none';
        }
    }
    
    renderHeroes();
}

function clearHeroesSearch() {
    const input = document.getElementById('heroesSearchInput');
    const clearBtn = document.querySelector('.heroes-search-clear');
    
    if (input) {
        input.value = '';
        clearBtn.style.display = 'none';
        renderHeroes();
    }
}

function updateHeroesCount(count) {
    const countElement = document.getElementById('heroesCountNumber');
    if (countElement) {
        countElement.textContent = count;
    }
}

function openHeroPage(heroId) {
    const hero = heroesData.find(h => h.id === heroId);
    if (!hero) {
        console.error(`❌ Персонаж с id ${heroId} не найден`);
        return;
    }
    
    document.getElementById('heroesGrid').style.display = 'none';
    document.getElementById('heroPage').style.display = 'block';
    document.getElementById('heroPageContent').innerHTML = renderHeroPageContent(hero);
    
    updateUrlWithHero(heroId);
    
    document.querySelector('.container').scrollIntoView({ behavior: 'smooth' });
    
    document.title = `Солдаты — ${hero.name}`;
}

function renderHeroPageContent(hero) {
    const hasZvanie = hero.zvanie && hero.zvanie.trim() !== '' && hero.zvanie !== 'Неизвестно';
    const statusDisplay = hero.status && hero.status !== 'Неизвестно' ? hero.status : 'Военный';
    const statusClass = hero.status === 'Гражданский' ? 'civilian' : 'military';
    
    const adminEditBtn = isAdmin ? `
        <button onclick="openAdminPanel(); selectHeroForEdit(${hero.id});" class="hero-page-edit-btn">
            <i class="fas fa-edit"></i> Редактировать персонажа
        </button>
    ` : '';

    const shareBtn = `
        <button onclick="copyHeroLink(${hero.id})" class="hero-page-share-btn" title="Скопировать ссылку на персонажа">
            <i class="fas fa-link"></i>
        </button>
    `;
    
    let bioContent = hero.bio || 'Нет биографии';
    if (bioContent.includes('\n') && !bioContent.includes('<')) {
        bioContent = bioContent.replace(/\n/g, '<br>');
    }
    if (!bioContent.includes('<')) {
        bioContent = '<p>' + bioContent + '</p>';
    }
    
    return `
        <div class="hero-page-header">
            <div class="hero-page-image">
                <img src="${escapeHtml(hero.imageUrl)}" alt="${escapeHtml(hero.name)}" onerror="this.style.display='none'">
            </div>
            <div class="hero-page-title">
                <h1>${escapeHtml(hero.name)}</h1>
                <div class="hero-page-actor">${escapeHtml(hero.actor)}</div>
                ${hasZvanie ? `<div class="hero-page-role">${escapeHtml(hero.zvanie)}</div>` : ''}
                <div style="margin-top: 10px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                    <span class="status-badge ${statusClass}">${escapeHtml(statusDisplay)}</span>
                    ${shareBtn}
                </div>
                ${adminEditBtn}
            </div>
        </div>
        
        <div class="hero-page-tabs">
            <button class="hero-page-tab active" onclick="switchHeroPageTab('bio')">Биография</button>
            <button class="hero-page-tab" onclick="switchHeroPageTab('details')">Детали</button>
            <button class="hero-page-tab" onclick="switchHeroPageTab('gallery')">Фото</button>
        </div>
        
        <div id="heroPageTabBio" class="hero-page-tab-content active">
            <h3><i class="fas fa-book-open"></i> Полная биография</h3>
            <div class="bio-text">${bioContent}</div>
        </div>
        
        <div id="heroPageTabDetails" class="hero-page-tab-content">
            <h3><i class="fas fa-list-ul"></i> Подробная информация</h3>
            ${renderDetailsTab(hero)}
        </div>

        <div id="heroPageTabGallery" class="hero-page-tab-content">
            <h3><i class="fas fa-images"></i> Фотогалерея</h3>
            ${renderGalleryTab(hero)}
        </div>
    `;
}

function copyHeroLink(heroId) {
    const url = getHeroUrl(heroId);
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url)
            .then(() => {
                showToast('✅ Ссылка скопирована в буфер обмена!');
            })
            .catch(() => {
                fallbackCopy(url);
            });
    } else {
        fallbackCopy(url);
    }
}

function fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
        document.execCommand('copy');
        showToast('✅ Ссылка скопирована в буфер обмена!');
    } catch (err) {
        showToast('❌ Не удалось скопировать ссылку');
    }
    document.body.removeChild(textarea);
}

function switchHeroPageTab(tabName) {
    const bioTab = document.getElementById('heroPageTabBio');
    const detailsTab = document.getElementById('heroPageTabDetails');
    const galleryTab = document.getElementById('heroPageTabGallery');
    const tabs = document.querySelectorAll('.hero-page-tab');
    
    if (bioTab) bioTab.classList.remove('active');
    if (detailsTab) detailsTab.classList.remove('active');
    if (galleryTab) galleryTab.classList.remove('active');
    tabs.forEach(tab => tab.classList.remove('active'));
    
    if (tabName === 'bio' && bioTab) {
        bioTab.classList.add('active');
        if (tabs[0]) tabs[0].classList.add('active');
    } else if (tabName === 'details' && detailsTab) {
        detailsTab.classList.add('active');
        if (tabs[1]) tabs[1].classList.add('active');
    } else if (tabName === 'gallery' && galleryTab) {
        galleryTab.classList.add('active');
        if (tabs[2]) tabs[2].classList.add('active');
    }
}

function closeHeroPage() {
    document.getElementById('heroesGrid').style.display = 'grid';
    document.getElementById('heroPage').style.display = 'none';
    clearHeroFromUrl();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.title = 'Солдаты — Персонажи';
}

function renderGalleryTab(hero) {
    if (!hero.gallery || hero.gallery.length === 0) {
        return '<div class="no-details">📭 Фотографии для этого персонажа пока не добавлены.</div>';
    }

    let html = '<div class="gallery-grid">';
    for (const photo of hero.gallery) {
        html += `
            <div class="gallery-item" onclick="openPhotoModal('${escapeHtml(photo.url)}', '${escapeHtml(photo.caption)}')">
                <img src="${escapeHtml(photo.url)}" alt="${escapeHtml(photo.caption)}" loading="lazy">
                <div class="gallery-caption">${escapeHtml(photo.caption)}</div>
            </div>
        `;
    }
    html += '</div>';
    
    html += `
        <div id="photoModal" class="photo-modal">
            <span class="photo-modal-close" onclick="closePhotoModal()">&times;</span>
            <img class="photo-modal-content" id="modalPhoto">
            <div id="modalCaption" class="photo-modal-caption"></div>
        </div>
    `;
    return html;
}

function openPhotoModal(imgUrl, caption) {
    const modal = document.getElementById('photoModal');
    const modalImg = document.getElementById('modalPhoto');
    const captionText = document.getElementById('modalCaption');
    
    if (modal && modalImg) {
        modal.style.display = "flex";
        modalImg.src = imgUrl;
        captionText.innerHTML = caption;
    }
}

function closePhotoModal() {
    const modal = document.getElementById('photoModal');
    if (modal) {
        modal.style.display = "none";
    }
}

function findHeroIdByName(name) {
    if (!name) return null;
    let cleanName = name.split(' —')[0].split(' -')[0].split(' (')[0].trim();
    
    const hero = heroesData.find(h => 
        h.name.toLowerCase().includes(cleanName.toLowerCase()) ||
        cleanName.toLowerCase().includes(h.name.toLowerCase())
    );
    
    return hero ? hero.id : null;
}

function renderDetailsTab(hero) {
    if (!hero.details) {
        return '<div class="no-details">📭 Дополнительная информация отсутствует.</div>';
    }
    
    const d = hero.details;
    let html = '<div class="details-grid">';
    
    if (d.fullName) {
        html += `
            <div class="detail-item full-width">
                <div class="detail-label"><i class="fas fa-user"></i> Полное имя</div>
                <div class="detail-value">${escapeHtml(d.fullName)}</div>
            </div>
        `;
    }
    
    if (d.age) {
        html += `
            <div class="detail-item">
                <div class="detail-label"><i class="fas fa-calendar-alt"></i> Возраст</div>
                <div class="detail-value">${escapeHtml(d.age)}</div>
            </div>
        `;
    }
    
    if (d.nicknames && d.nicknames.length) {
        html += `
            <div class="detail-item full-width">
                <div class="detail-label"><i class="fas fa-tag"></i> Прозвища</div>
                <div class="detail-value nicknames-list">
                    ${d.nicknames.map(n => `<span class="nickname-tag">${escapeHtml(n.trim())}</span>`).join('')}
                </div>
            </div>
        `;
    }
    
    if (d.ranks && d.ranks.length) {
        html += `
            <div class="detail-item full-width">
                <div class="detail-label"><i class="fas fa-star"></i> Звания</div>
                <div class="detail-value">
                    <ul class="detail-list">
                        ${d.ranks.map(r => `<li>${escapeHtml(r.trim())}</li>`).join('')}
                    </ul>
                </div>
            </div>
        `;
    }
    
    if (d.positions && d.positions.length) {
        html += `
            <div class="detail-item full-width">
                <div class="detail-label"><i class="fas fa-briefcase"></i> Должности</div>
                <div class="detail-value">
                    <ul class="detail-list">
                        ${d.positions.map(p => `<li>${escapeHtml(p.trim())}</li>`).join('')}
                    </ul>
                </div>
            </div>
        `;
    }
    
    if (d.appearance || d.disappearance) {
        html += `
            <div class="detail-item">
                <div class="detail-label"><i class="fas fa-video"></i> Появление</div>
                <div class="detail-value">${escapeHtml((d.appearance || '—').trim())}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label"><i class="fas fa-sign-out-alt"></i> Исчезновение</div>
                <div class="detail-value">${escapeHtml((d.disappearance || '—').trim())}</div>
            </div>
        `;
    }
    
    if (d.quotes && d.quotes.length) {
        html += `
            <div class="detail-item full-width">
                <div class="detail-label"><i class="fas fa-quote-right"></i> Цитаты</div>
                <div class="detail-value">
                    <ul class="detail-list quotes-list">
                        ${d.quotes.map(q => {
                            let quote = q.trim();
                            quote = quote.replace(/\s+/g, ' ');
                            return `<li class="quote-item">${escapeHtml(quote)}</li>`;
                        }).join('')}
                    </ul>
                </div>
            </div>
        `;
    }
    
    if (d.facts && d.facts.length) {
        html += `
            <div class="detail-item full-width">
                <div class="detail-label"><i class="fas fa-lightbulb"></i> Интересные факты</div>
                <div class="detail-value">
                    <ul class="detail-list facts-list">
                        ${d.facts.map(f => `<li class="fact-item">${escapeHtml(f.trim())}</li>`).join('')}
                    </ul>
                </div>
            </div>
        `;
    }
    
    if (d.family && d.family.length) {
        html += `
            <div class="detail-item full-width">
                <div class="detail-label"><i class="fas fa-users"></i> Семья</div>
                <div class="detail-value">
                    <div class="relations-list">
                        ${d.family.map(f => {
                            const targetId = findHeroIdByName(f.name);
                            if (targetId) {
                                return `
                                    <div class="relation-person" onclick="openHeroPage(${targetId})">
                                        <span class="relation-role">${escapeHtml(f.relation.trim())}:</span>
                                        <span class="relation-name-clickable">${escapeHtml(f.name.trim())}</span>
                                        <i class="fas fa-external-link-alt"></i>
                                    </div>
                                `;
                            } else {
                                return `
                                    <div class="relation-person">
                                        <span class="relation-role">${escapeHtml(f.relation.trim())}:</span>
                                        <span class="relation-name">${escapeHtml(f.name.trim())}</span>
                                    </div>
                                `;
                            }
                        }).join('')}
                    </div>
                </div>
            </div>
        `;
    }
    
    if (d.friends && d.friends.length) {
        html += `
            <div class="detail-item full-width">
                <div class="detail-label"><i class="fas fa-handshake"></i> Друзья</div>
                <div class="detail-value">
                    <div class="relations-list">
                        ${d.friends.map(f => {
                            const friendName = f.trim();
                            const targetId = findHeroIdByName(friendName);
                            if (targetId) {
                                return `
                                    <div class="relation-person friend" onclick="openHeroPage(${targetId})">
                                        <span>${escapeHtml(friendName)}</span>
                                        <i class="fas fa-external-link-alt"></i>
                                    </div>
                                `;
                            } else {
                                return `<div class="relation-person friend">${escapeHtml(friendName)}</div>`;
                            }
                        }).join('')}
                    </div>
                </div>
            </div>
        `;
    }
    
    if (d.enemies && d.enemies.length) {
        html += `
            <div class="detail-item full-width">
                <div class="detail-label"><i class="fas fa-fist-raised"></i> Враги</div>
                <div class="detail-value">
                    <div class="relations-list">
                        ${d.enemies.map(e => {
                            const enemyName = e.trim();
                            const targetId = findHeroIdByName(enemyName);
                            if (targetId) {
                                return `
                                    <div class="relation-person enemy" onclick="openHeroPage(${targetId})">
                                        <span>${escapeHtml(enemyName)}</span>
                                        <i class="fas fa-external-link-alt"></i>
                                    </div>
                                `;
                            } else {
                                return `<div class="relation-person enemy">${escapeHtml(enemyName)}</div>`;
                            }
                        }).join('')}
                    </div>
                </div>
            </div>
        `;
    }
    
    html += '</div>';
    return html;
}

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/\n/g, '<br>');
}

document.addEventListener('click', function(e) {
    const modal = document.getElementById('photoModal');
    if (modal && e.target === modal) {
        closePhotoModal();
    }
});

function initSecretAdminBtn() {
    const btn = document.getElementById('secretAdminBtn');
    if (!btn) return;
    
    btn.addEventListener('click', function(e) {
        adminClicks++;
        clearTimeout(adminClickTimer);
        
        if (adminClicks >= 3) {
            adminClicks = 0;
            openAdminPanel();
        } else {
            adminClickTimer = setTimeout(() => {
                adminClicks = 0;
            }, 2000);
        }
    });
}

function openAdminPanel() {
    if (!isAdmin) {
        showToast('⛔ Доступ только для администратора');
        return;
    }
    
    const panel = document.getElementById('adminPanel');
    if (panel) {
        panel.style.display = 'block';
        document.body.style.overflow = 'hidden';
        renderAdminHeroesList();
        selectedAdminId = null;
    }
}

function hideAdminPanel() {
    const panel = document.getElementById('adminPanel');
    if (panel) {
        panel.style.display = 'none';
        document.body.style.overflow = '';
        resetHeroForm();
        selectedAdminId = null;
    }
}

function switchAdminTab(tabName) {
    const tabs = document.querySelectorAll('.admin-tab');
    const contents = document.querySelectorAll('.admin-tab-content');
    
    tabs.forEach(tab => tab.classList.remove('active'));
    contents.forEach(content => content.classList.remove('active'));
    
    const tabMap = {
        'main': 0,
        'details': 1,
        'gallery': 2,
        'list': 3
    };
    
    if (tabs[tabMap[tabName]]) {
        tabs[tabMap[tabName]].classList.add('active');
    }
    
    const contentMap = {
        'main': 'adminTabMain',
        'details': 'adminTabDetails',
        'gallery': 'adminTabGallery',
        'list': 'adminTabList'
    };
    
    const content = document.getElementById(contentMap[tabName]);
    if (content) {
        content.classList.add('active');
    }
    
    if (tabName === 'details') {
        loadHeroDetails();
    }
    if (tabName === 'gallery') {
        renderAdminGallery();
    }
    if (tabName === 'list') {
        renderAdminHeroesList();
        selectedAdminId = null;
    }
}

function renderAdminHeroesList() {
    const container = document.getElementById('adminHeroesList');
    if (!container) return;
    
    if (!heroesData || !heroesData.length) {
        container.innerHTML = '<div class="loading-spinner">📭 Нет персонажей</div>';
        return;
    }
    
    heroesData.sort((a, b) => (a.order || 0) - (b.order || 0));
    
    const searchQuery = document.getElementById('adminHeroSearch')?.value?.toLowerCase() || '';
    
    const filtered = heroesData.filter(hero => {
        if (!searchQuery) return true;
        return hero.name.toLowerCase().includes(searchQuery) ||
               hero.actor.toLowerCase().includes(searchQuery);
    });
    
    container.innerHTML = filtered.map((hero) => `
        <div class="admin-hero-item" data-id="${hero.id}" draggable="true" tabindex="0"
             ondragstart="onDragStart(event, '${hero.id}')" 
             ondragover="onDragOver(event, '${hero.id}')"
             ondragend="onDragEnd(event)"
             ondrop="onDrop(event, '${hero.id}')"
             onclick="selectAdminItem(${hero.id})">
            <div class="hero-info">
                <span class="drag-handle"><i class="fas fa-grip-vertical"></i></span>
                <img src="${escapeHtml(hero.imageUrl || '/Resources/default.jpg')}" alt="" class="hero-avatar" 
                     onerror="this.src='/Resources/default.jpg'">
                <div>
                    <div class="hero-name-admin">${escapeHtml(hero.name)}</div>
                    <div class="hero-actor-admin">${escapeHtml(hero.actor)}</div>
                </div>
            </div>
            <div class="hero-actions">
                <button class="edit-hero-btn" onclick="event.stopPropagation(); selectHeroForEdit(${hero.id})" title="Редактировать">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="delete-hero-btn" onclick="event.stopPropagation(); deleteHeroFromAdmin(${hero.id})" title="Удалить">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function selectAdminItem(heroId) {
    document.querySelectorAll('.admin-hero-item').forEach(el => {
        el.classList.remove('selected-keyboard');
    });
    
    const target = document.querySelector(`.admin-hero-item[data-id="${heroId}"]`);
    if (target) {
        target.classList.add('selected-keyboard');
        selectedAdminId = heroId;
        target.focus();
    }
}

function moveHeroUp() {
    if (!selectedAdminId) {
        const first = document.querySelector('.admin-hero-item');
        if (first) {
            selectAdminItem(parseInt(first.dataset.id));
        }
        return;
    }
    
    const currentIndex = heroesData.findIndex(h => h.id == selectedAdminId);
    if (currentIndex <= 0) return;
    
    const prev = heroesData[currentIndex - 1];
    swapHeroes(selectedAdminId, prev.id);
}

function moveHeroDown() {
    if (!selectedAdminId) {
        const first = document.querySelector('.admin-hero-item');
        if (first) {
            selectAdminItem(parseInt(first.dataset.id));
        }
        return;
    }
    
    const currentIndex = heroesData.findIndex(h => h.id == selectedAdminId);
    if (currentIndex === -1 || currentIndex >= heroesData.length - 1) return;
    
    const next = heroesData[currentIndex + 1];
    swapHeroes(selectedAdminId, next.id);
}

function swapHeroes(fromId, toId) {
    if (fromId === toId) return;
    
    const fromIndex = heroesData.findIndex(h => h.id == fromId);
    const toIndex = heroesData.findIndex(h => h.id == toId);
    
    if (fromIndex === -1 || toIndex === -1) return;
    
    const item = heroesData[fromIndex];
    heroesData.splice(fromIndex, 1);
    heroesData.splice(toIndex, 0, item);
    
    heroesData.forEach((hero, i) => {
        hero.order = i;
    });
    
    reorderHeroes();
    
    setTimeout(() => {
        selectAdminItem(fromId);
    }, 100);
}

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closePhotoModal();
        return;
    }
    
    const adminPanel = document.getElementById('adminPanel');
    if (!adminPanel || adminPanel.style.display !== 'block') return;
    
    const listTab = document.getElementById('adminTabList');
    if (!listTab || !listTab.classList.contains('active')) return;
    
    const activeElement = document.activeElement;
    const isInList = activeElement?.closest?.('.admin-hero-item') || 
                     activeElement?.id === 'adminHeroSearch' ||
                     activeElement?.tagName === 'BODY' ||
                     activeElement?.tagName === 'DIV' && activeElement?.className?.includes('admin-sort-list');
    
    if (!isInList) return;
    
    if (e.key === 'ArrowUp') {
        e.preventDefault();
        moveHeroUp();
    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        moveHeroDown();
    } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (selectedAdminId) {
            selectHeroForEdit(selectedAdminId);
        }
    }
});

function onDragStart(e, heroId) {
    draggedHeroId = heroId;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', heroId);
    
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'grabbing';
    
    const el = e.target.closest('.admin-hero-item');
    if (el) {
        el.style.willChange = 'transform, opacity';
        el.style.transition = 'none';
        requestAnimationFrame(() => {
            el.classList.add('dragging');
        });
    }
}

function onDragOver(e, heroId) {
    e.preventDefault();
    
    const targetItem = e.target.closest('.admin-hero-item');
    if (!targetItem) return;
    
    const items = document.querySelectorAll('.admin-hero-item');
    items.forEach(item => {
        if (item !== targetItem) {
            item.classList.remove('drag-over');
        }
    });
    
    targetItem.classList.add('drag-over');
    
    clearTimeout(dragOverTimeout);
    dragOverTimeout = setTimeout(() => {
        const mouseY = e.clientY;
        const windowHeight = window.innerHeight;
        const scrollY = window.scrollY;
        const maxScroll = document.documentElement.scrollHeight - windowHeight;
        
        clearInterval(dragScrollInterval);
        
        if (mouseY < SCROLL_ZONE && scrollY > 0) {
            dragScrollInterval = setInterval(() => {
                window.scrollBy(0, -SCROLL_SPEED);
            }, 20);
        } else if (mouseY > windowHeight - SCROLL_ZONE && scrollY < maxScroll) {
            dragScrollInterval = setInterval(() => {
                window.scrollBy(0, SCROLL_SPEED);
            }, 20);
        } else {
            clearInterval(dragScrollInterval);
            dragScrollInterval = null;
        }
    }, 10);
}

function onDragEnd(e) {
    const el = e.target.closest('.admin-hero-item');
    if (el) {
        el.classList.remove('dragging');
        el.style.willChange = '';
        el.style.transition = '';
    }
    
    const items = document.querySelectorAll('.admin-hero-item');
    items.forEach(item => item.classList.remove('drag-over'));
    
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
    
    clearTimeout(dragOverTimeout);
    clearInterval(dragScrollInterval);
    dragScrollInterval = null;
    draggedHeroId = null;
}

function onDrop(e, heroId) {
    e.preventDefault();
    
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
    
    clearTimeout(dragOverTimeout);
    clearInterval(dragScrollInterval);
    dragScrollInterval = null;
    
    if (!draggedHeroId || draggedHeroId === heroId) {
        onDragEnd(e);
        return;
    }
    
    const fromIndex = heroesData.findIndex(h => h.id == draggedHeroId);
    const toIndex = heroesData.findIndex(h => h.id == heroId);
    
    if (fromIndex === -1 || toIndex === -1) {
        onDragEnd(e);
        return;
    }
    
    const item = heroesData[fromIndex];
    heroesData.splice(fromIndex, 1);
    heroesData.splice(toIndex, 0, item);
    
    heroesData.forEach((hero, i) => {
        hero.order = i;
    });
    
    reorderHeroes();
    
    const allItems = document.querySelectorAll('.admin-hero-item');
    allItems.forEach(item => item.classList.remove('drag-over'));
    draggedHeroId = null;
}

function reorderHeroes() {
    const heroesRef = firebase.database().ref('heroes');
    const updates = {};
    
    heroesData.forEach((hero) => {
        updates[hero.id + '/order'] = hero.order;
    });
    
    heroesRef.update(updates)
        .then(() => {
            renderAdminHeroesList();
            renderHeroes();
            showToast('✅ Порядок персонажей обновлён');
        })
        .catch(error => {
            console.error('Ошибка сохранения порядка:', error);
            showToast('❌ Ошибка сохранения порядка');
        });
}

function filterAdminHeroes() {
    renderAdminHeroesList();
}

function selectHeroForEdit(heroId) {
    const hero = heroesData.find(h => h.id === heroId);
    if (!hero) {
        showToast('❌ Персонаж не найден');
        return;
    }
    
    editingHeroId = hero.id;
    
    document.getElementById('adminHeroId').value = hero.id;
    document.getElementById('adminHeroName').value = hero.name;
    document.getElementById('adminHeroActor').value = hero.actor;
    document.getElementById('adminHeroZvanie').value = hero.zvanie || '';
    document.getElementById('adminHeroDescription').value = hero.description || '';
    document.getElementById('adminHeroBio').value = hero.bio || '';
    document.getElementById('adminHeroImage').value = hero.imageUrl || '';
    document.getElementById('adminHeroPositions').value = (hero.positions || []).join(', ');
    document.getElementById('adminHeroStatus').value = hero.status || 'Военный';
    
    switchAdminTab('main');
    showToast('✅ Персонаж загружен для редактирования');
}

function resetHeroForm() {
    editingHeroId = null;
    document.getElementById('adminHeroId').value = '';
    document.getElementById('adminHeroName').value = '';
    document.getElementById('adminHeroActor').value = '';
    document.getElementById('adminHeroZvanie').value = '';
    document.getElementById('adminHeroDescription').value = '';
    document.getElementById('adminHeroBio').value = '';
    document.getElementById('adminHeroImage').value = '';
    document.getElementById('adminHeroImageFile').value = '';
    document.getElementById('adminHeroPositions').value = '';
    document.getElementById('adminHeroStatus').value = 'Военный';
    document.getElementById('adminFormMessage').style.display = 'none';
}

function saveHero() {
    const name = document.getElementById('adminHeroName').value.trim();
    const actor = document.getElementById('adminHeroActor').value.trim();
    const zvanie = document.getElementById('adminHeroZvanie').value.trim();
    const description = document.getElementById('adminHeroDescription').value.trim();
    let bio = document.getElementById('adminHeroBio').value.trim();
    const imageUrl = document.getElementById('adminHeroImage').value.trim();
    const id = parseInt(document.getElementById('adminHeroId').value) || null;
    const positionsRaw = document.getElementById('adminHeroPositions').value.trim();
    const status = document.getElementById('adminHeroStatus').value;
    
    const messageEl = document.getElementById('adminFormMessage');
    
    if (!name || !actor) {
        showAdminMessage('⚠️ Имя и актёр обязательны!', 'error');
        return;
    }
    
    if (bio) {
        bio = bio.replace(/\n/g, '<br>');
        if (!bio.includes('<')) {
            bio = '<p>' + bio + '</p>';
        }
    } else {
        bio = '<p>Нет биографии</p>';
    }
    
    let heroId = id;
    if (!heroId || heroId === 0) {
        heroId = heroesData.length > 0 ? Math.max(...heroesData.map(h => h.id)) + 1 : 1;
    }
    
    if (id && heroesData.some(h => h.id === id && h.id !== editingHeroId)) {
        showAdminMessage('⚠️ Персонаж с таким ID уже существует!', 'error');
        return;
    }
    
    const positions = positionsRaw ? positionsRaw.split(',').map(p => p.trim()).filter(p => p) : [];
    
    const existingHero = heroesData.find(h => h.id === heroId);
    const existingDetails = existingHero?.details || {};
    const existingGallery = existingHero?.gallery || [];
    const order = existingHero ? existingHero.order : heroesData.length;
    
    const hero = {
        id: heroId,
        name,
        actor,
        zvanie: zvanie || '',
        description: description || 'Нет описания',
        bio: bio,
        imageUrl: imageUrl || '/Resources/default.jpg',
        order: order,
        positions: positions,
        status: status,
        details: existingDetails,
        gallery: existingGallery
    };
    
    const heroesRef = firebase.database().ref('heroes');
    heroesRef.child(heroId.toString()).set(hero)
        .then(() => {
            showAdminMessage('✅ Персонаж сохранён!', 'success');
            resetHeroForm();
            setTimeout(() => {
                heroesData.sort((a, b) => (a.order || 0) - (b.order || 0));
                renderAdminHeroesList();
                renderHeroes();
            }, 500);
        })
        .catch(error => {
            console.error('Ошибка сохранения:', error);
            showAdminMessage('❌ Ошибка: ' + error.message, 'error');
        });
}

function deleteHeroFromAdmin(heroId) {
    const hero = heroesData.find(h => h.id === heroId);
    if (!hero) return;
    
    if (!confirm(`Удалить персонажа "${hero.name}"?`)) return;
    
    const heroesRef = firebase.database().ref('heroes');
    heroesRef.child(heroId.toString()).remove()
        .then(() => {
            showToast(`🗑️ Персонаж "${hero.name}" удалён`);
            heroesData.sort((a, b) => (a.order || 0) - (b.order || 0));
            renderAdminHeroesList();
            renderHeroes();
        })
        .catch(error => {
            console.error('Ошибка удаления:', error);
            showToast('❌ Ошибка удаления');
        });
}

function loadHeroDetails() {
    const heroId = parseInt(document.getElementById('adminHeroId').value);
    if (!heroId) {
        showAdminDetailsMessage('⚠️ Сначала выберите или создайте персонажа', 'error');
        return;
    }
    
    const hero = heroesData.find(h => h.id === heroId);
    if (!hero) {
        showAdminDetailsMessage('⚠️ Персонаж не найден', 'error');
        return;
    }
    
    const d = hero.details || {};
    
    document.getElementById('adminDetailsFullName').value = d.fullName || '';
    document.getElementById('adminDetailsAge').value = d.age || '';
    document.getElementById('adminDetailsAppearance').value = d.appearance || '';
    document.getElementById('adminDetailsDisappearance').value = d.disappearance || '';
    document.getElementById('adminDetailsNicknames').value = (d.nicknames || []).join(', ');
    document.getElementById('adminDetailsRanks').value = (d.ranks || []).join('\n');
    document.getElementById('adminDetailsPositions').value = (d.positions || []).join('\n');
    document.getElementById('adminDetailsQuotes').value = (d.quotes || []).join('\n');
    document.getElementById('adminDetailsFacts').value = (d.facts || []).join('\n');
    renderFriendsEnemiesInputs(d.friends || [], d.enemies || []);
    
    showAdminDetailsMessage('✅ Детали загружены', 'success');
}

function renderFriendsEnemiesInputs(friends, enemies) {
    const friendsContainer = document.getElementById('adminFriendsContainer');
    const enemiesContainer = document.getElementById('adminEnemiesContainer');
    
    if (!friendsContainer || !enemiesContainer) return;
    
    friendsContainer.innerHTML = '';
    enemiesContainer.innerHTML = '';
    
    if (friends && friends.length) {
        friends.forEach((name) => {
            const div = document.createElement('div');
            div.className = 'admin-relation-item';
            div.innerHTML = `
                <input type="text" class="admin-relation-input friend-input" value="${escapeHtml(name.trim())}" 
                       placeholder="Введите имя друга...">
                <button class="admin-relation-remove" onclick="this.closest('.admin-relation-item').remove()">
                    <i class="fas fa-times"></i>
                </button>
            `;
            friendsContainer.appendChild(div);
        });
    }
    
    if (enemies && enemies.length) {
        enemies.forEach((name) => {
            const div = document.createElement('div');
            div.className = 'admin-relation-item';
            div.innerHTML = `
                <input type="text" class="admin-relation-input enemy-input" value="${escapeHtml(name.trim())}" 
                       placeholder="Введите имя врага...">
                <button class="admin-relation-remove" onclick="this.closest('.admin-relation-item').remove()">
                    <i class="fas fa-times"></i>
                </button>
            `;
            enemiesContainer.appendChild(div);
        });
    }
}

function addRelation(type) {
    const containerId = type === 'friend' ? 'adminFriendsContainer' : 'adminEnemiesContainer';
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const div = document.createElement('div');
    div.className = 'admin-relation-item';
    div.innerHTML = `
        <input type="text" class="admin-relation-input ${type}-input" placeholder="Введите имя..." 
               data-type="${type}">
        <button class="admin-relation-remove" onclick="this.closest('.admin-relation-item').remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    container.appendChild(div);
    div.querySelector('input').focus();
}

function getRelationsFromInputs(type) {
    const containerId = type === 'friend' ? 'adminFriendsContainer' : 'adminEnemiesContainer';
    const container = document.getElementById(containerId);
    if (!container) return [];
    
    const inputs = container.querySelectorAll('.admin-relation-input');
    const values = [];
    inputs.forEach(input => {
        const val = input.value.trim();
        if (val) values.push(val);
    });
    return values;
}

function saveHeroDetails() {
    const heroId = parseInt(document.getElementById('adminHeroId').value);
    if (!heroId) {
        showAdminDetailsMessage('⚠️ Сначала сохраните персонажа на вкладке "Основное"', 'error');
        return;
    }
    
    const hero = heroesData.find(h => h.id === heroId);
    if (!hero) {
        showAdminDetailsMessage('⚠️ Персонаж не найден', 'error');
        return;
    }
    
    const fullName = document.getElementById('adminDetailsFullName').value.trim();
    const age = document.getElementById('adminDetailsAge').value.trim();
    const appearance = document.getElementById('adminDetailsAppearance').value.trim();
    const disappearance = document.getElementById('adminDetailsDisappearance').value.trim();
    const nicknamesRaw = document.getElementById('adminDetailsNicknames').value.trim();
    const ranksRaw = document.getElementById('adminDetailsRanks').value.trim();
    const positionsRaw = document.getElementById('adminDetailsPositions').value.trim();
    const quotesRaw = document.getElementById('adminDetailsQuotes').value.trim();
    const factsRaw = document.getElementById('adminDetailsFacts').value.trim();
    const friends = getRelationsFromInputs('friend');
    const enemies = getRelationsFromInputs('enemy');
    
    const nicknames = nicknamesRaw ? nicknamesRaw.split(',').map(s => s.trim()).filter(s => s) : [];
    const ranks = ranksRaw ? ranksRaw.split('\n').map(s => s.trim()).filter(s => s) : [];
    const positions = positionsRaw ? positionsRaw.split('\n').map(s => s.trim()).filter(s => s) : [];
    const quotes = quotesRaw ? quotesRaw.split('\n').map(s => s.trim()).filter(s => s) : [];
    const facts = factsRaw ? factsRaw.split('\n').map(s => s.trim()).filter(s => s) : [];
    
    const details = {
        fullName: fullName || undefined,
        age: age || undefined,
        appearance: appearance || undefined,
        disappearance: disappearance || undefined,
        nicknames: nicknames,
        ranks: ranks,
        positions: positions,
        quotes: quotes,
        facts: facts,
        friends: friends,
        enemies: enemies
    };
    
    Object.keys(details).forEach(key => {
        if (details[key] === undefined || details[key] === null || 
            (Array.isArray(details[key]) && details[key].length === 0)) {
            delete details[key];
        }
    });
    
    const heroesRef = firebase.database().ref('heroes');
    heroesRef.child(heroId.toString() + '/details').set(details)
        .then(() => {
            showAdminDetailsMessage('✅ Детали сохранены!', 'success');
            heroesData = heroesData.map(h => {
                if (h.id === heroId) {
                    h.details = details;
                }
                return h;
            });
        })
        .catch(error => {
            console.error('Ошибка сохранения деталей:', error);
            showAdminDetailsMessage('❌ Ошибка: ' + error.message, 'error');
        });
}

function showAdminDetailsMessage(text, type) {
    const el = document.getElementById('adminDetailsMessage');
    if (!el) return;
    el.textContent = text;
    el.className = 'admin-form-message ' + type;
    el.style.display = 'block';
    setTimeout(() => {
        el.style.display = 'none';
    }, 5000);
}

function renderAdminGallery() {
    const container = document.getElementById('adminGalleryList');
    if (!container) return;
    
    const heroId = parseInt(document.getElementById('adminHeroId').value);
    if (!heroId) {
        container.innerHTML = '<div class="loading-spinner">⚠️ Сначала выберите персонажа</div>';
        return;
    }
    
    const hero = heroesData.find(h => h.id === heroId);
    if (!hero) {
        container.innerHTML = '<div class="loading-spinner">⚠️ Персонаж не найден</div>';
        return;
    }
    
    const gallery = hero.gallery || [];
    
    if (!gallery.length) {
        container.innerHTML = '<div class="loading-spinner">📭 Нет фотографий</div>';
        return;
    }
    
    container.innerHTML = gallery.map((photo, index) => `
        <div class="admin-gallery-item">
            <img src="${escapeHtml(photo.url)}" alt="${escapeHtml(photo.caption || 'Фото')}" 
                 onerror="this.style.display='none'">
            <div class="gallery-actions">
                <button class="delete-photo-btn" onclick="deleteGalleryPhoto(${heroId}, ${index})" title="Удалить">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            ${photo.caption ? `<div class="gallery-caption">${escapeHtml(photo.caption)}</div>` : ''}
        </div>
    `).join('');
}

function addGalleryPhoto() {
    const heroId = parseInt(document.getElementById('adminHeroId').value);
    if (!heroId) {
        showAdminGalleryMessage('⚠️ Сначала сохраните персонажа на вкладке "Основное"', 'error');
        return;
    }
    
    const hero = heroesData.find(h => h.id === heroId);
    if (!hero) {
        showAdminGalleryMessage('⚠️ Персонаж не найден', 'error');
        return;
    }
    
    const url = document.getElementById('adminGalleryUrl').value.trim();
    const caption = document.getElementById('adminGalleryCaption').value.trim();
    const fileInput = document.getElementById('adminGalleryFile');
    
    if (!url && !fileInput.files.length) {
        showAdminGalleryMessage('⚠️ Укажите URL или выберите файл', 'error');
        return;
    }
    
    if (fileInput.files.length) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const photo = {
                url: e.target.result,
                caption: caption || 'Фото'
            };
            saveGalleryPhoto(heroId, photo);
        };
        reader.readAsDataURL(fileInput.files[0]);
    } else {
        const photo = {
            url: url,
            caption: caption || 'Фото'
        };
        saveGalleryPhoto(heroId, photo);
    }
}

function saveGalleryPhoto(heroId, photo) {
    const hero = heroesData.find(h => h.id === heroId);
    if (!hero) return;
    
    const gallery = hero.gallery || [];
    gallery.push(photo);
    
    const heroesRef = firebase.database().ref('heroes');
    heroesRef.child(heroId.toString() + '/gallery').set(gallery)
        .then(() => {
            showAdminGalleryMessage('✅ Фото добавлено!', 'success');
            hero.gallery = gallery;
            renderAdminGallery();
            clearGalleryForm();
        })
        .catch(error => {
            console.error('Ошибка добавления фото:', error);
            showAdminGalleryMessage('❌ Ошибка: ' + error.message, 'error');
        });
}

function deleteGalleryPhoto(heroId, index) {
    if (!confirm('Удалить это фото?')) return;
    
    const hero = heroesData.find(h => h.id === heroId);
    if (!hero) return;
    
    const gallery = hero.gallery || [];
    gallery.splice(index, 1);
    
    const heroesRef = firebase.database().ref('heroes');
    heroesRef.child(heroId.toString() + '/gallery').set(gallery)
        .then(() => {
            showAdminGalleryMessage('✅ Фото удалено!', 'success');
            hero.gallery = gallery;
            renderAdminGallery();
        })
        .catch(error => {
            console.error('Ошибка удаления фото:', error);
            showAdminGalleryMessage('❌ Ошибка: ' + error.message, 'error');
        });
}

function clearGalleryForm() {
    document.getElementById('adminGalleryUrl').value = '';
    document.getElementById('adminGalleryCaption').value = '';
    document.getElementById('adminGalleryFile').value = '';
}

function showAdminGalleryMessage(text, type) {
    const el = document.getElementById('adminGalleryMessage');
    if (!el) return;
    el.textContent = text;
    el.className = 'admin-form-message ' + type;
    el.style.display = 'block';
    setTimeout(() => {
        el.style.display = 'none';
    }, 5000);
}

function showAdminMessage(text, type) {
    const el = document.getElementById('adminFormMessage');
    if (!el) return;
    el.textContent = text;
    el.className = 'admin-form-message ' + type;
    el.style.display = 'block';
    setTimeout(() => {
        el.style.display = 'none';
    }, 5000);
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
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

document.addEventListener('DOMContentLoaded', function() {
    firebase.auth().onAuthStateChanged((user) => {
        checkAdminStatus();
        if (typeof firebase !== 'undefined') {
            loadHeroesFromFirebase();
        } else {
            console.error('❌ Firebase не инициализирован!');
        }
    });
    
    initSecretAdminBtn();
    
    window.addEventListener('popstate', function(event) {
        if (event.state && event.state.hero) {
            const hero = heroesData.find(h => h.id == event.state.hero);
            if (hero) {
                openHeroPage(hero.id);
            }
        } else {
            closeHeroPage();
        }
    });
    
    console.log("✅ heroes.js загружен");
});
