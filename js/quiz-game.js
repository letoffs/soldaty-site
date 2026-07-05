class QuizGame {
    constructor() {
        this.db = firebase.database();
        this.quizRef = this.db.ref('quiz');
        this.categories = {};
        this.score = 0;
        this.answeredQuestions = new Set();
        this.totalQuestions = 0;
        this.answeredCount = 0;
        this.currentQuestion = null;
        this.isAdmin = false;
        this.adminEmail = 'twinkjjjjkmnb@gmail.com';
        this.adminClickCount = 0;
        this.adminModeActivated = false;
        this.timerInterval = null;
        this.timeLeft = 10;
        this.userAnswer = '';
        this.isAnswerSubmitted = false;
        this.costs = ['100', '200', '300', '400', '500', '600', '700', '800', '900', '1000'];
        this.defaultCategories = [
            { id: 'characters', name: 'Персонажи' },
            { id: 'quotes', name: 'Цитаты' },
            { id: 'plot', name: 'Сюжет' },
            { id: 'army', name: 'Армейская жизнь' },
            { id: 'events', name: 'События' },
            { id: 'songs', name: 'Песни' },
            { id: 'facts', name: 'Факты' },
            { id: 'actors', name: 'Актёры' },
            { id: 'locations', name: 'Места' },
            { id: 'humor', name: 'Юмор' }
        ];
        
        this.init();
    }

    async init() {
        await this.checkAdminStatus();
        await this.initializeCategories();
        this.renderGameBoard();
        this.setupEventListeners();
        
        if (this.isAdmin) {
            this.setupAdminEasterEgg();
        }
    }

    async checkAdminStatus() {
        return new Promise((resolve) => {
            const unsubscribe = firebase.auth().onAuthStateChanged((user) => {
                this.isAdmin = user && user.email === this.adminEmail;
                
                if (document.querySelector('.game-container')) {
                    this.renderGameBoard();
                }
                
                if (this.isAdmin) {
                    this.setupAdminEasterEgg();
                }
                
                unsubscribe();
                resolve();
            });
        });
    }

    async initializeCategories() {
        try {
            const snapshot = await this.quizRef.child('categories').once('value');
            const data = snapshot.val();
            
            if (!data || Object.keys(data).length === 0) {
                const categoriesData = {};
                this.defaultCategories.forEach(cat => {
                    categoriesData[cat.id] = {
                        name: cat.name,
                        questions: {}
                    };
                });
                
                await this.quizRef.child('categories').set(categoriesData);
                this.categories = categoriesData;
                console.log('Созданы категории-заглушки');
            } else {
                this.categories = data;
                console.log('Загружено ' + Object.keys(this.categories).length + ' категорий');
            }
            
            this.calculateTotalQuestions();
            
        } catch (error) {
            console.error('Ошибка инициализации:', error);
        }
    }

    calculateTotalQuestions() {
        this.totalQuestions = 0;
        Object.values(this.categories).forEach(cat => {
            if (cat.questions) {
                this.totalQuestions += Object.keys(cat.questions).length;
            }
        });
    }

    setupAdminEasterEgg() {
        if (!this.isAdmin) return;

        console.log('Админ-панель активирована');
        
        this.removeEasterEgg();
        this.createEasterEggInFooter();

        document.addEventListener('click', (e) => {
            const target = e.target.closest('.footer-easter-egg');
            if (target && this.isAdmin) {
                this.adminClickCount++;
                
                if (this.adminClickCount === 5) {
                    this.adminClickCount = 0;
                    this.activateAdminMode();
                }
                
                this.showEasterDot(e.clientX, e.clientY);
                
                if (this.adminClickCount > 0 && this.adminClickCount < 5) {
                    this.showEasterProgress(this.adminClickCount);
                }
            }
        });
    }

    removeEasterEgg() {
        const oldEaster = document.querySelector('.footer-easter-egg');
        if (oldEaster) oldEaster.remove();
        
        const oldProgress = document.getElementById('easterProgress');
        if (oldProgress) oldProgress.remove();
    }

    createEasterEggInFooter() {
        if (!this.isAdmin) return;

        setTimeout(() => {
            const footer = document.querySelector('.footer');
            if (!footer) {
                setTimeout(() => this.createEasterEggInFooter(), 500);
                return;
            }

            const oldEaster = footer.querySelector('.footer-easter-egg');
            if (oldEaster) oldEaster.remove();

            const easterZone = document.createElement('div');
            easterZone.className = 'footer-easter-egg';
            easterZone.style.cssText = `
                display: inline-block;
                position: relative;
                cursor: pointer;
                padding: 8px 20px;
                margin: 5px auto;
                border-radius: 4px;
                transition: all 0.3s ease;
                user-select: none;
                background: rgba(189, 138, 62, 0.05);
                border: 1px solid rgba(189, 138, 62, 0.15);
                font-size: 0.85rem;
                color: #bd8a3e;
                opacity: 0.6;
                font-family: 'Gotham Pro', sans-serif;
                letter-spacing: 0.5px;
            `;
            
            easterZone.innerHTML = `
                <span style="transition: opacity 0.3s;">[ Админ-панель ]</span>
                <span class="easter-hint" style="
                    position: absolute;
                    bottom: 100%;
                    left: 50%;
                    transform: translateX(-50%);
                    color: #bd8a3e;
                    font-size: 0.5rem;
                    opacity: 0.4;
                    white-space: nowrap;
                    transition: opacity 0.3s;
                    pointer-events: none;
                    font-family: 'Gotham Pro', sans-serif;
                    letter-spacing: 0.5px;
                ">
                    клик 5 раз для входа
                </span>
            `;
            
            const footerContent = footer.querySelector('.footer-content') || footer;
            footerContent.appendChild(easterZone);

            easterZone.addEventListener('mouseenter', () => {
                if (this.isAdmin) {
                    easterZone.style.borderColor = 'rgba(189, 138, 62, 0.5)';
                    easterZone.style.background = 'rgba(189, 138, 62, 0.12)';
                    easterZone.style.opacity = '1';
                    const hint = easterZone.querySelector('.easter-hint');
                    if (hint) hint.style.opacity = '0.8';
                }
            });
            
            easterZone.addEventListener('mouseleave', () => {
                if (!this.adminModeActivated) {
                    easterZone.style.borderColor = 'rgba(189, 138, 62, 0.15)';
                    easterZone.style.background = 'rgba(189, 138, 62, 0.05)';
                    easterZone.style.opacity = '0.6';
                    const hint = easterZone.querySelector('.easter-hint');
                    if (hint) hint.style.opacity = '0.4';
                }
            });

            console.log('Админ-панель: клик 5 раз по зоне в футере');
        }, 500);
    }

    showEasterDot(x, y) {
        const dot = document.createElement('span');
        dot.className = 'admin-easter-dot';
        dot.style.cssText = `
            position: fixed;
            width: 10px;
            height: 10px;
            background: #bd8a3e;
            border-radius: 50%;
            pointer-events: none;
            z-index: 9999;
            opacity: 0.8;
            transition: all 0.6s ease;
        `;
        dot.style.left = (x - 5) + 'px';
        dot.style.top = (y - 5) + 'px';
        document.body.appendChild(dot);
        
        setTimeout(() => {
            dot.style.opacity = '0';
            dot.style.transform = 'scale(3)';
            setTimeout(() => dot.remove(), 600);
        }, 400);
    }

    showEasterProgress(count) {
        let progress = document.getElementById('easterProgress');
        if (!progress) {
            progress = document.createElement('div');
            progress.id = 'easterProgress';
            progress.style.cssText = `
                position: fixed;
                bottom: 100px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0,0,0,0.9);
                color: #bd8a3e;
                padding: 8px 20px;
                border-radius: 4px;
                font-size: 0.9rem;
                font-family: 'Gotham Pro', sans-serif;
                z-index: 9998;
                border: 1px solid #bd8a3e;
                transition: all 0.3s;
                pointer-events: none;
                letter-spacing: 2px;
            `;
            document.body.appendChild(progress);
        }
        
        const filled = '•'.repeat(count);
        const empty = '○'.repeat(5 - count);
        progress.innerHTML = '[ ' + filled + empty + ' ]';
        progress.style.opacity = '1';
        
        clearTimeout(progress._timeout);
        progress._timeout = setTimeout(() => {
            progress.style.opacity = '0';
            setTimeout(() => {
                if (progress.parentNode) progress.remove();
            }, 300);
        }, 1500);
    }

    activateAdminMode() {
        if (!this.isAdmin) {
            this.showFeedback('Доступ запрещён', 'error');
            return;
        }

        this.adminModeActivated = true;
        this.showFeedback('Админ-панель активирована', 'success');
        
        const progress = document.getElementById('easterProgress');
        if (progress) progress.remove();
        
        setTimeout(() => {
            this.openAdminPanel();
        }, 500);

        this.updateFooterEasterEgg(true);
    }

    deactivateAdminMode() {
        if (!this.isAdmin) return;
        
        this.adminModeActivated = false;
        this.adminClickCount = 0;
        this.showFeedback('Админ-панель закрыта', 'info');
        this.renderGameBoard();
        this.updateFooterEasterEgg(false);
    }

    updateFooterEasterEgg(active) {
        if (!this.isAdmin) return;
        
        const easterZone = document.querySelector('.footer-easter-egg');
        if (easterZone) {
            if (active) {
                easterZone.style.borderColor = '#bd8a3e';
                easterZone.style.background = 'rgba(189, 138, 62, 0.2)';
                easterZone.style.opacity = '1';
                const text = easterZone.querySelector('span:first-child');
                if (text) text.textContent = '[ АДМИН АКТИВЕН ]';
                const hint = easterZone.querySelector('.easter-hint');
                if (hint) {
                    hint.textContent = 'клик чтобы закрыть';
                    hint.style.color = '#bd8a3e';
                    hint.style.opacity = '0.9';
                }
                easterZone.onclick = () => this.deactivateAdminMode();
            } else {
                easterZone.style.borderColor = 'rgba(189, 138, 62, 0.15)';
                easterZone.style.background = 'rgba(189, 138, 62, 0.05)';
                easterZone.style.opacity = '0.6';
                const text = easterZone.querySelector('span:first-child');
                if (text) text.textContent = '[ Админ-панель ]';
                const hint = easterZone.querySelector('.easter-hint');
                if (hint) {
                    hint.textContent = 'клик 5 раз для входа';
                    hint.style.color = '#bd8a3e';
                    hint.style.opacity = '0.4';
                }
                easterZone.onclick = null;
            }
        }
    }

    renderGameBoard() {
        const container = document.getElementById('quizContainer');
        const categories = Object.keys(this.categories);
        
        let hasQuestions = false;
        Object.values(this.categories).forEach(cat => {
            if (cat.questions && Object.keys(cat.questions).length > 0) {
                hasQuestions = true;
            }
        });
        
        if (!hasQuestions) {
            container.innerHTML = `
                <div class="game-container">
                    <div class="game-header">
                        <div class="game-title">
                            <i class="fas fa-gamepad"></i>
                            ВИКТОРИНА
                            <span class="game-subtitle">Своя игра</span>
                        </div>
                    </div>
                    
                    <!-- ФОТО ВНУТРИ КОНТЕЙНЕРА -->
                    <div class="quiz-banner">
                        <img src="Resources/soldaty_quiz_preview.jpg" alt="Викторина Солдаты" class="quiz-banner-image">
                    </div>
                    
                    <div class="welcome-screen">
                        <h2 class="welcome-title">Викторина «Солдаты»</h2>
                        <div class="welcome-text">
                            <p>Проверьте свои знания о культовом сериале в формате «Своей игры»!</p>
                            <div class="welcome-features">
                                <div class="feature">
                                    <i class="fas fa-layer-group"></i>
                                    <span>10 категорий</span>
                                </div>
                                <div class="feature">
                                    <i class="fas fa-question-circle"></i>
                                    <span>До 100 вопросов</span>
                                </div>
                                <div class="feature">
                                    <i class="fas fa-trophy"></i>
                                    <span>Проверь знания</span>
                                </div>
                            </div>
                            ${this.isAdmin ? `
                                <div class="admin-hint">
                                    <i class="fas fa-key"></i>
                                    Админ: клик 5 раз по [Админ-панель] в футере для добавления вопросов
                                </div>
                            ` : `
                                <div class="admin-hint" style="color: #5a7a5a; border-color: #2a3a2a;">
                                    <i class="fas fa-info-circle"></i>
                                    Вопросы ещё не добавлены. Обратитесь к администратору
                                </div>
                            `}
                        </div>
                    </div>
                </div>
            `;
            return;
        }

        let html = `
            <div class="game-container">
                <div class="game-header">
                    <div class="game-title">
                        <i class="fas fa-gamepad"></i>
                        ВИКТОРИНА
                        <span class="game-subtitle">Своя игра</span>
                        ${this.adminModeActivated ? '<span class="admin-badge">АДМИН</span>' : ''}
                    </div>
                    <div class="game-stats">
                        <div class="stat-item">
                            <i class="fas fa-coins"></i>
                            <span id="scoreDisplay">${this.score}</span>
                        </div>
                        <div class="stat-item">
                            <i class="fas fa-check-circle"></i>
                            <span id="answeredDisplay">${this.answeredCount}/${this.totalQuestions}</span>
                        </div>
                    </div>
                </div>

                <div class="quiz-banner">
                    <img src="Resources/soldaty_quiz_preview.jpg" alt="Викторина Солдаты" class="quiz-banner-image">
                </div>

                ${this.adminModeActivated ? `
                    <div class="admin-controls">
                        <button onclick="game.openAddQuestionPanel()" class="admin-btn primary">
                            <i class="fas fa-plus-circle"></i> Добавить вопрос
                        </button>
                        <button onclick="game.openEditQuestionsPanel()" class="admin-btn" style="background: #2a4a2a; color: #8ad08a;">
                            <i class="fas fa-edit"></i> Редактировать вопросы
                        </button>
                        <button onclick="game.openCategoryManager()" class="admin-btn">
                            <i class="fas fa-folder-plus"></i> Категории
                        </button>
                        <button onclick="game.resetGame()" class="admin-btn danger">
                            <i class="fas fa-redo"></i> Сбросить
                        </button>
                        <button onclick="game.refreshQuestions()" class="admin-btn">
                            <i class="fas fa-sync"></i> Обновить
                        </button>
                    </div>
                ` : this.isAdmin ? `
                    <div style="text-align: center; padding: 8px; color: #3a5a3a; font-size: 0.7rem; opacity: 0.6; border-bottom: 1px dashed #2a3a2a; margin-bottom: 15px;">
                        Админ: клик 5 раз по [Админ-панель] в футере
                        <span style="display: inline-block; margin-left: 10px; background: #1a2a1a; padding: 0 10px; border-radius: 4px; color: #5a7a5a;">
                            ${this.totalQuestions} вопросов
                        </span>
                    </div>
                ` : `
                    <div style="text-align: center; padding: 8px; color: #3a5a3a; font-size: 0.7rem; opacity: 0.5; border-bottom: 1px dashed #2a3a2a; margin-bottom: 15px;">
                        Викторина в режиме ожидания
                        <span style="display: inline-block; margin-left: 10px; background: #1a2a1a; padding: 0 10px; border-radius: 4px; color: #5a7a5a;">
                            ${this.totalQuestions} вопросов
                        </span>
                    </div>
                `}

                <div class="game-board">
                    <div class="board-header">
                        <div class="board-corner"></div>
                        ${categories.map(catId => `
                            <div class="category-header" data-category="${catId}">
                                <span class="category-name">${this.categories[catId].name}</span>
                                <span class="category-count">
                                    ${this.categories[catId].questions ? Object.keys(this.categories[catId].questions).length : 0}
                                </span>
                            </div>
                        `).join('')}
                    </div>
                    
                    ${this.costs.map(cost => `
                        <div class="board-row">
                            <div class="cost-label">${cost}</div>
                            ${categories.map(catId => {
                                const question = this.categories[catId]?.questions?.[cost];
                                const isAnswered = this.answeredQuestions.has(`${catId}_${cost}`);
                                const hasQuestion = !!question;
                                
                                return `
                                    <div class="board-cell ${isAnswered ? 'answered' : ''} ${hasQuestion ? '' : 'empty'}"
                                        data-category="${catId}"
                                        data-cost="${cost}"
                                        ${hasQuestion && !isAnswered ? `onclick="game.selectQuestion('${catId}', '${cost}')"` : ''}
                                        title="${hasQuestion ? 'Открыть вопрос' : 'Нет вопроса'}"
                                        style="${!hasQuestion ? 'background: #0a120a; color: #1a2a1a; border-color: #1a2a1a; cursor: default;' : ''}">
                                        ${isAnswered ? '<i class="fas fa-check"></i>' : (hasQuestion ? cost : '')}
                                        ${!hasQuestion ? '·' : ''}
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        container.innerHTML = html;
        this.updateStats();
        this.updateFooterEasterEgg(this.adminModeActivated);
    }

    async selectQuestion(categoryId, cost) {
        if (this.answeredQuestions.has(`${categoryId}_${cost}`)) {
            return;
        }

        const questionData = this.categories[categoryId]?.questions?.[cost];
        if (!questionData) {
            this.showFeedback('Вопрос не найден', 'error');
            return;
        }

        this.currentQuestion = {
            categoryId,
            cost,
            ...questionData
        };

        this.showQuestionModal();
    }

    showQuestionModal() {
        this.stopTimer();
        this.isAnswerSubmitted = false;
        this.timeLeft = 10;
        this.userAnswer = '';
        
        const modal = document.createElement('div');
        modal.className = 'question-modal';
        modal.id = 'questionModal';
        
        const isAdmin = this.adminModeActivated;
        
        modal.innerHTML = `
            <div class="question-modal-content">
                <div class="question-header">
                    <div class="question-category">
                        ${this.categories[this.currentQuestion.categoryId].name}
                    </div>
                    <div class="question-cost">${this.currentQuestion.cost}</div>
                    <button class="question-close" onclick="game.closeQuestion()">&times;</button>
                </div>
                
                <div class="question-body">
                    <div class="question-text">${this.currentQuestion.question}</div>
                    
                    <!-- Поле ввода ответа -->
                    <div class="answer-input-area" id="answerInputArea">
                        <div class="input-wrapper">
                            <input type="text" id="userAnswerInput" placeholder="Введите ответ..." autocomplete="off">
                        </div>
                        <div class="input-controls">
                            <div class="timer-display">
                                <span id="timerText">⏱ 10 сек</span>
                                <div class="timer-bar">
                                    <div class="timer-fill" id="timerFill" style="width: 100%;"></div>
                                </div>
                            </div>
                            <button onclick="game.submitAnswer()" class="question-btn primary" id="submitBtn" disabled>
                                <i class="fas fa-hourglass-half"></i> Ожидайте
                            </button>
                        </div>
                        <div class="input-hint" id="inputHint">Введите ответ. Кнопка станет активной через 10 секунд</div>
                    </div>
                    
                    <!-- Блок результата -->
                    <div id="resultBlock" style="display: none;">
                        <div class="answer-divider"></div>
                        <div id="resultMessage" class="result-message"></div>
                        <div class="answer-text" id="correctAnswerDisplay">
                            <strong>Правильный ответ:</strong> ${this.currentQuestion.answer}
                        </div>
                        ${this.currentQuestion.explanation ? `
                            <div class="answer-explanation">
                                <i class="fas fa-info-circle"></i>
                                ${this.currentQuestion.explanation}
                            </div>
                        ` : ''}
                        <div class="answer-actions">
                            <button onclick="game.continueGame()" class="question-btn primary">
                                <i class="fas fa-arrow-right"></i> Продолжить
                            </button>
                            ${isAdmin ? `
                                <button onclick="game.editCurrentQuestion()" class="question-btn" style="background: #2a3a2a; color: #ddd;">
                                    <i class="fas fa-edit"></i> Редактировать
                                </button>
                                <button onclick="game.deleteCurrentQuestion()" class="question-btn" style="background: #4a1a1a; color: #ff6b6b;">
                                    <i class="fas fa-trash"></i> Удалить
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.style.display = 'flex';

        setTimeout(() => {
            const input = document.getElementById('userAnswerInput');
            if (input) {
                input.focus();
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' && !document.getElementById('submitBtn').disabled) {
                        this.submitAnswer();
                    }
                });
            }
        }, 300);

        this.startTimer();
    }

    startTimer() {
        this.stopTimer();
        this.timeLeft = 10;
        this.isAnswerSubmitted = false;
        
        const timerText = document.getElementById('timerText');
        const timerFill = document.getElementById('timerFill');
        const submitBtn = document.getElementById('submitBtn');
        const inputHint = document.getElementById('inputHint');
        const input = document.getElementById('userAnswerInput');
        
        this.timerInterval = setInterval(() => {
            this.timeLeft--;
            
            if (timerText) {
                timerText.textContent = '⏱ ' + this.timeLeft + ' сек';
            }
            
            if (timerFill) {
                const percent = (this.timeLeft / 10) * 100;
                timerFill.style.width = percent + '%';
                
                if (this.timeLeft > 5) {
                    timerFill.style.background = '#2d7d2d';
                } else if (this.timeLeft > 3) {
                    timerFill.style.background = '#bd8a3e';
                } else {
                    timerFill.style.background = '#7d2d2d';
                }
            }
            
            if (this.timeLeft <= 0) {
                this.stopTimer();
                
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Ответить';
                    submitBtn.style.background = '#bd8a3e';
                    submitBtn.style.color = '#0f1a0f';
                    submitBtn.style.cursor = 'pointer';
                }
                
                if (inputHint) {
                    inputHint.textContent = 'Введите ответ и нажмите "Ответить" или Enter';
                    inputHint.style.color = '#bd8a3e';
                }
                
                if (timerText) {
                    timerText.textContent = '⏱ 0 сек';
                }
                
                if (input) {
                    input.focus();
                }
            }
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    submitAnswer() {
        if (this.isAnswerSubmitted) return;
        
        const input = document.getElementById('userAnswerInput');
        const userAnswer = input.value.trim();
        
        if (!userAnswer) {
            this.showFeedback('Введите ответ!', 'error');
            input.focus();
            return;
        }

        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn.disabled) {
            this.showFeedback('Подождите ' + this.timeLeft + ' секунд!', 'error');
            return;
        }

        this.isAnswerSubmitted = true;
        this.userAnswer = userAnswer;
        
        this.stopTimer();
        
        const isCorrect = userAnswer.toLowerCase().trim() === this.currentQuestion.answer.toLowerCase().trim();
        
        this.showResult(isCorrect);
    }

    showResult(isCorrect) {
        const inputArea = document.getElementById('answerInputArea');
        const resultBlock = document.getElementById('resultBlock');
        const resultMessage = document.getElementById('resultMessage');
        const cost = parseInt(this.currentQuestion.cost);
        
        if (inputArea) inputArea.style.display = 'none';
        if (resultBlock) resultBlock.style.display = 'block';
        
        if (isCorrect) {
            this.score += cost;
            resultMessage.innerHTML = `
                <div class="result-correct">
                    <i class="fas fa-check-circle"></i>
                    <span>Правильно! +${cost} очков</span>
                </div>
                <div class="result-user-answer">
                    Ваш ответ: <strong>${this.userAnswer}</strong>
                </div>
            `;
            resultMessage.style.borderColor = '#2d7d2d';
            this.showFeedback('Правильно! +' + cost + ' очков', 'success');
        } else {
            this.score -= cost;
            resultMessage.innerHTML = `
                <div class="result-wrong">
                    <i class="fas fa-times-circle"></i>
                    <span>Неправильно! -${cost} очков</span>
                </div>
                <div class="result-user-answer">
                    Ваш ответ: <strong>${this.userAnswer}</strong>
                </div>
            `;
            resultMessage.style.borderColor = '#7d2d2d';
            this.showFeedback('Неправильно! -' + cost + ' очков', 'error');
        }

        const key = this.currentQuestion.categoryId + '_' + this.currentQuestion.cost;
        this.answeredQuestions.add(key);
        this.answeredCount++;

        this.updateStats();
    }

    continueGame() {
        this.closeQuestion();
        this.renderGameBoard();

        if (this.answeredCount === this.totalQuestions && this.totalQuestions > 0) {
            setTimeout(() => this.showGameComplete(), 500);
        }
    }

    closeQuestion() {
        this.stopTimer();
        this.isAnswerSubmitted = false;
        const modal = document.getElementById('questionModal');
        if (modal) modal.remove();
    }

    editCurrentQuestion() {
        if (!this.isAdmin) {
            this.showFeedback('Доступ запрещён', 'error');
            return;
        }

        this.closeQuestion();
        this.openEditQuestionForm(this.currentQuestion);
    }

    openEditQuestionForm(question) {
        const modal = document.createElement('div');
        modal.className = 'admin-modal';
        modal.innerHTML = `
            <div class="admin-modal-content">
                <div class="admin-modal-header">
                    <h3>Редактировать вопрос</h3>
                    <button class="admin-modal-close" onclick="this.closest('.admin-modal').remove()">&times;</button>
                </div>
                <form id="editQuestionForm" class="admin-form">
                    <div class="form-group">
                        <label>Категория</label>
                        <select id="editCategory">
                            ${Object.keys(this.categories).map(id => `
                                <option value="${id}" ${id === question.categoryId ? 'selected' : ''}>
                                    ${this.categories[id].name}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Стоимость</label>
                        <select id="editCost">
                            ${this.costs.map(cost => `
                                <option value="${cost}" ${cost === question.cost ? 'selected' : ''}>
                                    ${cost}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Вопрос</label>
                        <textarea id="editQuestion" rows="3">${question.question}</textarea>
                    </div>
                    <div class="form-group">
                        <label>Ответ</label>
                        <input type="text" id="editAnswer" value="${question.answer}">
                    </div>
                    <div class="form-group">
                        <label>Пояснение</label>
                        <textarea id="editExplanation" rows="2">${question.explanation || ''}</textarea>
                    </div>
                    <div class="form-actions">
                        <button type="button" onclick="this.closest('.admin-modal').remove()" class="admin-btn cancel">Отмена</button>
                        <button type="submit" class="admin-btn submit">
                            <i class="fas fa-save"></i> Сохранить
                        </button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
        modal.style.display = 'flex';

        document.getElementById('editQuestionForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveEditedQuestion(question);
        });
    }

    async saveEditedQuestion(oldQuestion) {
        if (!this.isAdmin) {
            this.showFeedback('Доступ запрещён', 'error');
            return;
        }

        const newCategory = document.getElementById('editCategory').value;
        const newCost = document.getElementById('editCost').value;
        const question = document.getElementById('editQuestion').value.trim();
        const answer = document.getElementById('editAnswer').value.trim();
        const explanation = document.getElementById('editExplanation').value.trim();

        if (!question || !answer) {
            this.showFeedback('Вопрос и ответ обязательны', 'error');
            return;
        }

        try {
            // Если изменилась категория или стоимость — удаляем старый и создаём новый
            if (newCategory !== oldQuestion.categoryId || newCost !== oldQuestion.cost) {
                // Удаляем старый
                const oldPath = 'categories/' + oldQuestion.categoryId + '/questions/' + oldQuestion.cost;
                await this.quizRef.child(oldPath).remove();
                
                // Создаём новый
                const newPath = 'categories/' + newCategory + '/questions/' + newCost;
                await this.quizRef.child(newPath).set({
                    question: question,
                    answer: answer,
                    explanation: explanation || ''
                });
            } else {
                // Обновляем существующий
                const path = 'categories/' + oldQuestion.categoryId + '/questions/' + oldQuestion.cost;
                await this.quizRef.child(path).update({
                    question: question,
                    answer: answer,
                    explanation: explanation || ''
                });
            }
            
            this.showFeedback('Вопрос обновлён', 'success');
            document.querySelector('.admin-modal').remove();
            await this.initializeCategories();
            this.renderGameBoard();
        } catch (error) {
            console.error('Ошибка обновления:', error);
            this.showFeedback('Ошибка при обновлении вопроса', 'error');
        }
    }

    async deleteCurrentQuestion() {
        if (!this.isAdmin) {
            this.showFeedback('Доступ запрещён', 'error');
            return;
        }

        if (!confirm('Удалить вопрос "' + this.currentQuestion.question + '"?')) return;

        try {
            const path = 'categories/' + this.currentQuestion.categoryId + '/questions/' + this.currentQuestion.cost;
            await this.quizRef.child(path).remove();
            
            this.showFeedback('Вопрос удалён', 'info');
            this.closeQuestion();
            await this.initializeCategories();
            this.renderGameBoard();
        } catch (error) {
            console.error('Ошибка удаления:', error);
            this.showFeedback('Ошибка при удалении вопроса', 'error');
        }
    }

    openAdminPanel() {
        if (!this.isAdmin) {
            this.showFeedback('Доступ запрещён', 'error');
            return;
        }

        if (!this.adminModeActivated) {
            this.showFeedback('Активируй админ-панель через [Админ-панель] в футере', 'error');
            return;
        }

        // Просто показываем основную панель управления
        this.renderGameBoard();
    }

    openAddQuestionPanel() {
        if (!this.isAdmin || !this.adminModeActivated) {
            this.showFeedback('Доступ запрещён', 'error');
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'admin-modal';
        modal.innerHTML = `
            <div class="admin-modal-content">
                <div class="admin-modal-header">
                    <h3>Добавить вопрос</h3>
                    <button class="admin-modal-close" onclick="this.closest('.admin-modal').remove()">&times;</button>
                </div>
                <form id="addQuestionForm" class="admin-form">
                    <div class="form-group">
                        <label>Категория</label>
                        <select id="adminCategory" required>
                            <option value="">Выберите категорию</option>
                            ${Object.keys(this.categories).map(id => `
                                <option value="${id}">${this.categories[id].name}</option>
                            `).join('')}
                            <option value="new">+ Создать новую категорию</option>
                        </select>
                    </div>
                    
                    <div class="form-group" id="newCategoryGroup" style="display: none;">
                        <label>Название новой категории</label>
                        <input type="text" id="newCategoryName" placeholder="Например: Актёры">
                    </div>
                    
                    <div class="form-group">
                        <label>Стоимость вопроса</label>
                        <select id="adminCost" required>
                            <option value="">Выберите стоимость</option>
                            ${this.costs.map(cost => `
                                <option value="${cost}">${cost}</option>
                            `).join('')}
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Вопрос</label>
                        <textarea id="adminQuestion" required placeholder="Введите текст вопроса..." rows="3"></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label>Ответ</label>
                        <input type="text" id="adminAnswer" required placeholder="Введите правильный ответ">
                    </div>
                    
                    <div class="form-group">
                        <label>Пояснение (необязательно)</label>
                        <textarea id="adminExplanation" placeholder="Дополнительная информация..." rows="2"></textarea>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" onclick="this.closest('.admin-modal').remove()" class="admin-btn cancel">Отмена</button>
                        <button type="submit" class="admin-btn submit">
                            <i class="fas fa-save"></i> Сохранить
                        </button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
        modal.style.display = 'flex';

        document.getElementById('adminCategory').addEventListener('change', function() {
            const newCategoryGroup = document.getElementById('newCategoryGroup');
            if (this.value === 'new') {
                newCategoryGroup.style.display = 'block';
            } else {
                newCategoryGroup.style.display = 'none';
            }
        });

        document.getElementById('addQuestionForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.addQuestionToFirebase();
        });
    }

    openEditQuestionsPanel() {
        if (!this.isAdmin || !this.adminModeActivated) {
            this.showFeedback('Доступ запрещён', 'error');
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'admin-modal';
        modal.innerHTML = `
            <div class="admin-modal-content" style="max-width: 900px; max-height: 90vh;">
                <div class="admin-modal-header">
                    <h3>РЕДАКТИРОВАНИЕ ВОПРОСОВ</h3>
                    <button class="admin-modal-close" onclick="this.closest('.admin-modal').remove()">&times;</button>
                </div>
                <div class="questions-edit-container">
                    ${Object.entries(this.categories).map(([catId, cat]) => {
                        const questions = cat.questions || {};
                        const questionEntries = Object.entries(questions);
                        
                        return `
                            <div class="category-edit-block">
                                <div class="category-edit-header">
                                    <span class="category-edit-name">${cat.name}</span>
                                    <span class="category-edit-count">${questionEntries.length} вопросов</span>
                                    <button onclick="game.addQuestionToCategory('${catId}')" class="admin-btn small primary" style="margin-left: auto;">
                                        <i class="fas fa-plus"></i>
                                    </button>
                                </div>
                                <div class="questions-edit-grid">
                                    ${questionEntries.length > 0 ? questionEntries.map(([cost, q]) => `
                                        <div class="question-edit-item" data-category="${catId}" data-cost="${cost}">
                                            <div class="question-edit-cost">${cost}</div>
                                            <div class="question-edit-text" title="${q.question}">${q.question}</div>
                                            <div class="question-edit-actions">
                                                <button onclick="game.openEditQuestionFormFromList('${catId}', '${cost}')" class="admin-btn small" title="Редактировать">
                                                    <i class="fas fa-pen"></i>
                                                </button>
                                                <button onclick="game.deleteQuestionFromList('${catId}', '${cost}')" class="admin-btn small danger" title="Удалить">
                                                    <i class="fas fa-trash"></i>
                                                </button>
                                            </div>
                                        </div>
                                    `).join('') : `
                                        <div class="empty-questions-message">
                                            <i class="fas fa-info-circle"></i>
                                            Нет вопросов в этой категории
                                            <button onclick="game.addQuestionToCategory('${catId}')" class="admin-btn small primary" style="margin-left: 10px;">
                                                <i class="fas fa-plus"></i> Добавить
                                            </button>
                                        </div>
                                    `}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
                <div class="form-actions" style="padding-top: 15px; border-top: 1px solid #3e5a3e;">
                    <button onclick="this.closest('.admin-modal').remove()" class="admin-btn cancel">
                        <i class="fas fa-times"></i> Закрыть
                    </button>
                    <button onclick="game.addQuestionToCategory('new')" class="admin-btn primary">
                        <i class="fas fa-plus-circle"></i> Новая категория
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.style.display = 'flex';
    }

    addQuestionToCategory(categoryId) {
        if (!this.isAdmin || !this.adminModeActivated) {
            this.showFeedback('Доступ запрещён', 'error');
            return;
        }

        // Закрываем панель редактирования
        document.querySelector('.admin-modal')?.remove();

        if (categoryId === 'new') {
            this.openAddQuestionPanel();
            return;
        }

        // Открываем форму добавления с предвыбранной категорией
        const modal = document.createElement('div');
        modal.className = 'admin-modal';
        modal.innerHTML = `
            <div class="admin-modal-content">
                <div class="admin-modal-header">
                    <h3><i class="fas fa-plus-circle"></i> Добавить вопрос в "${this.categories[categoryId].name}"</h3>
                    <button class="admin-modal-close" onclick="this.closest('.admin-modal').remove()">&times;</button>
                </div>
                <form id="addQuestionForm" class="admin-form">
                    <div class="form-group" style="display: none;">
                        <select id="adminCategory">
                            <option value="${categoryId}" selected>${this.categories[categoryId].name}</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label><i class="fas fa-dollar-sign"></i> Стоимость вопроса</label>
                        <select id="adminCost" required>
                            <option value="">Выберите стоимость</option>
                            ${this.costs.map(cost => `
                                <option value="${cost}">${cost}</option>
                            `).join('')}
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label><i class="fas fa-question-circle"></i> Вопрос</label>
                        <textarea id="adminQuestion" required placeholder="Введите текст вопроса..." rows="3"></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label><i class="fas fa-check-circle"></i> Ответ</label>
                        <input type="text" id="adminAnswer" required placeholder="Введите правильный ответ">
                    </div>
                    
                    <div class="form-group">
                        <label><i class="fas fa-info-circle"></i> Пояснение (необязательно)</label>
                        <textarea id="adminExplanation" placeholder="Дополнительная информация..." rows="2"></textarea>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" onclick="this.closest('.admin-modal').remove()" class="admin-btn cancel">Отмена</button>
                        <button type="submit" class="admin-btn submit">
                            <i class="fas fa-save"></i> Сохранить
                        </button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
        modal.style.display = 'flex';

        document.getElementById('addQuestionForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.addQuestionToFirebaseWithCategory(categoryId);
        });
    }

    async addQuestionToFirebaseWithCategory(categoryId) {
        if (!this.isAdmin) {
            this.showFeedback('Доступ запрещён', 'error');
            return;
        }

        const cost = document.getElementById('adminCost').value;
        const question = document.getElementById('adminQuestion').value.trim();
        const answer = document.getElementById('adminAnswer').value.trim();
        const explanation = document.getElementById('adminExplanation').value.trim();

        if (!cost || !question || !answer) {
            this.showFeedback('Заполните все обязательные поля', 'error');
            return;
        }

        try {
            await this.quizRef.child('categories/' + categoryId + '/questions/' + cost).set({
                question: question,
                answer: answer,
                explanation: explanation || ''
            });
            
            this.showFeedback('Вопрос добавлен в "' + this.categories[categoryId].name + '"', 'success');
            document.querySelector('.admin-modal').remove();
            await this.initializeCategories();
            this.renderGameBoard();
            
            // Открываем панель редактирования заново
            setTimeout(() => this.openEditQuestionsPanel(), 300);
        } catch (error) {
            console.error('Ошибка добавления вопроса:', error);
            this.showFeedback('Ошибка при добавлении вопроса', 'error');
        }
    }

    openEditQuestionFormFromList(categoryId, cost) {
        const question = this.categories[categoryId]?.questions?.[cost];
        if (!question) {
            this.showFeedback('Вопрос не найден', 'error');
            return;
        }

        const oldQuestion = {
            categoryId: categoryId,
            cost: cost,
            question: question.question,
            answer: question.answer,
            explanation: question.explanation || ''
        };

        this.openEditQuestionForm(oldQuestion);
        document.querySelector('.admin-modal')?.remove();
    }

    async deleteQuestionFromList(categoryId, cost) {
        if (!confirm('Удалить этот вопрос?')) return;

        try {
            const path = 'categories/' + categoryId + '/questions/' + cost;
            await this.quizRef.child(path).remove();
            
            this.showFeedback('Вопрос удалён', 'info');
            await this.initializeCategories();
            this.renderGameBoard();
            document.querySelector('.admin-modal')?.remove();
        } catch (error) {
            console.error('Ошибка удаления:', error);
            this.showFeedback('Ошибка при удалении вопроса', 'error');
        }
    }

    async addQuestionToFirebase() {
        if (!this.isAdmin) {
            this.showFeedback('Доступ запрещён', 'error');
            return;
        }

        const categorySelect = document.getElementById('adminCategory');
        let categoryId = categorySelect.value;
        const cost = document.getElementById('adminCost').value;
        const question = document.getElementById('adminQuestion').value.trim();
        const answer = document.getElementById('adminAnswer').value.trim();
        const explanation = document.getElementById('adminExplanation').value.trim();

        if (!categoryId || !cost || !question || !answer) {
            this.showFeedback('Заполните все обязательные поля', 'error');
            return;
        }

        if (categoryId === 'new') {
            const newName = document.getElementById('newCategoryName').value.trim();
            
            if (!newName) {
                this.showFeedback('Введите название новой категории', 'error');
                return;
            }

            categoryId = newName.toLowerCase().replace(/[^a-zа-яё]/g, '_');
            
            try {
                await this.quizRef.child('categories/' + categoryId).set({
                    name: newName,
                    questions: {}
                });
                this.showFeedback('Категория "' + newName + '" создана', 'success');
                await this.initializeCategories();
                this.renderGameBoard();
            } catch (error) {
                console.error('Ошибка создания категории:', error);
                this.showFeedback('Ошибка создания категории', 'error');
                return;
            }
        }

        try {
            await this.quizRef.child('categories/' + categoryId + '/questions/' + cost).set({
                question: question,
                answer: answer,
                explanation: explanation || ''
            });
            
            this.showFeedback('Вопрос добавлен', 'success');
            document.querySelector('.admin-modal').remove();
            await this.initializeCategories();
            this.renderGameBoard();
        } catch (error) {
            console.error('Ошибка добавления вопроса:', error);
            this.showFeedback('Ошибка при добавлении вопроса', 'error');
        }
    }

    openCategoryManager() {
        if (!this.isAdmin) {
            this.showFeedback('Доступ запрещён', 'error');
            return;
        }

        if (!this.adminModeActivated) {
            this.showFeedback('Активируй админ-панель через [Админ-панель] в футере', 'error');
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'admin-modal';
        modal.innerHTML = `
            <div class="admin-modal-content">
                <div class="admin-modal-header">
                    <h3>Управление категориями</h3>
                    <button class="admin-modal-close" onclick="this.closest('.admin-modal').remove()">&times;</button>
                </div>
                <div class="category-list">
                    ${Object.entries(this.categories).map(([id, cat]) => `
                        <div class="category-item" data-category="${id}">
                            <div class="category-item-info">
                                <span class="category-item-name">${cat.name}</span>
                                <span class="category-item-count">${cat.questions ? Object.keys(cat.questions).length : 0} вопросов</span>
                            </div>
                            <div class="category-item-actions">
                                <button onclick="game.editCategory('${id}')" class="admin-btn small">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button onclick="game.deleteCategory('${id}')" class="admin-btn small danger">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="form-actions">
                    <button onclick="this.closest('.admin-modal').remove()" class="admin-btn cancel">Закрыть</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.style.display = 'flex';
    }

    async editCategory(categoryId) {
        if (!this.isAdmin) {
            this.showFeedback('Доступ запрещён', 'error');
            return;
        }

        const cat = this.categories[categoryId];
        if (!cat) return;

        const newName = prompt('Новое название категории:', cat.name);
        if (newName && newName.trim() !== cat.name) {
            try {
                await this.quizRef.child('categories/' + categoryId + '/name').set(newName.trim());
                this.showFeedback('Название категории обновлено', 'success');
                await this.initializeCategories();
                this.renderGameBoard();
            } catch (error) {
                this.showFeedback('Ошибка обновления', 'error');
            }
        }

        document.querySelector('.admin-modal')?.remove();
    }

    async deleteCategory(categoryId) {
        if (!this.isAdmin) {
            this.showFeedback('Доступ запрещён', 'error');
            return;
        }

        if (!confirm('Удалить категорию "' + this.categories[categoryId]?.name + '" и все её вопросы?')) return;

        try {
            await this.quizRef.child('categories/' + categoryId).remove();
            this.showFeedback('Категория удалена', 'info');
            await this.initializeCategories();
            this.renderGameBoard();
            document.querySelector('.admin-modal')?.remove();
        } catch (error) {
            this.showFeedback('Ошибка удаления', 'error');
        }
    }

    updateStats() {
        const scoreEl = document.getElementById('scoreDisplay');
        const answeredEl = document.getElementById('answeredDisplay');
        
        if (scoreEl) scoreEl.textContent = this.score;
        if (answeredEl) answeredEl.textContent = this.answeredCount + '/' + this.totalQuestions;
    }

    showFeedback(message, type) {
        const feedback = document.createElement('div');
        feedback.className = 'game-feedback ' + type;
        feedback.textContent = message;
        document.body.appendChild(feedback);
        
        setTimeout(() => feedback.classList.add('show'), 100);
        setTimeout(() => {
            feedback.classList.remove('show');
            setTimeout(() => feedback.remove(), 300);
        }, 2000);
    }

    showGameComplete() {
        const modal = document.createElement('div');
        modal.className = 'game-complete-modal';
        modal.innerHTML = `
            <div class="game-complete-content">
                <h2>Викторина завершена</h2>
                <div class="final-score">${this.score} очков</div>
                <div class="final-stats">
                    <div>Отвечено: ${this.answeredCount} из ${this.totalQuestions}</div>
                    <div>${this.score > 0 ? 'Отлично! Ты настоящий знаток сериала!' : 'В следующий раз получится!'}</div>
                </div>
                <button onclick="game.resetGame()" class="question-btn primary">
                    <i class="fas fa-redo"></i> Играть снова
                </button>
            </div>
        `;
        document.body.appendChild(modal);
        modal.style.display = 'flex';
    }

    resetGame() {
        if (!this.isAdmin && this.adminModeActivated) {
            this.showFeedback('Доступ запрещён', 'error');
            return;
        }

        this.score = 0;
        this.answeredQuestions = new Set();
        this.answeredCount = 0;
        this.currentQuestion = null;
        this.stopTimer();
        
        document.querySelectorAll('.question-modal, .game-complete-modal').forEach(el => el.remove());
        this.renderGameBoard();
        this.showFeedback('Игра сброшена', 'info');
    }

    refreshQuestions() {
        if (!this.isAdmin) {
            this.showFeedback('Доступ запрещён', 'error');
            return;
        }
        
        this.initializeCategories();
        this.showFeedback('Вопросы обновлены', 'info');
    }

    setupEventListeners() {
        this.quizRef.child('categories').on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                this.categories = data;
                this.calculateTotalQuestions();
                if (document.querySelector('.game-board')) {
                    this.renderGameBoard();
                }
            }
        });

        firebase.auth().onAuthStateChanged((user) => {
            const wasAdmin = this.isAdmin;
            this.isAdmin = user && user.email === this.adminEmail;
            
            if (this.isAdmin && !wasAdmin) {
                this.setupAdminEasterEgg();
                this.renderGameBoard();
            } else if (!this.isAdmin && wasAdmin) {
                this.adminModeActivated = false;
                this.removeEasterEgg();
                this.renderGameBoard();
            }
        });
    }
}

let game;

document.addEventListener('DOMContentLoaded', () => {
    const checkFirebase = setInterval(() => {
        if (typeof firebase !== 'undefined' && firebase.database) {
            clearInterval(checkFirebase);
            game = new QuizGame();
        }
    }, 500);
});