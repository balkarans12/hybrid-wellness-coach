// Weekly Review page logic
let state = {};

document.addEventListener('DOMContentLoaded', () => {
    initializeReview();
});

function initializeReview() {
    state = getAppState();
    updateReviewMetrics();
    setupEventHandlers();
}

function setupEventHandlers() {
    const exportBtn = document.getElementById('exportCSVBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportCSV);
    }
}

function updateReviewMetrics() {
    updateFocusMetrics();
    updateComplianceMetrics();
    updateBreakMetrics();
    updateDebtMetrics();
    updateBlockDistribution();
    updateInsights();
}

function updateFocusMetrics() {
    // Total focus time
    const focusTimeElement = document.getElementById('weekFocusTime');
    if (focusTimeElement) {
        focusTimeElement.textContent = formatTime(state.stats.totalFocusTime);
    }
    
    // Blocks completed
    const blocksElement = document.getElementById('weekBlocks');
    if (blocksElement) {
        blocksElement.textContent = state.stats.blocksCompleted;
    }
}

function updateComplianceMetrics() {
    const totalProtocols = state.stats.protocolsCompleted + state.stats.protocolsSkipped;
    const compliance = totalProtocols > 0 
        ? Math.round((state.stats.protocolsCompleted / totalProtocols) * 100) 
        : 100;
    
    const complianceElement = document.getElementById('weekCompliance');
    if (complianceElement) {
        complianceElement.textContent = `${compliance}%`;
    }
    
    const protocolsElement = document.getElementById('weekProtocols');
    if (protocolsElement) {
        protocolsElement.textContent = state.stats.protocolsCompleted;
    }
}

function updateBreakMetrics() {
    const breaksElement = document.getElementById('weekBreaks');
    if (breaksElement) {
        breaksElement.textContent = state.stats.breaksTaken;
    }
    
    // Calculate average break duration
    const avgDurationElement = document.getElementById('avgBreakDuration');
    if (avgDurationElement && state.breaks.length > 0) {
        const totalDuration = state.breaks.reduce((sum, b) => sum + b.duration, 0);
        const avgDuration = Math.round(totalDuration / state.breaks.length);
        avgDurationElement.textContent = `${avgDuration} min`;
    } else if (avgDurationElement) {
        avgDurationElement.textContent = '0 min';
    }
}

function updateDebtMetrics() {
    const netDebt = state.stats.debtsCreated - state.stats.debtsCleared;
    
    const netDebtElement = document.getElementById('netDebt');
    if (netDebtElement) {
        netDebtElement.textContent = netDebt;
        
        // Color based on net debt
        if (netDebt > 5) {
            netDebtElement.style.color = 'var(--danger)';
        } else if (netDebt > 2) {
            netDebtElement.style.color = 'var(--warning)';
        } else {
            netDebtElement.style.color = 'var(--success)';
        }
    }
    
    const debtsCreatedElement = document.getElementById('weekDebtsCreated');
    if (debtsCreatedElement) {
        debtsCreatedElement.textContent = state.stats.debtsCreated;
    }
    
    const debtsClearedElement = document.getElementById('weekDebtsCleared');
    if (debtsClearedElement) {
        debtsClearedElement.textContent = state.stats.debtsCleared;
    }
}

function updateBlockDistribution() {
    // Count blocks by duration category
    let count25 = 0;
    let count50 = 0;
    let count90 = 0;
    
    state.blocks.forEach(block => {
        if (block.completed) {
            if (block.duration <= 25) count25++;
            else if (block.duration <= 50) count50++;
            else count90++;
        }
    });
    
    const total = count25 + count50 + count90;
    
    // Update distribution bars
    if (total > 0) {
        const percent25 = (count25 / total) * 100;
        const percent50 = (count50 / total) * 100;
        const percent90 = (count90 / total) * 100;
        
        document.getElementById('dist25').style.width = `${percent25}%`;
        document.getElementById('dist50').style.width = `${percent50}%`;
        document.getElementById('dist90').style.width = `${percent90}%`;
        
        document.getElementById('count25').textContent = count25;
        document.getElementById('count50').textContent = count50;
        document.getElementById('count90').textContent = count90;
    }
}

