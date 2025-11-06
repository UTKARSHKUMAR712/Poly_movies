// Clean TV Module - Handles TV channels and playlists
const TVModule = {
    channels: [],
    categories: {},
    currentChannel: null,
    playlists: ['opplex.m3u', 'inlg.m3u'],
    currentPlaylist: 'opplex.m3u', // Start with opplex.m3u

    // Initialize TV module
    async init() {
        console.log('📺 Initializing TV Module...');
        try {
            // Load channels from selected playlist
            await this.loadPlaylist(this.currentPlaylist);
            this.categorizeChannels();

            console.log(`✅ TV Module initialized with ${this.channels.length} channels`);
            this.showToast(`📺 TV ready with ${this.channels.length} channels`, 'success');

        } catch (error) {
            console.error('❌ Failed to initialize TV:', error);
            this.showToast('❌ Failed to load TV channels', 'error');
            this.channels = [];
            this.categories = {};
        }
    },

    // Load M3U playlist
    async loadPlaylist(playlistName = 'opplex.m3u') {
        try {
            console.log(`📺 Loading playlist: ${playlistName}`);

            const response = await fetch(`/Tv/${playlistName}`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const playlistText = await response.text();
            if (!playlistText || !playlistText.includes('#EXTM3U')) {
                throw new Error('Invalid M3U playlist format');
            }

            this.channels = this.parseM3U(playlistText);
            this.currentPlaylist = playlistName;

            console.log(`📺 Loaded ${this.channels.length} channels from ${playlistName}`);

        } catch (error) {
            console.error('❌ Failed to load playlist:', error);
            throw error;
        }
    },

    // Parse M3U playlist
    parseM3U(playlistText) {
        const lines = playlistText.split('\n');
        const channels = [];
        let currentChannel = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            if (line.startsWith('#EXTINF:')) {
                currentChannel = this.parseExtinf(line);
            } else if (line && !line.startsWith('#') && currentChannel) {
                currentChannel.url = line;
                currentChannel.id = `channel_${channels.length + 1}`;

                // Only add valid channels
                if (currentChannel.name && currentChannel.url.includes('http')) {
                    channels.push(currentChannel);
                }
                currentChannel = null;
            }
        }

        return channels;
    },

    // Parse EXTINF line
    parseExtinf(line) {
        const channel = {
            name: '',
            logo: '',
            group: 'General',
            url: ''
        };

        // Extract channel name
        const nameMatch = line.match(/,([^,]+)$/);
        if (nameMatch) {
            channel.name = nameMatch[1].trim();
        }

        // Extract logo
        const logoMatch = line.match(/tvg-logo="([^"]+)"/);
        if (logoMatch) {
            channel.logo = logoMatch[1];
        }

        // Extract group
        const groupMatch = line.match(/group-title="([^"]+)"/);
        if (groupMatch && groupMatch[1] !== '-') {
            channel.group = groupMatch[1].trim() || 'General';
        } else {
            channel.group = this.categorizeByName(channel.name);
        }

        return channel;
    },

    // Auto-categorize by name
    categorizeByName(channelName) {
        const name = channelName.toLowerCase();

        if (name.includes('sports') || name.includes('ten') || name.includes('star sports')) {
            return 'Sports';
        }
        if (name.includes('movies') || name.includes('cinema') || name.includes('max') || name.includes('pix')) {
            return 'Movies';
        }
        if (name.includes('kids') || name.includes('cartoon') || name.includes('nick') || name.includes('disney') || name.includes('pogo')) {
            return 'Kids';
        }
        if (name.includes('news') || name.includes('bbc')) {
            return 'News';
        }
        if (name.includes('music') || name.includes('mtv')) {
            return 'Music';
        }

        return 'Entertainment';
    },

    // Categorize channels
    categorizeChannels() {
        this.categories = {};

        for (const channel of this.channels) {
            const category = channel.group || 'General';
            if (!this.categories[category]) {
                this.categories[category] = [];
            }
            this.categories[category].push(channel);
        }

        console.log(`📂 Created ${Object.keys(this.categories).length} categories`);
    },

    // Render TV page
    renderTVPage() {
        console.log('🎨 Rendering TV page...');

        const container = document.getElementById('tvContent');
        if (!container) {
            console.error('❌ tvContent container not found');
            return;
        }

        const channelCount = this.channels.length;
        const categoryCount = Object.keys(this.categories).length;

        container.innerHTML = `
            <div class="tv-container">
                <!-- Top Controls -->
                <div class="tv-header">
                    <div class="tv-controls">
                        <div class="search-container">
                            <input type="text" id="channelSearch" placeholder="🔍 Search channels..." 
                                   oninput="TVModule.searchChannels(this.value)">
                        </div>
                        <div class="tv-actions">
                            <select id="playlistSelect" onchange="TVModule.switchPlaylist(this.value)">
                                <option value="opplex.m3u" ${this.currentPlaylist === 'opplex.m3u' ? 'selected' : ''}>Opplex Playlist</option>
                                <option value="inlg.m3u" ${this.currentPlaylist === 'inlg.m3u' ? 'selected' : ''}>INLG Playlist</option>
                            </select>
                            <button onclick="TVModule.refreshChannels()" title="Refresh">
                                <i class="fas fa-sync-alt"></i> Refresh
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Horizontal Categories -->
                <div class="categories-horizontal">
                    <div class="categories-scroll" id="categoriesScroll">
                        <!-- Categories will be populated here -->
                    </div>
                </div>

                <!-- Main Content Area -->
                <div class="tv-main-layout">
                    <!-- Left Side - Channels List -->
                    <div class="channels-sidebar">
                        <div class="channels-list" id="channelsList">
                            <!-- Channels will be populated here -->
                        </div>
                    </div>

                    <!-- Right Side - Video Player -->
                    <div class="player-area">
                        <div class="video-container" style="position: relative;">
                            <video id="tvVideoPlayer" 
                                   class="video-js vjs-default-skin"
                                   controls 
                                   preload="metadata"
                                   data-setup='{}'>
                                <p class="vjs-no-js">
                                    To view this video please enable JavaScript, and consider upgrading to a 
                                    <a href="https://videojs.com/html5-video-support/" target="_blank">web browser that supports HTML5 video</a>.
                                </p>
                            </video>
                            <div id="playOverlay" class="play-overlay" style="display: none;">
                                <button class="big-play-btn" onclick="TVPlayer.forcePlay()">
                                    <i class="fas fa-play"></i>
                                </button>
                            </div>
                        </div>
                        <div class="channel-info" id="currentChannelInfo">
                            <div class="placeholder-text">
                                <i class="fas fa-tv fa-3x"></i>
                                <h3>Select a channel to start watching</h3>
                                <p>Choose from ${channelCount} available channels</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.renderCategories();
        this.renderChannelsList(this.channels);
    },

    // Render categories horizontally
    renderCategories() {
        const categoriesScroll = document.getElementById('categoriesScroll');
        if (!categoriesScroll) return;

        categoriesScroll.innerHTML = '';

        // All Channels option
        const allOption = document.createElement('div');
        allOption.className = 'category-chip active';
        allOption.innerHTML = `
            <i class="fas fa-tv"></i>
            <span>ALL (${this.channels.length})</span>
        `;
        allOption.onclick = () => this.selectCategory('all', allOption);
        categoriesScroll.appendChild(allOption);

        // Category items
        Object.keys(this.categories)
            .sort((a, b) => this.categories[b].length - this.categories[a].length)
            .forEach(category => {
                const categoryChip = document.createElement('div');
                categoryChip.className = 'category-chip';
                categoryChip.innerHTML = `
                    ${this.getCategoryIcon(category)}
                    <span>${category} (${this.categories[category].length})</span>
                `;
                categoryChip.onclick = () => this.selectCategory(category, categoryChip);
                categoriesScroll.appendChild(categoryChip);
            });
    },

    // Get category icon
    getCategoryIcon(category) {
        const icons = {
            'Sports': '<i class="fas fa-trophy"></i>',
            'Movies': '<i class="fas fa-film"></i>',
            'Kids': '<i class="fas fa-child"></i>',
            'News': '<i class="fas fa-newspaper"></i>',
            'Music': '<i class="fas fa-music"></i>',
            'Entertainment': '<i class="fas fa-star"></i>'
        };
        return icons[category] || '<i class="fas fa-tv"></i>';
    },

    // Select category
    selectCategory(category, element) {
        // Update active category
        document.querySelectorAll('.category-chip').forEach(item => {
            item.classList.remove('active');
        });
        element.classList.add('active');

        if (category === 'all') {
            this.renderChannelsList(this.channels);
        } else {
            const categoryChannels = this.categories[category] || [];
            this.renderChannelsList(categoryChannels);
        }
    },

    // Render all channels
    renderAllChannels() {
        this.renderChannelsList(this.channels);
    },

    // Render channels list for sidebar
    renderChannelsList(channels) {
        const channelsList = document.getElementById('channelsList');
        if (!channelsList) return;

        channelsList.innerHTML = '';

        if (channels.length === 0) {
            channelsList.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-tv fa-2x"></i>
                    <p>No channels available</p>
                </div>
            `;
            return;
        }

        channels.forEach(channel => {
            const channelItem = this.createChannelListItem(channel);
            channelsList.appendChild(channelItem);
        });
    },

    // Create channel list item for sidebar
    createChannelListItem(channel) {
        const item = document.createElement('div');
        item.className = 'channel-item';
        item.setAttribute('data-channel-id', channel.id);

        const logoPlaceholder = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22%3E%3Crect width=%2240%22 height=%2240%22 fill=%22%23333%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 fill=%22%23666%22 text-anchor=%22middle%22 dy=%22.3em%22 font-size=%2212%22%3E📺%3C/text%3E%3C/svg%3E';

        item.innerHTML = `
            <div class="channel-number">${channel.id.replace('channel_', '')}</div>
            <div class="channel-logo">
                <img src="${channel.logo || logoPlaceholder}" 
                     alt="${channel.name}" 
                     onerror="this.src='${logoPlaceholder}'" />
            </div>
            <div class="channel-details">
                <div class="channel-name">${channel.name}</div>
                <div class="channel-category">${channel.group}</div>
            </div>
            <div class="channel-actions">
                <button class="play-btn" onclick="TVModule.playChannel('${channel.id}')" title="Play">
                    <i class="fas fa-play"></i>
                </button>
                <button class="copy-btn" onclick="TVModule.copyStreamUrl('${channel.url}')" title="Copy URL">
                    <i class="fas fa-copy"></i>
                </button>
            </div>
        `;

        // Add click handler for the entire item
        item.onclick = (e) => {
            if (!e.target.closest('button')) {
                this.playChannel(channel.id);
            }
        };

        return item;
    },

    // Play channel
    async playChannel(channelId) {
        const channel = this.channels.find(ch => ch.id === channelId);
        if (!channel) {
            console.error('❌ Channel not found:', channelId);
            return;
        }

        console.log('📺 Playing channel:', channel.name);
        this.currentChannel = channel;

        // Update current channel info
        const channelInfo = document.getElementById('currentChannelInfo');
        if (channelInfo) {
            channelInfo.innerHTML = `
                <div class="live-indicator">🔴 LIVE</div>
                <div class="channel-name">${channel.name}</div>
                <div class="channel-category">${channel.group}</div>
            `;
        }

        // Play stream directly
        TVPlayer.play(channel.url, channel.name);

        this.showToast(`📺 Now playing: ${channel.name}`, 'success');

        // Highlight selected channel
        document.querySelectorAll('.channel-item').forEach(item => {
            item.classList.remove('active');
        });
        const channelElement = document.querySelector(`[data-channel-id="${channelId}"]`);
        if (channelElement) {
            channelElement.classList.add('active');
        }
    },

    // Search channels
    searchChannels(query) {
        if (!query.trim()) {
            this.renderChannelsList(this.channels);
            // Reset category selection
            document.querySelectorAll('.category-chip').forEach(item => {
                item.classList.remove('active');
            });
            document.querySelector('.category-chip').classList.add('active');
            return;
        }

        const searchTerm = query.toLowerCase();
        const filteredChannels = this.channels.filter(channel => {
            return channel.name.toLowerCase().includes(searchTerm) ||
                channel.group.toLowerCase().includes(searchTerm);
        });

        this.renderChannelsList(filteredChannels);

        // Clear category selection during search
        document.querySelectorAll('.category-chip').forEach(item => {
            item.classList.remove('active');
        });
    },

    // Switch playlist
    async switchPlaylist(playlistName) {
        try {
            this.showToast('🔄 Switching playlist...', 'info');
            await this.loadPlaylist(playlistName);
            this.categorizeChannels();
            this.renderCategories();
            this.renderAllChannels();
            this.showToast(`✅ Switched to ${playlistName}`, 'success');
        } catch (error) {
            console.error('❌ Failed to switch playlist:', error);
            this.showToast('❌ Failed to switch playlist', 'error');
        }
    },

    // Refresh channels
    async refreshChannels() {
        try {
            this.showToast('🔄 Refreshing channels...', 'info');
            await this.loadPlaylist(this.currentPlaylist);
            this.categorizeChannels();
            this.renderCategories();
            this.renderAllChannels();
            this.showToast(`🔄 Refreshed ${this.channels.length} channels`, 'success');
        } catch (error) {
            console.error('❌ Failed to refresh channels:', error);
            this.showToast('❌ Failed to refresh channels', 'error');
        }
    },

    // Copy stream URL
    async copyStreamUrl(streamUrl) {
        try {
            await navigator.clipboard.writeText(streamUrl);
            this.showToast('📋 Stream URL copied to clipboard', 'success');
        } catch (error) {
            console.error('❌ Failed to copy URL:', error);
            this.showToast('❌ Failed to copy URL', 'error');
        }
    },

    // Utility functions
    showToast(message, type = 'info', duration = 3000) {
        if (window.showToast) {
            window.showToast(message, type, duration);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
};

// Load TV page function
async function loadTVPage() {
    console.log('📺 Loading TV page...');

    try {
        if (window.showView) {
            showView('tv');
        }

        if (window.updateNavLinks) {
            updateNavLinks('tv');
        }

        // Initialize TV module if not already done
        if (TVModule.channels.length === 0) {
            await TVModule.init();
        }

        // Render the page
        TVModule.renderTVPage();

        console.log('✅ TV page loaded successfully');

    } catch (error) {
        console.error('❌ Error loading TV page:', error);
    }
}

// Make functions globally accessible
window.TVModule = TVModule;
window.loadTVPage = loadTVPage;