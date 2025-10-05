// Main App State.
const state = {
    providers: [],
    selectedProvider: null,
    currentView: 'home',
    currentMeta: null,
    currentStreams: [],
    searchQuery: '',
    currentPage: 1,
    currentFilter: '', // Track current filter for pagination
    retryCount: 0,
    maxRetries: 3,
    isVideoPlaying: false, // Track video playback state
};

// Expose state and API_BASE globally for modules
window.state = state;

// API Base URL
const API_BASE = window.location.origin;
window.API_BASE = API_BASE;

// Utility Functions
function showLoading(show = true, message = 'Loading...') {
    const loadingEl = document.getElementById('loading');
    if (show) {
        loadingEl.querySelector('p').textContent = message;
        loadingEl.style.display = 'block';
    } else {
        loadingEl.style.display = 'none';
    }
}

function showToast(message, type = 'info', duration = 1000) {
    // Create toast container if not exists
    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        toastContainer.style.cssText = 'position: fixed; top: 80px; right: 20px; z-index: 10000; display: flex; flex-direction: column; gap: 10px;';
        document.body.appendChild(toastContainer);
    }
    
    const toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.style.cssText = `
        background: ${type === 'error' ? '#e50914' : type === 'success' ? '#4CAF50' : '#333'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        min-width: 250px;
        max-width: 400px;
        animation: slideInRight 0.3s ease;
        display: flex;
        align-items: center;
        gap: 10px;
    `;
    
    const icon = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    toast.innerHTML = `<span style="font-size: 18px;">${icon}</span><span style="flex: 1;">${message}</span>`;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

function showError(message, downloadLink = null) {
    const errorEl = document.getElementById('errorMessage');
    
    // Clear previous content
    errorEl.innerHTML = '';
    
    // Create message element
    const messageDiv = document.createElement('div');
    messageDiv.style.whiteSpace = 'pre-wrap';
    messageDiv.textContent = message;
    errorEl.appendChild(messageDiv);
    
    // Add download button if link provided
    if (downloadLink) {
        const downloadBtn = document.createElement('button');
        downloadBtn.textContent = '⬇️ Download File';
        downloadBtn.style.cssText = 'margin-top: 10px; padding: 8px 16px; background: #e50914; border: none; border-radius: 4px; color: white; cursor: pointer; font-size: 14px;';
        downloadBtn.onclick = () => {
            console.log('Opening download link:', downloadLink);
            window.open(downloadLink, '_blank');
        };
        errorEl.appendChild(downloadBtn);
    }
    
    errorEl.style.display = 'block';
    
    // Also show toast
    showToast(message.split('\n')[0], 'error', downloadLink ? 10000 : 2000);
    
    // Auto-hide  (longer for errors with download links)
    setTimeout(() => {
        errorEl.style.display = 'none';
    }, downloadLink ? 15000 : 2000);
}

function hideAllViews() {
    document.querySelectorAll('.view').forEach(view => {
        view.style.display = 'none';
    });
}

function showView(viewName) {
    hideAllViews();
    
    // Clear error messages when navigating away from player
    if (state.currentView === 'player' && viewName !== 'player') {
        const errorEl = document.getElementById('errorMessage');
        if (errorEl) {
            errorEl.style.display = 'none';
            errorEl.innerHTML = '';
        }
    }
    
    const viewMap = {
        home: 'homeView',
        search: 'searchView',
        details: 'detailsView',
        player: 'playerView',
        explore: 'exploreView',
        movies: 'moviesView',
        tvshows: 'tvShowsView',
        newUpdates: 'newUpdatesView',
        history: 'historyView',
        bollywood: 'bollywoodView',
        genre: 'genreView',
        topStar: 'topStarView',
        popularStar: 'popularStarView',
        popularStarsAll: 'popularStarsAllView',
    };
    const viewId = viewMap[viewName];
    if (viewId) {
        document.getElementById(viewId).style.display = 'block';
    }
    state.currentView = viewName;
}

// API Calls
async function fetchProviders() {
    console.log('📡 Fetching providers from:', `${API_BASE}/api/providers`);
    try {
        const response = await fetch(`${API_BASE}/api/providers`);
        console.log('📡 Provider response status:', response.status);
        if (!response.ok) throw new Error('Failed to fetch providers');
        const providers = await response.json();
        console.log('✅ Providers loaded:', providers.length, 'providers');
        console.log('📋 Provider list:', providers.map(p => p.value));
        state.providers = providers;
        return providers;
    } catch (error) {
        console.error('❌ Error fetching providers:', error);
        showError('Failed to load providers. Make sure the server is running and built.');
        return [];
    }
}

async function fetchCatalog(provider) {
    const response = await fetch(`${API_BASE}/api/${provider}/catalog`);
    if (!response.ok) throw new Error('Failed to fetch catalog');
    return response.json();
}

async function fetchPosts(provider, filter = '', page = 1) {
    const response = await fetch(`${API_BASE}/api/${provider}/posts?filter=${encodeURIComponent(filter)}&page=${page}`);
    if (!response.ok) throw new Error('Failed to fetch posts');
    const data = await response.json();
    
    // Handle different response formats
    if (Array.isArray(data)) {
        // Direct array response - wrap it in an object with pagination info
        return {
            posts: data,
            hasNextPage: false // Default to false for array responses
        };
    } else if (data && typeof data === 'object') {
        // Already in the expected format
        return data;
    } else {
        // Unexpected format - return empty structure
        return {
            posts: [],
            hasNextPage: false
        };
    }
}

async function searchPosts(provider, query, page = 1) {
    try {
        const response = await fetch(`${API_BASE}/api/${provider}/search?query=${encodeURIComponent(query)}&page=${page}`);
        if (!response.ok) {
            console.warn(`Search failed for provider ${provider} with status ${response.status}`);
            // Return empty structure instead of throwing error
            return {
                posts: [],
                hasNextPage: false,
                provider: provider
            };
        }
        const data = await response.json();
        
        // Handle different response formats
        if (Array.isArray(data)) {
            // Direct array response - wrap it in an object with pagination info
            return {
                posts: data,
                hasNextPage: false, // Default to false for array responses
                provider: provider
            };
        } else if (data && typeof data === 'object') {
            // Already in the expected format
            return {
                ...data,
                provider: provider
            };
        } else {
            // Unexpected format - return empty structure
            return {
                posts: [],
                hasNextPage: false,
                provider: provider
            };
        }
    } catch (error) {
        console.warn(`Search failed for provider ${provider}:`, error);
        // Return empty structure instead of throwing error
        return {
            posts: [],
            hasNextPage: false,
            provider: provider
        };
    }
}

async function fetchMeta(provider, link) {
    const response = await fetch(`${API_BASE}/api/${provider}/meta?link=${encodeURIComponent(link)}`);
    if (!response.ok) throw new Error('Failed to fetch metadata');
    return response.json();
}

async function fetchEpisodes(provider, url) {
    const response = await fetch(`${API_BASE}/api/${provider}/episodes?url=${encodeURIComponent(url)}`);
    if (!response.ok) throw new Error('Failed to fetch episodes');
    return response.json();
}

async function fetchStream(provider, link, type = 'movie') {
    const url = `${API_BASE}/api/${provider}/stream?link=${encodeURIComponent(link)}&type=${type}`;
    console.log('🎥 Fetching stream:', {provider, link, type, url});
    const response = await fetch(url);
    console.log('🎥 Stream response status:', response.status);
    if (!response.ok) throw new Error('Failed to fetch stream');
    const streams = await response.json();
    console.log('✅ Streams received:', streams.length, 'options');
    streams.forEach((s, i) => {
        console.log(`  Stream ${i}:`, {
            server: s.server,
            type: s.type,
            quality: s.quality,
            requiresExtraction: s.requiresExtraction,
            linkPreview: s.link.substring(0, 80) + '...'
        });
    });
    return streams;
}

// UI Rendering Functions
function renderProviderSelect(providers) {
    const select = document.getElementById('providerSelect');
    select.innerHTML = '<option value="">Select Provider...</option>';
    
    providers.forEach(provider => {
        const option = document.createElement('option');
        option.value = provider.value;
        option.textContent = `${provider.display_name} (${provider.type})`;
        select.appendChild(option);
    });
}

