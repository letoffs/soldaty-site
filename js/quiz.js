// Глобальные переменные
let currentLevel = 0;
let currentQuestionIndex = 0;
let userAnswers = [];
let quizCompleted = false;
let quizStarted = false;
let selectedLevel = null;

// Структура прогресса (10 уровней)
let progress = {
    level1Score: 0, level2Score: 0, level3Score: 0, level4Score: 0, level5Score: 0,
    level6Score: 0, level7Score: 0, level8Score: 0, level9Score: 0, level10Score: 0,
    level1Passed: false, level2Passed: false, level3Passed: false, level4Passed: false,
    level5Passed: false, level6Passed: false, level7Passed: false, level8Passed: false,
    level9Passed: false, level10Passed: false
};

// Загрузка прогресса из localStorage
function loadProgress() {
    const saved = localStorage.getItem('soldaty_quiz_progress_v2');
    if (saved) {
        try {
            const loaded = JSON.parse(saved);
            // Объединяем с дефолтным прогрессом (на случай новых полей)
            Object.assign(progress, loaded);
        } catch(e) {
            console.error("Ошибка загрузки прогресса", e);
        }
    }
    console.log("Загружен прогресс:", progress);
}

// Сохранение прогресса
function saveProgress() {
    localStorage.setItem('soldaty_quiz_progress_v2', JSON.stringify(progress));
    console.log("Сохранён прогресс:", progress);
}

// Проверка доступности уровня (levelIndex: 0-9)
function isLevelUnlocked(levelIndex) {
    if (levelIndex === 0) return true; // Рядовой открыт всегда
    
    const prevLevelIndex = levelIndex - 1;
    const prevLevelKey = `level${prevLevelIndex + 1}Passed`;
    const isPrevPassed = progress[prevLevelKey] === true;
    
    console.log(`Проверка уровня ${levelIndex+1}: предыдущий уровень ${prevLevelIndex+1} пройден = ${isPrevPassed}`);
    return isPrevPassed;
}

// Сохранить результат после прохождения уровня
function saveLevelResult(levelIndex, correctCount, passed) {
    const levelNum = levelIndex + 1;
    const scoreKey = `level${levelNum}Score`;
    const passedKey = `level${levelNum}Passed`;
    
    progress[scoreKey] = correctCount;
    if (passed && !progress[passedKey]) {
        progress[passedKey] = true;
        console.log(`✅ Уровень ${levelNum} пройден! Открывается следующий.`);
    } else if (!passed) {
        console.log(`❌ Уровень ${levelNum} не пройден. Нужно ${quizLevels[levelIndex].minPass} правильных, получено ${correctCount}`);
    }
    
    saveProgress();
}

// Получить следующий уровень для открытия (нужно для отладки)
function getNextLockedLevel() {
    for (let i = 0; i < quizLevels.length; i++) {
        if (!isLevelUnlocked(i)) {
            return i + 1;
        }
    }
    return null;
}

