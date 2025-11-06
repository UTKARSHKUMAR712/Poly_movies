// Live Cricket Matches Component with Direct Streaming
const CricketLive = {
    matches: [],
    isLoading: false,
    hls: null, // HLS.js instance for cricket streaming

    // Cricket channels for direct streaming
    cricketChannels: [
        {
            "tvg_id": "741863",
            "tvg_name": "[CR] WILLOW CRICKET UHD",
            "tvg_logo": "http://103.176.90.118/picons-dino/logos/WILLOW-CRICKET.jpeg",
            "group_title": "[CR] CRICKET",
            "channel_name": "",
            "url": "https://allinonereborn.online/lion.m3u8/live.php?id=741863"
        },
        {
            "tvg_id": "741862",
            "tvg_name": "[CR] WILLOW CRICKET HD",
            "tvg_logo": "http://103.176.90.118/picons-dino/logos/WILLOW-CRICKET.jpeg",
            "group_title": "[CR] CRICKET",
            "channel_name": "",
            "url": "https://allinonereborn.online/lion.m3u8/live.php?id=741862"
        },
        {
            "tvg_id": "741861",
            "tvg_name": "[CR] WILLOW CRICKET HD ?",
            "tvg_logo": "http://103.176.90.118/picons-dino/logos/WILLOW-CRICKET.jpeg",
            "group_title": "[CR] CRICKET",
            "channel_name": "",
            "url": "https://allinonereborn.online/lion.m3u8/live.php?id=741861"
        },
        {
            "tvg_id": "741860",
            "tvg_name": "[CR] WILLOW CRICKET EXTRA HD",
            "tvg_logo": "http://103.176.90.118/picons-dino/logos/WILLOW-CRICKET.jpeg",
            "group_title": "[CR] CRICKET",
            "channel_name": "",
            "url": "https://allinonereborn.online/lion.m3u8/live.php?id=741860"
        }
    ],

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
                        <button onclick="CricketLive.watchCricketLive()" class="watch-cricket-btn">
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
                        <button onclick="CricketLive.watchCricketLive()" class="watch-live-btn">📺 Watch Live</button>
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
                    <button onclick="CricketLive.watchCricketLive()" class="watch-btn">
                        📺 Watch Live
                    </button>
                </div>
            </div>
        `;
    },

    // Watch cricket live - direct streaming
    watchCricketLive() {
        console.log('🏏 Starting direct cricket streaming...');

        // Get the primary cricket channel (UHD)
        const primaryChannel = this.cricketChannels[0];

        // Create full-screen cricket player
        this.createCricketPlayer(primaryChannel);
    },

    // Create full-screen cricket player
    createCricketPlayer(channel) {
        // Remove existing player if any
        this.closeCricketPlayer();

        const playerHTML = `
            <div class="cricket-player-overlay" id="cricketPlayerOverlay">
                <div class="cricket-player-container">
                    <div class="cricket-player-header">
                        <div class="cricket-player-info">
                            <h3>🏏 ${channel.tvg_name}</h3>
                            <span class="live-badge">🔴 LIVE</span>
                        </div>
                        <div class="cricket-player-controls">
                            <button onclick="CricketLive.showChannelSelector()" class="channel-switch-btn" title="Switch Channel">
                                📺 Switch
                            </button>
                            <button onclick="CricketLive.closeCricketPlayer()" class="close-player-btn" title="Close">
                                ✕
                            </button>
                        </div>
                    </div>
                    <div class="cricket-video-container">
                        <video id="cricketVideo" 
                               controls 
                               autoplay
                               preload="metadata"
                               style="width: 100%; height: 100%; background: #000;">
                            Your browser does not support the video tag.
                        </video>
                    </div>
                    <div class="cricket-channel-selector" id="cricketChannelSelector" style="display: none;">
                        <h4>🏏 Cricket Channels</h4>
                        <div class="cricket-channels-list">
                            ${this.cricketChannels.map(ch => `
                                <button class="cricket-channel-btn ${ch.tvg_id === channel.tvg_id ? 'active' : ''}" 
                                        onclick="CricketLive.switchCricketChannel('${ch.tvg_id}')">
                                    <img src="${ch.tvg_logo}" alt="${ch.tvg_name}" onerror="this.style.display='none'">
                                    <span>${ch.tvg_name}</span>
                                </button>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', playerHTML);

        // Add keyboard support
        this.addKeyboardSupport();

        // Start playing the channel
        this.playCricketChannel(channel);
    },

    // Play cricket channel with HLS support
    async playCricketChannel(channel) {
        const video = document.getElementById('cricketVideo');
        if (!video) return;

        try {
            console.log('🏏 Playing cricket channel:', channel.tvg_name, channel.url);

            // Destroy existing HLS instance
            if (this.hls) {
                this.hls.destroy();
                this.hls = null;
            }

            // Check if it's an M3U8/HLS stream
            if (channel.url.includes('.m3u8') || channel.url.includes('m3u8')) {
                if (Hls.isSupported()) {
                    console.log('🏏 Using HLS.js for cricket stream');
                    this.hls = new Hls({
                        debug: false,
                        enableWorker: true,
                        lowLatencyMode: true,
                        backBufferLength: 90
                    });

                    this.hls.loadSource(channel.url);
                    this.hls.attachMedia(video);

                    this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
                        console.log('🏏 Cricket stream ready');
                        video.play().catch(e => {
                            console.error('❌ Cricket playback error:', e);
                        });
                    });

                    this.hls.on(Hls.Events.ERROR, (event, data) => {
                        console.error('❌ Cricket HLS error:', data);
                        if (data.fatal) {
                            console.log('🏏 Trying to recover cricket stream...');
                            this.hls.startLoad();
                        }
                    });

                } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                    // Safari native HLS support
                    console.log('🏏 Using native HLS support for cricket');
                    video.src = channel.url;
                    await video.play();
                } else {
                    throw new Error('HLS not supported for cricket streaming');
                }
            } else {
                // Regular video file
                console.log('🏏 Using native video player for cricket');
                video.src = channel.url;
                video.load();
                await video.play();
            }

            // Update player info
            const playerInfo = document.querySelector('.cricket-player-info h3');
            if (playerInfo) {
                playerInfo.textContent = `🏏 ${channel.tvg_name}`;
            }

            // Update active channel in selector
            document.querySelectorAll('.cricket-channel-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            const activeBtn = document.querySelector(`[onclick="CricketLive.switchCricketChannel('${channel.tvg_id}')"]`);
            if (activeBtn) {
                activeBtn.classList.add('active');
            }

        } catch (error) {
            console.error('❌ Failed to play cricket channel:', error);
            alert(`Failed to play ${channel.tvg_name}. Please try another channel.`);
        }
    },

    // Switch cricket channel
    switchCricketChannel(channelId) {
        const channel = this.cricketChannels.find(ch => ch.tvg_id === channelId);
        if (channel) {
            this.playCricketChannel(channel);
            this.hideChannelSelector();
        }
    },

    // Show channel selector
    showChannelSelector() {
        const selector = document.getElementById('cricketChannelSelector');
        if (selector) {
            selector.style.display = selector.style.display === 'none' ? 'block' : 'none';
        }
    },

    // Hide channel selector
    hideChannelSelector() {
        const selector = document.getElementById('cricketChannelSelector');
        if (selector) {
            selector.style.display = 'none';
        }
    },

    // Add keyboard support
    addKeyboardSupport() {
        this.keyboardHandler = (e) => {
            if (e.key === 'Escape') {
                this.closeCricketPlayer();
            }
        };
        document.addEventListener('keydown', this.keyboardHandler);
    },

    // Remove keyboard support
    removeKeyboardSupport() {
        if (this.keyboardHandler) {
            document.removeEventListener('keydown', this.keyboardHandler);
            this.keyboardHandler = null;
        }
    },

    // Close cricket player
    closeCricketPlayer() {
        // Stop video and cleanup HLS
        if (this.hls) {
            this.hls.destroy();
            this.hls = null;
        }

        const video = document.getElementById('cricketVideo');
        if (video) {
            video.pause();
            video.src = '';
        }

        // Remove keyboard support
        this.removeKeyboardSupport();

        // Remove player overlay
        const overlay = document.getElementById('cricketPlayerOverlay');
        if (overlay) {
            overlay.remove();
        }

        console.log('🏏 Cricket player closed');
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
                        <button onclick="CricketLive.watchCricketLive()" class="cricket-watch-live-btn">📺 Watch Live</button>
                    </div>
                </div>
                <div class="cricket-fallback">
                    <div class="cricket-fallback-card">
                        <div class="cricket-fallback-icon">🏏</div>
                        <h3>Watch Live Cricket</h3>
                        <p>Catch all the cricket action on our live TV channels with dedicated cricket streaming</p>
                        <button onclick="CricketLive.watchCricketLive()" class="cricket-watch-btn">
                            📺 Watch Cricket Live
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