function renderPostCard(post, provider) {
    const card = document.createElement('div');
    card.className = 'post-card';
    
    // Use the provider from the post object if available (for search results)
    const displayProvider = post.provider || provider;
    
    card.innerHTML = `
        <img src="${post.image}" alt="${post.title}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22300%22%3E%3Crect width=%22200%22 height=%22300%22 fill=%22%23333%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 fill=%22%23666%22 text-anchor=%22middle%22 dy=%22.3em%22%3ENo Image%3C/text%3E%3C/svg%3E'" />
        <div class="post-card-content">
            <h3>${post.title}</h3>
            <span class="provider-badge">${displayProvider}</span>
        </div>
    `;
    
    card.addEventListener('click', () => {
        // Use the provider from the post object if available (for search results)
        const targetProvider = post.provider || provider;
        loadDetails(targetProvider, post.link);
    });
    
    return card;
}

function renderPosts(posts, containerId, provider) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    
    if (posts.length === 0) {
        container.innerHTML = '<p style="color: #b3b3b3;">No results found.</p>';
        return;
    }
    
    posts.forEach(post => {
        container.appendChild(renderPostCard(post, provider));
    });
}

function renderPagination(containerOrId, currentPage, hasNext, callbackPrefix) {
    // Accept either an element or an ID
    const container = typeof containerOrId === 'string' 
        ? document.getElementById(containerOrId) 
        : containerOrId;
    
    if (container) {
        container.innerHTML = `
            <button ${currentPage === 1 ? 'disabled' : ''} onclick="${callbackPrefix}${currentPage - 1})">Previous</button>
            <span class="page-info">Page ${currentPage}</span>
            <button ${!hasNext ? 'disabled' : ''} onclick="${callbackPrefix}${currentPage + 1})">Next</button>
        `;
    } else {
        console.warn(`Pagination container not found:`, containerOrId);
    }
}

// Updated function to render a full catalog section with pagination
async function renderCatalogSection(provider, catalogItem, page = 1) {
    try {
        showLoading();
        const data = await fetchPosts(provider, catalogItem.filter, page);
        
        // Handle different response formats
        let posts, hasNext;
        
        // Check if data is an array (direct Post[] response)
        if (Array.isArray(data)) {
            posts = data;
            hasNext = false; // Default to false for array responses
        } 
        // Check if data has posts property (object with posts and pagination)
        else if (data && typeof data === 'object') {
            posts = data.posts || data;
            hasNext = data.hasNextPage || (Array.isArray(posts) && posts.length >= 20);
        } 
        // Fallback for unexpected response format
        else {
            posts = [];
            hasNext = false;
        }
        
        const section = document.createElement('div');
        section.className = 'catalog-section';
        section.innerHTML = `
            <div class="section-header">
                <h2>${catalogItem.title}</h2>
                <button class="view-all-btn" onclick="loadFullCatalog('${provider}', '${catalogItem.filter}', '${catalogItem.title}')">View All</button>
            </div>
        `;
        
        const grid = document.createElement('div');
        grid.className = 'posts-grid';
        
        if (!Array.isArray(posts) || posts.length === 0) {
            grid.innerHTML = '<p style="color: #b3b3b3; grid-column: 1 / -1;">No content available in this section.</p>';
        } else {
            // Show more posts (increased from 12 to 20)
            posts.slice(0, 20).forEach(post => {
                grid.appendChild(renderPostCard(post, provider));
            });
        }
        
        section.appendChild(grid);
        
        // Add pagination if needed
        // Only show pagination if we have posts and either:
        // 1. The response explicitly indicates there's a next page, or
        // 2. We have 20 or more posts (assuming this indicates more available)
        if (Array.isArray(posts) && posts.length > 0 && (hasNext || posts.length >= 20)) {
            const paginationContainer = document.createElement('div');
            paginationContainer.className = 'section-pagination';
            paginationContainer.id = `pagination-${catalogItem.title.replace(/\s+/g, '-')}-${page}`;
            section.appendChild(paginationContainer);
            
            // Create a unique identifier for this catalog item
            const catalogItemId = `catalog-${provider}-${catalogItem.title.replace(/\s+/g, '-')}`;
            
            // Store the catalog item data in a global object for access in the pagination function
            if (!window.catalogItems) window.catalogItems = {};
            window.catalogItems[catalogItemId] = catalogItem;
            
            // Pass the element directly instead of ID since section isn't in DOM yet
            renderPagination(
                paginationContainer,  // Pass element instead of ID
                page, 
                hasNext, 
                `reloadCatalogSection('${provider}', '${catalogItemId}', `
            );
        }
        
        showLoading(false);
        return section;
    } catch (error) {
        console.error(`Error rendering section ${catalogItem.title}:`, error);
        showLoading(false);
        return null;
    }
}

// Function to reload a catalog section with a specific page
async function reloadCatalogSection(provider, catalogItemId, page) {
    // Retrieve the catalog item data from the global object
    if (!window.catalogItems || !window.catalogItems[catalogItemId]) {
        console.error(`Catalog item with id '${catalogItemId}' not found`);
        return;
    }
    
    const catalogItem = window.catalogItems[catalogItemId];
    const sectionId = `section-${catalogItem.title.replace(/\s+/g, '-')}`;
    const container = document.getElementById('catalogSections');
    
    // Find and replace the section
    const newSection = await renderCatalogSection(provider, catalogItem, page);
    if (newSection) {
        newSection.id = sectionId;
        const oldSection = document.getElementById(sectionId);
        if (oldSection) {
            container.replaceChild(newSection, oldSection);
        } else {
            container.appendChild(newSection);
        }
    }
}

