// Enhanced Dashboard with integrated debt tracking
let state = {};

document.addEventListener('DOMContentLoaded', () => {
    initializeDashboard();
    
    // Auto-refresh dashboard every 30 seconds if user is active
    setInterval(() => {
        if (document.visibilityState === 'visible') {
            state = getAppState();
            updateDashboard();
        }
    }, 30000);
});

function initializeDashboard() {
    state = getAppState();
    updateDate();
    updateDashboard();
}

function updateDate() {
    const dateElement = document.getElementById('currentDate');
    if (dateElement) {
        dateElement.textContent = formatDate(new Date());
    }
}

function updateDashboard() {
    updateDebtDisplay();
    updateCompliance();
    updateStats();
    checkConservativeMode();
    checkFatigueFlag();
}

function updateDebtDisplay() {
    // Ensure debts are initialized
    if (!state.debts) {
        state.debts = { eye: 0, hydration: 0, mobility: 0, posture: 0 };
    }
    
    // Update individual debts [file:1]
    document.getElementById('eyeDebt').textContent = state.debts.eye || 0;
    document.getElementById('hydrationDebt').textContent = state.debts.hydration || 0;
    document.getElementById('mobilityDebt').textContent = state.debts.mobility || 0;
    document.getElementById('postureDebt').textContent = state.debts.posture || 0;
    
    const totalDebt = getTotalDebt(state.debts);
    document.getElementById('totalDebt').textContent = totalDebt;
    
    // Update progress bar
    const maxDebt = 10;
    const percentage = Math.min((totalDebt / maxDebt) * 100, 100);
    const progressFill = document.getElementById('debtProgressFill');
    if (progressFill) {
        progressFill.style.width = `${percentage}%`;
        
        // Change color based on debt level [file:1]
        if (totalDebt >= 5) {
            progressFill.style.background = 'linear-gradient(90deg, #F44336 0%, #E91E63 100%)';
        } else if (totalDebt >= 3) {
            progressFill.style.background = 'linear-gradient(90deg, #FF9800 0%, #FF5722 100%)';
        } else {
            progressFill.style.background = 'linear-gradient(90deg, #4CAF50 0%, #8BC34A 100%)';
        }
    }
    
    // Update badge [file:1]
    const badge = document.getElementById('debtBadge');
    if (badge) {
        if (totalDebt >= 5) {
            badge.textContent = 'High Risk';
            badge.style.background = 'var(--danger)';
        } else if (totalDebt >= 3) {
            badge.textContent = 'Moderate';
            badge.style.background = 'var(--warning)';
        } else {
            badge.textContent = 'Low Risk';
            badge.style.background = 'var(--success)';
        }
    }
}

function updateCompliance() {
    // Ensure stats are initialized
    if (!state.stats) {
        state.stats = {
            blocksCompleted: 0,
            protocolsCompleted: 0,
            protocolsSkipped: 0,
            breaksTaken: 0,
            totalFocusTime: 0,
            debtsCreated: 0,
            debtsCleared: 0,
            fatigueFlags: 0
        };
    }
    
    const totalProtocols = state.stats.protocolsCompleted + state.stats.protocolsSkipped;
    const compliance = totalProtocols > 0 ? 
        Math.round((state.stats.protocolsCompleted / totalProtocols) * 100) : 100;
    
    document.getElementById('complianceText').textContent = `${compliance}%`;
    document.getElementById('protocolsCompleted').textContent = state.stats.protocolsCompleted;
    document.getElementById('protocolsSkipped').textContent = state.stats.protocolsSkipped;
    
    // Update circle [file:1]
    const circle = document.getElementById('complianceCircle');
    if (circle) {
        const radius = 85;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (compliance / 100) * circumference;
        circle.style.strokeDasharray = circumference;
        circle.style.strokeDashoffset = offset;
        
        // Change color based on compliance
        if (compliance >= 90) {
            circle.style.stroke = 'var(--success)';
        } else if (compliance >= 70) {
            circle.style.stroke = 'var(--primary)';
        } else if (compliance >= 50) {
            circle.style.stroke = 'var(--warning)';
        } else {
            circle.style.stroke = 'var(--danger)';
        }
    }
}

function updateStats() {
    document.getElementById('focusTime').textContent = formatTime(state.stats.totalFocusTime || 0);
    document.getElementById('blocksCompleted').textContent = state.stats.blocksCompleted || 0;
    document.getElementById('breaksTaken').textContent = state.stats.breaksTaken || 0;
}

function checkConservativeMode() {
    const totalDebt = getTotalDebt(state.debts);
    const alert = document.getElementById('conservativeAlert');
    const message = document.getElementById('conservativeMessage');
    
    if (!alert || !message) return;
    
    // Conservative mode rules [file:1]
    if (totalDebt >= 5) {
        alert.style.display = 'block';
        message.innerHTML = `
            <strong>Critical Debt Level (${totalDebt})</strong><br>
            Only 25-minute blocks are available. Take breaks to clear at least 2 debts before longer sessions.
        `;
    } else if (totalDebt >= 3) {
        alert.style.display = 'block';
        message.innerHTML = `
            <strong>Elevated Debt Level (${totalDebt})</strong><br>
            Consider taking a break or scheduling shorter work blocks to prevent fatigue.
        `;
    } else {
        alert.style.display = 'none';
    }
}

function checkFatigueFlag() {
    const totalDebt = getTotalDebt(state.debts);
    const fatigueFlag = document.getElementById('fatigueFlag');
    
    if (!fatigueFlag) return;
    
    // Show fatigue flag when debt >= 5 [file:1]
    if (totalDebt >= 5) {
        fatigueFlag.style.display = 'block';
    } else {
        fatigueFlag.style.display = 'none';
    }
}
