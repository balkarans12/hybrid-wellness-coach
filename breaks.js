// Optimized Break Logger with 60-minute minimum
let state = {};
let selectedBreakDuration = null;

// Optimized Debt Clearance Formulas
const CLEARANCE_RULES = {
    screenFree: {
        eye: {
            rate: 60, // 1 debt per 60 minutes
            formula: (minutes) => Math.floor(minutes / 60)
        }
    },
    onScreen: {
        eye: {
            rate: 120, // 1 debt per 120 minutes (reduced effectiveness)
            formula: (minutes) => Math.floor(minutes / 120)
        }
    },
    activities: {
        hydration: {
            rate: 1, // 1 debt per action (instant)
            formula: () => 1
        },
        mobility: {
            rate: 20, // 1 debt per 20 minutes
            formula: (minutes) => Math.floor(minutes / 20)
        },
        posture: {
            rate: 1, // 1 debt per action (instant)
            formula: () => 1
        }
    }
};

const MIN_BREAK_DURATION = 60;

document.addEventListener('DOMContentLoaded', () => {
    initializeBreaks();
});

function initializeBreaks() {
    state = getAppState();
    setupEventHandlers();
    displayCurrentDebt();
    renderBreakHistory();
    updateBreakCount();
    updateClearancePreview();
}

function setupEventHandlers() {
    // Duration chip buttons
    document.querySelectorAll('.duration-chip').forEach(btn => {
        btn.addEventListener('click', () => selectDuration(btn));
    });
    
    // Log break button
    const logBreakBtn = document.getElementById('logBreakBtn');
    if (logBreakBtn) {
        logBreakBtn.addEventListener('click', logBreak);
    }
    
    // Update clearance preview on changes
    document.querySelectorAll('input[name="breakType"]').forEach(radio => {
        radio.addEventListener('change', updateClearancePreview);
    });
    
    const customDuration = document.getElementById('customBreakDuration');
    if (customDuration) {
        customDuration.addEventListener('input', updateClearancePreview);
    }
    
    document.getElementById('hydrationCheck').addEventListener('change', updateClearancePreview);
    document.getElementById('mobilityCheck').addEventListener('change', updateClearancePreview);
    document.getElementById('postureCheck').addEventListener('change', updateClearancePreview);
}

function displayCurrentDebt() {
    // Ensure debts object exists
    if (!state.debts) {
        state.debts = { eye: 0, hydration: 0, mobility: 0, posture: 0 };
    }
    
    // Display current debt levels
    document.getElementById('currentEyeDebt').textContent = state.debts.eye || 0;
    document.getElementById('currentHydrationDebt').textContent = state.debts.hydration || 0;
    document.getElementById('currentMobilityDebt').textContent = state.debts.mobility || 0;
    document.getElementById('currentPostureDebt').textContent = state.debts.posture || 0;
    
    const totalDebt = getTotalDebt(state.debts);
    document.getElementById('totalDebtIndicator').textContent = `${totalDebt} Total`;
}

function selectDuration(btn) {
    document.querySelectorAll('.duration-chip').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedBreakDuration = parseInt(btn.dataset.duration);
    document.getElementById('customBreakDuration').value = '';
    updateClearancePreview();
}

function calculateDebtClearance(duration, breakType, activities) {
    const clearance = {
        eye: 0,
        hydration: 0,
        mobility: 0,
        posture: 0,
        total: 0
    };
    
    // Eye debt clearance based on break type
    if (breakType === 'screen-free') {
        const eyeClear = Math.min(
            CLEARANCE_RULES.screenFree.eye.formula(duration),
            state.debts.eye || 0
        );
        clearance.eye = eyeClear;
    } else if (breakType === 'on-screen') {
        const eyeClear = Math.min(
            CLEARANCE_RULES.onScreen.eye.formula(duration),
            state.debts.eye || 0
        );
        clearance.eye = eyeClear;
    }
    
    // Activity-based clearance
    if (activities.hydration) {
        clearance.hydration = Math.min(
            CLEARANCE_RULES.activities.hydration.formula(),
            state.debts.hydration || 0
        );
    }
    
    if (activities.mobility) {
        clearance.mobility = Math.min(
            CLEARANCE_RULES.activities.mobility.formula(duration),
            state.debts.mobility || 0
        );
    }
    
    if (activities.posture) {
        clearance.posture = Math.min(
            CLEARANCE_RULES.activities.posture.formula(),
            state.debts.posture || 0
        );
    }
    
    clearance.total = clearance.eye + clearance.hydration + clearance.mobility + clearance.posture;
    
    return clearance;
}

