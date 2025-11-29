// Planner with strict conservative mode enforcement
let state = {};
let selectedDuration = null;
let protocolConfig = {
    eye: { enabled: true, interval: 20 },
    hydration: { enabled: true, interval: 30 },
    mobility: { enabled: true, interval: 40 },
    posture: { enabled: true, interval: 25 }
};

// Conservative Mode Rules [file:1]
const CONSERVATIVE_RULES = {
    CRITICAL: { threshold: 10, maxDuration: 25, label: 'Critical', color: 'danger' },
    HIGH: { threshold: 5, maxDuration: 50, label: 'High', color: 'warning' },
    MODERATE: { threshold: 3, maxDuration: 90, label: 'Moderate', color: 'warning' },
    LOW: { threshold: 0, maxDuration: 180, label: 'Low', color: 'success' }
};

document.addEventListener('DOMContentLoaded', () => {
    initializePlanner();
});

function initializePlanner() {
    state = getAppState();
    updateScheduleDate();
    setupEventHandlers();
    updateDebtIndicator();
    checkConservativeMode();
    renderBlocks();
}

function updateScheduleDate() {
    const dateElement = document.getElementById('scheduleDate');
    if (dateElement) {
        dateElement.textContent = formatDate(new Date());
    }
}

function updateDebtIndicator() {
    const totalDebt = getTotalDebt(state.debts);
    const indicator = document.getElementById('currentDebtIndicator');
    
    if (indicator) {
        indicator.textContent = `Debt: ${totalDebt}`;
        
        // Update color based on debt level
        indicator.classList.remove('high', 'moderate', 'low');
        if (totalDebt >= 10) {
            indicator.classList.add('high');
        } else if (totalDebt >= 5) {
            indicator.classList.add('moderate');
        } else if (totalDebt >= 3) {
            indicator.classList.add('moderate');
        } else {
            indicator.classList.add('low');
        }
    }
}

function checkConservativeMode() {
    const totalDebt = getTotalDebt(state.debts);
    const alert = document.getElementById('conservativeModeAlert');
    const message = document.getElementById('conservativeModeMessage');
    
    if (totalDebt >= 3) {
        alert.style.display = 'flex';
        
        let modeLevel, maxDuration;
        if (totalDebt >= 10) {
            modeLevel = 'Critical';
            maxDuration = 25;
        } else if (totalDebt >= 5) {
            modeLevel = 'High';
            maxDuration = 50;
        } else {
            modeLevel = 'Moderate';
            maxDuration = 90;
        }
        
        message.textContent = `Your recovery debt is ${totalDebt}. ${modeLevel} fatigue risk detected. Maximum block duration: ${maxDuration} minutes. Take breaks to unlock longer sessions.`;
    } else {
        alert.style.display = 'none';
    }
    
    // Update duration cards based on conservative mode
    updateDurationCards(totalDebt);
}

function updateDurationCards(totalDebt) {
    const maxAllowedDuration = getMaxAllowedDuration(totalDebt);
    
    // Update 25-min card (always available)
    const card25 = document.getElementById('duration25');
    card25.classList.remove('locked');
    card25.querySelector('.duration-status').style.display = 'none';
    
    // Update 50-min card
    const card50 = document.getElementById('duration50');
    if (maxAllowedDuration < 50) {
        card50.classList.add('locked');
        card50.querySelector('.duration-status').textContent = 'Locked';
        card50.querySelector('.duration-status').style.display = 'block';
    } else {
        card50.classList.remove('locked');
        card50.querySelector('.duration-status').style.display = 'none';
    }
    
    // Update 90-min card
    const card90 = document.getElementById('duration90');
    if (maxAllowedDuration < 90) {
        card90.classList.add('locked');
        card90.querySelector('.duration-status').textContent = 'Locked';
        card90.querySelector('.duration-status').style.display = 'block';
    } else {
        card90.classList.remove('locked');
        card90.querySelector('.duration-status').style.display = 'none';
    }
}

function getMaxAllowedDuration(totalDebt) {
    if (totalDebt >= 10) return 25;
    if (totalDebt >= 5) return 50;
    if (totalDebt >= 3) return 90;
    return 180;
}

