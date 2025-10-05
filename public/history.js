// Watch History Module - Tracks user's viewing history using localStorage
const HistoryModule = {
    STORAGE_KEY: 'vega_watch_history',
    MAX_HISTORY_ITEMS: 50,

    // Get all history items
    getHistory() {
        try {
            const history = localStorage.getItem(this.STORAGE_KEY);
            return history ? JSON.parse(history) : [];
        } catch (error) {
            console.error('Failed to get history:', error);
            return [];
        }
    },

    // Add or update a history item
    addToHistory(item) {
        try {
            const history = this.getHistory();
            
            // Create history entry
            const historyItem = {
                id: item.link || item.id,
                title: item.title,
                image: item.image,
                provider: item.provider,
                link: item.link,
                timestamp: Date.now(),
                progress: item.progress || 0, // Video progress in seconds
                duration: item.duration || 0, // Total duration in seconds
                lastWatched: new Date().toISOString()
            };
            
            // Remove existing entry if present
            const filteredHistory = history.filter(h => h.id !== historyItem.id);
            
            // Add new entry at the beginning
            filteredHistory.unshift(historyItem);
            
            // Keep only MAX_HISTORY_ITEMS
            const trimmedHistory = filteredHistory.slice(0, this.MAX_HISTORY_ITEMS);
            
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(trimmedHistory));
            
            console.log('✅ Added to history:', historyItem.title);
            return true;
        } catch (error) {
            console.error('Failed to add to history:', error);
            return false;
        }
    },

    // Update progress for an item
    updateProgress(itemId, progress, duration) {
        try {
            const history = this.getHistory();
            const item = history.find(h => h.id === itemId);
            
            if (item) {
                item.progress = progress;
                item.duration = duration;
                item.timestamp = Date.now();
                item.lastWatched = new Date().toISOString();
                
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(history));
                return true;
            }
            return false;
        } catch (error) {
            console.error('Failed to update progress:', error);
            return false;
        }
    },

    // Remove an item from history
    removeFromHistory(itemId) {
        try {
            const history = this.getHistory();
            const filteredHistory = history.filter(h => h.id !== itemId);
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredHistory));
            return true;
        } catch (error) {
            console.error('Failed to remove from history:', error);
            return false;
        }
    },

    // Clear all history
    clearHistory() {
        try {
            localStorage.removeItem(this.STORAGE_KEY);
            return true;
        } catch (error) {
            console.error('Failed to clear history:', error);
            return false;
        }
    },

    // Get continue watching items (items with progress > 0 and < 90%)
    getContinueWatching() {
        const history = this.getHistory();
        return history.filter(item => {
            if (!item.duration || item.duration === 0) return false;
            const progressPercent = (item.progress / item.duration) * 100;
            return progressPercent > 0 && progressPercent < 90;
        });
    },

    // Render history section
    renderHistorySection() {
        const history = this.getContinueWatching();
        
        if (history.length === 0) return null;
        
        const section = document.createElement('div');
        section.className = 'netflix-section';
        section.style.marginBottom = '40px';
        
        const header = document.createElement('div');
        header.className = 'netflix-section-header';
        header.innerHTML = `
            <h3 class="netflix-section-title">Continue Watching</h3>
            <button class="netflix-view-all" onclick="HistoryModule.showAllHistory()">View All ›</button>
        `;
        section.appendChild(header);
        
        const scrollContainer = document.createElement('div');
        scrollContainer.className = 'netflix-scroll-container';
        
        const row = document.createElement('div');
        row.className = 'netflix-row';
        
        history.slice(0, 20).forEach(item => {
            const progressPercent = item.duration > 0 
                ? Math.round((item.progress / item.duration) * 100) 
                : 0;
            
            const card = document.createElement('div');
            card.className = 'netflix-card history-card';
            card.innerHTML = `
                <img src="${item.image}" alt="${item.title}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22300%22%3E%3Crect width=%22200%22 height=%22300%22 fill=%22%23333%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 fill=%22%23666%22 text-anchor=%22middle%22 dy=%22.3em%22%3ENo Image%3C/text%3E%3C/svg%3E'" />
                <div class="history-progress-bar">
                    <div class="history-progress-fill" style="width: ${progressPercent}%"></div>
                </div>
                <div class="netflix-card-overlay">
                    <h4>${item.title}</h4>
                    <p class="history-provider">${item.provider}</p>
                    <button class="history-remove" onclick="event.stopPropagation(); HistoryModule.removeAndRefresh('${item.id}')">✕</button>
                </div>
            `;
            card.addEventListener('click', () => {
                if (window.loadDetails) {
                    loadDetails(item.provider, item.link);
                }
            });
            row.appendChild(card);
        });
        
        scrollContainer.appendChild(row);
        section.appendChild(scrollContainer);
        
        return section;
    },

    // Remove item and refresh display
    removeAndRefresh(itemId) {
        if (confirm('Remove this item from your history?')) {
            this.removeFromHistory(itemId);
            // Reload the page to refresh
            if (window.loadHomePage) {
                loadHomePage();
            }
        }
    },

    // Show all history in a modal or separate view
    showAllHistory() {
        const history = this.getHistory();
        
        if (history.length === 0) {
            alert('No watch history yet!');
            return;
        }
        
        // Create modal
        const modal = document.createElement('div');
        modal.className = 'history-modal';
        modal.innerHTML = `
            <div class="history-modal-content">
                <div class="history-modal-header">
                    <h2>Watch History</h2>
                    <div>
                        <button onclick="HistoryModule.clearAllHistory()" class="history-clear-btn">Clear All</button>
                        <button onclick="HistoryModule.closeModal()" class="history-close-btn">✕</button>
                    </div>
                </div>
                <div class="history-modal-body">
                    ${history.map(item => {
                        const progressPercent = item.duration > 0 
                            ? Math.round((item.progress / item.duration) * 100) 
                            : 0;
                        const date = new Date(item.lastWatched).toLocaleDateString();
                        
                        return `
                            <div class="history-item" onclick="HistoryModule.closeModal(); loadDetails('${item.provider}', '${item.link}')">
                                <img src="${item.image}" alt="${item.title}" />
                                <div class="history-item-info">
                                    <h4>${item.title}</h4>
                                    <p class="history-item-provider">${item.provider}</p>
                                    <p class="history-item-date">Last watched: ${date}</p>
                                    ${progressPercent > 0 ? `
                                        <div class="history-item-progress">
                                            <div class="history-item-progress-bar">
                                                <div class="history-item-progress-fill" style="width: ${progressPercent}%"></div>
                                            </div>
                                            <span>${progressPercent}% watched</span>
                                        </div>
                                    ` : ''}
                                </div>
                                <button class="history-item-remove" onclick="event.stopPropagation(); HistoryModule.removeFromHistory('${item.id}'); HistoryModule.showAllHistory()">Remove</button>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    },

    closeModal() {
        const modal = document.querySelector('.history-modal');
        if (modal) {
            modal.remove();
        }
    },

    clearAllHistory() {
        if (confirm('Are you sure you want to clear all watch history?')) {
            this.clearHistory();
            this.closeModal();
            if (window.loadHomePage) {
                loadHomePage();
            }
        }
    }
};