function updateInsights() {
    // Average block length
    const avgBlockElement = document.getElementById('avgBlockLength');
    if (avgBlockElement) {
        if (state.stats.blocksCompleted > 0) {
            const avgLength = Math.round(state.stats.totalFocusTime / state.stats.blocksCompleted);
            avgBlockElement.textContent = `${avgLength} min`;
        } else {
            avgBlockElement.textContent = '0 min';
        }
    }
    
    // Most productive block size
    const bestBlockElement = document.getElementById('bestBlockSize');
    if (bestBlockElement) {
        let count25 = 0, count50 = 0, count90 = 0;
        
        state.blocks.forEach(block => {
            if (block.completed) {
                if (block.duration <= 25) count25++;
                else if (block.duration <= 50) count50++;
                else count90++;
            }
        });
        
        if (count25 === 0 && count50 === 0 && count90 === 0) {
            bestBlockElement.textContent = 'N/A';
        } else {
            const max = Math.max(count25, count50, count90);
            if (max === count25) bestBlockElement.textContent = '25 minutes';
            else if (max === count50) bestBlockElement.textContent = '50 minutes';
            else bestBlockElement.textContent = '90 minutes';
        }
    }
    
    // Fatigue flags
    const fatigueElement = document.getElementById('weekFatigueFlags');
    if (fatigueElement) {
        fatigueElement.textContent = state.stats.fatigueFlags;
    }
    
    // Weekly trend
    const trendElement = document.getElementById('weeklyTrend');
    if (trendElement) {
        const compliance = state.stats.protocolsCompleted / 
            (state.stats.protocolsCompleted + state.stats.protocolsSkipped || 1);
        
        if (compliance >= 0.9) {
            trendElement.textContent = 'Excellent';
            trendElement.style.color = 'var(--success)';
        } else if (compliance >= 0.7) {
            trendElement.textContent = 'Good';
            trendElement.style.color = 'var(--primary)';
        } else if (compliance >= 0.5) {
            trendElement.textContent = 'Needs Improvement';
            trendElement.style.color = 'var(--warning)';
        } else {
            trendElement.textContent = 'Critical';
            trendElement.style.color = 'var(--danger)';
        }
    }
}

