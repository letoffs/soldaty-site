// --------------------------------------------------------------
// ВИКТОРИНА «СОЛДАТЫ» - ОСНОВНАЯ ЛОГИКА
// Данные вопросов загружаются из quiz-levels.js (массив quizLevels)
// Вопросы выводятся в СЛУЧАЙНОМ порядке на каждом уровне
// --------------------------------------------------------------

// Глобальные переменные
let currentLevel = 0;
let currentQuestionIndex = 0;
let userAnswers = [];
let quizCompleted = false;
let quizStarted = false;
let selectedLevel = null;
let shuffledQuestions = [];     // 🔄 Массив для перемешанных вопросов
let originalQuestions = [];     // 📁 Оригинальные вопросы (для сохранения прогресса)

// Структура прогресса (10 уровней)
let progress = {
    level1Score: 0, level2Score: 0, level3Score: 0, level4Score: 0, level5Score: 0,
    level6Score: 0, level7Score: 0, level8Score: 0, level9Score: 0, level10Score: 0,
    level1Passed: false, level2Passed: false, level3Passed: false, level4Passed: false,
    level5Passed: false, level6Passed: false, level7Passed: false, level8Passed: false,
    level9Passed: false, level10Passed: false
};

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

// Функция для перемешивания массива (алгоритм Фишера-Йетса)
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Функция для перемешивания вопросов уровня
function shuffleLevelQuestions(levelIndex) {
    const level = quizLevels[levelIndex];
    if (!level) return [];
    
    // Сохраняем оригинальные вопросы (с правильными ответами и пояснениями)
    originalQuestions = [...level.questions];
    
    // Перемешиваем копию вопросов
    shuffledQuestions = shuffleArray(level.questions);
    
    console.log(`🔄 Вопросы уровня "${level.name}" перемешаны в случайном порядке`);
    return shuffledQuestions;
}

// ========== ПРОВЕРКА ЗАГРУЗКИ ДАННЫХ ==========
function isQuizDataLoaded() {
    if (typeof quizLevels === 'undefined') {
        console.error("❌ ОШИБКА: Данные викторины (quizLevels) не загружены!");
        return false;
    }
    if (!quizLevels || quizLevels.length === 0) {
        console.error("❌ ОШИБКА: quizLevels пуст!");
        return false;
    }
    return true;
}

// ========== РАБОТА С ПРОГРЕССОМ ==========
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
    console.log("Загружен прогресс:", progress);
}

function saveProgress() {
    localStorage.setItem('soldaty_quiz_progress_v2', JSON.stringify(progress));
    console.log("Сохранён прогресс:", progress);
}

// ========== ПРОВЕРКА ДОСТУПНОСТИ УРОВНЯ ==========
function isLevelUnlocked(levelIndex) {
    if (!isQuizDataLoaded()) return false;
    if (levelIndex === 0) return true;
    
    const prevLevelIndex = levelIndex - 1;
    const prevLevelKey = `level${prevLevelIndex + 1}Passed`;
    const isPrevPassed = progress[prevLevelKey] === true;
    
    return isPrevPassed;
}

// ========== СОХРАНЕНИЕ РЕЗУЛЬТАТА ==========
function saveLevelResult(levelIndex, correctCount, passed) {
    const levelNum = levelIndex + 1;
    const scoreKey = `level${levelNum}Score`;
    const passedKey = `level${levelNum}Passed`;
    
    progress[scoreKey] = correctCount;
    if (passed && !progress[passedKey]) {
        progress[passedKey] = true;
        console.log(`✅ Уровень ${levelNum} пройден! Открывается следующий.`);
    } else if (!passed) {
        console.log(`❌ Уровень ${levelNum} не пройден.`);
    }
    
    saveProgress();
}

