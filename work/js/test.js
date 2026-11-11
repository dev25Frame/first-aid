const questions = [
    {
        question: "Что является первым и главным действием при сильном наружном кровотечении?",
        options: [
            "Прямое давление на рану (рукой или давящей повязкой)",
            "Обработать рану спиртом или йодом",
            "Сразу наложить жгут выше раны независимо от типа кровотечения",
            "Дать пострадавшему обезболивающую таблетку"
        ],
        correct: 0,
        explanation: "Первым действием всегда является прямое давление на рану или наложение давящей повязки. Кровоостанавливающий жгут накладывается только при массивном артериальном кровотечении (пульсирующая струя алой крови) или ампутации."
    },
    {
        question: "По какому номеру в России можно вызвать скорую медицинскую помощь с мобильного телефона?",
        options: [
            "Только 03",
            "103 или 112",
            "101 или 102",
            "911"
        ],
        correct: 1,
        explanation: "С мобильного телефона скорую помощь вызывают по номеру 103 либо по единому номеру экстренных оперативных служб 112. Номер 03 работает только со стационарных (городских) телефонов."
    },
    {
        question: "Какое первое действие необходимо предпринять при термическом ожоге кипятком (кожа покраснела, целостность не нарушена)?",
        options: [
            "Смазать место ожога растительным маслом или жирным кремом",
            "Охлаждать место ожога прохладной проточной водой 15–20 минут",
            "Приложить кусок льда непосредственно к коже",
            "Проколоть образовавшиеся пузыри стерильной иглой"
        ],
        correct: 1,
        explanation: "При ожоге необходимо как можно быстрее охладить место повреждения прохладной проточной водой в течение 15–20 минут. Масло создаёт плёнку и задерживает тепло, а чистый лёд может вызвать дополнительное обморожение."
    },
    {
        question: "Пострадавший без сознания, но дышит самостоятельно. В какое положение его необходимо уложить до приезда скорой?",
        options: [
            "Устойчивое боковое положение (восстановительное)",
            "Посадить, запрокинув голову назад",
            "Оставить лежать на спине, подложив валик под шею",
            "Положить на живот лицом вниз"
        ],
        correct: 0,
        explanation: "Устойчивое боковое положение обеспечивает проходимость дыхательных путей и предотвращает западение языка и асфиксию рвотными массами."
    },
    {
        question: "Каково стандартное соотношение нажатий на грудину и вдохов искусственного дыхания при базовой СЛР взрослому человеку?",
        options: [
            "15 нажатий : 2 вдоха",
            "30 нажатий : 2 вдоха",
            "50 нажатий : 5 вдохов",
            "Только вдохи без нажатий на грудную клетку"
        ],
        correct: 1,
        explanation: "Современный стандарт сердечно-лёгочной реанимации (СЛР) для взрослых: 30 компрессий грудной клетки с частотой 100–120 в минуту, затем 2 вдоха искусственного дыхания."
    }
];

let currentQuestion = 0;
let score = 0;
let hasAnswered = false;

const quizContentEl = document.getElementById('quiz-content');
const questionEl = document.getElementById('question');
const optionsEl = document.getElementById('options');
const explanationEl = document.getElementById('explanation');
const nextBtn = document.getElementById('next-btn');
const progressTextEl = document.getElementById('quiz-progress-text');
const progressBarEl = document.getElementById('progress-bar');
const resultEl = document.getElementById('result');
const bestScoreBadgeEl = document.getElementById('best-score-badge');

// --- Работа с localStorage ---
function getBestScore() {
    const stored = localStorage.getItem('first_aid_best_score');
    if (stored === null) return null;
    return {
        score: parseInt(stored, 10),
        total: parseInt(localStorage.getItem('first_aid_total_questions') || questions.length, 10),
        date: localStorage.getItem('first_aid_best_date') || ''
    };
}

function updateBestScoreBadge() {
    if (!bestScoreBadgeEl) return;
    const best = getBestScore();
    if (best && !isNaN(best.score)) {
        const percent = Math.round((best.score / best.total) * 100);
        bestScoreBadgeEl.style.display = 'flex';
        bestScoreBadgeEl.innerHTML = `
            <span class="badge-text">
                🏆 <strong>Ваш рекорд:</strong> ${best.score} из ${best.total} (${percent}%)${best.date ? ' • ' + best.date : ''}
            </span>
            <button type="button" class="badge-clear-btn" id="badge-clear-btn" title="Сбросить историю рекорда">Сбросить</button>
        `;
        const clearBtn = document.getElementById('badge-clear-btn');
        if (clearBtn) {
            clearBtn.onclick = () => {
                if (confirm('Сбросить сохранённый рекорд теста?')) {
                    localStorage.removeItem('first_aid_best_score');
                    localStorage.removeItem('first_aid_best_date');
                    localStorage.removeItem('first_aid_total_questions');
                    updateBestScoreBadge();
                }
            };
        }
    } else {
        bestScoreBadgeEl.style.display = 'none';
        bestScoreBadgeEl.innerHTML = '';
    }
}

