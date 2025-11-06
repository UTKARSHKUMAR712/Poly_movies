// IPC Listeners for Electron menu actions
if (typeof require !== 'undefined') {
    try {
        const { ipcRenderer } = require("electron");

        ipcRenderer.on("show-download-dialog", () => {
            // Open download UI
            showDownloadDialog();
        });

        ipcRenderer.on("show-about-dialog", () => {
            // Show about info popup
            showAboutDialog();
        });

        ipcRenderer.on("show-downloads-panel", () => {
            // Show downloads panel
            showDownloadsPanel();
        });
    } catch (error) {
        console.log('Running in browser mode, IPC not available');
    }
}

// Download dialog function
function showDownloadDialog() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3><i class="fas fa-download"></i> Download Stream</h3>
                <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">×</button>
            </div>
            <div class="modal-body">
                <p>Enter stream URL to download:</p>
                <input type="url" id="downloadUrl" placeholder="https://example.com/stream.m3u8" style="width: 100%; padding: 10px; margin: 10px 0;">
                <div class="modal-actions">
                    <button onclick="startDownload()" style="background: #e50914; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer;">
                        <i class="fas fa-download"></i> Download
                    </button>
                    <button onclick="this.closest('.modal-overlay').remove()" style="background: #666; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer;">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// About dialog function
function showAboutDialog() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3><i class="fas fa-info-circle"></i> About PolyMovies</h3>
                <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">×</button>
            </div>
            <div class="modal-body">
                <div style="text-align: center; padding: 20px;">
                    <h2>PolyMovies</h2>
                    <p>Version 1.0.0</p>
                    <p>Stream movies, TV shows, and live TV channels</p>
                    <br>
                    <p><strong>Features:</strong></p>
                    <ul style="text-align: left; max-width: 300px; margin: 0 auto;">
                        <li>📺 Live TV streaming</li>
                        <li>🎬 Movies & TV shows</li>
                        <li>🇮🇳 Bollywood content</li>
                        <li>🔍 Search & explore</li>
                        <li>📱 Responsive design</li>
                    </ul>
                    <br>
                    <p>Made with ❤️ by Utkarsh Kumar</p>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Simple fallback download function
async function trySimpleDownload(url, filename) {
    try {
        // Create download link
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        console.log('✅ Simple download started:', filename);
        return true;
    } catch (error) {
        console.error('❌ Simple download failed:', error);
        return false;
    }
}

// Enhanced download function with progress tracking
async function startDownload() {
    const url = document.getElementById('downloadUrl').value;
    if (!url) {
        alert('Please enter a valid URL');
        return;
    }

    // Extract filename from URL or use default
    const filename = extractFilenameFromUrl(url) || 'stream.m3u8';

    try {
        // Start download with progress tracking if available
        if (window.DownloadManager && typeof window.DownloadManager.startDownload === 'function') {
            const downloadId = await DownloadManager.startDownload(url, filename, {
                source: 'manual_download',
                userInitiated: true
            });

            showToast(`Download started: ${filename}`, 'success');
            console.log(`📥 Started download with ID: ${downloadId}`);
        } else {
            // Fallback to simple download
            const success = await trySimpleDownload(url, filename);
            if (success) {
                showToast(`Download started: ${filename}`, 'success');
            } else {
                showToast('Download may have started. Check your downloads folder.', 'info');
            }
        }

        // Close modal
        const modal = document.querySelector('.modal-overlay');
        if (modal) {
            modal.remove();
        }

    } catch (error) {
        console.error('❌ Download failed:', error);
        showToast(`Download failed: ${error.message}`, 'error');
    }
}

// Helper function to extract filename from URL
function extractFilenameFromUrl(url) {
    try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        const filename = pathname.split('/').pop();

        if (filename && filename.includes('.')) {
            return filename;
        }

        // Generate filename based on content type or default
        const extension = url.includes('.m3u8') ? '.m3u8' :
            url.includes('.mp4') ? '.mp4' :
                url.includes('.mkv') ? '.mkv' : '.mp4';

        return `download_${Date.now()}${extension}`;
    } catch (error) {
        return `download_${Date.now()}.mp4`;
    }
}

