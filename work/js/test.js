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
    nextBtn.textContent = currentNumber === total ? 'Завершить тест' : 'Следующий вопрос';

    q.options.forEach((opt, index) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = opt;
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
        }
    });

    if (selectedIndex === q.correct) {
        score++;
        explanationEl.className = 'quiz-explanation correct';
        explanationEl.innerHTML = `<strong>Верно!</strong> ${q.explanation}`;
    } else {
        selectedBtn.classList.add('wrong');
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

    if (score === total) {
        feedback = 'Отличный результат! Вы отлично знаете базовые алгоритмы спасения жизни.';
    } else if (score >= 3) {
        feedback = 'Хороший результат! Но рекомендуем освежить в памяти инструкции по первой помощи.';
    } else {
        feedback = 'В экстренной ситуации важна каждая секунда. Обязательно изучите инструкции в нашем разделе обучения.';
    }

    resultEl.innerHTML = `
        <div class="result-box">
            <h2>Тест завершён!</h2>
            <div class="result-score">Ваш результат: ${score} из ${total}</div>
            <p>${feedback}</p>
            <button id="restart-btn" class="btn" type="button">Пройти тест заново</button>
        </div>
    `;

    document.getElementById('restart-btn').onclick = restartQuiz;
}

function restartQuiz() {
    currentQuestion = 0;
    score = 0;
    resultEl.style.display = 'none';
    quizContentEl.style.display = 'block';
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

loadQuestion();
