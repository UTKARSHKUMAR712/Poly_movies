// Enhanced Watch History Module - Tracks user's viewing history with episode tracking, quality preferences, and Dolby Atmos detection
const HistoryModule = {
    STORAGE_KEY: 'vega_watch_history',
    EPISODE_STORAGE_KEY: 'vega_episode_history',
    QUALITY_STORAGE_KEY: 'vega_quality_preferences',
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

    // Get episode history for a specific series
    getEpisodeHistory(seriesId) {
        try {
            const episodeHistory = localStorage.getItem(this.EPISODE_STORAGE_KEY);
            const allEpisodes = episodeHistory ? JSON.parse(episodeHistory) : {};
            return allEpisodes[seriesId] || {};
        } catch (error) {
            console.error('Failed to get episode history:', error);
            return {};
        }
    },

    // Get all episode history
    getAllEpisodeHistory() {
        try {
            const episodeHistory = localStorage.getItem(this.EPISODE_STORAGE_KEY);
            return episodeHistory ? JSON.parse(episodeHistory) : {};
        } catch (error) {
            console.error('Failed to get all episode history:', error);
            return {};
        }
    },

    // Get quality preference for a provider
    getQualityPreference(provider) {
        try {
            const qualityPrefs = localStorage.getItem(this.QUALITY_STORAGE_KEY);
            const prefs = qualityPrefs ? JSON.parse(qualityPrefs) : {};
            return prefs[provider] || null;
        } catch (error) {
            console.error('Failed to get quality preference:', error);
            return null;
        }
    },

    // Set quality preference for a provider
    setQualityPreference(provider, quality) {
        try {
            const qualityPrefs = localStorage.getItem(this.QUALITY_STORAGE_KEY);
            const prefs = qualityPrefs ? JSON.parse(qualityPrefs) : {};
            prefs[provider] = quality;
            localStorage.setItem(this.QUALITY_STORAGE_KEY, JSON.stringify(prefs));
            console.log(`✅ Quality preference set for ${provider}: ${quality}`);
            return true;
        } catch (error) {
            console.error('Failed to set quality preference:', error);
            return false;
        }
    },

    // Detect Dolby Atmos from stream info
    detectDolbyAtmos(stream) {
        if (!stream) return false;
        
        const searchText = `${stream.server || ''} ${stream.title || ''} ${stream.quality || ''}`.toLowerCase();
        const dolbyIndicators = [
            'dolby atmos', 'atmos', 'dolby', 'dts-x', 'dts:x', 
            'truehd atmos', 'dd+ atmos', 'eac3 atmos', '7.1 atmos',
            'object-based audio', 'immersive audio'
        ];
        
        return dolbyIndicators.some(indicator => searchText.includes(indicator));
    },

    // Add or update a history item with enhanced tracking
    addToHistory(item) {
        try {
            const history = this.getHistory();
            
            // Create enhanced history entry
            const historyItem = {
                id: item.link || item.id,
                title: item.title,
                image: item.image,
                provider: item.provider,
                link: item.link,
                timestamp: Date.now(),
                progress: item.progress || 0,
                duration: item.duration || 0,
                lastWatched: new Date().toISOString(),
                // Enhanced fields
                type: item.type || 'movie', // 'movie' or 'tv'
                episodeTitle: item.episodeTitle || null,
                episodeNumber: item.episodeNumber || null,
                seasonNumber: item.seasonNumber || null,
                quality: item.quality || null,
                hasDolbyAtmos: item.hasDolbyAtmos || false,
                streamServer: item.streamServer || null
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

    // Track episode viewing for series
    trackEpisodeViewing(seriesId, episodeId, episodeData) {
        try {
            const allEpisodeHistory = this.getAllEpisodeHistory();
            
            if (!allEpisodeHistory[seriesId]) {
                allEpisodeHistory[seriesId] = {};
            }
            
            allEpisodeHistory[seriesId][episodeId] = {
                ...episodeData,
                watchedAt: new Date().toISOString(),
                progress: episodeData.progress || 0,
                duration: episodeData.duration || 0,
                completed: episodeData.completed || false
            };
            
            localStorage.setItem(this.EPISODE_STORAGE_KEY, JSON.stringify(allEpisodeHistory));
            console.log(`✅ Episode tracked: ${episodeData.title}`);
            return true;
        } catch (error) {
            console.error('Failed to track episode:', error);
            return false;
        }
    },

    // Check if episode is watched
    isEpisodeWatched(seriesId, episodeId) {
        const episodeHistory = this.getEpisodeHistory(seriesId);
        const episode = episodeHistory[episodeId];
        if (!episode) return false;
        
        // Simply check if episode was clicked/started
        return episode.completed || episode.watchedAt;
    },

    // Mark episode as watched when clicked
    markEpisodeWatched(seriesId, episodeId, episodeData) {
        try {
            const allEpisodeHistory = this.getAllEpisodeHistory();
            
            if (!allEpisodeHistory[seriesId]) {
                allEpisodeHistory[seriesId] = {};
            }
            
            allEpisodeHistory[seriesId][episodeId] = {
                ...episodeData,
                watchedAt: new Date().toISOString(),
                completed: true
            };
            
            localStorage.setItem(this.EPISODE_STORAGE_KEY, JSON.stringify(allEpisodeHistory));
            console.log(`✅ Episode marked as watched: ${episodeData.title}`);
            return true;
        } catch (error) {
            console.error('Failed to mark episode as watched:', error);
            return false;
        }
    },

    // Get last watched episode for a series
    getLastWatchedEpisode(seriesId) {
        const episodeHistory = this.getEpisodeHistory(seriesId);
        const episodes = Object.values(episodeHistory);
        
        if (episodes.length === 0) return null;
        
        // Sort by watch time and return the most recent
        episodes.sort((a, b) => new Date(b.watchedAt) - new Date(a.watchedAt));
        return episodes[0];
    },

    // Update progress for an item with enhanced tracking
    updateProgress(itemId, progress, duration, additionalData = {}) {
        try {
            const history = this.getHistory();
            const item = history.find(h => h.id === itemId);
            
            if (item) {
                item.progress = progress;
                item.duration = duration;
                item.timestamp = Date.now();
                item.lastWatched = new Date().toISOString();
                
                // Update enhanced fields if provided
                if (additionalData.episodeNumber) item.episodeNumber = additionalData.episodeNumber;
                if (additionalData.seasonNumber) item.seasonNumber = additionalData.seasonNumber;
                if (additionalData.episodeTitle) item.episodeTitle = additionalData.episodeTitle;
                if (additionalData.quality) item.quality = additionalData.quality;
                if (additionalData.hasDolbyAtmos !== undefined) item.hasDolbyAtmos = additionalData.hasDolbyAtmos;
                if (additionalData.streamServer) item.streamServer = additionalData.streamServer;
                
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(history));
                
                // Also track episode if it's a TV show
                if (item.type === 'tv' && additionalData.episodeId) {
                    this.trackEpisodeViewing(itemId, additionalData.episodeId, {
                        title: additionalData.episodeTitle || `Episode ${additionalData.episodeNumber}`,
                        episodeNumber: additionalData.episodeNumber,
                        seasonNumber: additionalData.seasonNumber,
                        progress: progress,
                        duration: duration,
                        completed: (progress / duration) > 0.8
                    });
                }
                
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

    // Render enhanced history section with episode info
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
            
            // Build episode info string
            let episodeInfo = '';
            if (item.type === 'tv' && item.episodeNumber) {
                episodeInfo = `S${item.seasonNumber || 1}E${item.episodeNumber}`;
                if (item.episodeTitle) {
                    episodeInfo += `: ${item.episodeTitle}`;
                }
            }
            
            // Build quality and audio info
            let qualityInfo = '';
            if (item.quality) {
                qualityInfo += `${item.quality}`;
            }
            if (item.hasDolbyAtmos) {
                qualityInfo += qualityInfo ? ' • 🔊 Dolby Atmos' : '🔊 Dolby Atmos';
            }
            
            const card = document.createElement('div');
            card.className = 'netflix-card history-card enhanced-history-card';
            card.innerHTML = `
                <img src="${item.image}" alt="${item.title}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22300%22%3E%3Crect width=%22200%22 height=%22300%22 fill=%22%23333%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 fill=%22%23666%22 text-anchor=%22middle%22 dy=%22.3em%22%3ENo Image%3C/text%3E%3C/svg%3E'" />
                <div class="history-progress-bar">
                    <div class="history-progress-fill" style="width: ${progressPercent}%"></div>
                </div>
                ${item.hasDolbyAtmos ? '<div class="dolby-atmos-badge">🔊 ATMOS</div>' : ''}
                <div class="netflix-card-overlay">
                    <h4>${item.title}</h4>
                    ${episodeInfo ? `<p class="episode-info">${episodeInfo}</p>` : ''}
                    <p class="history-provider">${item.provider}</p>
                    ${qualityInfo ? `<p class="quality-info">${qualityInfo}</p>` : ''}
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
    },

    // Render episode markers for series details page
    renderEpisodeMarkers(seriesId, episodes) {
        if (!episodes || !Array.isArray(episodes)) return episodes;
        
        const episodeHistory = this.getEpisodeHistory(seriesId);
        
        return episodes.map(episode => {
            const episodeId = episode.link || episode.id || `${episode.title}-${episode.episodeNumber || ''}`;
            const isWatched = this.isEpisodeWatched(seriesId, episodeId);
            
            return {
                ...episode,
                isWatched: isWatched,
                watchedClass: isWatched ? 'episode-watched' : '',
                watchedIcon: isWatched ? '✓' : ''
            };
        });
    },

    // Get recommended quality for a provider based on user preference
    getRecommendedQuality(provider, availableQualities) {
        const preference = this.getQualityPreference(provider);
        if (!preference || !availableQualities) return null;
        
        // Try to find exact match first
        const exactMatch = availableQualities.find(q => 
            q.quality && q.quality.toLowerCase().includes(preference.toLowerCase())
        );
        if (exactMatch) return exactMatch;
        
        // Try to find closest match
        const qualityNumbers = {
            '4k': 2160, '2160p': 2160, '2160': 2160,
            '1080p': 1080, '1080': 1080,
            '720p': 720, '720': 720,
            '480p': 480, '480': 480,
            '360p': 360, '360': 360,
            '240p': 240, '240': 240
        };
        
        const preferredNumber = qualityNumbers[preference.toLowerCase()] || 1080;
        
        // Find closest quality
        let closest = availableQualities[0];
        let closestDiff = Infinity;
        
        availableQualities.forEach(q => {
            if (!q.quality) return;
            const qNumber = qualityNumbers[q.quality.toLowerCase()] || 720;
            const diff = Math.abs(qNumber - preferredNumber);
            if (diff < closestDiff) {
                closest = q;
                closestDiff = diff;
            }
        });
        
        return closest;
    },

    // Enhanced player info for current playback
    getCurrentPlaybackInfo() {
        const history = this.getHistory();
        if (history.length === 0) return null;
        
        const current = history[0]; // Most recent item
        return {
            title: current.title,
            episodeInfo: current.type === 'tv' && current.episodeNumber 
                ? `S${current.seasonNumber || 1}E${current.episodeNumber}${current.episodeTitle ? ': ' + current.episodeTitle : ''}`
                : null,
            quality: current.quality,
            hasDolbyAtmos: current.hasDolbyAtmos,
            provider: current.provider
        };
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
