// ========== ВИКТОРИНА «СОЛДАТЫ» - ПОЛНАЯ ВЕРСИЯ ==========
// Логика: жетоны начисляются ТОЛЬКО в конце уровня!
// Жизни теряются ТОЛЬКО при непрохождении уровня!
// Восстановление жизней: +1 каждые 5 минут

// ========== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ==========
let currentLevel = 0;
let currentQuestionIndex = 0;
let userAnswers = [];
let quizCompleted = false;
let quizStarted = false;
let selectedLevel = null;
let shuffledQuestions = [];
let originalQuestions = [];

// ========== СИСТЕМА ЖЕТОНОВ ==========
let userTokens = 10;
let hintUsedForCurrentQuestion = false;

const TOKEN_CONFIG = {
    startBonus: 10,
    correctAnswer: 0,
    wrongAnswer: -1,
    hintCost: 3,
    revealAnswerCost: 5,
    levelCompleteBonus: 2,
    perfectLevelBonus: 5,
    maxDebt: -10
};

// ========== СИСТЕМА ЖИЗНЕЙ ==========
let userLives = 3;
let gameFailed = false;

const LIVES_CONFIG = {
    startLives: 3,
    maxLives: 5,
    levelFailPenalty: 1,
    levelCompleteBonus: 1
};

// ========== ПРОГРЕСС УРОВНЕЙ ==========
let progress = {
    level1Score: 0, level2Score: 0, level3Score: 0, level4Score: 0, level5Score: 0,
    level6Score: 0, level7Score: 0, level8Score: 0, level9Score: 0, level10Score: 0,
    level1Passed: false, level2Passed: false, level3Passed: false, level4Passed: false,
    level5Passed: false, level6Passed: false, level7Passed: false, level8Passed: false,
    level9Passed: false, level10Passed: false
};

// Хранилище для разблокированных ответов
let unlockedAnswers = {};

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function shuffleLevelQuestions(levelIndex) {
    const level = quizLevels[levelIndex];
    if (!level) return [];
    originalQuestions = [...level.questions];
    shuffledQuestions = shuffleArray(level.questions);
    console.log(`🔄 Вопросы уровня "${level.name}" перемешаны`);
    return shuffledQuestions;
}

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function isQuizDataLoaded() {
    if (typeof quizLevels === 'undefined') {
        console.error("❌ Данные викторины не загружены!");
        return false;
    }
    if (!quizLevels || quizLevels.length === 0) {
        console.error("❌ quizLevels пуст!");
        return false;
    }
    return true;
}

// ========== СИСТЕМА ВОССТАНОВЛЕНИЯ ЖИЗНЕЙ ==========

function loadLives() {
    const saved = localStorage.getItem('soldaty_lives');
    const lastLossTime = localStorage.getItem('soldaty_last_loss_time');
    
    if (saved !== null) {
        let lives = parseInt(saved);
        let recoveredLives = 0;
        
        if (lastLossTime && lives < LIVES_CONFIG.maxLives) {
            const now = Date.now();
            const timePassed = now - parseInt(lastLossTime);
            const minutesPassed = Math.floor(timePassed / (60 * 1000));
            recoveredLives = Math.floor(minutesPassed / 5);
            
            if (recoveredLives > 0) {
                const newLives = Math.min(lives + recoveredLives, LIVES_CONFIG.maxLives);
                if (newLives > lives) {
                    console.log(`💚 Восстановлено ${newLives - lives} жизней за ${minutesPassed} минут`);
                    lives = newLives;
                    if (lives === LIVES_CONFIG.maxLives) {
                        localStorage.removeItem('soldaty_last_loss_time');
                    } else {
                        const newLastLossTime = now - ((minutesPassed % 5) * 60 * 1000);
                        localStorage.setItem('soldaty_last_loss_time', newLastLossTime);
                    }
                    saveLives(lives);
                }
            }
        }
        userLives = lives;
    } else {
        userLives = LIVES_CONFIG.startLives;
        saveLives(userLives);
    }
    
    updateLivesUI();
    startLifeRecoveryCheck();
    console.log(`💚 Загружено ${userLives} жизней`);
}

function saveLives(lives = userLives) {
    localStorage.setItem('soldaty_lives', lives);
}

function updateLivesUI() {
    let livesDisplay = document.getElementById('livesDisplay');
    if (!livesDisplay && document.querySelector('.header')) {
        const header = document.querySelector('.header');
        let heartsHtml = '';
        for (let i = 0; i < LIVES_CONFIG.maxLives; i++) {
            if (i < userLives) {
                heartsHtml += '<i class="fas fa-heart" style="color: #ff4757;"></i>';
            } else {
                heartsHtml += '<i class="far fa-heart" style="color: #ff4757;"></i>';
            }
        }
        
        const recoveryTimer = getRecoveryTimerText();
        
        const livesHTML = `
            <div id="livesDisplay" class="lives-display ${userLives <= 1 ? 'critical' : ''}">
                <span class="lives-label"><i class="fas fa-shield-alt"></i> Жизни:</span>
                <span class="lives-hearts">${heartsHtml}</span>
                <span id="recoveryTimer" class="recovery-timer">${recoveryTimer}</span>
            </div>
        `;
        header.insertAdjacentHTML('beforeend', livesHTML);
    } else if (livesDisplay) {
        let heartsHtml = '';
        for (let i = 0; i < LIVES_CONFIG.maxLives; i++) {
            if (i < userLives) {
                heartsHtml += '<i class="fas fa-heart" style="color: #ff4757;"></i>';
            } else {
                heartsHtml += '<i class="far fa-heart" style="color: #ff4757;"></i>';
            }
        }
        livesDisplay.querySelector('.lives-hearts').innerHTML = heartsHtml;
        
        if (userLives <= 1) {
            livesDisplay.classList.add('critical');
        } else {
            livesDisplay.classList.remove('critical');
        }
        
        const timerSpan = document.getElementById('recoveryTimer');
        if (timerSpan) {
            timerSpan.textContent = getRecoveryTimerText();
        }
    }
}

function getRecoveryTimerText() {
    if (userLives >= LIVES_CONFIG.maxLives) {
        return '';
    }
    
    const lastLossTime = localStorage.getItem('soldaty_last_loss_time');
    if (!lastLossTime) return '';
    
    const now = Date.now();
    const timePassed = now - parseInt(lastLossTime);
    const minutesPassed = Math.floor(timePassed / (60 * 1000));
    const nextRecoveryIn = 5 - (minutesPassed % 5);
    
    if (nextRecoveryIn === 0) {
        return '🔄 восстановление...';
    }
    if (nextRecoveryIn === 5) {
        return `⏱️ +1 жизнь через 5 мин`;
    }
    return `⏱️ +1 жизнь через ${nextRecoveryIn} мин`;
}

