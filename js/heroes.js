// ============================================
// heroes.js - Полная версия
// Отрисовка карточек, модальное окно с 2 вкладками
// ============================================

// Текущий открытый персонаж
let currentHero = null;

// ============================================
// ОСНОВНАЯ ФУНКЦИЯ ОТРИСОВКИ КАРТОЧЕК
// ============================================
function renderHeroes() {
    const grid = document.getElementById('heroesGrid');
    if (!grid) {
        console.error("❌ Элемент heroesGrid не найден!");
        return;
    }
    
    if (typeof heroesData === 'undefined') {
        grid.innerHTML = '<div class="error-message">❌ Ошибка: данные о персонажах не загружены.</div>';
        return;
    }
    
    if (!heroesData.length) {
        grid.innerHTML = '<div class="info-message">📭 Нет данных о персонажах.</div>';
        return;
    }
    
    grid.innerHTML = heroesData.map(hero => `
        <div class="hero-card" onclick="openHeroModal(${hero.id})">
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
                <div class="hero-role">${escapeHtml(hero.role)}</div>
                <p class="hero-description">${escapeHtml(hero.description)}</p>
            </div>
        </div>
    `).join('');
    
    console.log(`✅ Загружено ${heroesData.length} персонажей`);
}

// ============================================
// ОТКРЫТИЕ МОДАЛЬНОГО ОКНА
// ============================================
function openHeroModal(heroId) {
    const hero = heroesData.find(h => h.id === heroId);
    if (!hero) {
        console.error(`❌ Персонаж с id ${heroId} не найден`);
        return;
    }
    
    currentHero = hero;
    
    let modal = document.getElementById('heroModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'heroModal';
        modal.className = 'hero-modal';
        document.body.appendChild(modal);
    }
    
    modal.innerHTML = `
        <div class="hero-modal-content">
            <span class="hero-modal-close" onclick="closeHeroModal()">&times;</span>
            
            <div class="hero-modal-header">
                <div class="hero-modal-image">
                    <img src="${escapeHtml(hero.imageUrl)}" alt="${escapeHtml(hero.name)}" onerror="this.style.display='none'">
                </div>
                <div class="hero-modal-title">
                    <h1>${escapeHtml(hero.name)}</h1>
                    <div class="hero-modal-actor">${escapeHtml(hero.actor)}</div>
                    <div class="hero-modal-role">${escapeHtml(hero.role)}</div>
                </div>
            </div>
            
            <div class="hero-modal-tabs">
                <button class="hero-tab active" onclick="switchTab('bio')">📖 Биография</button>
                <button class="hero-tab" onclick="switchTab('details')">📋 Детали</button>
            </div>
            
            <div id="heroTabBio" class="hero-tab-content active">
                <h3>📖 Полная биография</h3>
                <div class="bio-text">${escapeHtml(hero.bio || hero.description || 'Нет дополнительной информации.')}</div>
            </div>
            
            <div id="heroTabDetails" class="hero-tab-content">
                <h3>📋 Подробная информация</h3>
                ${renderDetailsTab(hero)}
            </div>
        </div>
    `;
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

// ============================================
// ПОИСК ID ПЕРСОНАЖА ПО ИМЕНИ
// ============================================
function findHeroIdByName(name) {
    if (!name) return null;
    // Очищаем имя от описаний в скобках
    let cleanName = name.split(' —')[0].split(' -')[0].split(' (')[0].trim();
    
    const hero = heroesData.find(h => 
        h.name.toLowerCase().includes(cleanName.toLowerCase()) ||
        cleanName.toLowerCase().includes(h.name.toLowerCase())
    );
    
    return hero ? hero.id : null;
}

// ============================================
// РЕНДЕР ВКЛАДКИ С ДЕТАЛЬНОЙ ИНФОРМАЦИЕЙ
// ============================================
function renderDetailsTab(hero) {
    if (!hero.details) {
        return '<div class="no-details">📭 Дополнительная информация отсутствует.</div>';
    }
    
    const d = hero.details;
    
    let html = '<div class="details-grid">';
    
    // ФИО
    if (d.fullName) {
        html += `
            <div class="detail-item full-width">
                <div class="detail-label"><i class="fas fa-user"></i> Полное имя</div>
                <div class="detail-value">${escapeHtml(d.fullName)}</div>
            </div>
        `;
    }
    
    // Возраст
    if (d.age) {
        html += `
            <div class="detail-item">
                <div class="detail-label"><i class="fas fa-calendar-alt"></i> Возраст</div>
                <div class="detail-value">${escapeHtml(d.age)}</div>
            </div>
        `;
    }
    
    // Прозвища
    if (d.nicknames && d.nicknames.length) {
        html += `
            <div class="detail-item full-width">
                <div class="detail-label"><i class="fas fa-tag"></i> Прозвища</div>
                <div class="detail-value nicknames-list">
                    ${d.nicknames.map(n => `<span class="nickname-tag">${escapeHtml(n)}</span>`).join('')}
                </div>
            </div>
        `;
    }
    
    // Звания
    if (d.ranks && d.ranks.length) {
        html += `
            <div class="detail-item full-width">
                <div class="detail-label"><i class="fas fa-star"></i> Звания</div>
                <div class="detail-value">
                    <ul class="detail-list">
                        ${d.ranks.map(r => `<li>${escapeHtml(r)}</li>`).join('')}
                    </ul>
                </div>
            </div>
        `;
    }
    
    // Должности
    if (d.positions && d.positions.length) {
        html += `
            <div class="detail-item full-width">
                <div class="detail-label"><i class="fas fa-briefcase"></i> Должности</div>
                <div class="detail-value">
                    <ul class="detail-list">
                        ${d.positions.map(p => `<li>${escapeHtml(p)}</li>`).join('')}
                    </ul>
                </div>
            </div>
        `;
    }
    
    // Появление/Исчезновение
    if (d.appearance || d.disappearance) {
        html += `
            <div class="detail-item">
                <div class="detail-label"><i class="fas fa-video"></i> Появление</div>
                <div class="detail-value">${escapeHtml(d.appearance || '—')}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label"><i class="fas fa-sign-out-alt"></i> Исчезновение</div>
                <div class="detail-value">${escapeHtml(d.disappearance || '—')}</div>
            </div>
        `;
    }
    
    // Семья (интерактивная)
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
                                    <div class="relation-person" onclick="openHeroModal(${targetId})">
                                        <span class="relation-role">${escapeHtml(f.relation)}:</span>
                                        <span class="relation-name-clickable">${escapeHtml(f.name)}</span>
                                        <i class="fas fa-external-link-alt"></i>
                                    </div>
                                `;
                            } else {
                                return `
                                    <div class="relation-person">
                                        <span class="relation-role">${escapeHtml(f.relation)}:</span>
                                        <span class="relation-name">${escapeHtml(f.name)}</span>
                                    </div>
                                `;
                            }
                        }).join('')}
                    </div>
                </div>
            </div>
        `;
    }
    
    // Друзья (интерактивные)
    if (d.friends && d.friends.length) {
        html += `
            <div class="detail-item full-width">
                <div class="detail-label"><i class="fas fa-handshake"></i> Друзья / Сослуживцы</div>
                <div class="detail-value">
                    <div class="relations-list">
                        ${d.friends.map(f => {
                            const targetId = findHeroIdByName(f);
                            if (targetId) {
                                return `
                                    <div class="relation-person" onclick="openHeroModal(${targetId})">
                                        <span>${escapeHtml(f)}</span>
                                        <i class="fas fa-external-link-alt"></i>
                                    </div>
                                `;
                            } else {
                                return `<div class="relation-person">${escapeHtml(f)}</div>`;
                            }
                        }).join('')}
                    </div>
                </div>
            </div>
        `;
    }
    
    // Враги (интерактивные)
    if (d.enemies && d.enemies.length) {
        html += `
            <div class="detail-item full-width">
                <div class="detail-label"><i class="fas fa-fist-raised"></i> Враги / Противники</div>
                <div class="detail-value">
                    <div class="relations-list">
                        ${d.enemies.map(e => {
                            const targetId = findHeroIdByName(e);
                            if (targetId) {
                                return `
                                    <div class="relation-person enemy" onclick="openHeroModal(${targetId})">
                                        <span>${escapeHtml(e)}</span>
                                        <i class="fas fa-external-link-alt"></i>
                                    </div>
                                `;
                            } else {
                                return `<div class="relation-person enemy">${escapeHtml(e)}</div>`;
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

// ============================================
// ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК
// ============================================
function switchTab(tabName) {
    const bioTab = document.getElementById('heroTabBio');
    const detailsTab = document.getElementById('heroTabDetails');
    const tabs = document.querySelectorAll('.hero-tab');
    
    // Скрываем все
    if (bioTab) bioTab.classList.remove('active');
    if (detailsTab) detailsTab.classList.remove('active');
    
    // Убираем активный класс у всех кнопок
    tabs.forEach(tab => tab.classList.remove('active'));
    
    // Показываем нужную вкладку
    if (tabName === 'bio' && bioTab) {
        bioTab.classList.add('active');
        if (tabs[0]) tabs[0].classList.add('active');
    } else if (tabName === 'details' && detailsTab) {
        detailsTab.classList.add('active');
        if (tabs[1]) tabs[1].classList.add('active');
    }
}

// ============================================
// ЗАКРЫТИЕ МОДАЛЬНОГО ОКНА
// ============================================
function closeHeroModal() {
    const modal = document.getElementById('heroModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
        currentHero = null;
    }
}

// ============================================
// ЗАЩИТА ОТ XSS С СОХРАНЕНИЕМ ПЕРЕНОСОВ
// ============================================
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

// ============================================
// ОБРАБОТЧИКИ ГЛОБАЛЬНЫХ СОБЫТИЙ
// ============================================
document.addEventListener('click', function(e) {
    const modal = document.getElementById('heroModal');
    if (modal && e.target === modal) {
        closeHeroModal();
    }
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeHeroModal();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    renderHeroes();
    console.log("✅ heroes.js загружен");
});
