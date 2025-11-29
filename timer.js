// Timer with accurate time tracking, early termination penalties, and persistent state
let state = {};
let timerInterval = null;
let protocolTimerInterval = null;
let timeRemaining = 0;
let totalTime = 0;
let isRunning = false;
let protocols = [];
let currentProtocolIndex = -1;
let protocolTimeRemaining = 0;
let completedProtocols = new Set();
let skippedProtocols = new Set();
let actualTimeSpent = 0;
let blockStartTime = null;
let isPaused = false;

const TIMER_STATE_KEY = 'focusTimerState';

document.addEventListener('DOMContentLoaded', () => {
    initializeTimer();
});

function initializeTimer() {
    state = getAppState();
    setupEventHandlers();
    
    // Try to restore timer state first
    const savedTimerState = restoreTimerState();
    
    if (savedTimerState && state.activeBlock) {
        resumeFromSavedState(savedTimerState);
    } else if (state.activeBlock) {
        renderActiveBlock();
    } else {
        showNoActiveBlock();
    }
    
    // Auto-save state every second when timer is running
    setInterval(() => {
        if (state.activeBlock) {
            saveTimerState();
        }
    }, 1000);
}

function setupEventHandlers() {
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const stopBtn = document.getElementById('stopBtn');
    const submitBtn = document.getElementById('submitCompletionBtn');
    const completeProtocolBtn = document.getElementById('completeProtocolBtn');
    const skipProtocolBtn = document.getElementById('skipProtocolBtn');
    
    if (startBtn) startBtn.addEventListener('click', startTimer);
    if (pauseBtn) pauseBtn.addEventListener('click', pauseTimer);
    if (stopBtn) stopBtn.addEventListener('click', stopTimer);
    if (submitBtn) submitBtn.addEventListener('click', submitCompletion);
    if (completeProtocolBtn) completeProtocolBtn.addEventListener('click', completeCurrentProtocol);
    if (skipProtocolBtn) skipProtocolBtn.addEventListener('click', skipCurrentProtocol);
    
    // Save before page unload
    window.addEventListener('beforeunload', saveTimerState);
    
    // Handle visibility changes (tab switching)
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && isRunning) {
            syncWithSavedState();
        }
    });
}

function saveTimerState() {
    if (!state.activeBlock) return;
    
    const timerState = {
        timeRemaining,
        totalTime,
        isRunning,
        isPaused,
        actualTimeSpent,
        blockStartTime,
        lastSaveTime: Date.now(),
        protocols: protocols.map(p => ({
            ...p,
            triggered: p.triggered,
            completed: p.completed,
            skipped: p.skipped
        })),
        completedProtocols: Array.from(completedProtocols),
        skippedProtocols: Array.from(skippedProtocols),
        blockId: state.activeBlock.id
    };
    
    localStorage.setItem(TIMER_STATE_KEY, JSON.stringify(timerState));
}

function restoreTimerState() {
    const savedStateStr = localStorage.getItem(TIMER_STATE_KEY);
    if (!savedStateStr) return null;
    
    try {
        const savedState = JSON.parse(savedStateStr);
        
        // Verify it matches current active block
        if (!state.activeBlock || savedState.blockId !== state.activeBlock.id) {
            localStorage.removeItem(TIMER_STATE_KEY);
            return null;
        }
        
        return savedState;
    } catch (e) {
        console.error('Error restoring timer state:', e);
        localStorage.removeItem(TIMER_STATE_KEY);
        return null;
    }
}