async function renderDetails(meta, provider) {
    const container = document.getElementById('detailsContent');
    
    container.innerHTML = `
        <div class="details-content">
            <img class="details-poster" src="${meta.image}" alt="${meta.title}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22450%22%3E%3Crect width=%22300%22 height=%22450%22 fill=%22%23333%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 fill=%22%23666%22 text-anchor=%22middle%22 dy=%22.3em%22%3ENo Poster%3C/text%3E%3C/svg%3E'" />
            <div class="details-info">
                <h1>${meta.title}</h1>
                <div class="details-meta">
                    <span class="meta-item">Type: ${meta.type || 'N/A'}</span>
                    ${meta.rating ? `<span class="meta-item">⭐ ${meta.rating}</span>` : ''}
                    ${meta.imdbId ? `<span class="meta-item">IMDb: ${meta.imdbId}</span>` : ''}
                </div>
                <p class="details-synopsis">${meta.synopsis || 'No synopsis available.'}</p>
                ${meta.tags && meta.tags.length > 0 ? `
                    <div class="details-tags">
                        ${meta.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </div>
                ` : ''}
                ${meta.cast && meta.cast.length > 0 ? `
                    <div class="details-cast">
                        <h3>Cast:</h3>
                        <p style="color: #b3b3b3;">${meta.cast.join(', ')}</p>
                    </div>
                ` : ''}
                <div id="seasonSelector"></div>
            </div>
        </div>
        <div id="tmdbRecommendations" style="margin-top: 40px;"></div>
    `;
    
    // Render seasons/episodes
    if (meta.linkList && meta.linkList.length > 0) {
        renderSeasonSelector(meta.linkList, provider, meta.type);
    }
    
    // Load TMDB recommendations and similar content
    loadTMDBRecommendationsForDetails(meta.title, meta.type);
}

function renderSeasonSelector(linkList, provider, type) {
    const container = document.getElementById('seasonSelector');
    
    container.innerHTML = `
        <div class="season-selector">
            <h3>Select Season/Quality:</h3>
            <select id="seasonSelect">
                ${linkList.map((item, index) => `
                    <option value="${index}">${item.title} ${item.quality ? `(${item.quality})` : ''}</option>
                `).join('')}
            </select>
            <div id="episodesList" class="episodes-list"></div>
        </div>
    `;
    
    const select = document.getElementById('seasonSelect');
    select.addEventListener('change', (e) => {
        const selectedIndex = e.target.value;
        renderEpisodes(linkList[selectedIndex], provider, type);
    });
    
    // Render first season by default
    renderEpisodes(linkList[0], provider, type);
}

async function renderEpisodes(linkItem, provider, type) {
    const container = document.getElementById('episodesList');
    container.innerHTML = '<p style="color: #b3b3b3;">Loading episodes...</p>';
    
    try {
        let episodes = [];
        
        // Check if we have direct links or need to fetch episodes
        if (linkItem.directLinks && linkItem.directLinks.length > 0) {
            episodes = linkItem.directLinks;
        } else if (linkItem.episodesLink) {
            episodes = await fetchEpisodes(provider, linkItem.episodesLink);
        }
        
        if (episodes.length === 0) {
            container.innerHTML = '<p style="color: #b3b3b3;">No episodes available.</p>';
            return;
        }
        
        container.innerHTML = '';
        episodes.forEach(episode => {
            const card = document.createElement('div');
            card.className = 'episode-card';
            card.innerHTML = `
                <h4>${episode.title}</h4>
                ${linkItem.quality ? `<span class="quality">${linkItem.quality}</span>` : ''}
            `;
            
            card.addEventListener('click', () => {
                loadPlayer(provider, episode.link, episode.type || type);
            });
            
            container.appendChild(card);
        });
    } catch (error) {
        console.error('Error loading episodes:', error);
        container.innerHTML = '<p style="color: #e50914;">Failed to load episodes.</p>';
    }
}

function renderStreamSelector(streams, provider) {
    console.log('🎬 renderStreamSelector called', {streams, provider, streamCount: streams.length});
    const container = document.getElementById('streamSelector');
    
    if (streams.length === 0) {
        console.warn('⚠️ No streams available');
        container.innerHTML = '<p style="color: #b3b3b3;">No streams available.</p>';
        return;
    }
    
    console.log('✅ Rendering', streams.length, 'stream options');
    container.innerHTML = `
        <h3>Available Streams:</h3>
        <p style="color: #b3b3b3; font-size: 14px; margin-bottom: 10px;">
            💡 If a stream doesn't play, try another one below or use the download button.
        </p>
        <div class="stream-options"></div>
    `;
    
    const optionsContainer = container.querySelector('.stream-options');
    streams.forEach((stream, index) => {
        console.log(`📺 Processing stream ${index}:`, {
            server: stream.server,
            link: stream.link,
            type: stream.type,
            quality: stream.quality,
            requiresExtraction: stream.requiresExtraction
        });
        
        const option = document.createElement('div');
        option.className = `stream-option ${index === 0 ? 'active' : ''}`;
        
        // Check if MKV FIRST before using the variable
        const isMKV = stream.link.toLowerCase().includes('.mkv');
        console.log(`  - Is MKV: ${isMKV}`);
        
        // Add indicators for special streams
        let indicator = '';
        if (stream.requiresExtraction) {
            indicator = '<span style="font-size: 11px; color: #ffa500;">⚠️ Needs extraction</span>';
            console.log('  - Marked for extraction');
        } else if (isMKV) {
            indicator = '<span style="font-size: 11px; color: #4CAF50;">✓ Direct link</span>';
            console.log('  - Direct MKV link detected');
        }
        
        option.innerHTML = `
            <h4>${stream.server}</h4>
            ${stream.quality ? `<span class="quality">${stream.quality}p</span>` : ''}
            <span class="quality">${stream.type}</span>
            ${indicator}
            <div style="margin-top: 8px; display: flex; gap: 8px;">
                <button class="play-btn" style="padding: 5px 12px; background: #e50914; border: none; border-radius: 4px; color: white; cursor: pointer; font-size: 12px;">
                    ▶️ Play
                </button>
                ${isMKV || stream.requiresExtraction ? `
                    <button class="download-btn" style="padding: 5px 12px; background: #333; border: none; border-radius: 4px; color: white; cursor: pointer; font-size: 12px;">
                        ⬇️ Download
                    </button>
                ` : ''}
            </div>
        `;
        
        const playBtn = option.querySelector('.play-btn');
        playBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.stream-option').forEach(el => el.classList.remove('active'));
            option.classList.add('active');
            playStream(stream);
        });
        
        const downloadBtn = option.querySelector('.download-btn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                
                let downloadUrl = stream.link;
                
                // Only extract if needed
                if (stream.requiresExtraction) {
                    showLoading();
                    try {
                        const response = await fetch(`${API_BASE}/api/proxy/stream?url=${encodeURIComponent(stream.link)}`);
                        if (response.ok) {
                            const data = await response.json();
                            downloadUrl = data.streamUrl;
                        } else {
                            showError('Could not extract download link. The URL might already be direct.');
                        }
                    } catch (error) {
                        console.error('Extraction error:', error);
                        showError('Extraction failed. Opening original link...');
                    }
                    showLoading(false);
                }
                
                // Open download in new tab
                console.log('Opening download URL:', downloadUrl);
                window.open(downloadUrl, '_blank');
            });
        }
        
        optionsContainer.appendChild(option);
    });
}

