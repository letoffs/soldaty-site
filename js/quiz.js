// ========== ВИКТОРИНА «СОЛДАТЫ» - ПОЛНАЯ ВЕРСИЯ ==========
// Логика: жетоны начисляются ТОЛЬКО в конце уровня!
// Если ответ правильный - всё показывается бесплатно
// Если ответ неправильный - правильный ответ и пояснение скрыты, нужно купить за 5 жетонов

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
    correctAnswer: 1,
    wrongAnswer: -1,
    hintCost: 3,
    revealAnswerCost: 5,      // Показ правильного ответа и пояснения
    levelCompleteBonus: 2,
    perfectLevelBonus: 5,
    maxDebt: -10
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
    
    // Загружаем разблокированные ответы
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
            <div class="welcome-icon">
                <img src="../Resources/soldaty_quiz_preview.jpg" alt="Викторина Солдаты" class="welcome-image">
            </div>
            <h2 class="welcome-title">Викторина «Солдаты»</h2>
            <div class="welcome-text">
                <p>Выберите уровень сложности!</p>
                <div class="token-rules">
                    <h4><i class="fas fa-coins"></i> Правила игры:</h4>
                    <ul>
                        <li>🎁 Стартовый бонус: <strong>+10 жетонов</strong></li>
                        <li>✅ Правильный ответ: <strong>+1 жетон</strong></li>
                        <li>❌ Неправильный ответ: <strong>-1 жетон</strong></li>
                        <li>💡 Подсказка: <strong>-3 жетона</strong> (удаляет 2 неверных варианта)</li>
                        <li>🏆 Прохождение уровня: <strong>+2 жетона</strong></li>
                        <li>⭐ Идеальное прохождение: <strong>+5 жетонов</strong></li>
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
            if (confirm('⚠️ Удалить прогресс и обнулить жетоны?')) {
                localStorage.removeItem('soldaty_quiz_progress_v2');
                localStorage.removeItem('soldaty_tokens_v2');
                localStorage.removeItem('soldaty_token_history');
                localStorage.removeItem('soldaty_unlocked_answers');
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
    
    renderCurrentQuestion();
}

function renderCurrentQuestion() {
    if (!quizStarted) { renderWelcomeScreen(); return; }
    if (quizCompleted) return;
    
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
    if (quizCompleted) return;
    userAnswers[currentQuestionIndex] = optionIndex;
    renderCurrentQuestion();
}

function nextQuestion() {
    if (!quizStarted || quizCompleted) return;
    
    if (userAnswers[currentQuestionIndex] === null) {
        showFloatingMessage('Выберите ответ!', 'warning');
        return;
    }
    
    if (currentQuestionIndex + 1 < shuffledQuestions.length) {
        currentQuestionIndex++;
        renderCurrentQuestion();
    }
}

function prevQuestion() {
    if (!quizStarted || quizCompleted) return;
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        renderCurrentQuestion();
    }
}

// ========== ПОДСЧЁТ ЖЕТОНОВ В КОНЦЕ УРОВНЯ ==========
function submitQuiz() {
    if (!quizStarted || quizCompleted) return;
    if (!userAnswers.every(a => a !== null)) {
        showFloatingMessage('Ответьте на все вопросы!', 'warning');
        return;
    }
    
    const level = quizLevels[currentLevel];
    const totalQuestions = shuffledQuestions.length;
    let correctCount = 0;
    
    // Считаем правильные ответы
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
    
    // Жетоны за правильные ответы
    if (correctCount > 0) {
        const correctTokens = correctCount * TOKEN_CONFIG.correctAnswer;
        addTokens(correctTokens, `${correctCount} правильных ответов`, true);
        tokenChange += correctTokens;
        tokenDetails.push(`✅ +${correctTokens}`);
    }
    
    // Штраф за неправильные ответы
    if (wrongCount > 0) {
        const wrongTokens = wrongCount * Math.abs(TOKEN_CONFIG.wrongAnswer);
        addTokens(-wrongTokens, `${wrongCount} неправильных ответов`, true);
        tokenChange -= wrongTokens;
        tokenDetails.push(`❌ -${wrongTokens}`);
    }
    
    // Бонус за прохождение уровня
    if (passed) {
        if (allCorrect) {
            addTokens(TOKEN_CONFIG.perfectLevelBonus, `Идеальное прохождение!`, true);
            tokenChange += TOKEN_CONFIG.perfectLevelBonus;
            tokenDetails.push(`⭐ +${TOKEN_CONFIG.perfectLevelBonus}`);
        } else {
            addTokens(TOKEN_CONFIG.levelCompleteBonus, `Прохождение уровня`, true);
            tokenChange += TOKEN_CONFIG.levelCompleteBonus;
            tokenDetails.push(`🏆 +${TOKEN_CONFIG.levelCompleteBonus}`);
        }
    }
    
    // Показываем итоговое сообщение
    const sign = tokenChange >= 0 ? '+' : '';
    showFloatingMessage(`💰 Итого: ${sign}${tokenChange} жетонов! ${tokenDetails.join(' ')}`, tokenChange >= 0 ? 'success' : 'error');
    
    // Сохраняем прогресс
    saveLevelResult(currentLevel, correctCount, passed, allCorrect);
    
    // Собираем детальные результаты для отчёта
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
            isUnlocked: isUnlocked || isCorrect // Правильные ответы всегда разблокированы
        });
    }
    
    quizCompleted = true;
    renderResultsScreen(correctCount, totalQuestions, passed, detailedResults, level, allCorrect, tokenChange);
}