// ------------------------------------------------------------------
// ПРИВЕТСТВЕННЫЙ ЭКРАН С ВЫБОРОМ УРОВНЯ
// ------------------------------------------------------------------
function renderWelcomeScreen() {
    const levels = quizLevels;
    
    let html = `
        <div class="welcome-screen">
            <div class="welcome-icon">
                <i class="fas fa-star-of-life"></i>
            </div>
            <h2 class="welcome-title">Викторина «Солдаты»</h2>
            <div class="welcome-text">
                <p>Выберите уровень сложности и проверьте свои знания!</p>
            </div>
            
            <div class="levels-container">
    `;
    
    for (let i = 0; i < levels.length; i++) {
        const level = levels[i];
        const unlocked = isLevelUnlocked(i);
        const passed = progress[`level${i+1}Passed`] === true;
        
        html += `
            <div class="level-card ${!unlocked ? 'locked' : ''}" data-level="${i}">
                <div class="level-icon">${level.icon}</div>
                <div class="level-name">${level.name}</div>
                <div class="level-desc">${level.description}</div>
                <div class="level-requirement">
                    ${!unlocked ? `<i class="fas fa-lock"></i> Требуется пройти уровень "${levels[i-1]?.name}"` : 
                        `<i class="fas fa-check-circle"></i> Доступен`}
                </div>
                ${passed ? '<div class="level-completed">✅ Пройден</div>' : ''}
                ${!unlocked && i > 0 && progress[`level${i}Passed`] ? '<div class="level-completed">🔓 Откроется после перезагрузки</div>' : ''}
            </div>
        `;
    }
    
    html += `
            </div>
        </div>
    `;
    
    quizContainer.innerHTML = html;
    
    // Навешиваем обработчики на карточки уровней
    document.querySelectorAll('.level-card').forEach(card => {
        const levelIdx = parseInt(card.dataset.level);
        if (isLevelUnlocked(levelIdx)) {
            card.style.cursor = 'pointer';
            card.onclick = () => startQuiz(levelIdx);
        } else {
            card.style.cursor = 'not-allowed';
            card.onclick = () => {
                alert(`Уровень "${quizLevels[levelIdx].name}" пока недоступен. Сначала пройдите предыдущий уровень "${quizLevels[levelIdx-1]?.name}"!`);
            };
        }
    });
}

// ------------------------------------------------------------------
// НАЧАТЬ ВИКТОРИНУ
// ------------------------------------------------------------------
function startQuiz(levelIndex) {
    if (!isLevelUnlocked(levelIndex)) {
        alert(`Уровень "${quizLevels[levelIndex].name}" недоступен! Сначала пройдите предыдущий уровень.`);
        return;
    }
    
    selectedLevel = levelIndex;
    currentLevel = levelIndex;
    currentQuestionIndex = 0;
    userAnswers = new Array(quizLevels[levelIndex].questions.length).fill(null);
    quizStarted = true;
    quizCompleted = false;
    renderCurrentQuestion();
}

// ------------------------------------------------------------------
// ОСНОВНАЯ ЛОГИКА ВИКТОРИНЫ
// ------------------------------------------------------------------
function renderCurrentQuestion() {
    if (!quizStarted) {
        renderWelcomeScreen();
        return;
    }
    
    if (quizCompleted) {
        renderResults();
        return;
    }
    
    const level = quizLevels[currentLevel];
    const questions = level.questions;
    const question = questions[currentQuestionIndex];
    const selectedAnswer = userAnswers[currentQuestionIndex];
    
    const html = `
        <div class="quiz-card">
            <div class="level-badge">
                <span class="level-icon">${level.icon}</span>
                <span class="level-name">${level.name}</span>
            </div>
            <div class="quiz-progress">
                Вопрос ${currentQuestionIndex + 1} из ${questions.length}
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${((currentQuestionIndex + 1) / questions.length) * 100}%"></div>
                </div>
            </div>
            
            <div class="quiz-question">
                <i class="fas fa-question-circle"></i> ${escapeHtml(question.question)}
            </div>
            
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
                ${currentQuestionIndex > 0 ? '<button id="prevBtn" class="quiz-nav-btn"><i class="fas fa-arrow-left"></i> Назад</button>' : ''}
                ${currentQuestionIndex < questions.length - 1 ? 
                    '<button id="nextBtn" class="quiz-nav-btn primary">Далее <i class="fas fa-arrow-right"></i></button>' : 
                    '<button id="submitBtn" class="quiz-nav-btn success"><i class="fas fa-check"></i> Завершить</button>'}
            </div>
        </div>
    `;
    
    quizContainer.innerHTML = html;
    
    document.querySelectorAll('.quiz-option').forEach(opt => {
        opt.onclick = () => selectAnswer(parseInt(opt.dataset.optIndex));
    });
    
    if (currentQuestionIndex > 0) {
        document.getElementById('prevBtn').onclick = prevQuestion;
    }
    if (currentQuestionIndex < questions.length - 1) {
        document.getElementById('nextBtn').onclick = nextQuestion;
    } else {
        document.getElementById('submitBtn').onclick = submitQuiz;
    }
}

