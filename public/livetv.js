// Live TV Module - Handles M3U playlist parsing and live TV streaming
const LiveTVModule = {
    channels: [],
    categories: {},
    currentChannel: null,

    // Initialize Live TV module
    async init() {
        console.log('📺 Initializing Live TV Module');
        try {
            // Try to load from storage first
            if (!this.loadChannelsFromStorage()) {
                // If no stored channels, load from playlist
                await this.loadPlaylist();
            }
            this.categorizeChannels();
            
            // Apply saved settings
            const settings = this.getSettings();
            this.applySettings(settings);
            
            console.log('✅ Live TV Module initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize Live TV:', error);
        }
    },

    // Load M3U playlist
    async loadPlaylist() {
        try {
            const response = await fetch('/Tv/combined_playlist.m3u');
            const playlistText = await response.text();
            this.channels = this.parseM3U(playlistText);
            console.log(`📺 Loaded ${this.channels.length} channels`);
        } catch (error) {
            console.error('❌ Failed to load playlist:', error);
            throw error;
        }
    },

    // Parse M3U playlist format
    parseM3U(playlistText) {
        const lines = playlistText.split('\n');
        const channels = [];
        let currentChannel = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            if (line.startsWith('#EXTINF:')) {
                // Parse channel info
                currentChannel = this.parseExtinf(line);
            } else if (line && !line.startsWith('#') && currentChannel) {
                // This is the stream URL
                currentChannel.url = line;
                currentChannel.id = `channel_${channels.length + 1}`;
                channels.push(currentChannel);
                currentChannel = null;
            }
        }

        return channels;
    },

    // Parse EXTINF line to extract channel information
    parseExtinf(line) {
        const channel = {
            name: '',
            logo: '',
            group: 'General',
            url: ''
        };

        // Extract channel name (after the last comma)
        const nameMatch = line.match(/,(.+)$/);
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
        if (groupMatch) {
            channel.group = groupMatch[1];
        }

        return channel;
    },

    // Categorize channels by group
    categorizeChannels() {
        this.categories = {};

        this.channels.forEach(channel => {
            const category = channel.group || 'General';
            if (!this.categories[category]) {
                this.categories[category] = [];
            }
            this.categories[category].push(channel);
        });

        console.log('📂 Categories:', Object.keys(this.categories));
    },

    // Render Live TV page
    renderLiveTVPage() {
        const container = document.getElementById('liveTVContent');
        if (!container) return;

        container.innerHTML = `
            <div class="livetv-header">
                <h1>📺 Live TV</h1>
                <p class="livetv-subtitle">Watch live channels from around the world(It is in beta)</p>
                <div class="livetv-controls">
                    <div class="search-container">
                        <input type="text" id="channelSearch" placeholder="🔍 Search channels..." 
                               oninput="LiveTVModule.searchChannels(this.value)">
                    </div>
                    <div class="livetv-actions">
                        <button onclick="LiveTVModule.addCustomM3U8()" title="Add Custom Channel">➕ Add Channel</button>
                        <button onclick="LiveTVModule.importM3U8()" title="Import M3U8">📥 Import</button>
                        <button onclick="LiveTVModule.exportFavorites()" title="Export Favorites">📤 Export</button>
                        <button onclick="LiveTVModule.showSettings()" title="Settings">⚙️ Settings</button>
                    </div>
                </div>
            </div>
            <div class="livetv-layout">
                <div class="livetv-sidebar">
                    <div class="sidebar-header">
                        <h3>Categories</h3>
                        <button onclick="LiveTVModule.showFavorites()" class="favorites-btn">⭐ Favorites</button>
                    </div>
                    <div class="category-list" id="categoryList">
                        <!-- Categories will be populated here -->
                    </div>
                </div>
                <div class="livetv-main">
                    <div class="livetv-player-container" id="liveTVPlayer" style="display: none;">
                        <video id="liveTVVideo" controls autoplay>
                            <p>Your browser doesn't support HTML5 video.</p>
                        </video>
                        <div class="livetv-info">
                            <h3 id="currentChannelName">Select a channel</h3>
                            <p id="currentChannelCategory"></p>
                        </div>
                        <div class="player-controls">
                            <button onclick="LiveTVModule.stopPlayback()" title="Stop">⏹️</button>
                            <button onclick="LiveTVModule.toggleFullscreen()" title="Fullscreen">⛶</button>
                            <button onclick="LiveTVModule.togglePictureInPicture()" title="Picture in Picture">📺</button>
                            <button onclick="LiveTVModule.showVideoSettings()" title="Video Settings">⚙️</button>
                        </div>
                    </div>
                    <div class="channels-grid" id="channelsGrid">
                        <!-- Channels will be populated here -->
                    </div>
                </div>
            </div>
        `;

        this.renderCategories();
        this.renderAllChannels();
    },

    // Render category list
    renderCategories() {
        const categoryList = document.getElementById('categoryList');
        if (!categoryList) return;

        // Add "All Channels" option
        const allOption = document.createElement('div');
        allOption.className = 'category-item active';
        allOption.innerHTML = `
            <span class="category-icon">📺</span>
            <span class="category-name">All Channels</span>
            <span class="category-count">${this.channels.length}</span>
        `;
        allOption.addEventListener('click', () => {
            this.selectCategory('all', allOption);
        });
        categoryList.appendChild(allOption);

        // Add categories
        Object.keys(this.categories).sort().forEach(category => {
            const categoryItem = document.createElement('div');
            categoryItem.className = 'category-item';

            const icon = this.getCategoryIcon(category);
            const count = this.categories[category].length;

            categoryItem.innerHTML = `
                <span class="category-icon">${icon}</span>
                <span class="category-name">${category}</span>
                <span class="category-count">${count}</span>
            `;

            categoryItem.addEventListener('click', () => {
                this.selectCategory(category, categoryItem);
            });

            categoryList.appendChild(categoryItem);
        });
    },

    // Get icon for category
    getCategoryIcon(category) {
        const icons = {
            'Bangla': '🇧🇩',
            'Sports': '⚽',
            'Cricket': '🏏',
            'Football': '⚽',
            'News': '📰',
            'English News': '🌍',
            'Indian Bangla News': '📺',
            'NEWS INTERNASIONAL': '🌐',
            'Movies': '🎬',
            'Hindi Movies': '🎭',
            'Bangla Movies': '🎪',
            'English Movies': '🎞️',
            'Kolkata Bangla Movies': '🎨',
            'Music': '🎵',
            'Hindi Music': '🎶',
            'Bangla Music': '🎼',
            'Kids': '👶',
            'KIDS': '🧸',
            'Islamic': '☪️',
            'Relagion Channel': '🕌',
            'ISLAMIC CHANNELS': '📿',
            'Information': '📚',
            'Infotainment Channels': '🔬',
            'Documentary': '🎥',
            'Entertainment': '🎪',
            'Live Sports': '🏆',
            'Bangladeshi': '🇧🇩',
            'Live Tv': '📡',
            'General': '📺'
        };

        return icons[category] || '📺';
    },

    // Select category and filter channels
    selectCategory(category, element) {
        // Update active category
        document.querySelectorAll('.category-item').forEach(item => {
            item.classList.remove('active');
        });
        element.classList.add('active');

        // Filter and render channels
        if (category === 'all') {
            this.renderAllChannels();
        } else {
            this.renderChannelsByCategory(category);
        }
    },

    // Render all channels
    renderAllChannels() {
        const channelsGrid = document.getElementById('channelsGrid');
        if (!channelsGrid) return;

        channelsGrid.innerHTML = '';

        this.channels.forEach(channel => {
            const channelCard = this.createChannelCard(channel);
            channelsGrid.appendChild(channelCard);
        });
    },

    // Render channels by category
    renderChannelsByCategory(category) {
        const channelsGrid = document.getElementById('channelsGrid');
        if (!channelsGrid) return;

        channelsGrid.innerHTML = '';

        const categoryChannels = this.categories[category] || [];
        categoryChannels.forEach(channel => {
            const channelCard = this.createChannelCard(channel);
            channelsGrid.appendChild(channelCard);
        });
    },

    // Create channel card element
    createChannelCard(channel) {
        const card = document.createElement('div');
        card.className = 'channel-card';

        const logo = channel.logo || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect width=%22100%22 height=%22100%22 fill=%22%23333%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 fill=%22%23666%22 text-anchor=%22middle%22 dy=%22.3em%22%3E📺%3C/text%3E%3C/svg%3E';

        card.innerHTML = `
            <div class="channel-logo">
                <img src="${logo}" alt="${channel.name}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect width=%22100%22 height=%22100%22 fill=%22%23333%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 fill=%22%23666%22 text-anchor=%22middle%22 dy=%22.3em%22%3E📺%3C/text%3E%3C/svg%3E'" />
            </div>
            <div class="channel-info">
                <h4 class="channel-name">${channel.name}</h4>
                <p class="channel-category">${channel.group}</p>
            </div>
            <div class="channel-actions">
                <button class="play-btn" onclick="LiveTVModule.playChannel('${channel.id}')">
                    <span class="play-icon">▶️</span>
                    <span>Play</span>
                </button>
                <button class="external-player-btn" onclick="LiveTVModule.showExternalPlayerMenu('${channel.url}', '${channel.name}')" title="External Player">📺</button>
                <button class="download-btn" onclick="LiveTVModule.downloadM3U8('${channel.url}', '${channel.name}')" title="Download">⬇️</button>
                <button class="copy-btn" onclick="LiveTVModule.copyStreamUrl('${channel.url}')" title="Copy URL">📋</button>
                <button class="share-btn" onclick="LiveTVModule.shareChannel('${channel.url}', '${channel.name}')" title="Share">📤</button>
                <button class="more-btn" onclick="LiveTVModule.showChannelMenu('${channel.id}', '${channel.name}', '${channel.group}')" title="More">⋮</button>
            </div>
        `;

        return card;
    },

    // Play selected channel
    async playChannel(channelId) {
        const channel = this.channels.find(ch => ch.id === channelId);
        if (!channel) {
            console.error('❌ Channel not found:', channelId);
            return;
        }

        console.log('📺 Playing channel:', channel.name);
        this.currentChannel = channel;

        // Show player
        const playerContainer = document.getElementById('liveTVPlayer');
        const video = document.getElementById('liveTVVideo');
        const channelName = document.getElementById('currentChannelName');
        const channelCategory = document.getElementById('currentChannelCategory');

        if (playerContainer && video && channelName && channelCategory) {
            playerContainer.style.display = 'block';
            channelName.textContent = channel.name;
            channelCategory.textContent = channel.group;

            // Clear previous source
            video.innerHTML = '';
            video.src = '';

            try {
                // Check if it's an HLS stream
                if (channel.url.includes('.m3u8')) {
                    await this.playHLSStream(video, channel.url);
                } else {
                    // Direct stream
                    video.src = channel.url;
                    await video.play();
                }

                // Mark as watched in history
                if (window.HistoryModule) {
                    window.HistoryModule.addToHistory({
                        title: channel.name,
                        image: channel.logo,
                        provider: 'Live TV',
                        link: channel.url,
                        type: 'tv'
                    });
                }

                // Show success message
                if (window.showToast) {
                    window.showToast(`📺 Now playing: ${channel.name}`, 'success', 2000);
                }

            } catch (error) {
                console.error('❌ Failed to play channel:', error);
                if (window.showToast) {
                    window.showToast(`❌ Failed to play ${channel.name}. Try another channel.`, 'error', 3000);
                }
            }
        }

        // Scroll to player
        playerContainer?.scrollIntoView({ behavior: 'smooth' });
    },

    // Play HLS stream using hls.js
    async playHLSStream(video, streamUrl) {
        if (typeof Hls !== 'undefined' && Hls.isSupported()) {
            // Destroy previous HLS instance
            if (window.currentLiveTVHls) {
                window.currentLiveTVHls.destroy();
            }

            const hls = new Hls({
                enableWorker: true,
                maxBufferLength: 30,
                maxMaxBufferLength: 600,
            });

            hls.loadSource(streamUrl);
            hls.attachMedia(video);

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                console.log('✅ HLS manifest parsed for Live TV');
                video.play().catch(e => {
                    console.error('❌ HLS play error:', e);
                    throw e;
                });
            });

            hls.on(Hls.Events.ERROR, (event, data) => {
                console.error('❌ HLS error in Live TV:', data);
                if (data.fatal) {
                    throw new Error(`HLS Error: ${data.type} - ${data.details}`);
                }
            });

            window.currentLiveTVHls = hls;
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            // Native HLS support (Safari)
            video.src = streamUrl;
            await video.play();
        } else {
            throw new Error('HLS playback not supported in this browser');
        }
    },

    // Search channels
    searchChannels(query) {
        if (!query.trim()) {
            this.renderAllChannels();
            return;
        }

        const filteredChannels = this.channels.filter(channel =>
            channel.name.toLowerCase().includes(query.toLowerCase()) ||
            channel.group.toLowerCase().includes(query.toLowerCase())
        );

        const channelsGrid = document.getElementById('channelsGrid');
        if (!channelsGrid) return;

        channelsGrid.innerHTML = '';

        if (filteredChannels.length === 0) {
            channelsGrid.innerHTML = `
                <div class="no-results">
                    <h3>No channels found</h3>
                    <p>Try searching with different keywords</p>
                </div>
            `;
            return;
        }

        filteredChannels.forEach(channel => {
            const channelCard = this.createChannelCard(channel);
            channelsGrid.appendChild(channelCard);
        });
    },

    // Stop current playback
    stopPlayback() {
        const video = document.getElementById('liveTVVideo');
        const playerContainer = document.getElementById('liveTVPlayer');

        if (video) {
            video.pause();
            video.src = '';
            video.innerHTML = '';
        }

        if (playerContainer) {
            playerContainer.style.display = 'none';
        }

        if (window.currentLiveTVHls) {
            window.currentLiveTVHls.destroy();
            window.currentLiveTVHls = null;
        }

        this.currentChannel = null;
        console.log('⏹️ Live TV playback stopped');
    },

    // Show external player menu
    showExternalPlayerMenu(streamUrl, channelName) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>📺 Open in External Player</h3>
                    <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">×</button>
                </div>
                <div class="modal-body">
                    <p>Choose an external player to open <strong>${channelName}</strong>:</p>
                    <div class="external-player-options">
                        <button class="player-option" onclick="LiveTVModule.openInExternalPlayer('vlc', '${streamUrl}', '${channelName}')">
                            <span class="player-icon">🎥</span>
                            <span>VLC Media Player</span>
                        </button>
                        <button class="player-option" onclick="LiveTVModule.openInExternalPlayer('potplayer', '${streamUrl}', '${channelName}')">
                            <span class="player-icon">📺</span>
                            <span>PotPlayer</span>
                        </button>
                        <button class="player-option" onclick="LiveTVModule.openInExternalPlayer('mpv', '${streamUrl}', '${channelName}')">
                            <span class="player-icon">🎬</span>
                            <span>MPV Player</span>
                        </button>
                        <button class="player-option" onclick="LiveTVModule.openInExternalPlayer('auto', '${streamUrl}', '${channelName}')">
                            <span class="player-icon">🔄</span>
                            <span>Auto Detect</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    // Open in external player
    async openInExternalPlayer(playerType, streamUrl, channelName) {
        try {
            // Check if running in Electron (desktop app)
            const bridge = window.appBridge;
            if (bridge?.openExternalPlayer) {
                const result = await bridge.openExternalPlayer({
                    url: streamUrl,
                    title: channelName,
                    player: playerType === 'auto' ? null : playerType
                });
                
                if (result.ok) {
                    if (window.showToast) {
                        const playerName = result.player ? result.player.split(/[\\\/]/).pop() : playerType.toUpperCase();
                        window.showToast(`📺 Opening ${channelName} in ${playerName}`, 'success', 2000);
                    }
                    document.querySelector('.modal-overlay')?.remove();
                    return;
                } else {
                    throw new Error(result.error || 'Failed to open external player');
                }
            } else {
                // Running in web browser - use web-based external player methods
                console.log('🌐 Running in web browser, using web-based external player methods for Live TV');
                document.querySelector('.modal-overlay')?.remove();
                
                // Use the same web-based external player function from app.js
                if (window.openExternalPlayerWeb) {
                    await window.openExternalPlayerWeb(streamUrl, playerType === 'auto' ? null : playerType, channelName, true, false);
                } else {
                    // Fallback to showing the modal directly
                    if (window.showEnhancedExternalPlayerModal) {
                        const isMobile = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(navigator.userAgent.toLowerCase());
                        const isAndroid = /android/i.test(navigator.userAgent.toLowerCase());
                        const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent.toLowerCase());
                        window.showEnhancedExternalPlayerModal(streamUrl, channelName, null, isMobile, isAndroid, isIOS, false, false);
                    } else {
                        // Simple fallback
                        if (navigator.clipboard && window.isSecureContext) {
                            await navigator.clipboard.writeText(streamUrl);
                            if (window.showToast) {
                                window.showToast('📋 Stream URL copied to clipboard. Paste it in your external player.', 'info', 4000);
                            }
                        } else {
                            if (window.showToast) {
                                window.showToast('Copy this URL to your external player: ' + streamUrl, 'info', 6000);
                            }
                        }
                    }
                }
                return;
            }
        } catch (error) {
            console.error('❌ Failed to open external player:', error);
            if (window.showToast) {
                window.showToast(`❌ Failed to open ${playerType.toUpperCase()}: ${error.message}`, 'error', 3000);
            }
        }
    },

    // Download M3U8 file
    async downloadM3U8(streamUrl, channelName) {
        try {
            const response = await fetch(streamUrl);
            const m3u8Content = await response.text();
            
            const blob = new Blob([m3u8Content], { type: 'application/vnd.apple.mpegurl' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `${channelName.replace(/[^a-z0-9]/gi, '_')}.m3u8`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            if (window.showToast) {
                window.showToast(`⬇️ Downloaded ${channelName}.m3u8`, 'success', 2000);
            }
        } catch (error) {
            console.error('❌ Failed to download M3U8:', error);
            if (window.showToast) {
                window.showToast(`❌ Failed to download M3U8 file`, 'error', 3000);
            }
        }
    },

    // Copy stream URL
    async copyStreamUrl(streamUrl) {
        try {
            await navigator.clipboard.writeText(streamUrl);
            if (window.showToast) {
                window.showToast('📋 Stream URL copied to clipboard', 'success', 2000);
            }
        } catch (error) {
            console.error('❌ Failed to copy URL:', error);
            if (window.showToast) {
                window.showToast('❌ Failed to copy URL', 'error', 2000);
            }
        }
    },

    // Share channel
    shareChannel(streamUrl, channelName) {
        if (navigator.share) {
            navigator.share({
                title: `Watch ${channelName}`,
                text: `Check out this live TV channel: ${channelName}`,
                url: streamUrl
            }).catch(error => console.error('❌ Share failed:', error));
        } else {
            // Fallback: copy to clipboard
            this.copyStreamUrl(`${channelName}: ${streamUrl}`);
        }
    },

    // Show channel menu
    showChannelMenu(channelId, channelName, channelCategory) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>⚙️ Channel Options</h3>
                    <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">×</button>
                </div>
                <div class="modal-body">
                    <h4>${channelName}</h4>
                    <p>Category: ${channelCategory}</p>
                    <div class="channel-menu-options">
                        <button onclick="LiveTVModule.editChannelName('${channelId}', '${channelName}')">✏️ Edit Name</button>
                        <button onclick="LiveTVModule.changeChannelCategory('${channelId}', '${channelCategory}')">📁 Change Category</button>
                        <button onclick="LiveTVModule.addToFavorites('${channelId}')">⭐ Add to Favorites</button>
                        <button onclick="LiveTVModule.deleteChannel('${channelId}')">🗑️ Delete Channel</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    // Edit channel name
    editChannelName(channelId, currentName) {
        const newName = prompt('Enter new channel name:', currentName);
        if (newName && newName !== currentName) {
            const channel = this.channels.find(ch => ch.id === channelId);
            if (channel) {
                channel.name = newName;
                this.saveChannelsToStorage();
                this.renderAllChannels();
                if (window.showToast) {
                    window.showToast(`✏️ Channel renamed to "${newName}"`, 'success', 2000);
                }
            }
        }
        document.querySelector('.modal-overlay')?.remove();
    },

    // Change channel category
    changeChannelCategory(channelId, currentCategory) {
        const categories = Object.keys(this.categories);
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>📁 Change Category</h3>
                    <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">×</button>
                </div>
                <div class="modal-body">
                    <p>Select new category:</p>
                    <div class="category-options">
                        ${categories.map(cat => `
                            <button class="category-option ${cat === currentCategory ? 'active' : ''}" 
                                    onclick="LiveTVModule.updateChannelCategory('${channelId}', '${cat}')">
                                ${this.getCategoryIcon(cat)} ${cat}
                            </button>
                        `).join('')}
                    </div>
                    <div class="new-category-section">
                        <input type="text" id="newCategoryInput" placeholder="Or create new category...">
                        <button onclick="LiveTVModule.createNewCategory('${channelId}')">Create</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    // Update channel category
    updateChannelCategory(channelId, newCategory) {
        const channel = this.channels.find(ch => ch.id === channelId);
        if (channel) {
            const oldCategory = channel.group;
            channel.group = newCategory;
            this.categorizeChannels();
            this.saveChannelsToStorage();
            this.renderCategories();
            this.renderAllChannels();
            if (window.showToast) {
                window.showToast(`📁 Channel moved to "${newCategory}"`, 'success', 2000);
            }
        }
        document.querySelector('.modal-overlay')?.remove();
    },

    // Create new category
    createNewCategory(channelId) {
        const input = document.getElementById('newCategoryInput');
        const newCategory = input?.value.trim();
        if (newCategory) {
            this.updateChannelCategory(channelId, newCategory);
        }
    },

    // Add to favorites
    addToFavorites(channelId) {
        const favorites = JSON.parse(localStorage.getItem('liveTVFavorites') || '[]');
        if (!favorites.includes(channelId)) {
            favorites.push(channelId);
            localStorage.setItem('liveTVFavorites', JSON.stringify(favorites));
            if (window.showToast) {
                window.showToast('⭐ Added to favorites', 'success', 2000);
            }
        }
        document.querySelector('.modal-overlay')?.remove();
    },

    // Delete channel
    deleteChannel(channelId) {
        if (confirm('Are you sure you want to delete this channel?')) {
            this.channels = this.channels.filter(ch => ch.id !== channelId);
            this.categorizeChannels();
            this.saveChannelsToStorage();
            this.renderCategories();
            this.renderAllChannels();
            if (window.showToast) {
                window.showToast('🗑️ Channel deleted', 'success', 2000);
            }
        }
        document.querySelector('.modal-overlay')?.remove();
    },

    // Save channels to storage
    saveChannelsToStorage() {
        localStorage.setItem('liveTVChannels', JSON.stringify(this.channels));
    },

    // Load channels from storage
    loadChannelsFromStorage() {
        const stored = localStorage.getItem('liveTVChannels');
        if (stored) {
            this.channels = JSON.parse(stored);
            return true;
        }
        return false;
    },

    // Add custom M3U8 URL
    addCustomM3U8() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>➕ Add Custom M3U8</h3>
                    <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Channel Name:</label>
                        <input type="text" id="customChannelName" placeholder="Enter channel name">
                    </div>
                    <div class="form-group">
                        <label>M3U8 URL:</label>
                        <input type="url" id="customChannelUrl" placeholder="https://example.com/stream.m3u8">
                    </div>
                    <div class="form-group">
                        <label>Category:</label>
                        <select id="customChannelCategory">
                            ${Object.keys(this.categories).map(cat => `<option value="${cat}">${cat}</option>`).join('')}
                            <option value="Custom">Custom</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Logo URL (optional):</label>
                        <input type="url" id="customChannelLogo" placeholder="https://example.com/logo.png">
                    </div>
                    <div class="form-actions">
                        <button onclick="LiveTVModule.saveCustomChannel()">Add Channel</button>
                        <button onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    // Save custom channel
    saveCustomChannel() {
        const name = document.getElementById('customChannelName')?.value.trim();
        const url = document.getElementById('customChannelUrl')?.value.trim();
        const category = document.getElementById('customChannelCategory')?.value;
        const logo = document.getElementById('customChannelLogo')?.value.trim();

        if (!name || !url) {
            if (window.showToast) {
                window.showToast('❌ Please fill in channel name and URL', 'error', 3000);
            }
            return;
        }

        const newChannel = {
            id: `custom_${Date.now()}`,
            name: name,
            url: url,
            group: category,
            logo: logo || ''
        };

        this.channels.push(newChannel);
        this.categorizeChannels();
        this.saveChannelsToStorage();
        this.renderCategories();
        this.renderAllChannels();

        if (window.showToast) {
            window.showToast(`✅ Added "${name}" to ${category}`, 'success', 2000);
        }

        document.querySelector('.modal-overlay')?.remove();
    },

    // Export favorites as M3U8
    exportFavorites() {
        const favorites = JSON.parse(localStorage.getItem('liveTVFavorites') || '[]');
        const favoriteChannels = this.channels.filter(ch => favorites.includes(ch.id));

        if (favoriteChannels.length === 0) {
            if (window.showToast) {
                window.showToast('❌ No favorite channels to export', 'error', 2000);
            }
            return;
        }

        let m3u8Content = '#EXTM3U\n';
        favoriteChannels.forEach(channel => {
            m3u8Content += `#EXTINF:-1 tvg-logo="${channel.logo}" group-title="${channel.group}",${channel.name}\n`;
            m3u8Content += `${channel.url}\n`;
        });

        const blob = new Blob([m3u8Content], { type: 'application/vnd.apple.mpegurl' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'favorites.m3u8';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        if (window.showToast) {
            window.showToast(`📤 Exported ${favoriteChannels.length} favorite channels`, 'success', 2000);
        }
    },

    // Import M3U8 file
    importM3U8() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.m3u8,.m3u';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const content = e.target.result;
                    const importedChannels = this.parseM3U(content);
                    
                    if (importedChannels.length > 0) {
                        // Add unique IDs to imported channels
                        importedChannels.forEach((channel, index) => {
                            channel.id = `imported_${Date.now()}_${index}`;
                        });
                        
                        this.channels.push(...importedChannels);
                        this.categorizeChannels();
                        this.saveChannelsToStorage();
                        this.renderCategories();
                        this.renderAllChannels();
                        
                        if (window.showToast) {
                            window.showToast(`📥 Imported ${importedChannels.length} channels`, 'success', 2000);
                        }
                    } else {
                        if (window.showToast) {
                            window.showToast('❌ No valid channels found in file', 'error', 3000);
                        }
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    },

    // Show favorites
    showFavorites() {
        const favorites = JSON.parse(localStorage.getItem('liveTVFavorites') || '[]');
        const favoriteChannels = this.channels.filter(ch => favorites.includes(ch.id));

        const channelsGrid = document.getElementById('channelsGrid');
        if (!channelsGrid) return;

        channelsGrid.innerHTML = '';

        if (favoriteChannels.length === 0) {
            channelsGrid.innerHTML = `
                <div class="no-results">
                    <h3>⭐ No Favorite Channels</h3>
                    <p>Add channels to favorites to see them here</p>
                </div>
            `;
            return;
        }

        favoriteChannels.forEach(channel => {
            const channelCard = this.createChannelCard(channel);
            channelsGrid.appendChild(channelCard);
        });

        // Update active category
        document.querySelectorAll('.category-item').forEach(item => {
            item.classList.remove('active');
        });
    },

    // Toggle fullscreen
    toggleFullscreen() {
        const video = document.getElementById('liveTVVideo');
        if (!video) return;

        if (!document.fullscreenElement) {
            video.requestFullscreen().catch(err => {
                console.error('❌ Failed to enter fullscreen:', err);
            });
        } else {
            document.exitFullscreen();
        }
    },

    // Toggle picture in picture
    async togglePictureInPicture() {
        const video = document.getElementById('liveTVVideo');
        if (!video) return;

        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            } else {
                await video.requestPictureInPicture();
            }
        } catch (error) {
            console.error('❌ Picture-in-Picture error:', error);
            if (window.showToast) {
                window.showToast('❌ Picture-in-Picture not supported', 'error', 2000);
            }
        }
    },

    // Show video settings
    showVideoSettings() {
        const video = document.getElementById('liveTVVideo');
        if (!video) return;

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>⚙️ Video Settings</h3>
                    <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="setting-group">
                        <label>Playback Speed:</label>
                        <select id="playbackSpeed" onchange="LiveTVModule.setPlaybackSpeed(this.value)">
                            <option value="0.5">0.5x</option>
                            <option value="0.75">0.75x</option>
                            <option value="1" selected>1x (Normal)</option>
                            <option value="1.25">1.25x</option>
                            <option value="1.5">1.5x</option>
                            <option value="2">2x</option>
                        </select>
                    </div>
                    <div class="setting-group">
                        <label>Volume:</label>
                        <input type="range" id="volumeSlider" min="0" max="100" value="${Math.round(video.volume * 100)}" 
                               oninput="LiveTVModule.setVolume(this.value)">
                        <span id="volumeValue">${Math.round(video.volume * 100)}%</span>
                    </div>
                    <div class="setting-group">
                        <label>Brightness:</label>
                        <input type="range" id="brightnessSlider" min="0" max="200" value="100" 
                               oninput="LiveTVModule.setBrightness(this.value)">
                        <span id="brightnessValue">100%</span>
                    </div>
                    <div class="setting-group">
                        <label>Contrast:</label>
                        <input type="range" id="contrastSlider" min="0" max="200" value="100" 
                               oninput="LiveTVModule.setContrast(this.value)">
                        <span id="contrastValue">100%</span>
                    </div>
                    <div class="setting-group">
                        <label>Saturation:</label>
                        <input type="range" id="saturationSlider" min="0" max="200" value="100" 
                               oninput="LiveTVModule.setSaturation(this.value)">
                        <span id="saturationValue">100%</span>
                    </div>
                    <div class="setting-actions">
                        <button onclick="LiveTVModule.resetVideoSettings()">Reset to Default</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    // Set playback speed
    setPlaybackSpeed(speed) {
        const video = document.getElementById('liveTVVideo');
        if (video) {
            video.playbackRate = parseFloat(speed);
        }
    },

    // Set volume
    setVolume(volume) {
        const video = document.getElementById('liveTVVideo');
        if (video) {
            video.volume = volume / 100;
            document.getElementById('volumeValue').textContent = volume + '%';
        }
    },

    // Set brightness
    setBrightness(brightness) {
        const video = document.getElementById('liveTVVideo');
        if (video) {
            const filter = `brightness(${brightness}%) contrast(${document.getElementById('contrastSlider')?.value || 100}%) saturate(${document.getElementById('saturationSlider')?.value || 100}%)`;
            video.style.filter = filter;
            document.getElementById('brightnessValue').textContent = brightness + '%';
        }
    },

    // Set contrast
    setContrast(contrast) {
        const video = document.getElementById('liveTVVideo');
        if (video) {
            const filter = `brightness(${document.getElementById('brightnessSlider')?.value || 100}%) contrast(${contrast}%) saturate(${document.getElementById('saturationSlider')?.value || 100}%)`;
            video.style.filter = filter;
            document.getElementById('contrastValue').textContent = contrast + '%';
        }
    },

    // Set saturation
    setSaturation(saturation) {
        const video = document.getElementById('liveTVVideo');
        if (video) {
            const filter = `brightness(${document.getElementById('brightnessSlider')?.value || 100}%) contrast(${document.getElementById('contrastSlider')?.value || 100}%) saturate(${saturation}%)`;
            video.style.filter = filter;
            document.getElementById('saturationValue').textContent = saturation + '%';
        }
    },

    // Reset video settings
    resetVideoSettings() {
        const video = document.getElementById('liveTVVideo');
        if (video) {
            video.playbackRate = 1;
            video.style.filter = 'none';
            
            // Reset sliders
            document.getElementById('playbackSpeed').value = '1';
            document.getElementById('brightnessSlider').value = '100';
            document.getElementById('contrastSlider').value = '100';
            document.getElementById('saturationSlider').value = '100';
            
            // Update labels
            document.getElementById('brightnessValue').textContent = '100%';
            document.getElementById('contrastValue').textContent = '100%';
            document.getElementById('saturationValue').textContent = '100%';
        }
    },

    // Show settings
    showSettings() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>⚙️ Live TV Settings</h3>
                    <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="settings-section">
                        <h4>🎵 Audio & Video</h4>
                        <div class="setting-item">
                            <label>
                                <input type="checkbox" id="autoplay" ${this.getSettings().autoplay ? 'checked' : ''}>
                                Auto-play channels
                            </label>
                        </div>
                        <div class="setting-item">
                            <label>
                                <input type="checkbox" id="showThumbnails" ${this.getSettings().showThumbnails ? 'checked' : ''}>
                                Show channel thumbnails
                            </label>
                        </div>
                    </div>
                    <div class="settings-section">
                        <h4>📱 Interface</h4>
                        <div class="setting-item">
                            <label>Grid Size:</label>
                            <select id="gridSize">
                                <option value="small" ${this.getSettings().gridSize === 'small' ? 'selected' : ''}>Small</option>
                                <option value="medium" ${this.getSettings().gridSize === 'medium' ? 'selected' : ''}>Medium</option>
                                <option value="large" ${this.getSettings().gridSize === 'large' ? 'selected' : ''}>Large</option>
                            </select>
                        </div>
                        <div class="setting-item">
                            <label>Theme:</label>
                            <select id="theme">
                                <option value="dark" ${this.getSettings().theme === 'dark' ? 'selected' : ''}>Dark</option>
                                <option value="light" ${this.getSettings().theme === 'light' ? 'selected' : ''}>Light</option>
                            </select>
                        </div>
                    </div>
                    <div class="settings-section">
                        <h4>💾 Data Management</h4>
                        <div class="setting-actions">
                            <button onclick="LiveTVModule.backupSettings()">📤 Backup Settings</button>
                            <button onclick="LiveTVModule.restoreSettings()">📥 Restore Settings</button>
                            <button onclick="LiveTVModule.clearAllData()">🗑️ Clear All Data</button>
                        </div>
                    </div>
                    <div class="modal-actions">
                        <button onclick="LiveTVModule.saveSettings()">Save Settings</button>
                        <button onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    // Get settings
    getSettings() {
        return JSON.parse(localStorage.getItem('liveTVSettings') || JSON.stringify({
            autoplay: true,
            showThumbnails: true,
            gridSize: 'medium',
            theme: 'dark'
        }));
    },

    // Save settings
    saveSettings() {
        const settings = {
            autoplay: document.getElementById('autoplay')?.checked || false,
            showThumbnails: document.getElementById('showThumbnails')?.checked || false,
            gridSize: document.getElementById('gridSize')?.value || 'medium',
            theme: document.getElementById('theme')?.value || 'dark'
        };

        localStorage.setItem('liveTVSettings', JSON.stringify(settings));
        
        // Apply settings
        this.applySettings(settings);
        
        if (window.showToast) {
            window.showToast('✅ Settings saved', 'success', 2000);
        }
        
        document.querySelector('.modal-overlay')?.remove();
    },

    // Apply settings
    applySettings(settings) {
        // Apply grid size
        const channelsGrid = document.getElementById('channelsGrid');
        if (channelsGrid) {
            channelsGrid.className = `channels-grid grid-${settings.gridSize}`;
        }

        // Apply theme
        document.body.setAttribute('data-theme', settings.theme);
    },

    // Backup settings
    backupSettings() {
        const backup = {
            channels: this.channels,
            favorites: JSON.parse(localStorage.getItem('liveTVFavorites') || '[]'),
            settings: this.getSettings(),
            timestamp: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `livetv_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        if (window.showToast) {
            window.showToast('📤 Settings backed up successfully', 'success', 2000);
        }
    },

    // Restore settings
    restoreSettings() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const backup = JSON.parse(e.target.result);
                        
                        if (backup.channels) {
                            this.channels = backup.channels;
                            this.categorizeChannels();
                            this.saveChannelsToStorage();
                        }
                        
                        if (backup.favorites) {
                            localStorage.setItem('liveTVFavorites', JSON.stringify(backup.favorites));
                        }
                        
                        if (backup.settings) {
                            localStorage.setItem('liveTVSettings', JSON.stringify(backup.settings));
                            this.applySettings(backup.settings);
                        }
                        
                        this.renderCategories();
                        this.renderAllChannels();
                        
                        if (window.showToast) {
                            window.showToast('📥 Settings restored successfully', 'success', 2000);
                        }
                        
                        document.querySelector('.modal-overlay')?.remove();
                    } catch (error) {
                        console.error('❌ Failed to restore backup:', error);
                        if (window.showToast) {
                            window.showToast('❌ Invalid backup file', 'error', 3000);
                        }
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    },

    // Clear all data
    clearAllData() {
        if (confirm('Are you sure you want to clear all Live TV data? This cannot be undone.')) {
            localStorage.removeItem('liveTVChannels');
            localStorage.removeItem('liveTVFavorites');
            localStorage.removeItem('liveTVSettings');
            
            // Reload original playlist
            this.init().then(() => {
                this.renderCategories();
                this.renderAllChannels();
                
                if (window.showToast) {
                    window.showToast('🗑️ All data cleared', 'success', 2000);
                }
            });
            
            document.querySelector('.modal-overlay')?.remove();
        }
    }
};

// Load Live TV page function
async function loadLiveTVPage() {
    console.log('📺 Loading Live TV page...');

    if (window.showView) {
        showView('liveTV');
    }

    if (window.updateNavLinks) {
        updateNavLinks('liveTV');
    }

    // Initialize Live TV module if not already done
    if (LiveTVModule.channels.length === 0) {
        await LiveTVModule.init();
    }

    // Render the page
    LiveTVModule.renderLiveTVPage();
}

// Make functions globally accessible
window.LiveTVModule = LiveTVModule;
window.loadLiveTVPage = loadLiveTVPage;