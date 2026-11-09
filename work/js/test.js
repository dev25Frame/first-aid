
const questions = [
    {
        question: "Что нужно сделать в первую очередь при сильном кровотечении?",
        options: ["Промыть водой", "Наложить жгут", "Приложить лёд", "Дать обезболивающее"],
        correct: 1
    },
{
    question: "Какой номер скорой помощи в России?",
    options: ["101", "102", "103", "104"],
    correct: 2
}
];

let currentQuestion = 0;
let score = 0;

function loadQuestion() {
    const q = questions[currentQuestion];
    document.getElementById('question').textContent = q.question;
    const optionsDiv = document.getElementById('options');
    optionsDiv.innerHTML = '';
    q.options.forEach((opt, index) => {
        const btn = document.createElement('button');
        btn.textContent = opt;
        btn.classList.add('option-btn');
        btn.onclick = () => selectAnswer(index, btn);
        optionsDiv.appendChild(btn);
    });
}

function selectAnswer(index, btn) {
    const q = questions[currentQuestion];
    const allBtns = document.querySelectorAll('.option-btn');
    allBtns.forEach(b => b.disabled = true);
    if (index === q.correct) {
        btn.style.background = '#4caf50';
        score++;
    } else {
        btn.style.background = '#f44336';
        allBtns[q.correct].style.background = '#4caf50';
    }
}

document.getElementById('next-btn').onclick = () => {
    currentQuestion++;
    if (currentQuestion < questions.length) {
        loadQuestion();
    } else {
        document.getElementById('quiz-container').innerHTML =
        `<h2>Вы набрали ${score} из ${questions.length}!</h2>`;
    }
};

loadQuestion();