function getConservativeLevel(totalDebt) {
    if (totalDebt >= 10) return CONSERVATIVE_RULES.CRITICAL;
    if (totalDebt >= 5) return CONSERVATIVE_RULES.HIGH;
    if (totalDebt >= 3) return CONSERVATIVE_RULES.MODERATE;
    return CONSERVATIVE_RULES.LOW;
}

function setupEventHandlers() {
    // Duration selector buttons
    document.querySelectorAll('.duration-card').forEach(btn => {
        btn.addEventListener('click', () => handleDurationSelect(btn));
    });
    
    // Custom duration input
    const customInput = document.getElementById('customDuration');
    if (customInput) {
        customInput.addEventListener('input', handleCustomDurationInput);
    }
    
    // Protocol interval changes
    setupProtocolListeners();
    
    // Create block button
    const createBtn = document.getElementById('createBlockBtn');
    if (createBtn) {
        createBtn.addEventListener('click', createBlock);
    }
}

function setupProtocolListeners() {
    // Eye rest
    document.getElementById('eyeToggle').addEventListener('change', (e) => {
        protocolConfig.eye.enabled = e.target.checked;
        document.getElementById('eyeInterval').disabled = !e.target.checked;
        updateProtocolPreview();
    });
    
    document.getElementById('eyeInterval').addEventListener('change', (e) => {
        protocolConfig.eye.interval = parseInt(e.target.value);
        updateProtocolPreview();
    });
    
    // Hydration
    document.getElementById('hydrationToggle').addEventListener('change', (e) => {
        protocolConfig.hydration.enabled = e.target.checked;
        document.getElementById('hydrationInterval').disabled = !e.target.checked;
        updateProtocolPreview();
    });
    
    document.getElementById('hydrationInterval').addEventListener('change', (e) => {
        protocolConfig.hydration.interval = parseInt(e.target.value);
        updateProtocolPreview();
    });
    
    // Mobility
    document.getElementById('mobilityToggle').addEventListener('change', (e) => {
        protocolConfig.mobility.enabled = e.target.checked;
        document.getElementById('mobilityInterval').disabled = !e.target.checked;
        updateProtocolPreview();
    });
    
    document.getElementById('mobilityInterval').addEventListener('change', (e) => {
        protocolConfig.mobility.interval = parseInt(e.target.value);
        updateProtocolPreview();
    });
    
    // Posture
    document.getElementById('postureToggle').addEventListener('change', (e) => {
        protocolConfig.posture.enabled = e.target.checked;
        document.getElementById('postureInterval').disabled = !e.target.checked;
        updateProtocolPreview();
    });
    
    document.getElementById('postureInterval').addEventListener('change', (e) => {
        protocolConfig.posture.interval = parseInt(e.target.value);
        updateProtocolPreview();
    });
}

function handleDurationSelect(btn) {
    // Skip if locked
    if (btn.classList.contains('locked')) {
        const totalDebt = getTotalDebt(state.debts);
        const level = getConservativeLevel(totalDebt);
        showToast(`Locked by Conservative Mode. Current debt: ${totalDebt}. Maximum allowed: ${level.maxDuration} minutes. Clear debt to unlock.`, 'warning');
        return;
    }
    
    const totalDebt = getTotalDebt(state.debts);
    const maxAllowed = getMaxAllowedDuration(totalDebt);
    
    // Remove selection from all buttons
    document.querySelectorAll('.duration-card').forEach(b => {
        b.classList.remove('selected');
    });
    
    // Check if custom button
    if (btn.id === 'customBtn') {
        btn.classList.add('selected');
        document.getElementById('customDurationWrapper').style.display = 'block';
        selectedDuration = null;
        showProtocolConfig(false);
        
        // Update hint for custom input
        updateCustomDurationHint(maxAllowed);
    } else {
        const duration = parseInt(btn.dataset.duration);
        
        document.getElementById('customDurationWrapper').style.display = 'none';
        btn.classList.add('selected');
        selectedDuration = duration;
        showProtocolConfig(true);
        updateProtocolPreview();
    }
}

function updateCustomDurationHint(maxAllowed) {
    const hint = document.getElementById('customDurationHint');
    hint.classList.add('show');
    hint.classList.remove('error');
    hint.textContent = `⚠️ Conservative Mode: Maximum allowed duration is ${maxAllowed} minutes based on your current debt level.`;
}