function startLifeRecoveryCheck() {
    if (window.recoveryInterval) clearInterval(window.recoveryInterval);
    
    window.recoveryInterval = setInterval(() => {
        if (userLives < LIVES_CONFIG.maxLives) {
            const lastLossTime = localStorage.getItem('soldaty_last_loss_time');
            if (lastLossTime) {
                const now = Date.now();
                const timePassed = now - parseInt(lastLossTime);
                const minutesPassed = Math.floor(timePassed / (60 * 1000));
                const recoveredLives = Math.floor(minutesPassed / 5);
                
                if (recoveredLives > 0) {
                    const newLives = Math.min(userLives + recoveredLives, LIVES_CONFIG.maxLives);
                    if (newLives > userLives) {
                        userLives = newLives;
                        saveLives(userLives);
                        
                        const remainingMinutes = minutesPassed % 5;
                        if (remainingMinutes === 0 && userLives < LIVES_CONFIG.maxLives) {
                            localStorage.setItem('soldaty_last_loss_time', now);
                        } else if (userLives >= LIVES_CONFIG.maxLives) {
                            localStorage.removeItem('soldaty_last_loss_time');
                        } else {
                            const newLastLossTime = now - (remainingMinutes * 60 * 1000);
                            localStorage.setItem('soldaty_last_loss_time', newLastLossTime);
                        }
                        
                        updateLivesUI();
                        showFloatingMessage(`💚 Восстановлена жизнь! Теперь у вас ${userLives} жизней`, 'success');
                    }
                }
            }
        }
        updateLivesUI();
    }, 60000);
}

function loseLifeForLevelFail() {
    if (userLives > 0) {
        userLives--;
        saveLives(userLives);
        
        if (userLives < LIVES_CONFIG.maxLives) {
            const lastLossTime = localStorage.getItem('soldaty_last_loss_time');
            const now = Date.now();
            
            if (!lastLossTime) {
                localStorage.setItem('soldaty_last_loss_time', now);
            } else {
                const timePassed = now - parseInt(lastLossTime);
                const minutesPassed = Math.floor(timePassed / (60 * 1000));
                const newLastLossTime = now - ((minutesPassed % 5) * 60 * 1000);
                localStorage.setItem('soldaty_last_loss_time', newLastLossTime);
            }
        }
        
        updateLivesUI();
        showFloatingMessage(`💔 Уровень не пройден! Потеряна жизнь. Осталось: ${userLives}`, 'error');
        
        if (userLives === 0) {
            showFloatingMessage('💀 ВЫ ПОТЕРЯЛИ ВСЕ ЖИЗНИ! Ждите восстановления (5 минут за жизнь)! 💀', 'error');
            return true;
        }
    }
    return false;
}

function addLifeForLevelComplete() {
    if (userLives < LIVES_CONFIG.maxLives) {
        userLives++;
        saveLives(userLives);
        
        if (userLives >= LIVES_CONFIG.maxLives) {
            localStorage.removeItem('soldaty_last_loss_time');
        } else if (userLives > 0) {
            const lastLossTime = localStorage.getItem('soldaty_last_loss_time');
            if (lastLossTime) {
                const now = Date.now();
                const timePassed = now - parseInt(lastLossTime);
                const minutesPassed = Math.floor(timePassed / (60 * 1000));
                const newLastLossTime = now - ((minutesPassed % 5) * 60 * 1000);
                localStorage.setItem('soldaty_last_loss_time', newLastLossTime);
            }
        }
        
        updateLivesUI();
        showFloatingMessage(`💚 +1 жизнь за прохождение уровня! Теперь у вас ${userLives} жизней`, 'success');
    }
}

function resetAllLives() {
    userLives = LIVES_CONFIG.startLives;
    saveLives(userLives);
    localStorage.removeItem('soldaty_last_loss_time');
    updateLivesUI();
}

// ========== СИСТЕМА ЖЕТОНОВ ==========

function loadTokenBalance() {
    const saved = localStorage.getItem('soldaty_tokens_v2');
    if (saved !== null) {
        userTokens = parseInt(saved);
        console.log(`💰 Загружено ${userTokens} жетонов`);
    } else {
        userTokens = TOKEN_CONFIG.startBonus;
        saveTokenBalance();
        showFloatingMessage(`🎁 Стартовый бонус: +${TOKEN_CONFIG.startBonus} жетонов!`, 'success');
    }
    
    const savedUnlocked = localStorage.getItem('soldaty_unlocked_answers');
    if (savedUnlocked) {
        try {
            unlockedAnswers = JSON.parse(savedUnlocked);
        } catch(e) {}
    }
    
    updateTokenUI();
}

function saveTokenBalance() {
    localStorage.setItem('soldaty_tokens_v2', userTokens);
    localStorage.setItem('soldaty_unlocked_answers', JSON.stringify(unlockedAnswers));
}

function updateTokenUI() {
    let tokenDisplay = document.getElementById('tokenDisplay');
    if (!tokenDisplay && document.querySelector('.header')) {
        const header = document.querySelector('.header');
        const tokenHTML = `
            <div id="tokenDisplay" class="token-display ${userTokens < 0 ? 'negative' : ''}">
                <i class="fas fa-coins"></i>
                <span id="tokenAmount">${userTokens}</span>
                <span class="token-label">жетонов</span>
                <button id="hintButton" class="hint-btn" title="Подсказка (3 жетона)">
                    <i class="fas fa-lightbulb"></i>
                </button>
                <button id="tokenStatsBtn" class="token-stats-btn" title="Статистика">
                    <i class="fas fa-chart-line"></i>
                </button>
            </div>
        `;
        header.insertAdjacentHTML('beforeend', tokenHTML);
        
        const hintBtn = document.getElementById('hintButton');
        if (hintBtn) hintBtn.onclick = () => useHint();
        
        const statsBtn = document.getElementById('tokenStatsBtn');
        if (statsBtn) statsBtn.onclick = () => showTokenStatsModal();
    } else if (tokenDisplay) {
        document.getElementById('tokenAmount').innerText = userTokens;
        if (userTokens < 0) {
            tokenDisplay.classList.add('negative');
        } else {
            tokenDisplay.classList.remove('negative');
        }
    }
}

function addTokens(amount, reason, silent = false) {
    userTokens += amount;
    saveTokenBalance();
    updateTokenUI();
    
    if (!silent) {
        showTokenAnimation(amount, reason);
    }
    
    logTokenTransaction(amount, reason);
    
    if (userTokens <= TOKEN_CONFIG.maxDebt && !window.bankruptcyShown) {
        window.bankruptcyShown = true;
        showFloatingMessage(`⚠️ Вы в долгу (${userTokens} жетонов)! Отвечайте правильно!`, 'warning');
    }
    
    return userTokens;
}

function logTokenTransaction(amount, reason) {
    const history = JSON.parse(localStorage.getItem('soldaty_token_history') || '[]');
    history.unshift({
        amount: amount,
        reason: reason,
        date: new Date().toISOString(),
        balance: userTokens
    });
    if (history.length > 50) history.pop();
    localStorage.setItem('soldaty_token_history', JSON.stringify(history));
}

function showTokenAnimation(amount, reason) {
    const toast = document.createElement('div');
    toast.className = `token-toast ${amount > 0 ? 'positive' : 'negative'}`;
    const sign = amount > 0 ? '+' : '';
    toast.innerHTML = `
        <i class="fas fa-coins"></i>
        ${sign}${amount} жетонов
        <small>${reason}</small>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

function showFloatingMessage(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `floating-message ${type}`;
    toast.innerHTML = `<i class="fas fa-${type === 'error' ? 'exclamation-triangle' : type === 'success' ? 'check-circle' : 'info-circle'}"></i> ${message}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 3000);
    }, 3000);
}

