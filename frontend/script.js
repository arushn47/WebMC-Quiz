const loginModal = document.getElementById('login-modal');
const registerModal = document.getElementById('register-modal');
const closeLoginBtn = document.getElementById('close-login-btn');
const closeRegisterBtn = document.getElementById('close-register-btn');
const showRegisterLink = document.getElementById('show-register-link');
const showLoginLink = document.getElementById('show-login-link');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');

const homeLink = document.getElementById('home-link');
const userNavLinks = document.getElementById('user-nav-links');
const myScoresLink = document.getElementById('my-scores-link');
const userInfo = document.getElementById('user-info');
const usernameDisplay = document.getElementById('username-display');
const logoutBtn = document.getElementById('logout-btn');
const showLoginBtnNav = document.getElementById('show-login-btn-nav');

const startScreen = document.getElementById('start-screen');
const quizScreen = document.getElementById('quiz-screen');
const endScreen = document.getElementById('end-screen');
const scoresScreen = document.getElementById('scores-screen');
const scoresContainer = document.getElementById('scores-container');
const backToStartBtn = document.getElementById('back-to-start-btn');

const startBtn = document.getElementById('start-btn');
const nextBtn = document.getElementById('next-btn');
const restartBtn = document.getElementById('restart-btn');
const progressText = document.getElementById('progress-text');
const progressBar = document.getElementById('progress-bar');
const currentScoreText = document.getElementById('current-score');
const questionText = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');
const feedbackSection = document.getElementById('feedback-section');
const feedbackDetails = document.getElementById('feedback-details');
const moreInfoBtn = document.getElementById('more-info-btn');
const furtherFeedback = document.getElementById('further-feedback');
const furtherFeedbackText = document.getElementById('further-feedback-text');
const scoreText = document.getElementById('score-text');

const API_URL = '/api';
const QUIZ_TITLE = 'IWP Formative Assessment';

let quizData = [];
let userAnswers = {};
let currentQuestionIndex = 0;
let score = 0;
let answerSelected = false;

loginForm.addEventListener('submit', handleLogin);
registerForm.addEventListener('submit', handleRegister);
logoutBtn.addEventListener('click', handleLogout);
closeLoginBtn.addEventListener('click', () => loginModal.classList.remove('active'));
closeRegisterBtn.addEventListener('click', () => registerModal.classList.remove('active'));
showRegisterLink.addEventListener('click', (e) => {
    e.preventDefault();
    loginModal.classList.remove('active');
    registerModal.classList.add('active');
});
showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    registerModal.classList.remove('active');
    loginModal.classList.add('active');
});
showLoginBtnNav.addEventListener('click', () => {
    loginModal.classList.add('active');
});
homeLink.addEventListener('click', (e) => {
    e.preventDefault();
    showScreen('start');
});
myScoresLink.addEventListener('click', (e) => {
    e.preventDefault();
    showScores();
});
backToStartBtn.addEventListener('click', () => showScreen('start'));
startBtn.addEventListener('click', handleStartClick);
nextBtn.addEventListener('click', nextQuestion);
restartBtn.addEventListener('click', () => showScreen('start'));
moreInfoBtn.addEventListener('click', toggleFurtherFeedback);
window.addEventListener('DOMContentLoaded', checkLoginStatus);

function showScreen(screenName) {
    [startScreen, quizScreen, endScreen, scoresScreen].forEach(s => {
        if (s) s.style.display = 'none';
    });

    let screenToShow;
    if (screenName === 'start') screenToShow = startScreen;
    if (screenName === 'quiz') screenToShow = quizScreen;
    if (screenName === 'end') screenToShow = endScreen;
    if (screenName === 'scores') screenToShow = scoresScreen;

    if (screenToShow) {
        screenToShow.style.display = 'block';
    }
}

function handleStartClick() {
    const token = localStorage.getItem('token');
    if (token) {
        startQuiz();
    } else {
        loginModal.classList.add('active');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('register-username').value;
    const password = document.getElementById('register-password').value;
    try {
        const res = await fetch(`${API_URL}/users/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.msg || 'Registration failed');
        localStorage.setItem('token', data.token);
        localStorage.setItem('username', username);
        registerModal.classList.remove('active');
        checkLoginStatus();
        showScreen('start');
    } catch (err) {
        alert(err.message);
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    try {
        const res = await fetch(`${API_URL}/users/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.msg || 'Login failed');
        localStorage.setItem('token', data.token);
        localStorage.setItem('username', username);
        loginModal.classList.remove('active');
        checkLoginStatus();
        showScreen('start');
    } catch (err) {
        alert(err.message);
    }
}

function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    checkLoginStatus();
    showScreen('start');
}

function checkLoginStatus() {
    const username = localStorage.getItem('username');
    if (username) {
        userNavLinks.classList.remove('hidden');
        userInfo.classList.remove('hidden');
        showLoginBtnNav.classList.add('hidden');
        usernameDisplay.textContent = username;
    } else {
        userNavLinks.classList.add('hidden');
        userInfo.classList.add('hidden');
        showLoginBtnNav.classList.remove('hidden');
    }
}