function resumeFromSavedState(savedState) {
    document.getElementById('noActiveBlock').style.display = 'none';
    document.getElementById('activeBlockContainer').style.display = 'block';
    
    const block = state.activeBlock;
    document.getElementById('activeBlockTitle').textContent = block.category;
    document.getElementById('activeBlockCategory').textContent = `${block.duration}-minute focus session`;
    
    // Restore values
    totalTime = savedState.totalTime;
    blockStartTime = savedState.blockStartTime;
    
    // Calculate time elapsed since last save
    const timeSinceLastSave = Math.floor((Date.now() - savedState.lastSaveTime) / 1000);
    
    // Restore protocols
    protocols = savedState.protocols.map((p, index) => ({
        ...p,
        id: index
    }));
    
    completedProtocols = new Set(savedState.completedProtocols);
    skippedProtocols = new Set(savedState.skippedProtocols);
    
    // Sync time
    if (savedState.isRunning) {
        timeRemaining = Math.max(0, savedState.timeRemaining - timeSinceLastSave);
        actualTimeSpent = savedState.actualTimeSpent + timeSinceLastSave;
        
        if (timeRemaining > 0) {
            updateTimerDisplay();
            renderProtocolChecklist();
            startTimer();
            showToast('Timer resumed ⏱️', 'info');
        } else {
            timeRemaining = 0;
            updateTimerDisplay();
            renderProtocolChecklist();
            completeTimer();
        }
    } else {
        timeRemaining = savedState.timeRemaining;
        actualTimeSpent = savedState.actualTimeSpent;
        isPaused = savedState.isPaused;
        updateTimerDisplay();
        renderProtocolChecklist();
        
        if (isPaused) {
            document.getElementById('timerStatus').textContent = 'Paused';
        }
    }
}

function syncWithSavedState() {
    const savedState = restoreTimerState();
    if (!savedState) return;
    
    const timeSinceLastSave = Math.floor((Date.now() - savedState.lastSaveTime) / 1000);
    
    if (timeSinceLastSave > 2) {
        timeRemaining = Math.max(0, savedState.timeRemaining - timeSinceLastSave);
        actualTimeSpent = savedState.actualTimeSpent + timeSinceLastSave;
        updateTimerDisplay();
    }
}

function showNoActiveBlock() {
    document.getElementById('noActiveBlock').style.display = 'block';
    document.getElementById('activeBlockContainer').style.display = 'none';
    localStorage.removeItem(TIMER_STATE_KEY);
}

function renderActiveBlock() {
    document.getElementById('noActiveBlock').style.display = 'none';
    document.getElementById('activeBlockContainer').style.display = 'block';
    
    const block = state.activeBlock;
    document.getElementById('activeBlockTitle').textContent = block.category;
    document.getElementById('activeBlockCategory').textContent = `${block.duration}-minute focus session`;
    
    // Initialize timer
    totalTime = block.duration * 60;
    timeRemaining = totalTime;
    actualTimeSpent = 0;
    blockStartTime = null;
    
    // Use pre-configured protocols from block
    protocols = block.protocols.map((p, index) => ({
        ...p,
        id: index,
        triggerTimeSeconds: p.triggerTime * 60,
        triggered: false,
        completed: false,
        skipped: false
    }));
    
    updateTimerDisplay();
    renderProtocolChecklist();
}

function renderProtocolChecklist() {
    const checklist = document.getElementById('protocolChecklist');
    
    if (protocols.length === 0) {
        checklist.innerHTML = '<p style="text-align: center; color: var(--text-light); padding: 20px;">No protocols configured for this block</p>';
        return;
    }
    
    checklist.innerHTML = protocols.map((p) => {
        const elapsedTime = totalTime - timeRemaining;
        const isLocked = elapsedTime < p.triggerTimeSeconds;
        const isCompleted = completedProtocols.has(p.id);
        const isSkipped = skippedProtocols.has(p.id);
        
        let statusClass = '';
        let statusText = '';
        
        if (isLocked) {
            statusClass = 'locked';
            const triggerMin = Math.floor(p.triggerTime);
            statusText = `🔒 Unlocks at ${triggerMin}:00`;
        } else if (isCompleted) {
            statusClass = 'completed';
            statusText = '✓ Completed';
        } else if (isSkipped) {
            statusClass = 'skipped';
            statusText = '⊘ Skipped';
        } else if (p.triggered) {
            statusClass = 'ready';
            statusText = '⏰ Ready';
        } else {
            statusClass = 'ready';
            statusText = '⏰ Ready to complete';
        }
        
        return `
            <label class="protocol-item ${statusClass}" data-id="${p.id}">
                <input type="checkbox" 
                    id="protocol_${p.id}" 
                    data-category="${p.category}"
                    ${isLocked ? 'disabled' : ''}
                    ${isCompleted ? 'checked' : ''}
                    onchange="handleProtocolCheck(${p.id})">
                <div class="protocol-content">
                    <span class="protocol-name">
                        <span class="protocol-icon">${p.icon}</span>
                        ${p.name}
                    </span>
                    <span class="protocol-status ${statusClass}">${statusText}</span>
                </div>
            </label>
        `;
    }).join('');
}