// Load History Page
function loadHistoryPage() {
    console.log('📜 Loading History page...');
    
    if (window.showView) {
        showView('history');
    }
    
    if (window.updateNavLinks) {
        updateNavLinks('history');
    }
    
    const container = document.getElementById('historyContent');
    if (!container) return;
    
    const history = HistoryModule.getHistory();
    
    container.innerHTML = `
        <div class="content-header">
            <h1>📜 Watch History</h1>
            <p class="content-subtitle">Your viewing history and progress</p>
            ${history.length > 0 ? `
                <button onclick="HistoryModule.clearAllHistory()" class="history-clear-btn" style="margin-top: 20px;">Clear All History</button>
            ` : ''}
        </div>
        <div id="historyGrid" class="history-full-grid"></div>
    `;
    
    const grid = document.getElementById('historyGrid');
    
    if (history.length === 0) {
        grid.innerHTML = `
            <div style="text-align: center; padding: 60px 20px;">
                <h2 style="color: var(--text-muted); font-size: 24px; margin-bottom: 10px;">No Watch History</h2>
                <p style="color: var(--text-muted);">Start watching content to build your history</p>
            </div>
        `;
        return;
    }
    
    history.forEach(item => {
        const progressPercent = item.duration > 0 
            ? Math.round((item.progress / item.duration) * 100) 
            : 0;
        const date = new Date(item.lastWatched).toLocaleDateString();
        const time = new Date(item.lastWatched).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const card = document.createElement('div');
        card.className = 'history-full-card';
        card.innerHTML = `
            <img src="${item.image}" alt="${item.title}" />
            <div class="history-full-card-info">
                <h4>${item.title}</h4>
                <p class="history-full-provider">📦 ${item.provider}</p>
                <p class="history-full-date">Last watched: ${date} at ${time}</p>
                ${progressPercent > 0 ? `
                    <div class="history-full-progress">
                        <div class="history-full-progress-bar">
                            <div class="history-full-progress-fill" style="width: ${progressPercent}%"></div>
                        </div>
                        <span>${progressPercent}% watched</span>
                    </div>
                ` : ''}
                <div class="history-full-actions">
                    <button onclick="loadDetails('${item.provider}', '${item.link}')" class="history-full-play-btn">▶ Continue</button>
                    <button onclick="HistoryModule.removeFromHistory('${item.id}'); loadHistoryPage();" class="history-full-remove-btn">Remove</button>
                </div>
            </div>
        `;
        
        grid.appendChild(card);
    });
}

// Make functions globally accessible
window.HistoryModule = HistoryModule;
window.loadHistoryPage = loadHistoryPage;
