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
const resultContentEl = document.getElementById('result-content');
const stepIndicatorEl = document.getElementById('quiz-step-indicator');
const percentIndicatorEl = document.getElementById('quiz-percent-indicator');
const progressFillEl = document.getElementById('quiz-progress-fill');
const questionTextEl = document.getElementById('question-text');
const optionsGroupEl = document.getElementById('options-group');
const explanationBoxEl = document.getElementById('explanation-box');
const nextBtn = document.getElementById('next-action-btn');
const recordBadgeEl = document.getElementById('m3-record-badge');

// --- Работа с localStorage ---
function getRecord() {
  const s = localStorage.getItem('m3_first_aid_record');
  if (s === null) return null;
  return {
    score: parseInt(s, 10),
    total: parseInt(localStorage.getItem('m3_first_aid_total') || questions.length, 10),
    date: localStorage.getItem('m3_first_aid_date') || ''
  };
}

function updateRecordBadge() {
  if (!recordBadgeEl) return;
  const rec = getRecord();
  if (rec && !isNaN(rec.score)) {
    const pct = Math.round((rec.score / rec.total) * 100);
    recordBadgeEl.style.display = 'flex';
    recordBadgeEl.innerHTML = `
      <span>🏆 <strong>Ваш рекорд:</strong> ${rec.score} из ${rec.total} (${pct}%)${rec.date ? ' • ' + rec.date : ''}</span>
      <button type="button" id="m3-clear-rec-btn" style="background:none; border:none; color:inherit; text-decoration:underline; cursor:pointer; font-size:0.85rem; font-weight:700;">Сбросить</button>
    `;
    const clearBtn = document.getElementById('m3-clear-rec-btn');
    if (clearBtn) {
      clearBtn.onclick = () => {
        if (confirm('Сбросить лучший результат?')) {
          localStorage.removeItem('m3_first_aid_record');
          localStorage.removeItem('m3_first_aid_total');
          localStorage.removeItem('m3_first_aid_date');
          updateRecordBadge();
        }
      };
    }
  } else {
    recordBadgeEl.style.display = 'none';
  }
}