function exportCSV() {
    // Generate CSV content
    let csv = 'Type,Category,Duration,Status,Timestamp,Notes\n';
    
    // Export blocks
    state.blocks.forEach(block => {
        const status = block.completed ? 'Completed' : 'Pending';
        const notes = block.notes ? block.notes.replace(/"/g, '""') : '';
        csv += `Block,"${block.category}",${block.duration},${status},${block.createdAt},"${notes}"\n`;
    });
    
    // Export breaks
    state.breaks.forEach(breakLog => {
        const activities = [];
        if (breakLog.activities.hydration) activities.push('Hydration');
        if (breakLog.activities.mobility) activities.push('Mobility');
        if (breakLog.activities.posture) activities.push('Posture');
        const activityStr = activities.join('+');
        
        csv += `Break,"${breakLog.type}",${breakLog.duration},${activityStr},${breakLog.timestamp},\n`;
    });
    
    // Add summary statistics
    csv += '\n--- Summary Statistics ---\n';
    csv += 'Metric,Value\n';
    csv += `Total Focus Time,${state.stats.totalFocusTime} minutes\n`;
    csv += `Blocks Completed,${state.stats.blocksCompleted}\n`;
    csv += `Protocols Completed,${state.stats.protocolsCompleted}\n`;
    csv += `Protocols Skipped,${state.stats.protocolsSkipped}\n`;
    csv += `Breaks Taken,${state.stats.breaksTaken}\n`;
    csv += `Debts Created,${state.stats.debtsCreated}\n`;
    csv += `Debts Cleared,${state.stats.debtsCleared}\n`;
    csv += `Fatigue Flags,${state.stats.fatigueFlags}\n`;
    
    const compliance = state.stats.protocolsCompleted / 
        (state.stats.protocolsCompleted + state.stats.protocolsSkipped || 1);
    csv += `Compliance Rate,${Math.round(compliance * 100)}%\n`;
    
    // Create download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    const date = new Date().toISOString().split('T')[0];
    link.download = `focus-wellness-report-${date}.csv`;
    
    link.click();
    window.URL.revokeObjectURL(url);
    
    showToast('Report exported successfully! 📥', 'success');
}

// Add review-specific styles
const style = document.createElement('style');
style.textContent = `
    .review-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 24px;
    }
    
    .metric-card {
        background: var(--card-bg);
        padding: 24px;
        border-radius: var(--radius-lg);
        box-shadow: 0 2px 8px var(--shadow);
        transition: var(--transition);
    }
    
    .metric-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 6px 20px var(--shadow);
    }
    
    .metric-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 20px;
    }
    
    .metric-icon {
        width: 50px;
        height: 50px;
        border-radius: var(--radius-md);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.5rem;
        flex-shrink: 0;
    }
    
    .metric-icon.focus {
        background: linear-gradient(135deg, #2196F3 0%, #64B5F6 100%);
    }
    
    .metric-icon.compliance {
        background: linear-gradient(135deg, #4CAF50 0%, #8BC34A 100%);
    }
    
    .metric-icon.breaks {
        background: linear-gradient(135deg, #FF9800 0%, #FFB74D 100%);
    }
    
    .metric-icon.debt {
        background: linear-gradient(135deg, #9C27B0 0%, #BA68C8 100%);
    }
    
    .metric-header h3 {
        font-size: 1.1rem;
        color: var(--text-secondary);
        font-weight: 600;
    }
    
    .metric-value {
        font-size: 3rem;
        font-weight: bold;
        color: var(--primary);
        margin-bottom: 12px;
    }
    
    .metric-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-top: 12px;
        border-top: 1px solid var(--border);
    }
    
    .metric-label {
        color: var(--text-light);
        font-size: 0.9rem;
    }
    
    .metric-data {
        font-weight: 600;
        color: var(--text);
    }
    
    .chart-card {
        grid-column: span 2;
    }
    
    .block-distribution {
        display: flex;
        flex-direction: column;
        gap: 16px;
    }
    
    .distribution-item {
        display: grid;
        grid-template-columns: 120px 1fr 60px;
        gap: 16px;
        align-items: center;
    }
    
    .distribution-label {
        font-weight: 500;
        color: var(--text-secondary);
    }
    
    .distribution-bar {
        height: 24px;
        background: var(--bg);
        border-radius: var(--radius-md);
        overflow: hidden;
    }
    
    .distribution-fill {
        height: 100%;
        background: var(--gradient-blue);
        transition: width 0.6s ease;
    }
    
    .distribution-count {
        text-align: right;
        font-weight: 600;
        color: var(--primary);
    }
    
    .insights-card {
        grid-column: span 2;
    }
    
    .insights-list {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 20px;
    }
    
    .insight-item {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 16px;
        background: var(--bg);
        border-radius: var(--radius-md);
    }
    
    .insight-icon {
        font-size: 1.5rem;
        flex-shrink: 0;
    }
    
    .insight-item p {
        color: var(--text-secondary);
        line-height: 1.6;
    }
    
    .insight-item strong {
        color: var(--text);
        font-weight: 600;
    }
    
    @media (max-width: 1024px) {
        .chart-card,
        .insights-card {
            grid-column: span 1;
        }
        
        .insights-list {
            grid-template-columns: 1fr;
        }
    }
    
    @media (max-width: 768px) {
        .review-grid {
            grid-template-columns: 1fr;
        }
        
        .metric-value {
            font-size: 2.5rem;
        }
        
        .distribution-item {
            grid-template-columns: 100px 1fr 50px;
            gap: 12px;
        }
    }
`;
document.head.appendChild(style);