async function playStream(stream) {
    console.log('▶️ playStream called with:', {
        server: stream.server,
        type: stream.type,
        quality: stream.quality,
        requiresExtraction: stream.requiresExtraction,
        linkPreview: stream.link.substring(0, 100)
    });
    
    // Clear any previous error messages
    const errorEl = document.getElementById('errorMessage');
    if (errorEl) {
        errorEl.style.display = 'none';
        errorEl.innerHTML = '';
    }
    
    const video = document.getElementById('videoPlayer');
    console.log('📺 Video element:', video ? 'Found' : 'NOT FOUND');
    
    // Mark video as playing
    state.isVideoPlaying = true;
    
    try {
        let streamUrl = stream.link;
        
        // Check if stream needs extraction
        if (stream.requiresExtraction) {
            showLoading();
            console.log(`⚠️ Stream requires extraction: ${stream.extractionService}`);
            
            try {
                const extractUrl = `${API_BASE}/api/proxy/stream?url=${encodeURIComponent(stream.link)}`;
                console.log('🔄 Calling extraction endpoint:', extractUrl);
                const response = await fetch(extractUrl);
                console.log('🔄 Extraction response status:', response.status);
                if (!response.ok) {
                    throw new Error('Failed to extract stream URL');
                }
                const data = await response.json();
                streamUrl = data.streamUrl;
                console.log('✅ Extracted stream URL:', streamUrl);
            } catch (extractError) {
                console.error('❌ Extraction error:', extractError);
                console.log('ℹ️ Extraction failed - user can try another stream');
                showLoading(false);
                return;
            }
            showLoading(false);
        }

        // Check if stream has custom headers - use proxy for those
        let useProxy = false;
        if (stream.headers && Object.keys(stream.headers).length > 0) {
            console.log('🔐 Stream has custom headers, using video proxy:', Object.keys(stream.headers));
            const headersParam = encodeURIComponent(JSON.stringify(stream.headers));
            streamUrl = `${API_BASE}/api/proxy/video?url=${encodeURIComponent(streamUrl)}&headers=${headersParam}`;
            useProxy = true;
        }
        
        console.log('🎯 Attempting to play:', useProxy ? '[via proxy]' : '[direct]', streamUrl.substring(0, 100));
        
        // Check file type
        const isMKV = streamUrl.toLowerCase().includes('.mkv');
        const isMP4 = streamUrl.toLowerCase().includes('.mp4');
        const isM3U8 = stream.type === 'm3u8' || streamUrl.includes('.m3u8');
        
        console.log('📊 Stream analysis:', {isMKV, isMP4, isM3U8, streamUrl: streamUrl.substring(0, 100)});
        
        if (isMKV) {
            console.log('⚠️ MKV format detected - prompting user');
            // MKV files often don't play in browsers - offer download immediately
            const tryPlay = confirm('MKV format detected. This format usually doesn\'t play in browsers.\n\nClick OK to try playing anyway, or Cancel to download the file.');
            if (!tryPlay) {
                console.log('📥 User chose to download MKV');
                window.open(streamUrl, '_blank');
                return;
            }
            console.log('🎬 User chose to try playing MKV');
        }
        
        // Clear previous content
        console.log('🧹 Clearing previous video content');
        video.innerHTML = '';
        video.src = '';
        
        // Check if HLS stream
        if (isM3U8) {
            console.log('🎬 HLS stream detected, initializing hls.js');
            if (Hls.isSupported()) {
                console.log('✅ HLS.js is supported');
                if (window.currentHls) {
                    console.log('🧹 Destroying previous HLS instance');
                    window.currentHls.destroy();
                }
                
                const hls = new Hls({
                    enableWorker: true,
                    maxBufferLength: 30,
                    maxMaxBufferLength: 600,
                });
                
                console.log('🔗 Loading HLS source:', streamUrl.substring(0, 100));
                hls.loadSource(streamUrl);
                hls.attachMedia(video);
                
                hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    console.log('✅ HLS manifest parsed successfully');
                    video.play().catch(e => {
                        console.error('❌ HLS play error:', e);
                        showError('Failed to start playback: ' + e.message);
                    });
                });
                
                // Track video progress for HLS
                video.addEventListener('timeupdate', () => {
                    if (state.currentMeta && window.HistoryModule) {
                        const progress = video.currentTime;
                        const duration = video.duration;
                        if (duration > 0 && progress > 5) { // Only track after 5 seconds
                            window.HistoryModule.updateProgress(state.currentMeta.link, progress, duration);
                        }
                    }
                });
                
                hls.on(Hls.Events.ERROR, (event, data) => {
                    console.error('❌ HLS error:', data);
                    if (data.fatal) {
                        console.error('🛑 Fatal HLS error detected:', data.type);
                        switch (data.type) {
                            case Hls.ErrorTypes.NETWORK_ERROR:
                                console.error('🌐 Network error:', data.details);
                                showError('Network error while loading stream. Check your connection or try another source.');
                                break;
                            case Hls.ErrorTypes.MEDIA_ERROR:
                                console.error('🎥 Media error:', data.details);
                                showError('Media error. Try another quality or source.');
                                hls.recoverMediaError();
                                break;
                            default:
                                console.error('❓ Unknown HLS error:', data);
                                showError('Fatal playback error. Try another source.');
                                break;
                        }
                    }
                });
                
                window.currentHls = hls;
            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                // Native HLS support (Safari)
                video.src = streamUrl;
                video.addEventListener('loadedmetadata', () => {
                    video.play().catch(e => {
                        console.error('Play error:', e);
                        showError('Failed to start playback: ' + e.message);
                    });
                });
            } else {
                showError('HLS playback not supported in this browser.');
                return;
            }
        } else {
            // Direct video file
            console.log('🎬 Direct video playback mode');
            console.log('🔗 Setting video source:', streamUrl.substring(0, 100));
            video.src = streamUrl;
            
            // Track video progress
            video.addEventListener('timeupdate', () => {
                if (state.currentMeta && window.HistoryModule) {
                    const progress = video.currentTime;
                    const duration = video.duration;
                    if (duration > 0 && progress > 5) { // Only track after 5 seconds
                        window.HistoryModule.updateProgress(state.currentMeta.link, progress, duration);
                    }
                }
            });
            
            video.addEventListener('error', (e) => {
                console.error('❌ Video error event:', e);
                console.error('🚨 Video error object:', video.error);
                
                if (video.error) {
                    console.error('🐞 Error code:', video.error.code, 'Message:', video.error.message);
                    
                    switch (video.error.code) {
                            case MediaError.MEDIA_ERR_ABORTED:
                                console.error('⏹️ MEDIA_ERR_ABORTED - Video loading was aborted');
                                break;
                            case MediaError.MEDIA_ERR_NETWORK:
                                console.error('🌐 MEDIA_ERR_NETWORK - Network error while loading video');
                                break;
                            case MediaError.MEDIA_ERR_DECODE:
                                console.error('🐛 MEDIA_ERR_DECODE - Video format not supported or corrupted');
                                break;
                            case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
                                if (isMKV) {
                                    console.log('ℹ️ MKV format detected, not supported in browser');
                                } else {
                                    console.error('🚫 MEDIA_ERR_SRC_NOT_SUPPORTED - Video format not supported');
                                }
                                break;
                            default:
                                console.error('❓ Unknown video error:', video.error);
                                break;
                        }
                    }
                
                // Don't show error to user - just log to console
                console.log('ℹ️ Video error silently handled - user can try another stream');
            }, { once: true });
            
            console.log('▶️ Attempting to play video...');
            video.play().catch(e => {
                console.error('❌ Direct play error:', e);
                console.error('Error name:', e.name, 'Message:', e.message);
                // Don't show error to user - they can try another stream
                console.log('ℹ️ Playback error silently handled');
            });
        }
        
        // Add subtitles if available
        if (stream.subtitles && stream.subtitles.length > 0) {
            console.log('📑 Adding', stream.subtitles.length, 'subtitle tracks');
            stream.subtitles.forEach((subtitle, index) => {
                const track = document.createElement('track');
                track.kind = 'subtitles';
                track.label = subtitle.title || subtitle.language;
                track.srclang = subtitle.language || 'en';
                track.src = subtitle.uri;
                if (index === 0) track.default = true;
                video.appendChild(track);
                console.log(`  - Subtitle ${index}:`, subtitle.language, subtitle.title);
            });
        }
    } catch (error) {
        console.error('❌ Stream playback error:', error);
        console.error('Error stack:', error.stack);
        // Don't show error to user - they can try another stream
        console.log('ℹ️ Stream error silently handled');
    }
}