function selectAnswer(optionIndex) {
    if (!quizStarted || quizCompleted) return;
    userAnswers[currentQuestionIndex] = optionIndex;
    renderCurrentQuestion();
}

function nextQuestion() {
    if (!quizStarted || quizCompleted) return;
    if (userAnswers[currentQuestionIndex] !== null) {
        currentQuestionIndex++;
        renderCurrentQuestion();
    } else {
        alert('Пожалуйста, выберите ответ!');
    }
}

function prevQuestion() {
    if (!quizStarted || quizCompleted) return;
    currentQuestionIndex--;
    renderCurrentQuestion();
}

function submitQuiz() {
    if (!quizStarted || quizCompleted) return;
    
    const unanswered = userAnswers.some(a => a === null);
    if (unanswered) {
        alert('Ответьте на все вопросы!');
        return;
    }
    
    const level = quizLevels[currentLevel];
    const questions = level.questions;
    let correctCount = 0;
    
    userAnswers.forEach((answer, idx) => {
        if (answer === questions[idx].correct) correctCount++;
    });
    
    const passed = correctCount >= level.minPass;
    
    // СОХРАНЯЕМ РЕЗУЛЬТАТ
    saveLevelResult(currentLevel, correctCount, passed);
    
    quizCompleted = true;
    renderResults(correctCount, passed);
}

function renderResults(correctCount, passed) {
    const level = quizLevels[currentLevel];
    const total = level.questions.length;
    const percentage = Math.round((correctCount / total) * 100);
    
    let message = '';
    if (passed) {
        message = `Поздравляем! Вы прошли уровень «${level.name}»! ${percentage}% правильных ответов.`;
        if (currentLevel + 1 < quizLevels.length) {
            message += ` Теперь вам открыт уровень «${quizLevels[currentLevel+1].name}»! Обновите страницу, чтобы увидеть изменения.`;
        }
    } else {
        message = `К сожалению, вы не прошли уровень «${level.name}». Нужно ${level.minPass} правильных ответов из ${total}, получено ${correctCount}. Попробуйте ещё раз!`;
    }
    
    const html = `
        <div class="quiz-results">
            <div class="results-header">
                <i class="fas fa-trophy"></i> Результаты уровня «${level.name}»
            </div>
            <div class="results-score">
                <span class="score-number">${correctCount}</span>
                <span class="score-total">/${total}</span>
                <span class="score-percent">(${percentage}%)</span>
            </div>
            <div class="results-message ${passed ? 'success' : 'fail'}">
                ${passed ? '🎉 ' + message : '😔 ' + message}
            </div>
            <div class="results-buttons">
                ${!passed ? `<button id="retryBtn" class="restart-btn"><i class="fas fa-redo"></i> Пройти заново</button>` : ''}
                <button id="menuBtn" class="restart-btn"><i class="fas fa-home"></i> К выбору уровня</button>
            </div>
        </div>
    `;
    
    quizContainer.innerHTML = html;
    
    if (!passed) {
        document.getElementById('retryBtn').onclick = () => {
            quizStarted = false;
            startQuiz(currentLevel);
        };
    }
    document.getElementById('menuBtn').onclick = () => {
        quizStarted = false;
        renderWelcomeScreen();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => m === '&' ? '&amp;' : m === '<' ? '&lt;' : '&gt;');
}

// Запуск
window.onload = () => {
    loadProgress();
    renderWelcomeScreen();
    console.log("✅ Викторина с уровнями загружена!");
    console.log("📊 Текущий прогресс:", progress);
    
    // Выводим информацию о доступных уровнях
    for (let i = 0; i < quizLevels.length; i++) {
        console.log(`Уровень ${i+1} (${quizLevels[i].name}): открыт = ${isLevelUnlocked(i)}`);
    }
};