// --- Генерация сертификата в палитре Material You 3 (Botanical Sage) ---
function drawM3Certificate(userName, userScore, total) {
  const canvas = document.getElementById('m3-cert-canvas');
  if (!canvas) return '';
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  // Очистка
  ctx.clearRect(0, 0, w, h);

  // Фоновый градиент Warm Ivory (--bg0_h, --bg0, --bg0_s)
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#f8faf0');
  bg.addColorStop(0.5, '#f1f3e0');
  bg.addColorStop(1, '#e5eac9');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Внешняя рамка (--faded_green #425a37)
  ctx.strokeStyle = '#425a37';
  ctx.lineWidth = 16;
  ctx.strokeRect(32, 32, w - 64, h - 64);

  // Внутренняя рамка (--bg2 #bed0a1)
  ctx.strokeStyle = '#bed0a1';
  ctx.lineWidth = 3;
  ctx.strokeRect(48, 48, w - 96, h - 96);

  // Декоративные мягкие кружки в углах (--neutral_green #5a794c)
  const corners = [
    [48, 48], [w - 48, 48],
    [48, h - 48], [w - 48, h - 48]
  ];
  corners.forEach(([cx, cy]) => {
    ctx.fillStyle = '#5a794c';
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.fill();
  });

  const midX = w / 2;

  // Эмблема M3 (--bg1 #d2dcb6 и --faded_green)
  ctx.beginPath();
  ctx.arc(midX, 120, 34, 0, Math.PI * 2);
  ctx.fillStyle = '#d2dcb6';
  ctx.fill();
  ctx.strokeStyle = '#425a37';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Крест внутри эмблемы
  ctx.fillStyle = '#425a37';
  ctx.fillRect(midX - 5, 102, 10, 36);
  ctx.fillRect(midX - 18, 115, 36, 10);

  // Верхний слоган
  ctx.textAlign = 'center';
  ctx.font = 'bold 15px "Google Sans", "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = '#556252';
  ctx.fillText('КОНКУРС «ДОБРЫЕ САЙТЫ 2026» • GOOGLE MATERIAL YOU 3 EXPRESSIVE', midX, 185);

  // Заголовок
  ctx.font = '800 48px "Google Sans", "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = '#425a37';
  ctx.fillText('С Е Р Т И Ф И К А Т', midX, 250);

  // Подзаголовок
  ctx.font = '600 17px "Google Sans", "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = '#556252';
  ctx.fillText('О ПРОХОЖДЕНИИ БАЗОВОГО КУРСА ПО ПЕРВОЙ ДОВРАЧЕБНОЙ ПОМОЩИ', midX, 285);

  // Тонкая разделительная линия
  ctx.strokeStyle = '#a1bc98';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(midX - 220, 310);
  ctx.lineTo(midX + 220, 310);
  ctx.stroke();

  // "Настоящим подтверждается..."
  ctx.font = 'italic 20px "Georgia", serif';
  ctx.fillStyle = '#445141';
  ctx.fillText('Настоящим подтверждается, что', midX, 365);

  // Имя пользователя
  ctx.font = '800 42px "Google Sans", "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = '#21261f';
  ctx.fillText(userName, midX, 425);

  // Подчёркивание имени
  ctx.strokeStyle = '#bed0a1';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(midX - 260, 445);
  ctx.lineTo(midX + 260, 445);
  ctx.stroke();

  // Описание
  ctx.font = '20px "Google Sans", "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = '#344031';
  ctx.fillText('успешно освоил(а) официальные стандарты и практические алгоритмы', midX, 498);
  ctx.fillText('спасения жизни пострадавших до приезда скорой медицинской помощи.', midX, 530);

  // Баллы
  const percent = Math.round((userScore / total) * 100);
  ctx.font = 'bold 22px "Google Sans", "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = '#425a37';
  ctx.fillText(`Результат тестирования: ${userScore} из ${total} баллов (${percent}%)`, midX, 585);

  // Печать по центру
  const sealX = midX;
  const sealY = 705;
  ctx.beginPath();
  ctx.arc(sealX, sealY, 44, 0, Math.PI * 2);
  ctx.fillStyle = '#e5eac9';
  ctx.fill();
  ctx.strokeStyle = '#425a37';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.fillStyle = '#425a37';
  ctx.font = 'bold 12px "Google Sans", Arial, sans-serif';
  ctx.fillText('★ ★ ★', sealX, sealY - 14);
  ctx.font = 'bold 13px "Google Sans", Arial, sans-serif';
  ctx.fillText('АТТЕСТОВАН', sealX, sealY + 3);
  ctx.font = '600 11px "Google Sans", Arial, sans-serif';
  ctx.fillText('2026', sealX, sealY + 18);

  // Дата и ID
  const today = new Date().toLocaleDateString('ru-RU');
  let certId = localStorage.getItem('m3_cert_id');
  if (!certId) {
    certId = Math.floor(1000 + Math.random() * 9000).toString();
    localStorage.setItem('m3_cert_id', certId);
  }

  ctx.textAlign = 'left';
  ctx.font = '15px "Google Sans", Arial, sans-serif';
  ctx.fillStyle = '#586854';
  ctx.fillText(`Дата выдачи: ${today}`, 90, 715);
  ctx.fillText('Статус: Знания подтверждены', 90, 738);

  ctx.textAlign = 'right';
  ctx.fillText(`ID: M3-FA-${certId}`, w - 90, 715);
  ctx.fillText('Команда «Здоровое будущее»', w - 90, 738);

  return canvas.toDataURL('image/png');
}

// --- Логика вопросов ---
function loadQuestion() {
  hasAnswered = false;
  const q = questions[currentQuestion];
  const total = questions.length;
  const currentNum = currentQuestion + 1;
  const percent = Math.round(((currentNum - 1) / total) * 100);

  stepIndicatorEl.textContent = `Вопрос ${currentNum} из ${total}`;
  percentIndicatorEl.textContent = `${percent}%`;
  progressFillEl.style.width = `${percent}%`;

  questionTextEl.textContent = q.question;
  optionsGroupEl.innerHTML = '';
  explanationBoxEl.style.display = 'none';
  explanationBoxEl.className = 'm3-explanation-banner';

  nextBtn.disabled = true;
  nextBtn.innerHTML = currentNum === total ? '<span>Завершить тест</span> <span>✓</span>' : '<span>Следующий вопрос</span> <span>&rarr;</span>';

  q.options.forEach((opt, index) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'm3-option-item';
    btn.innerHTML = `<span>${opt}</span><span style="opacity:0.4;">⚪</span>`;
    btn.onclick = () => selectAnswer(index, btn);
    optionsGroupEl.appendChild(btn);
  });
}

function selectAnswer(selectedIndex, selectedBtn) {
  if (hasAnswered) return;
  hasAnswered = true;

  const q = questions[currentQuestion];
  const allBtns = optionsGroupEl.querySelectorAll('.m3-option-item');

  allBtns.forEach((btn, index) => {
    btn.disabled = true;
    if (index === q.correct) {
      btn.classList.add('correct');
      btn.querySelector('span:last-child').textContent = '✅';
    }
  });

  if (selectedIndex === q.correct) {
    score++;
    explanationBoxEl.className = 'm3-explanation-banner correct';
    explanationBoxEl.innerHTML = `<strong>Верно!</strong> ${q.explanation}`;
  } else {
    selectedBtn.classList.add('wrong');
    selectedBtn.querySelector('span:last-child').textContent = '❌';
    explanationBoxEl.className = 'm3-explanation-banner wrong';
    explanationBoxEl.innerHTML = `<strong>Неверно.</strong> ${q.explanation}`;
  }

  explanationBoxEl.style.display = 'block';
  nextBtn.disabled = false;
}