function handleProtocolCheck(protocolId) {
    const protocol = protocols.find(p => p.id === protocolId);
    const checkbox = document.getElementById(`protocol_${protocolId}`);
    const elapsedTime = totalTime - timeRemaining;
    
    if (elapsedTime < protocol.triggerTimeSeconds) {
        checkbox.checked = false;
        showToast('This protocol is not available yet!', 'warning');
        return;
    }
    
    if (checkbox.checked) {
        completedProtocols.add(protocolId);
        skippedProtocols.delete(protocolId);
    } else {
        completedProtocols.delete(protocolId);
    }
    
    renderProtocolChecklist();
    saveTimerState();
}

function startTimer() {
    if (isRunning) return;
    
    isRunning = true;
    isPaused = false;
    
    if (!blockStartTime) {
        blockStartTime = Date.now();
    }
    
    document.getElementById('startBtn').style.display = 'none';
    document.getElementById('pauseBtn').style.display = 'inline-flex';
    document.getElementById('timerStatus').textContent = 'In Progress';
    
    timerInterval = setInterval(() => {
        if (timeRemaining > 0) {
            timeRemaining--;
            actualTimeSpent++;
            updateTimerDisplay();
            checkProtocolTriggers();
        } else {
            completeTimer();
        }
    }, 1000);
    
    showToast('Timer started! Stay focused 🎯', 'success');
    enableAudioNotifications();
    saveTimerState();
}

function checkProtocolTriggers() {
    const elapsedTime = totalTime - timeRemaining;
    
    protocols.forEach((protocol) => {
        if (!protocol.triggered && elapsedTime >= protocol.triggerTimeSeconds) {
            protocol.triggered = true;
            
            if (!completedProtocols.has(protocol.id) && !skippedProtocols.has(protocol.id)) {
                triggerProtocolNotification(protocol);
            }
        }
    });
    
    renderProtocolChecklist();
}

function triggerProtocolNotification(protocol) {
    pauseTimer();
    currentProtocolIndex = protocol.id;
    protocolTimeRemaining = protocol.duration;
    showProtocolModal(protocol);
    startProtocolTimer();
    playNotificationSound();
    showToast(`Time for: ${protocol.name}`, 'info');
}

function showProtocolModal(protocol) {
    const modal = document.getElementById('protocolModal');
    document.getElementById('modalIcon').textContent = protocol.icon || '⏰';
    document.getElementById('modalTitle').textContent = 'Protocol Time!';
    document.getElementById('modalProtocolName').textContent = protocol.name;
    document.getElementById('modalDescription').textContent = getProtocolDescription(protocol);
    document.getElementById('modalTimer').textContent = `${protocol.duration}s`;
    modal.style.display = 'flex';
}

function getProtocolDescription(protocol) {
    const descriptions = {
        'eye': 'Look away from your screen and focus on a distant object for 20 seconds. This helps reduce eye strain and prevents digital eye fatigue.',
        'hydration': 'Take a moment to drink water. Staying hydrated improves concentration, energy levels, and overall well-being.',
        'mobility': 'Stand up and stretch your body. Move around for a minute to improve circulation and reduce muscle stiffness.',
        'posture': 'Check and adjust your sitting posture. Ensure your back is straight, shoulders relaxed, and screen at eye level.'
    };
    return descriptions[protocol.category] || 'Complete this wellness protocol to maintain your health and productivity.';
}

function startProtocolTimer() {
    protocolTimerInterval = setInterval(() => {
        if (protocolTimeRemaining > 0) {
            protocolTimeRemaining--;
            document.getElementById('modalTimer').textContent = `${protocolTimeRemaining}s`;
        } else {
            clearInterval(protocolTimerInterval);
            document.getElementById('modalTimer').textContent = 'Complete!';
        }
    }, 1000);
}

function completeCurrentProtocol() {
    if (currentProtocolIndex === -1) return;
    
    completedProtocols.add(currentProtocolIndex);
    skippedProtocols.delete(currentProtocolIndex);
    
    const checkbox = document.getElementById(`protocol_${currentProtocolIndex}`);
    if (checkbox) checkbox.checked = true;
    
    closeProtocolModal();
    renderProtocolChecklist();
    saveTimerState();
    
    showToast('Protocol completed! ✓', 'success');
    
    setTimeout(() => {
        if (!isRunning && timeRemaining > 0) {
            startTimer();
        }
    }, 1000);
}

