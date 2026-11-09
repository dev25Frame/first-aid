
// Инициализация Firebase (ключи другие вставить)
const firebaseConfig = {
    apiKey: "AIzaSy...",
    authDomain: "first-aid-2026.firebaseapp.com",
    databaseURL: "https://first-aid-2026-default-rtdb.firebaseio.com",
    projectId: "first-aid-2026",
    storageBucket: "first-aid-2026.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abc123"
};

// Инициализация (если используется модульный Firebase, подключите SDK)
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Пример получения данных для теста
function loadQuestions() {
    database.ref('questions').once('value').then((snapshot) => {
        const questions = snapshot.val();
        // отобразить вопросы на странице test.html
    });
}
