document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT ---
    let quizzes = []; // Local cache of quizzes to avoid re-fetching
    let currentQuizId = null;
    let currentQuestionId = null;

    // --- DOM ELEMENT SELECTORS ---
    const usernameSpan = document.getElementById('username');
    const quizzesContainer = document.getElementById('quizzes-container');
    const createQuizForm = document.getElementById('create-quiz-form');
    // Modals
    const addQuestionModal = document.getElementById('add-question-modal');
    const editQuizModal = document.getElementById('edit-quiz-modal');
    const editQuestionModal = document.getElementById('edit-question-modal');
    // Forms
    const addQuestionForm = document.getElementById('add-question-form');
    const editQuizForm = document.getElementById('edit-quiz-form');
    const editQuestionForm = document.getElementById('edit-question-form');
    // Loader
    const loader = document.getElementById('loader');
    const mainContent = document.getElementById('main-content');
    // Universal Modal
    const customModal = document.getElementById('custom-modal');
    const modalMessage = document.getElementById('modal-message');
    const modalOkButton = document.getElementById('modal-ok-button');
    const modalConfirmButton = document.getElementById('modal-confirm-button');
    const modalCancelButton = document.getElementById('modal-cancel-button');


    // --- UTILITY FUNCTIONS ---
    const show = el => el.classList.remove('hidden');
    const hide = el => el.classList.add('hidden');
    const showLoader = () => { hide(mainContent); show(loader); };
    const hideLoader = () => { show(mainContent); hide(loader); };
    const getAuthToken = () => localStorage.getItem('webmc_token');
    const getUser = () => JSON.parse(localStorage.getItem('webmc_user'));

    // *** THIS IS THE FIX ***
    // This function prevents the browser from interpreting option text as HTML.
    const escapeHTML = (str) => {
        const p = document.createElement('p');
        p.textContent = str;
        return p.innerHTML;
    };

    const showMessageModal = (message) => {
        modalMessage.textContent = message;
        show(modalOkButton);
        hide(modalConfirmButton);
        hide(modalCancelButton);
        show(customModal);
    };

    const showConfirmModal = (message, onConfirm) => {
        modalMessage.textContent = message;
        hide(modalOkButton);
        show(modalConfirmButton);
        show(modalCancelButton);
        show(customModal);
        
        const newConfirmButton = modalConfirmButton.cloneNode(true);
        modalConfirmButton.parentNode.replaceChild(newConfirmButton, modalConfirmButton);
        
        newConfirmButton.addEventListener('click', () => {
            onConfirm();
            hide(customModal);
        }, { once: true });
    };

    // --- AUTHENTICATION ---
    const checkAuth = () => {
        const user = getUser();
        const token = getAuthToken();
        if (!token || !user || user.role !== 'teacher') {
            window.location.href = '/index.html';
            return;
        }
        usernameSpan.textContent = user.username;
    };

    // --- API CALLS ---
    const fetchApi = async (url, options = {}) => {
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`,
            ...options.headers,
        };
        const response = await fetch(url, { ...options, headers });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || `HTTP error! status: ${response.status}`);
        }
        return data;
    };

    // --- RENDER FUNCTIONS ---
    const renderQuizzes = () => {
        quizzesContainer.innerHTML = '';
        if (quizzes.length === 0) {
            quizzesContainer.innerHTML = `<div class="text-center text-gray-500 py-8 col-span-full">
                <svg xmlns="http://www.w3.org/2000/svg" class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                <h3 class="mt-2 text-sm font-medium text-gray-900">No Quizzes Yet</h3>
                <p class="mt-1 text-sm text-gray-500">Use the form on the left to create your first quiz.</p>
            </div>`;
            return;
        }
        quizzes.forEach(quiz => {
            const quizCard = document.createElement('div');
            quizCard.className = 'bg-white shadow-lg rounded-lg overflow-hidden';
            quizCard.innerHTML = `
                <div class="p-6">
                    <h3 class="text-xl font-bold text-gray-800">${escapeHTML(quiz.title)}</h3>
                    <p class="text-gray-600 mt-2">${escapeHTML(quiz.description) || 'No description.'}</p>
                    <p class="text-sm text-gray-500 mt-4">Questions: ${quiz.questions.length}</p>
                    <div class="mt-4 flex flex-wrap gap-2">
                        <button data-action="toggle-questions" data-quiz-id="${quiz._id}" class="flex-1 text-sm font-semibold bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300">View Questions</button>
                        <button data-action="add-question" data-quiz-id="${quiz._id}" class="flex-1 text-sm font-semibold bg-indigo-100 text-indigo-700 py-2 px-4 rounded-md hover:bg-indigo-200">Add Question</button>
                    </div>
                     <div class="mt-2 flex flex-wrap gap-2">
                        <button data-action="edit-quiz" data-quiz-id="${quiz._id}" class="flex-1 text-sm font-semibold bg-yellow-100 text-yellow-800 py-2 px-4 rounded-md hover:bg-yellow-200">Edit Details</button>
                        <button data-action="delete-quiz" data-quiz-id="${quiz._id}" class="flex-1 text-sm font-semibold bg-red-100 text-red-800 py-2 px-4 rounded-md hover:bg-red-200">Delete Quiz</button>
                    </div>
                </div>
                <details id="details-${quiz._id}" class="bg-gray-50">
                    <summary class="hidden"></summary>
                    <div class="p-4 border-t border-gray-200" id="questions-list-${quiz._id}">
                        <!-- Questions will be injected here -->
                    </div>
                </details>
            `;
            quizzesContainer.appendChild(quizCard);
        });
    };

    const renderQuestionsForQuiz = (quizId) => {
        const quiz = quizzes.find(q => q._id === quizId);
        const container = document.getElementById(`questions-list-${quizId}`);
        if (!quiz || !container) return;
        container.innerHTML = '';
        if (quiz.questions.length === 0) {
            container.innerHTML = `<p class="text-sm text-gray-500">No questions added yet.</p>`;
            return;
        }
        quiz.questions.forEach((q, index) => {
            const questionEl = document.createElement('div');
            questionEl.className = 'p-3 border-b border-gray-200 last:border-b-0 flex justify-between items-center';
            questionEl.innerHTML = `
                <div class="flex-1 mr-4">
                    <p class="font-semibold">${index + 1}. ${escapeHTML(q.text)}</p>
                    <ul class="list-disc list-inside text-sm text-gray-600 mt-1">
                        <!-- *** THIS IS THE FIX *** -->
                        ${q.options.map((opt, i) => `<li class="${i === q.correctAnswerIndex ? 'font-bold text-green-600' : ''}">${escapeHTML(opt)}</li>`).join('')}
                    </ul>
                </div>
                <div class="flex space-x-2 flex-shrink-0">
                    <button data-action="edit-question" data-quiz-id="${quizId}" data-question-id="${q._id}" class="p-1 text-gray-500 hover:text-blue-600" title="Edit Question">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536l12.232-12.232z" /></svg>
                    </button>
                    <button data-action="delete-question" data-quiz-id="${quizId}" data-question-id="${q._id}" class="p-1 text-gray-500 hover:text-red-600" title="Delete Question">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                </div>
            `;
            container.appendChild(questionEl);
        });
    };

    // --- MODAL & FORM LOGIC ---
    const populateAddQuestionForm = () => {
        addQuestionForm.innerHTML = `
            <div>
                <label class="block text-sm font-medium text-gray-700">Question Text</label>
                <input type="text" name="text" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700">Options & Correct Answer</label>
                ${[0, 1, 2, 3].map(i => `
                    <div class="flex items-center space-x-2 mt-2">
                        <input type="radio" name="correctAnswerIndex" value="${i}" required class="h-4 w-4 text-indigo-600">
                        <input type="text" name="options" required class="block w-full rounded-md border-gray-300 shadow-sm sm:text-sm">
                    </div>`).join('')}
            </div>
            <div class="pt-4 flex justify-end space-x-2">
                <button type="button" data-action="close-modal" class="px-4 py-2 bg-gray-200 rounded-md">Cancel</button>
                <button type="submit" class="px-4 py-2 bg-indigo-600 text-white rounded-md">Add Question</button>
            </div>
        `;
    };

    const populateEditQuizForm = (quiz) => {
        editQuizForm.innerHTML = `
            <div>
                <label class="block text-sm font-medium text-gray-700">Quiz Title</label>
                <input type="text" name="title" value="${quiz.title}" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700">Description</label>
                <textarea name="description" rows="3" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm">${quiz.description || ''}</textarea>
            </div>
            <div class="pt-4 flex justify-end space-x-2">
                <button type="button" data-action="close-modal" class="px-4 py-2 bg-gray-200 rounded-md">Cancel</button>
                <button type="submit" class="px-4 py-2 bg-indigo-600 text-white rounded-md">Save Changes</button>
            </div>
        `;
    };

    const populateEditQuestionForm = (question) => {
        editQuestionForm.innerHTML = `
             <div>
                <label class="block text-sm font-medium text-gray-700">Question Text</label>
                <input type="text" name="text" value="${question.text}" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700">Options & Correct Answer</label>
                ${question.options.map((opt, i) => `
                    <div class="flex items-center space-x-2 mt-2">
                        <input type="radio" name="correctAnswerIndex" value="${i}" ${i === question.correctAnswerIndex ? 'checked' : ''} required class="h-4 w-4 text-indigo-600">
                        <input type="text" name="options" value="${opt}" required class="block w-full rounded-md border-gray-300 shadow-sm sm:text-sm">
                    </div>`).join('')}
            </div>
            <div class="pt-4 flex justify-end space-x-2">
                <button type="button" data-action="close-modal" class="px-4 py-2 bg-gray-200 rounded-md">Cancel</button>
                <button type="submit" class="px-4 py-2 bg-indigo-600 text-white rounded-md">Save Changes</button>
            </div>
        `;
    };

    // --- EVENT HANDLERS ---
    const handlePageClick = (e) => {
        const target = e.target.closest('button');
        if (!target) return;

        const action = target.dataset.action;
        const quizId = target.dataset.quizId;
        const questionId = target.dataset.questionId;

        switch (action) {
            case 'toggle-questions':
                const detailsElement = document.getElementById(`details-${quizId}`);
                if (detailsElement) {
                    if (detailsElement.open) {
                        detailsElement.open = false;
                        target.textContent = 'View Questions';
                    } else {
                        renderQuestionsForQuiz(quizId);
                        detailsElement.open = true;
                        target.textContent = 'Hide Questions';
                    }
                }
                break;
            case 'add-question':
                currentQuizId = quizId;
                populateAddQuestionForm();
                show(addQuestionModal);
                break;
            case 'edit-quiz':
                currentQuizId = quizId;
                const quizToEdit = quizzes.find(q => q._id === quizId);
                populateEditQuizForm(quizToEdit);
                show(editQuizModal);
                break;
            case 'delete-quiz':
                showConfirmModal('Are you sure you want to delete this quiz? This action cannot be undone and will delete all student results for this quiz.', () => handleDeleteQuiz(quizId));
                break;
            case 'edit-question':
                currentQuizId = quizId;
                currentQuestionId = questionId;
                const quizForEdit = quizzes.find(q => q._id === quizId);
                const questionToEdit = quizForEdit.questions.find(q => q._id === questionId);
                populateEditQuestionForm(questionToEdit);
                show(editQuestionModal);
                break;
            case 'delete-question':
                showConfirmModal('Are you sure you want to delete this question?', () => handleDeleteQuestion(quizId, questionId));
                break;
            case 'close-modal':
                hide(addQuestionModal);
                hide(editQuizModal);
                hide(editQuestionModal);
                break;
        }

        if (target.id === 'logout-btn') {
            localStorage.removeItem('webmc_token');
            localStorage.removeItem('webmc_user');
            window.location.href = '/index.html';
        }
    };
    
    const handleFormSubmit = async (e) => {
        e.preventDefault();
        const form = e.target;
        
        try {
            if (form.id === 'create-quiz-form') {
                const title = form.elements['quiz-title'].value;
                const description = form.elements['quiz-description'].value;
                await fetchApi('/api/quizzes', { method: 'POST', body: JSON.stringify({ title, description }) });
                form.reset();
            } else if (form.id === 'add-question-form') {
                const text = form.elements.text.value;
                const options = Array.from(form.elements.options).map(i => i.value);
                const correctAnswerIndex = form.elements.correctAnswerIndex.value;
                await fetchApi(`/api/quizzes/${currentQuizId}/questions`, { method: 'POST', body: JSON.stringify({ text, options, correctAnswerIndex }) });
                hide(addQuestionModal);
            } else if (form.id === 'edit-quiz-form') {
                const title = form.elements.title.value;
                const description = form.elements.description.value;
                await fetchApi(`/api/quizzes/${currentQuizId}`, { method: 'PUT', body: JSON.stringify({ title, description }) });
                hide(editQuizModal);
            } else if (form.id === 'edit-question-form') {
                 const text = form.elements.text.value;
                const options = Array.from(form.elements.options).map(i => i.value);
                const correctAnswerIndex = form.elements.correctAnswerIndex.value;
                await fetchApi(`/api/quizzes/${currentQuizId}/questions/${currentQuestionId}`, { method: 'PUT', body: JSON.stringify({ text, options, correctAnswerIndex }) });
                hide(editQuestionModal);
            }
            await loadInitialData();
        } catch (error) {
            showMessageModal(`Operation failed: ${error.message}`);
        }
    };
    
    const handleDeleteQuiz = async (quizId) => {
        try {
            await fetchApi(`/api/quizzes/${quizId}`, { method: 'DELETE' });
            await loadInitialData();
        } catch (error) {
            showMessageModal(`Failed to delete quiz: ${error.message}`);
        }
    };

    const handleDeleteQuestion = async (quizId, questionId) => {
        try {
            await fetchApi(`/api/quizzes/${quizId}/questions/${questionId}`, { method: 'DELETE' });
            await loadInitialData();
        } catch (error) {
            showMessageModal(`Failed to delete question: ${error.message}`);
        }
    };

    // --- INITIALIZATION ---
    const loadInitialData = async () => {
        showLoader();
        try {
            const user = getUser();
            const allQuizzes = await fetchApi('/api/quizzes');
            quizzes = allQuizzes.filter(quiz => quiz.author === user.username);
            renderQuizzes();
        } catch (error) {
            showMessageModal(`Could not load dashboard: ${error.message}`);
        } finally {
            hideLoader();
        }
    };

    document.addEventListener('click', handlePageClick);

    // Attach other specific listeners
    modalOkButton.addEventListener('click', () => hide(customModal));
    modalCancelButton.addEventListener('click', () => hide(customModal));
    createQuizForm.addEventListener('submit', handleFormSubmit);
    addQuestionForm.addEventListener('submit', handleFormSubmit);
    editQuizForm.addEventListener('submit', handleFormSubmit);
    editQuestionForm.addEventListener('submit', handleFormSubmit);
    
    // First Load
    checkAuth();
    loadInitialData();
});