// --- Генерация сертификата на HTML5 Canvas ---
function drawCertificate(userName, userScore, total) {
    const canvas = document.getElementById('cert-canvas');
    if (!canvas) return '';
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Очистка
    ctx.clearRect(0, 0, width, height);

    // Фоновый градиент Warm Ivory (--bg0_h, --bg0, --bg0_s)
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#f8faf0');
    bgGrad.addColorStop(0.5, '#f1f3e0');
    bgGrad.addColorStop(1, '#e5eac9');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Внешняя рамка (--faded_green #425a37)
    ctx.strokeStyle = '#425a37';
    ctx.lineWidth = 16;
    ctx.strokeRect(30, 30, width - 60, height - 60);

    // Внутренняя рамка (--bg2 #bed0a1)
    ctx.strokeStyle = '#bed0a1';
    ctx.lineWidth = 3;
    ctx.strokeRect(46, 46, width - 92, height - 92);

    // Декоративные угловые точки (--neutral_green #5a794c)
    const corners = [
        [46, 46], [width - 46, 46],
        [46, height - 46], [width - 46, height - 46]
    ];
    corners.forEach(([cx, cy]) => {
        ctx.fillStyle = '#5a794c';
        ctx.beginPath();
        ctx.arc(cx, cy, 7, 0, Math.PI * 2);
        ctx.fill();
    });

    // Медицинская эмблема (круг с крестом)
    const centerX = width / 2;
    const emblemY = 125;
    
    ctx.beginPath();
    ctx.arc(centerX, emblemY, 32, 0, Math.PI * 2);
    ctx.fillStyle = '#d2dcb6';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#425a37';
    ctx.stroke();

    // Крест внутри эмблемы
    ctx.fillStyle = '#425a37';
    ctx.fillRect(centerX - 5, emblemY - 17, 10, 34);
    ctx.fillRect(centerX - 17, emblemY - 5, 34, 10);

    // Заголовок конкурса
    ctx.textAlign = 'center';
    ctx.font = 'bold 15px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#556252';
    ctx.fillText('КОНКУРС «ДОБРЫЕ САЙТЫ 2026» • ПРОЕКТ «ПЕРВАЯ ПОМОЩЬ РЯДОМ»', centerX, 190);

    // Главный заголовок СЕРТИФИКАТ
    ctx.font = 'bold 48px "Georgia", "Times New Roman", serif';
    ctx.fillStyle = '#425a37';
    ctx.fillText('С Е Р Т И Ф И К А Т', centerX, 255);

    // Подзаголовок
    ctx.font = '600 18px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#556252';
    ctx.fillText('О ПРОХОЖДЕНИИ БАЗОВОГО ТЕСТИРОВАНИЯ ПО ПЕРВОЙ ПОМОЩИ', centerX, 290);

    // Декоративная линия с ромбиком
    ctx.strokeStyle = '#a1bc98';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(centerX - 240, 315);
    ctx.lineTo(centerX - 16, 315);
    ctx.moveTo(centerX + 16, 315);
    ctx.lineTo(centerX + 240, 315);
    ctx.stroke();

    ctx.fillStyle = '#bed0a1';
    ctx.beginPath();
    ctx.moveTo(centerX, 309);
    ctx.lineTo(centerX + 7, 315);
    ctx.lineTo(centerX, 321);
    ctx.lineTo(centerX - 7, 315);
    ctx.closePath();
    ctx.fill();

    // Текст подтверждения
    ctx.font = 'italic 21px "Georgia", "Times New Roman", serif';
    ctx.fillStyle = '#445141';
    ctx.fillText('Настоящим подтверждается, что', centerX, 370);

    // Имя участника
    ctx.font = 'bold 40px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#21261f';
    ctx.fillText(userName, centerX, 430);

    // Линия под именем
    ctx.strokeStyle = '#bed0a1';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX - 280, 450);
    ctx.lineTo(centerX + 280, 450);
    ctx.stroke();

    // Описание компетенций
    ctx.font = '20px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#344031';
    ctx.fillText('успешно подтвердил(а) знание алгоритмов спасения жизни и правил', centerX, 500);
    ctx.fillText('оказания первой доврачебной помощи в неотложных ситуациях.', centerX, 532);

    // Результат в баллах
    const percent = Math.round((userScore / total) * 100);
    ctx.font = 'bold 22px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#425a37';
    ctx.fillText(`Результат проверки: ${userScore} из ${total} правильных ответов (${percent}%)`, centerX, 585);

    // Печать / штамп по центру внизу
    const sealX = centerX;
    const sealY = 705;
    
    ctx.beginPath();
    ctx.arc(sealX, sealY, 46, 0, Math.PI * 2);
    ctx.strokeStyle = '#bed0a1';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(sealX, sealY, 40, 0, Math.PI * 2);
    ctx.strokeStyle = '#425a37';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#425a37';
    ctx.font = 'bold 12px "Segoe UI", Arial, sans-serif';
    ctx.fillText('★ ★ ★', sealX, sealY - 15);
    ctx.font = 'bold 13px "Segoe UI", Arial, sans-serif';
    ctx.fillText('ПРОВЕРЕНО', sealX, sealY + 3);
    ctx.font = '600 11px "Segoe UI", Arial, sans-serif';
    ctx.fillText('2026', sealX, sealY + 19);

    // Дата и ID сертификата
    const today = new Date().toLocaleDateString('ru-RU');
    let certId = localStorage.getItem('first_aid_cert_id');
    if (!certId) {
        certId = Math.floor(1000 + Math.random() * 9000).toString();
        localStorage.setItem('first_aid_cert_id', certId);
    }

    ctx.textAlign = 'left';
    ctx.font = '15px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#556252';
    ctx.fillText(`Дата выдачи: ${today}`, 100, 715);
    ctx.fillText('Статус: Знания подтверждены', 100, 738);

    ctx.textAlign = 'right';
    ctx.fillText(`Сертификат № FA-2026-${certId}`, width - 100, 715);
    ctx.fillText('Команда «Здоровое будущее»', width - 100, 738);

    return canvas.toDataURL('image/png');
}

