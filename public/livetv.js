// Optimized Live TV Module - Handles 13,000+ channels with virtual scrolling
const LiveTVModule = {
    channels: [],
    categories: {},
    currentChannel: null,
    filteredChannels: [],
    isLoading: false,
    hls: null, // HLS.js instance

    // Virtual scrolling properties
    virtualScrolling: {
        itemHeight: 85, // Height of each channel card (84px + 1px border)
        containerHeight: 0,
        scrollTop: 0,
        visibleStart: 0,
        visibleEnd: 0,
        bufferSize: 5, // Reduced buffer for better performance
        totalItems: 0
    },

    // Initialize Live TV module
    async init() {
        console.log('📺 Initializing Optimized Live TV Module');
        try {
            this.showLoading(true, 'Loading TV channels...');

            // Load channels from storage first for faster startup
            const hasStoredChannels = this.loadChannelsFromStorage();

            if (hasStoredChannels) {
                console.log('📺 Loaded channels from storage');
                this.categorizeChannels();
            } else {
                // Load from playlist
                await this.loadPlaylist();
                this.categorizeChannels();
            }

            console.log(`✅ Live TV Module initialized with ${this.channels.length} channels`);
            this.showToast(`📺 Live TV ready with ${this.channels.length} channels`, 'success');

        } catch (error) {
            console.error('❌ Failed to initialize Live TV:', error);
            this.showToast('❌ Failed to load TV channels. Please check your connection.', 'error');

            // Initialize with empty state
            this.channels = [];
            this.categories = {};
        } finally {
            this.showLoading(false);
        }
    },

    // Load JSON playlist
    async loadPlaylist() {
        try {
            console.log('📺 Loading JSON playlist...');

            const response = await fetch('playlist-fixed.json');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const channelsData = await response.json();
            if (!Array.isArray(channelsData)) {
                throw new Error('Invalid JSON playlist format');
            }

            console.log(`📺 Playlist loaded, processing ${channelsData.length} channels...`);

            this.channels = this.processChannelsData(channelsData);

            if (this.channels.length === 0) {
                throw new Error('No valid channels found in playlist');
            }

            console.log(`📺 Successfully loaded ${this.channels.length} channels`);
            this.saveChannelsToStorage();

        } catch (error) {
            console.error('❌ Failed to load playlist:', error);
            throw error;
        }
    },

    // Process JSON channels data
    processChannelsData(channelsData) {
        const channels = [];

        for (let i = 0; i < channelsData.length; i++) {
            const data = channelsData[i];

            // Skip invalid entries
            if (!data.url || !data.tvg_name) {
                continue;
            }

            const channel = {
                id: `channel_${channels.length + 1}`,
                name: data.tvg_name.trim(),
                logo: data.tvg_logo || '',
                group: data.group_title || 'General',
                url: data.url.trim(),
                tvg_id: data.tvg_id || ''
            };

            // Auto-categorize if group is empty or generic
            if (!channel.group || channel.group === 'General') {
                channel.group = this.categorizeByName(channel.name);
            }

            channels.push(channel);

            // Debug log for first few channels
            if (channels.length <= 5) {
                console.log(`📺 Processed channel ${channels.length}:`, {
                    name: channel.name,
                    url: channel.url,
                    group: channel.group
                });
            }
        }

        return channels;
    },



    // Auto-categorize by name
    categorizeByName(channelName) {
        const name = channelName.toLowerCase();

        if (name.includes('[in]') || name.includes('india')) {
            return '[IN] INDIA';
        }
        if (name.includes('cricket')) {
            return 'Cricket';
        }
        if (name.includes('sports') || name.includes('sport') || name.includes('football') || name.includes('soccer')) {
            return 'Sports';
        }
        if (name.includes('news')) {
            return 'News';
        }
        if (name.includes('movies') || name.includes('cinema')) {
            return 'Movies';
        }
        if (name.includes('music')) {
            return 'Music';
        }
        if (name.includes('kids') || name.includes('cartoon')) {
            return 'Kids';
        }

        return 'General';
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

    // Render Live TV page with new layout
    renderLiveTVPage() {
        console.log('🎨 Rendering Live TV page...');

        const container = document.getElementById('liveTVContent');
        if (!container) {
            console.error('❌ liveTVContent container not found');
            return;
        }

        const channelCount = this.channels.length;

        container.innerHTML = `
            <div class="livetv-container">
                <!-- Top Header with Search -->
                <div class="livetv-header">
                    <div class="livetv-controls">
                        <div class="search-container">
                            <input type="text" id="channelSearch" placeholder="🔍 Search channels..." 
                                   oninput="LiveTVModule.searchChannels(this.value)">
                        </div>
                        <div class="livetv-actions">
                            <button onclick="LiveTVModule.refreshChannels()" title="Refresh">
                                🔄 Refresh
                            </button>
                            <button onclick="LiveTVModule.exitFullscreen()" title="Exit Live TV" class="exit-btn">
                                ✕ Exit
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Horizontal Categories Slider -->
                <div class="categories-horizontal-slider">
                    <button class="category-nav-btn prev" id="categoryPrevBtn" onclick="LiveTVModule.scrollCategories('prev')">
                        ◀
                    </button>
                    <div class="categories-scroll-wrapper">
                        <div class="categories-scroll" id="categoriesScroll">
                            <!-- Categories will be populated here -->
                        </div>
                    </div>
                    <button class="category-nav-btn next" id="categoryNextBtn" onclick="LiveTVModule.scrollCategories('next')">
                        ▶
                    </button>
                </div>

                <!-- Main Layout -->
                <div class="livetv-main-layout">
                    <!-- Left Side - Channels List -->
                    <div class="channels-panel">
                        <div class="channels-header">
                            <h3>📺 TV Channels</h3>
                            <span class="channel-count" id="channelCount">${channelCount.toLocaleString()}</span>
                        </div>
                        
                        <!-- Virtual Scroll Container -->
                        <div class="virtual-scroll-container" id="virtualScrollContainer">
                            <div class="virtual-scroll-content" id="virtualScrollContent">
                                <div class="channels-grid" id="channelsList">
                                    <!-- Channels will be populated here -->
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Right Side - Video Player -->
                    <div class="player-panel">
                        <div class="video-container">
                            <video id="liveTVVideo" 
                                   controls 
                                   preload="metadata"
                                   style="width: 100%; height: 60%; background: #000;">
                                Your browser does not support the video tag.
                            </video>
                        </div>
                        
                        <!-- Channel Info Overlay -->
                        <div class="current-channel-info" id="currentChannelInfo">
                            <div class="placeholder-content">
                                <div class="live-indicator">LIVE TV</div>
                                <h3>Select a channel to start watching</h3>
                                <p>Choose from ${channelCount.toLocaleString()} available channels</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.renderCategories();
        this.setupVirtualScrolling();
        this.renderAllChannels();
    },

    // Render horizontal categories
    renderCategories() {
        const categoriesScroll = document.getElementById('categoriesScroll');
        if (!categoriesScroll) return;

        categoriesScroll.innerHTML = '';

        // All Channels option
        const allOption = document.createElement('div');
        allOption.className = 'category-chip active';
        allOption.innerHTML = `
            <div class="category-icon">📺</div>
            <div class="category-info">
                <div class="category-name">ALL</div>
                <div class="category-count">${this.channels.length.toLocaleString()}</div>
            </div>
        `;
        allOption.onclick = () => this.selectCategory('all', allOption);
        categoriesScroll.appendChild(allOption);

        // Sort categories with custom priority order
        const categoryPriority = {
            'Sports': 1,
            'Cricket': 2,
            '[IN] INDIA': 3
        };

        const sortedCategories = Object.keys(this.categories).sort((a, b) => {
            const priorityA = categoryPriority[a] || 999;
            const priorityB = categoryPriority[b] || 999;
            
            if (priorityA !== priorityB) {
                return priorityA - priorityB;
            }
            
            // If same priority, sort by channel count (descending)
            return this.categories[b].length - this.categories[a].length;
        });

        // Category chips with enhanced styling
        sortedCategories.forEach(category => {
            const categoryChip = document.createElement('div');
            categoryChip.className = 'category-chip';

            // Special styling for pinned sections
            if (category === '[IN] INDIA') {
                categoryChip.classList.add('category-pinned-india');
            } else if (category === 'Sports') {
                categoryChip.classList.add('category-pinned-sports');
            } else if (category === 'Cricket') {
                categoryChip.classList.add('category-pinned-cricket');
            }

            const icon = this.getCategoryIcon(category);
            const displayName = category.replace('[IN] ', '');

            categoryChip.innerHTML = `
                <div class="category-icon">${icon}</div>
                <div class="category-info">
                    <div class="category-name">${displayName}</div>
                    <div class="category-count">${this.categories[category].length.toLocaleString()}</div>
                </div>
            `;
            categoryChip.onclick = () => this.selectCategory(category, categoryChip);
            categoriesScroll.appendChild(categoryChip);
        });

        // Setup category scrolling
        this.setupCategoryScrolling();
    },

    // Get category icon
    getCategoryIcon(category) {
        const icons = {
            '[IN] INDIA': '🇮🇳',
            'Sports': '🏆',
            'Cricket': '🏏',
            'News': '📰',
            'Movies': '🎬',
            'Music': '🎵',
            'Kids': '👶',
            'General': '📺',
            'Entertainment': '🎭',
            'Documentary': '📖',
            'Religious': '🙏'
        };
        return icons[category] || '📺';
    },

    // Setup category scrolling
    setupCategoryScrolling() {
        const scrollContainer = document.getElementById('categoriesScroll');
        const prevBtn = document.getElementById('categoryPrevBtn');
        const nextBtn = document.getElementById('categoryNextBtn');

        if (!scrollContainer || !prevBtn || !nextBtn) return;

        // Check scroll buttons visibility
        const updateScrollButtons = () => {
            const { scrollLeft, scrollWidth, clientWidth } = scrollContainer;
            prevBtn.style.display = scrollLeft > 0 ? 'flex' : 'none';
            nextBtn.style.display = scrollLeft < scrollWidth - clientWidth ? 'flex' : 'none';
        };

        scrollContainer.addEventListener('scroll', updateScrollButtons);
        updateScrollButtons();
    },

    // Scroll categories
    scrollCategories(direction) {
        const scrollContainer = document.getElementById('categoriesScroll');
        if (!scrollContainer) return;

        const scrollAmount = 200;
        const currentScroll = scrollContainer.scrollLeft;

        if (direction === 'prev') {
            scrollContainer.scrollTo({
                left: currentScroll - scrollAmount,
                behavior: 'smooth'
            });
        } else {
            scrollContainer.scrollTo({
                left: currentScroll + scrollAmount,
                behavior: 'smooth'
            });
        }
    },

    // Select category
    selectCategory(category, element) {
        // Update active category
        document.querySelectorAll('.category-chip').forEach(item => {
            item.classList.remove('active');
        });
        element.classList.add('active');

        if (category === 'all') {
            this.filteredChannels = [...this.channels];
        } else {
            this.filteredChannels = this.categories[category] || [];
        }

        // Update channel count
        const channelCount = document.getElementById('channelCount');
        if (channelCount) {
            channelCount.textContent = this.filteredChannels.length.toLocaleString();
        }

        // Reset virtual scrolling
        this.virtualScrolling.visibleStart = 0;
        this.virtualScrolling.visibleEnd = 0;
        this.virtualScrolling.totalItems = this.filteredChannels.length;

        // Reset scroll position
        const container = document.getElementById('virtualScrollContainer');
        if (container) {
            container.scrollTop = 0;
        }

        this.updateVirtualScrolling();
    },

    // Setup virtual scrolling for large datasets
    setupVirtualScrolling() {
        const container = document.getElementById('virtualScrollContainer');
        if (!container) return;

        // Set up scroll listener with throttling
        let scrollTimeout;
        container.addEventListener('scroll', () => {
            if (scrollTimeout) {
                clearTimeout(scrollTimeout);
            }
            scrollTimeout = setTimeout(() => {
                this.handleVirtualScroll();
            }, 16); // ~60fps
        });

        // Set initial container height
        this.virtualScrolling.containerHeight = container.clientHeight;

        // Handle window resize
        window.addEventListener('resize', () => {
            this.virtualScrolling.containerHeight = container.clientHeight;
            this.updateVirtualScrolling();
        });
    },

    // Handle virtual scroll events
    handleVirtualScroll() {
        const container = document.getElementById('virtualScrollContainer');
        if (!container) return;

        this.virtualScrolling.scrollTop = container.scrollTop;
        this.updateVirtualScrolling();
    },

    // Update virtual scrolling calculations
    updateVirtualScrolling() {
        const { itemHeight, containerHeight, scrollTop, bufferSize } = this.virtualScrolling;
        const totalItems = this.filteredChannels.length;

        if (totalItems === 0) return;

        // Calculate visible range
        const visibleStart = Math.max(0, Math.floor(scrollTop / itemHeight) - bufferSize);
        const visibleCount = Math.ceil(containerHeight / itemHeight) + (bufferSize * 2);
        const visibleEnd = Math.min(totalItems, visibleStart + visibleCount);

        // Only update if range changed significantly
        if (Math.abs(visibleStart - this.virtualScrolling.visibleStart) > bufferSize ||
            Math.abs(visibleEnd - this.virtualScrolling.visibleEnd) > bufferSize) {

            this.virtualScrolling.visibleStart = visibleStart;
            this.virtualScrolling.visibleEnd = visibleEnd;
            this.virtualScrolling.totalItems = totalItems;

            this.renderVirtualChannels();
        }
    },

    // Render only visible channels for performance
    renderVirtualChannels() {
        const channelsList = document.getElementById('channelsList');
        const scrollContent = document.getElementById('virtualScrollContent');
        if (!channelsList || !scrollContent) return;

        const { visibleStart, visibleEnd, itemHeight, totalItems } = this.virtualScrolling;

        // Set total height for scrollbar
        const totalHeight = totalItems * itemHeight;
        scrollContent.style.height = `${totalHeight}px`;

        // Clear existing content
        channelsList.innerHTML = '';

        // Set list position
        channelsList.style.transform = `translateY(${visibleStart * itemHeight}px)`;

        // Render visible items
        const visibleChannels = this.filteredChannels.slice(visibleStart, visibleEnd);

        // Use document fragment for better performance
        const fragment = document.createDocumentFragment();

        visibleChannels.forEach((channel, index) => {
            const channelItem = this.createChannelListItem(channel, visibleStart + index);
            fragment.appendChild(channelItem);
        });

        channelsList.appendChild(fragment);
    },

    // Create channel list item (optimized for performance)
    createChannelListItem(channel, index) {
        const item = document.createElement('div');
        item.className = 'channel-card';
        item.setAttribute('data-channel-id', channel.id);

        // Use placeholder for logo initially
        const logoPlaceholder = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2260%22 height=%2260%22%3E%3Crect width=%2260%22 height=%2260%22 fill=%22%23444%22 rx=%2212%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 fill=%22%2300d4ff%22 text-anchor=%22middle%22 dy=%22.3em%22 font-size=%2220%22%3E📺%3C/text%3E%3C/svg%3E';

        item.innerHTML = `
            <div class="channel-card-inner">
                <div class="channel-logo-container">
                    <img src="${logoPlaceholder}" 
                         data-src="${channel.logo || logoPlaceholder}" 
                         alt="${channel.name}" 
                         class="channel-logo lazy-load" />
                </div>
                <div class="channel-info">
                    <div class="channel-name" title="${channel.name}">${channel.name}</div>
                    <div class="channel-category">${channel.group}</div>
                </div>
                <div class="channel-actions">
                    <button class="play-btn" onclick="LiveTVModule.playChannel('${channel.id}')" title="Play Channel">
                        ▶
                    </button>
                </div>
            </div>
        `;

        // Add click handler for the entire item
        item.onclick = (e) => {
            if (!e.target.closest('button')) {
                this.playChannel(channel.id);
            }
        };

        // Setup lazy loading for images
        this.setupLazyLoading(item);

        return item;
    },

    // Setup lazy loading for images
    setupLazyLoading(item) {
        const img = item.querySelector('.lazy-load');
        if (!img) return;

        // Use Intersection Observer for lazy loading
        if (!this.imageObserver) {
            this.imageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        const src = img.dataset.src;

                        if (src && src !== img.src) {
                            img.src = src;
                            img.onload = () => {
                                img.classList.add('loaded');
                            };
                            img.onerror = () => {
                                img.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22%3E%3Crect width=%2240%22 height=%2240%22 fill=%22%23333%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 fill=%22%23666%22 text-anchor=%22middle%22 dy=%22.3em%22 font-size=%2212%22%3E📺%3C/text%3E%3C/svg%3E';
                            };
                        }
                        this.imageObserver.unobserve(img);
                    }
                });
            }, {
                rootMargin: '50px'
            });
        }

        this.imageObserver.observe(img);
    },

    // Render all channels (initial load)
    renderAllChannels() {
        this.filteredChannels = [...this.channels];
        this.virtualScrolling.totalItems = this.filteredChannels.length;
        this.updateVirtualScrolling();
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
                <div class="playing-channel-info">
                    <div class="live-indicator">🔴 LIVE</div>
                    <h3 class="playing-channel-name">${channel.name}</h3>
                    <div class="playing-channel-category">${channel.group}</div>
                    <div class="channel-actions-info">
                        <button onclick="LiveTVModule.copyStreamUrl('${channel.url}')" class="copy-url-btn">
                            📋 Copy URL
                        </button>
                        <button onclick="LiveTVModule.hideChannelInfo()" class="copy-url-btn">
                            ✕ Hide
                        </button>
                    </div>
                </div>
            `;
        }

        // Play stream
        const video = document.getElementById('liveTVVideo');
        if (video) {
            try {
                console.log('📺 Stream URL:', channel.url);

                // Destroy existing HLS instance if any
                if (this.hls) {
                    this.hls.destroy();
                    this.hls = null;
                }

                // Check if it's an M3U8/HLS stream
                if (channel.url.includes('.m3u8') || channel.url.includes('m3u8')) {
                    if (Hls.isSupported()) {
                        console.log('📺 Using HLS.js for M3U8 stream');
                        this.hls = new Hls({
                            debug: false,
                            enableWorker: true,
                            lowLatencyMode: true,
                            backBufferLength: 90
                        });
                        
                        this.hls.loadSource(channel.url);
                        this.hls.attachMedia(video);
                        
                        this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
                            console.log('📺 HLS manifest parsed, starting playback');
                            video.play().catch(e => {
                                console.error('❌ HLS playback error:', e);
                                this.showToast(`❌ Failed to play ${channel.name}`, 'error');
                            });
                        });

                        this.hls.on(Hls.Events.ERROR, (event, data) => {
                            console.error('❌ HLS error:', data);
                            if (data.fatal) {
                                switch (data.type) {
                                    case Hls.ErrorTypes.NETWORK_ERROR:
                                        console.log('📺 Network error, trying to recover...');
                                        this.hls.startLoad();
                                        break;
                                    case Hls.ErrorTypes.MEDIA_ERROR:
                                        console.log('📺 Media error, trying to recover...');
                                        this.hls.recoverMediaError();
                                        break;
                                    default:
                                        console.error('❌ Fatal HLS error, cannot recover');
                                        this.showToast(`❌ Stream error for ${channel.name}`, 'error');
                                        break;
                                }
                            }
                        });

                    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                        // Safari native HLS support
                        console.log('📺 Using native HLS support');
                        video.src = channel.url;
                        await video.play();
                    } else {
                        throw new Error('HLS not supported in this browser');
                    }
                } else {
                    // Regular video file
                    console.log('📺 Using native video player');
                    video.src = channel.url;
                    video.load();
                    await video.play();
                }

                this.showToast(`📺 Now playing: ${channel.name}`, 'success');

                // Highlight selected channel
                document.querySelectorAll('.channel-card').forEach(item => {
                    item.classList.remove('active');
                });
                const channelElement = document.querySelector(`[data-channel-id="${channelId}"]`);
                if (channelElement) {
                    channelElement.classList.add('active');
                }

            } catch (error) {
                console.error('❌ Failed to play channel:', error);
                this.showToast(`❌ Failed to play ${channel.name}: ${error.message}`, 'error');
            }
        }
    },

    // Search channels
    searchChannels(query) {
        if (!query.trim()) {
            this.renderAllChannels();
            // Reset category selection
            document.querySelectorAll('.category-chip').forEach(item => {
                item.classList.remove('active');
            });
            document.querySelector('.category-chip').classList.add('active');
            return;
        }

        const searchTerm = query.toLowerCase();
        this.filteredChannels = this.channels.filter(channel => {
            return channel.name.toLowerCase().includes(searchTerm) ||
                channel.group.toLowerCase().includes(searchTerm);
        });

        // Update channel count
        const channelCount = document.getElementById('channelCount');
        if (channelCount) {
            channelCount.textContent = this.filteredChannels.length.toLocaleString();
        }

        // Reset virtual scrolling
        this.virtualScrolling.visibleStart = 0;
        this.virtualScrolling.visibleEnd = 0;
        this.virtualScrolling.totalItems = this.filteredChannels.length;

        // Reset scroll position
        const container = document.getElementById('virtualScrollContainer');
        if (container) {
            container.scrollTop = 0;
        }

        this.updateVirtualScrolling();

        // Clear category selection during search
        document.querySelectorAll('.category-chip').forEach(item => {
            item.classList.remove('active');
        });
    },

    // Refresh channels
    async refreshChannels() {
        try {
            this.showLoading(true, 'Refreshing channels...');

            // Clear stored channels to force fresh load
            localStorage.removeItem('liveTVChannels');
            this.channels = [];
            this.categories = {};

            await this.loadPlaylist();
            this.categorizeChannels();
            this.renderCategories();
            this.renderAllChannels();
            this.showToast(`🔄 Refreshed ${this.channels.length.toLocaleString()} channels`, 'success');
        } catch (error) {
            console.error('❌ Failed to refresh channels:', error);
            this.showToast('❌ Failed to refresh channels', 'error');
        } finally {
            this.showLoading(false);
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

    // Hide channel info
    hideChannelInfo() {
        const channelInfo = document.getElementById('currentChannelInfo');
        if (channelInfo) {
            channelInfo.style.display = 'none';
        }
    },

    // Exit fullscreen mode
    exitFullscreen() {
        const container = document.querySelector('.livetv-container');
        if (container) {
            container.style.display = 'none';
        }

        // Stop video and cleanup HLS
        const video = document.getElementById('liveTVVideo');
        if (video) {
            video.pause();
            video.src = '';
        }
        
        // Destroy HLS instance
        if (this.hls) {
            this.hls.destroy();
            this.hls = null;
        }

        // Go back to main app
        if (window.showView) {
            window.showView('home');
        }
    },

    // Save channels to storage
    saveChannelsToStorage() {
        try {
            // Only save essential data to reduce storage size
            const essentialData = this.channels.map(channel => ({
                id: channel.id,
                name: channel.name,
                url: channel.url,
                group: channel.group,
                logo: channel.logo
            }));

            localStorage.setItem('liveTVChannels', JSON.stringify(essentialData));
        } catch (error) {
            console.error('❌ Failed to save channels to storage:', error);
        }
    },

    // Load channels from storage
    loadChannelsFromStorage() {
        try {
            const stored = localStorage.getItem('liveTVChannels');
            if (stored) {
                this.channels = JSON.parse(stored);
                return true;
            }
        } catch (error) {
            console.error('❌ Failed to load channels from storage:', error);
        }
        return false;
    },

    // Utility functions
    showLoading(show = true, message = 'Loading...') {
        if (window.showLoading) {
            window.showLoading(show, message);
        }
    },

    showToast(message, type = 'info', duration = 3000) {
        if (window.showToast) {
            window.showToast(message, type, duration);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
};

// Load Live TV page function
async function loadLiveTVPage() {
    console.log('📺 Loading Live TV page...');

    try {
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

        console.log('✅ Live TV page loaded successfully');

    } catch (error) {
        console.error('❌ Error loading Live TV page:', error);
    }
}

// Make functions globally accessible
window.LiveTVModule = LiveTVModule;
window.loadLiveTVPage = loadLiveTVPage;