function getCurrentQuestion() {
    return shuffledQuestions[currentQuestionIndex];
}

// ========== ПОДСКАЗКИ ==========

function useHint() {
    if (userAnswers[currentQuestionIndex] !== null) {
        showFloatingMessage('Вы уже ответили на этот вопрос!', 'warning');
        return false;
    }
    
    if (hintUsedForCurrentQuestion) {
        showFloatingMessage('Подсказка уже использована!', 'warning');
        return false;
    }
    
    if (userTokens < TOKEN_CONFIG.hintCost) {
        showFloatingMessage(`❌ Нужно ${TOKEN_CONFIG.hintCost} жетона. У вас ${userTokens}`, 'error');
        return false;
    }
    
    if (!confirm(`💡 Использовать подсказку?\n\nСпишется ${TOKEN_CONFIG.hintCost} жетона\nУдалятся 2 неверных варианта\nВаш баланс: ${userTokens} → ${userTokens - TOKEN_CONFIG.hintCost}`)) {
        return false;
    }
    
    addTokens(-TOKEN_CONFIG.hintCost, 'Подсказка (удаление 2 вариантов)');
    hintUsedForCurrentQuestion = true;
    removeTwoWrongOptions();
    showFloatingMessage('💡 Два неверных ответа удалены!', 'success');
    return true;
}

function removeTwoWrongOptions() {
    const currentQuestion = getCurrentQuestion();
    if (!currentQuestion) return;
    
    const correctIndex = currentQuestion.correct;
    const wrongIndices = [];
    
    for (let i = 0; i < currentQuestion.options.length; i++) {
        if (i !== correctIndex) wrongIndices.push(i);
    }
    
    for (let i = wrongIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [wrongIndices[i], wrongIndices[j]] = [wrongIndices[j], wrongIndices[i]];
    }
    
    const toRemove = wrongIndices.slice(0, 2);
    document.querySelectorAll('.quiz-option').forEach((opt, idx) => {
        if (toRemove.includes(idx)) {
            opt.style.display = 'none';
            opt.classList.add('hidden-option');
        }
    });
}

function resetHintForNewQuestion() {
    hintUsedForCurrentQuestion = false;
    document.querySelectorAll('.quiz-option.hidden-option').forEach(opt => {
        opt.style.display = 'flex';
        opt.classList.remove('hidden-option');
    });
}

// ========== СТАТИСТИКА ==========

function getTokenStats() {
    const history = JSON.parse(localStorage.getItem('soldaty_token_history') || '[]');
    const totalEarned = history.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
    const totalSpent = history.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    return {
        balance: userTokens,
        totalEarned: totalEarned,
        totalSpent: totalSpent,
        transactions: history.slice(0, 20)
    };
}

