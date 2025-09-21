document.addEventListener('DOMContentLoaded', () => {
    let currentQuiz = null;
    let currentQuestionIndex = 0;
    let score = 0;
    let userAnswers = {};

    const usernameSpan = document.getElementById('username');
    const mainDashboard = document.getElementById('main-dashboard');
    const quizView = document.getElementById('quiz-view');
    const resultView = document.getElementById('result-view');
    const quizListContainer = document.getElementById('quiz-list');
    const resultsListContainer = document.getElementById('results-list');
    const quizListLoader = document.getElementById('quiz-list-loader');
    const resultsListLoader = document.getElementById('results-list-loader');
    const quizTitle = document.getElementById('quiz-title');
    const questionNumber = document.getElementById('question-number');
    const totalQuestions = document.getElementById('total-questions');
    const progressBar = document.getElementById('progress-bar');
    const questionContainer = document.getElementById('question-container');
    const feedbackContainer = document.getElementById('feedback-container');
    const nextBtn = document.getElementById('next-btn');
    const finalScore = document.getElementById('final-score');
    const resultTotalQuestions = document.getElementById('result-total-questions');
    
    const show = el => { if(el) el.classList.remove('view-hidden'); };
    const hide = el => { if(el) el.classList.add('view-hidden'); };
    const getAuthToken = () => localStorage.getItem('webmc_token');
    const getUser = () => JSON.parse(localStorage.getItem('webmc_user'));
    
    const escapeHTML = (str) => {
        if (typeof str !== 'string') return '';
        const p = document.createElement('p');
        p.textContent = str;
        return p.innerHTML;
    };

    const checkAuth = () => {
        const user = getUser();
        const token = getAuthToken();
        if (!token || !user || user.role !== 'student') {
            window.location.href = '/index.html';
            return false;
        }
        usernameSpan.textContent = user.username;
        return true;
    };
    
    const fetchApi = async (url, options = {}) => {
        const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getAuthToken()}`, ...options.headers };
        const response = await fetch(url, { ...options, headers });
        if (!response.ok) { 
            const errorData = await response.json().catch(() => ({ message: 'An unknown server error occurred.' }));
            throw new Error(errorData.message); 
        }
        return response.json();
    };

    const displayQuizzes = (quizzes) => {
        quizListContainer.innerHTML = '';
        if (!quizzes || quizzes.length === 0) {
            quizListContainer.innerHTML = `<div class="text-center text-gray-500 p-4 bg-white rounded-lg shadow">No new quizzes available.</div>`;
            return;
        }
        quizzes.forEach(quiz => {
            const card = document.createElement('div');
            card.className = 'bg-white shadow-md rounded-lg p-6 hover:shadow-lg transition-shadow';
            card.innerHTML = `<h3 class="text-xl font-bold text-gray-800">${escapeHTML(quiz.title)}</h3><p class="text-gray-600 mt-2">${escapeHTML(quiz.description)}</p><button data-action="start-quiz" data-quiz-id="${quiz._id}" class="mt-4 w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700">Start Practice</button>`;
            quizListContainer.appendChild(card);
        });
    };

    const displayResults = (results) => {
        resultsListContainer.innerHTML = '';
        if (!results || results.length === 0) {
            resultsListContainer.innerHTML = `<div class="text-center text-gray-500 p-4 bg-white rounded-lg shadow">No past results yet.</div>`;
            return;
        }
        results.forEach(result => {
            const card = document.createElement('div');
            card.className = 'bg-white shadow-md rounded-lg p-6';
            const retakeButton = result.quizId ? `<button data-action="retake-quiz" data-quiz-id="${result.quizId}" class="mt-4 w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 font-semibold">Practice Again</button>` : '';
            card.innerHTML = `<div class="flex justify-between items-start"><div><h3 class="text-xl font-bold text-gray-800">${escapeHTML(result.quizTitle)}</h3><p class="text-sm text-gray-500 mt-1">Last score: <span class="font-semibold">${result.score} / ${result.totalQuestions}</span></p></div><p class="text-sm text-gray-500">Completed: ${new Date(result.submittedAt).toLocaleDateString()}</p></div>${retakeButton}`;
            resultsListContainer.appendChild(card);
        });
    };

    const startQuiz = async (quizId) => {
        try {
            currentQuiz = await fetchApi(`/api/quizzes/${quizId}`);
            if (!currentQuiz.questions || currentQuiz.questions.length === 0) { throw new Error('This quiz has no questions.'); }
            currentQuestionIndex = 0;
            score = 0;
            userAnswers = {};
            hide(mainDashboard);
            hide(resultView);
            show(quizView);
            renderQuestion();
        } catch (error) {
            alert(`Error starting quiz: ${error.message}`);
        }
    };

    const renderQuestion = () => {
        hide(nextBtn);
        feedbackContainer.innerHTML = '';
        const question = currentQuiz.questions[currentQuestionIndex];
        quizTitle.textContent = escapeHTML(currentQuiz.title);
        questionNumber.textContent = currentQuestionIndex + 1;
        totalQuestions.textContent = currentQuiz.questions.length;
        progressBar.style.width = `${((currentQuestionIndex + 1) / currentQuiz.questions.length) * 100}%`;
        
        questionContainer.innerHTML = `
            <p class="text-xl font-semibold mb-6">${escapeHTML(question.text)}</p>
            <div id="options-container" class="space-y-4">
                ${question.options.map((opt, index) => `
                    <div><label class="flex items-center p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition"><input type="radio" name="option" value="${index}" class="h-5 w-5 text-indigo-600 border-gray-300 focus:ring-indigo-500"><span class="ml-4 text-gray-800">${escapeHTML(opt)}</span></label></div>
                `).join('')}
            </div>
        `;
    };

    const handleAnswerSelection = (e) => {
        if (e.target.name !== 'option') return;

        const selectedIndex = parseInt(e.target.value);
        const question = currentQuiz.questions[currentQuestionIndex];
        const isCorrect = selectedIndex === question.correctAnswerIndex;

        if (isCorrect) { score++; }

        document.querySelectorAll('input[name="option"]').forEach(input => {
            input.disabled = true;
            const label = input.closest('label');
            const answerIndex = parseInt(input.value);
            if (answerIndex === question.correctAnswerIndex) {
                label.classList.add('bg-green-100', 'border-green-400', 'ring-2', 'ring-green-300');
            } else if (answerIndex === selectedIndex) {
                label.classList.add('bg-red-100', 'border-red-400', 'ring-2', 'ring-red-300');
            }
        });

        const feedbackText = question.feedback || (isCorrect ? "Correct! Well done." : "That's not quite right. The correct answer is highlighted in green.");
        feedbackContainer.innerHTML = `<div class="p-4 mt-4 rounded-md ${isCorrect ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}"><p class="font-semibold">${isCorrect ? 'Correct!' : 'Incorrect'}</p><p>${escapeHTML(feedbackText)}</p></div>`;
        
        nextBtn.textContent = (currentQuestionIndex === currentQuiz.questions.length - 1) ? 'Finish Practice' : 'Next Question';
        show(nextBtn);
    };

    const finishQuiz = async () => {
        try {
            await fetchApi('/api/results', { 
                method: 'POST', 
                body: JSON.stringify({ 
                    quizId: currentQuiz._id, 
                    score: score, 
                    totalQuestions: currentQuiz.questions.length
                }) 
            });
            finalScore.textContent = score;
            resultTotalQuestions.textContent = currentQuiz.questions.length;
            hide(quizView);
            show(resultView);
        } catch (error) {
            alert(`Error submitting results: ${error.message}`);
        }
    };
    
    const loadInitialData = async () => {
        show(quizListLoader);
        show(resultsListLoader);
        try {
            const [fetchedResults, fetchedQuizzes] = await Promise.all([
                fetchApi('/api/results'),
                fetchApi('/api/quizzes')
            ]);
            const takenQuizIds = new Set(fetchedResults.map(r => r.quizId).filter(Boolean));
            const availableQuizzes = fetchedQuizzes.filter(q => !takenQuizIds.has(q._id));
            displayQuizzes(availableQuizzes);
            displayResults(fetchedResults);
        } catch (error) {
            alert(`Error loading dashboard: ${error.message}`);
        } finally {
            hide(quizListLoader);
            hide(resultsListLoader);
        }
    };

    if (checkAuth()) {
        loadInitialData();
        document.body.addEventListener('click', (e) => {
            const target = e.target.closest('button');
            if (!target) return;
            if (target.id === 'logout-btn') { 
                localStorage.clear(); 
                window.location.href = '/index.html'; 
            }
            if (target.id === 'return-to-dashboard-btn') { 
                hide(resultView); 
                show(mainDashboard); 
                loadInitialData(); 
            }
            const action = target.dataset.action;
            if (action === 'start-quiz' || action === 'retake-quiz') {
                startQuiz(target.dataset.quizId);
            }
        });

        questionContainer.addEventListener('change', handleAnswerSelection);

        nextBtn.addEventListener('click', () => {
            if (currentQuestionIndex < currentQuiz.questions.length - 1) {
                currentQuestionIndex++;
                renderQuestion();
            } else {
                finishQuiz();
            }
        });
    }
});