async function showScores() {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('You must be logged in to view scores.');
        return;
    }
    try {
        const res = await fetch(`${API_URL}/users/me/results`, {
            headers: { 'x-auth-token': token }
        });
        if (!res.ok) throw new Error('Could not fetch scores.');
        
        const scores = await res.json();
        scoresContainer.innerHTML = '';
        if (scores.length === 0) {
            scoresContainer.innerHTML = '<p>You have not completed any quizzes yet.</p>';
        } else {
            scores.forEach(s => {
                const scoreItem = document.createElement('div');
                scoreItem.className = 'score-item';
                
                const quizInfo = document.createElement('div');
                quizInfo.innerHTML = `<strong>${s.quizTitle}</strong>`;
                
                const scoreDetails = document.createElement('div');
                scoreDetails.className = 'score';
                scoreDetails.textContent = `${s.score} / ${s.totalQuestions}`;
                
                const dateDetails = document.createElement('div');
                dateDetails.className = 'date';
                dateDetails.textContent = new Date(s.completedAt).toLocaleString();

                scoreItem.appendChild(quizInfo);
                scoreItem.appendChild(scoreDetails);
                scoreItem.appendChild(dateDetails);
                scoresContainer.appendChild(scoreItem);
            });
        }
        showScreen('scores');
    } catch(err) {
        alert(err.message);
    }
}

async function startQuiz() {
    showScreen('quiz');
    try {
        const response = await fetch(`${API_URL}/quizzes/${QUIZ_TITLE}`);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        quizData = data.questions;
        if (quizData.length === 0) {
            alert('Could not load the quiz. Please try again later.');
            showScreen('start');
            return;
        }
        currentQuestionIndex = 0;
        score = 0;
        userAnswers = {};
        updateScoreDisplay();
        showQuestion();
    } catch (error) {
        console.error('Failed to start quiz:', error);
        showScreen('start');
    }
}

function updateProgressBar() {
    const progressPercentage = ((currentQuestionIndex) / quizData.length) * 100;
    progressBar.style.width = `${progressPercentage}%`;
}

function updateScoreDisplay() {
    currentScoreText.innerText = `Score: ${score}`;
}

function showQuestion() {
    resetState();
    updateProgressBar();
    const currentQuestion = quizData[currentQuestionIndex];
    progressText.innerText = `Question ${currentQuestionIndex + 1} / ${quizData.length}`;
    questionText.innerText = currentQuestion.question;
    furtherFeedbackText.innerText = currentQuestion.furtherInfo;
    currentQuestion.options.forEach((option) => {
        const button = document.createElement('button');
        button.className = 'option-btn';
        button.textContent = option.text;
        button.dataset.correct = option.isCorrect;
        button.addEventListener('click', (e) => selectAnswer(e, option.text));
        optionsContainer.appendChild(button);
    });
}

function resetState() {
    nextBtn.classList.add('hidden');
    feedbackSection.classList.add('hidden');
    furtherFeedback.classList.add('hidden');
    moreInfoBtn.innerText = "Show More Information";
    answerSelected = false;
    optionsContainer.innerHTML = '';
    feedbackDetails.innerHTML = '';
}

function selectAnswer(e, selectedText) {
    if (answerSelected) return;
    answerSelected = true;
    const currentQuestion = quizData[currentQuestionIndex];
    userAnswers[currentQuestion._id] = selectedText;
    const selectedBtn = e.currentTarget;
    const isCorrect = selectedBtn.dataset.correct === 'true';
    
    if (isCorrect) {
        score++;
        updateScoreDisplay();
    }

    Array.from(optionsContainer.children).forEach(button => {
        button.disabled = true;
        if (button.dataset.correct === 'true') {
            button.classList.add('correct');
        } else {
            button.classList.add('incorrect');
        }
    });

    showFeedback();

    if (currentQuestionIndex < quizData.length - 1) {
        nextBtn.innerText = "Next Question";
    } else {
        nextBtn.innerText = "Finish Quiz & See Score";
    }
    nextBtn.classList.remove('hidden');
}

function showFeedback() {
    const currentQuestion = quizData[currentQuestionIndex];
    feedbackDetails.innerHTML = ''; // Clear previous feedback
    currentQuestion.options.forEach(option => {
        const feedbackDiv = document.createElement('div');
        feedbackDiv.innerHTML = `<strong>${option.text}:</strong> ${option.feedback}`;
        feedbackDetails.appendChild(feedbackDiv);
    });
    feedbackSection.classList.remove('hidden');
    
    if (currentQuestion.furtherInfo) {
        moreInfoBtn.classList.remove('hidden');
    } else {
        moreInfoBtn.classList.add('hidden');
    }
}

function toggleFurtherFeedback() {
    furtherFeedback.classList.toggle('hidden');
    const isHidden = furtherFeedback.classList.contains('hidden');
    moreInfoBtn.innerText = isHidden ? "Show More Information" : "Hide More Information";
}

async function nextQuestion() {
    currentQuestionIndex++;
    if (currentQuestionIndex < quizData.length) {
        showQuestion();
    } else {
        progressBar.style.width = '100%';
        await submitAndShowEndScreen();
    }
}

async function submitAndShowEndScreen() {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${API_URL}/quizzes/${QUIZ_TITLE}/submit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': token
            },
            body: JSON.stringify({ answers: userAnswers }),
        });
        const result = await response.json();
        showScreen('end');
        scoreText.innerText = `${result.score} / ${result.totalQuestions}`;
    } catch (error) {
        console.error('Error submitting quiz:', error);
        alert('Could not submit your score. Please try again.');
    }
}