// Event Handlers
async function loadHomePage() {
    console.log('🏠 loadHomePage called, provider:', state.selectedProvider);
    const provider = state.selectedProvider;
    if (!provider) {
        document.getElementById('catalogSections').innerHTML = '<p style="color: #b3b3b3;">Please select a provider to browse content.</p>';
        return;
    }
    
    showLoading();
    try {
        const catalogData = await fetchCatalog(provider);
        const catalogContainer = document.getElementById('catalogSections');
        catalogContainer.innerHTML = '';
        
        // Render Hero Banner
        await renderHeroBanner(provider, catalogData);
        
        // Render Continue Watching section from history
        if (window.HistoryModule) {
            const historySection = window.HistoryModule.renderHistorySection();
            if (historySection) {
                catalogContainer.appendChild(historySection);
            }
        }
        
        // Render TMDB content sections
        if (window.TMDBContentModule) {
            await window.TMDBContentModule.renderAllSections(catalogContainer);
        }
        
        // Separate Movies and TV Shows sections
        const moviesSections = [];
        const tvShowsSections = [];
        const otherSections = [];
        
        if (catalogData.catalog && catalogData.catalog.length > 0) {
            catalogData.catalog.forEach(item => {
                const title = item.title.toLowerCase();
                if (title.includes('movie') || title.includes('film')) {
                    moviesSections.push(item);
                } else if (title.includes('tv') || title.includes('show') || title.includes('series')) {
                    tvShowsSections.push(item);
                } else {
                    otherSections.push(item);
                }
            });
        }
        
        // Render Movies Section
        if (moviesSections.length > 0) {
            const moviesHeader = document.createElement('div');
            moviesHeader.className = 'category-header';
            moviesHeader.innerHTML = '<h2 class="category-title">🎬 Movies</h2>';
            catalogContainer.appendChild(moviesHeader);
            
            for (const item of moviesSections) {
                const section = await renderNetflixSection(provider, item);
                if (section) catalogContainer.appendChild(section);
            }
        }
        
        // Render TV Shows Section
        if (tvShowsSections.length > 0) {
            const tvHeader = document.createElement('div');
            tvHeader.className = 'category-header';
            tvHeader.innerHTML = '<h2 class="category-title">📺 TV Shows</h2>';
            catalogContainer.appendChild(tvHeader);
            
            for (const item of tvShowsSections) {
                const section = await renderNetflixSection(provider, item);
                if (section) catalogContainer.appendChild(section);
            }
        }
        
        // Render Other Sections
        for (const item of otherSections) {
            const section = await renderNetflixSection(provider, item);
            if (section) catalogContainer.appendChild(section);
        }
        
        // Render Popular Stars section at the end
        if (window.PopularStarsModule) {
            await window.PopularStarsModule.init();
        }
        
        // Render genres at the bottom if available
        if (catalogData.genres && catalogData.genres.length > 0) {
            const genresSection = document.createElement('div');
            genresSection.className = 'catalog-section';
            genresSection.innerHTML = '<h2>Browse by Genre</h2>';
            
            const genresGrid = document.createElement('div');
            genresGrid.className = 'genres-grid';
            
            catalogData.genres.forEach(genre => {
                const genreBtn = document.createElement('button');
                genreBtn.className = 'genre-btn';
                genreBtn.textContent = genre.title;
                genreBtn.addEventListener('click', async () => {
                    loadFullCatalog(provider, genre.filter, genre.title);
                });
                genresGrid.appendChild(genreBtn);
            });
            
            genresSection.appendChild(genresGrid);
            catalogContainer.appendChild(genresSection);
        }
        
        showView('home');
    } catch (error) {
        showError('Failed to load catalog: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// Function to load a full catalog with pagination
async function loadFullCatalog(provider, filter, title) {
    showLoading();
    try {
        state.currentFilter = filter;
        const data = await fetchPosts(provider, filter, 1);
        const posts = data.posts || data;
        const hasNext = data.hasNextPage || (Array.isArray(posts) && posts.length >= 20);
        
        document.getElementById('searchTitle').textContent = title;
        renderPosts(posts, 'searchResults', provider);
        renderPagination('searchPagination', 1, hasNext, 'changeCatalogPage(');
        state.currentPage = 1;
        showView('search');
    } catch (error) {
        showError('Failed to load catalog content: ' + error.message);
    } finally {
        showLoading(false);
    }
}

async function performSearch() {
    const query = document.getElementById('searchInput').value.trim();
    
    if (!query) {
        showError('Please enter a search query.');
        return;
    }
    
    showLoading();
    try {
        // Search across ALL providers instead of just the selected one
        const allProviders = state.providers;
        const searchPromises = allProviders.map(provider => 
            searchPosts(provider.value, query, 1).catch(err => {
                console.warn(`Search failed for provider ${provider.value}:`, err);
                return { posts: [], provider: provider.value };
            })
        );
        
        // Wait for all searches to complete
        const searchResults = await Promise.all(searchPromises);
        
        // Combine all results
        let combinedResults = [];
        searchResults.forEach(result => {
            if (result && result.posts && Array.isArray(result.posts)) {
                // Add provider information to each post
                const postsWithProvider = result.posts.map(post => ({
                    ...post,
                    provider: result.provider
                }));
                combinedResults = combinedResults.concat(postsWithProvider);
            }
        });
        
        // Shuffle results to mix content from different providers
        shuffleArray(combinedResults);
        
        document.getElementById('searchTitle').textContent = `Search Results for "${query}"`;
        renderPosts(combinedResults, 'searchResults', 'all'); // Pass 'all' to indicate mixed providers
        // Hide pagination for search results since we're showing a mixed set
        document.getElementById('searchPagination').innerHTML = '';
        state.searchQuery = query;
        state.currentPage = 1;
        state.currentFilter = '';
        showView('search');
    } catch (error) {
        showError('Search failed: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// Utility function to shuffle array (Fisher-Yates algorithm)
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Updated pagination functions
async function changePage(newPage) {
    const provider = state.selectedProvider;
    if (!provider) return;
    
    showLoading();
    try {
        const results = await searchPosts(provider, state.searchQuery, newPage);
        renderPosts(results, 'searchResults', provider);
        renderPagination('searchPagination', newPage, results.length >= 20, 'changePage(');
        state.currentPage = newPage;
        window.scrollTo(0, 0);
    } catch (error) {
        showError('Failed to load page: ' + error.message);
    } finally {
        showLoading(false);
    }
}

async function changeCatalogPage(newPage) {
    const provider = state.selectedProvider;
    if (!provider || !state.currentFilter) return;
    
    showLoading();
    try {
        const data = await fetchPosts(provider, state.currentFilter, newPage);
        const posts = data.posts || data;
        const hasNext = data.hasNextPage || (Array.isArray(posts) && posts.length >= 20);
        
        renderPosts(posts, 'searchResults', provider);
        renderPagination('searchPagination', newPage, hasNext, 'changeCatalogPage(');
        state.currentPage = newPage;
        window.scrollTo(0, 0);
    } catch (error) {
        showError('Failed to load page: ' + error.message);
    } finally {
        showLoading(false);
    }
}

async function loadDetails(provider, link) {
    showLoading();
    try {
        const meta = await fetchMeta(provider, link);
        state.currentMeta = { meta, provider, link };
        
        // Add to history when viewing details
        if (window.HistoryModule && meta) {
            window.HistoryModule.addToHistory({
                title: meta.title,
                image: meta.image,
                provider: provider,
                link: link
            });
        }
        
        renderDetails(meta, provider);
        showView('details');
    } catch (error) {
        showError('Failed to load details: ' + error.message);
    } finally {
        showLoading(false);
    }
}

async function loadPlayer(provider, link, type) {
    console.log('🎬 loadPlayer called:', {provider, link, type});
    showLoading(true, 'Loading streams...');
    try {
        console.log('⏳ Fetching streams...');
        const streams = await fetchStream(provider, link, type);
        state.currentStreams = streams;
        console.log('📊 State updated with', streams.length, 'streams');
        
        if (streams.length === 0) {
            console.error('❌ No streams available');
            showError('No streams available for this content. This could mean:\n- The content is temporarily unavailable\n- Try another episode or quality');
            return;
        }
        
        console.log('🎨 Rendering stream selector...');
        renderStreamSelector(streams, provider);
        console.log('🖥️ Switching to player view');
        showView('player');
        
        // Auto-play first stream
        console.log('▶️ Auto-playing first stream:', streams[0]);
        await playStream(streams[0]);
        showToast('Stream loaded successfully!', 'success', 1000);
    } catch (error) {
        console.error('❌ loadPlayer error:', error);
        console.error('Error stack:', error.stack);
        
        // Retry logic for network errors
        if (state.retryCount < state.maxRetries && error.message.includes('Failed to fetch')) {
            state.retryCount++;
            showToast(`Retrying... (${state.retryCount}/${state.maxRetries})`, 'info', 2000);
            await new Promise(resolve => setTimeout(resolve, 1000));
            return loadPlayer(provider, link, type);
        }
        
        state.retryCount = 0;
        showError('Failed to load streams: ' + error.message + '\n\nTips:\n- Check your internet connection\n- Try refreshing the page\n- Select a different quality or episode');
    } finally {
        showLoading(false);
    }
}

// Initialize App
async function init() {
    console.log('🎬 Vega Providers Web Player Initialized');
    
    // Load providers
    showLoading();
    const providers = await fetchProviders();
    renderProviderSelect(providers);
    showLoading(false);
    
    if (providers.length === 0) {
        showError('No providers available. Please build the project first: npm run build');
        return;
    }
    
    // Auto-select first provider
    if (providers.length > 0) {
        state.selectedProvider = providers[0].value;
        document.getElementById('providerSelect').value = providers[0].value;
        loadHomePage();
    }
    
    // Event Listeners
    document.getElementById('providerSelect').addEventListener('change', (e) => {
        state.selectedProvider = e.target.value;
        if (e.target.value) {
            loadHomePage();
        }
    });
    
    document.getElementById('searchBtn').addEventListener('click', performSearch);
    
    document.getElementById('searchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
    
    // Logo click handler
    const logoContainer = document.querySelector('.logo-container');
    if (logoContainer) {
        logoContainer.addEventListener('click', () => {
            if (state.selectedProvider) {
                loadHomePage();
                updateNavLinks('home');
            }
        });
    }
    
    // Back buttons
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            if (state.selectedProvider) {
                loadHomePage();
                updateNavLinks('home');
            }
        });
    }
    
    const playerBackBtn = document.getElementById('playerBackBtn');
    if (playerBackBtn) {
        playerBackBtn.addEventListener('click', () => {
            stopVideo();
            if (state.currentMeta) {
                renderDetails(state.currentMeta.meta, state.currentMeta.provider);
                showView('details');
            }
        });
    }
    
    // Navigation buttons
    const exploreBtn = document.getElementById('exploreBtn');
    if (exploreBtn) {
        exploreBtn.addEventListener('click', () => {
            loadExplorePage();
        });
    }
    
    const homeBtn = document.getElementById('homeBtn');
    if (homeBtn) {
        homeBtn.addEventListener('click', () => {
            if (state.selectedProvider) {
                loadHomePage();
                updateNavLinks('home');
            }
        });
    }
    
    const exploreBackBtn = document.getElementById('exploreBackBtn');
    if (exploreBackBtn) {
        exploreBackBtn.addEventListener('click', () => {
            if (state.selectedProvider) {
                loadHomePage();
                updateNavLinks('home');
            }
        });
    }
    
    const moviesBtn = document.getElementById('moviesBtn');
    if (moviesBtn) {
        moviesBtn.addEventListener('click', () => {
            loadMoviesPage();
        });
    }
    
    const moviesBackBtn = document.getElementById('moviesBackBtn');
    if (moviesBackBtn) {
        moviesBackBtn.addEventListener('click', () => {
            if (state.selectedProvider) {
                loadHomePage();
                updateNavLinks('home');
            }
        });
    }
    
    const tvShowsBtn = document.getElementById('tvShowsBtn');
    if (tvShowsBtn) {
        tvShowsBtn.addEventListener('click', () => {
            loadTVShowsPage();
        });
    }
    
    const tvShowsBackBtn = document.getElementById('tvShowsBackBtn');
    if (tvShowsBackBtn) {
        tvShowsBackBtn.addEventListener('click', () => {
            if (state.selectedProvider) {
                loadHomePage();
                updateNavLinks('home');
            }
        });
    }
    
    // New & Updates button
    const newUpdatesBtn = document.getElementById('newUpdatesBtn');
    if (newUpdatesBtn) {
        newUpdatesBtn.addEventListener('click', () => {
            if (window.loadNewUpdatesPage) {
                loadNewUpdatesPage();
            }
        });
    }
    
    const newUpdatesBackBtn = document.getElementById('newUpdatesBackBtn');
    if (newUpdatesBackBtn) {
        newUpdatesBackBtn.addEventListener('click', () => {
            if (state.selectedProvider) {
                loadHomePage();
                updateNavLinks('home');
            }
        });
    }
    
    // History button
    const historyBtn = document.getElementById('historyBtn');
    if (historyBtn) {
        historyBtn.addEventListener('click', () => {
            if (window.loadHistoryPage) {
                loadHistoryPage();
            }
        });
    }
    
    const historyBackBtn = document.getElementById('historyBackBtn');
    if (historyBackBtn) {
        historyBackBtn.addEventListener('click', () => {
            if (state.selectedProvider) {
                loadHomePage();
                updateNavLinks('home');
            }
        });
    }
    
    // Bollywood button
    const bollywoodBtn = document.getElementById('bollywoodBtn');
    if (bollywoodBtn) {
        bollywoodBtn.addEventListener('click', () => {
            if (window.BollywoodModule) {
                BollywoodModule.loadBollywoodPage();
            }
        });
    }
    
    const bollywoodBackBtn = document.getElementById('bollywoodBackBtn');
    if (bollywoodBackBtn) {
        bollywoodBackBtn.addEventListener('click', () => {
            if (state.selectedProvider) {
                loadHomePage();
                updateNavLinks('home');
            }
        });
    }
    
    // Genre back button
    const genreBackBtn = document.getElementById('genreBackBtn');
    if (genreBackBtn) {
        genreBackBtn.addEventListener('click', () => {
            if (state.selectedProvider) {
                loadHomePage();
                updateNavLinks('home');
            }
        });
    }
    
    // Top Star back button
    const topStarBackBtn = document.getElementById('topStarBackBtn');
    if (topStarBackBtn) {
        topStarBackBtn.addEventListener('click', () => {
            if (window.BollywoodModule) {
                BollywoodModule.loadBollywoodPage();
            }
        });
    }
    
    // Popular Star back button
    const popularStarBackBtn = document.getElementById('popularStarBackBtn');
    if (popularStarBackBtn) {
        popularStarBackBtn.addEventListener('click', () => {
            if (window.PopularStarsModule) {
                PopularStarsModule.openViewAllPage();
            }
        });
    }
    
    // Popular Stars All back button
    const popularStarsAllBackBtn = document.getElementById('popularStarsAllBackBtn');
    if (popularStarsAllBackBtn) {
        popularStarsAllBackBtn.addEventListener('click', () => {
            if (state.selectedProvider) {
                loadHomePage();
                updateNavLinks('home');
            }
        });
    }
    
    // Header search input
    const searchInputHeader = document.getElementById('searchInputHeader');
    if (searchInputHeader) {
        searchInputHeader.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const query = searchInputHeader.value.trim();
                if (query) {
                    document.getElementById('searchInput').value = query;
                    performSearch();
                }
            }
        });
    }
    
    // Search icon button
    const searchToggle = document.getElementById('searchToggle');
    if (searchToggle) {
        searchToggle.addEventListener('click', () => {
            const query = searchInputHeader.value.trim();
            if (query) {
                document.getElementById('searchInput').value = query;
                performSearch();
            } else {
                searchInputHeader.focus();
            }
        });
    }
    
    const searchClose = document.getElementById('searchClose');
    if (searchClose) {
        searchClose.addEventListener('click', () => {
            const searchBar = document.getElementById('searchBar');
            if (searchBar) {
                searchBar.style.display = 'none';
            }
        });
    }
}

// Function to update navigation link states
function updateNavLinks(active) {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    const navMap = {
        home: 'homeBtn',
        explore: 'exploreBtn',
        movies: 'moviesBtn',
        tvshows: 'tvShowsBtn',
        newUpdates: 'newUpdatesBtn',
        history: 'historyBtn',
        bollywood: 'bollywoodBtn'
    };
    
    if (navMap[active]) {
        const btn = document.getElementById(navMap[active]);
        if (btn) {
            btn.classList.add('active');
        }
    }
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Store TMDB data for pagination
const tmdbDetailsData = {
    tmdbId: null,
    searchType: null,
    recommendedPage: 1,
    similarPage: 1,
    recommendedTotal: 0,
    similarTotal: 0
};

// Load TMDB recommendations for details page
async function loadTMDBRecommendationsForDetails(title, contentType) {
    const container = document.getElementById('tmdbRecommendations');
    if (!container) return;
    
    container.innerHTML = '<p style="color: var(--text-muted); text-align: center;">Loading recommendations...</p>';
    
    try {
        const TMDB_API_KEY = 'be880dc5b7df8623008f6cc66c0c7396';
        const BASE_URL = 'https://api.themoviedb.org/3';
        
        // Search for the content on TMDB
        const searchType = contentType === 'movie' ? 'movie' : 'tv';
        const searchRes = await fetch(`${BASE_URL}/search/${searchType}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}`);
        
        if (!searchRes.ok) {
            container.innerHTML = '';
            return;
        }
        
        const searchData = await searchRes.json();
        if (!searchData.results || searchData.results.length === 0) {
            container.innerHTML = '';
            return;
        }
        
        const tmdbId = searchData.results[0].id;
        
        // Store for pagination
        tmdbDetailsData.tmdbId = tmdbId;
        tmdbDetailsData.searchType = searchType;
        tmdbDetailsData.recommendedPage = 1;
        tmdbDetailsData.similarPage = 1;
        
        // Fetch similar and recommended
        const [similarRes, recommendedRes, providersRes] = await Promise.all([
            fetch(`${BASE_URL}/${searchType}/${tmdbId}/similar?api_key=${TMDB_API_KEY}&page=1`),
            fetch(`${BASE_URL}/${searchType}/${tmdbId}/recommendations?api_key=${TMDB_API_KEY}&page=1`),
            // Also search in other providers
            searchInAllProviders(title)
        ]);
        
        let html = '';
        
        // Show available in other providers
        if (providersRes && providersRes.length > 0) {
            html += `
                <div class="details-section">
                    <h2 class="section-title">📦 Available in Other Providers</h2>
                    <div class="provider-results-grid">
                        ${providersRes.map(result => `
                            <div class="provider-result-section">
                                <h3 style="color: var(--primary-color); margin-bottom: 15px;">${result.displayName}</h3>
                                <div class="provider-posts-grid">
                                    ${result.posts.slice(0, 6).map(post => `
                                        <div class="provider-post-card" onclick="loadDetails('${result.provider}', '${post.link}')">
                                            <img src="${post.image}" alt="${post.title}" />
                                            <h4>${post.title}</h4>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        // Recommended section
        if (recommendedRes.ok) {
            const recData = await recommendedRes.json();
            tmdbDetailsData.recommendedTotal = recData.total_pages || 0;
            if (recData.results && recData.results.length > 0) {
                html += renderTMDBSectionWithPagination('⭐ Recommended for You', recData.results, searchType, 'tmdb-recommended', 1, recData.total_pages);
            }
        }
        
        // Similar section
        if (similarRes.ok) {
            const simData = await similarRes.json();
            tmdbDetailsData.similarTotal = simData.total_pages || 0;
            if (simData.results && simData.results.length > 0) {
                html += renderTMDBSectionWithPagination(`🎬 Similar ${searchType === 'movie' ? 'Movies' : 'TV Shows'}`, simData.results, searchType, 'tmdb-similar', 1, simData.total_pages);
            }
        }
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Failed to load TMDB recommendations:', error);
        container.innerHTML = '';
    }
}

// Search in all providers
async function searchInAllProviders(title) {
    const providers = state.providers || [];
    if (providers.length === 0) return [];
    
    const searchPromises = providers.map(async (provider) => {
        try {
            const providerValue = provider.value || provider;
            const providerName = provider.display_name || provider.value || provider;
            
            const response = await fetch(`${API_BASE}/api/${providerValue}/search?query=${encodeURIComponent(title)}`);
            if (!response.ok) return null;
            
            const data = await response.json();
            const posts = Array.isArray(data) ? data : (data.posts || []);
            
            if (posts.length > 0) {
                return {
                    provider: providerValue,
                    displayName: providerName,
                    posts: posts
                };
            }
            return null;
        } catch (error) {
            return null;
        }
    });
    
    const results = await Promise.all(searchPromises);
    return results.filter(r => r !== null);
}

// Render TMDB section with pagination support
function renderTMDBSectionWithPagination(title, items, type, sectionId, currentPage, totalPages) {
    if (!items || items.length === 0) return '';
    
    return `
        <div class="details-section" id="${sectionId}">
            <h2 class="section-title">${title}</h2>
            <div class="tmdb-recommendations-grid" id="${sectionId}-grid">
                ${items.map(item => renderTMDBCard(item, type)).join('')}
            </div>
            ${currentPage < totalPages ? `
                <div class="load-more-container">
                    <button class="load-more-btn" onclick="loadMoreTMDBPage('${sectionId}', '${type}', ${currentPage + 1}, ${totalPages})">
                        Load More (Page ${currentPage + 1} of ${totalPages})
                    </button>
                </div>
            ` : ''}
        </div>
    `;
}

// Render individual TMDB card
function renderTMDBCard(item, type) {
    const itemTitle = item.title || item.name;
    const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';
    const posterUrl = item.poster_path 
        ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
        : 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22300%22%3E%3Crect width=%22200%22 height=%22300%22 fill=%22%23333%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 fill=%22%23666%22 text-anchor=%22middle%22 dy=%22.3em%22%3ENo Image%3C/text%3E%3C/svg%3E';
    
    return `
        <div class="tmdb-rec-card" onclick='TMDBContentModule.showTMDBDetails(${JSON.stringify(item).replace(/'/g, "&apos;")}, "${type}", false)'>
            <img src="${posterUrl}" alt="${itemTitle}" />
            <div class="tmdb-rec-info">
                <h4>${itemTitle}</h4>
                <span class="tmdb-rating">⭐ ${rating}</span>
            </div>
        </div>
    `;
}

// Load more TMDB recommendations from API
async function loadMoreTMDBPage(sectionId, type, nextPage, totalPages) {
    const grid = document.getElementById(`${sectionId}-grid`);
    const loadMoreContainer = document.querySelector(`#${sectionId} .load-more-container`);
    const button = loadMoreContainer?.querySelector('.load-more-btn');
    
    if (!grid || !button) return;
    
    // Show loading state
    button.disabled = true;
    button.textContent = 'Loading...';
    
    try {
        const TMDB_API_KEY = 'be880dc5b7df8623008f6cc66c0c7396';
        const BASE_URL = 'https://api.themoviedb.org/3';
        
        // Determine endpoint based on section
        let endpoint = '';
        if (sectionId === 'tmdb-recommended') {
            endpoint = `${BASE_URL}/${tmdbDetailsData.searchType}/${tmdbDetailsData.tmdbId}/recommendations`;
            tmdbDetailsData.recommendedPage = nextPage;
        } else if (sectionId === 'tmdb-similar') {
            endpoint = `${BASE_URL}/${tmdbDetailsData.searchType}/${tmdbDetailsData.tmdbId}/similar`;
            tmdbDetailsData.similarPage = nextPage;
        }
        
        const response = await fetch(`${endpoint}?api_key=${TMDB_API_KEY}&page=${nextPage}`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch more items');
        }
        
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
            // Add new items to grid
            data.results.forEach(item => {
                const cardHTML = renderTMDBCard(item, type);
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = cardHTML;
                grid.appendChild(tempDiv.firstElementChild);
            });
            
            // Update or remove load more button
            if (nextPage >= totalPages) {
                loadMoreContainer.remove();
            } else {
                button.disabled = false;
                button.setAttribute('onclick', `loadMoreTMDBPage('${sectionId}', '${type}', ${nextPage + 1}, ${totalPages})`);
                button.textContent = `Load More (Page ${nextPage + 1} of ${totalPages})`;
            }
        } else {
            loadMoreContainer.remove();
        }
        
    } catch (error) {
        console.error('Failed to load more:', error);
        button.disabled = false;
        button.textContent = 'Load More (Try Again)';
    }
}

// Function to stop video playback
function stopVideo() {
    if (state.isVideoPlaying) {
        const video = document.getElementById('videoPlayer');
        if (video) {
            video.pause();
            video.src = '';
            video.innerHTML = '';
            console.log('⏹️ Video stopped');
        }
        
        // Destroy HLS instance if exists
        if (window.currentHls) {
            window.currentHls.destroy();
            window.currentHls = null;
            console.log('🧹 HLS instance destroyed');
        }
        
        state.isVideoPlaying = false;
    }
}

// Function to load explore page
async function loadExplorePage() {
    showLoading(true, 'Loading Explore...');
    try {
        // Initialize explore module if not already done
        if (window.ExploreModule && state.providers.length > 0) {
            await window.ExploreModule.init(state.providers);
            window.ExploreModule.renderExplorePage();
            showView('explore');
            updateNavLinks('explore');
        } else {
            showError('Explore module not available. Please refresh the page.');
        }
    } catch (error) {
        showError('Failed to load explore page: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// Function to load movies page
async function loadMoviesPage() {
    showLoading(true, 'Loading Movies...');
    try {
        if (window.MoviesModule && state.providers.length > 0) {
            await window.MoviesModule.init(state.providers);
            window.MoviesModule.renderMoviesPage();
            showView('movies');
            updateNavLinks('movies');
        } else {
            showError('Movies module not available. Please refresh the page.');
        }
    } catch (error) {
        showError('Failed to load movies page: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// Function to load TV shows page
async function loadTVShowsPage() {
    showLoading(true, 'Loading TV Shows...');
    try {
        if (window.TVShowsModule && state.providers.length > 0) {
            await window.TVShowsModule.init(state.providers);
            window.TVShowsModule.renderTVShowsPage();
            showView('tvshows');
            updateNavLinks('tvshows');
        } else {
            showError('TV Shows module not available. Please refresh the page.');
        }
    } catch (error) {
        showError('Failed to load TV shows page: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// Render Hero Banner with TMDB High Quality Images
async function renderHeroBanner(provider, catalogData) {
    const container = document.getElementById('catalogSections');
    const TMDB_API_KEY = 'be880dc5b7df8623008f6cc66c0c7396';
    
    try {
        // Get first catalog item to fetch posts
        const firstFilter = catalogData.catalog && catalogData.catalog.length > 0 
            ? catalogData.catalog[0].filter 
            : '';
        
        const data = await fetchPosts(provider, firstFilter, 1);
        const posts = Array.isArray(data) ? data : (data.posts || []);
        
        if (posts.length > 0) {
            // Select a random post from available posts
            const randomIndex = Math.floor(Math.random() * Math.min(posts.length, 10));
            const featuredPost = posts[randomIndex];
            
            const heroBanner = document.createElement('div');
            heroBanner.className = 'hero-banner';
            heroBanner.style.backgroundColor = '#1a1a1a'; // Loading background
            
            console.log('🎬 Original title:', featuredPost.title);
            console.log('📦 Post data:', featuredPost);
            
            // Check if we have IMDB ID in the post data
            let imdbId = null;
            if (featuredPost.imdbId) {
                imdbId = featuredPost.imdbId;
            } else if (featuredPost.imdb_id) {
                imdbId = featuredPost.imdb_id;
            } else if (featuredPost.link && featuredPost.link.includes('imdb.com/title/')) {
                const match = featuredPost.link.match(/imdb\.com\/title\/(tt\d+)/);
                if (match) imdbId = match[1];
            }
            
            // Smart title extraction
            let cleanTitle = featuredPost.title;
            
            // Method 1: Extract title before year (most reliable)
            const yearMatch = cleanTitle.match(/^(.*?)\s*[\(\[]?\s*(19\d{2}|20\d{2})\s*[\)\]]?/);
            if (yearMatch && yearMatch[1]) {
                cleanTitle = yearMatch[1].trim();
            } else {
                // Method 2: Extract title before season info
                const seasonMatch = cleanTitle.match(/^(.*?)\s*[\(\[]?\s*(Season|S\d+)/i);
                if (seasonMatch && seasonMatch[1]) {
                    cleanTitle = seasonMatch[1].trim();
                } else {
                    // Method 3: Take everything before quality indicators
                    const qualityMatch = cleanTitle.match(/^(.*?)\s*(480p|720p|1080p|2160p|4K|WEB-?DL|BluRay|HDRip|HDTC)/i);
                    if (qualityMatch && qualityMatch[1]) {
                        cleanTitle = qualityMatch[1].trim();
                    }
                }
            }
            
            // Remove common prefixes
            cleanTitle = cleanTitle
                .replace(/^(Download|Watch)\s+/i, '')
                .replace(/\[.*?\]/g, '') // Remove brackets
                .replace(/\(.*?\)/g, '') // Remove parentheses
                .replace(/\{.*?\}/g, '') // Remove curly braces
                .replace(/[\[\]{}()]/g, '') // Remove any remaining brackets
                .replace(/[_\.\-]+/g, ' ') // Replace separators with space
                .replace(/\s+/g, ' ') // Normalize spaces
                .trim();
            
            // If still too short or has garbage, take first 3-5 words
            if (cleanTitle.length < 3 || cleanTitle.split(/\s+/).length > 8) {
                const words = featuredPost.title.split(/\s+/);
                cleanTitle = words.slice(0, Math.min(5, words.length)).join(' ')
                    .replace(/\[.*?\]/g, '')
                    .replace(/\(.*?\)/g, '')
                    .trim();
            }
            
            console.log('🔍 Cleaned title for search:', cleanTitle);
            if (imdbId) console.log('🆔 Found IMDB ID:', imdbId);
            
            // Add content immediately
            heroBanner.innerHTML = `
                <div class="hero-content">
                    <h1 class="hero-title">${featuredPost.title}</h1>
                    <div class="hero-buttons">
                        <button class="hero-btn hero-btn-play" onclick="loadDetails('${provider}', '${featuredPost.link.replace(/'/g, "\\'")}')">▶ Play</button>
                        <button class="hero-btn hero-btn-info" onclick="loadDetails('${provider}', '${featuredPost.link.replace(/'/g, "\\'")}')">ℹ More Info</button>
                    </div>
                </div>
            `;
            
            container.appendChild(heroBanner);
            
            // Add Genre Browser Section right after banner
            if (window.GenreBrowserModule) {
                await window.GenreBrowserModule.init();
            }
            
            // Fetch TMDB image asynchronously
            (async () => {
                try {
                    let tmdbId = null;
                    let mediaType = null;
                    
                    // Try to find using IMDB ID first (more accurate)
                    if (imdbId) {
                        console.log('🔍 Searching TMDB by IMDB ID:', imdbId);
                        const findUrl = `https://api.themoviedb.org/3/find/${imdbId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`;
                        const findResponse = await fetch(findUrl);
                        const findData = await findResponse.json();
                        
                        if (findData.movie_results && findData.movie_results.length > 0) {
                            tmdbId = findData.movie_results[0].id;
                            mediaType = 'movie';
                            console.log('✅ Found movie on TMDB via IMDB ID:', findData.movie_results[0].title, 'ID:', tmdbId);
                        } else if (findData.tv_results && findData.tv_results.length > 0) {
                            tmdbId = findData.tv_results[0].id;
                            mediaType = 'tv';
                            console.log('✅ Found TV show on TMDB via IMDB ID:', findData.tv_results[0].name, 'ID:', tmdbId);
                        }
                    }
                    
                    // If IMDB search failed or no IMDB ID, search by title
                    if (!tmdbId) {
                        console.log('🔍 Searching TMDB by title:', cleanTitle);
                        const searchUrl = `https://api.themoviedb.org/3/search/multi?query=${encodeURIComponent(cleanTitle)}&api_key=${TMDB_API_KEY}`;
                        const searchResponse = await fetch(searchUrl);
                        const searchData = await searchResponse.json();
                        
                        if (searchData.results && searchData.results.length > 0) {
                            tmdbId = searchData.results[0].id;
                            mediaType = searchData.results[0].media_type; // 'movie' or 'tv'
                            console.log('✅ Found on TMDB:', searchData.results[0].title || searchData.results[0].name, 'ID:', tmdbId);
                        }
                    }
                    
                    if (tmdbId && mediaType) {
                        let backdropUrl = null;
                        
                        // First, try to get backdrop from movie/TV details (faster)
                        try {
                            const detailsUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
                            const detailsResponse = await fetch(detailsUrl);
                            const detailsData = await detailsResponse.json();
                            
                            if (detailsData.backdrop_path) {
                                backdropUrl = `https://image.tmdb.org/t/p/original${detailsData.backdrop_path}`;
                                console.log('🖼️ Using backdrop from details:', backdropUrl);
                            }
                        } catch (detailsError) {
                            console.warn('Failed to fetch details, trying images endpoint');
                        }
                        
                        // If no backdrop from details, try images endpoint
                        if (!backdropUrl) {
                            const imagesUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}/images?api_key=${TMDB_API_KEY}&include_image_language=en,null`;
                            const imagesResponse = await fetch(imagesUrl);
                            const imagesData = await imagesResponse.json();
                            
                            if (imagesData.backdrops && imagesData.backdrops.length > 0) {
                                // Sort backdrops by resolution (highest first)
                                const sortedBackdrops = imagesData.backdrops.sort((a, b) => (b.width * b.height) - (a.width * a.height));
                                
                                // Get the highest quality backdrop (original size)
                                const bestBackdrop = sortedBackdrops[0];
                                backdropUrl = `https://image.tmdb.org/t/p/original${bestBackdrop.file_path}`;
                                
                                console.log('🖼️ Using TMDB backdrop from images:', backdropUrl, `(${bestBackdrop.width}x${bestBackdrop.height})`);
                            }
                        }
                        
                        // If we have a backdrop URL, load it
                        if (backdropUrl) {
                            // Preload image before setting
                            const img = new Image();
                            img.onload = () => {
                                heroBanner.style.backgroundImage = `url('${backdropUrl}')`;
                                console.log('✅ TMDB image loaded successfully');
                            };
                            img.onerror = () => {
                                console.warn('❌ Failed to load TMDB image, using fallback');
                                heroBanner.style.backgroundImage = `url('${featuredPost.image}')`;
                            };
                            img.src = backdropUrl;
                        } else {
                            console.log('⚠️ No backdrops found, using original image');
                            heroBanner.style.backgroundImage = `url('${featuredPost.image}')`;
                        }
                    } else {
                        console.log('⚠️ Not found on TMDB, using original image');
                        heroBanner.style.backgroundImage = `url('${featuredPost.image}')`;
                    }
                } catch (tmdbError) {
                    console.warn('❌ TMDB fetch error:', tmdbError);
                    heroBanner.style.backgroundImage = `url('${featuredPost.image}')`;
                }
            })();
        }
    } catch (error) {
        console.warn('Failed to render hero banner:', error);
    }
}

// Render Netflix-style horizontal scrolling section
async function renderNetflixSection(provider, catalogItem) {
    try {
        const data = await fetchPosts(provider, catalogItem.filter, 1);
        const posts = Array.isArray(data) ? data : (data.posts || []);
        
        if (!posts || posts.length === 0) return null;
        
        const section = document.createElement('div');
        section.className = 'netflix-section';
        
        const header = document.createElement('div');
        header.className = 'netflix-section-header';
        header.innerHTML = `
            <h3 class="netflix-section-title">${catalogItem.title}</h3>
            <button class="netflix-view-all" onclick="loadFullCatalog('${provider}', '${catalogItem.filter}', '${catalogItem.title}')">View All ›</button>
        `;
        section.appendChild(header);
        
        const scrollContainer = document.createElement('div');
        scrollContainer.className = 'netflix-scroll-container';
        
        const row = document.createElement('div');
        row.className = 'netflix-row';
        
        posts.slice(0, 20).forEach(post => {
            const card = document.createElement('div');
            card.className = 'netflix-card';
            card.innerHTML = `
                <img src="${post.image}" alt="${post.title}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22300%22%3E%3Crect width=%22200%22 height=%22300%22 fill=%22%23333%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 fill=%22%23666%22 text-anchor=%22middle%22 dy=%22.3em%22%3ENo Image%3C/text%3E%3C/svg%3E'" />
                <div class="netflix-card-overlay">
                    <h4>${post.title}</h4>
                </div>
            `;
            card.addEventListener('click', () => loadDetails(provider, post.link));
            row.appendChild(card);
        });
        
        scrollContainer.appendChild(row);
        section.appendChild(scrollContainer);
        
        return section;
    } catch (error) {
        console.error(`Error rendering section ${catalogItem.title}:`, error);
        return null;
    }
}

// Make functions global for pagination buttons
window.changePage = changePage;
window.changeCatalogPage = changeCatalogPage;
window.loadFullCatalog = loadFullCatalog;
window.stopVideo = stopVideo;
window.loadExplorePage = loadExplorePage;
window.reloadCatalogSection = reloadCatalogSection;
window.renderHeroBanner = renderHeroBanner;
window.renderNetflixSection = renderNetflixSection;