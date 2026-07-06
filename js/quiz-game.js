class QuizGame {
    constructor() {
        this.db = firebase.database();
        this.quizRef = this.db.ref('quiz');
        this.usersRef = this.db.ref('users');
        this.categories = {};
        this.score = 0;
        this.answeredQuestions = new Set();
        this.wrongQuestions = new Set();
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
        this.history = [];
        this.currentUser = null;
        this.syncTimeout = null;
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
        await this.loadCurrentUser();
        this.setupSyncListener();
        this.renderGameBoard();
        this.setupEventListeners();
        if (this.isAdmin) {
            this.setupAdminEasterEgg();
        }
    }

    async loadCurrentUser() {
        return new Promise((resolve) => {
            const unsubscribe = firebase.auth().onAuthStateChanged((user) => {
                if (user) {
                    this.currentUser = {
                        uid: user.uid,
                        email: user.email,
                        name: user.displayName || user.email || 'Аноним'
                    };
                    this.loadProgressFromFirebase();
                } else {
                    this.currentUser = null;
                    this.score = 0;
                    this.answeredQuestions = new Set();
                    this.wrongQuestions = new Set();
                    this.answeredCount = 0;
                    this.history = [];
                    this.renderGameBoard();
                }
                resolve();
                unsubscribe();
            });
        });
    }

    setupSyncListener() {
        if (!this.currentUser) return;
        const userProgressRef = this.usersRef.child(this.currentUser.uid + '/quizProgress');
        userProgressRef.on('value', (snapshot) => {
            const data = snapshot.val();
            if (data && !this._isLocalUpdate) {
                this.applyRemoteProgress(data);
            }
            this._isLocalUpdate = false;
        });
    }

    applyRemoteProgress(data) {
        if (!data) return;
        const localAnswered = new Set(this.answeredQuestions);
        const remoteAnswered = new Set(data.answered || []);
        const localWrong = new Set(this.wrongQuestions);
        const remoteWrong = new Set(data.wrong || []);
        const mergedAnswered = new Set([...localAnswered, ...remoteAnswered]);
        const mergedWrong = new Set([...localWrong, ...remoteWrong]);
        const localScore = this.score;
        const remoteScore = data.score || 0;
        this.score = Math.max(localScore, remoteScore);
        this.answeredQuestions = mergedAnswered;
        this.wrongQuestions = mergedWrong;
        this.answeredCount = this.answeredQuestions.size + this.wrongQuestions.size;
        this.history = data.history || this.history;
        if (this.history.length > 50) this.history = this.history.slice(-50);
        this.saveProgressToLocal();
        this.renderGameBoard();
    }

    saveProgressToFirebase() {
        if (!this.currentUser) return;
        this._isLocalUpdate = true;
        const data = {
            score: this.score,
            answered: Array.from(this.answeredQuestions),
            wrong: Array.from(this.wrongQuestions),
            history: this.history.slice(-50),
            userName: this.currentUser.name,
            userEmail: this.currentUser.email,
            updatedAt: Date.now()
        };
        this.usersRef.child(this.currentUser.uid + '/quizProgress').set(data).catch(err => {
            console.error('Ошибка сохранения:', err);
            this._isLocalUpdate = false;
        });
    }

    saveProgressToLocal() {
        if (!this.currentUser) return;
        const key = 'soldaty_quiz_progress_' + this.currentUser.uid;
        const data = {
            score: this.score,
            answered: Array.from(this.answeredQuestions),
            wrong: Array.from(this.wrongQuestions),
            history: this.history.slice(-50),
            userName: this.currentUser.name,
            userEmail: this.currentUser.email,
            updatedAt: Date.now()
        };
        localStorage.setItem(key, JSON.stringify(data));
    }

    loadProgressFromFirebase() {
        if (!this.currentUser) return;
        const key = 'soldaty_quiz_progress_' + this.currentUser.uid;
        const localData = localStorage.getItem(key);
        if (localData) {
            try {
                const data = JSON.parse(localData);
                this.score = data.score || 0;
                this.answeredQuestions = new Set(data.answered || []);
                this.wrongQuestions = new Set(data.wrong || []);
                this.answeredCount = this.answeredQuestions.size + this.wrongQuestions.size;
                this.history = data.history || [];
            } catch (e) {
                console.error('Ошибка загрузки локального прогресса:', e);
            }
        }
        this.usersRef.child(this.currentUser.uid + '/quizProgress').once('value').then(snapshot => {
            const data = snapshot.val();
            if (data) {
                const remoteAnswered = new Set(data.answered || []);
                const remoteWrong = new Set(data.wrong || []);
                const mergedAnswered = new Set([...this.answeredQuestions, ...remoteAnswered]);
                const mergedWrong = new Set([...this.wrongQuestions, ...remoteWrong]);
                this.score = Math.max(this.score, data.score || 0);
                this.answeredQuestions = mergedAnswered;
                this.wrongQuestions = mergedWrong;
                this.answeredCount = this.answeredQuestions.size + this.wrongQuestions.size;
                this.history = data.history || this.history;
                if (this.history.length > 50) this.history = this.history.slice(-50);
                this.saveProgressToLocal();
                this.renderGameBoard();
            } else {
                this.saveProgressToFirebase();
            }
        }).catch(err => console.error('Ошибка загрузки из Firebase:', err));
    }

    saveProgress() {
        this.saveProgressToLocal();
        if (this.syncTimeout) clearTimeout(this.syncTimeout);
        this.syncTimeout = setTimeout(() => {
            this.saveProgressToFirebase();
        }, 500);
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
                resolve();
                unsubscribe();
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
            } else {
                this.categories = data;
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
                            ${this.currentUser ? '<span style="font-size:0.7rem;color:#5a7a5a;margin-left:10px;">' + this.currentUser.name + '</span>' : ''}
                        </div>
                    </div>
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
                        ${this.currentUser ? '<span style="font-size:0.7rem;color:#5a7a5a;margin-left:10px;">' + this.currentUser.name + '</span>' : ''}
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
                        <div class="stat-item" style="cursor:pointer;" onclick="game.resetProgress()" title="Сбросить прогресс">
                            <i class="fas fa-trash"></i>
                            <span style="font-size:0.8rem;">Сбросить</span>
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
                        <button onclick="game.openUserProgressPanel()" class="admin-btn" style="background: #2a3a6a; color: #8ad0ff;">
                            <i class="fas fa-users"></i> Пользователи
                        </button>
                        <button onclick="game.resetGame()" class="admin-btn danger">
                            <i class="fas fa-redo"></i> Сбросить игру
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
                                const isCorrectAnswered = this.answeredQuestions.has(`${catId}_${cost}`);
                                const isWrongAnswered = this.wrongQuestions.has(`${catId}_${cost}`);
                                const isAnswered = isCorrectAnswered || isWrongAnswered;
                                const hasQuestion = !!question;
                                let statusIcon = '';
                                if (isCorrectAnswered) statusIcon = '<i class="fas fa-check" style="color:#2d7d2d;"></i>';
                                else if (isWrongAnswered) statusIcon = '<i class="fas fa-times" style="color:#7d2d2d;"></i>';
                                return `
                                    <div class="board-cell ${isAnswered ? 'answered' : ''} ${hasQuestion ? '' : 'empty'}"
                                        data-category="${catId}"
                                        data-cost="${cost}"
                                        ${hasQuestion && !isAnswered ? `onclick="game.selectQuestion('${catId}', '${cost}')"` : ''}
                                        title="${hasQuestion ? (isAnswered ? 'Уже отвечено' : 'Открыть вопрос') : 'Нет вопроса'}"
                                        style="${!hasQuestion ? 'background: #0a120a; color: #1a2a1a; border-color: #1a2a1a; cursor: default;' : ''}">
                                        ${isAnswered ? statusIcon : (hasQuestion ? cost : '')}
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

    openUserProgressPanel() {
        if (!this.isAdmin || !this.adminModeActivated) {
            this.showFeedback('Доступ запрещён', 'error');
            return;
        }
        const modal = document.createElement('div');
        modal.className = 'admin-modal';
        modal.innerHTML = `
            <div class="admin-modal-content" style="max-width: 900px; max-height: 90vh;">
                <div class="admin-modal-header">
                    <h3>Прогресс пользователей</h3>
                    <button class="admin-modal-close" onclick="this.closest('.admin-modal').remove()">&times;</button>
                </div>
                <div id="usersProgressList" style="max-height: 60vh; overflow-y: auto; padding: 5px;">
                    <div style="text-align: center; padding: 20px; color: #8aa07a;">
                        <i class="fas fa-spinner fa-spin"></i> Загрузка...
                    </div>
                </div>
                <div class="form-actions">
                    <button onclick="this.closest('.admin-modal').remove()" class="admin-btn cancel">Закрыть</button>
                    <button onclick="game.refreshUsersList()" class="admin-btn">
                        <i class="fas fa-sync"></i> Обновить
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.style.display = 'flex';
        this.loadUsersList();
    }

    async loadUsersList() {
        const listContainer = document.getElementById('usersProgressList');
        if (!listContainer) return;
        try {
            const snapshot = await this.usersRef.once('value');
            const data = snapshot.val();
            if (!data) {
                listContainer.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #5a7a5a;">
                        <i class="fas fa-info-circle" style="font-size: 2rem; color: #bd8a3e;"></i>
                        <p style="margin-top: 10px;">Нет данных о пользователях</p>
                    </div>
                `;
                return;
            }
            let html = '<div style="display: flex; flex-direction: column; gap: 8px;">';
            const users = Object.entries(data);
            let hasProgress = false;
            for (const [uid, userData] of users) {
                const progress = userData.quizProgress;
                if (!progress) continue;
                hasProgress = true;
                const answeredCount = progress.answered ? progress.answered.length : 0;
                const wrongCount = progress.wrong ? progress.wrong.length : 0;
                const totalAnswered = answeredCount + wrongCount;
                const score = progress.score || 0;
                const name = progress.userName || 'Аноним';
                const email = progress.userEmail || '';
                const updatedAt = progress.updatedAt ? new Date(progress.updatedAt).toLocaleString() : 'Неизвестно';
                const isCurrentUser = this.currentUser && this.currentUser.uid === uid;
                const displayName = name || uid.substring(0, 8);
                html += `
                    <div class="user-progress-item" style="
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 12px 16px;
                        background: ${isCurrentUser ? '#1a2a2a' : '#0a120a'};
                        border-radius: 12px;
                        border: 1px solid ${isCurrentUser ? '#bd8a3e' : '#2a3a2a'};
                        flex-wrap: wrap;
                        gap: 8px;
                    ">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="
                                width: 36px;
                                height: 36px;
                                border-radius: 50%;
                                background: ${isCurrentUser ? '#bd8a3e' : '#2a3a2a'};
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                color: ${isCurrentUser ? '#0f1a0f' : '#8aa07a'};
                                font-weight: bold;
                                font-size: 0.9rem;
                            ">
                                ${displayName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div style="color: #ffd966; font-weight: bold;">${displayName} ${isCurrentUser ? '⭐' : ''}</div>
                                <div style="color: #8aa07a; font-size: 0.75rem;">${email || 'ID: ' + uid.substring(0, 12)}</div>
                            </div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap;">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <span style="color: #bd8a3e; font-weight: bold;">${score} очков</span>
                                <span style="color: #5a7a5a; font-size: 0.8rem;">${totalAnswered} вопросов</span>
                                <span style="color: #5a7a5a; font-size: 0.7rem;">${updatedAt}</span>
                            </div>
                            <button onclick="game.resetUserProgress('${uid}')" class="admin-btn small danger" title="Сбросить прогресс" style="
                                padding: 5px 12px;
                                border: none;
                                border-radius: 6px;
                                cursor: pointer;
                                font-size: 0.75rem;
                                background: #4a1a1a;
                                color: #ff6b6b;
                                transition: all 0.2s;
                                font-family: 'Gotham Pro', sans-serif;
                                display: inline-flex;
                                align-items: center;
                                gap: 4px;
                            ">
                                <i class="fas fa-trash"></i> Сбросить
                            </button>
                        </div>
                    </div>
                `;
            }
            if (!hasProgress) {
                listContainer.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #5a7a5a;">
                        <i class="fas fa-info-circle" style="font-size: 2rem; color: #bd8a3e;"></i>
                        <p style="margin-top: 10px;">Нет данных о прогрессе пользователей</p>
                    </div>
                `;
            } else {
                html += '</div>';
                listContainer.innerHTML = html;
            }
        } catch (error) {
            console.error('Ошибка загрузки списка пользователей:', error);
            listContainer.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #cd5d5d;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 2rem;"></i>
                    <p style="margin-top: 10px;">Ошибка загрузки данных</p>
                    <p style="font-size: 0.8rem; color: #8aa07a;">Проверьте подключение к Firebase</p>
                </div>
            `;
        }
    }

    refreshUsersList() {
        this.loadUsersList();
        this.showFeedback('Список обновлён', 'info');
    }

    undoLastAnswer() {
        if (this.history.length === 0) {
            this.showFeedback('Нет действий для отмены', 'info');
            return;
        }
        const last = this.history.pop();
        const key = last.categoryId + '_' + last.cost;
        if (this.answeredQuestions.has(key)) {
            this.answeredQuestions.delete(key);
        }
        if (this.wrongQuestions.has(key)) {
            this.wrongQuestions.delete(key);
        }
        this.answeredCount = this.answeredQuestions.size + this.wrongQuestions.size;
        this.score -= last.scoreChange;
        this.showFeedback('↩️ Отменён ответ на вопрос ' + last.cost + ' (' + (last.scoreChange > 0 ? '+' : '') + last.scoreChange + ' очков)', 'info');
        this.saveProgress();
        this.renderGameBoard();
    }

    resetProgress() {
        if (!confirm('Сбросить весь прогресс? Это действие нельзя отменить!')) return;
        this.score = 0;
        this.answeredQuestions = new Set();
        this.wrongQuestions = new Set();
        this.answeredCount = 0;
        this.history = [];
        this.saveProgress();
        this.renderGameBoard();
        this.showFeedback('Прогресс сброшен', 'info');
    }

    async resetUserProgress(uid) {
        if (!this.isAdmin) {
            this.showFeedback('Доступ запрещён', 'error');
            return;
        }
        if (!confirm('Сбросить прогресс этого пользователя?')) return;
        try {
            await this.usersRef.child(uid + '/quizProgress').remove();
            if (this.currentUser && this.currentUser.uid === uid) {
                this.score = 0;
                this.answeredQuestions = new Set();
                this.wrongQuestions = new Set();
                this.answeredCount = 0;
                this.history = [];
                this.saveProgress();
                this.renderGameBoard();
            }
            this.showFeedback('Прогресс пользователя сброшен', 'success');
            this.loadUsersList();
        } catch (error) {
            console.error('Ошибка сброса прогресса:', error);
            this.showFeedback('Ошибка при сбросе прогресса', 'error');
        }
    }

    async selectQuestion(categoryId, cost) {
        const key = categoryId + '_' + cost;
        if (this.answeredQuestions.has(key) || this.wrongQuestions.has(key)) {
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
        const questionText = this.currentQuestion.question.replace(/\n/g, '<br>');
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
                    <div class="question-text">${questionText}</div>
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
        const isCorrect = this.isAnswerMatch(userAnswer, this.currentQuestion.answer);
        this.showResult(isCorrect);
    }

    isAnswerMatch(userAnswer, correctAnswer) {
        let user = userAnswer.toLowerCase().trim();
        let correct = correctAnswer.toLowerCase().trim();
        user = user.replace(/[.,!?;:()\[\]{}<>\/\\|`~@#$%^&*_+=\-]+$/, '');
        correct = correct.replace(/[.,!?;:()\[\]{}<>\/\\|`~@#$%^&*_+=\-]+$/, '');
        user = user.replace(/ё/g, 'е');
        correct = correct.replace(/ё/g, 'е');
        user = user.replace(/\s+/g, ' ');
        correct = correct.replace(/\s+/g, ' ');
        user = user.trim();
        correct = correct.trim();
        if (user === correct) return true;
        if (correct.includes('(') && correct.includes(')')) {
            const mainAnswer = correct.replace(/\([^)]*\)/g, '').trim();
            if (user === mainAnswer.toLowerCase()) return true;
            const bracketContent = correct.match(/\(([^)]*)\)/);
            if (bracketContent) {
                const alternatives = bracketContent[1].split(/[,;]/).map(s => s.trim().toLowerCase());
                for (const alt of alternatives) {
                    if (user === alt) return true;
                    if (user.includes(alt) || alt.includes(user)) return true;
                }
            }
        }
        const numberMap = {
            'один': '1', 'одна': '1', 'одно': '1', 'первый': '1', '1-й': '1', '1м': '1',
            'два': '2', 'две': '2', 'второй': '2', '2-й': '2', '2м': '2',
            'три': '3', 'третий': '3', '3-й': '3', '3м': '3',
            'четыре': '4', 'четвертый': '4', '4-й': '4', '4м': '4',
            'пять': '5', 'пятый': '5', '5-й': '5', '5м': '5',
            'шесть': '6', 'шестой': '6', '6-й': '6', '6м': '6',
            'семь': '7', 'седьмой': '7', '7-й': '7', '7м': '7',
            'восемь': '8', 'восьмой': '8', '8-й': '8', '8м': '8',
            'девять': '9', 'девятый': '9', '9-й': '9', '9м': '9',
            'десять': '10', 'десятый': '10', '10-й': '10', '10м': '10',
            'одиннадцать': '11', 'одиннадцатый': '11', '11-й': '11', '11м': '11',
            'двенадцать': '12', 'двенадцатый': '12', '12-й': '12', '12м': '12',
            'тринадцать': '13', 'тринадцатый': '13', '13-й': '13', '13м': '13',
            'четырнадцать': '14', 'четырнадцатый': '14', '14-й': '14', '14м': '14',
            'пятнадцать': '15', 'пятнадцатый': '15', '15-й': '15', '15м': '15',
            'шестнадцать': '16', 'шестнадцатый': '16', '16-й': '16', '16м': '16',
            'семнадцать': '17', 'семнадцатый': '17', '17-й': '17', '17м': '17',
            'восемнадцать': '18', 'восемнадцатый': '18', '18-й': '18', '18м': '18',
            'девятнадцать': '19', 'девятнадцатый': '19', '19-й': '19', '19м': '19',
            'двадцать': '20', 'двадцатый': '20', '20-й': '20', '20м': '20'
        };
        let userNormalized = user;
        let correctNormalized = correct;
        for (const [word, num] of Object.entries(numberMap)) {
            userNormalized = userNormalized.replace(new RegExp(word, 'g'), num);
            correctNormalized = correctNormalized.replace(new RegExp(word, 'g'), num);
        }
        userNormalized = userNormalized.replace(/[^0-9\s]/g, '').trim();
        correctNormalized = correctNormalized.replace(/[^0-9\s]/g, '').trim();
        if (userNormalized === correctNormalized && userNormalized.length > 0) {
            return true;
        }
        const userNumbers = user.match(/\d+/g);
        const correctNumbers = correct.match(/\d+/g);
        if (userNumbers && correctNumbers) {
            if (userNumbers.some(num => correctNumbers.includes(num))) {
                return true;
            }
        }
        const keywords = this.extractKeywords(correct);
        if (keywords.length > 0) {
            const userKeywords = this.extractKeywords(user);
            let matchCount = 0;
            for (const keyword of keywords) {
                if (userKeywords.some(u => u.includes(keyword) || keyword.includes(u))) {
                    matchCount++;
                }
            }
            if (matchCount / keywords.length >= 0.4) {
                return true;
            }
        }
        if (user.length > 2) {
            const userWords = user.split(' ');
            let importantWordsFound = 0;
            let totalImportant = 0;
            for (const word of userWords) {
                if (word.length > 2) {
                    totalImportant++;
                    let found = false;
                    for (const cWord of correct.split(' ')) {
                        if (cWord.length > 2 && (cWord.includes(word) || word.includes(cWord))) {
                            found = true;
                            break;
                        }
                    }
                    if (found) importantWordsFound++;
                }
            }
            if (totalImportant > 0 && importantWordsFound / totalImportant >= 0.5) {
                return true;
            }
        }
        const similarity = this.getSimilarity(user, correct);
        if (similarity > 0.55) {
            return true;
        }
        return false;
    }

    extractKeywords(text) {
        const stopWords = [
            'и', 'в', 'на', 'с', 'по', 'к', 'у', 'за', 'от', 'из', 'для',
            'о', 'об', 'при', 'через', 'между', 'без', 'до', 'после', 'во',
            'со', 'под', 'над', 'около', 'перед', 'это', 'как', 'что', 'так',
            'же', 'бы', 'не', 'но', 'а', 'или', 'их', 'его', 'её', 'они',
            'мы', 'вы', 'ты', 'он', 'она', 'оно', 'она', 'они', 'себя',
            'время', 'работы', 'съёмок', 'становится', 'который', 'этого',
            'сезоне', 'сюжете', 'появляется', 'майор', 'называлось', 'место',
            'воинской', 'части', 'небольшой', 'магазин', 'буфет', 'солдаты',
            'могли', 'купить', 'еду', 'сигареты', 'другие', 'товары', 'который',
            'сериале', 'был', 'связан', 'предпринимательской', 'деятельностью'
        ];
        return text.split(' ')
            .filter(word => word.length > 2)
            .filter(word => !stopWords.includes(word))
            .map(word => word.replace(/[^а-яё0-9]/g, ''))
            .filter(word => word.length > 0);
    }

    getSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        if (longer.length === 0) return 1.0;
        const distance = this.levenshteinDistance(longer, shorter);
        return (longer.length - distance) / longer.length;
    }

    levenshteinDistance(str1, str2) {
        const matrix = [];
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2[i - 1] === str1[j - 1]) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        return matrix[str2.length][str1.length];
    }

    showResult(isCorrect) {
        const inputArea = document.getElementById('answerInputArea');
        const resultBlock = document.getElementById('resultBlock');
        const resultMessage = document.getElementById('resultMessage');
        const cost = parseInt(this.currentQuestion.cost);
        const key = this.currentQuestion.categoryId + '_' + this.currentQuestion.cost;
        let scoreChange = 0;
        if (inputArea) inputArea.style.display = 'none';
        if (resultBlock) resultBlock.style.display = 'block';
        if (isCorrect) {
            scoreChange = cost;
            this.score += cost;
            this.answeredQuestions.add(key);
            resultMessage.innerHTML = `
                <div class="result-correct">
                    <span>Правильно! +${cost} очков</span>
                </div>
                <div class="result-user-answer">
                    Ваш ответ: <strong>${this.userAnswer}</strong>
                </div>
                <div class="result-correct-answer" style="color: #2d7d2d; margin-top: 8px; font-size: 0.9rem;">
                    Правильный ответ: ${this.currentQuestion.answer}
                </div>
            `;
            resultMessage.style.borderColor = '#2d7d2d';
            this.showFeedback('Правильно! +' + cost + ' очков', 'success');
        } else {
            scoreChange = -cost;
            this.score -= cost;
            this.wrongQuestions.add(key);
            resultMessage.innerHTML = `
                <div class="result-wrong">
                    <span>Неправильно! -${cost} очков</span>
                </div>
                <div class="result-user-answer">
                    Ваш ответ: <strong>${this.userAnswer}</strong>
                </div>
                <div class="result-correct-answer" style="color: #ffd966; margin-top: 8px; font-size: 0.9rem;">
                    Правильный ответ: ${this.currentQuestion.answer}
                </div>
            `;
            resultMessage.style.borderColor = '#7d2d2d';
            this.showFeedback('Неправильно! -' + cost + ' очков', 'error');
        }
        this.answeredCount = this.answeredQuestions.size + this.wrongQuestions.size;
        this.history.push({
            categoryId: this.currentQuestion.categoryId,
            cost: this.currentQuestion.cost,
            scoreChange: scoreChange,
            isCorrect: isCorrect,
            userAnswer: this.userAnswer,
            correctAnswer: this.currentQuestion.answer
        });
        if (this.history.length > 50) this.history = this.history.slice(-50);
        this.saveProgress();
        this.updateStats();
        this.updateBoardCell(this.currentQuestion.categoryId, this.currentQuestion.cost, isCorrect);
    }

    updateBoardCell(categoryId, cost, isCorrect) {
        const cells = document.querySelectorAll('.board-cell');
        const key = categoryId + '_' + cost;
        for (const cell of cells) {
            if (cell.dataset.category === categoryId && cell.dataset.cost === cost) {
                cell.classList.add('answered');
                if (isCorrect) {
                    cell.innerHTML = '<i class="fas fa-check" style="color:#2d7d2d;"></i>';
                    cell.style.color = '#2d7d2d';
                } else {
                    cell.innerHTML = '<i class="fas fa-times" style="color:#7d2d2d;"></i>';
                    cell.style.color = '#7d2d2d';
                }
                cell.onclick = null;
                cell.title = 'Уже отвечено';
                break;
            }
        }
    }

    continueGame() {
        this.closeQuestion();
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
            if (newCategory !== oldQuestion.categoryId || newCost !== oldQuestion.cost) {
                const oldPath = 'categories/' + oldQuestion.categoryId + '/questions/' + oldQuestion.cost;
                await this.quizRef.child(oldPath).remove();
                const newPath = 'categories/' + newCategory + '/questions/' + newCost;
                await this.quizRef.child(newPath).set({
                    question: question,
                    answer: answer,
                    explanation: explanation || ''
                });
            } else {
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
                    <h3>Редактирование вопросов</h3>
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
        document.querySelector('.admin-modal')?.remove();
        if (categoryId === 'new') {
            this.openAddQuestionPanel();
            return;
        }
        const modal = document.createElement('div');
        modal.className = 'admin-modal';
        modal.innerHTML = `
            <div class="admin-modal-content">
                <div class="admin-modal-header">
                    <h3>Добавить вопрос в "${this.categories[categoryId].name}"</h3>
                    <button class="admin-modal-close" onclick="this.closest('.admin-modal').remove()">&times;</button>
                </div>
                <form id="addQuestionForm" class="admin-form">
                    <div class="form-group" style="display: none;">
                        <select id="adminCategory">
                            <option value="${categoryId}" selected>${this.categories[categoryId].name}</option>
                        </select>
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
            categoryId = newName.toLowerCase().replace(/[^a-zа-яё0-9\s]/g, '').replace(/\s+/g, '_');
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
                <div style="margin-bottom: 15px; text-align: right;">
                    <button onclick="game.addNewCategory()" class="admin-btn primary">
                        <i class="fas fa-plus-circle"></i> Добавить категорию
                    </button>
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

    addNewCategory() {
        if (!this.isAdmin || !this.adminModeActivated) {
            this.showFeedback('Доступ запрещён', 'error');
            return;
        }
        const modal = document.createElement('div');
        modal.className = 'admin-modal';
        modal.innerHTML = `
            <div class="admin-modal-content">
                <div class="admin-modal-header">
                    <h3>Добавить категорию</h3>
                    <button class="admin-modal-close" onclick="this.closest('.admin-modal').remove()">&times;</button>
                </div>
                <form id="addCategoryForm" class="admin-form">
                    <div class="form-group">
                        <label>Название категории</label>
                        <input type="text" id="newCategoryName" required placeholder="Например: Отношения и любовь">
                    </div>
                    <div class="form-group">
                        <label>ID категории</label>
                        <input type="text" id="newCategoryId" placeholder="автоматически" readonly style="background: #1a2a1a; color: #8aa07a;">
                    </div>
                    <div class="form-actions">
                        <button type="button" onclick="this.closest('.admin-modal').remove()" class="admin-btn cancel">Отмена</button>
                        <button type="submit" class="admin-btn submit">
                            <i class="fas fa-save"></i> Создать
                        </button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
        modal.style.display = 'flex';
        document.getElementById('newCategoryName').addEventListener('input', function() {
            const name = this.value.trim();
            const idField = document.getElementById('newCategoryId');
            if (name) {
                const generatedId = name.toLowerCase()
                    .replace(/[^a-zа-яё0-9\s]/g, '')
                    .replace(/\s+/g, '_');
                idField.value = generatedId;
            } else {
                idField.value = '';
            }
        });
        document.getElementById('addCategoryForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveNewCategory();
        });
    }

    async saveNewCategory() {
        if (!this.isAdmin) {
            this.showFeedback('Доступ запрещён', 'error');
            return;
        }
        const name = document.getElementById('newCategoryName').value.trim();
        const id = document.getElementById('newCategoryId').value.trim();
        if (!name) {
            this.showFeedback('Введите название категории', 'error');
            return;
        }
        if (!id) {
            this.showFeedback('Ошибка генерации ID', 'error');
            return;
        }
        if (this.categories[id]) {
            this.showFeedback('Категория с таким ID уже существует!', 'error');
            return;
        }
        const existing = Object.values(this.categories).some(cat => cat.name === name);
        if (existing) {
            this.showFeedback('Категория с таким названием уже существует!', 'error');
            return;
        }
        try {
            await this.quizRef.child('categories/' + id).set({
                name: name,
                questions: {}
            });
            this.showFeedback('Категория "' + name + '" создана!', 'success');
            document.querySelector('.admin-modal').remove();
            await this.initializeCategories();
            this.renderGameBoard();
            setTimeout(() => this.openCategoryManager(), 300);
        } catch (error) {
            console.error('Ошибка создания категории:', error);
            this.showFeedback('Ошибка при создании категории', 'error');
        }
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
        this.wrongQuestions = new Set();
        this.answeredCount = 0;
        this.currentQuestion = null;
        this.history = [];
        this.stopTimer();
        this.saveProgress();
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
            if (user) {
                this.currentUser = {
                    uid: user.uid,
                    email: user.email,
                    name: user.displayName || user.email || 'Аноним'
                };
                this.loadProgressFromFirebase();
                this.renderGameBoard();
            } else {
                this.currentUser = null;
                this.score = 0;
                this.answeredQuestions = new Set();
                this.wrongQuestions = new Set();
                this.answeredCount = 0;
                this.history = [];
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