// ========== ПРИВЕТСТВЕННЫЙ ЭКРАН ==========
function renderWelcomeScreen() {
    if (!isQuizDataLoaded()) {
        quizContainer.innerHTML = `
            <div class="error-screen" style="text-align: center; padding: 40px;">
                <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #e74c3c;"></i>
                <h2>Ошибка загрузки данных!</h2>
                <p>Не удалось загрузить вопросы викторины.</p>
                <p>Убедитесь, что файл <strong>quiz-levels.js</strong> подключен перед <strong>quiz.js</strong>.</p>
                <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer;">Перезагрузить</button>
            </div>
        `;
        return;
    }
    
    const levels = quizLevels;
    
    let html = `
        <div class="welcome-screen">
            <div class="welcome-icon">
                <i class="fas fa-star-of-life"></i>
            </div>
            <h2 class="welcome-title">Викторина «Солдаты»</h2>
            <div class="welcome-text">
                <p>Выберите уровень сложности и проверьте свои знания!</p>
                <p style="font-size: 0.85rem; color: #bd8a3e; margin-top: 10px;">
                    <i class="fas fa-random"></i> Вопросы на каждом уровне выдаются в случайном порядке!
                </p>
            </div>
            
            <div class="levels-container">
    `;
    
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
                <div class="level-requirement">
                    ${!unlocked ? `<i class="fas fa-lock"></i> Требуется пройти "${levels[i-1]?.name}"` : 
                        `<i class="fas fa-check-circle"></i> Доступен`}
                </div>
                ${passed ? `<div class="level-completed">✅ Пройден (${score}/${level.questions.length})</div>` : 
                           `<div class="level-requirement">📋 Нужно ${level.minPass} из ${level.questions.length}</div>`}
            </div>
        `;
    }
    
    html += `
            </div>
            <div class="reset-progress" style="margin-top: 30px; text-align: center;">
                <button id="resetProgressBtn" class="reset-btn" style="background: #e74c3c; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;"><i class="fas fa-trash-alt"></i> Сбросить прогресс</button>
            </div>
        </div>
    `;
    
    quizContainer.innerHTML = html;
    
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
    
    const resetBtn = document.getElementById('resetProgressBtn');
    if (resetBtn) {
        resetBtn.onclick = () => {
            if (confirm('⚠️ ВНИМАНИЕ! Это действие удалит ВЕСЬ ваш прогресс. Вы уверены?')) {
                localStorage.removeItem('soldaty_quiz_progress_v2');
                location.reload();
            }
        };
    }
}

// ========== НАЧАТЬ ВИКТОРИНУ ==========
function startQuiz(levelIndex) {
    if (!isQuizDataLoaded()) return;
    
    if (!isLevelUnlocked(levelIndex)) {
        alert(`Уровень "${quizLevels[levelIndex].name}" недоступен! Сначала пройдите предыдущий уровень.`);
        return;
    }
    
    selectedLevel = levelIndex;
    currentLevel = levelIndex;
    currentQuestionIndex = 0;
    
    // 🔄 ПЕРЕМЕШИВАЕМ ВОПРОСЫ ПРИ СТАРТЕ УРОВНЯ
    shuffleLevelQuestions(levelIndex);
    
    // Инициализируем массив ответов (размер равен количеству перемешанных вопросов)
    userAnswers = new Array(shuffledQuestions.length).fill(null);
    quizStarted = true;
    quizCompleted = false;
    renderCurrentQuestion();
}

// ========== ПОЛУЧИТЬ ТЕКУЩИЙ ВОПРОС (из перемешанного массива) ==========
function getCurrentQuestion() {
    return shuffledQuestions[currentQuestionIndex];
}

// ========== ОТОБРАЖЕНИЕ ТЕКУЩЕГО ВОПРОСА ==========
function renderCurrentQuestion() {
    if (!quizStarted) {
        renderWelcomeScreen();
        return;
    }
    
    if (quizCompleted) {
        return;
    }
    
    const level = quizLevels[currentLevel];
    const question = getCurrentQuestion();
    const selectedAnswer = userAnswers[currentQuestionIndex];
    const totalQuestions = shuffledQuestions.length;
    
    const html = `
        <div class="quiz-card">
            <div class="level-badge">
                <span class="level-icon">${level.icon}</span>
                <span class="level-name">${level.name}</span>
                <span class="level-requirement-mini" style="margin-left: auto; font-size: 12px;">
                    <i class="fas fa-random"></i> Нужно ${level.minPass}/${totalQuestions}
                </span>
            </div>
            <div class="quiz-progress">
                Вопрос ${currentQuestionIndex + 1} из ${totalQuestions}
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${((currentQuestionIndex + 1) / totalQuestions) * 100}%"></div>
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
                ${currentQuestionIndex < totalQuestions - 1 ? 
                    '<button id="nextBtn" class="quiz-nav-btn primary">Далее <i class="fas fa-arrow-right"></i></button>' : 
                    '<button id="submitBtn" class="quiz-nav-btn success"><i class="fas fa-check"></i> Завершить уровень</button>'}
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
    if (currentQuestionIndex < totalQuestions - 1) {
        const nextBtn = document.getElementById('nextBtn');
        if (nextBtn) nextBtn.onclick = nextQuestion;
    } else {
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) submitBtn.onclick = submitQuiz;
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

// ========== ПОДСЧЁТ РЕЗУЛЬТАТОВ И ИХ ОТОБРАЖЕНИЕ ==========
function submitQuiz() {
    if (!quizStarted || quizCompleted) return;
    
    const unanswered = userAnswers.some(a => a === null);
    if (unanswered) {
        alert('Ответьте на все вопросы!');
        return;
    }

    if (typeof logQuizResult === 'function') {
        logQuizResult(level.name, correctCount, total, passed);
    }
    
    const level = quizLevels[currentLevel];
    let correctCount = 0;
    
    // Собираем детальную информацию о каждом ответе (из перемешанного порядка)
    const detailedResults = [];
    for (let i = 0; i < shuffledQuestions.length; i++) {
        const q = shuffledQuestions[i];
        const answer = userAnswers[i];
        const isCorrect = (answer === q.correct);
        if (isCorrect) correctCount++;
        
        detailedResults.push({
            questionText: q.question,
            userAnswerText: q.options[answer],
            correctAnswerText: q.options[q.correct],
            isCorrect: isCorrect,
            explanation: q.explanation
        });
    }
    
    const passed = correctCount >= level.minPass;
    const percentage = Math.round((correctCount / shuffledQuestions.length) * 100);
    
    // Сохраняем результат
    saveLevelResult(currentLevel, correctCount, passed);
    
    quizCompleted = true;
    
    // ОТОБРАЖАЕМ ПОЛНЫЙ ЭКРАН РЕЗУЛЬТАТОВ
    renderResultsScreen(correctCount, shuffledQuestions.length, percentage, passed, detailedResults, level);
}

function renderResultsScreen(correctCount, total, percentage, passed, detailedResults, level) {
    const nextLevelName = currentLevel + 1 < quizLevels.length ? quizLevels[currentLevel + 1].name : '—';
    
    // Генерация HTML для детальных результатов
    let detailsHtml = '';
    for (let i = 0; i < detailedResults.length; i++) {
        const r = detailedResults[i];
        detailsHtml += `
            <div class="result-detail-card ${r.isCorrect ? 'correct' : 'incorrect'}">
                <div class="result-detail-header">
                    <span class="result-detail-num">Вопрос ${i + 1}</span>
                    <span class="result-detail-status">${r.isCorrect ? '✅ Верно' : '❌ Неверно'}</span>
                </div>
                <div class="result-detail-question">${escapeHtml(r.questionText)}</div>
                <div class="result-detail-answer">
                    <div class="your-answer">📝 Ваш ответ: ${escapeHtml(r.userAnswerText)}</div>
                    ${!r.isCorrect ? `<div class="correct-answer">✓ Правильный ответ: ${escapeHtml(r.correctAnswerText)}</div>` : ''}
                </div>
                <div class="result-detail-explanation">
                    <i class="fas fa-info-circle"></i> ${escapeHtml(r.explanation)}
                </div>
            </div>
        `;
    }
    
    const html = `
        <div class="results-fullscreen">
            <div class="results-header">
                <i class="fas fa-trophy"></i>
                <h2>Результаты уровня «${level.name}»</h2>
            </div>
            
            <div class="results-summary">
                <div class="summary-score">
                    <div class="score-circle">
                        <span class="score-number">${correctCount}</span>
                        <span class="score-total">/${total}</span>
                    </div>
                    <div class="score-percent">${percentage}%</div>
                </div>
                
                <div class="summary-status ${passed ? 'success' : 'fail'}">
                    ${passed ? '🎉 ПОЗДРАВЛЯЮ! УРОВЕНЬ ПРОЙДЕН! 🎉' : '😔 К СОЖАЛЕНИЮ, УРОВЕНЬ НЕ ПРОЙДЕН 😔'}
                </div>
                
                <div class="summary-info">
                    <div class="info-item">
                        <i class="fas fa-check-circle"></i>
                        <span>Правильных ответов: ${correctCount}</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-times-circle"></i>
                        <span>Неправильных ответов: ${total - correctCount}</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-graduation-cap"></i>
                        <span>Требовалось для прохода: ${level.minPass} из ${total}</span>
                    </div>
                </div>
                
                ${passed && currentLevel + 1 < quizLevels.length ? `
                    <div class="next-level-unlock">
                        <i class="fas fa-unlock-alt"></i> Открыт новый уровень: «${nextLevelName}»!
                    </div>
                ` : ''}
                
                ${!passed ? `
                    <div class="fail-message">
                        <i class="fas fa-redo-alt"></i> Попробуйте ещё раз! Вам нужно набрать ${level.minPass} правильных ответов.
                    </div>
                ` : ''}
            </div>
            
            <div class="results-details-title">
                <i class="fas fa-list-alt"></i> Подробный разбор всех вопросов:
            </div>
            
            <div class="results-details-list">
                ${detailsHtml}
            </div>
            
            <div class="results-buttons">
                ${!passed ? `<button id="retryBtn" class="result-btn retry-btn"><i class="fas fa-redo"></i> Пройти заново</button>` : ''}
                <button id="menuBtn" class="result-btn menu-btn"><i class="fas fa-home"></i> К выбору уровня</button>
                ${passed && currentLevel + 1 < quizLevels.length ? 
                    `<button id="nextLevelBtn" class="result-btn next-btn"><i class="fas fa-arrow-right"></i> Следующий уровень</button>` : ''}
            </div>
        </div>
    `;
    
    quizContainer.innerHTML = html;
    
    // Навешиваем обработчики
    if (!passed) {
        const retryBtn = document.getElementById('retryBtn');
        if (retryBtn) {
            retryBtn.onclick = () => {
                quizStarted = false;
                startQuiz(currentLevel);
            };
        }
    }
    
    const menuBtn = document.getElementById('menuBtn');
    if (menuBtn) {
        menuBtn.onclick = () => {
            quizStarted = false;
            renderWelcomeScreen();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };
    }
    
    const nextLevelBtn = document.getElementById('nextLevelBtn');
    if (nextLevelBtn) {
        nextLevelBtn.onclick = () => {
            if (currentLevel + 1 < quizLevels.length && isLevelUnlocked(currentLevel + 1)) {
                quizStarted = false;
                startQuiz(currentLevel + 1);
            } else {
                alert('Сначала обновите страницу, чтобы открылись новые уровни!');
                quizStarted = false;
                renderWelcomeScreen();
            }
        };
    }
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

// ========== ЗАПУСК ==========
window.onload = () => {
    loadProgress();
    renderWelcomeScreen();
    console.log("✅ Викторина «Солдаты» загружена!");
    console.log("🔄 Вопросы на каждом уровне будут выдаваться в случайном порядке!");
    
    if (typeof quizLevels !== 'undefined') {
        console.log(`📊 Загружено ${quizLevels.length} уровней, ${quizLevels.reduce((sum, l) => sum + l.questions.length, 0)} вопросов`);
    } else {
        console.error("❌ quizLevels не определён! Подключите quiz-levels.js ПЕРЕД quiz.js");
    }
};