// --- Логика прохождения викторины ---
function loadQuestion() {
    hasAnswered = false;
    const q = questions[currentQuestion];

    // Обновление прогресса
    const total = questions.length;
    const currentNumber = currentQuestion + 1;
    progressTextEl.textContent = `Вопрос ${currentNumber} из ${total}`;
    progressBarEl.style.width = `${((currentNumber - 1) / total) * 100}%`;

    // Вопрос и варианты
    questionEl.textContent = q.question;
    optionsEl.innerHTML = '';
    explanationEl.style.display = 'none';
    explanationEl.className = 'quiz-explanation';
    explanationEl.textContent = '';

    nextBtn.disabled = true;
    nextBtn.innerHTML = currentNumber === total ? '<span>Завершить тест</span> <span>✓</span>' : '<span>Следующий вопрос</span> <span>&rarr;</span>';

    q.options.forEach((opt, index) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.innerHTML = `<span>${opt}</span><span class="opt-status-icon" style="opacity:0.4; font-size:1.05rem;">⚪</span>`;
        btn.classList.add('option-btn');
        btn.onclick = () => selectAnswer(index, btn);
        optionsEl.appendChild(btn);
    });
}

function selectAnswer(selectedIndex, selectedBtn) {
    if (hasAnswered) return;
    hasAnswered = true;

    const q = questions[currentQuestion];
    const allBtns = optionsEl.querySelectorAll('.option-btn');

    allBtns.forEach((btn, index) => {
        btn.disabled = true;
        if (index === q.correct) {
            btn.classList.add('correct');
            const icon = btn.querySelector('.opt-status-icon');
            if (icon) {
                icon.textContent = '✅';
                icon.style.opacity = '1';
            }
        }
    });

    if (selectedIndex === q.correct) {
        score++;
        explanationEl.className = 'quiz-explanation correct';
        explanationEl.innerHTML = `<strong>Верно!</strong> ${q.explanation}`;
    } else {
        selectedBtn.classList.add('wrong');
        const icon = selectedBtn.querySelector('.opt-status-icon');
        if (icon) {
            icon.textContent = '❌';
            icon.style.opacity = '1';
        }
        explanationEl.className = 'quiz-explanation wrong';
        explanationEl.innerHTML = `<strong>Неверно.</strong> ${q.explanation}`;
    }

    explanationEl.style.display = 'block';
    nextBtn.disabled = false;
}