function updateClearancePreview() {
    let duration = selectedBreakDuration;
    
    const customValue = document.getElementById('customBreakDuration').value;
    if (customValue) {
        duration = parseInt(customValue);
        document.querySelectorAll('.duration-chip').forEach(b => b.classList.remove('selected'));
        selectedBreakDuration = null;
    }
    
    if (!duration || duration < MIN_BREAK_DURATION) {
        document.getElementById('clearanceItems').innerHTML = `
            <div style="padding: 20px; text-align: center;">
                <p class="empty-text" style="margin-bottom: 12px;">Minimum ${MIN_BREAK_DURATION} minutes required</p>
                <div style="background: rgba(255, 152, 0, 0.1); padding: 12px; border-radius: var(--radius-sm); border: 2px dashed var(--warning);">
                    <p style="font-size: 0.875rem; color: var(--text-secondary); margin: 0;">
                        💡 Quality breaks require sustained time away from work
                    </p>
                </div>
            </div>
        `;
        return;
    }
    
    const breakType = document.querySelector('input[name="breakType"]:checked').value;
    const activities = {
        hydration: document.getElementById('hydrationCheck').checked,
        mobility: document.getElementById('mobilityCheck').checked,
        posture: document.getElementById('postureCheck').checked
    };
    
    const clearance = calculateDebtClearance(duration, breakType, activities);
    
    if (clearance.total === 0) {
        document.getElementById('clearanceItems').innerHTML = `
            <div style="padding: 20px; text-align: center;">
                <p class="empty-text" style="margin-bottom: 12px;">No debt will be cleared</p>
                <div style="background: rgba(255, 152, 0, 0.1); padding: 12px; border-radius: var(--radius-sm); border: 2px dashed var(--warning);">
                    <p style="font-size: 0.875rem; color: var(--text-secondary); margin: 0;">
                        ${breakType === 'screen-free' 
                            ? `💡 Screen-free breaks clear 1 eye debt per ${CLEARANCE_RULES.screenFree.eye.rate} minutes`
                            : `💡 On-screen breaks clear 1 eye debt per ${CLEARANCE_RULES.onScreen.eye.rate} minutes`
                        }
                    </p>
                </div>
            </div>
        `;
        return;
    }
    
    // Build clearance details
    const clearanceItems = [];
    
    if (clearance.eye > 0) {
        const rate = breakType === 'screen-free' 
            ? CLEARANCE_RULES.screenFree.eye.rate 
            : CLEARANCE_RULES.onScreen.eye.rate;
        clearanceItems.push({
            icon: '👁️',
            name: 'Eye',
            amount: clearance.eye,
            detail: `${duration} min ÷ ${rate} = ${clearance.eye} debt${clearance.eye > 1 ? 's' : ''}`
        });
    }
    
    if (clearance.hydration > 0) {
        clearanceItems.push({
            icon: '💧',
            name: 'Hydration',
            amount: clearance.hydration,
            detail: 'Instant clearance per action'
        });
    }
    
    if (clearance.mobility > 0) {
        clearanceItems.push({
            icon: '🏃',
            name: 'Mobility',
            amount: clearance.mobility,
            detail: `${duration} min ÷ ${CLEARANCE_RULES.activities.mobility.rate} = ${clearance.mobility} debt${clearance.mobility > 1 ? 's' : ''}`
        });
    }
    
    if (clearance.posture > 0) {
        clearanceItems.push({
            icon: '🪑',
            name: 'Posture',
            amount: clearance.posture,
            detail: 'Instant clearance per action'
        });
    }
    
    const totalDebtNow = getTotalDebt(state.debts);
    const totalDebtAfter = Math.max(0, totalDebtNow - clearance.total);
    
    const html = `
        <div style="background: linear-gradient(135deg, rgba(76, 175, 80, 0.15) 0%, rgba(139, 195, 74, 0.15) 100%); padding: 20px; border-radius: var(--radius-md); border: 3px solid var(--success); margin-bottom: 16px;">
            <div style="text-align: center; margin-bottom: 12px;">
                <div style="font-size: 2.5rem; font-weight: 700; color: var(--success); line-height: 1;">
                    -${clearance.total}
                </div>
                <div style="color: var(--text-secondary); font-size: 0.875rem; margin-top: 4px;">
                    Total Debt${clearance.total > 1 ? 's' : ''} Will Be Cleared
                </div>
            </div>
            <div style="background: white; padding: 12px; border-radius: var(--radius-sm); text-align: center;">
                <div style="font-size: 0.813rem; color: var(--text-light); margin-bottom: 4px;">New Debt Balance</div>
                <div style="font-size: 1.25rem; font-weight: 700; color: var(--primary);">
                    ${totalDebtNow} → ${totalDebtAfter}
                </div>
            </div>
        </div>
        
        <div style="display: flex; flex-direction: column; gap: 10px;">
            ${clearanceItems.map(item => `
                <div style="background: white; padding: 14px; border-radius: var(--radius-sm); border-left: 4px solid var(--success); display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 1.5rem;">${item.icon}</span>
                        <div>
                            <div style="font-weight: 600; color: var(--text); font-size: 0.95rem;">${item.name}</div>
                            <div style="font-size: 0.813rem; color: var(--text-light);">${item.detail}</div>
                        </div>
                    </div>
                    <div style="font-size: 1.5rem; font-weight: 700; color: var(--success);">-${item.amount}</div>
                </div>
            `).join('')}
        </div>
    `;
    
    document.getElementById('clearanceItems').innerHTML = html;
}