function handleCustomDurationInput(e) {
    const duration = parseInt(e.target.value);
    const totalDebt = getTotalDebt(state.debts);
    const maxAllowed = getMaxAllowedDuration(totalDebt);
    const hint = document.getElementById('customDurationHint');
    
    if (!duration || duration < 5) {
        hint.classList.add('show');
        hint.classList.remove('error');
        hint.textContent = 'Enter a duration between 5 and 180 minutes';
        showProtocolConfig(false);
        return;
    }
    
    if (duration > maxAllowed) {
        hint.classList.add('show', 'error');
        hint.textContent = `❌ ${duration} minutes exceeds your limit of ${maxAllowed} minutes. Current debt: ${totalDebt}. Clear debt to unlock longer sessions.`;
        showProtocolConfig(false);
        selectedDuration = null;
        return;
    }
    
    if (duration > 180) {
        hint.classList.add('show', 'error');
        hint.textContent = '❌ Maximum duration is 180 minutes';
        showProtocolConfig(false);
        selectedDuration = null;
        return;
    }
    
    // Valid duration
    hint.classList.add('show');
    hint.classList.remove('error');
    hint.textContent = `✓ ${duration} minutes is within your allowed limit`;
    selectedDuration = duration;
    showProtocolConfig(true);
    updateProtocolPreview();
}

function showProtocolConfig(show) {
    document.getElementById('protocolConfigSection').style.display = show ? 'block' : 'none';
    document.getElementById('blockDetailsSection').style.display = show ? 'block' : 'none';
    document.getElementById('createBlockBtn').style.display = show ? 'block' : 'none';
}

function generateProtocolSchedule(duration) {
    const protocols = [];
    const durationMinutes = duration;
    
    // Generate protocols based on intervals
    if (protocolConfig.eye.enabled) {
        const interval = protocolConfig.eye.interval;
        for (let time = interval; time < durationMinutes; time += interval) {
            protocols.push({
                name: 'Eye rest (20 seconds)',
                category: 'eye',
                duration: 20,
                triggerTime: time,
                icon: '👁️'
            });
        }
    }
    
    if (protocolConfig.hydration.enabled) {
        const interval = protocolConfig.hydration.interval;
        for (let time = interval; time < durationMinutes; time += interval) {
            protocols.push({
                name: 'Hydration break',
                category: 'hydration',
                duration: 30,
                triggerTime: time,
                icon: '💧'
            });
        }
    }
    
    if (protocolConfig.mobility.enabled) {
        const interval = protocolConfig.mobility.interval;
        for (let time = interval; time < durationMinutes; time += interval) {
            protocols.push({
                name: 'Stand & stretch (1 minute)',
                category: 'mobility',
                duration: 60,
                triggerTime: time,
                icon: '🏃'
            });
        }
    }
    
    if (protocolConfig.posture.enabled) {
        const interval = protocolConfig.posture.interval;
        for (let time = interval; time < durationMinutes; time += interval) {
            protocols.push({
                name: 'Posture check',
                category: 'posture',
                duration: 15,
                triggerTime: time,
                icon: '🪑'
            });
        }
    }
    
    // Sort by trigger time
    protocols.sort((a, b) => a.triggerTime - b.triggerTime);
    
    return protocols;
}

function updateProtocolPreview() {
    if (!selectedDuration) return;
    
    const protocols = generateProtocolSchedule(selectedDuration);
    const previewDiv = document.getElementById('protocolPreview');
    
    if (protocols.length === 0) {
        previewDiv.innerHTML = '<p style="text-align: center; color: var(--text-light);">No protocols configured. Enable at least one protocol type above.</p>';
        return;
    }
    
    const html = `
        <h4>Protocol Schedule Preview (${protocols.length} reminders)</h4>
        <div class="preview-timeline">
            ${protocols.map(p => `
                <div class="preview-item">
                    <span class="preview-time">${p.triggerTime} min</span>
                    <span class="preview-protocol">
                        <span>${p.icon}</span>
                        <span>${p.name}</span>
                    </span>
                </div>
            `).join('')}
        </div>
    `;
    
    previewDiv.innerHTML = html;
}