// ========== ФУНКЦИЯ ДЛЯ РАЗБЛОКИРОВКИ ПРАВИЛЬНОГО ОТВЕТА И ПОЯСНЕНИЯ ==========
function unlockAnswer(questionIndex, answerKey, correctAnswerText, explanationText) {
    // Проверяем, не разблокировано ли уже
    if (unlockedAnswers[answerKey]) {
        showFloatingMessage('Правильный ответ уже разблокирован!', 'info');
        return;
    }
    
    // Проверяем достаточно ли жетонов
    if (userTokens < TOKEN_CONFIG.revealAnswerCost) {
        showFloatingMessage(`❌ Недостаточно жетонов! Нужно ${TOKEN_CONFIG.revealAnswerCost}. У вас ${userTokens}`, 'error');
        return;
    }
    
    if (!confirm(`🔓 Открыть правильный ответ и пояснение за ${TOKEN_CONFIG.revealAnswerCost} жетонов?\n\nВаш баланс: ${userTokens} → ${userTokens - TOKEN_CONFIG.revealAnswerCost}`)) {
        return;
    }
    
    // Списываем жетоны
    addTokens(-TOKEN_CONFIG.revealAnswerCost, `Открытие правильного ответа к вопросу ${questionIndex + 1}`);
    
    // Разблокируем
    unlockedAnswers[answerKey] = true;
    saveTokenBalance();
    
    // Обновляем интерфейс
    const hiddenContentDiv = document.getElementById(`hidden-content-${questionIndex}`);
    if (hiddenContentDiv) {
        hiddenContentDiv.innerHTML = `
            <div class="correct-answer">✓ Правильный ответ: ${escapeHtml(correctAnswerText)}</div>
            <div class="explanation-text"><i class="fas fa-info-circle"></i> ${escapeHtml(explanationText)}</div>
        `;
        hiddenContentDiv.classList.remove('hidden-content');
        hiddenContentDiv.classList.add('unlocked-content');
    }
    
    // Скрываем кнопку разблокировки
    const unlockBtn = document.getElementById(`unlock-btn-${questionIndex}`);
    if (unlockBtn) unlockBtn.style.display = 'none';
    
    showFloatingMessage(`🔓 Правильный ответ и пояснение разблокированы! -${TOKEN_CONFIG.revealAnswerCost} жетонов`, 'success');
}