function showResult() {
  quizContentEl.style.display = 'none';
  resultContentEl.style.display = 'block';

  const total = questions.length;
  const rec = getRecord();
  let isNewRecord = false;
  const today = new Date().toLocaleDateString('ru-RU');

  if (!rec || score > rec.score) {
    localStorage.setItem('m3_first_aid_record', score.toString());
    localStorage.setItem('m3_first_aid_total', total.toString());
    localStorage.setItem('m3_first_aid_date', today);
    isNewRecord = rec !== null && score > rec.score;
    updateRecordBadge();
  }

  let feedback = '';
  if (score === total) {
    feedback = 'Идеальный результат! Вы готовы уверенно действовать в любой экстренной ситуации.';
  } else if (score >= 3) {
    feedback = 'Отличные базовые знания! Но рекомендуем периодически освежать инструкции.';
  } else {
    feedback = 'Цена ошибки в первой помощи — человеческая жизнь. Рекомендуем повторить инструкции.';
  }

  const savedName = localStorage.getItem('m3_user_name') || '';

  let certHtml = '';
  if (score >= 3) {
    certHtml = `
      <div class="m3-cert-section">
        <h4 style="font-size:1.35rem; font-weight:800; color:var(--md-sys-color-primary); margin-bottom:0.5rem;">🎓 Электронный сертификат</h4>
        <p style="color:var(--md-sys-color-on-surface-variant); font-size:0.95rem; margin-bottom:1.25rem;">
          Норматив успешно сдан! Введите ваше имя для генерации сертификата:
        </p>
        <div style="display:flex; gap:0.75rem; flex-wrap:wrap; margin-bottom:1rem;">
          <input type="text" id="m3-cert-name" class="m3-input-field" placeholder="Имя и Фамилия" value="${savedName}" style="flex:1; min-width:240px;">
          <button type="button" id="m3-gen-cert-btn" class="m3-btn m3-btn-filled">Получить сертификат</button>
        </div>
        <div id="m3-cert-err" style="color:var(--md-sys-color-error); font-size:0.9rem; display:none; margin-bottom:0.75rem;"></div>

        <div id="m3-cert-preview" class="m3-cert-preview-card" style="display:none;">
          <img id="m3-cert-img" alt="Сертификат" />
          <a id="m3-download-btn" class="m3-btn m3-btn-filled" download="Сертификат_Первая_помощь_M3.png">📥 Скачать сертификат (PNG)</a>
        </div>
      </div>
    `;
  } else {
    certHtml = `
      <div style="margin-top:2rem; padding:1.25rem; background:var(--md-sys-color-tertiary-container); color:var(--md-sys-color-on-tertiary-container); border-radius:var(--md-shape-lg); text-align:left;">
        🔒 <strong>Сертификат временно заблокирован:</strong> выдается при результате от 3 правильных ответов. Изучите раздел «Инструкции» и пройдите тест повторно!
      </div>
    `;
  }

  resultContentEl.innerHTML = `
    <div style="text-align: center;">
      <h2 style="font-size: 2.2rem; font-weight: 800; color: var(--md-sys-color-primary); margin-bottom: 0.5rem;">Тест завершён!</h2>
      ${isNewRecord ? '<div style="color: var(--md-sys-color-success); font-weight: 700; margin-bottom: 0.5rem;">🎉 Новый рекорд платформы!</div>' : ''}
      <div style="font-size: 1.5rem; font-weight: 800; color: var(--md-sys-color-primary); margin: 0.75rem 0;">
        Ваш результат: ${score} из ${total}
      </div>
      <p style="color: var(--md-sys-color-on-surface-variant); margin-bottom: 1.75rem;">${feedback}</p>
      <button id="m3-restart-btn" class="m3-btn m3-btn-tonal" type="button">Пройти тест заново</button>
      ${certHtml}
    </div>
  `;

  document.getElementById('m3-restart-btn').onclick = restartQuiz;

  if (score >= 3) {
    const genBtn = document.getElementById('m3-gen-cert-btn');
    const nameInp = document.getElementById('m3-cert-name');
    const errEl = document.getElementById('m3-cert-err');
    const prevBox = document.getElementById('m3-cert-preview');
    const certImg = document.getElementById('m3-cert-img');
    const downBtn = document.getElementById('m3-download-btn');

    genBtn.onclick = () => {
      const name = nameInp.value.trim();
      if (name.length < 2) {
        errEl.textContent = 'Пожалуйста, введите корректное имя и фамилию (от 2 символов).';
        errEl.style.display = 'block';
        return;
      }
      errEl.style.display = 'none';
      localStorage.setItem('m3_user_name', name);

      const url = drawM3Certificate(name, score, total);
      certImg.src = url;
      downBtn.href = url;
      downBtn.download = `Сертификат_${name.replace(/\s+/g, '_')}_M3.png`;
      prevBox.style.display = 'block';
      prevBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };
  }
}

function restartQuiz() {
  currentQuestion = 0;
  score = 0;
  resultContentEl.style.display = 'none';
  quizContentEl.style.display = 'block';
  updateRecordBadge();
  loadQuestion();
}

nextBtn.onclick = () => {
  if (!hasAnswered) return;
  currentQuestion++;
  if (currentQuestion < questions.length) {
    loadQuestion();
  } else {
    percentIndicatorEl.textContent = '100%';
    progressFillEl.style.width = '100%';
    showResult();
  }
};

// Запуск
updateRecordBadge();
loadQuestion();
