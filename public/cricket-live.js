// Live Cricket Matches Component
const CricketLive = {
    matches: [],
    isLoading: false,

    // Country code mapping for flags
    countryCodes: {
        "India": "in",
        "Australia": "au",
        "England": "gb",
        "Pakistan": "pk",
        "South Africa": "za",
        "New Zealand": "nz",
        "Sri Lanka": "lk",
        "Bangladesh": "bd",
        "West Indies": "jm",
        "Afghanistan": "af",
        "Ireland": "ie",
        "Scotland": "gb-sct",
        "Netherlands": "nl",
        "Zimbabwe": "zw",
        "Nepal": "np",
        "UAE": "ae",
        "Oman": "om",
        "USA": "us",
        "Canada": "ca"
    },

    // Initialize cricket section
    init() {
        console.log('🏏 Initializing Cricket Live section');

        // Show initial fallback while loading
        this.showFallback();

        // Test API first
        this.testAPI().then(() => {
            this.fetchMatches();

            // Auto-refresh every 2 minutes
            setInterval(() => {
                this.fetchMatches();
            }, 120000);
        }).catch(() => {
            console.log('🏏 Cricket API not available, showing fallback');
            this.showFallback();
        });
    },

    // Test if cricket API is available
    async testAPI() {
        try {
            const response = await fetch('/api/cricket/test');
            if (!response.ok) {
                throw new Error(`API test failed: ${response.status}`);
            }
            const data = await response.json();
            console.log('🏏 Cricket API test successful:', data);
            return true;
        } catch (error) {
            console.error('🏏 Cricket API test failed:', error);
            throw error;
        }
    },

    // Get flag URL from team name
    getFlagUrl(teamName) {
        if (!teamName) return '';

        let code = this.countryCodes[teamName];
        if (!code && teamName) {
            // Try first word of team name
            const firstWord = teamName.split(" ")[0];
            code = this.countryCodes[firstWord];
        }

        return code ? `https://flagcdn.com/24x18/${code}.png` : '';
    },

    // Fetch matches from our cricket API
    async fetchMatches() {
        if (this.isLoading) return;

        try {
            this.isLoading = true;
            console.log('🏏 Fetching cricket matches from:', window.location.origin + '/api/cricket/matches');

            const response = await fetch('/api/cricket/matches');

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.error) {
                throw new Error(data.details || 'Failed to fetch cricket data');
            }

            this.matches = data.matches || [];
            console.log(`🏏 Loaded ${this.matches.length} cricket matches`);

            // Debug: Log first match details
            if (this.matches.length > 0) {
                const firstMatch = this.matches[0];
                console.log('🏏 First match details:', {
                    status: firstMatch.match?.matchInfo?.status,
                    state: firstMatch.match?.matchInfo?.state,
                    teams: `${firstMatch.match?.matchInfo?.team1?.teamName} vs ${firstMatch.match?.matchInfo?.team2?.teamName}`
                });
            }

            this.renderMatches();

        } catch (error) {
            console.error('🏏 Error fetching cricket matches:', error);
            console.error('🏏 Full error details:', error);

            // Show fallback instead of error for better UX
            this.showFallback();
        } finally {
            this.isLoading = false;
        }
    },

    // Render cricket matches section
    renderMatches() {
        const container = document.getElementById('cricketLiveSection');
        if (!container) {
            console.error('🏏 Cricket container not found! Looking for #cricketLiveSection');
            return;
        }

        console.log('🏏 Rendering matches, container found:', container);

        if (this.matches.length === 0) {
            container.innerHTML = `
                <div class="cricket-section">
                    <div class="section-header">
                        <h2>🏏 Live Cricket</h2>
                        <button onclick="CricketLive.fetchMatches()" class="refresh-btn">🔄</button>
                    </div>
                    <div class="no-matches">
                        <p>No live matches at the moment</p>
                        <button onclick="loadLiveTVPage()" class="watch-cricket-btn">
                            📺 Watch Cricket Channels
                        </button>
                    </div>
                </div>
            `;
            return;
        }

        // Filter for live and upcoming matches (more inclusive)
        const liveMatches = this.matches.filter(match => {
            const status = match.match?.matchInfo?.status?.toLowerCase() || '';
            const state = match.match?.matchInfo?.state?.toLowerCase() || '';

            // Include live matches, upcoming matches, and matches starting soon
            return status.includes('live') || status.includes('innings') ||
                status.includes('batting') || status.includes('bowling') ||
                status.includes('upcoming') || status.includes('toss') ||
                status.includes('match starts') || status.includes('preview') ||
                state.includes('live') || state.includes('preview') ||
                state.includes('innings') || state.includes('complete');
        }).slice(0, 6); // Show max 6 matches

        console.log(`🏏 Filtered ${liveMatches.length} matches from ${this.matches.length} total matches`);

        container.innerHTML = `
            <div class="cricket-section">
                <div class="section-header">
                    <h2>🏏 Live Cricket</h2>
                    <div class="header-actions">
                        <button onclick="CricketLive.fetchMatches()" class="refresh-btn" title="Refresh">🔄</button>
                        <button onclick="loadLiveTVPage()" class="watch-live-btn">📺 Watch Live</button>
                    </div>
                </div>
                <div class="cricket-matches-horizontal">
                    <div class="cricket-matches-scroll">
                        ${liveMatches.map(match => this.createMatchCard(match)).join('')}
                    </div>
                </div>
            </div>
        `;
    },

    // Create individual match card
    createMatchCard(matchObj) {
        const match = matchObj.match;
        const info = match.matchInfo;
        const score = match.matchScore || {};

        const team1Flag = this.getFlagUrl(info.team1?.teamName);
        const team2Flag = this.getFlagUrl(info.team2?.teamName);

        const isLive = info.status?.toLowerCase().includes('live') ||
            info.status?.toLowerCase().includes('innings') ||
            info.status?.toLowerCase().includes('batting') ||
            info.state?.toLowerCase().includes('live');

        return `
            <div class="match-card ${isLive ? 'live' : ''}">
                ${isLive ? '<div class="live-indicator">🔴 LIVE</div>' : ''}
                
                <div class="match-header">
                    <div class="series-name">${info.seriesName || 'Cricket Match'}</div>
                    <div class="match-format">${info.matchFormat || ''}</div>
                </div>
                
                <div class="teams-container">
                    <div class="team">
                        ${team1Flag ? `<img class="flag" src="${team1Flag}" alt="${info.team1?.teamName}" onerror="this.style.display='none'">` : ''}
                        <span class="team-name">${info.team1?.teamSName || info.team1?.teamName || 'Team 1'}</span>
                        ${score.team1Score ? `<span class="score">${score.team1Score.inngs1?.runs || 0}/${score.team1Score.inngs1?.wickets || 0}</span>` : ''}
                    </div>
                    
                    <div class="vs-divider">VS</div>
                    
                    <div class="team">
                        ${team2Flag ? `<img class="flag" src="${team2Flag}" alt="${info.team2?.teamName}" onerror="this.style.display='none'">` : ''}
                        <span class="team-name">${info.team2?.teamSName || info.team2?.teamName || 'Team 2'}</span>
                        ${score.team2Score ? `<span class="score">${score.team2Score.inngs1?.runs || 0}/${score.team2Score.inngs1?.wickets || 0}</span>` : ''}
                    </div>
                </div>
                
                <div class="match-info">
                    <div class="venue">${info.venueInfo?.ground || ''}, ${info.venueInfo?.city || ''}</div>
                    <div class="status">${info.status || info.shortStatus || 'Scheduled'}</div>
                </div>
                
                <div class="match-actions">
                    <button onclick="loadLiveTVPage()" class="watch-btn">
                        📺 Watch Live
                    </button>
                </div>
            </div>
        `;
    },

    // Render error state
    renderError(errorMessage) {
        const container = document.getElementById('cricketLiveSection');
        if (!container) return;

        container.innerHTML = `
            <div class="cricket-section">
                <div class="section-header">
                    <h2>🏏 Live Cricket</h2>
                    <button onclick="CricketLive.fetchMatches()" class="refresh-btn">🔄</button>
                </div>
                <div class="error-state">
                    <p>Cricket data temporarily unavailable</p>
                    <small>Server may be starting up or experiencing issues</small>
                    <div class="fallback-actions">
                        <button onclick="loadLiveTVPage()" class="watch-cricket-btn">
                            📺 Watch Cricket Channels
                        </button>
                        <button onclick="CricketLive.fetchMatches()" class="retry-btn">
                            🔄 Try Again
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    // Show minimal cricket section when data is not available
    showFallback() {
        const container = document.getElementById('cricketLiveSection');
        if (!container) return;

        container.innerHTML = `
            <div class="cricket-section">
                <div class="section-header">
                    <h2>🏏 Live Cricket</h2>
                    <div class="cricket-header-actions">
                        <button onclick="CricketLive.fetchMatches()" class="cricket-refresh-btn" title="Refresh">🔄</button>
                        <button onclick="loadLiveTVPage()" class="cricket-watch-live-btn">📺 Watch Live</button>
                    </div>
                </div>
                <div class="cricket-fallback">
                    <div class="cricket-fallback-card">
                        <div class="cricket-fallback-icon">🏏</div>
                        <h3>Watch Live Cricket</h3>
                        <p>Catch all the cricket action on our live TV channels with dedicated cricket streaming</p>
                        <button onclick="loadLiveTVPage()" class="cricket-watch-btn">
                            📺 Go to Live TV
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🏏 DOM loaded, initializing cricket section...');

    // Small delay to ensure other components are loaded
    setTimeout(() => {
        const container = document.getElementById('cricketLiveSection');
        if (container) {
            console.log('🏏 Cricket container found, initializing...');
            CricketLive.init();
        } else {
            console.error('🏏 Cricket container not found during initialization!');
        }
    }, 1000);
});

// Make globally accessible
window.CricketLive = CricketLive;