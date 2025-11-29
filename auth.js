// Authentication Logic
document.addEventListener('DOMContentLoaded', () => {
    // Check if already logged in
    if (isAuthenticated()) {
        window.location.href = 'dashboard.html';
        return;
    }

    setupLoginHandlers();
});

function setupLoginHandlers() {
    const loginForm = document.getElementById('loginForm');
    const demoBtn = document.getElementById('demoBtn');

    loginForm.addEventListener('submit', handleLogin);
    demoBtn.addEventListener('click', handleDemoLogin);
}

function handleLogin(e) {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('rememberMe').checked;

    // Basic validation
    if (!username || !password) {
        showToast('Please enter both username and password', 'error');
        return;
    }

    // Simple authentication (in production, this would be a backend call)
    if (password.length >= 4) {
        // Create user session
        const user = {
            username: username,
            loginTime: new Date().toISOString(),
            rememberMe: rememberMe
        };

        localStorage.setItem('currentUser', JSON.stringify(user));
        localStorage.setItem('isAuthenticated', 'true');

        showToast('Login successful! Redirecting...', 'success');
        
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1000);
    } else {
        showToast('Password must be at least 4 characters', 'error');
    }
}

function handleDemoLogin() {
    const demoUser = {
        username: 'Demo User',
        loginTime: new Date().toISOString(),
        rememberMe: false,
        isDemo: true
    };

    localStorage.setItem('currentUser', JSON.stringify(demoUser));
    localStorage.setItem('isAuthenticated', 'true');

    // Create some demo data
    createDemoData();

    showToast('Demo session started! Redirecting...', 'success');
    
    setTimeout(() => {
        window.location.href = 'dashboard.html';
    }, 1000);
}

function createDemoData() {
    const demoState = {
        debts: {
            eye: 2,
            hydration: 1,
            mobility: 0,
            posture: 1
        },
        blocks: [
            {
                id: Date.now() - 1000,
                duration: 50,
                category: 'Study',
                notes: 'Mathematics assignment',
                protocols: [
                    { name: 'Eye rest (20 seconds)', category: 'eye', duration: 20 },
                    { name: 'Stand & stretch (1 minute)', category: 'mobility', duration: 60 },
                    { name: 'Hydration (150ml)', category: 'hydration', duration: 30 },
                    { name: 'Posture check', category: 'posture', duration: 10 }
                ],
                completed: true,
                createdAt: new Date().toISOString()
            }
        ],
        breaks: [
            {
                id: Date.now() - 500,
                type: 'screen-free',
                duration: 5,
                activities: { hydration: true, mobility: false, posture: false },
                timestamp: new Date().toISOString()
            }
        ],
        stats: {
            blocksCompleted: 1,
            protocolsCompleted: 2,
            protocolsSkipped: 2,
            breaksTaken: 1,
            totalFocusTime: 50,
            debtsCreated: 4,
            debtsCleared: 3,
            fatigueFlags: 0
        }
    };

    localStorage.setItem('focusWellnessState', JSON.stringify(demoState));
}

function isAuthenticated() {
    return localStorage.getItem('isAuthenticated') === 'true';
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}
