document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT ---
    let quizzes = [];
    let pastResults = [];
    let currentQuiz = null;
    let currentQuestionIndex = 0;
    let userAnswers = {};

    // --- DOM ELEMENT SELECTORS ---
    const userGreeting = document.getElementById('user-greeting');
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
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const submitBtn = document.getElementById('submit-btn');
    const finalScore = document.getElementById('final-score');
    const resultTotalQuestions = document.getElementById('result-total-questions');
    const scorePercentage = document.getElementById('score-percentage');
    const reviewContainer = document.getElementById('review-container');
    const customModal = document.getElementById('custom-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');
    const modalButtons = document.getElementById('modal-buttons');

    // --- UTILITY FUNCTIONS ---
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

    const showMessageModal = (title, message, buttons) => {
        modalTitle.textContent = title;
        modalMessage.textContent = message;
        modalButtons.innerHTML = '';
        buttons.forEach(btn => {
            const buttonEl = document.createElement('button');
            buttonEl.textContent = btn.text;
            buttonEl.className = btn.classes;
            buttonEl.onclick = btn.onClick;
            modalButtons.appendChild(buttonEl);
        });
        show(customModal);
    };

    // --- AUTHENTICATION ---
    const checkAuth = () => {
        const user = getUser();
        const token = getAuthToken();
        if (!token || !user || user.role !== 'student') {
            window.location.href = '/index.html';
            return false;
        }
        userGreeting.textContent = `Welcome, ${user.username}!`;
        show(userGreeting);
        return true;
    };
    
    // --- API CALLS ---
     const fetchApi = async (url, options = {}) => {
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`, ...options.headers,
        };
        const response = await fetch(url, { ...options, headers });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: `Server returned status ${response.status}` }));
            throw new Error(errorData.message);
        }
        return response.json();
    };


    // --- RENDER FUNCTIONS ---
    const displayQuizzes = (quizzesToDisplay) => {
        quizListContainer.innerHTML = '';
        if (!quizzesToDisplay || quizzesToDisplay.length === 0) {
            quizListContainer.innerHTML = `<div class="text-center text-gray-500 p-4 bg-white rounded-lg shadow">No new quizzes available.</div>`;
            return;
        }
        quizzesToDisplay.forEach(quiz => {
            const questionCount = quiz.questions ? quiz.questions.length : 0;
            const card = document.createElement('div');
            card.className = 'bg-white shadow-md rounded-lg p-6 hover:shadow-lg transition-shadow';
            card.innerHTML = `
                <h3 class="text-xl font-bold text-gray-800">${escapeHTML(quiz.title)}</h3>
                <p class="text-gray-600 mt-2">${escapeHTML(quiz.description)}</p>
                <p class="text-sm text-gray-500 mt-4">Questions: ${questionCount}</p>
                <button data-action="start-quiz" data-quiz-id="${quiz._id}" class="mt-4 w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 ${questionCount === 0 ? 'opacity-50 cursor-not-allowed' : ''}" ${questionCount === 0 ? 'disabled' : ''}>Start Quiz</button>
            `;
            quizListContainer.appendChild(card);
        });
    };

    const displayResults = (resultsToDisplay) => {
        resultsListContainer.innerHTML = '';
        if (!resultsToDisplay || resultsToDisplay.length === 0) {
            resultsListContainer.innerHTML = `<div class="text-center text-gray-500 p-4 bg-white rounded-lg shadow">No past results yet.</div>`;
            return;
        }
        resultsToDisplay.forEach(result => {
            if(!result || typeof result.score === 'undefined' || !result.totalQuestions) return;
            const card = document.createElement('div');
            card.className = 'bg-white shadow-md rounded-lg p-6';
            const scoreColor = (result.score / result.totalQuestions) >= 0.7 ? 'text-green-600' : 'text-yellow-600';
            const retakeButton = result.quizId 
                ? `<button data-action="retake-quiz" data-quiz-id="${result.quizId}" class="mt-4 w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 font-semibold">Retake Quiz</button>`
                : '';
            card.innerHTML = `
                <div class="flex justify-between items-start">
                    <div>
                        <h3 class="text-xl font-bold text-gray-800">${escapeHTML(result.quizTitle)}</h3>
                        <p class="text-sm text-gray-500 mt-1">Completed: ${new Date(result.submittedAt).toLocaleDateString()}</p>
                    </div>
                    <p class="text-lg font-semibold ${scoreColor}"> ${result.score} / ${result.totalQuestions}</p>
                </div>
                ${retakeButton}
            `;
            resultsListContainer.appendChild(card);
        });
    };
    
    // --- *** NEW: Review Mode Renderer *** ---
    const displayReview = (quiz, studentAnswers) => {
        reviewContainer.innerHTML = '';
        quiz.questions.forEach((q, index) => {
            const studentAnswerIndex = parseInt(studentAnswers[q._id]);
            const isCorrect = studentAnswerIndex === q.correctAnswerIndex;

            const reviewCard = document.createElement('div');
            reviewCard.className = `bg-white p-6 rounded-lg shadow-md border-l-4 ${isCorrect ? 'border-green-500' : 'border-red-500'}`;
            
            let optionsHtml = q.options.map((opt, i) => {
                let liClass = 'text-gray-700';
                let indicator = '';

                if (i === q.correctAnswerIndex) {
                    liClass = 'font-bold text-green-700';
                    indicator = ` (Correct Answer)`;
                }
                if (i === studentAnswerIndex && !isCorrect) {
                    liClass = 'font-bold text-red-700';
                    indicator = ` (Your Answer)`;
                }

                return `<li class="${liClass}">${escapeHTML(opt)}${indicator}</li>`;
            }).join('');
            
            // This part assumes your original seed data format for feedback.
            // A more robust solution would be to have feedback directly in the main question schema.
            // For now, this demonstrates the concept.
            let feedbackText = '';
            if (quiz.questions[index].feedback && quiz.questions[index].feedback[studentAnswerIndex]) {
                 feedbackText = quiz.questions[index].feedback[studentAnswerIndex].feedback;
            }

            reviewCard.innerHTML = `
                <p class="font-semibold text-lg">${index + 1}. ${escapeHTML(q.text)}</p>
                <ul class="list-disc list-inside mt-3 mb-4 space-y-1">${optionsHtml}</ul>
                ${feedbackText ? `<div class="mt-3 p-3 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 text-sm rounded-r-lg"><p class="font-semibold">Feedback:</p><p>${escapeHTML(feedbackText)}</p></div>` : ''}
            `;
            reviewContainer.appendChild(reviewCard);
        });
    };


    // --- QUIZ LOGIC ---
    const startQuiz = async (quizId) => {
        try {
            currentQuiz = await fetchApi(`/api/quizzes/${quizId}`);
            if (!currentQuiz.questions || currentQuiz.questions.length === 0) {
                throw new Error('This quiz has no questions.');
            }
            userAnswers = {};
            currentQuestionIndex = 0;
            hide(mainDashboard);
            hide(resultView);
            show(quizView);
            renderQuestion();
        } catch (error) {
             showMessageModal('Error', error.message, [{ text: 'OK', classes: 'px-4 py-2 bg-indigo-500 text-white rounded-md', onClick: () => hide(customModal) }]);
        }
    };

    const renderQuestion = () => { /* ... no changes ... */ 
        const question = currentQuiz.questions[currentQuestionIndex];
        quizTitle.textContent = escapeHTML(currentQuiz.title);
        questionNumber.textContent = currentQuestionIndex + 1;
        totalQuestions.textContent = currentQuiz.questions.length;
        progressBar.style.width = `${((currentQuestionIndex + 1) / currentQuiz.questions.length) * 100}%`;
        questionContainer.innerHTML = `<p class="text-xl font-semibold mb-6">${escapeHTML(question.text)}</p><div class="space-y-4">${question.options.map((opt, index) => `<div><label class="flex items-center p-4 border rounded-lg has-[:checked]:bg-indigo-50 has-[:checked]:border-indigo-500 cursor-pointer transition"><input type="radio" name="option" value="${index}" class="h-5 w-5 text-indigo-600 border-gray-300 focus:ring-indigo-500" ${userAnswers[question._id] == index ? 'checked' : ''}><span class="ml-4 text-gray-800">${escapeHTML(opt)}</span></label></div>`).join('')}</div>`;
        updateNavButtons();
    };

    const updateNavButtons = () => { /* ... no changes ... */ 
        prevBtn.disabled = currentQuestionIndex === 0;
        prevBtn.classList.toggle('opacity-50', prevBtn.disabled);
        if (currentQuestionIndex === currentQuiz.questions.length - 1) { hide(nextBtn); show(submitBtn); } else { show(nextBtn); hide(submitBtn); }
    };
    
    const submitQuiz = async () => {
        try {
            const result = await fetchApi('/api/results', {
                method: 'POST',
                body: JSON.stringify({ quizId: currentQuiz._id, answers: userAnswers })
            });
            
            finalScore.textContent = result.score;
            resultTotalQuestions.textContent = result.totalQuestions;
            const percentage = Math.round((result.score / result.totalQuestions) * 100);
            scorePercentage.textContent = `That's ${percentage}%!`;
            
            // Call the new review display function
            displayReview(result.quiz, userAnswers);

            hide(quizView);
            show(resultView);
        } catch (error) {
             showMessageModal('Error', error.message, [{ text: 'OK', classes: 'px-4 py-2 bg-indigo-500 text-white rounded-md', onClick: () => hide(customModal) }]);
        }
    };
    
    const handlePageClick = (e) => {
        const target = e.target.closest('button');
        if (!target) return;
        
        switch (target.id) {
            case 'logout-btn': localStorage.removeItem('webmc_token'); localStorage.removeItem('webmc_user'); window.location.href = '/index.html'; return;
            case 'return-to-dashboard-btn': hide(resultView); show(mainDashboard); loadInitialData(); return;
        }

        const action = target.dataset.action;
        if (action === 'start-quiz' || action === 'retake-quiz') {
            startQuiz(target.dataset.quizId);
        }
    };

    // --- MAIN DATA LOADER ---
    const loadInitialData = async () => { /* ... no changes ... */ 
        show(quizListLoader);
        show(resultsListLoader);
        try {
            const [fetchedResults, fetchedQuizzes] = await Promise.all([ fetchApi('/api/results'), fetchApi('/api/quizzes') ]);
            pastResults = fetchedResults;
            quizzes = fetchedQuizzes;
            const takenQuizIds = new Set(pastResults.map(r => r.quizId).filter(Boolean));
            const availableQuizzes = quizzes.filter(q => !takenQuizIds.has(q._id));
            displayQuizzes(availableQuizzes);
            displayResults(pastResults);
        } catch (error) {
            console.error('Error loading dashboard:', error);
            showMessageModal('Error Loading Dashboard', `Details: ${error.message}`, [{ text: 'OK', classes: 'px-4 py-2 bg-indigo-500 text-white rounded-md', onClick: () => hide(customModal) }]);
        } finally {
            hide(quizListLoader);
            hide(resultsListLoader);
        }
    };

    // --- INITIALIZATION ---
    if (checkAuth()) {
        loadInitialData();
        
        document.body.addEventListener('click', handlePageClick);
        prevBtn.addEventListener('click', () => { if (currentQuestionIndex > 0) { currentQuestionIndex--; renderQuestion(); } });
        nextBtn.addEventListener('click', () => { const s = document.querySelector('input[name="option"]:checked'); if (!s) { showMessageModal('Selection Required', 'Please select an answer.', [{ text: 'OK', classes: 'px-4 py-2 bg-indigo-500 text-white rounded-md', onClick: () => hide(customModal) }]); return; } userAnswers[currentQuiz.questions[currentQuestionIndex]._id] = s.value; if (currentQuestionIndex < currentQuiz.questions.length - 1) { currentQuestionIndex++; renderQuestion(); } });
        submitBtn.addEventListener('click', () => { const s = document.querySelector('input[name="option"]:checked'); if (!s) { showMessageModal('Selection Required', 'Please select an answer.', [{ text: 'OK', classes: 'px-4 py-2 bg-indigo-500 text-white rounded-md', onClick: () => hide(customModal) }]); return; } userAnswers[currentQuiz.questions[currentQuestionIndex]._id] = s.value; showMessageModal('Confirm Submission', 'Are you sure you want to submit?', [ { text: 'Cancel', classes: 'px-4 py-2 bg-gray-200 rounded-md', onClick: () => hide(customModal) }, { text: 'Submit', classes: 'px-4 py-2 bg-green-600 text-white rounded-md', onClick: () => { hide(customModal); submitQuiz(); } } ]); });
    }
});

