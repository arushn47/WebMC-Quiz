document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const loginTab = document.getElementById('login-tab');
    const registerTab = document.getElementById('register-tab');
    const errorMessage = document.getElementById('error-message');

    loginTab.addEventListener('click', () => {
        loginTab.classList.add('text-indigo-600', 'border-indigo-600');
        loginTab.classList.remove('text-gray-500', 'hover:text-gray-700');
        registerTab.classList.add('text-gray-500', 'hover:text-gray-700');
        registerTab.classList.remove('text-indigo-600', 'border-indigo-600');

        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        errorMessage.textContent = '';
    });

    registerTab.addEventListener('click', () => {
        registerTab.classList.add('text-indigo-600', 'border-indigo-600');
        registerTab.classList.remove('text-gray-500', 'hover:text-gray-700');
        loginTab.classList.add('text-gray-500', 'hover:text-gray-700');
        loginTab.classList.remove('text-indigo-600', 'border-indigo-600');

        registerForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
        errorMessage.textContent = '';
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        // Reset error message on new submission
        errorMessage.textContent = '';
        errorMessage.classList.remove('text-red-600', 'text-green-600');

        const username = e.target.elements['login-username'].value;
        const password = e.target.elements['login-password'].value;
        
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (!response.ok) {
                // Use the message from the server's JSON response
                throw new Error(data.message || 'Login failed due to a server error.');
            }

            // Explicitly check for token and user object before proceeding
            if (!data.token || !data.user || !data.user.role) {
                throw new Error('Invalid response from server. Missing auth data.');
            }

            localStorage.setItem('webmc_token', data.token);
            localStorage.setItem('webmc_user', JSON.stringify(data.user));

            // Redirect based on the role
            if (data.user.role === 'teacher') {
                window.location.href = '/teacher.html';
            } else {
                window.location.href = '/student.html';
            }
        } catch (error) {
            errorMessage.textContent = error.message;
            errorMessage.classList.add('text-red-600');
        }
    });

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        // Reset error message
        errorMessage.textContent = '';
        errorMessage.classList.remove('text-red-600', 'text-green-600');

        const username = e.target.elements['register-username'].value;
        const password = e.target.elements['register-password'].value;
        const role = e.target.elements['role'].value;

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, role })
            });
            
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Registration failed');
            }

            // Switch to login tab after successful registration
            loginTab.click();
            document.getElementById('login-username').value = username;
            errorMessage.textContent = 'Registration successful! Please sign in.';
            errorMessage.classList.add('text-green-600');


        } catch (error) {
            errorMessage.textContent = error.message;
            errorMessage.classList.add('text-red-600');
        }
    });
});