function logBreak() {
    let duration = selectedBreakDuration;
    
    const customValue = document.getElementById('customBreakDuration').value;
    if (customValue) {
        duration = parseInt(customValue);
    }
    
    if (!duration || duration < MIN_BREAK_DURATION) {
        showToast(`Minimum break duration is ${MIN_BREAK_DURATION} minutes`, 'error');
        return;
    }
    
    const breakType = document.querySelector('input[name="breakType"]:checked').value;
    const activities = {
        hydration: document.getElementById('hydrationCheck').checked,
        mobility: document.getElementById('mobilityCheck').checked,
        posture: document.getElementById('postureCheck').checked
    };
    
    // Calculate clearance using optimized formula
    const clearance = calculateDebtClearance(duration, breakType, activities);
    
    // Apply debt clearance
    state.debts.eye = Math.max(0, (state.debts.eye || 0) - clearance.eye);
    state.debts.hydration = Math.max(0, (state.debts.hydration || 0) - clearance.hydration);
    state.debts.mobility = Math.max(0, (state.debts.mobility || 0) - clearance.mobility);
    state.debts.posture = Math.max(0, (state.debts.posture || 0) - clearance.posture);
    
    state.stats.debtsCleared += clearance.total;
    
    // Create break log
    const breakLog = {
        id: Date.now(),
        type: breakType,
        duration,
        activities,
        clearance,
        timestamp: new Date().toISOString()
    };
    
    state.breaks.push(breakLog);
    state.stats.breaksTaken++;
    
    saveAppState(state);
    resetForm();
    displayCurrentDebt();
    renderBreakHistory();
    updateBreakCount();
    updateClearancePreview();
    
    const message = clearance.total > 0 
        ? `Break logged! Cleared ${clearance.total} debt(s) 🎉`
        : 'Break logged successfully!';
    showToast(message, clearance.total > 0 ? 'success' : 'info');
}

function resetForm() {
    document.getElementById('customBreakDuration').value = '';
    document.getElementById('hydrationCheck').checked = false;
    document.getElementById('mobilityCheck').checked = false;
    document.getElementById('postureCheck').checked = false;
    document.querySelectorAll('.duration-chip').forEach(b => b.classList.remove('selected'));
    selectedBreakDuration = null;
}

function renderBreakHistory() {
    const historyList = document.getElementById('breakHistoryList');
    const todayBreaks = state.breaks.filter(b => isToday(new Date(b.timestamp)));
    
    if (todayBreaks.length === 0) {
        historyList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">☕</div>
                <p>No breaks logged today</p>
            </div>
        `;
        return;
    }
    
    historyList.innerHTML = todayBreaks.reverse().map(breakLog => {
        const time = new Date(breakLog.timestamp).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        const typeIcon = breakLog.type === 'screen-free' ? '🌿' : '💻';
        const typeLabel = breakLog.type === 'screen-free' ? 'Screen-Free' : 'On-Screen';
        
        const activities = [];
        if (breakLog.activities?.hydration) activities.push('💧');
        if (breakLog.activities?.mobility) activities.push('🏃');
        if (breakLog.activities?.posture) activities.push('🪑');
        
        const clearance = breakLog.clearance || { total: 0 };
        const clearanceDetails = [];
        if (clearance.eye > 0) clearanceDetails.push(`👁️${clearance.eye}`);
        if (clearance.hydration > 0) clearanceDetails.push(`💧${clearance.hydration}`);
        if (clearance.mobility > 0) clearanceDetails.push(`🏃${clearance.mobility}`);
        if (clearance.posture > 0) clearanceDetails.push(`🪑${clearance.posture}`);
        
        return `
            <div class="break-history-item">
                <div class="break-item-header">
                    <span class="break-type">${typeIcon} ${typeLabel}</span>
                    <span class="break-time">${time}</span>
                </div>
                <div class="break-duration">${breakLog.duration} minutes${activities.length > 0 ? ' · ' + activities.join(' ') : ''}</div>
                ${clearance.total > 0 ? `
                    <div class="debt-cleared">
                        ✓ Cleared ${clearance.total} debt${clearance.total > 1 ? 's' : ''}: ${clearanceDetails.join(' ')}
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

function updateBreakCount() {
    const countElement = document.getElementById('breakCount');
    if (countElement) {
        const todayBreaks = state.breaks.filter(b => isToday(new Date(b.timestamp)));
        const count = todayBreaks.length;
        countElement.textContent = `${count} break${count !== 1 ? 's' : ''}`;
    }
}
