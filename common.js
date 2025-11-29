// Common functionality across all pages
const APP_STATE_KEY = 'focusWellnessState';

// Protocol templates based on block duration [file:1]
const protocolTemplates = {
    25: [
        { name: 'Eye rest (10 seconds)', category: 'eye', duration: 10 },
        { name: 'Hydration (100ml)', category: 'hydration', duration: 30 }
    ],
    50: [
        { name: 'Eye rest (20 seconds)', category: 'eye', duration: 20 },
        { name: 'Stand & stretch (1 minute)', category: 'mobility', duration: 60 },
        { name: 'Hydration (150ml)', category: 'hydration', duration: 30 },
        { name: 'Posture check', category: 'posture', duration: 10 }
    ],
    90: [
        { name: 'Eye rest (30 seconds)', category: 'eye', duration: 30 },
        { name: 'Stand & stretch (2 minutes)', category: 'mobility', duration: 120 },
        { name: 'Hydration (200ml)', category: 'hydration', duration: 30 },
        { name: 'Posture check & correction', category: 'posture', duration: 20 },
        { name: 'Short walk (2 minutes)', category: 'mobility', duration: 120 }
    ]
};

// Initialize common elements on page load
document.addEventListener('DOMContentLoaded', () => {
    checkAuthentication();
    initializeUserDisplay();
    setupLogoutHandler();
});

// Check if user is authenticated
function checkAuthentication() {
    if (!isAuthenticated() && !window.location.pathname.includes('index.html')) {
        window.location.href = 'index.html';
    }
}

function isAuthenticated() {
    return localStorage.getItem('isAuthenticated') === 'true';
}

// Initialize user display
function initializeUserDisplay() {
    const userName = document.getElementById('userName');
    if (userName) {
        const user = getCurrentUser();
        userName.textContent = user ? user.username : 'User';
    }
}

// Get current user
function getCurrentUser() {
    const userStr = localStorage.getItem('currentUser');
    return userStr ? JSON.parse(userStr) : null;
}

// Setup logout handler
function setupLogoutHandler() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
}

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('currentUser');
        showToast('Logged out successfully', 'success');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    }
}

// Get application state
function getAppState() {
    const stateStr = localStorage.getItem(APP_STATE_KEY);
    if (stateStr) {
        return JSON.parse(stateStr);
    }
    
    // Return default state
    return {
        debts: {
            eye: 0,
            hydration: 0,
            mobility: 0,
            posture: 0
        },
        blocks: [],
        breaks: [],
        activeBlock: null,
        stats: {
            blocksCompleted: 0,
            protocolsCompleted: 0,
            protocolsSkipped: 0,
            breaksTaken: 0,
            totalFocusTime: 0,
            debtsCreated: 0,
            debtsCleared: 0,
            fatigueFlags: 0
        }
    };
}

// Save application state
function saveAppState(state) {
    localStorage.setItem(APP_STATE_KEY, JSON.stringify(state));
}

// Get total debt [file:1]
function getTotalDebt(debts) {
    if (!debts) return 0;
    // Include time debt in total calculation
    return (debts.eye || 0) + (debts.hydration || 0) + (debts.mobility || 0) + (debts.posture || 0) + (debts.timeDebt || 0);
}

// Check if date is today
function isToday(date) {
    const today = new Date();
    const checkDate = new Date(date);
    return checkDate.getDate() === today.getDate() &&
           checkDate.getMonth() === today.getMonth() &&
           checkDate.getFullYear() === today.getFullYear();
}

// Format date
function formatDate(date) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(date).toLocaleDateString('en-US', options);
}

// Format time
function formatTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
}

// Get protocols for duration [file:1]
function getProtocolsForDuration(duration) {
    if (duration <= 25) return [...protocolTemplates[25]];
    if (duration <= 50) return [...protocolTemplates[50]];
    return [...protocolTemplates[90]];
}

// Show toast notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (toast) {
        toast.textContent = message;
        toast.className = `toast ${type} show`;
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

// Format minutes to MM:SS
function formatTimer(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
