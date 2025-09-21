document.addEventListener('DOMContentLoaded', () => {
    let quizzes = [];
    let currentQuizId = null;
    let currentQuestionId = null;

    const usernameSpan = document.getElementById('username');
    const quizzesContainer = document.getElementById('quizzes-container');
    const createQuizForm = document.getElementById('create-quiz-form');
    const addQuestionModal = document.getElementById('add-question-modal');
    const editQuizModal = document.getElementById('edit-quiz-modal');
    const editQuestionModal = document.getElementById('edit-question-modal');
    const addQuestionForm = document.getElementById('add-question-form');
    const editQuizForm = document.getElementById('edit-quiz-form');
    const editQuestionForm = document.getElementById('edit-question-form');
    const loader = document.getElementById('loader');
    const mainContent = document.getElementById('main-content');
    const customModal = document.getElementById('custom-modal');
    const modalMessage = document.getElementById('modal-message');
    const modalOkButton = document.getElementById('modal-ok-button');
    const modalConfirmButton = document.getElementById('modal-confirm-button');
    const modalCancelButton = document.getElementById('modal-cancel-button');

    const show = el => { if(el) el.classList.remove('hidden'); };
    const hide = el => { if(el) el.classList.add('hidden'); };
    const showLoader = () => { hide(mainContent); show(loader); };
    const hideLoader = () => { show(mainContent); hide(loader); };
    const getAuthToken = () => localStorage.getItem('webmc_token');
    const getUser = () => JSON.parse(localStorage.getItem('webmc_user'));

    const escapeHTML = (str) => {
        if (typeof str !== 'string') return '';
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

    const checkAuth = () => {
        const user = getUser();
        const token = getAuthToken();
        if (!token || !user || user.role !== 'teacher') {
            window.location.href = '/index.html';
            return;
        }
        usernameSpan.textContent = user.username;
    };

    const fetchApi = async (url, options = {}) => {
        const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getAuthToken()}`, ...options.headers };
        const response = await fetch(url, { ...options, headers });
        const data = await response.json();
        if (!response.ok) { throw new Error(data.message || `HTTP error! status: ${response.status}`); }
        return data;
    };

    const renderQuizzes = () => {
        quizzesContainer.innerHTML = '';
        if (quizzes.length === 0) {
            quizzesContainer.innerHTML = `<div class="text-center text-gray-500 py-8 col-span-full bg-white rounded-lg shadow-md"><p>No quizzes created yet.</p></div>`;
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
                    <div class="mt-4 grid grid-cols-2 gap-2">
                        <button data-action="toggle-details" data-quiz-id="${quiz._id}" class="col-span-2 w-full text-sm font-semibold bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300">View Details</button>
                        <button data-action="add-question" data-quiz-id="${quiz._id}" class="text-sm font-semibold bg-indigo-100 text-indigo-700 py-2 px-4 rounded-md hover:bg-indigo-200">Add Question</button>
                        <button data-action="edit-quiz" data-quiz-id="${quiz._id}" class="text-sm font-semibold bg-yellow-100 text-yellow-800 py-2 px-4 rounded-md hover:bg-yellow-200">Edit Details</button>
                        <button data-action="delete-quiz" data-quiz-id="${quiz._id}" class="col-span-2 w-full text-sm font-semibold bg-red-100 text-red-800 py-2 px-4 rounded-md hover:bg-red-200">Delete Quiz</button>
                    </div>
                </div>
                <details id="details-${quiz._id}" class="bg-gray-50"><summary class="hidden"></summary><div class="border-t border-gray-200"><div class="border-b border-gray-200"><nav class="-mb-px flex space-x-6 px-6"><button data-action="show-tab" data-tab="questions" data-quiz-id="${quiz._id}" class="tab-button active shrink-0 border-b-2 border-transparent px-1 py-4 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700">Questions</button><button data-action="show-tab" data-tab="results" data-quiz-id="${quiz._id}" class="tab-button shrink-0 border-b-2 border-transparent px-1 py-4 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700">Student Results</button></nav></div><div class="p-6"><div id="questions-panel-${quiz._id}" class="tab-panel"></div><div id="results-panel-${quiz._id}" class="tab-panel hidden"></div></div></div></details>
            `;
            quizzesContainer.appendChild(quizCard);
        });
    };

    const renderQuestionsForQuiz = (quizId) => {
        const quiz = quizzes.find(q => q._id === quizId);
        const container = document.getElementById(`questions-panel-${quizId}`);
        if (!quiz || !container) return;
        container.innerHTML = '';
        if (quiz.questions.length === 0) { container.innerHTML = `<p class="text-sm text-gray-500">No questions added yet.</p>`; return; }
        quiz.questions.forEach((q, index) => {
            const questionEl = document.createElement('div');
            questionEl.className = 'p-3 border-b border-gray-100 last:border-b-0 flex justify-between items-center';
            questionEl.innerHTML = `<div class="flex-1 mr-4"><p class="font-semibold">${index + 1}. ${escapeHTML(q.text)}</p><ul class="list-disc list-inside text-sm text-gray-600 mt-1">${q.options.map((opt, i) => `<li class="${i === q.correctAnswerIndex ? 'font-bold text-green-600' : ''}">${escapeHTML(opt)}</li>`).join('')}</ul></div><div class="flex space-x-2 flex-shrink-0"><button data-action="edit-question" data-quiz-id="${quizId}" data-question-id="${q._id}" class="p-1 text-gray-500 hover:text-blue-600"><svg class="h-5 w-5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536l12.232-12.232z" /></svg></button><button data-action="delete-question" data-quiz-id="${quizId}" data-question-id="${q._id}" class="p-1 text-gray-500 hover:text-red-600"><svg class="h-5 w-5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button></div>`;
            container.appendChild(questionEl);
        });
    };

    const renderResultsForQuiz = async (quizId) => {
        const container = document.getElementById(`results-panel-${quizId}`);
        if (!container) return;
        container.innerHTML = `<p class="text-sm text-gray-500">Loading results...</p>`;
        try {
            const results = await fetchApi(`/api/quizzes/${quizId}/results`);
            if (results.length === 0) { container.innerHTML = `<p class="text-sm text-gray-500">No students have taken this quiz yet.</p>`; return; }
            let tableHtml = `<div class="overflow-x-auto"><table class="min-w-full divide-y divide-gray-200"><thead class="bg-gray-50"><tr><th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Student</th><th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Score</th><th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date & Time</th></tr></thead><tbody class="bg-white divide-y divide-gray-200">`;
            results.forEach(result => { tableHtml += `<tr><td class="px-4 py-2 text-sm text-gray-900">${escapeHTML(result.studentUsername)}</td><td class="px-4 py-2 text-sm text-gray-500">${result.score} / ${result.totalQuestions}</td><td class="px-4 py-2 text-sm text-gray-500">${new Date(result.submittedAt).toLocaleString()}</td></tr>`; });
            tableHtml += `</tbody></table></div>`;
            container.innerHTML = tableHtml;
        } catch (error) {
            container.innerHTML = `<p class="text-sm text-red-500">Could not load results.</p>`;
        }
    };

    const populateAddQuestionForm = () => { addQuestionForm.innerHTML = `<div><label class="block text-sm font-medium text-gray-700">Question Text</label><input type="text" name="text" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm"></div><div><label class="block text-sm font-medium text-gray-700">Options & Correct Answer</label>${[0,1,2,3].map(i=>`<div class="flex items-center space-x-2 mt-2"><input type="radio" name="correctAnswerIndex" value="${i}" required class="h-4 w-4 text-indigo-600"><input type="text" name="options" required class="block w-full rounded-md border-gray-300 shadow-sm sm:text-sm"></div>`).join('')}</div><div><label class="block text-sm font-medium text-gray-700">Explanation for Correct Answer</label><textarea name="feedback" rows="3" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm" placeholder="Explain why the answer is correct."></textarea></div><div class="pt-4 flex justify-end space-x-2"><button type="button" data-action="close-modal" class="px-4 py-2 bg-gray-200 rounded-md">Cancel</button><button type="submit" class="px-4 py-2 bg-indigo-600 text-white rounded-md">Add Question</button></div>`; };
    const populateEditQuizForm = (quiz) => { editQuizForm.innerHTML = `<div><label class="block text-sm font-medium text-gray-700">Quiz Title</label><input type="text" name="title" value="${escapeHTML(quiz.title)}" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm"></div><div><label class="block text-sm font-medium text-gray-700">Description</label><textarea name="description" rows="3" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm">${escapeHTML(quiz.description||'')}</textarea></div><div class="pt-4 flex justify-end space-x-2"><button type="button" data-action="close-modal" class="px-4 py-2 bg-gray-200 rounded-md">Cancel</button><button type="submit" class="px-4 py-2 bg-indigo-600 text-white rounded-md">Save Changes</button></div>`; };
    const populateEditQuestionForm = (question) => { editQuestionForm.innerHTML = `<div><label class="block text-sm font-medium text-gray-700">Question Text</label><input type="text" name="text" value="${escapeHTML(question.text)}" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm"></div><div><label class="block text-sm font-medium text-gray-700">Options & Correct Answer</label>${question.options.map((opt,i)=>`<div class="flex items-center space-x-2 mt-2"><input type="radio" name="correctAnswerIndex" value="${i}" ${i===question.correctAnswerIndex?'checked':''} required class="h-4 w-4 text-indigo-600"><input type="text" name="options" value="${escapeHTML(opt)}" required class="block w-full rounded-md border-gray-300 shadow-sm"></div>`).join('')}</div><div><label class="block text-sm font-medium text-gray-700">Explanation for Correct Answer</label><textarea name="feedback" rows="3" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm">${escapeHTML(question.feedback || '')}</textarea></div><div class="pt-4 flex justify-end space-x-2"><button type="button" data-action="close-modal" class="px-4 py-2 bg-gray-200 rounded-md">Cancel</button><button type="submit" class="px-4 py-2 bg-indigo-600 text-white rounded-md">Save Changes</button></div>`; };

    const handlePageClick = (e) => {
        const target = e.target.closest('button');
        if (!target) return;
        const action = target.dataset.action;
        const quizId = target.dataset.quizId;
        const questionId = target.dataset.questionId;
        switch (action) {
            case 'toggle-details':
                const detailsElement = document.getElementById(`details-${quizId}`);
                if (detailsElement) {
                    if (detailsElement.open) { detailsElement.open = false; target.textContent = 'View Details'; }
                    else {
                        const quizCard = target.closest('.bg-white.shadow-lg');
                        quizCard.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
                        quizCard.querySelector('.tab-button[data-tab="questions"]').classList.add('active');
                        quizCard.querySelectorAll('.tab-panel').forEach(panel => panel.classList.add('hidden'));
                        show(quizCard.querySelector(`#questions-panel-${quizId}`));
                        renderQuestionsForQuiz(quizId);
                        detailsElement.open = true;
                        target.textContent = 'Hide Details';
                    }
                }
                break;
            case 'show-tab':
                const tab = target.dataset.tab;
                const quizCard = target.closest('.bg-white.shadow-lg');
                quizCard.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
                target.classList.add('active');
                quizCard.querySelectorAll('.tab-panel').forEach(panel => panel.classList.add('hidden'));
                show(quizCard.querySelector(`#${tab}-panel-${quizId}`));
                if (tab === 'results') renderResultsForQuiz(quizId); else renderQuestionsForQuiz(quizId);
                break;
            case 'add-question': currentQuizId = quizId; populateAddQuestionForm(); show(addQuestionModal); break;
            case 'edit-quiz': currentQuizId = quizId; const qte = quizzes.find(q=>q._id===quizId); populateEditQuizForm(qte); show(editQuizModal); break;
            case 'delete-quiz': showConfirmModal('Delete this quiz?', ()=>handleDeleteQuiz(quizId)); break;
            case 'edit-question': currentQuizId = quizId; currentQuestionId = questionId; const qfe = quizzes.find(q=>q._id===quizId); const qtte = qfe.questions.find(q=>q._id===questionId); populateEditQuestionForm(qtte); show(editQuestionModal); break;
            case 'delete-question': showConfirmModal('Delete this question?', ()=>handleDeleteQuestion(quizId,questionId)); break;
            case 'close-modal': hide(addQuestionModal); hide(editQuizModal); hide(editQuestionModal); break;
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
            } else if (form.id === 'add-question-form' || form.id === 'edit-question-form') {
                const text = form.elements.text.value;
                const options = Array.from(form.elements.options).map(i => i.value);
                const correctAnswerIndex = form.elements.correctAnswerIndex.value;
                const feedback = form.elements.feedback.value;
                const body = { text, options, correctAnswerIndex, feedback };

                if (form.id === 'add-question-form') {
                    await fetchApi(`/api/quizzes/${currentQuizId}/questions`, { method: 'POST', body: JSON.stringify(body) });
                    hide(addQuestionModal);
                } else {
                    await fetchApi(`/api/quizzes/${currentQuizId}/questions/${currentQuestionId}`, { method: 'PUT', body: JSON.stringify(body) });
                    hide(editQuestionModal);
                }
            } else if (form.id === 'edit-quiz-form') {
                const title = form.elements.title.value;
                const description = form.elements.description.value;
                await fetchApi(`/api/quizzes/${currentQuizId}`, { method: 'PUT', body: JSON.stringify({ title, description }) });
                hide(editQuizModal);
            }
            await loadInitialData();
        } catch (error) {
            showMessageModal(`Operation failed: ${error.message}`);
        }
    };
    
    const handleDeleteQuiz = async (quizId) => {
        try { await fetchApi(`/api/quizzes/${quizId}`, { method: 'DELETE' }); await loadInitialData(); }
        catch (error) { showMessageModal(`Failed to delete quiz: ${error.message}`); }
    };
    const handleDeleteQuestion = async (quizId, questionId) => {
        try { await fetchApi(`/api/quizzes/${quizId}/questions/${questionId}`, { method: 'DELETE' }); await loadInitialData(); }
        catch (error) { showMessageModal(`Failed to delete question: ${error.message}`); }
    };

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

    document.body.addEventListener('click', handlePageClick);
    document.getElementById('logout-btn').addEventListener('click', () => { localStorage.clear(); window.location.href = '/index.html'; });
    modalOkButton.addEventListener('click', () => hide(customModal));
    modalCancelButton.addEventListener('click', () => hide(customModal));
    createQuizForm.addEventListener('submit', handleFormSubmit);
    addQuestionForm.addEventListener('submit', handleFormSubmit);
    editQuizForm.addEventListener('submit', handleFormSubmit);
    editQuestionForm.addEventListener('submit', handleFormSubmit);
    
    checkAuth();
    loadInitialData();
});