// Generate smart download filename based on stream and content info
function generateDownloadFilename(stream, contentTitle) {
    try {
        // Clean content title for filename
        let title = contentTitle || 'Video';
        title = title.replace(/[<>:"/\\|?*]/g, ''); // Remove invalid filename characters
        title = title.substring(0, 50); // Limit length

        // Determine file extension
        let extension = '.mp4'; // default
        if (stream.type === 'm3u8' || stream.link.includes('.m3u8')) {
            extension = '.m3u8';
        } else if (stream.link.includes('.mkv')) {
            extension = '.mkv';
        } else if (stream.link.includes('.avi')) {
            extension = '.avi';
        } else if (stream.link.includes('.mov')) {
            extension = '.mov';
        }

        // Add quality info if available
        const quality = stream.quality ? `_${stream.quality}p` : '';

        // Add server info for identification
        const server = stream.server ? `_${stream.server.replace(/[<>:"/\\|?*]/g, '')}` : '';

        // Construct filename
        const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
        const filename = `${title}${quality}${server}_${timestamp}${extension}`;

        return filename;
    } catch (error) {
        console.error('Error generating filename:', error);
        return `download_${Date.now()}.mp4`;
    }
}

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

function createSearchProviderSection(provider) {
    const section = document.createElement('div');
    section.className = 'search-provider-section horizontal';
    section.id = `search-provider-${provider.value}`;
    section.innerHTML = `
        <div class="search-provider-header">
            <h3>${provider.display_name}</h3>
            <span class="result-count loading">Loading...</span>
        </div>
        <div class="search-provider-carousel">
            <div class="provider-loading">Fetching results...</div>
        </div>
    `;
    return section;
}

function updateSearchProviderSection(providerValue, posts) {
    const section = document.getElementById(`search-provider-${providerValue}`);
    if (!section) return;

    const countEl = section.querySelector('.result-count');
    const carousel = section.querySelector('.search-provider-carousel');
    if (!carousel) return;

    countEl?.classList.remove('loading');
    carousel.innerHTML = '';

    const safePosts = Array.isArray(posts) ? posts : [];
    if (safePosts.length === 0) {
        if (countEl) countEl.textContent = 'No results';
        carousel.innerHTML = '<div class="provider-empty">No titles found for this provider.</div>';
        return;
    }

    if (countEl) {
        countEl.textContent = `${safePosts.length} result${safePosts.length === 1 ? '' : 's'}`;
    }

    safePosts.forEach(post => {
        carousel.appendChild(renderPostCard({ ...post, provider: providerValue }, providerValue));
    });
}

function showSearchProviderError(providerValue, message) {
    const section = document.getElementById(`search-provider-${providerValue}`);
    if (!section) return;

    const countEl = section.querySelector('.result-count');
    const carousel = section.querySelector('.search-provider-carousel');
    countEl?.classList.remove('loading');
    if (countEl) countEl.textContent = 'Error';
    if (carousel) {
        carousel.innerHTML = `<div class="provider-error">${message || 'Failed to fetch results.'}</div>`;
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
        liveTV: 'liveTVView',
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
    console.log('🎥 Fetching stream:', { provider, link, type, url });
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

function renderPosts(posts, containerId, provider, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.warn('renderPosts: container not found', containerId);
        return;
    }

    container.innerHTML = '';

    if (!Array.isArray(posts) || posts.length === 0) {
        container.innerHTML = '<p style="color: #b3b3b3;">No results found.</p>';
        return;
    }

    const { groupByProvider = false, providerLabelMap = {} } = options;

    if (!groupByProvider) {
        posts.forEach(post => {
            container.appendChild(renderPostCard(post, provider));
        });
        return;
    }

    const grouped = posts.reduce((acc, post) => {
        const providerKey = post.provider || provider || 'unknown';
        if (!acc[providerKey]) {
            acc[providerKey] = [];
        }
        acc[providerKey].push(post);
        return acc;
    }, {});

    Object.entries(grouped).forEach(([providerKey, providerPosts]) => {
        const section = document.createElement('div');
        section.className = 'search-provider-section';

        const header = document.createElement('div');
        header.className = 'search-provider-header';
        const displayName = providerLabelMap[providerKey] || providerKey;
        header.innerHTML = `<h3>${displayName}</h3><span class="result-count">${providerPosts.length} result${providerPosts.length === 1 ? '' : 's'}</span>`;
        section.appendChild(header);

        const grid = document.createElement('div');
        grid.className = 'posts-grid';
        providerPosts.forEach(post => {
            grid.appendChild(renderPostCard(post, providerKey));
        });
        section.appendChild(grid);

        container.appendChild(section);
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

        // Get series ID for episode tracking
        const seriesId = state.currentMeta?.link || state.currentMeta?.meta?.title || 'unknown';

        // Add episode markers using history module
        if (window.HistoryModule && type === 'tv') {
            episodes = window.HistoryModule.renderEpisodeMarkers(seriesId, episodes);
        }

        container.innerHTML = '';

        // Show last watched episode info if available
        if (window.HistoryModule && type === 'tv') {
            const lastEpisode = window.HistoryModule.getLastWatchedEpisode(seriesId);
            if (lastEpisode) {
                const continueCard = document.createElement('div');
                continueCard.className = 'episode-card continue-watching-episode';
                continueCard.innerHTML = `
                    <div class="continue-episode-header">
                        <h4>🔄 Continue Watching</h4>
                        <span class="continue-episode-info">S${lastEpisode.seasonNumber || 1}E${lastEpisode.episodeNumber} - ${lastEpisode.title}</span>
                    </div>
                    ${linkItem.quality ? `<span class="quality">${linkItem.quality}</span>` : ''}
                `;
                continueCard.addEventListener('click', () => {
                    // Find and click the corresponding episode
                    const targetEpisode = episodes.find(ep =>
                        ep.episodeNumber == lastEpisode.episodeNumber ||
                        ep.title === lastEpisode.title
                    );
                    if (targetEpisode) {
                        loadPlayer(provider, targetEpisode.link, targetEpisode.type || type, {
                            episodeNumber: lastEpisode.episodeNumber,
                            seasonNumber: lastEpisode.seasonNumber,
                            episodeTitle: lastEpisode.title
                        });
                    }
                });
                container.appendChild(continueCard);
            }
        }

        episodes.forEach((episode, index) => {
            const card = document.createElement('div');
            card.className = `episode-card ${episode.watchedClass || ''}`;

            // Detect Dolby Atmos
            const hasDolbyAtmos = window.HistoryModule ?
                window.HistoryModule.detectDolbyAtmos({
                    server: episode.server || linkItem.server,
                    title: episode.title,
                    quality: linkItem.quality
                }) : false;

            card.innerHTML = `
                <div class="episode-header">
                    <h4>${episode.title}</h4>
                    ${episode.watchedIcon ? `<span class="watched-icon">${episode.watchedIcon}</span>` : ''}
                </div>
                <div class="episode-info">
                    ${linkItem.quality ? `<span class="quality">${linkItem.quality}</span>` : ''}
                    ${hasDolbyAtmos ? `<span class="dolby-badge">🔊 Dolby Atmos</span>` : ''}
                </div>
            `;

            card.addEventListener('click', () => {
                // Extract episode number from title if not provided
                let episodeNumber = episode.episodeNumber || index + 1;
                const episodeMatch = episode.title.match(/episode\s*(\d+)/i) || episode.title.match(/ep\s*(\d+)/i);
                if (episodeMatch) {
                    episodeNumber = parseInt(episodeMatch[1]);
                }

                // Mark episode as watched when clicked
                if (window.HistoryModule && type === 'tv') {
                    const episodeId = episode.link || episode.id || `${episode.title}-${episodeNumber}`;
                    window.HistoryModule.markEpisodeWatched(seriesId, episodeId, {
                        title: episode.title,
                        episodeNumber: episodeNumber,
                        seasonNumber: 1,
                        quality: linkItem.quality
                    });
                }

                loadPlayer(provider, episode.link, episode.type || type, {
                    episodeNumber: episodeNumber,
                    seasonNumber: 1, // Default to season 1, can be enhanced later
                    episodeTitle: episode.title,
                    quality: linkItem.quality,
                    hasDolbyAtmos: hasDolbyAtmos
                });
            });

            container.appendChild(card);
        });
    } catch (error) {
        console.error('Error loading episodes:', error);
        container.innerHTML = '<p style="color: #e50914;">Failed to load episodes.</p>';
    }
}

function renderStreamSelector(streams, provider, preferredStream = null) {
    console.log('🎬 renderStreamSelector called', { streams, provider, streamCount: streams.length, preferredStream });
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
            ${preferredStream ? `<br>⭐ <strong>Recommended:</strong> ${preferredStream.quality || 'Default'} quality based on your preferences.` : ''}
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

        // Check if this is the preferred stream
        const isPreferred = preferredStream && stream === preferredStream;
        const isActive = isPreferred || (index === 0 && !preferredStream);

        const option = document.createElement('div');
        option.className = `stream-option ${isActive ? 'active' : ''} ${isPreferred ? 'preferred' : ''}`;

        // Check if MKV FIRST before using the variable
        const isMKV = stream.link.toLowerCase().includes('.mkv');
        console.log(`  - Is MKV: ${isMKV}`);

        // Detect Dolby Atmos
        const hasDolbyAtmos = window.HistoryModule ?
            window.HistoryModule.detectDolbyAtmos(stream) : false;

        // Add indicators for special streams
        let indicator = '';
        if (stream.requiresExtraction) {
            indicator = '<span style="font-size: 11px; color: #ffa500;">⚠️ Needs extraction</span>';
            console.log('  - Marked for extraction');
        } else if (isMKV) {
            indicator = '<span style="font-size: 11px; color: #4CAF50;">✓ Direct link</span>';
            console.log('  - Direct MKV link detected');
        }

        if (isPreferred) {
            indicator += '<span style="font-size: 11px; color: #FFD700; margin-left: 5px;">⭐ Preferred</span>';
        }

        if (hasDolbyAtmos) {
            indicator += '<span style="font-size: 11px; color: #9C27B0; margin-left: 5px;">🔊 Dolby Atmos</span>';
            console.log('  - Dolby Atmos detected');
        }

        option.innerHTML = `
            <h4>${stream.server}</h4>
            ${stream.quality ? `<span class="quality">${stream.quality}p</span>` : ''}
            <span class="quality">${stream.type}</span>
            ${indicator}
            <div class="stream-option-buttons">
                <button class="stream-option-button stream-play-btn">
                    <span class="icon">▶️</span>
                    <span>Play</span>
                </button>
                <div class="external-player-dropdown">
                    <button class="stream-option-button stream-external-btn">
                        <span class="icon">📺</span>
                        <span>External</span>
                        <span class="dropdown-arrow">▼</span>
                    </button>
                    <div class="external-player-menu">
                        <button class="external-player-option" data-player="vlc">
                            <span class="player-icon">🎬</span>
                            <span>VLC Player</span>
                        </button>
                        <button class="external-player-option" data-player="potplayer">
                            <span class="player-icon">🎯</span>
                            <span>PotPlayer</span>
                        </button>
                        <button class="external-player-option" data-player="mpv">
                            <span class="player-icon">⚡</span>
                            <span>MPV Player</span>
                        </button>
                        <button class="external-player-option" data-player="auto">
                            <span class="player-icon">🔄</span>
                            <span>Auto Detect</span>
                        </button>
                    </div>
                </div>
                <button class="stream-option-button stream-download-btn">
                    <span class="icon">⬇️</span>
                    <span>Download</span>
                </button>
            </div>
        `;

        const playBtn = option.querySelector('.stream-play-btn');
        playBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.stream-option').forEach(el => el.classList.remove('active'));
            option.classList.add('active');
            playStream(stream);
        });

        // Enhanced external player handling
        const externalBtn = option.querySelector('.stream-external-btn');
        const externalMenu = option.querySelector('.external-player-menu');
        const dropdown = option.querySelector('.external-player-dropdown');

        // Toggle dropdown menu
        externalBtn.addEventListener('click', (e) => {
            e.stopPropagation();

            // Close other dropdowns
            document.querySelectorAll('.external-player-menu.show').forEach(menu => {
                if (menu !== externalMenu) {
                    menu.classList.remove('show');
                }
            });

            externalMenu.classList.toggle('show');
        });

        // Handle player selection
        option.querySelectorAll('.external-player-option').forEach(playerBtn => {
            playerBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const playerType = playerBtn.dataset.player;

                externalMenu.classList.remove('show');

                console.log(`🎬 Selected external player: ${playerType}`);
                await openExternalPlayer(stream, playerType === 'auto' ? null : playerType);
            });
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target)) {
                externalMenu.classList.remove('show');
            }
        });

        const downloadBtn = option.querySelector('.stream-download-btn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', async (e) => {
                e.stopPropagation();

                console.log('🔽 Enhanced download button clicked for stream:', stream.server);
                showLoading(true, 'Preparing download...');

                try {
                    let downloadUrl = stream.link;
                    let filename = generateDownloadFilename(stream, state.currentMeta?.meta?.title);

                    // Extract if needed
                    if (stream.requiresExtraction) {
                        console.log('🔄 Extracting download URL...');
                        try {
                            const response = await fetch(`${API_BASE}/api/proxy/stream?url=${encodeURIComponent(stream.link)}`);
                            if (response.ok) {
                                const data = await response.json();
                                downloadUrl = data.streamUrl;
                                console.log('✅ Extraction successful');
                            } else {
                                console.warn('⚠️ Extraction failed, using original URL');
                            }
                        } catch (error) {
                            console.error('❌ Extraction error:', error);
                        }
                    }

                    // Handle headers if present
                    if (stream.headers && Object.keys(stream.headers).length > 0) {
                        console.log('🔐 Stream requires headers, using proxy');
                        const headersParam = encodeURIComponent(JSON.stringify(stream.headers));
                        downloadUrl = `${API_BASE}/api/proxy/video?url=${encodeURIComponent(downloadUrl)}&headers=${headersParam}`;
                    }

                    // Start enhanced download with progress tracking
                    if (window.DownloadManager && typeof window.DownloadManager.startDownload === 'function') {
                        const downloadId = await DownloadManager.startDownload(downloadUrl, filename, {
                            source: 'stream_download',
                            streamServer: stream.server,
                            quality: stream.quality,
                            contentTitle: state.currentMeta?.meta?.title,
                            provider: state.selectedProvider,
                            streamType: stream.type
                        });

                        showToast(`Download started: ${filename}`, 'success', 3000);
                        console.log(`📥 Started enhanced download with ID: ${downloadId}`);
                    } else {
                        // Fallback to simple download with progress indicator
                        console.log('📥 DownloadManager not available, using fallback download');
                        const success = await trySimpleDownloadWithProgress(downloadUrl, filename);
                        if (success) {
                            showToast(`Download started: ${filename}`, 'success', 3000);
                        } else {
                            showToast('Download may have started. Check your downloads folder.', 'info', 4000);
                        }
                    }

                } catch (error) {
                    console.error('❌ Enhanced download failed:', error);
                    showError('Download failed: ' + error.message);
                } finally {
                    showLoading(false);
                }
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

        console.log('📊 Stream analysis:', { isMKV, isMP4, isM3U8, streamUrl: streamUrl.substring(0, 100) });

        if (isMKV) {
            console.log('🎬 MKV format detected, attempting to play');
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

                // Enhanced video progress tracking for HLS
                video.addEventListener('timeupdate', () => {
                    if (state.currentMeta && window.HistoryModule) {
                        const progress = video.currentTime;
                        const duration = video.duration;
                        if (duration > 0 && progress > 5) { // Only track after 5 seconds
                            // Prepare enhanced tracking data
                            const trackingData = {
                                quality: stream.quality,
                                hasDolbyAtmos: window.HistoryModule.detectDolbyAtmos(stream),
                                streamServer: stream.server
                            };

                            // Add episode data if available
                            if (state.currentEpisodeData) {
                                trackingData.episodeNumber = state.currentEpisodeData.episodeNumber;
                                trackingData.seasonNumber = state.currentEpisodeData.seasonNumber;
                                trackingData.episodeTitle = state.currentEpisodeData.episodeTitle;
                                trackingData.episodeId = `${state.currentEpisodeData.seasonNumber || 1}-${state.currentEpisodeData.episodeNumber}`;
                            }

                            window.HistoryModule.updateProgress(state.currentMeta.link, progress, duration, trackingData);

                            // Save quality preference
                            if (stream.quality && state.selectedProvider) {
                                window.HistoryModule.setQualityPreference(state.selectedProvider, stream.quality);
                            }
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

            // Enhanced video progress tracking for direct video
            video.addEventListener('timeupdate', () => {
                if (state.currentMeta && window.HistoryModule) {
                    const progress = video.currentTime;
                    const duration = video.duration;
                    if (duration > 0 && progress > 5) { // Only track after 5 seconds
                        // Prepare enhanced tracking data
                        const trackingData = {
                            quality: stream.quality,
                            hasDolbyAtmos: window.HistoryModule.detectDolbyAtmos(stream),
                            streamServer: stream.server
                        };

                        // Add episode data if available
                        if (state.currentEpisodeData) {
                            trackingData.episodeNumber = state.currentEpisodeData.episodeNumber;
                            trackingData.seasonNumber = state.currentEpisodeData.seasonNumber;
                            trackingData.episodeTitle = state.currentEpisodeData.episodeTitle;
                            trackingData.episodeId = `${state.currentEpisodeData.seasonNumber || 1}-${state.currentEpisodeData.episodeNumber}`;
                        }

                        window.HistoryModule.updateProgress(state.currentMeta.link, progress, duration, trackingData);

                        // Save quality preference
                        if (stream.quality && state.selectedProvider) {
                            window.HistoryModule.setQualityPreference(state.selectedProvider, stream.quality);
                        }
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

async function openExternalPlayer(stream, preferredPlayer = null) {
    console.log('🖥️ openExternalPlayer called with:', {
        server: stream.server,
        type: stream.type,
        quality: stream.quality,
        requiresExtraction: stream.requiresExtraction,
        linkPreview: stream.link.substring(0, 100),
        preferredPlayer
    });

    showLoading(true, 'Preparing external player...');
    try {
        let streamUrl = stream.link;

        if (stream.requiresExtraction) {
            console.log('🔄 External player extraction required');
            try {
                const extractUrl = `${API_BASE}/api/proxy/stream?url=${encodeURIComponent(stream.link)}`;
                console.log('🔄 Calling extraction endpoint for external playback:', extractUrl);
                const response = await fetch(extractUrl);
                if (!response.ok) {
                    throw new Error('Failed to extract stream link for external playback');
                }
                const data = await response.json();
                streamUrl = data.streamUrl;
                console.log('✅ Extraction complete for external playback');
            } catch (extractError) {
                console.error('❌ External extraction failure:', extractError);
                showError('Could not prepare stream for external playback. Try downloading instead.');
                return;
            }
        }

        if (stream.headers && Object.keys(stream.headers).length > 0) {
            console.log('🔐 Stream requires headers. Using proxy for external playback');
            const headersParam = encodeURIComponent(JSON.stringify(stream.headers));
            streamUrl = `${API_BASE}/api/proxy/video?url=${encodeURIComponent(streamUrl)}&headers=${headersParam}`;
        }

        const isM3U8 = stream.type === 'm3u8' || streamUrl.includes('.m3u8');
        const isMKV = streamUrl.toLowerCase().includes('.mkv');
        const metaTitle = state.currentMeta?.meta?.title || state.currentMeta?.meta?.name || stream.title || stream.server;

        // Check if running in Electron (desktop app) first
        const bridge = window.appBridge;
        if (bridge?.openExternalPlayer) {
            console.log('🛤️ Attempting to launch external player via Electron bridge');
            try {
                const result = await bridge.openExternalPlayer({
                    url: streamUrl,
                    title: metaTitle,
                    player: preferredPlayer
                });
                console.log('🔁 External player IPC result:', result);

                if (result?.ok) {
                    if (result.player) {
                        const playerName = result.player.split(/[\\\/]/).pop() || result.player;
                        showToast(`Opening stream in ${playerName}.`, 'success', 3000);
                    } else if (result?.fallback === 'browser') {
                        showToast('No external player detected. Opened stream in default browser.', 'info', 4000);
                    } else {
                        showToast('External player launched.', 'success', 3000);
                    }
                    return;
                }

                console.warn('⚠️ External player handler returned failure, falling back to web method:', result);
            } catch (ipcError) {
                console.error('❌ External player IPC error:', ipcError);
                showToast('External player launch failed. Falling back to web method.', 'error', 3000);
            }
        }

        // Fallback to web-based external player methods
        console.log('🌐 Using enhanced web-based external player methods');
        await openExternalPlayerWeb(streamUrl, preferredPlayer, metaTitle, isM3U8, isMKV);

    } catch (error) {
        console.error('❌ Failed to prepare external player link:', error);
        showError('Failed to prepare external player link: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// Enhanced web-based external player function for browsers
async function openExternalPlayerWeb(streamUrl, preferredPlayer, title, isM3U8, isMKV) {
    console.log('🌐 openExternalPlayerWeb called for:', preferredPlayer);

    // Copy to clipboard first
    let clipboardCopied = false;
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(streamUrl);
            clipboardCopied = true;
            console.log('📋 Stream link copied to clipboard');
        }
    } catch (clipboardError) {
        console.warn('⚠️ Failed to copy link to clipboard:', clipboardError);
    }

    // Detect device type
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobile = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    const isAndroid = /android/i.test(userAgent);
    const isIOS = /iphone|ipad|ipod/i.test(userAgent);

    // Try multiple methods for better compatibility
    let playerOpened = false;

    if (isMobile) {
        playerOpened = await tryMobileExternalPlayer(streamUrl, preferredPlayer, title, isAndroid, isIOS);
    } else {
        playerOpened = await tryDesktopExternalPlayer(streamUrl, preferredPlayer, title);
    }

    // Always show the enhanced modal for better user experience
    setTimeout(() => {
        showEnhancedExternalPlayerModal(streamUrl, title, preferredPlayer, isMobile, isAndroid, isIOS, clipboardCopied, playerOpened);
    }, playerOpened ? 1500 : 100);
}

// Enhanced mobile external player handling
async function tryMobileExternalPlayer(streamUrl, preferredPlayer, title, isAndroid, isIOS) {
    console.log('📱 Trying mobile external player with enhanced methods');

    let playerOpened = false;

    if (isAndroid) {
        playerOpened = await tryAndroidPlayers(streamUrl, preferredPlayer, title);
    } else if (isIOS) {
        playerOpened = await tryIOSPlayers(streamUrl, preferredPlayer, title);
    }

    return playerOpened;
}

// Android player methods with multiple fallbacks
async function tryAndroidPlayers(streamUrl, preferredPlayer, title) {
    const methods = [];

    // VLC for Android - multiple methods
    if (preferredPlayer === 'vlc' || preferredPlayer === 'auto') {
        methods.push(
            // Method 1: Direct intent with package
            () => tryAndroidIntent(streamUrl, 'org.videolan.vlc', 'VLC for Android'),
            // Method 2: Alternative intent format
            () => tryAlternativeAndroidIntent(streamUrl, 'org.videolan.vlc', 'VLC Alternative'),
            // Method 3: Generic video intent
            () => tryGenericVideoIntent(streamUrl, 'org.videolan.vlc'),
            // Method 4: Market intent to install
            () => tryMarketIntent('org.videolan.vlc', 'VLC for Android')
        );
    }

    // MX Player - multiple methods
    if (preferredPlayer === 'mx' || preferredPlayer === 'auto') {
        methods.push(
            () => tryAndroidIntent(streamUrl, 'com.mxtech.videoplayer.ad', 'MX Player Free'),
            () => tryAndroidIntent(streamUrl, 'com.mxtech.videoplayer.pro', 'MX Player Pro'),
            () => tryGenericVideoIntent(streamUrl, 'com.mxtech.videoplayer.ad'),
            () => tryMarketIntent('com.mxtech.videoplayer.ad', 'MX Player')
        );
    }

    // MPV for Android
    if (preferredPlayer === 'mpv' || preferredPlayer === 'auto') {
        methods.push(
            () => tryAndroidIntent(streamUrl, 'is.xyz.mpv', 'MPV for Android'),
            () => tryGenericVideoIntent(streamUrl, 'is.xyz.mpv')
        );
    }

    // Try all methods with delays
    for (let i = 0; i < methods.length; i++) {
        try {
            const success = await methods[i]();
            if (success) {
                return true;
            }
            // Optimized delay for faster mobile loading
            await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
            console.warn(`Android method ${i + 1} failed:`, error);
        }
    }

    return false;
}

// iOS player methods with multiple fallbacks
async function tryIOSPlayers(streamUrl, preferredPlayer, title) {
    const methods = [];

    // VLC for iOS
    if (preferredPlayer === 'vlc' || preferredPlayer === 'auto') {
        methods.push(
            () => tryIOSProtocol(`vlc-x-callback://x-callback-url/stream?url=${encodeURIComponent(streamUrl)}`, 'VLC for iOS'),
            () => tryIOSProtocol(`vlc://${streamUrl}`, 'VLC Protocol'),
            () => tryAppStoreRedirect('650377962', 'VLC for iOS')
        );
    }

    // Infuse for iOS
    if (preferredPlayer === 'infuse' || preferredPlayer === 'auto') {
        methods.push(
            () => tryIOSProtocol(`infuse://x-callback-url/play?url=${encodeURIComponent(streamUrl)}`, 'Infuse'),
            () => tryAppStoreRedirect('1136220934', 'Infuse 7')
        );
    }

    // PlayerXtreme for iOS
    if (preferredPlayer === 'auto') {
        methods.push(
            () => tryIOSProtocol(`playerxtreme://play?url=${encodeURIComponent(streamUrl)}`, 'PlayerXtreme')
        );
    }

    // Try all methods
    for (let i = 0; i < methods.length; i++) {
        try {
            const success = await methods[i]();
            if (success) {
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
            console.warn(`iOS method ${i + 1} failed:`, error);
        }
    }

    return false;
}

// Android intent helper
async function tryAndroidIntent(streamUrl, packageName, playerName) {
    try {
        console.log(`🎬 Trying Android intent for ${playerName} with URL: ${streamUrl}`);

        // Ensure URL is properly formatted for mobile players
        let formattedUrl = streamUrl;

        // Make sure we have a complete HTTP/HTTPS URL
        if (!streamUrl.startsWith('http://') && !streamUrl.startsWith('https://')) {
            formattedUrl = 'https://' + streamUrl;
        }

        // For VLC, use special handling to avoid file:// protocol issues
        if (packageName === 'org.videolan.vlc') {
            return await tryVLCSpecialIntent(formattedUrl, playerName);
        }

        // For other players, use standard intent format but keep full URL
        const intentUrl = `intent:${formattedUrl}#Intent;action=android.intent.action.VIEW;type=video/*;package=${packageName};S.title=Video Stream;end`;

        console.log(`🎬 Intent URL: ${intentUrl}`);

        // Try multiple methods to launch the intent
        const methods = [
            () => {
                window.location.href = intentUrl;
            },
            () => {
                const link = document.createElement('a');
                link.href = intentUrl;
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            },
            () => {
                const iframe = document.createElement('iframe');
                iframe.style.display = 'none';
                iframe.src = intentUrl;
                document.body.appendChild(iframe);
                setTimeout(() => {
                    try {
                        document.body.removeChild(iframe);
                    } catch (e) { }
                }, 2000);
            }
        ];

        // Try each method
        for (let i = 0; i < methods.length; i++) {
            try {
                methods[i]();
                showToast(`Opening in ${playerName}... (Method ${i + 1})`, 'info', 2000);
                return true;
            } catch (error) {
                console.warn(`Method ${i + 1} failed:`, error);
                if (i < methods.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
        }

        return false;
    } catch (error) {
        console.error(`Android intent failed for ${playerName}:`, error);
        return false;
    }
}

// Special VLC intent handling to avoid file:// protocol issues
async function tryVLCSpecialIntent(streamUrl, playerName) {
    console.log(`🎬 Special VLC handling for URL: ${streamUrl}`);

    const vlcMethods = [
        // Method 1: Direct HTTP URL with proper intent structure
        () => {
            const intentUrl = `intent:${streamUrl}#Intent;action=android.intent.action.VIEW;type=video/*;package=org.videolan.vlc;S.title=Stream;S.from_start=false;end`;
            window.location.href = intentUrl;
        },
        // Method 2: Using data parameter
        () => {
            const intentUrl = `intent://view#Intent;action=android.intent.action.VIEW;data=${encodeURIComponent(streamUrl)};type=video/*;package=org.videolan.vlc;end`;
            window.location.href = intentUrl;
        },
        // Method 3: VLC-specific scheme
        () => {
            const vlcUrl = `vlc://${streamUrl}`;
            window.location.href = vlcUrl;
        },
        // Method 4: Generic video intent with explicit scheme
        () => {
            const intentUrl = `intent:${streamUrl}#Intent;scheme=https;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;package=org.videolan.vlc;end`;

            const link = document.createElement('a');
            link.href = intentUrl;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        },
        // Method 5: Using iframe with delay
        () => {
            const intentUrl = `intent:${streamUrl}#Intent;action=android.intent.action.VIEW;type=video/*;package=org.videolan.vlc;end`;

            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.src = intentUrl;
            document.body.appendChild(iframe);

            setTimeout(() => {
                try {
                    document.body.removeChild(iframe);
                } catch (e) { }
            }, 3000);
        }
    ];

    // Try each VLC method with delays
    for (let i = 0; i < vlcMethods.length; i++) {
        try {
            console.log(`🎬 Trying VLC method ${i + 1}`);
            vlcMethods[i]();
            showToast(`Opening in ${playerName}... (VLC Method ${i + 1})`, 'info', 2000);

            // Wait a bit to see if it works before trying next method
            await new Promise(resolve => setTimeout(resolve, 1000));
            return true;
        } catch (error) {
            console.warn(`VLC method ${i + 1} failed:`, error);
            if (i < vlcMethods.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
    }

    return false;
}

// Alternative Android intent format
async function tryAlternativeAndroidIntent(streamUrl, packageName, playerName) {
    try {
        const intentUrl = `intent://view#Intent;action=android.intent.action.VIEW;data=${encodeURIComponent(streamUrl)};type=video/*;package=${packageName};end`;

        window.location.href = intentUrl;
        showToast(`Trying alternative method for ${playerName}...`, 'info', 2000);
        return true;
    } catch (error) {
        console.warn(`Alternative Android intent failed for ${playerName}:`, error);
        return false;
    }
}

// Generic video intent for Android
async function tryGenericVideoIntent(streamUrl, packageName) {
    try {
        const intentUrl = `intent://view#Intent;action=android.intent.action.VIEW;data=${encodeURIComponent(streamUrl)};type=video/*;package=${packageName};end`;

        const link = document.createElement('a');
        link.href = intentUrl;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        return true;
    } catch (error) {
        return false;
    }
}

// Market intent to install app
async function tryMarketIntent(packageName, appName) {
    try {
        const marketUrl = `market://details?id=${packageName}`;
        const playStoreUrl = `https://play.google.com/store/apps/details?id=${packageName}`;

        // Try market protocol first
        try {
            window.location.href = marketUrl;
        } catch (e) {
            // Fallback to Play Store web
            window.open(playStoreUrl, '_blank');
        }

        showToast(`Redirecting to install ${appName}...`, 'info', 2000);
        return true;
    } catch (error) {
        return false;
    }
}

// iOS protocol helper
async function tryIOSProtocol(protocolUrl, playerName) {
    try {
        console.log(`🍎 Trying iOS protocol for ${playerName}: ${protocolUrl}`);

        // Multiple methods to try iOS protocols
        const methods = [
            () => {
                window.location.href = protocolUrl;
            },
            () => {
                const link = document.createElement('a');
                link.href = protocolUrl;
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            },
            () => {
                // Try opening in a new window first, then redirect
                const newWindow = window.open(protocolUrl, '_blank');
                if (newWindow) {
                    setTimeout(() => newWindow.close(), 100);
                }
            },
            () => {
                // Create iframe method for iOS
                const iframe = document.createElement('iframe');
                iframe.style.display = 'none';
                iframe.src = protocolUrl;
                document.body.appendChild(iframe);

                setTimeout(() => {
                    try {
                        document.body.removeChild(iframe);
                    } catch (e) { }
                }, 2000);
            }
        ];

        // Try each method with small delays
        for (let i = 0; i < methods.length; i++) {
            try {
                methods[i]();
                showToast(`Opening in ${playerName}... (iOS Method ${i + 1})`, 'info', 2000);

                // Wait a bit before trying next method
                if (i < methods.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 800));
                }
            } catch (error) {
                console.warn(`iOS method ${i + 1} failed:`, error);
            }
        }

        return true;
    } catch (error) {
        console.error(`iOS protocol failed for ${playerName}:`, error);
        return false;
    }
}

// App Store redirect for iOS
async function tryAppStoreRedirect(appId, appName) {
    try {
        const appStoreUrl = `https://apps.apple.com/app/id${appId}`;
        window.open(appStoreUrl, '_blank');
        showToast(`Redirecting to install ${appName}...`, 'info', 2000);
        return true;
    } catch (error) {
        return false;
    }
}

// Enhanced desktop external player handling with multiple retry methods
async function tryDesktopExternalPlayer(streamUrl, preferredPlayer, title) {
    console.log('🖥️ Trying desktop external player with enhanced methods');

    let playerOpened = false;

    // VLC Player - multiple methods
    if (preferredPlayer === 'vlc' || preferredPlayer === 'auto') {
        playerOpened = await tryDesktopVLC(streamUrl, title);
        if (playerOpened) return true;
    }

    // PotPlayer - multiple methods
    if (preferredPlayer === 'potplayer') {
        playerOpened = await tryDesktopPotPlayer(streamUrl, title);
        if (playerOpened) return true;
    }

    // MPV Player - multiple methods
    if (preferredPlayer === 'mpv' || preferredPlayer === 'auto') {
        playerOpened = await tryDesktopMPV(streamUrl, title);
        if (playerOpened) return true;
    }

    // Windows Media Player support removed for better compatibility

    // Generic fallback methods
    if (!playerOpened) {
        playerOpened = await tryGenericDesktopMethods(streamUrl, title);
    }

    return playerOpened;
}

// VLC Player methods
async function tryDesktopVLC(streamUrl, title) {
    console.log('🎬 Enhanced VLC for Windows PC with URL:', streamUrl);

    const methods = [
        // Method 1: Standard VLC protocol
        () => tryDesktopProtocol(`vlc://${streamUrl}`, 'VLC Standard Protocol'),

        // Method 2: VLC with triple slash (Windows specific)
        () => tryDesktopProtocol(`vlc:///${streamUrl}`, 'VLC Windows Protocol'),

        // Method 3: VLC file association
        () => tryVLCFileAssociation(streamUrl, title),

        // Method 4: VLC command line simulation
        () => tryVLCCommandLine(streamUrl, title),

        // Method 5: VLC registry protocol
        () => tryVLCRegistryProtocol(streamUrl, title),

        // Method 6: Generic video protocol
        () => tryGenericVideoProtocol(streamUrl, 'vlc'),

        // Method 7: Windows shell execute simulation
        () => tryWindowsShellExecute(streamUrl, 'vlc.exe'),

        // Method 8: Original methods as fallback
        () => tryDesktopIframe(`vlc://${streamUrl}`, 'VLC Iframe'),
        () => tryDesktopLocation(`vlc://${streamUrl}`, 'VLC Location'),
        () => tryDesktopCustomScheme('vlc', streamUrl, 'VLC Custom')
    ];

    return await tryDesktopMethods(methods, 'VLC Media Player');
}

// PotPlayer methods
async function tryDesktopPotPlayer(streamUrl, title) {
    const methods = [
        () => tryDesktopProtocol(`potplayer://${streamUrl}`, 'PotPlayer'),
        () => tryDesktopProtocol(`potplayer:///${streamUrl}`, 'PotPlayer Alternative'),
        () => tryDesktopIframe(`potplayer://${streamUrl}`, 'PotPlayer Iframe'),
        () => tryDesktopLocation(`potplayer://${streamUrl}`, 'PotPlayer Location'),
        () => tryDesktopCustomScheme('potplayer', streamUrl, 'PotPlayer Custom')
    ];

    return await tryDesktopMethods(methods, 'PotPlayer');
}

// MPV Player methods
async function tryDesktopMPV(streamUrl, title) {
    const methods = [
        () => tryDesktopProtocol(`mpv://${streamUrl}`, 'MPV Player'),
        () => tryDesktopProtocol(`mpv:///${streamUrl}`, 'MPV Alternative'),
        () => tryDesktopIframe(`mpv://${streamUrl}`, 'MPV Iframe'),
        () => tryDesktopLocation(`mpv://${streamUrl}`, 'MPV Location')
    ];

    return await tryDesktopMethods(methods, 'MPV');
}

// Windows Media Player methods
async function tryDesktopWMP(streamUrl, title) {
    console.log('🎬 Enhanced Windows Media Player with URL:', streamUrl);

    const methods = [
        // Method 1: Standard WMP protocol
        () => tryDesktopProtocol(`wmplayer://${streamUrl}`, 'WMP Protocol'),

        // Method 2: MMS protocol (traditional WMP)
        () => tryWMPMmsProtocol(streamUrl, title),

        // Method 3: Windows Media format
        () => tryWMPWindowsMedia(streamUrl, title),

        // Method 4: WMP file association
        () => tryWMPFileAssociation(streamUrl, title),

        // Method 5: WMP registry protocol
        () => tryWMPRegistryProtocol(streamUrl, title),

        // Method 6: Generic Windows media
        () => tryGenericWindowsMedia(streamUrl, title),

        // Method 7: WMP command line
        () => tryWMPCommandLine(streamUrl, title)
    ];

    return await tryDesktopMethods(methods, 'Windows Media Player');
}

// Generic desktop methods
async function tryGenericDesktopMethods(streamUrl, title) {
    const methods = [
        () => tryDirectDownload(streamUrl, title),
        () => tryNewTabOpen(streamUrl, title),
        () => tryDesktopRegistry(streamUrl, title)
    ];

    return await tryDesktopMethods(methods, 'Generic');
}

// Helper to try multiple desktop methods
async function tryDesktopMethods(methods, playerName) {
    for (let i = 0; i < methods.length; i++) {
        try {
            const success = await methods[i]();
            if (success) {
                showToast(`Opening in ${playerName}...`, 'success', 2000);
                return true;
            }
            // Delay between attempts
            await new Promise(resolve => setTimeout(resolve, 300));
        } catch (error) {
            console.warn(`${playerName} method ${i + 1} failed:`, error);
        }
    }
    return false;
}

// Desktop protocol method
async function tryDesktopProtocol(protocolUrl, methodName) {
    try {
        const link = document.createElement('a');
        link.href = protocolUrl;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return true;
    } catch (error) {
        console.warn(`${methodName} protocol failed:`, error);
        return false;
    }
}

// Desktop iframe method
async function tryDesktopIframe(protocolUrl, methodName) {
    try {
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = protocolUrl;
        document.body.appendChild(iframe);

        setTimeout(() => {
            try {
                document.body.removeChild(iframe);
            } catch (e) { }
        }, 2000);

        return true;
    } catch (error) {
        console.warn(`${methodName} iframe failed:`, error);
        return false;
    }
}

// Desktop location method
async function tryDesktopLocation(protocolUrl, methodName) {
    try {
        const currentLocation = window.location.href;
        window.location.href = protocolUrl;

        // Restore location after a delay
        setTimeout(() => {
            if (window.location.href === protocolUrl) {
                window.location.href = currentLocation;
            }
        }, 1000);

        return true;
    } catch (error) {
        console.warn(`${methodName} location failed:`, error);
        return false;
    }
}

// Custom scheme method
async function tryDesktopCustomScheme(scheme, streamUrl, methodName) {
    try {
        const customUrl = `${scheme}:${streamUrl}`;
        window.open(customUrl, '_blank');
        return true;
    } catch (error) {
        console.warn(`${methodName} custom scheme failed:`, error);
        return false;
    }
}

// Direct download method
async function tryDirectDownload(streamUrl, title) {
    try {
        if (streamUrl.includes('.mp4') || streamUrl.includes('.mkv') || streamUrl.includes('.avi')) {
            const link = document.createElement('a');
            link.href = streamUrl;
            link.download = title || 'video';
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showToast('Starting download... You can open the file with your preferred player.', 'info', 4000);
            return true;
        }
        return false;
    } catch (error) {
        return false;
    }
}

// New tab open method
async function tryNewTabOpen(streamUrl, title) {
    try {
        const newWindow = window.open(streamUrl, '_blank', 'noopener,noreferrer');
        if (newWindow) {
            showToast('Opened in new tab. Right-click to save or open with external player.', 'info', 4000);
            return true;
        }
        return false;
    } catch (error) {
        return false;
    }
}

// Registry-based method (Windows)
async function tryDesktopRegistry(streamUrl, title) {
    try {
        // Try common video file associations
        const extensions = ['.mp4', '.avi', '.mkv', '.mov'];
        const hasVideoExtension = extensions.some(ext => streamUrl.toLowerCase().includes(ext));

        if (hasVideoExtension) {
            // Create a blob URL and try to open it
            const response = await fetch(streamUrl, { method: 'HEAD' });
            if (response.ok) {
                const link = document.createElement('a');
                link.href = streamUrl;
                link.target = '_blank';
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                return true;
            }
        }
        return false;
    } catch (error) {
        return false;
    }
}

// Enhanced helper function to try opening URLs with multiple methods
async function tryOpenUrl(url) {
    const methods = [
        // Method 1: Window location
        () => {
            window.location.href = url;
            return true;
        },
        // Method 2: Window open and close
        () => {
            const newWindow = window.open(url, '_blank');
            if (newWindow) {
                setTimeout(() => newWindow.close(), 100);
                return true;
            }
            return false;
        },
        // Method 3: Link click
        () => {
            const link = document.createElement('a');
            link.href = url;
            link.style.display = 'none';
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            return true;
        },
        // Method 4: Iframe
        () => {
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.src = url;
            document.body.appendChild(iframe);
            setTimeout(() => {
                try {
                    document.body.removeChild(iframe);
                } catch (e) { }
            }, 1000);
            return true;
        },
        // Method 5: Form submission
        () => {
            const form = document.createElement('form');
            form.method = 'GET';
            form.action = url;
            form.target = '_blank';
            form.style.display = 'none';
            document.body.appendChild(form);
            form.submit();
            document.body.removeChild(form);
            return true;
        }
    ];

    for (let i = 0; i < methods.length; i++) {
        try {
            const success = methods[i]();
            if (success) {
                return Promise.resolve();
            }
        } catch (error) {
            console.warn(`URL open method ${i + 1} failed:`, error);
            if (i === methods.length - 1) {
                return Promise.reject(error);
            }
        }
        // Small delay between methods
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    return Promise.reject(new Error('All URL opening methods failed'));
}

// Enhanced external player modal with better functionality
function showEnhancedExternalPlayerModal(streamUrl, title, preferredPlayer, isMobile, isAndroid, isIOS, clipboardCopied, playerOpened) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';

    const statusMessage = playerOpened ?
        '✅ Attempted to open external player. If it didn\'t work, try the options below:' :
        '📺 Choose how to open this video in an external player:';

    modal.innerHTML = `
        <div class="modal-content external-player-modal">
            <div class="modal-header">
                <h3>📺 External Player</h3>
                <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">×</button>
            </div>
            <div class="modal-body">
                <p><strong>${title}</strong></p>
                <p class="status-message">${statusMessage}</p>
                
                <div class="stream-url-container">
                    <input type="text" class="stream-url-input" value="${streamUrl}" readonly>
                    <button class="copy-url-btn" onclick="copyStreamUrl(this, '${streamUrl}')" ${clipboardCopied ? 'data-copied="true"' : ''}>
                        ${clipboardCopied ? '✅ Copied!' : '📋 Copy'}
                    </button>
                </div>
                
                ${isMobile ? generateMobilePlayerOptions(streamUrl, title, isAndroid, isIOS) : generateDesktopPlayerOptions(streamUrl, title)}
                
                <div class="quick-actions">
                    <button class="action-btn" onclick="tryDirectDownload('${streamUrl}', '${title}')">
                        ⬇️ Download Video
                    </button>
                    <button class="action-btn" onclick="shareStreamUrl('${streamUrl}', '${title}')">
                        📤 Share Link
                    </button>
                </div>
                
                <div class="modal-actions">
                    <button class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Auto-select the URL input for easy copying
    const urlInput = modal.querySelector('.stream-url-input');
    if (urlInput) {
        urlInput.focus();
        urlInput.select();
    }
}

// Generate mobile player options
function generateMobilePlayerOptions(streamUrl, title, isAndroid, isIOS) {
    // Ensure we have a proper HTTP URL
    let properUrl = streamUrl;
    if (!streamUrl.startsWith('http://') && !streamUrl.startsWith('https://')) {
        properUrl = 'https://' + streamUrl;
    }

    console.log(`📱 Generating mobile options for URL: ${properUrl}`);

    const androidPlayers = [
        {
            name: 'VLC for Android',
            package: 'org.videolan.vlc',
            playUrl: `vlc://${properUrl}`,
            storeUrl: 'https://play.google.com/store/apps/details?id=org.videolan.vlc',
            description: 'Most compatible player - Recommended'
        },
        {
            name: 'MX Player',
            package: 'com.mxtech.videoplayer.ad',
            playUrl: `mxplayer://${properUrl}`,
            storeUrl: 'https://play.google.com/store/apps/details?id=com.mxtech.videoplayer.ad',
            description: 'Popular Android player'
        },
        {
            name: 'MPV for Android',
            package: 'is.xyz.mpv',
            playUrl: `mpv://${properUrl}`,
            storeUrl: 'https://f-droid.org/packages/is.xyz.mpv/',
            description: 'Lightweight player'
        },
        {
            name: 'BSPlayer',
            package: 'com.bsplayer.bspandroid.free',
            playUrl: `bsplayer://${properUrl}`,
            storeUrl: 'https://play.google.com/store/apps/details?id=com.bsplayer.bspandroid.free',
            description: 'Feature-rich player'
        }
    ];

    const iosPlayers = [
        {
            name: 'VLC for iOS',
            playUrl: `vlc-x-callback://x-callback-url/stream?url=${encodeURIComponent(properUrl)}`,
            storeUrl: 'https://apps.apple.com/app/vlc-for-mobile/id650377962',
            description: 'Most compatible player - Recommended'
        },
        {
            name: 'Infuse 7',
            playUrl: `infuse://x-callback-url/play?url=${encodeURIComponent(properUrl)}`,
            storeUrl: 'https://apps.apple.com/app/infuse-7/id1136220934',
            description: 'Premium iOS player'
        },
        {
            name: 'PlayerXtreme',
            playUrl: `playerxtreme://play?url=${encodeURIComponent(properUrl)}`,
            storeUrl: 'https://apps.apple.com/app/playerxtreme-media-player/id456584471',
            description: 'Versatile media player'
        }
    ];

    const players = isAndroid ? androidPlayers : isIOS ? iosPlayers : [...androidPlayers, ...iosPlayers];

    return `
        <div class="mobile-player-options">
            <h4>📱 Try Opening in Apps:</h4>
            <div class="player-buttons">
                ${players.map(player => `
                    <button class="player-action-btn" onclick="tryOpenMobilePlayer('${player.playUrl}', '${player.name}')" title="${player.description}">
                        🎬 Open in ${player.name}
                        ${player.description.includes('Recommended') ? ' ⭐' : ''}
                    </button>
                `).join('')}
            </div>
            
            <div class="troubleshooting-tips">
                <h4>💡 If VLC opens and closes immediately:</h4>
                <ul>
                    <li>✅ Try MX Player or another alternative</li>
                    <li>✅ Copy the URL manually and paste it in VLC</li>
                    <li>✅ Make sure you have a stable internet connection</li>
                    <li>✅ Some streams may require specific player settings</li>
                </ul>
            </div>
            
            <h4>📥 Install Players:</h4>
            <div class="player-links">
                ${players.map(player => `
                    <a href="${player.storeUrl}" target="_blank" class="player-link" title="${player.description}">
                        📱 Get ${player.name}
                    </a>
                `).join('')}
            </div>
        </div>
    `;
}

// Generate desktop player options
function generateDesktopPlayerOptions(streamUrl, title) {
    return `
        <div class="desktop-player-options">
            <h4>🖥️ Try Opening in Players:</h4>
            <div class="player-buttons">
                <button class="player-action-btn" onclick="tryOpenDesktopPlayer('vlc://${streamUrl}', 'VLC Media Player')">
                    🎬 Open in VLC
                </button>
                <button class="player-action-btn" onclick="tryOpenDesktopPlayer('potplayer://${streamUrl}', 'PotPlayer')">
                    📺 Open in PotPlayer
                </button>
                <button class="player-action-btn" onclick="tryOpenDesktopPlayer('mpv://${streamUrl}', 'MPV Player')">
                    ⚡ Open in MPV
                </button>

            </div>
            
            <div class="desktop-instructions">
                <h4>📋 Manual Instructions:</h4>
                <ul>
                    <li><strong>VLC:</strong> Media → Open Network Stream → Paste URL</li>
                    <li><strong>PotPlayer:</strong> Right-click → Open → Open URL (Ctrl+U)</li>
                    <li><strong>MPV:</strong> Drag & drop URL or use command line</li>
                    <li><strong>Windows Media Player:</strong> File → Open URL</li>
                </ul>
            </div>
        </div>
    `;
}

// Make external player functions globally available
window.openExternalPlayerWeb = openExternalPlayerWeb;
window.showEnhancedExternalPlayerModal = showEnhancedExternalPlayerModal;
window.copyStreamUrl = copyStreamUrl;

// Backward compatibility function
window.showExternalPlayerModal = function (streamUrl, title, message, isMobile) {
    try {
        const userAgent = navigator.userAgent.toLowerCase();
        const isAndroid = /android/i.test(userAgent);
        const isIOS = /iphone|ipad|ipod/i.test(userAgent);
        showEnhancedExternalPlayerModal(streamUrl, title, null, isMobile, isAndroid, isIOS, false, false);
    } catch (error) {
        console.error('Error in showExternalPlayerModal:', error);
        // Simple fallback
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(streamUrl).then(() => {
                showToast('Stream URL copied to clipboard. Paste it in your external player.', 'info', 4000);
            }).catch(() => {
                showToast('Copy this URL to your external player: ' + streamUrl, 'info', 6000);
            });
        } else {
            showToast('Copy this URL to your external player: ' + streamUrl, 'info', 6000);
        }
    }
};

// Global error handler for external player functions
window.addEventListener('error', function (event) {
    if (event.error && event.error.message && event.error.message.includes('external')) {
        console.error('External player error caught:', event.error);
        showToast('External player error. Please try copying the URL manually.', 'error', 3000);
    }
});

// Copy stream URL function
function copyStreamUrl(button, url) {
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(url).then(() => {
            const originalText = button.textContent;
            button.textContent = '✅ Copied!';
            button.style.background = '#4CAF50';
            setTimeout(() => {
                button.textContent = originalText;
                button.style.background = '';
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy:', err);
            showToast('Failed to copy URL', 'error', 2000);
        });
    } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = url;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            const originalText = button.textContent;
            button.textContent = '✅ Copied!';
            button.style.background = '#4CAF50';
            setTimeout(() => {
                button.textContent = originalText;
                button.style.background = '';
            }, 2000);
        } catch (err) {
            console.error('Fallback copy failed:', err);
            showToast('Failed to copy URL', 'error', 2000);
        }
        document.body.removeChild(textArea);
    }
}

// Enhanced mobile player opening with better URL handling
function tryOpenMobilePlayer(playerUrl, playerName) {
    try {
        console.log(`📱 Trying to open ${playerName} with URL: ${playerUrl}`);

        // Special handling for different players
        if (playerName.includes('VLC')) {
            tryVLCMobilePlayer(playerUrl, playerName);
        } else if (playerName.includes('MX Player')) {
            tryMXMobilePlayer(playerUrl, playerName);
        } else {
            // Generic mobile player opening
            tryGenericMobilePlayer(playerUrl, playerName);
        }

        showToast(`Attempting to open ${playerName}...`, 'info', 2000);
    } catch (error) {
        console.error(`Failed to open ${playerName}:`, error);
        showToast(`Failed to open ${playerName}. Make sure it's installed.`, 'error', 3000);
    }
}

// VLC mobile player specific handling
function tryVLCMobilePlayer(playerUrl, playerName) {
    const userAgent = navigator.userAgent.toLowerCase();
    const isAndroid = /android/i.test(userAgent);
    const isIOS = /iphone|ipad|ipod/i.test(userAgent);

    if (isAndroid) {
        // Extract the actual video URL from the VLC protocol URL
        let videoUrl = playerUrl.replace('vlc://', '');
        if (!videoUrl.startsWith('http')) {
            videoUrl = 'https://' + videoUrl;
        }

        // Try VLC Android with proper intent
        const intentUrl = `intent:${videoUrl}#Intent;action=android.intent.action.VIEW;type=video/*;package=org.videolan.vlc;S.title=Video Stream;end`;

        // Try multiple methods
        setTimeout(() => window.location.href = intentUrl, 100);
        setTimeout(() => {
            const link = document.createElement('a');
            link.href = intentUrl;
            link.click();
        }, 500);

    } else if (isIOS) {
        // For iOS, try the x-callback URL first
        const videoUrl = playerUrl.replace('vlc://', '');
        const callbackUrl = `vlc-x-callback://x-callback-url/stream?url=${encodeURIComponent(videoUrl)}`;

        window.location.href = callbackUrl;

        // Fallback to regular VLC protocol
        setTimeout(() => {
            window.location.href = playerUrl;
        }, 1000);
    }
}

// MX Player specific handling
function tryMXMobilePlayer(playerUrl, playerName) {
    const userAgent = navigator.userAgent.toLowerCase();
    const isAndroid = /android/i.test(userAgent);

    if (isAndroid) {
        // Extract video URL and create proper MX Player intent
        let videoUrl = playerUrl.replace(/^.*:\/\//, 'https://');

        const intentUrl = `intent:${videoUrl}#Intent;action=android.intent.action.VIEW;type=video/*;package=com.mxtech.videoplayer.ad;end`;

        window.location.href = intentUrl;

        // Try pro version as fallback
        setTimeout(() => {
            const proIntentUrl = `intent:${videoUrl}#Intent;action=android.intent.action.VIEW;type=video/*;package=com.mxtech.videoplayer.pro;end`;
            window.location.href = proIntentUrl;
        }, 1000);
    }
}

// Generic mobile player handling
function tryGenericMobilePlayer(playerUrl, playerName) {
    // Try direct protocol first
    window.location.href = playerUrl;

    // Try with link element as fallback
    setTimeout(() => {
        const link = document.createElement('a');
        link.href = playerUrl;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, 500);
}

// Try opening desktop player
function tryOpenDesktopPlayer(playerUrl, playerName) {
    try {
        const link = document.createElement('a');
        link.href = playerUrl;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast(`Attempting to open ${playerName}...`, 'info', 2000);
    } catch (error) {
        console.error(`Failed to open ${playerName}:`, error);
        showToast(`Failed to open ${playerName}. Make sure it's installed.`, 'error', 3000);
    }
}

// Try direct download
function tryDirectDownload(streamUrl, title) {
    try {
        const link = document.createElement('a');
        link.href = streamUrl;
        link.download = title || 'video';
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('Download started...', 'success', 2000);
    } catch (error) {
        console.error('Failed to start download:', error);
        // Fallback: open in new tab
        window.open(streamUrl, '_blank');
        showToast('Opened in new tab. Right-click to save.', 'info', 3000);
    }
}

// Share stream URL
async function shareStreamUrl(streamUrl, title) {
    if (navigator.share) {
        try {
            await navigator.share({
                title: title,
                text: `Watch: ${title}`,
                url: streamUrl
            });
            showToast('Shared successfully!', 'success', 2000);
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Failed to share:', error);
                fallbackShare(streamUrl, title);
            }
        }
    } else {
        fallbackShare(streamUrl, title);
    }
}

// Fallback share function
function fallbackShare(streamUrl, title) {
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(`${title}\n${streamUrl}`).then(() => {
            showToast('Link copied to clipboard!', 'success', 2000);
        }).catch(() => {
            showToast('Unable to share. Copy the URL manually.', 'info', 3000);
        });
    } else {
        showToast('Copy the URL to share it.', 'info', 2000);
    }
}

// Mobile Navigation Handler
function initializeMobileNavigation() {
    const mobileNavToggle = document.getElementById('mobileNavToggle');
    const mobileNavMenu = document.getElementById('mobileNavMenu');
    const mobileProviderSelect = document.getElementById('mobileProviderSelect');
    const mobileSearchInput = document.getElementById('mobileSearchInput');

    // Toggle mobile menu
    mobileNavToggle?.addEventListener('click', () => {
        mobileNavMenu.classList.toggle('show');
        mobileNavToggle.textContent = mobileNavMenu.classList.contains('show') ? '✕' : '☰';
    });

    // Close mobile menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!mobileNavToggle?.contains(e.target) && !mobileNavMenu?.contains(e.target)) {
            mobileNavMenu?.classList.remove('show');
            if (mobileNavToggle) mobileNavToggle.textContent = '☰';
        }
    });

    // Sync mobile navigation with desktop navigation
    const navButtons = [
        {
            desktop: 'homeBtn', mobile: 'mobileHomeBtn', action: () => {
                loadHomePage();
                updateNavLinks('home');
            }
        },
        {
            desktop: 'bollywoodBtn', mobile: 'mobileBollywoodBtn', action: () => {
                console.log('📱 Mobile Bollywood button clicked');
                if (window.BollywoodModule) {
                    console.log('✅ BollywoodModule found, loading page...');
                    BollywoodModule.loadBollywoodPage();
                } else {
                    console.error('❌ BollywoodModule not found');
                    showToast('Bollywood module not loaded. Please refresh the page.', 'error', 3000);
                }
            }
        },
        {
            desktop: 'tvShowsBtn', mobile: 'mobileTvShowsBtn', action: () => {
                console.log('📱 Mobile TV Shows button clicked');
                try {
                    loadTVShowsPage();
                } catch (error) {
                    console.error('❌ Error loading TV Shows:', error);
                    showToast('Error loading TV Shows. Please try again.', 'error', 3000);
                }
            }
        },
        {
            desktop: 'moviesBtn', mobile: 'mobileMoviesBtn', action: () => {
                loadMoviesPage();
            }
        },
        {
            desktop: 'exploreBtn', mobile: 'mobileExploreBtn', action: () => {
                loadExplorePage();
            }
        },
        {
            desktop: 'liveTVBtn', mobile: 'mobileLiveTVBtn', action: () => {
                loadLiveTVPage();
            }
        },
        {
            desktop: 'newUpdatesBtn', mobile: 'mobileNewUpdatesBtn', action: () => {
                loadNewUpdatesPage();
            }
        },
        {
            desktop: 'historyBtn', mobile: 'mobileHistoryBtn', action: () => {
                console.log('📱 Mobile History button clicked');
                try {
                    if (window.loadHistoryPage) {
                        loadHistoryPage();
                    } else {
                        console.error('❌ loadHistoryPage function not found');
                        showToast('History module not loaded. Please refresh the page.', 'error', 3000);
                    }
                } catch (error) {
                    console.error('❌ Error loading History:', error);
                    showToast('Error loading History. Please try again.', 'error', 3000);
                }
            }
        }
    ];

    navButtons.forEach(({ desktop, mobile, action }) => {
        const desktopBtn = document.getElementById(desktop);
        const mobileBtn = document.getElementById(mobile);

        // Add click handlers
        mobileBtn?.addEventListener('click', () => {
            action();
            // Close mobile menu
            mobileNavMenu?.classList.remove('show');
            if (mobileNavToggle) mobileNavToggle.textContent = '☰';

            // Sync active states
            document.querySelectorAll('.nav-link').forEach(btn => btn.classList.remove('active'));
            desktopBtn?.classList.add('active');
            mobileBtn?.classList.add('active');
        });

        // Sync existing desktop handlers with mobile
        desktopBtn?.addEventListener('click', () => {
            document.querySelectorAll('.nav-link').forEach(btn => btn.classList.remove('active'));
            desktopBtn?.classList.add('active');
            mobileBtn?.classList.add('active');
        });
    });

    // Sync provider selects
    const desktopProviderSelect = document.getElementById('providerSelect');

    if (mobileProviderSelect && desktopProviderSelect) {
        mobileProviderSelect.addEventListener('change', (e) => {
            desktopProviderSelect.value = e.target.value;
            desktopProviderSelect.dispatchEvent(new Event('change'));
        });

        desktopProviderSelect.addEventListener('change', (e) => {
            mobileProviderSelect.value = e.target.value;
        });
    }

    // Sync search inputs
    const desktopSearchInput = document.getElementById('searchInputHeader');

    if (mobileSearchInput && desktopSearchInput) {
        mobileSearchInput.addEventListener('input', (e) => {
            desktopSearchInput.value = e.target.value;
        });

        mobileSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performSearch(e.target.value);
                // Close mobile menu
                mobileNavMenu?.classList.remove('show');
                if (mobileNavToggle) mobileNavToggle.textContent = '☰';
            }
        });

        desktopSearchInput.addEventListener('input', (e) => {
            mobileSearchInput.value = e.target.value;
        });
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
        const resultsContainer = document.getElementById('searchResults');
        const paginationEl = document.getElementById('searchPagination');
        if (resultsContainer) resultsContainer.innerHTML = '';
        if (paginationEl) paginationEl.innerHTML = '';

        document.getElementById('searchTitle').textContent = `Search Results for "${query}"`;
        showView('search');

        state.searchQuery = query;
        state.currentPage = 1;
        state.currentFilter = '';

        if (resultsContainer) {
            resultsContainer.className = 'search-provider-lanes';
            resultsContainer.classList.remove('search-provider-slot-container');
        }

        const providerPromises = allProviders.map(provider => {
            if (!resultsContainer) return Promise.resolve();
            const section = createSearchProviderSection(provider);
            resultsContainer.appendChild(section);

            return searchPosts(provider.value, query, 1)
                .then(result => {
                    const posts = Array.isArray(result)
                        ? result
                        : Array.isArray(result?.posts)
                            ? result.posts
                            : [];
                    updateSearchProviderSection(provider.value, posts, provider.display_name);
                })
                .catch(err => {
                    console.warn(`Search failed for provider ${provider.value}:`, err);
                    showSearchProviderError(provider.value, 'Failed to fetch results.');
                });
        });

        await Promise.allSettled(providerPromises);
        // Hide pagination for search results since we're showing a mixed set
        if (paginationEl) paginationEl.innerHTML = '';
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

async function loadPlayer(provider, link, type, episodeData = null) {
    console.log('🎬 loadPlayer called:', { provider, link, type, episodeData });
    showLoading(true, 'Loading streams...');

    // Store episode data in state for later use
    state.currentEpisodeData = episodeData;

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

        // Get quality preference for this provider
        let preferredStream = streams[0]; // Default to first stream
        if (window.HistoryModule) {
            const recommended = window.HistoryModule.getRecommendedQuality(provider, streams);
            if (recommended) {
                preferredStream = recommended;
                console.log('🎯 Using preferred quality:', recommended.quality);
            }
        }

        console.log('🎨 Rendering stream selector...');
        renderStreamSelector(streams, provider, preferredStream);
        console.log('🖥️ Switching to player view');
        showView('player');

        // Update player header with episode info
        updatePlayerHeader();

        // Auto-play preferred stream
        console.log('▶️ Auto-playing preferred stream:', preferredStream);
        await playStream(preferredStream);
        showToast('Stream loaded successfully!', 'success', 1000);
    } catch (error) {
        console.error('❌ loadPlayer error:', error);
        console.error('Error stack:', error.stack);

        // Retry logic for network errors
        if (state.retryCount < state.maxRetries && error.message.includes('Failed to fetch')) {
            state.retryCount++;
            showToast(`Retrying... (${state.retryCount}/${state.maxRetries})`, 'info', 2000);
            await new Promise(resolve => setTimeout(resolve, 1000));
            return loadPlayer(provider, link, type, episodeData);
        }

        state.retryCount = 0;
        showError('Failed to load streams: ' + error.message + '\n\nTips:\n- Check your internet connection\n- Try refreshing the page\n- Select a different quality or episode');
    } finally {
        showLoading(false);
    }
}

// Update player header with current content info
function updatePlayerHeader() {
    const playerHeader = document.querySelector('.player-header') || createPlayerHeader();

    if (!state.currentMeta || !playerHeader) return;

    const title = state.currentMeta.meta?.title || 'Unknown Title';
    let subtitle = '';

    // Add episode information if available
    if (state.currentEpisodeData) {
        const ep = state.currentEpisodeData;
        subtitle = `S${ep.seasonNumber || 1}E${ep.episodeNumber}`;
        if (ep.episodeTitle) {
            subtitle += `: ${ep.episodeTitle}`;
        }
        if (ep.quality) {
            subtitle += ` • ${ep.quality}`;
        }
        if (ep.hasDolbyAtmos) {
            subtitle += ` • 🔊 Dolby Atmos`;
        }
    }

    playerHeader.innerHTML = `
        <div class="player-title-info">
            <h2 class="player-title">${title}</h2>
            ${subtitle ? `<p class="player-subtitle">${subtitle}</p>` : ''}
        </div>
    `;
}

// Create player header if it doesn't exist
function createPlayerHeader() {
    const playerView = document.getElementById('playerView');
    if (!playerView) return null;

    let header = playerView.querySelector('.player-header');
    if (header) return header;

    header = document.createElement('div');
    header.className = 'player-header';

    // Insert at the beginning of player view
    playerView.insertBefore(header, playerView.firstChild);

    return header;
}

// Initialize App
async function init() {
    console.log('🎬 Vega Providers Web Player Initialized');

    // Initialize mobile navigation
    initializeMobileNavigation();

    // Load providers
    showLoading();
    const providers = await fetchProviders();
    renderProviderSelect(providers);

    // Also populate mobile provider select
    const mobileProviderSelect = document.getElementById('mobileProviderSelect');
    if (mobileProviderSelect) {
        mobileProviderSelect.innerHTML = '<option value="">Select Provider...</option>';
        providers.forEach(provider => {
            const option = document.createElement('option');
            option.value = provider.value;
            option.textContent = `${provider.display_name} (${provider.type})`;
            mobileProviderSelect.appendChild(option);
        });
    }

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

    const liveTVBtn = document.getElementById('liveTVBtn');
    if (liveTVBtn) {
        liveTVBtn.addEventListener('click', () => {
            loadLiveTVPage();
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

    const liveTVBackBtn = document.getElementById('liveTVBackBtn');
    if (liveTVBackBtn) {
        liveTVBackBtn.addEventListener('click', () => {
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
        liveTV: 'liveTVBtn',
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

// Enhanced VLC helper functions for Windows PC

// VLC file association method
async function tryVLCFileAssociation(streamUrl, title) {
    try {
        console.log('🎬 Trying VLC file association method');

        // Create a temporary link that mimics file association
        const link = document.createElement('a');
        link.href = streamUrl;
        link.download = title || 'video.mp4';
        link.type = 'video/mp4';
        link.style.display = 'none';
        document.body.appendChild(link);

        // Try multiple click methods
        link.click();

        // Simulate right-click for "Open with" menu
        setTimeout(() => {
            const event = new MouseEvent('contextmenu', {
                bubbles: true,
                cancelable: true,
                view: window
            });
            link.dispatchEvent(event);
        }, 100);

        document.body.removeChild(link);

        console.log('✅ VLC file association method attempted');
        return true;
    } catch (error) {
        console.warn('❌ VLC file association failed:', error);
        return false;
    }
}

// VLC command line simulation
async function tryVLCCommandLine(streamUrl, title) {
    try {
        console.log('🎬 Trying VLC command line simulation');

        // Try to execute via different methods
        const methods = [
            () => window.open(`vlc://${streamUrl}?args=--intf%20dummy%20--play-and-exit`, '_blank'),
            () => {
                const link = document.createElement('a');
                link.href = `vlc://${streamUrl}`;
                link.setAttribute('data-args', '--intf dummy --play-and-exit');
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            },
            () => {
                // Try with parameters
                window.location.href = `vlc://${streamUrl}#--intf=dummy`;
            }
        ];

        for (const method of methods) {
            try {
                method();
                await new Promise(resolve => setTimeout(resolve, 300));
            } catch (e) {
                console.warn('VLC command method failed:', e);
            }
        }

        console.log('✅ VLC command line simulation attempted');
        return true;
    } catch (error) {
        console.warn('❌ VLC command line simulation failed:', error);
        return false;
    }
}

// VLC registry protocol
async function tryVLCRegistryProtocol(streamUrl, title) {
    try {
        console.log('🎬 Trying VLC registry protocol');

        // Try Windows registry-based protocol handling
        const registryMethods = [
            `vlc://${streamUrl}`,
            `vlc:${streamUrl}`,
            `vlc-protocol://${streamUrl}`,
            `videolan://${streamUrl}`,
            `vlc-media://${streamUrl}`
        ];

        for (const protocol of registryMethods) {
            try {
                // Try multiple ways to trigger the protocol
                window.location.href = protocol;

                // Also try with iframe
                const iframe = document.createElement('iframe');
                iframe.style.display = 'none';
                iframe.src = protocol;
                document.body.appendChild(iframe);

                setTimeout(() => {
                    try {
                        document.body.removeChild(iframe);
                    } catch (e) { }
                }, 1000);

                await new Promise(resolve => setTimeout(resolve, 400));
            } catch (e) {
                console.warn('Registry protocol failed:', e);
            }
        }

        console.log('✅ VLC registry protocol attempted');
        return true;
    } catch (error) {
        console.warn('❌ VLC registry protocol failed:', error);
        return false;
    }
}

// Generic video protocol
async function tryGenericVideoProtocol(streamUrl, playerHint) {
    try {
        console.log('🎬 Trying generic video protocol');

        const videoProtocols = [
            `video://${streamUrl}`,
            `media://${streamUrl}`,
            `stream://${streamUrl}`,
            `player://${streamUrl}`
        ];

        for (const protocol of videoProtocols) {
            try {
                window.location.href = protocol;
                await new Promise(resolve => setTimeout(resolve, 300));
            } catch (e) {
                console.warn('Generic video protocol failed:', e);
            }
        }

        console.log('✅ Generic video protocol attempted');
        return true;
    } catch (error) {
        console.warn('❌ Generic video protocol failed:', error);
        return false;
    }
}

// Windows shell execute simulation
async function tryWindowsShellExecute(streamUrl, executable) {
    try {
        console.log('🎬 Trying Windows shell execute simulation');

        // Simulate Windows shell execute
        const shellMethods = [
            () => window.open(`shell:${executable} "${streamUrl}"`, '_blank'),
            () => window.open(`cmd://start ${executable} "${streamUrl}"`, '_blank'),
            () => window.open(`run:${executable} "${streamUrl}"`, '_blank'),
            () => window.open(`exec:${executable} "${streamUrl}"`, '_blank')
        ];

        for (const method of shellMethods) {
            try {
                method();
                await new Promise(resolve => setTimeout(resolve, 300));
            } catch (e) {
                console.warn('Shell execute method failed:', e);
            }
        }

        console.log('✅ Windows shell execute simulation attempted');
        return true;
    } catch (error) {
        console.warn('❌ Windows shell execute simulation failed:', error);
        return false;
    }
}

// Enhanced Windows Media Player helper functions

// WMP MMS protocol method
async function tryWMPMmsProtocol(streamUrl, title) {
    try {
        console.log('🎬 Trying WMP MMS protocol');

        const cleanUrl = streamUrl.replace(/^https?:\/\//, '');
        const mmsMethods = [
            `mms://${cleanUrl}`,
            `mmsh://${cleanUrl}`,
            `mmst://${cleanUrl}`,
            `ms-wmp://${streamUrl}`
        ];

        for (const protocol of mmsMethods) {
            try {
                window.location.href = protocol;
                await new Promise(resolve => setTimeout(resolve, 400));
            } catch (e) {
                console.warn('MMS protocol failed:', e);
            }
        }

        console.log('✅ WMP MMS protocol attempted');
        return true;
    } catch (error) {
        console.warn('❌ WMP MMS protocol failed:', error);
        return false;
    }
}

// WMP Windows Media format
async function tryWMPWindowsMedia(streamUrl, title) {
    try {
        console.log('🎬 Trying WMP Windows Media format');

        const mediaMethods = [
            `ms-wmp://${streamUrl}`,
            `windowsmedia://${streamUrl}`,
            `wmp://${streamUrl}`,
            `mediaplayer://${streamUrl}`
        ];

        for (const protocol of mediaMethods) {
            try {
                // Try window location
                window.location.href = protocol;

                // Also try with iframe
                const iframe = document.createElement('iframe');
                iframe.style.display = 'none';
                iframe.src = protocol;
                document.body.appendChild(iframe);

                setTimeout(() => {
                    try {
                        document.body.removeChild(iframe);
                    } catch (e) { }
                }, 1000);

                await new Promise(resolve => setTimeout(resolve, 400));
            } catch (e) {
                console.warn('Windows Media format failed:', e);
            }
        }

        console.log('✅ WMP Windows Media format attempted');
        return true;
    } catch (error) {
        console.warn('❌ WMP Windows Media format failed:', error);
        return false;
    }
}

// WMP file association
async function tryWMPFileAssociation(streamUrl, title) {
    try {
        console.log('🎬 Trying WMP file association');

        // Create a link with media file extension
        const link = document.createElement('a');
        link.href = streamUrl;
        link.download = (title || 'video') + '.wmv';
        link.type = 'video/x-ms-wmv';
        link.style.display = 'none';
        document.body.appendChild(link);

        // Try to trigger WMP association
        link.click();

        // Also try with different media types
        const mediaTypes = ['video/x-ms-wmv', 'video/x-ms-asf', 'application/x-mplayer2'];
        for (const type of mediaTypes) {
            const mediaLink = document.createElement('a');
            mediaLink.href = streamUrl;
            mediaLink.type = type;
            mediaLink.style.display = 'none';
            document.body.appendChild(mediaLink);
            mediaLink.click();
            document.body.removeChild(mediaLink);
        }

        document.body.removeChild(link);

        console.log('✅ WMP file association attempted');
        return true;
    } catch (error) {
        console.warn('❌ WMP file association failed:', error);
        return false;
    }
}

// WMP registry protocol
async function tryWMPRegistryProtocol(streamUrl, title) {
    try {
        console.log('🎬 Trying WMP registry protocol');

        const registryMethods = [
            `wmplayer://${streamUrl}`,
            `wmp://${streamUrl}`,
            `ms-wmp://${streamUrl}`,
            `mplayer2://${streamUrl}`
        ];

        for (const protocol of registryMethods) {
            try {
                // Multiple ways to trigger the protocol
                window.open(protocol, '_blank');
                window.location.href = protocol;

                // Try with form submission
                const form = document.createElement('form');
                form.method = 'GET';
                form.action = protocol;
                form.target = '_blank';
                form.style.display = 'none';
                document.body.appendChild(form);
                form.submit();
                document.body.removeChild(form);

                await new Promise(resolve => setTimeout(resolve, 400));
            } catch (e) {
                console.warn('WMP registry protocol failed:', e);
            }
        }

        console.log('✅ WMP registry protocol attempted');
        return true;
    } catch (error) {
        console.warn('❌ WMP registry protocol failed:', error);
        return false;
    }
}

// Generic Windows media
async function tryGenericWindowsMedia(streamUrl, title) {
    try {
        console.log('🎬 Trying generic Windows media');

        const genericMethods = [
            `media://${streamUrl}`,
            `stream://${streamUrl}`,
            `video://${streamUrl}`,
            `audio://${streamUrl}`
        ];

        for (const protocol of genericMethods) {
            try {
                window.location.href = protocol;
                await new Promise(resolve => setTimeout(resolve, 300));
            } catch (e) {
                console.warn('Generic Windows media failed:', e);
            }
        }

        console.log('✅ Generic Windows media attempted');
        return true;
    } catch (error) {
        console.warn('❌ Generic Windows media failed:', error);
        return false;
    }
}

// WMP command line simulation
async function tryWMPCommandLine(streamUrl, title) {
    try {
        console.log('🎬 Trying WMP command line simulation');

        const commandMethods = [
            () => window.open(`wmplayer.exe://${streamUrl}`, '_blank'),
            () => window.open(`cmd://wmplayer.exe "${streamUrl}"`, '_blank'),
            () => window.open(`run:wmplayer.exe "${streamUrl}"`, '_blank')
        ];

        for (const method of commandMethods) {
            try {
                method();
                await new Promise(resolve => setTimeout(resolve, 300));
            } catch (e) {
                console.warn('WMP command method failed:', e);
            }
        }

        console.log('✅ WMP command line simulation attempted');
        return true;
    } catch (error) {
        console.warn('❌ WMP command line simulation failed:', error);
        return false;
    }
}// Enhanced download methods for all streams
async function tryDownloadMethods(downloadUrl, stream, title) {
    console.log('🔽 Trying download methods for:', downloadUrl);

    const fileName = generateFileName(title, stream);
    let success = false;

    const methods = [
        // Method 1: Direct download with proper filename
        () => tryDirectDownloadWithName(downloadUrl, fileName),

        // Method 2: Blob download (for CORS-enabled streams)
        () => tryBlobDownload(downloadUrl, fileName),

        // Method 3: Force download via anchor
        () => tryAnchorDownload(downloadUrl, fileName),

        // Method 4: Open in new tab with download headers
        () => tryNewTabDownload(downloadUrl, fileName),

        // Method 5: Copy URL to clipboard as fallback
        () => tryCopyDownloadUrl(downloadUrl)
    ];

    for (let i = 0; i < methods.length; i++) {
        try {
            console.log(`🔽 Trying download method ${i + 1}`);
            const result = await methods[i]();
            if (result) {
                success = true;
                break;
            }
        } catch (error) {
            console.warn(`Download method ${i + 1} failed:`, error);
        }

        // Small delay between methods
        if (i < methods.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 200));
        }
    }

    return success;
}

// Generate proper filename
function generateFileName(title, stream) {
    let fileName = 'video';

    if (title) {
        fileName = title.replace(/[^a-zA-Z0-9\s\-_]/g, '').trim();
    }

    // Add quality if available
    if (stream.quality) {
        fileName += `_${stream.quality}`;
    }

    // Add appropriate extension based on stream type
    if (stream.type === 'm3u8') {
        fileName += '.m3u8';
    } else if (stream.link.includes('.mkv')) {
        fileName += '.mkv';
    } else if (stream.link.includes('.mp4')) {
        fileName += '.mp4';
    } else if (stream.link.includes('.avi')) {
        fileName += '.avi';
    } else {
        fileName += '.mp4'; // Default extension
    }

    return fileName;
}

// Method 1: Direct download with proper filename
async function tryDirectDownloadWithName(url, fileName) {
    try {
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.style.display = 'none';
        link.target = '_blank';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        console.log('✅ Direct download method attempted');
        return true;
    } catch (error) {
        console.warn('❌ Direct download failed:', error);
        return false;
    }
}

// Method 2: Blob download for CORS-enabled streams
async function tryBlobDownload(url, fileName) {
    try {
        console.log('🔽 Attempting blob download...');

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': '*/*',
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        link.style.display = 'none';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Clean up blob URL after a delay
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);

        console.log('✅ Blob download method successful');
        return true;
    } catch (error) {
        console.warn('❌ Blob download failed:', error);
        return false;
    }
}

// Method 3: Force download via anchor
async function tryAnchorDownload(url, fileName) {
    try {
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.setAttribute('download', fileName);
        link.style.display = 'none';

        // Add additional attributes to force download
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');

        document.body.appendChild(link);

        // Try multiple click methods
        link.click();

        // Simulate user interaction
        const clickEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window
        });
        link.dispatchEvent(clickEvent);

        document.body.removeChild(link);

        console.log('✅ Anchor download method attempted');
        return true;
    } catch (error) {
        console.warn('❌ Anchor download failed:', error);
        return false;
    }
}

// Method 4: Open in new tab with download intent
async function tryNewTabDownload(url, fileName) {
    try {
        // Open in new tab with download parameters
        const downloadUrl = url + (url.includes('?') ? '&' : '?') + 'download=1&filename=' + encodeURIComponent(fileName);

        const newWindow = window.open(downloadUrl, '_blank', 'noopener,noreferrer');

        if (newWindow) {
            console.log('✅ New tab download method attempted');
            return true;
        }

        return false;
    } catch (error) {
        console.warn('❌ New tab download failed:', error);
        return false;
    }
}

// Method 5: Copy URL to clipboard as fallback
async function tryCopyDownloadUrl(url) {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(url);
            showToast('Download URL copied to clipboard! Paste it in your browser or download manager.', 'info', 5000);
            console.log('✅ URL copied to clipboard as fallback');
            return true;
        }
        return false;
    } catch (error) {
        console.warn('❌ Clipboard copy failed:', error);
        return false;
    }
}// Demo function to test download system (can be called from browser console)
window.testDownloadSystem = async function () {
    console.log('🧪 Testing Download System...');

    // Check if DownloadManager is available
    console.log('📊 DownloadManager available:', !!window.DownloadManager);
    console.log('📊 DownloadManager type:', typeof window.DownloadManager);

    if (window.DownloadManager) {
        console.log('📊 DownloadManager methods:', Object.keys(window.DownloadManager));
    }

    // Test with a sample video URL
    const testUrl = 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4';
    const testFilename = 'test_video_sample.mp4';

    try {
        if (window.DownloadManager && typeof window.DownloadManager.startDownload === 'function') {
            const downloadId = await window.DownloadManager.startDownload(testUrl, testFilename, {
                source: 'test_system',
                description: 'Test download to verify system functionality'
            });

            console.log('✅ Test download started successfully:', downloadId);
            showToast('Test download started! Check the download panel.', 'success', 3000);
            return downloadId;
        } else {
            console.log('⚠️ DownloadManager not available, testing fallback...');

            // Test fallback system
            if (window.trySimpleDownloadWithProgress) {
                const success = await trySimpleDownloadWithProgress(testUrl, testFilename);
                if (success) {
                    console.log('✅ Fallback download test successful');
                    showToast('Fallback download test started!', 'success', 3000);
                    return 'fallback_success';
                }
            }

            console.error('❌ No download system available');
            showToast('No download system available', 'error');
            return null;
        }
    } catch (error) {
        console.error('❌ Test download failed:', error);
        showToast(`Test download failed: ${error.message}`, 'error');
        return null;
    }
};

// Demo function to show download statistics
window.showDownloadStats = function () {
    if (window.DownloadManager) {
        const stats = window.DownloadManager.getDownloadStats();
        console.log('📊 Download Statistics:', stats);

        const message = `Downloads: ${stats.total} total, ${stats.downloading} active, ${stats.completed} completed, ${stats.failed} failed`;
        showToast(message, 'info', 4000);

        return stats;
    } else {
        console.error('❌ DownloadManager not available');
        return null;
    }
};

console.log('🎬 PolyMovies Enhanced Download System Loaded');
console.log('💡 Try: testDownloadSystem() or showDownloadStats() in console');
console.log('💡 Or try: testSimpleDownload() to test the enhanced download panel');
console.log('💡 Or try: testDownloadPanel() to test the download panel UI');

// Enhanced Download Manager with Visual Progress
const SimpleDownloadManager = {
    downloads: new Map(),
    downloadCounter: 0,

    // Initialize the download manager
    init() {
        this.createDownloadPanel();
        console.log('📥 Simple Download Manager initialized');
    },

    // Create the download panel UI
    createDownloadPanel() {
        if (document.getElementById('simpleDownloadPanel')) return;

        const panel = document.createElement('div');
        panel.id = 'simpleDownloadPanel';
        panel.className = 'simple-download-panel';
        panel.innerHTML = `
            <div class="download-panel-header">
                <h3>📥 Downloads</h3>
                <div class="download-panel-controls">
                    <button onclick="SimpleDownloadManager.togglePanel()" class="panel-toggle-btn">−</button>
                    <button onclick="SimpleDownloadManager.clearCompleted()" class="panel-clear-btn">Clear</button>
                </div>
            </div>
            <div class="download-panel-content" id="simpleDownloadContent">
                <div class="no-downloads">No active downloads</div>
            </div>
        `;

        document.body.appendChild(panel);
    },

    // Start a new download with progress tracking
    startDownload(url, filename) {
        const downloadId = ++this.downloadCounter;
        const download = {
            id: downloadId,
            url: url,
            filename: filename,
            status: 'starting',
            progress: 0,
            downloadedBytes: 0,
            totalBytes: 0,
            speed: 0,
            startTime: Date.now(),
            lastUpdate: Date.now()
        };

        this.downloads.set(downloadId, download);
        this.updateUI();
        this.showPanel();

        // Start the download process
        this.performDownload(download);

        return downloadId;
    },

    // Perform the actual download with progress simulation
    async performDownload(download) {
        try {
            download.status = 'downloading';
            this.updateUI();

            // Try to get file size first
            try {
                const headResponse = await fetch(download.url, { method: 'HEAD' });
                if (headResponse.ok) {
                    const contentLength = headResponse.headers.get('content-length');
                    if (contentLength) {
                        download.totalBytes = parseInt(contentLength);
                    }
                }
            } catch (e) {
                console.log('Could not get file size, continuing...');
            }

            // Start actual download
            const response = await fetch(download.url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const reader = response.body.getReader();
            const chunks = [];
            let receivedLength = 0;

            // Read the stream with progress updates
            while (true) {
                const { done, value } = await reader.read();

                if (done) break;

                chunks.push(value);
                receivedLength += value.length;

                // Update progress
                download.downloadedBytes = receivedLength;
                if (download.totalBytes > 0) {
                    download.progress = (receivedLength / download.totalBytes) * 100;
                } else {
                    // Simulate progress if we don't know total size
                    download.progress = Math.min(90, (receivedLength / (1024 * 1024)) * 10); // 10% per MB
                }

                // Calculate speed
                const now = Date.now();
                const timeDiff = (now - download.lastUpdate) / 1000;
                if (timeDiff > 0.5) { // Update every 500ms
                    const bytesDiff = receivedLength - (download.lastBytes || 0);
                    download.speed = bytesDiff / timeDiff;
                    download.lastBytes = receivedLength;
                    download.lastUpdate = now;
                    this.updateUI();
                }

                // Small delay to prevent UI blocking
                await new Promise(resolve => setTimeout(resolve, 10));
            }

            // Create blob and download
            const blob = new Blob(chunks);
            const downloadUrl = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = download.filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            URL.revokeObjectURL(downloadUrl);

            // Mark as completed
            download.status = 'completed';
            download.progress = 100;
            this.updateUI();

            // Show success notification
            showToast(`Download completed: ${download.filename}`, 'success', 3000);

        } catch (error) {
            console.error('❌ Download failed:', error);
            download.status = 'failed';
            download.error = error.message;
            this.updateUI();
            showToast(`Download failed: ${download.filename}`, 'error', 3000);
        }
    },

    // Update the UI
    updateUI() {
        const content = document.getElementById('simpleDownloadContent');
        if (!content) return;

        const downloads = Array.from(this.downloads.values());

        if (downloads.length === 0) {
            content.innerHTML = '<div class="no-downloads">No active downloads</div>';
            return;
        }

        content.innerHTML = downloads.map(download => this.createDownloadItem(download)).join('');

        // Show panel if there are active downloads
        const panel = document.getElementById('simpleDownloadPanel');
        if (panel && downloads.some(d => d.status === 'downloading')) {
            panel.classList.add('has-active');
        }
    },

    // Create download item HTML
    createDownloadItem(download) {
        const progressPercent = Math.round(download.progress);
        const downloadedMB = (download.downloadedBytes / (1024 * 1024)).toFixed(1);
        const totalMB = download.totalBytes > 0 ? (download.totalBytes / (1024 * 1024)).toFixed(1) : '?';
        const speedText = this.formatSpeed(download.speed);
        const statusIcon = this.getStatusIcon(download.status);

        return `
            <div class="download-item ${download.status}" data-id="${download.id}">
                <div class="download-header">
                    <span class="status-icon">${statusIcon}</span>
                    <span class="filename" title="${download.filename}">${download.filename}</span>
                    <button onclick="SimpleDownloadManager.removeDownload(${download.id})" class="remove-btn">×</button>
                </div>
                
                <div class="progress-container">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progressPercent}%"></div>
                    </div>
                    <span class="progress-text">${progressPercent}%</span>
                </div>
                
                <div class="download-stats">
                    <span class="size-info">${downloadedMB} MB / ${totalMB} MB</span>
                    ${download.status === 'downloading' ? `<span class="speed-info">${speedText}</span>` : ''}
                    ${download.error ? `<span class="error-info">Error: ${download.error}</span>` : ''}
                </div>
            </div>
        `;
    },

    // Get status icon
    getStatusIcon(status) {
        const icons = {
            starting: '🔄',
            downloading: '📥',
            completed: '✅',
            failed: '❌'
        };
        return icons[status] || '📄';
    },

    // Format download speed
    formatSpeed(bytesPerSecond) {
        if (!bytesPerSecond || bytesPerSecond === 0) return '0 B/s';

        const units = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
        let size = bytesPerSecond;
        let unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }

        return `${size.toFixed(1)} ${units[unitIndex]}`;
    },

    // Toggle panel visibility
    togglePanel() {
        const panel = document.getElementById('simpleDownloadPanel');
        if (panel) {
            panel.classList.toggle('collapsed');
            const toggleBtn = panel.querySelector('.panel-toggle-btn');
            if (toggleBtn) {
                toggleBtn.textContent = panel.classList.contains('collapsed') ? '+' : '−';
            }
        }
    },

    // Show panel
    showPanel() {
        const panel = document.getElementById('simpleDownloadPanel');
        if (panel) {
            panel.classList.remove('collapsed');
            panel.style.display = 'block';
            const toggleBtn = panel.querySelector('.panel-toggle-btn');
            if (toggleBtn) {
                toggleBtn.textContent = '−';
            }
        }
    },

    // Remove a download
    removeDownload(downloadId) {
        this.downloads.delete(downloadId);
        this.updateUI();
    },

    // Clear completed downloads
    clearCompleted() {
        const toRemove = [];
        this.downloads.forEach((download, id) => {
            if (download.status === 'completed' || download.status === 'failed') {
                toRemove.push(id);
            }
        });

        toRemove.forEach(id => this.downloads.delete(id));
        this.updateUI();

        if (toRemove.length > 0) {
            showToast(`Cleared ${toRemove.length} completed downloads`, 'info', 2000);
        }
    }
};

// Initialize the download manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    SimpleDownloadManager.init();
});

// Enhanced download progress function
function showSimpleDownloadProgress(filename) {
    // Use the enhanced download manager instead
    return SimpleDownloadManager.startDownload('', filename);
}

// Update the trySimpleDownload function to show progress
async function trySimpleDownloadWithProgress(url, filename) {
    try {
        // Use the enhanced download manager
        const downloadId = SimpleDownloadManager.startDownload(url, filename);
        console.log('✅ Enhanced download started:', filename, 'ID:', downloadId);
        return true;
    } catch (error) {
        console.error('❌ Enhanced download failed:', error);
        return false;
    }
}

// Add CSS for enhanced download panel
const style = document.createElement('style');
style.textContent = `
    .simple-download-panel {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 400px;
        max-height: 500px;
        background: rgba(0, 0, 0, 0.95);
        border: 2px solid #e50914;
        border-radius: 12px;
        z-index: 10000;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(10px);
        transition: all 0.3s ease;
        display: none;
    }
    
    .simple-download-panel.has-active {
        display: block;
        border-color: #4CAF50;
        box-shadow: 0 8px 32px rgba(76, 175, 80, 0.3);
    }
    
    .simple-download-panel.collapsed {
        transform: translateY(calc(100% - 60px));
    }
    
    .download-panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px 20px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(229, 9, 20, 0.1);
        border-radius: 10px 10px 0 0;
    }
    
    .download-panel-header h3 {
        margin: 0;
        color: #fff;
        font-size: 16px;
        font-weight: 600;
    }
    
    .download-panel-controls {
        display: flex;
        gap: 10px;
    }
    
    .panel-toggle-btn,
    .panel-clear-btn {
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: #fff;
        padding: 6px 12px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 12px;
        transition: all 0.2s ease;
    }
    
    .panel-toggle-btn:hover,
    .panel-clear-btn:hover {
        background: rgba(255, 255, 255, 0.2);
        transform: scale(1.05);
    }
    
    .download-panel-content {
        max-height: 400px;
        overflow-y: auto;
        padding: 10px;
    }
    
    .download-panel-content::-webkit-scrollbar {
        width: 6px;
    }
    
    .download-panel-content::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 3px;
    }
    
    .download-panel-content::-webkit-scrollbar-thumb {
        background: #e50914;
        border-radius: 3px;
    }
    
    .no-downloads {
        text-align: center;
        color: #999;
        padding: 40px 20px;
        font-style: italic;
    }
    
    .download-item {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        padding: 15px;
        margin-bottom: 10px;
        transition: all 0.2s ease;
    }
    
    .download-item:hover {
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(255, 255, 255, 0.2);
    }
    
    .download-item.downloading {
        border-color: #4CAF50;
        box-shadow: 0 0 10px rgba(76, 175, 80, 0.2);
    }
    
    .download-item.completed {
        border-color: #2196F3;
        background: rgba(33, 150, 243, 0.1);
    }
    
    .download-item.failed {
        border-color: #f44336;
        background: rgba(244, 67, 54, 0.1);
    }
    
    .download-header {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 10px;
    }
    
    .status-icon {
        font-size: 16px;
        flex-shrink: 0;
    }
    
    .filename {
        color: #fff;
        font-weight: 500;
        font-size: 14px;
        flex: 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    
    .remove-btn {
        background: rgba(255, 255, 255, 0.1);
        border: none;
        color: #fff;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        transition: all 0.2s ease;
    }
    
    .remove-btn:hover {
        background: rgba(255, 0, 0, 0.3);
        transform: scale(1.1);
    }
    
    .progress-container {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 8px;
    }
    
    .progress-bar {
        flex: 1;
        height: 8px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
        overflow: hidden;
    }
    
    .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #4CAF50, #8BC34A);
        border-radius: 4px;
        transition: width 0.3s ease;
        position: relative;
    }
    
    .progress-fill::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
        animation: shimmer 2s infinite;
    }
    
    @keyframes shimmer {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
    }
    
    .progress-text {
        color: #fff;
        font-size: 12px;
        font-weight: 600;
        min-width: 35px;
        text-align: right;
    }
    
    .download-stats {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 11px;
        color: #ccc;
        flex-wrap: wrap;
        gap: 8px;
    }
    
    .size-info {
        font-weight: 500;
    }
    
    .speed-info {
        color: #4CAF50;
        font-weight: 600;
    }
    
    .error-info {
        color: #f44336;
        font-weight: 500;
        flex: 1 1 100%;
        margin-top: 5px;
    }
    
    /* Mobile responsive */
    @media (max-width: 768px) {
        .simple-download-panel {
            width: calc(100vw - 40px);
            right: 20px;
            left: 20px;
            bottom: 10px;
        }
    }
`;
document.head.appendChild(style);

// Enhanced download function with progress tracking
async function startDownload() {
    const url = document.getElementById('downloadUrl').value;
    if (!url) {
        alert('Please enter a valid URL');
        return;
    }

    // Extract filename from URL or use default
    const filename = extractFilenameFromUrl(url) || 'stream.m3u8';

    try {
        // Start download with progress tracking if available
        if (window.DownloadManager && typeof window.DownloadManager.startDownload === 'function') {
            const downloadId = await DownloadManager.startDownload(url, filename, {
                source: 'manual_download',
                userInitiated: true
            });

            showToast(`Download started: ${filename}`, 'success');
            console.log(`📥 Started download with ID: ${downloadId}`);
        } else {
            // Fallback to simple download with progress indicator
            const success = await trySimpleDownloadWithProgress(url, filename);
            if (success) {
                showToast(`Download started: ${filename}`, 'success');
            } else {
                showToast('Download may have started. Check your downloads folder.', 'info');
            }
        }

        // Close modal
        const modal = document.querySelector('.modal-overlay');
        if (modal) {
            modal.remove();
        }

    } catch (error) {
        console.error('❌ Download failed:', error);
        showToast(`Download failed: ${error.message}`, 'error');
    }
}

// Test function for simple download system
window.testSimpleDownload = function () {
    console.log('🧪 Testing Simple Download System...');

    // Test with a small sample file
    const testUrl = 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4';
    const testFilename = 'test_sample_video.mp4';

    if (window.trySimpleDownloadWithProgress) {
        trySimpleDownloadWithProgress(testUrl, testFilename);
        console.log('✅ Simple download test started');
        showToast('Simple download test started! Check your downloads.', 'success', 3000);
        return true;
    } else {
        console.error('❌ Simple download function not available');
        showToast('Simple download function not loaded', 'error');
        return false;
    }
};

// Test function for download notification
window.testDownloadNotification = function () {
    console.log('🧪 Testing Download Notification...');

    if (window.showSimpleDownloadProgress) {
        showSimpleDownloadProgress('test_notification_file.mp4');
        console.log('✅ Download notification test completed');
        return true;
    } else {
        console.error('❌ Download notification function not available');
        return false;
    }
};

// Test function for enhanced download system
window.testSimpleDownload = function () {
    console.log('🧪 Testing Enhanced Download System...');

    // Test with a small sample file
    const testUrl = 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4';
    const testFilename = 'test_sample_video.mp4';

    if (window.SimpleDownloadManager) {
        const downloadId = SimpleDownloadManager.startDownload(testUrl, testFilename);
        console.log('✅ Enhanced download test started, ID:', downloadId);
        showToast('Enhanced download test started! Check the download panel.', 'success', 3000);
        return downloadId;
    } else {
        console.error('❌ Enhanced download manager not available');
        showToast('Enhanced download manager not loaded', 'error');
        return false;
    }
};

// Test function for download panel
window.testDownloadPanel = function () {
    console.log('🧪 Testing Download Panel...');

    if (window.SimpleDownloadManager) {
        // Show the panel
        SimpleDownloadManager.showPanel();

        // Add a test download
        const downloadId = SimpleDownloadManager.startDownload(
            'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
            'panel_test_video.mp4'
        );

        console.log('✅ Download panel test completed, ID:', downloadId);
        showToast('Download panel opened with test download!', 'success', 3000);
        return downloadId;
    } else {
        console.error('❌ Download panel not available');
        return false;
    }
};

// Make SimpleDownloadManager globally accessible
window.SimpleDownloadManager = SimpleDownloadManager;

// Function to show downloads panel (called from Electron menu or manually)
window.showDownloadsPanel = function () {
    console.log('📥 Showing downloads panel from menu');

    if (window.DownloadManager && typeof window.DownloadManager.showPanel === 'function') {
        window.DownloadManager.showPanel();
        showToast('Downloads panel opened', 'info', 2000);
    } else {
        console.error('❌ DownloadManager not available');
        showToast('Download system not loaded', 'error');
    }
};

// Function to hide downloads panel
window.hideDownloadsPanel = function () {
    console.log('📥 Hiding downloads panel');

    if (window.DownloadManager && typeof window.DownloadManager.hidePanel === 'function') {
        window.DownloadManager.hidePanel();
        showToast('Downloads panel closed', 'info', 1500);
    }
};

// Test function for download panel visibility
window.testDownloadPanel = function () {
    console.log('🧪 Testing Download Panel Show/Hide...');

    // Show panel
    console.log('📥 Showing panel...');
    showDownloadsPanel();

    // Hide panel after 3 seconds
    setTimeout(() => {
        console.log('📥 Hiding panel...');
        hideDownloadsPanel();
    }, 3000);

    // Show panel again after 6 seconds
    setTimeout(() => {
        console.log('📥 Showing panel again...');
        showDownloadsPanel();
    }, 6000);

    console.log('✅ Panel visibility test started - watch for 6 seconds');
};// Test function for the new download button and progress tracking
window.testNewDownloadSystem = function() {
    console.log('🧪 Testing New Download System with Progress...');
    
    // Test the header button
    const downloadBtn = document.getElementById('downloadsBtn');
    console.log('📊 Download button found:', !!downloadBtn);
    
    // Test a download with progress tracking
    if (window.DownloadManager) {
        console.log('📥 Starting test download with progress tracking...');
        
        // Use a larger file to see progress
        const testUrl = 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_5mb.mp4';
        const testFilename = 'progress_test_video.mp4';
        
        DownloadManager.startDownload(testUrl, testFilename, {
            source: 'progress_test',
            description: 'Testing progress tracking'
        }).then(downloadId => {
            console.log('✅ Test download started with ID:', downloadId);
            console.log('📊 Watch the download panel and header button for progress updates');
        }).catch(error => {
            console.error('❌ Test download failed:', error);
        });
    } else {
        console.error('❌ DownloadManager not available');
    }
};