function skipCurrentProtocol() {
    if (currentProtocolIndex === -1) return;
    
    skippedProtocols.add(currentProtocolIndex);
    completedProtocols.delete(currentProtocolIndex);
    
    const checkbox = document.getElementById(`protocol_${currentProtocolIndex}`);
    if (checkbox) checkbox.checked = false;
    
    closeProtocolModal();
    renderProtocolChecklist();
    saveTimerState();
    
    showToast('Protocol skipped. Debt will be added.', 'warning');
    
    setTimeout(() => {
        if (!isRunning && timeRemaining > 0) {
            startTimer();
        }
    }, 1000);
}

function closeProtocolModal() {
    const modal = document.getElementById('protocolModal');
    modal.style.display = 'none';
    clearInterval(protocolTimerInterval);
    currentProtocolIndex = -1;
}

function pauseTimer() {
    isRunning = false;
    isPaused = true;
    clearInterval(timerInterval);
    document.getElementById('startBtn').style.display = 'inline-flex';
    document.getElementById('pauseBtn').style.display = 'none';
    document.getElementById('timerStatus').textContent = 'Paused';
    saveTimerState();
}

function stopTimer() {
    if (confirm('End this block early? You will be penalized with debt for remaining time.')) {
        completeTimer();
    }
}

function completeTimer() {
    clearInterval(timerInterval);
    clearInterval(protocolTimerInterval);
    isRunning = false;
    
    const actualMinutesSpent = Math.floor(actualTimeSpent / 60);
    const plannedMinutes = state.activeBlock.duration;
    const remainingMinutes = Math.max(0, plannedMinutes - actualMinutesSpent);
    
    document.getElementById('startBtn').style.display = 'none';
    document.getElementById('pauseBtn').style.display = 'none';
    document.getElementById('timerStatus').textContent = 'Completed';
    
    timeRemaining = 0;
    updateTimerDisplay();
    closeProtocolModal();
    
    protocols.forEach(p => {
        if (!p.triggered && !completedProtocols.has(p.id) && !skippedProtocols.has(p.id)) {
            skippedProtocols.add(p.id);
        }
    });
    
    showCompletionSection(actualMinutesSpent, remainingMinutes);
    saveTimerState();
    showToast('Block ended! Review your completion 🎉', 'success');
}

function updateTimerDisplay() {
    const displayElement = document.getElementById('timeRemaining');
    displayElement.textContent = formatTimer(timeRemaining);
    
    const progress = ((totalTime - timeRemaining) / totalTime) * 100;
    const circle = document.getElementById('timerCircle');
    if (circle) {
        const radius = 135;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (progress / 100) * circumference;
        circle.style.strokeDasharray = circumference;
        circle.style.strokeDashoffset = offset;
    }
}

