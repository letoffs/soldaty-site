

// Отрисовать карточки героев
function renderHeroes() {
    const grid = document.getElementById('heroesGrid');
    if (!grid) return;
    
    grid.innerHTML = heroesData.map(hero => `
        <div class="hero-card">
            <div class="hero-image">
                <img src="${hero.imageUrl}" alt="${hero.name}" onerror="this.src='../resources/placeholder.jpg'">
            </div>
            <div class="hero-info">
                <h2 class="hero-name">${escapeHtml(hero.name)}</h2>
                <div class="hero-actor">${escapeHtml(hero.actor)}</div>
                <div class="hero-role">${escapeHtml(hero.role)}</div>
                <p class="hero-description">${escapeHtml(hero.description)}</p>
            </div>
        </div>
    `).join('');
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

// Запуск
window.onload = () => {
    renderHeroes();
    console.log("✅ Страница героев загружена");
};