function showTokenStatsModal() {
    const stats = getTokenStats();
    const modalHtml = `
        <div id="tokenStatsModal" class="token-modal">
            <div class="token-modal-content">
                <div class="token-modal-header">
                    <h3><i class="fas fa-coins"></i> Статистика жетонов</h3>
                    <button class="token-modal-close" onclick="closeTokenStatsModal()">&times;</button>
                </div>
                <div class="token-modal-body">
                    <div class="stats-grid">
                        <div class="stat-card"><i class="fas fa-wallet"></i><span class="stat-value ${stats.balance < 0 ? 'negative' : ''}">${stats.balance}</span><span class="stat-label">Баланс</span></div>
                        <div class="stat-card"><i class="fas fa-arrow-up"></i><span class="stat-value positive">+${stats.totalEarned}</span><span class="stat-label">Заработано</span></div>
                        <div class="stat-card"><i class="fas fa-arrow-down"></i><span class="stat-value negative">-${stats.totalSpent}</span><span class="stat-label">Потрачено</span></div>
                    </div>
                    <div class="transactions-list">
                        <h4>История операций</h4>
                        ${stats.transactions.length === 0 ? '<p class="empty-history">Нет операций</p>' : 
                            stats.transactions.map(t => `
                                <div class="transaction-item ${t.amount > 0 ? 'earn' : 'spend'}">
                                    <div class="transaction-icon"><i class="fas fa-${t.amount > 0 ? 'plus-circle' : 'minus-circle'}"></i></div>
                                    <div class="transaction-details"><div class="transaction-reason">${t.reason}</div><div class="transaction-date">${new Date(t.date).toLocaleString()}</div></div>
                                    <div class="transaction-amount ${t.amount > 0 ? 'positive' : 'negative'}">${t.amount > 0 ? '+' : ''}${t.amount}</div>
                                </div>
                            `).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.getElementById('tokenStatsModal').style.display = 'flex';
}

function closeTokenStatsModal() {
    const modal = document.getElementById('tokenStatsModal');
    if (modal) modal.remove();
}

// ========== ПРОГРЕСС УРОВНЕЙ ==========

function loadProgress() {
    const saved = localStorage.getItem('soldaty_quiz_progress_v2');
    if (saved) {
        try {
            const loaded = JSON.parse(saved);
            Object.assign(progress, loaded);
        } catch(e) {
            console.error("Ошибка загрузки прогресса", e);
        }
    }
    console.log("📊 Загружен прогресс:", progress);
}

function saveProgress() {
    localStorage.setItem('soldaty_quiz_progress_v2', JSON.stringify(progress));
}

function isLevelUnlocked(levelIndex) {
    if (!isQuizDataLoaded()) return false;
    if (levelIndex === 0) return true;
    const prevLevelKey = `level${levelIndex}Passed`;
    return progress[prevLevelKey] === true;
}

function saveLevelResult(levelIndex, correctCount, passed, allCorrect) {
    const levelNum = levelIndex + 1;
    const scoreKey = `level${levelNum}Score`;
    const passedKey = `level${levelNum}Passed`;
    progress[scoreKey] = correctCount;
    if (passed && !progress[passedKey]) {
        progress[passedKey] = true;
    }
    saveProgress();
}

// ========== ОСНОВНЫЕ ФУНКЦИИ ВИКТОРИНЫ ==========

function renderWelcomeScreen() {
    if (!isQuizDataLoaded()) {
        quizContainer.innerHTML = `<div class="error-screen"><i class="fas fa-exclamation-triangle"></i><h2>Ошибка загрузки данных!</h2><button onclick="location.reload()">Перезагрузить</button></div>`;
        return;
    }
    
    const levels = quizLevels;
    let html = `
        <div class="welcome-screen">
            <div class="welcome-icon"><img src="../resources/soldaty_quiz_preview.jpg" alt="Викторина Солдаты" class="welcome-image"></div>
            <h2 class="welcome-title">Викторина «Солдаты»</h2>
            <div class="welcome-text">
                <p>Выберите уровень сложности!</p>
                <div class="token-rules">
                    <h4><i class="fas fa-coins"></i> Правила игры:</h4>
                    <ul>
                        <li>🎁 Стартовый бонус: <strong>+10 жетонов</strong></li>
                        <li>❤️ Стартовые жизни: <strong>3</strong> (максимум 5)</li>
                        <li>✅ Правильный ответ: <strong>0 жетонов</strong></li>
                        <li>❌ Неправильный ответ: <strong>-1 жетон</strong></li>
                        <li>💡 Подсказка: <strong>-3 жетона</strong> (удаляет 2 неверных варианта)</li>
                        <li>🏆 Прохождение уровня: <strong>+2 жетона</strong> и <strong>+1 жизнь</strong></li>
                        <li>⭐ Идеальное прохождение: <strong>+5 жетонов</strong> и <strong>+1 жизнь</strong></li>
                        <li style="color: #ff4757;">⚠️ Если не прошли уровень: <strong>-1 жизнь</strong></li>
                        <li style="color: #ff9800;">⏱️ Восстановление жизней: <strong>+1 каждые 5 минут</strong></li>
                    </ul>
                </div>
            </div>
            <div class="levels-container">`;
    
    for (let i = 0; i < levels.length; i++) {
        const level = levels[i];
        const unlocked = isLevelUnlocked(i);
        const passed = progress[`level${i+1}Passed`] === true;
        const score = progress[`level${i+1}Score`] || 0;
        
        html += `
            <div class="level-card ${!unlocked ? 'locked' : ''}" data-level="${i}">
                <div class="level-icon">${level.icon}</div>
                <div class="level-name">${level.name}</div>
                <div class="level-desc">${level.description}</div>
                ${passed ? `<div class="level-completed">✅ Пройден (${score}/${level.questions.length})</div>` : 
                    `<div class="level-requirement">📋 Нужно ${level.minPass} из ${level.questions.length}</div>`}
                ${passed && score === level.questions.length ? `<div class="perfect-badge">⭐ Идеально!</div>` : ''}
            </div>
        `;
    }
    
    html += `</div><div class="reset-progress"><button id="resetProgressBtn" class="reset-btn"><i class="fas fa-trash-alt"></i> Сбросить прогресс</button></div></div>`;
    quizContainer.innerHTML = html;
    
    document.querySelectorAll('.level-card').forEach(card => {
        const levelIdx = parseInt(card.dataset.level);
        if (isLevelUnlocked(levelIdx)) {
            card.style.cursor = 'pointer';
            card.onclick = () => startQuiz(levelIdx);
        } else {
            card.style.cursor = 'not-allowed';
            card.onclick = () => showFloatingMessage(`Уровень "${quizLevels[levelIdx].name}" недоступен!`, 'warning');
        }
    });
    
    const resetBtn = document.getElementById('resetProgressBtn');
    if (resetBtn) {
        resetBtn.onclick = () => {
            if (confirm('⚠️ Удалить прогресс, обнулить жетоны и сбросить жизни?')) {
                localStorage.removeItem('soldaty_quiz_progress_v2');
                localStorage.removeItem('soldaty_tokens_v2');
                localStorage.removeItem('soldaty_token_history');
                localStorage.removeItem('soldaty_unlocked_answers');
                localStorage.removeItem('soldaty_lives');
                localStorage.removeItem('soldaty_last_loss_time');
                location.reload();
            }
        };
    }
}

function startQuiz(levelIndex) {
    if (!isQuizDataLoaded() || !isLevelUnlocked(levelIndex)) return;
    
    selectedLevel = levelIndex;
    currentLevel = levelIndex;
    currentQuestionIndex = 0;
    
    shuffleLevelQuestions(levelIndex);
    userAnswers = new Array(shuffledQuestions.length).fill(null);
    quizStarted = true;
    quizCompleted = false;
    gameFailed = false;
    
    renderCurrentQuestion();
}

function renderCurrentQuestion() {
    if (!quizStarted) { renderWelcomeScreen(); return; }
    if (quizCompleted) return;
    if (gameFailed) {
        showGameFailedScreen();
        return;
    }
    
    resetHintForNewQuestion();
    
    const level = quizLevels[currentLevel];
    const question = getCurrentQuestion();
    const selectedAnswer = userAnswers[currentQuestionIndex];
    const totalQuestions = shuffledQuestions.length;
    const answeredCount = userAnswers.filter(a => a !== null).length;
    const isLastQuestion = (currentQuestionIndex === totalQuestions - 1);
    const allAnswered = userAnswers.every(a => a !== null);
    
    const html = `
        <div class="quiz-card">
            <div class="quiz-header">
                <div class="level-badge">
                    <span class="level-icon">${level.icon}</span>
                    <span class="level-name">${level.name}</span>
                    <span class="level-requirement-mini">📋 Отвечено: ${answeredCount}/${totalQuestions}</span>
                </div>
            </div>
            <div class="quiz-progress">
                <div class="progress-bar"><div class="progress-fill" style="width: ${((currentQuestionIndex + 1) / totalQuestions) * 100}%"></div></div>
            </div>
            <div class="quiz-question"><i class="fas fa-question-circle"></i> ${escapeHtml(question.question)}</div>
            <div class="quiz-options">
                ${question.options.map((opt, idx) => `
                    <div class="quiz-option ${selectedAnswer === idx ? 'selected' : ''}" data-opt-index="${idx}">
                        <span class="option-letter">${String.fromCharCode(65 + idx)}</span>
                        <span class="option-text">${escapeHtml(opt)}</span>
                        ${selectedAnswer === idx ? '<i class="fas fa-check-circle check-icon"></i>' : ''}
                    </div>
                `).join('')}
            </div>
            <div class="quiz-navigation">
                <div class="nav-left">
                    ${currentQuestionIndex > 0 ? '<button id="prevBtn" class="quiz-nav-btn"><i class="fas fa-arrow-left"></i> Назад</button>' : ''}
                </div>
                <div class="nav-right">
                    ${selectedAnswer !== null ? 
                        '<button id="nextBtn" class="quiz-nav-btn primary">Далее <i class="fas fa-arrow-right"></i></button>' : ''}
                    ${isLastQuestion && allAnswered ? 
                        '<button id="submitBtn" class="quiz-nav-btn success"><i class="fas fa-trophy"></i> Завершить уровень</button>' : ''}
                </div>
            </div>
        </div>
    `;
    
    quizContainer.innerHTML = html;
    
    document.querySelectorAll('.quiz-option').forEach(opt => {
        opt.onclick = () => selectAnswer(parseInt(opt.dataset.optIndex));
    });
    
    if (currentQuestionIndex > 0) {
        const prevBtn = document.getElementById('prevBtn');
        if (prevBtn) prevBtn.onclick = prevQuestion;
    }
    
    const nextBtn = document.getElementById('nextBtn');
    if (nextBtn) nextBtn.onclick = nextQuestion;
    
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) submitBtn.onclick = () => submitQuiz();
}

function selectAnswer(optionIndex) {
    if (quizCompleted || gameFailed) return;
    userAnswers[currentQuestionIndex] = optionIndex;
    renderCurrentQuestion();
}

function nextQuestion() {
    if (!quizStarted || quizCompleted) return;
    if (gameFailed) {
        showGameFailedScreen();
        return;
    }
    
    if (userAnswers[currentQuestionIndex] === null) {
        showFloatingMessage('Выберите ответ!', 'warning');
        return;
    }
    
    // ЖИЗНИ НЕ ТЕРЯЮТСЯ ЗА КАЖДЫЙ ОТВЕТ!
    // Только переходим к следующему вопросу
    
    if (currentQuestionIndex + 1 < shuffledQuestions.length) {
        currentQuestionIndex++;
        renderCurrentQuestion();
    }
}

function prevQuestion() {
    if (!quizStarted || quizCompleted) return;
    if (gameFailed) {
        showGameFailedScreen();
        return;
    }
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        renderCurrentQuestion();
    }
}

function submitQuiz() {
    if (!quizStarted || quizCompleted) return;
    if (gameFailed) {
        showGameFailedScreen();
        return;
    }
    if (!userAnswers.every(a => a !== null)) {
        showFloatingMessage('Ответьте на все вопросы!', 'warning');
        return;
    }
    
    const level = quizLevels[currentLevel];
    const totalQuestions = shuffledQuestions.length;
    let correctCount = 0;
    
    for (let i = 0; i < shuffledQuestions.length; i++) {
        const q = shuffledQuestions[i];
        if (userAnswers[i] === q.correct) correctCount++;
    }
    
    const wrongCount = totalQuestions - correctCount;
    const allCorrect = (correctCount === totalQuestions);
    const passed = correctCount >= level.minPass;
    
    // ========== НАЧИСЛЯЕМ ЖЕТОНЫ ==========
    let tokenChange = 0;
    let tokenDetails = [];
    
    // Штраф за неправильные ответы (только жетоны)
    if (wrongCount > 0) {
        const wrongTokens = wrongCount * Math.abs(TOKEN_CONFIG.wrongAnswer);
        addTokens(-wrongTokens, `${wrongCount} неправильных ответов (-${wrongTokens})`, true);
        tokenChange -= wrongTokens;
        tokenDetails.push(`❌ -${wrongTokens}`);
    }
    
    // ========== ОБРАБОТКА ЖИЗНЕЙ ПОСЛЕ ОПРЕДЕЛЕНИЯ РЕЗУЛЬТАТА ==========
    if (passed) {
        // ПРОХОЖДЕНИЕ: +1 жизнь и бонусные жетоны
        addLifeForLevelComplete();
        
        if (allCorrect) {
            addTokens(TOKEN_CONFIG.perfectLevelBonus, `⭐ Идеальное прохождение! +${TOKEN_CONFIG.perfectLevelBonus} жетонов`, true);
            tokenChange += TOKEN_CONFIG.perfectLevelBonus;
            tokenDetails.push(`⭐ +${TOKEN_CONFIG.perfectLevelBonus}`);
        } else {
            addTokens(TOKEN_CONFIG.levelCompleteBonus, `🏆 Прохождение уровня +${TOKEN_CONFIG.levelCompleteBonus} жетонов`, true);
            tokenChange += TOKEN_CONFIG.levelCompleteBonus;
            tokenDetails.push(`🏆 +${TOKEN_CONFIG.levelCompleteBonus}`);
        }
    } else {
        // НЕПРОХОЖДЕНИЕ: -1 жизнь
        const died = loseLifeForLevelFail();
        
        if (died) {
            gameFailed = true;
            quizCompleted = true;
            showGameFailedScreen();
            return;
        }
    }
    
    // Показываем итоговое сообщение о жетонах
    if (tokenChange !== 0) {
        const sign = tokenChange >= 0 ? '+' : '';
        showFloatingMessage(`💰 Итого: ${sign}${tokenChange} жетонов! ${tokenDetails.join(' ')}`, tokenChange >= 0 ? 'success' : 'error');
    }
    
    saveLevelResult(currentLevel, correctCount, passed, allCorrect);
    
    // Собираем детальные результаты
    const detailedResults = [];
    for (let i = 0; i < shuffledQuestions.length; i++) {
        const q = shuffledQuestions[i];
        const answer = userAnswers[i];
        const isCorrect = (answer === q.correct);
        const answerKey = `${currentLevel}_${i}`;
        const isUnlocked = unlockedAnswers[answerKey] === true;
        
        detailedResults.push({
            index: i,
            questionText: q.question,
            userAnswerText: q.options[answer],
            correctAnswerText: q.options[q.correct],
            isCorrect: isCorrect,
            explanation: q.explanation,
            answerKey: answerKey,
            isUnlocked: isUnlocked || isCorrect
        });
    }
    
    quizCompleted = true;
    
    if (!passed) {
        renderFailResultsScreen(correctCount, totalQuestions, detailedResults, level, tokenChange);
    } else {
        renderSuccessResultsScreen(correctCount, totalQuestions, detailedResults, level, allCorrect, tokenChange);
    }
}

function renderFailResultsScreen(correctCount, total, detailedResults, level, tokenChange) {
    const percentage = Math.round((correctCount / total) * 100);
    const failJokes = [
        '📢 ВАМ ПОВЕСТКА В ВОЕНКОМАТ!',
        '🎖️ Рядовой, вы не сдали нормативы! На пересдачу!',
        '🧹 Вам наряд вне очереди! Подметёте плац?',
        '📖 Товарищ боец, учить Устав нужно!',
        '🔫 В увольнительную не пойдёшь!',
        '🪖 Вы бы ещё дембельский аккорд завалили!'
    ];
    const randomJoke = failJokes[Math.floor(Math.random() * failJokes.length)];
    
    let detailsHtml = '';
    for (let i = 0; i < detailedResults.length; i++) {
        const r = detailedResults[i];
        const isUnlocked = r.isUnlocked;
        
        detailsHtml += `
            <div class="result-detail-card ${r.isCorrect ? 'correct' : 'incorrect'}">
                <div class="result-detail-header">
                    <span class="result-detail-num">Вопрос ${i + 1}</span>
                    <span class="result-detail-status">${r.isCorrect ? '✅ Верно' : '❌ Неверно'}</span>
                    ${!r.isCorrect && !isUnlocked ? `<span class="locked-badge"><i class="fas fa-lock"></i> <i class="fas fa-coins"></i> ${TOKEN_CONFIG.revealAnswerCost}</span>` : ''}
                </div>
                <div class="result-detail-question">${escapeHtml(r.questionText)}</div>
                <div class="result-detail-answer">
                    <div class="your-answer">📝 Ваш ответ: ${escapeHtml(r.userAnswerText)}</div>
                    ${isUnlocked || r.isCorrect ? 
                        `<div class="correct-answer">✓ Правильный ответ: ${escapeHtml(r.correctAnswerText)}</div>` : 
                        `<div class="correct-answer hidden">✓ Правильный ответ: <span class="blur-text">●●●●●●●●●</span></div>`
                    }
                </div>
                <div id="hidden-content-${i}" class="hidden-answer-content">
                    ${isUnlocked || r.isCorrect ? 
                        `<div class="explanation-text"><i class="fas fa-info-circle"></i> ${escapeHtml(r.explanation)}</div>` : 
                        `<div class="locked-placeholder">
                            <i class="fas fa-lock"></i> Пояснение скрыто
                            <button id="unlock-btn-${i}" class="unlock-answer-btn" data-index="${i}" data-key="${r.answerKey}" data-correct="${escapeHtml(r.correctAnswerText)}" data-explanation="${escapeHtml(r.explanation)}">
                                <i class="fas fa-coins"></i> Открыть за ${TOKEN_CONFIG.revealAnswerCost} жетонов
                            </button>
                        </div>`
                    }
                </div>
            </div>
        `;
    }
    
    const html = `
        <div class="results-fullscreen">
            <div class="results-header"><i class="fas fa-trophy"></i><h2>Результаты уровня «${level.name}»</h2></div>
            <div class="results-summary">
                <div class="summary-score">
                    <div class="score-circle"><span class="score-number">${correctCount}</span><span class="score-total">/${total}</span></div>
                    <div class="score-percent">${percentage}%</div>
                </div>
                <div class="summary-status fail">
                    😔 ${randomJoke} 😔
                </div>
                <div class="fail-joke-subtitle">Нужно ${level.minPass} правильных ответов из ${total}.</div>
                <div class="summary-info">
                    <div class="info-item"><i class="fas fa-check-circle"></i> Правильно: ${correctCount}</div>
                    <div class="info-item"><i class="fas fa-times-circle"></i> Неправильно: ${total - correctCount}</div>
                    <div class="info-item"><i class="fas fa-coins"></i> Жетонов: ${tokenChange >= 0 ? '+' : ''}${tokenChange}</div>
                    <div class="info-item"><i class="fas fa-heart"></i> Жизней осталось: ${userLives}</div>
                </div>
                <div class="fail-message"><i class="fas fa-redo-alt"></i> Попробуйте ещё раз!</div>
                ${userLives > 0 ? `<div class="lives-warning">⚠️ При следующей неудаче вы потеряете ещё одну жизнь!</div>` : `<div class="lives-critical">💀 У вас закончились жизни! Ждите восстановления (5 минут за жизнь)</div>`}
            </div>
            <div class="results-details-title"><i class="fas fa-list-alt"></i> Подробный разбор:</div>
            <div class="results-details-list">${detailsHtml}</div>
            <div class="results-buttons">
                <button id="retryBtn" class="result-btn retry-btn"><i class="fas fa-redo"></i> Пройти заново</button>
                <button id="menuBtn" class="result-btn menu-btn"><i class="fas fa-home"></i> К выбору уровня</button>
            </div>
        </div>
    `;
    
    quizContainer.innerHTML = html;
    
    document.querySelectorAll('.unlock-answer-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const index = parseInt(btn.dataset.index);
            const key = btn.dataset.key;
            const correct = btn.dataset.correct;
            const explanation = btn.dataset.explanation;
            unlockAnswer(index, key, correct, explanation);
        };
    });
    
    const retryBtn = document.getElementById('retryBtn');
    if (retryBtn) retryBtn.onclick = () => { quizStarted = false; startQuiz(currentLevel); };
    
    const menuBtn = document.getElementById('menuBtn');
    if (menuBtn) menuBtn.onclick = () => { quizStarted = false; renderWelcomeScreen(); };
}

function renderSuccessResultsScreen(correctCount, total, detailedResults, level, allCorrect, tokenChange) {
    const percentage = Math.round((correctCount / total) * 100);
    const nextLevelName = currentLevel + 1 < quizLevels.length ? quizLevels[currentLevel + 1].name : '—';
    
    let detailsHtml = '';
    for (let i = 0; i < detailedResults.length; i++) {
        const r = detailedResults[i];
        const isUnlocked = r.isUnlocked;
        
        detailsHtml += `
            <div class="result-detail-card ${r.isCorrect ? 'correct' : 'incorrect'}">
                <div class="result-detail-header">
                    <span class="result-detail-num">Вопрос ${i + 1}</span>
                    <span class="result-detail-status">${r.isCorrect ? '✅ Верно' : '❌ Неверно'}</span>
                    ${!r.isCorrect && !isUnlocked ? `<span class="locked-badge"><i class="fas fa-lock"></i> <i class="fas fa-coins"></i> ${TOKEN_CONFIG.revealAnswerCost}</span>` : ''}
                </div>
                <div class="result-detail-question">${escapeHtml(r.questionText)}</div>
                <div class="result-detail-answer">
                    <div class="your-answer">📝 Ваш ответ: ${escapeHtml(r.userAnswerText)}</div>
                    <div class="correct-answer">✓ Правильный ответ: ${escapeHtml(r.correctAnswerText)}</div>
                </div>
                <div id="hidden-content-${i}" class="hidden-answer-content">
                    <div class="explanation-text"><i class="fas fa-info-circle"></i> ${escapeHtml(r.explanation)}</div>
                </div>
            </div>
        `;
    }
    
    const html = `
        <div class="results-fullscreen">
            <div class="results-header"><i class="fas fa-trophy"></i><h2>Результаты уровня «${level.name}»</h2></div>
            <div class="results-summary">
                <div class="summary-score">
                    <div class="score-circle"><span class="score-number">${correctCount}</span><span class="score-total">/${total}</span></div>
                    <div class="score-percent">${percentage}%</div>
                </div>
                <div class="summary-status success">
                    🎉 ПОЗДРАВЛЯЮ! УРОВЕНЬ ПРОЙДЕН! 🎉
                </div>
                <div class="summary-info">
                    <div class="info-item"><i class="fas fa-check-circle"></i> Правильно: ${correctCount}</div>
                    <div class="info-item"><i class="fas fa-times-circle"></i> Неправильно: ${total - correctCount}</div>
                    <div class="info-item"><i class="fas fa-coins"></i> Жетонов: ${tokenChange >= 0 ? '+' : ''}${tokenChange}</div>
                    <div class="info-item"><i class="fas fa-heart"></i> Жизней осталось: ${userLives}</div>
                </div>
                ${allCorrect ? `<div class="perfect-bonus"><i class="fas fa-star"></i> ИДЕАЛЬНО! +5 жетонов и +1 жизнь!</div>` : ''}
                ${currentLevel + 1 < quizLevels.length ? `<div class="next-level-unlock"><i class="fas fa-unlock-alt"></i> Открыт уровень «${nextLevelName}»!</div>` : ''}
            </div>
            <div class="results-details-title"><i class="fas fa-list-alt"></i> Подробный разбор:</div>
            <div class="results-details-list">${detailsHtml}</div>
            <div class="results-buttons">
                <button id="menuBtn" class="result-btn menu-btn"><i class="fas fa-home"></i> К выбору уровня</button>
                ${currentLevel + 1 < quizLevels.length ? `<button id="nextLevelBtn" class="result-btn next-btn"><i class="fas fa-arrow-right"></i> Следующий уровень</button>` : ''}
            </div>
        </div>
    `;
    
    quizContainer.innerHTML = html;
    
    document.querySelectorAll('.unlock-answer-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const index = parseInt(btn.dataset.index);
            const key = btn.dataset.key;
            const correct = btn.dataset.correct;
            const explanation = btn.dataset.explanation;
            unlockAnswer(index, key, correct, explanation);
        };
    });
    
    const menuBtn = document.getElementById('menuBtn');
    if (menuBtn) menuBtn.onclick = () => { quizStarted = false; renderWelcomeScreen(); };
    
    const nextLevelBtn = document.getElementById('nextLevelBtn');
    if (nextLevelBtn) nextLevelBtn.onclick = () => {
        if (currentLevel + 1 < quizLevels.length && isLevelUnlocked(currentLevel + 1)) {
            quizStarted = false;
            startQuiz(currentLevel + 1);
        } else {
            quizStarted = false;
            renderWelcomeScreen();
        }
    };
}

function showGameFailedScreen() {
    const failJokes = [
        '📢 ВАМ ПОВЕСТКА В ВОЕНКОМАТ!',
        '💀 ЖИЗНИ КОНЧИЛИСЬ! ВЫ БЫЛИ УВОЛЕНЫ ИЗ АРМИИ! 💀',
        '🎖️ Товарищ боец, вы пали в бою с вопросами!',
        '📖 Ваша военная карьера закончилась, не начавшись...',
        '🔫 Вас комиссовали за неуспеваемость!',
        '🪖 Кирзачи не жмут? А жизни кончились!'
    ];
    const randomJoke = failJokes[Math.floor(Math.random() * failJokes.length)];
    
    const recoveryTimer = getRecoveryTimerText();
    
    const html = `
        <div class="game-failed-screen">
            <div class="failed-icon"><i class="fas fa-skull-crossbones"></i></div>
            <h2 class="failed-title">УРОВЕНЬ ПРОВАЛЕН!</h2>
            <div class="failed-message">${randomJoke}</div>
            <div class="failed-stats">
                <p>❤️ Жизни закончились!</p>
                <p>⏱️ ${recoveryTimer || 'Ждите восстановления жизней'}</p>
            </div>
            <div class="failed-buttons">
                <button id="failedMenuBtn" class="result-btn menu-btn"><i class="fas fa-home"></i> К выбору уровня</button>
            </div>
        </div>
    `;
    
    quizContainer.innerHTML = html;
    
    const menuBtn = document.getElementById('failedMenuBtn');
    if (menuBtn) menuBtn.onclick = () => { 
        quizStarted = false; 
        renderWelcomeScreen(); 
        window.scrollTo({ top: 0, behavior: 'smooth' }); 
    };
}

function unlockAnswer(questionIndex, answerKey, correctAnswerText, explanationText) {
    if (unlockedAnswers[answerKey]) {
        showFloatingMessage('Правильный ответ уже разблокирован!', 'info');
        return;
    }
    
    if (userTokens < TOKEN_CONFIG.revealAnswerCost) {
        showFloatingMessage(`❌ Недостаточно жетонов! Нужно ${TOKEN_CONFIG.revealAnswerCost}. У вас ${userTokens}`, 'error');
        return;
    }
    
    if (!confirm(`🔓 Открыть правильный ответ и пояснение за ${TOKEN_CONFIG.revealAnswerCost} жетонов?\n\nВаш баланс: ${userTokens} → ${userTokens - TOKEN_CONFIG.revealAnswerCost}`)) {
        return;
    }
    
    addTokens(-TOKEN_CONFIG.revealAnswerCost, `Открытие правильного ответа к вопросу ${questionIndex + 1}`);
    unlockedAnswers[answerKey] = true;
    saveTokenBalance();
    
    const hiddenContentDiv = document.getElementById(`hidden-content-${questionIndex}`);
    if (hiddenContentDiv) {
        hiddenContentDiv.innerHTML = `
            <div class="correct-answer">✓ Правильный ответ: ${escapeHtml(correctAnswerText)}</div>
            <div class="explanation-text"><i class="fas fa-info-circle"></i> ${escapeHtml(explanationText)}</div>
        `;
        hiddenContentDiv.classList.remove('locked');
        hiddenContentDiv.classList.add('unlocked');
    }
    
    const unlockBtn = document.getElementById(`unlock-btn-${questionIndex}`);
    if (unlockBtn) unlockBtn.style.display = 'none';
    
    showFloatingMessage(`🔓 Правильный ответ и пояснение разблокированы! -${TOKEN_CONFIG.revealAnswerCost} жетонов`, 'success');
}

// ========== СТИЛИ ==========
let stylesAdded = false;

function addTokenStyles() {
    if (stylesAdded) return;
    stylesAdded = true;
    
    const styles = `
        <style>
            .token-display { position: fixed; top: 20px; right: 20px; background: linear-gradient(135deg, #1a2a1a 0%, #0e1a0e 100%); border: 2px solid #ffd700; border-radius: 50px; padding: 8px 20px; display: flex; align-items: center; gap: 10px; z-index: 1000; font-weight: bold; }
            .token-display i { color: #ffd700; }
            .token-display #tokenAmount { font-size: 1.3rem; color: #ffd700; min-width: 40px; text-align: center; }
            .token-display.negative #tokenAmount { color: #ff6b6b; }
            .hint-btn, .token-stats-btn { background: #2c3e2c; border: none; width: 30px; height: 30px; border-radius: 50%; cursor: pointer; margin-left: 5px; }
            .hint-btn { color: #ffd700; }
            .token-stats-btn { color: #4caf50; }
            .hint-btn:hover, .token-stats-btn:hover { transform: scale(1.1); background: #ffd700; color: #1a2a1a; }
            
            .lives-display { position: fixed; top: 20px; left: 20px; background: linear-gradient(135deg, #1a2a1a 0%, #0e1a0e 100%); border: 2px solid #ff4757; border-radius: 50px; padding: 8px 20px; display: flex; align-items: center; gap: 10px; z-index: 1000; font-weight: bold; }
            .lives-display.critical { border-color: #ff6b6b; animation: pulse 1s infinite; }
            .lives-hearts i { margin: 0 2px; font-size: 1.1rem; }
            .lives-label { color: #aaa; font-size: 0.8rem; }
            .recovery-timer { font-size: 0.7rem; color: #ff9800; margin-left: 10px; padding-left: 10px; border-left: 1px solid #3e5a3e; }
            .lives-display.critical .recovery-timer { color: #ff6b6b; animation: blink 1s infinite; }
            @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(255, 71, 87, 0.4); } 70% { box-shadow: 0 0 0 10px rgba(255, 71, 87, 0); } 100% { box-shadow: 0 0 0 0 rgba(255, 71, 87, 0); } }
            @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
            
            .token-toast { position: fixed; bottom: 100px; right: 20px; background: #1a2a1a; border-left: 4px solid; padding: 12px 20px; border-radius: 12px; z-index: 2000; transform: translateX(400px); transition: transform 0.3s ease; }
            .token-toast.positive { border-left-color: #4caf50; }
            .token-toast.negative { border-left-color: #f44336; }
            .token-toast.show { transform: translateX(0); }
            .token-toast small { display: block; font-size: 0.7rem; color: #aaa; }
            
            .floating-message { position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%) translateY(100px); background: #1a2a1a; border: 1px solid #ffd700; padding: 10px 20px; border-radius: 40px; z-index: 2000; transition: transform 0.3s ease; font-size: 0.85rem; white-space: nowrap; }
            .floating-message.show { transform: translateX(-50%) translateY(0); }
            .floating-message.error { border-color: #f44336; color: #ff6b6b; }
            .floating-message.success { border-color: #4caf50; color: #81c784; }
            
            .game-failed-screen { background: linear-gradient(135deg, #0f1a0f 0%, #0a120a 100%); border-radius: 32px; padding: 50px 30px; text-align: center; border: 2px solid #ff4757; margin: 30px 0; }
            .failed-icon { font-size: 5rem; color: #ff4757; margin-bottom: 20px; }
            .failed-title { color: #ff4757; font-size: 2rem; margin-bottom: 20px; }
            .failed-message { font-size: 1.2rem; color: #ffd700; margin-bottom: 30px; }
            .failed-stats { background: #1e2a1e; border-radius: 20px; padding: 20px; margin-bottom: 30px; color: #ccc; }
            .failed-stats p { margin: 10px 0; }
            .failed-buttons { display: flex; gap: 15px; justify-content: center; flex-wrap: wrap; }
            
            .quiz-option.hidden-option { display: none !important; }
            .quiz-header { display: flex; justify-content: space-between; flex-wrap: wrap; margin-bottom: 15px; align-items: center; }
            .quiz-navigation { display: flex; justify-content: space-between; margin-top: 25px; }
            .nav-left, .nav-right { display: flex; gap: 10px; }
            
            .token-rules { background: #0a120a; border-radius: 16px; padding: 15px; margin-top: 20px; text-align: left; }
            .token-rules h4 { color: #ffd700; margin-bottom: 10px; }
            .token-rules ul { list-style: none; padding: 0; }
            .token-rules li { padding: 5px 0; color: #ccc; font-size: 0.85rem; }
            .perfect-badge { background: linear-gradient(135deg, #ffd700, #ff8c00); color: #1a2a1a; padding: 4px 10px; border-radius: 20px; font-size: 0.7rem; margin-top: 8px; display: inline-block; }
            .perfect-bonus { background: #1e3a1e; border: 1px solid #ffd700; border-radius: 40px; padding: 10px; margin-top: 15px; color: #ffd700; }
            .fail-message { background: #3a1e1e; border: 1px solid #f44336; border-radius: 40px; padding: 10px; margin-top: 15px; color: #f44336; }
            .fail-joke-subtitle { text-align: center; font-size: 0.9rem; color: #ff9800; margin: 10px 0; font-style: italic; }
            .lives-warning { background: #3a2a1e; border: 1px solid #ff9800; border-radius: 40px; padding: 8px; margin-top: 10px; color: #ff9800; font-size: 0.8rem; }
            .lives-critical { background: #3a1e1e; border: 1px solid #f44336; border-radius: 40px; padding: 8px; margin-top: 10px; color: #f44336; font-size: 0.8rem; }
            
            .token-modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 3000; display: flex; align-items: center; justify-content: center; }
            .token-modal-content { background: #0f1a0f; border-radius: 24px; width: 90%; max-width: 500px; max-height: 80vh; overflow: hidden; border: 1px solid #bd8a3e; }
            .token-modal-header { display: flex; justify-content: space-between; padding: 15px 20px; border-bottom: 1px solid #3e5a3e; }
            .token-modal-header h3 { color: #ffd700; margin: 0; }
            .token-modal-close { background: none; border: none; font-size: 24px; cursor: pointer; color: #aaa; }
            .token-modal-body { padding: 20px; max-height: 60vh; overflow-y: auto; }
            .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px; }
            .stat-card { text-align: center; background: #1e2a1e; padding: 15px; border-radius: 16px; }
            .stat-card i { font-size: 1.5rem; color: #bd8a3e; margin-bottom: 8px; display: block; }
            .stat-value { font-size: 1.5rem; font-weight: bold; display: block; }
            .stat-value.positive { color: #4caf50; }
            .stat-value.negative { color: #f44336; }
            .transaction-item { display: flex; align-items: center; gap: 12px; padding: 10px; background: #1e2a1e; border-radius: 12px; margin-bottom: 8px; }
            .transaction-item.earn .transaction-icon i { color: #4caf50; }
            .transaction-item.spend .transaction-icon i { color: #f44336; }
            .transaction-details { flex: 1; }
            .transaction-reason { font-size: 0.85rem; color: #ddd; }
            .transaction-date { font-size: 0.65rem; color: #8aa07a; }
            .transaction-amount { font-weight: bold; }
            .transaction-amount.positive { color: #4caf50; }
            .transaction-amount.negative { color: #f44336; }
            
            .results-details-list { max-height: 500px; overflow-y: auto; margin: 20px 0; }
            .result-detail-card { background: #0a120a; border-radius: 16px; padding: 15px; margin-bottom: 12px; border-left: 4px solid; }
            .result-detail-card.correct { border-left-color: #4caf50; }
            .result-detail-card.incorrect { border-left-color: #f44336; }
            .result-detail-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 8px; }
            .result-detail-question { font-weight: bold; color: #ffd966; margin-bottom: 10px; }
            .result-detail-answer { background: #1e2a1e; padding: 10px; border-radius: 12px; margin-bottom: 10px; }
            .your-answer { color: #ddd; }
            .correct-answer { color: #4caf50; margin-top: 5px; padding-top: 5px; border-top: 1px dashed #3e5a3e; }
            .correct-answer.hidden .blur-text { filter: blur(4px); user-select: none; }
            .locked-badge { background: #e74c3c; padding: 3px 10px; border-radius: 20px; font-size: 0.7rem; color: white; }
            .locked-placeholder { text-align: center; padding: 15px; background: #1e2a1e; border-radius: 12px; }
            .unlock-answer-btn { background: #3498db; border: none; padding: 10px 20px; border-radius: 30px; color: white; cursor: pointer; font-size: 0.85rem; margin-top: 10px; transition: all 0.2s; }
            .unlock-answer-btn:hover { background: #2980b9; transform: scale(1.02); }
            
            .welcome-image { max-width: 800px; width: 100%; height: auto; border-radius: 16px; box-shadow: 0 5px 20px rgba(0,0,0,0.3); border: 2px solid #bd8a3e; margin-bottom: 20px; }
            .reset-btn { background: linear-gradient(135deg, #3a1e1e 0%, #2a1212 100%); border: 1px solid #e74c3c; color: #ff6b6b; padding: 12px 28px; border-radius: 40px; font-size: 0.9rem; font-weight: bold; cursor: pointer; display: inline-flex; align-items: center; gap: 10px; margin-top: 30px; }
            .reset-btn:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(231, 76, 60, 0.3); }
            
            @media (max-width: 700px) {
                .token-display, .lives-display { top: auto; bottom: 70px; padding: 5px 12px; }
                .token-display { right: 10px; }
                .lives-display { left: 10px; }
                .token-display #tokenAmount { font-size: 1rem; }
                .floating-message { white-space: normal; max-width: 90%; text-align: center; }
                .quiz-navigation { flex-direction: column; gap: 10px; }
                .nav-left, .nav-right { justify-content: center; }
                .welcome-image { max-width: 120px; }
                .failed-title { font-size: 1.3rem; }
                .failed-message { font-size: 1rem; }
                .recovery-timer { display: none; }
            }
        </style>
    `;
    document.head.insertAdjacentHTML('beforeend', styles);
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========
window.onload = () => {
    addTokenStyles();
    loadProgress();
    loadTokenBalance();
    loadLives();
    renderWelcomeScreen();
    console.log("✅ Викторина «Солдаты» загружена!");
    console.log("💰 Новые правила: правильный ответ = 0 жетонов, неправильный = -1 жетон");
    console.log("❤️ Жизни теряются ТОЛЬКО при непрохождении уровня!");
    console.log("⏱️ Восстановление жизней: +1 каждые 5 минут");
};