function showCompletionSection(actualMinutes, remainingMinutes) {
    document.getElementById('completionSection').style.display = 'block';
    
    const completed = completedProtocols.size;
    const skipped = skippedProtocols.size;
    const total = protocols.length;
    
    const plannedMinutes = state.activeBlock.duration;
    const completionPercentage = Math.round((actualMinutes / plannedMinutes) * 100);
    const earlyTerminationDebt = Math.floor(remainingMinutes / 15);
    
    const debtByCategory = {};
    skippedProtocols.forEach(id => {
        const protocol = protocols.find(p => p.id === id);
        if (protocol) {
            debtByCategory[protocol.category] = (debtByCategory[protocol.category] || 0) + 1;
        }
    });
    
    const debtBreakdown = Object.entries(debtByCategory).map(([cat, count]) => {
        const icons = { eye: '👁️', hydration: '💧', mobility: '🏃', posture: '🪑' };
        return `${icons[cat]} ${cat}: +${count}`;
    }).join(' · ');
    
    const summaryHTML = `
        <div style="text-align: center; padding: 24px; background: var(--bg); border-radius: var(--radius-md); margin-bottom: 20px;">
            <div style="background: linear-gradient(135deg, rgba(33, 150, 243, 0.1) 0%, rgba(0, 188, 212, 0.1) 100%); padding: 16px; border-radius: var(--radius-sm); margin-bottom: 16px; border: 2px solid var(--primary);">
                <div style="font-size: 0.875rem; color: var(--text-light); margin-bottom: 8px;">Actual Focus Time</div>
                <div style="font-size: 2rem; font-weight: 700; color: var(--primary); margin-bottom: 4px;">${actualMinutes} minutes</div>
                <div style="font-size: 0.875rem; color: var(--text-secondary);">
                    Planned: ${plannedMinutes} min · Completion: ${completionPercentage}%
                </div>
                ${remainingMinutes > 0 ? `
                    <div style="margin-top: 12px; padding: 10px; background: rgba(255, 152, 0, 0.1); border-radius: var(--radius-sm); border: 2px solid var(--warning);">
                        <div style="font-size: 0.875rem; color: var(--warning); font-weight: 600;">
                            ⚠️ Early Termination: ${remainingMinutes} minutes remaining
                        </div>
                    </div>
                ` : ''}
            </div>

            <div style="display: flex; justify-content: center; gap: 32px; margin-bottom: 16px;">
                <div>
                    <div style="font-size: 2.5rem; font-weight: 700; color: var(--success);">${completed}</div>
                    <div style="font-size: 0.875rem; color: var(--text-light);">Completed</div>
                </div>
                <div>
                    <div style="font-size: 2.5rem; font-weight: 700; color: var(--danger);">${skipped}</div>
                    <div style="font-size: 0.875rem; color: var(--text-light);">Skipped</div>
                </div>
                <div>
                    <div style="font-size: 2.5rem; font-weight: 700; color: var(--text-secondary);">${total}</div>
                    <div style="font-size: 0.875rem; color: var(--text-light);">Total</div>
                </div>
            </div>
            
            ${skipped > 0 || earlyTerminationDebt > 0 ? `
                <div style="padding: 12px; background: rgba(244, 67, 54, 0.1); border-radius: var(--radius-sm); border: 2px solid var(--danger);">
                    <p style="color: var(--danger); font-weight: 600; margin-bottom: 8px;">⚠️ Recovery Debt Added</p>
                    ${debtBreakdown ? `<p style="color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 4px;">Skipped Protocols: ${debtBreakdown}</p>` : ''}
                    ${earlyTerminationDebt > 0 ? `
                        <p style="color: var(--text-secondary); font-size: 0.875rem;">
                            Early Termination Penalty: +${earlyTerminationDebt} debt (1 per 15 min remaining)
                        </p>
                    ` : ''}
                    <p style="color: var(--danger); font-weight: 700; font-size: 1.1rem; margin-top: 8px;">
                        Total Debt Added: ${skipped + earlyTerminationDebt}
                    </p>
                </div>
            ` : `
                <div style="padding: 12px; background: rgba(76, 175, 80, 0.1); border-radius: var(--radius-sm); border: 2px solid var(--success);">
                    <p style="color: var(--success); font-weight: 600;">🎉 Perfect Session! No debt added.</p>
                </div>
            `}
        </div>
    `;
    
    document.getElementById('completionSummary').innerHTML = summaryHTML;
}