function showResult() {
    quizContentEl.style.display = 'none';
    resultEl.style.display = 'block';

    const total = questions.length;
    let feedback = '';

    // Сохранение рекорда в localStorage
    const previousBest = getBestScore();
    let isNewRecord = false;
    const today = new Date().toLocaleDateString('ru-RU');

    if (!previousBest || score > previousBest.score) {
        localStorage.setItem('first_aid_best_score', score.toString());
        localStorage.setItem('first_aid_total_questions', total.toString());
        localStorage.setItem('first_aid_best_date', today);
        isNewRecord = previousBest !== null && score > previousBest.score;
        updateBestScoreBadge();
    }

    if (score === total) {
        feedback = 'Отличный результат! Вы отлично знаете базовые алгоритмы спасения жизни.';
    } else if (score >= 3) {
        feedback = 'Хороший результат! Но рекомендуем освежить в памяти инструкции по первой помощи.';
    } else {
        feedback = 'В экстренной ситуации важна каждая секунда. Обязательно изучите инструкции в нашем разделе обучения.';
    }

    const savedName = localStorage.getItem('first_aid_user_name') || '';

    let certBlockHtml = '';
    if (score >= 3) {
        certBlockHtml = `
            <div class="certificate-section">
                <h3>🎓 Именной сертификат</h3>
                <p>Вы успешно сдали норматив! Введите ваше имя и фамилию для формирования электронного сертификата:</p>
                <div class="cert-input-group">
                    <input type="text" id="cert-name-input" placeholder="Имя и Фамилия (например: Иван Петров)" maxlength="40" value="${savedName}">
                    <button type="button" id="generate-cert-btn" class="btn">Получить сертификат</button>
                </div>
                <div id="cert-error" class="cert-error" style="display: none;"></div>
                
                <div id="cert-preview-box" class="cert-preview-box" style="display: none;">
                    <div class="cert-image-wrapper">
                        <img id="cert-image-preview" alt="Именной сертификат" />
                    </div>
                    <div class="cert-download-actions">
                        <a id="cert-download-btn" class="btn btn-download" download="Сертификат_Первая_помощь.png">📥 Скачать сертификат (PNG)</a>
                    </div>
                </div>
            </div>
        `;
    } else {
        certBlockHtml = `
            <div class="cert-locked-notice">
                🔒 <strong>Именной сертификат:</strong> выдается при результате от 3 правильных ответов из ${total}. Ознакомьтесь с инструкциями на сайте и пройдите тест повторно!
            </div>
        `;
    }

    resultEl.innerHTML = `
        <div class="result-box">
            <h2>Тест завершён!</h2>
            ${isNewRecord ? '<div style="color: #2e7d32; font-weight: bold; margin-bottom: 0.5rem;">🎉 Поздравляем, новый рекорд!</div>' : ''}
            <div class="result-score">Ваш результат: ${score} из ${total}</div>
            <p>${feedback}</p>
            <button id="restart-btn" class="btn" type="button">Пройти тест заново</button>
            ${certBlockHtml}
        </div>
    `;

    document.getElementById('restart-btn').onclick = restartQuiz;

    if (score >= 3) {
        const generateBtn = document.getElementById('generate-cert-btn');
        const nameInput = document.getElementById('cert-name-input');
        const certError = document.getElementById('cert-error');
        const previewBox = document.getElementById('cert-preview-box');
        const imagePreview = document.getElementById('cert-image-preview');
        const downloadBtn = document.getElementById('cert-download-btn');

        generateBtn.onclick = () => {
            const rawName = nameInput.value.trim();
            if (rawName.length < 2) {
                certError.textContent = 'Пожалуйста, введите корректное имя и фамилию (минимум 2 символа).';
                certError.style.display = 'block';
                return;
            }

            certError.style.display = 'none';
            localStorage.setItem('first_aid_user_name', rawName);

            const dataUrl = drawCertificate(rawName, score, total);
            imagePreview.src = dataUrl;
            downloadBtn.href = dataUrl;
            downloadBtn.download = `Сертификат_${rawName.replace(/\s+/g, '_')}.png`;
            previewBox.style.display = 'block';

            previewBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        };
    }
}

function restartQuiz() {
    currentQuestion = 0;
    score = 0;
    resultEl.style.display = 'none';
    quizContentEl.style.display = 'block';
    updateBestScoreBadge();
    loadQuestion();
}

nextBtn.onclick = () => {
    if (!hasAnswered) return;
    currentQuestion++;
    if (currentQuestion < questions.length) {
        loadQuestion();
    } else {
        progressBarEl.style.width = '100%';
        showResult();
    }
};

// Инициализация при загрузке
updateBestScoreBadge();
loadQuestion();