// ========== ОТОБРАЖЕНИЕ РЕЗУЛЬТАТОВ ==========
function renderResultsScreen(correctCount, total, passed, detailedResults, level, allCorrect, tokenChange) {
    const percentage = Math.round((correctCount / total) * 100);
    const nextLevelName = currentLevel + 1 < quizLevels.length ? quizLevels[currentLevel + 1].name : '—';
    
    let detailsHtml = '';
    for (let i = 0; i < detailedResults.length; i++) {
        const r = detailedResults[i];
        const isUnlocked = r.isUnlocked;
        
        if (r.isCorrect) {
            // Правильный ответ - всё показываем бесплатно
            detailsHtml += `
                <div class="result-detail-card correct">
                    <div class="result-detail-header">
                        <span class="result-detail-num">Вопрос ${i + 1}</span>
                        <span class="result-detail-status">✅ Верно</span>
                    </div>
                    <div class="result-detail-question">${escapeHtml(r.questionText)}</div>
                    <div class="result-detail-answer">
                        <div class="your-answer">📝 Ваш ответ: ${escapeHtml(r.userAnswerText)}</div>
                        <div class="correct-answer">✓ Правильный ответ: ${escapeHtml(r.correctAnswerText)}</div>
                    </div>
                    <div class="explanation-text"><i class="fas fa-info-circle"></i> ${escapeHtml(r.explanation)}</div>
                </div>
            `;
        } else {
            // Неправильный ответ - правильный ответ и пояснение скрыты
            detailsHtml += `
                <div class="result-detail-card incorrect">
                    <div class="result-detail-header">
                        <span class="result-detail-num">Вопрос ${i + 1}</span>
                        <span class="result-detail-status">❌ Неверно</span>
                        ${!isUnlocked ? `<span class="locked-badge"><i class="fas fa-lock"></i> <i class="fas fa-coins"></i> ${TOKEN_CONFIG.revealAnswerCost}</span>` : ''}
                    </div>
                    <div class="result-detail-question">${escapeHtml(r.questionText)}</div>
                    <div class="result-detail-answer">
                        <div class="your-answer">📝 Ваш ответ: ${escapeHtml(r.userAnswerText)}</div>
                        ${isUnlocked ? 
                            `<div class="correct-answer">✓ Правильный ответ: ${escapeHtml(r.correctAnswerText)}</div>` : 
                            `<div class="correct-answer hidden">✓ Правильный ответ: <span class="blur-text">●●●●●●●●●</span></div>`
                        }
                    </div>
                    <div id="hidden-content-${i}" class="hidden-answer-content ${isUnlocked ? 'unlocked' : 'locked'}">
                        ${isUnlocked ? 
                            `<div class="correct-answer">✓ Правильный ответ: ${escapeHtml(r.correctAnswerText)}</div>
                             <div class="explanation-text"><i class="fas fa-info-circle"></i> ${escapeHtml(r.explanation)}</div>` : 
                            `<div class="locked-placeholder">
                                <i class="fas fa-lock"></i> Правильный ответ и пояснение скрыты
                                <button id="unlock-btn-${i}" class="unlock-answer-btn" data-index="${i}" data-key="${r.answerKey}" data-correct="${escapeHtml(r.correctAnswerText)}" data-explanation="${escapeHtml(r.explanation)}">
                                    <i class="fas fa-coins"></i> Открыть за ${TOKEN_CONFIG.revealAnswerCost} жетонов
                                </button>
                            </div>`
                        }
                    </div>
                </div>
            `;
        }
    }
    
    const html = `
        <div class="results-fullscreen">
            <div class="results-header"><i class="fas fa-trophy"></i><h2>Результаты уровня «${level.name}»</h2></div>
            <div class="results-summary">
                <div class="summary-score">
                    <div class="score-circle"><span class="score-number">${correctCount}</span><span class="score-total">/${total}</span></div>
                    <div class="score-percent">${percentage}%</div>
                </div>
                <div class="summary-status ${passed ? 'success' : 'fail'}">
                    ${passed ? '🎉 ПОЗДРАВЛЯЮ! УРОВЕНЬ ПРОЙДЕН! 🎉' : '😔 УРОВЕНЬ НЕ ПРОЙДЕН 😔'}
                </div>
                <div class="summary-info">
                    <div class="info-item"><i class="fas fa-check-circle"></i> Правильно: ${correctCount}</div>
                    <div class="info-item"><i class="fas fa-times-circle"></i> Неправильно: ${total - correctCount}</div>
                    <div class="info-item"><i class="fas fa-coins"></i> Жетонов: ${tokenChange >= 0 ? '+' : ''}${tokenChange}</div>
                </div>
                ${allCorrect ? `<div class="perfect-bonus"><i class="fas fa-star"></i> ИДЕАЛЬНО! +5 жетонов!</div>` : ''}
                ${passed && currentLevel + 1 < quizLevels.length ? `<div class="next-level-unlock"><i class="fas fa-unlock-alt"></i> Открыт уровень «${nextLevelName}»!</div>` : ''}
                ${!passed ? `<div class="fail-message"><i class="fas fa-redo-alt"></i> Нужно ${level.minPass} правильных ответов.</div>` : ''}
            </div>
            <div class="results-details-title"><i class="fas fa-list-alt"></i> Подробный разбор:</div>
            <div class="results-details-list">${detailsHtml}</div>
            <div class="results-buttons">
                ${!passed ? `<button id="retryBtn" class="result-btn retry-btn"><i class="fas fa-redo"></i> Пройти заново</button>` : ''}
                <button id="menuBtn" class="result-btn menu-btn"><i class="fas fa-home"></i> К выбору уровня</button>
                ${passed && currentLevel + 1 < quizLevels.length ? `<button id="nextLevelBtn" class="result-btn next-btn"><i class="fas fa-arrow-right"></i> Следующий уровень</button>` : ''}
            </div>
        </div>
    `;
    
    quizContainer.innerHTML = html;
    
    // Навешиваем обработчики на кнопки разблокировки
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
    
    if (!passed) {
        const retryBtn = document.getElementById('retryBtn');
        if (retryBtn) retryBtn.onclick = () => { quizStarted = false; startQuiz(currentLevel); };
    }
    
    const menuBtn = document.getElementById('menuBtn');
    if (menuBtn) menuBtn.onclick = () => { quizStarted = false; renderWelcomeScreen(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
    
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

// ========== СТИЛИ ==========
function addTokenStyles() {
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
            .token-toast { position: fixed; bottom: 100px; right: 20px; background: #1a2a1a; border-left: 4px solid; padding: 12px 20px; border-radius: 12px; z-index: 2000; transform: translateX(400px); transition: transform 0.3s ease; }
            .token-toast.positive { border-left-color: #4caf50; }
            .token-toast.negative { border-left-color: #f44336; }
            .token-toast.show { transform: translateX(0); }
            .token-toast small { display: block; font-size: 0.7rem; color: #aaa; }
            .floating-message { position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%) translateY(100px); background: #1a2a1a; border: 1px solid #ffd700; padding: 10px 20px; border-radius: 40px; z-index: 2000; transition: transform 0.3s ease; font-size: 0.85rem; white-space: nowrap; }
            .floating-message.show { transform: translateX(-50%) translateY(0); }
            .floating-message.error { border-color: #f44336; color: #ff6b6b; }
            .floating-message.success { border-color: #4caf50; color: #81c784; }
            .floating-message.warning { border-color: #ff9800; color: #ffb74d; }
            .quiz-option.hidden-option { display: none !important; }
            .quiz-header { display: flex; justify-content: space-between; flex-wrap: wrap; margin-bottom: 15px; }
            .quiz-navigation { display: flex; justify-content: space-between; margin-top: 25px; }
            .nav-left, .nav-right { display: flex; gap: 10px; }
            .token-rules { background: #0a120a; border-radius: 16px; padding: 15px; margin-top: 20px; text-align: left; }
            .token-rules h4 { color: #ffd700; margin-bottom: 10px; }
            .token-rules ul { list-style: none; padding: 0; }
            .token-rules li { padding: 5px 0; color: #ccc; font-size: 0.85rem; }
            .perfect-badge { background: linear-gradient(135deg, #ffd700, #ff8c00); color: #1a2a1a; padding: 4px 10px; border-radius: 20px; font-size: 0.7rem; margin-top: 8px; display: inline-block; }
            .perfect-bonus { background: #1e3a1e; border: 1px solid #ffd700; border-radius: 40px; padding: 10px; margin-top: 15px; color: #ffd700; }
            .fail-message { background: #3a1e1e; border: 1px solid #f44336; border-radius: 40px; padding: 10px; margin-top: 15px; color: #f44336; }
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
            .empty-history { text-align: center; color: #8aa07a; padding: 20px; }
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
            .explanation-text { font-size: 0.85rem; color: #8aa07a; margin-top: 8px; padding: 8px; background: #0f1a0f; border-radius: 8px; }
            .locked-badge { background: #e74c3c; padding: 3px 10px; border-radius: 20px; font-size: 0.7rem; color: white; }
            .locked-placeholder { text-align: center; padding: 15px; background: #1e2a1e; border-radius: 12px; }
            .unlock-answer-btn { background: #3498db; border: none; padding: 10px 20px; border-radius: 30px; color: white; cursor: pointer; font-size: 0.85rem; margin-top: 10px; transition: all 0.2s; }
            .unlock-answer-btn:hover { background: #2980b9; transform: scale(1.02); }
            @media (max-width: 700px) {
                .token-display { top: auto; bottom: 70px; right: 10px; padding: 5px 12px; }
                .token-display #tokenAmount { font-size: 1rem; }
                .floating-message { white-space: normal; max-width: 90%; text-align: center; }
                .quiz-navigation { flex-direction: column; gap: 10px; }
                .nav-left, .nav-right { justify-content: center; }
                .result-detail-header { flex-direction: column; align-items: flex-start; }
            }
        </style>
    `;
    document.head.insertAdjacentHTML('beforeend', styles);
}

// ========== СИСТЕМА ПОКУПКИ ЖЕТОНОВ ==========

// Открытие магазина
function openShopModal() {
    const modal = document.getElementById('shopModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

function closeShopModal() {
    const modal = document.getElementById('shopModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Функция покупки токенов (интеграция с платежной системой)
async function buyTokens(tokens, price) {
    if (!confirm(`Купить ${tokens} жетонов за ${price} ₽?`)) {
        return;
    }
    
    // Показываем загрузку
    showFloatingMessage('🔄 Перенаправление на оплату...', 'info');
    
    // Вариант 1: Через Telegram Mini App (если бот)
    if (window.Telegram && Telegram.WebApp) {
        Telegram.WebApp.openInvoice({
            title: `${tokens} жетонов`,
            description: `Покупка ${tokens} жетонов для викторины "Солдаты"`,
            payload: JSON.stringify({ tokens: tokens, price: price }),
            provider_token: "", // Ваш токен от провайдера
            currency: "RUB",
            prices: [{ label: `${tokens} жетонов`, amount: price * 100 }]
        });
        return;
    }
    
    // Вариант 2: Через Stripe Checkout
    try {
        const response = await fetch('/api/create-checkout-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tokens: tokens,
                price: price,
                userId: getCurrentUserId() // Функция получения ID пользователя
            })
        });
        
        const session = await response.json();
        
        // Перенаправление на Stripe Checkout
        if (session.url) {
            window.location.href = session.url;
        }
    } catch (error) {
        console.error('Ошибка платежа:', error);
        showFloatingMessage('❌ Ошибка оплаты. Попробуйте позже.', 'error');
    }
}

// Функция добавления купленных жетонов (вызывается после успешной оплаты)
function addPurchasedTokens(tokens, transactionId) {
    addTokens(tokens, `Покупка ${tokens} жетонов (транзакция: ${transactionId})`);
    showFloatingMessage(`✅ ${tokens} жетонов добавлены на счёт! Спасибо за покупку!`, 'success');
    
    // Сохраняем историю покупок
    savePurchaseHistory(tokens, transactionId);
}

// Сохранение истории покупок
function savePurchaseHistory(tokens, transactionId) {
    const purchases = JSON.parse(localStorage.getItem('soldaty_purchases') || '[]');
    purchases.unshift({
        tokens: tokens,
        transactionId: transactionId,
        date: new Date().toISOString()
    });
    if (purchases.length > 20) purchases.pop();
    localStorage.setItem('soldaty_purchases', JSON.stringify(purchases));
}

// Функция для тестового режима (без реальной оплаты)
function testBuyTokens(tokens) {
    if (confirm(`🧪 ТЕСТОВЫЙ РЕЖИМ: Добавить ${tokens} тестовых жетонов?`)) {
        addTokens(tokens, `Тестовый режим: +${tokens} жетонов`);
        showFloatingMessage(`🧪 Тестовый режим: +${tokens} жетонов добавлено!`, 'success');
    }
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========
window.onload = () => {
    addTokenStyles();
    loadProgress();
    loadTokenBalance();
    renderWelcomeScreen();
    console.log("✅ Викторина «Солдаты» загружена!");
    console.log("💰 Жетоны начисляются ТОЛЬКО после завершения уровня!");
    console.log("📖 Если ответили ПРАВИЛЬНО — всё показывается бесплатно!");
    console.log("🔐 Если ответили НЕПРАВИЛЬНО — правильный ответ и пояснение скрыты, нужно купить за 5 жетонов!");
};