function createBlock() {
    let duration = selectedDuration;
    
    if (!duration) {
        const customValue = document.getElementById('customDuration').value;
        duration = parseInt(customValue);
    }
    
    const category = document.getElementById('blockCategory').value.trim();
    const notes = document.getElementById('blockNotes').value.trim();
    
    // Validation
    if (!duration || duration < 5 || duration > 180) {
        showToast('Please select a valid duration (5-180 minutes)', 'error');
        return;
    }
    
    // Conservative mode validation
    const totalDebt = getTotalDebt(state.debts);
    const maxAllowed = getMaxAllowedDuration(totalDebt);
    
    if (duration > maxAllowed) {
        showToast(`Duration exceeds conservative mode limit. Maximum allowed: ${maxAllowed} minutes with debt level ${totalDebt}`, 'error');
        return;
    }
    
    if (!category) {
        showToast('Please enter a category', 'error');
        return;
    }
    
    // Generate protocol schedule based on user configuration
    const protocols = generateProtocolSchedule(duration);
    
    if (protocols.length === 0) {
        showToast('Please enable at least one protocol type', 'error');
        return;
    }
    
    const block = {
        id: Date.now(),
        duration,
        category,
        notes,
        protocols,
        protocolConfig: JSON.parse(JSON.stringify(protocolConfig)), // Save configuration
        completed: false,
        createdAt: new Date().toISOString()
    };
    
    state.blocks.push(block);
    saveAppState(state);
    renderBlocks();
    
    // Clear form
    resetForm();
    
    showToast(`Block created with ${protocols.length} protocol reminders!`, 'success');
}

function resetForm() {
    document.getElementById('blockCategory').value = '';
    document.getElementById('blockNotes').value = '';
    document.getElementById('customDuration').value = '';
    document.querySelectorAll('.duration-card').forEach(b => b.classList.remove('selected'));
    document.getElementById('customDurationWrapper').style.display = 'none';
    document.getElementById('customDurationHint').classList.remove('show');
    document.getElementById('protocolConfigSection').style.display = 'none';
    document.getElementById('blockDetailsSection').style.display = 'none';
    document.getElementById('createBlockBtn').style.display = 'none';
    selectedDuration = null;
}

function renderBlocks() {
    const blocksList = document.getElementById('blocksList');
    const todayBlocks = state.blocks.filter(b => isToday(new Date(b.createdAt)));
    
    if (todayBlocks.length === 0) {
        blocksList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📅</div>
                <p>No blocks scheduled yet</p>
                <small>Create your first focus block</small>
            </div>
        `;
        return;
    }
    
    blocksList.innerHTML = todayBlocks.map(block => `
        <div class="timeline-item ${block.completed ? 'completed' : ''}" data-id="${block.id}">
            <div class="timeline-marker ${block.completed ? 'done' : ''}"></div>
            <div class="timeline-content">
                <div class="timeline-header">
                    <div>
                        <h3>${block.category}</h3>
                        <p class="timeline-meta">${block.duration} minutes · ${block.protocols.length} protocol reminders</p>
                        ${block.notes ? `<p class="timeline-notes">${block.notes}</p>` : ''}
                    </div>
                    <div class="timeline-actions">
                        ${!block.completed ? `
                            <button class="btn-start" onclick="startBlock(${block.id})">
                                <span>▶️</span> Start
                            </button>
                        ` : '<span class="status-badge">✓ Completed</span>'}
                        <button class="btn-delete" onclick="deleteBlock(${block.id})">
                            <span>🗑️</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function startBlock(blockId) {
    const block = state.blocks.find(b => b.id === blockId);
    if (!block) return;
    
    state.activeBlock = block;
    saveAppState(state);
    
    showToast('Block started! Redirecting to timer...', 'success');
    setTimeout(() => {
        window.location.href = 'timer.html';
    }, 1000);
}

function deleteBlock(blockId) {
    if (confirm('Delete this block?')) {
        state.blocks = state.blocks.filter(b => b.id !== blockId);
        saveAppState(state);
        renderBlocks();
        showToast('Block deleted', 'success');
    }
}