function submitCompletion() {
    const actualMinutesSpent = Math.floor(actualTimeSpent / 60);
    const plannedMinutes = state.activeBlock.duration;
    const remainingMinutes = Math.max(0, plannedMinutes - actualMinutesSpent);
    
    let completed = 0;
    let skipped = 0;
    const debtChanges = {};
    
    protocols.forEach(protocol => {
        if (completedProtocols.has(protocol.id)) {
            completed++;
            state.stats.protocolsCompleted++;
        } else {
            skipped++;
            state.stats.protocolsSkipped++;
            state.debts[protocol.category] = (state.debts[protocol.category] || 0) + 1;
            debtChanges[protocol.category] = (debtChanges[protocol.category] || 0) + 1;
            state.stats.debtsCreated++;
        }
    });
    
    const earlyTerminationDebt = Math.floor(remainingMinutes / 15);
    if (earlyTerminationDebt > 0) {
        const categories = ['eye', 'hydration', 'mobility', 'posture'];
        for (let i = 0; i < earlyTerminationDebt; i++) {
            const category = categories[i % categories.length];
            state.debts[category] = (state.debts[category] || 0) + 1;
            debtChanges[category] = (debtChanges[category] || 0) + 1;
            state.stats.debtsCreated++;
        }
    }
    
    const block = state.blocks.find(b => b.id === state.activeBlock.id);
    if (block) {
        block.completed = true;
        block.completionData = {
            completed,
            skipped,
            debtChanges,
            actualMinutes: actualMinutesSpent,
            plannedMinutes: plannedMinutes,
            remainingMinutes: remainingMinutes,
            earlyTerminationDebt: earlyTerminationDebt,
            completedAt: new Date().toISOString()
        };
    }
    
    state.stats.blocksCompleted++;
    state.stats.totalFocusTime += actualMinutesSpent;
    
    if (getTotalDebt(state.debts) >= 5) {
        state.stats.fatigueFlags++;
    }
    
    state.activeBlock = null;
    saveAppState(state);
    localStorage.removeItem(TIMER_STATE_KEY);
    
    const totalDebtAdded = skipped + earlyTerminationDebt;
    const message = totalDebtAdded > 0 
        ? `Session saved! ${actualMinutesSpent} min focused. +${totalDebtAdded} debt added.`
        : `Perfect! ${actualMinutesSpent} min focused with all protocols completed! 🎉`;
    
    showToast(message, totalDebtAdded > 0 ? 'warning' : 'success');
    
    setTimeout(() => {
        window.location.href = 'dashboard.html';
    }, 2000);
}

function enableAudioNotifications() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

function playNotificationSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
        console.log('Audio notification not supported');
    }
}

// [Keep all your existing CSS styles - no changes]
const style = document.createElement('style');
style.textContent = `
    .timer-container {
        max-width: 800px;
        margin: 0 auto;
    }
    
    .timer-card {
        margin-bottom: 24px;
    }
    
    .timer-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 32px;
    }
    
    .block-title-section h1 {
        font-size: 2rem;
        margin-bottom: 8px;
    }
    
    .block-category {
        color: var(--text-light);
        font-size: 1.1rem;
    }
    
    .timer-status {
        padding: 8px 16px;
        background: var(--bg);
        border-radius: var(--radius-sm);
        font-weight: 600;
        color: var(--primary);
    }
    
    .timer-display {
        display: flex;
        justify-content: center;
        margin: 40px 0;
    }
    
    .time-circle {
        position: relative;
        width: 300px;
        height: 300px;
    }
    
    .timer-svg {
        width: 100%;
        height: 100%;
        transform: rotate(-90deg);
    }
    
    .timer-bg-circle {
        fill: none;
        stroke: var(--border);
        stroke-width: 12;
    }
    
    .timer-progress-circle {
        fill: none;
        stroke: var(--primary);
        stroke-width: 12;
        stroke-linecap: round;
        transition: stroke-dashoffset 0.3s ease;
    }
    
    .time-remaining {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 4rem;
        font-weight: bold;
        color: var(--primary);
        font-variant-numeric: tabular-nums;
    }
    
    .timer-controls {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 16px;
    }
    
    .btn-control {
        padding: 16px;
        border: none;
        border-radius: var(--radius-md);
        font-size: 1.1rem;
        font-weight: 600;
        cursor: pointer;
        transition: var(--transition);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
    }
    
    .btn-start {
        background: var(--gradient-blue);
        color: white;
    }
    
    .btn-pause {
        background: var(--warning);
        color: white;
    }
    
    .btn-stop {
        background: var(--danger);
        color: white;
    }
    
    .btn-control:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px var(--shadow);
    }
    
    .protocols-card {
        margin-bottom: 24px;
    }
    
    .protocols-subtitle {
        color: var(--text-light);
        font-size: 0.95rem;
    }
    
    .protocols-checklist {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }
    
    .protocol-item {
        display: flex;
        align-items: center;
        padding: 16px;
        background: var(--bg);
        border-radius: var(--radius-md);
        cursor: pointer;
        transition: var(--transition);
        border: 2px solid transparent;
    }
    
    .protocol-item:not(.locked):hover {
        background: var(--bg-secondary);
        border-color: var(--primary);
    }
    
    .protocol-item.locked {
        opacity: 0.6;
        cursor: not-allowed;
        background: repeating-linear-gradient(
            45deg,
            var(--bg),
            var(--bg) 10px,
            var(--bg-secondary) 10px,
            var(--bg-secondary) 20px
        );
    }
    
    .protocol-item.completed {
        background: rgba(76, 175, 80, 0.1);
        border-color: var(--success);
    }
    
    .protocol-item.skipped {
        background: rgba(244, 67, 54, 0.1);
        border-color: var(--danger);
    }
    
    .protocol-item.ready {
        border-color: var(--primary);
        background: rgba(33, 150, 243, 0.05);
    }
    
    .protocol-item input[type="checkbox"] {
        width: 20px;
        height: 20px;
        margin-right: 12px;
        cursor: pointer;
    }
    
    .protocol-item.locked input[type="checkbox"] {
        cursor: not-allowed;
    }
    
    .protocol-content {
        flex: 1;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    
    .protocol-name {
        font-weight: 500;
        color: var(--text);
        display: flex;
        align-items: center;
        gap: 8px;
    }
    
    .protocol-icon {
        font-size: 1.25rem;
    }
    
    .protocol-status {
        font-size: 0.875rem;
        font-weight: 600;
        padding: 4px 12px;
        border-radius: 100px;
    }
    
    .protocol-status.locked {
        background: var(--warning);
        color: white;
    }
    
    .protocol-status.ready {
        background: var(--primary);
        color: white;
    }
    
    .protocol-status.completed {
        background: var(--success);
        color: white;
    }
    
    .protocol-status.skipped {
        background: var(--danger);
        color: white;
    }
    
    /* Protocol Modal */
    .protocol-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2000;
        animation: fadeIn 0.3s;
    }
    
    .protocol-modal-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(4px);
    }
    
    .protocol-modal-content {
        position: relative;
        background: white;
        border-radius: var(--radius-xl);
        max-width: 500px;
        width: 90%;
        padding: 40px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        animation: slideUp 0.3s;
    }
    
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    
    @keyframes slideUp {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    .modal-header {
        text-align: center;
        margin-bottom: 24px;
    }
    
    .modal-icon {
        font-size: 4rem;
        margin-bottom: 16px;
        animation: bounce 1s infinite;
    }
    
    @keyframes bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-10px); }
    }
    
    .modal-header h2 {
        font-size: 1.75rem;
        color: var(--text);
        margin: 0;
    }
    
    .modal-body {
        text-align: center;
        margin-bottom: 32px;
    }
    
    .modal-protocol-name {
        font-size: 1.25rem;
        font-weight: 600;
        color: var(--primary);
        margin-bottom: 12px;
    }
    
    .modal-description {
        color: var(--text-secondary);
        line-height: 1.6;
        margin-bottom: 24px;
    }
    
    .modal-timer {
        font-size: 3rem;
        font-weight: 700;
        color: var(--primary);
        font-variant-numeric: tabular-nums;
    }
    
    .modal-actions {
        display: grid;
        grid-template-columns: 2fr 1fr;
        gap: 12px;
    }
    
    .btn-modal-complete,
    .btn-modal-skip {
        padding: 16px;
        border: none;
        border-radius: var(--radius-md);
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: var(--transition);
    }
    
    .btn-modal-complete {
        background: var(--gradient-blue);
        color: white;
    }
    
    .btn-modal-complete:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(33, 150, 243, 0.4);
    }
    
    .btn-modal-skip {
        background: var(--bg);
        color: var(--text-secondary);
    }
    
    .btn-modal-skip:hover {
        background: var(--bg-secondary);
    }
    
    .completion-card {
        background: var(--gradient-success);
        color: white;
    }
    
    .completion-card .card-header h2 {
        color: white;
    }
    
    .completion-header {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 24px;
    }
    
    .completion-icon {
        font-size: 3rem;
    }
    
    .completion-header h2 {
        color: white;
        margin-bottom: 8px;
    }
    
    @media (max-width: 768px) {
        .time-circle {
            width: 250px;
            height: 250px;
        }
        
        .time-remaining {
            font-size: 3rem;
        }
        
        .protocol-modal-content {
            padding: 30px 20px;
        }
        
        .modal-icon {
            font-size: 3rem;
        }
        
        .modal-timer {
            font-size: 2.5rem;
        }
        
        .modal-actions {
            grid-template-columns: 1fr;
        }
    }
`;
document.head.appendChild(style);
