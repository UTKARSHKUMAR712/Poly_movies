// TMDB Content Module - Fetches trending and popular content from TMDB
const TMDBContentModule = {
    API_KEY: 'be880dc5b7df8623008f6cc66c0c7396',
    BASE_URL: 'https://api.themoviedb.org/3',
    IMAGE_BASE: 'https://image.tmdb.org/t/p',

    // Fetch trending movies (day)
    async getTrendingMovies() {
        try {
            const response = await fetch(`${this.BASE_URL}/trending/movie/day?api_key=${this.API_KEY}`);
            const data = await response.json();
            return data.results || [];
        } catch (error) {
            console.error('Failed to fetch trending movies:', error);
            return [];
        }
    },

    // Fetch popular movies in India
    async getPopularMoviesIndia() {
        try {
            const response = await fetch(`${this.BASE_URL}/movie/popular?api_key=${this.API_KEY}&region=IN&page=1`);
            const data = await response.json();
            return data.results || [];
        } catch (error) {
            console.error('Failed to fetch popular movies in India:', error);
            return [];
        }
    },

    // Fetch top rated movies
    async getTopRatedMovies() {
        try {
            const response = await fetch(`${this.BASE_URL}/movie/top_rated?api_key=${this.API_KEY}&region=IN&page=1`);
            const data = await response.json();
            return data.results || [];
        } catch (error) {
            console.error('Failed to fetch top rated movies:', error);
            return [];
        }
    },

    // Fetch now playing in India
    async getNowPlayingIndia() {
        try {
            const response = await fetch(`${this.BASE_URL}/movie/now_playing?api_key=${this.API_KEY}&region=IN&page=1`);
            const data = await response.json();
            return data.results || [];
        } catch (error) {
            console.error('Failed to fetch now playing:', error);
            return [];
        }
    },

    // Fetch upcoming movies in India
    async getUpcomingIndia() {
        try {
            const response = await fetch(`${this.BASE_URL}/movie/upcoming?api_key=${this.API_KEY}&region=IN&page=1`);
            const data = await response.json();
            return data.results || [];
        } catch (error) {
            console.error('Failed to fetch upcoming movies:', error);
            return [];
        }
    },

    // Fetch popular TV shows
    async getPopularTVShows() {
        try {
            const response = await fetch(`${this.BASE_URL}/tv/popular?api_key=${this.API_KEY}&page=1`);
            const data = await response.json();
            return data.results || [];
        } catch (error) {
            console.error('Failed to fetch popular TV shows:', error);
            return [];
        }
    },

    // Fetch top rated TV shows
    async getTopRatedTVShows() {
        try {
            const response = await fetch(`${this.BASE_URL}/tv/top_rated?api_key=${this.API_KEY}&page=1`);
            const data = await response.json();
            return data.results || [];
        } catch (error) {
            console.error('Failed to fetch top rated TV shows:', error);
            return [];
        }
    },

    // Get poster URL
    getPosterUrl(path, size = 'w500') {
        if (!path) return 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22300%22%3E%3Crect width=%22200%22 height=%22300%22 fill=%22%23333%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 fill=%22%23666%22 text-anchor=%22middle%22 dy=%22.3em%22%3ENo Image%3C/text%3E%3C/svg%3E';
        return `${this.IMAGE_BASE}/${size}${path}`;
    },

    // Get backdrop URL
    getBackdropUrl(path, size = 'original') {
        if (!path) return null;
        return `${this.IMAGE_BASE}/${size}${path}`;
    },

    // Render a TMDB section
    renderTMDBSection(title, items, type = 'movie', endpoint = '', region = '') {
        if (!items || items.length === 0) return null;

        const section = document.createElement('div');
        section.className = 'netflix-section';

        const header = document.createElement('div');
        header.className = 'netflix-section-header';
        header.innerHTML = `
            <h3 class="netflix-section-title">${title}</h3>
            <button class="netflix-view-all" onclick="TMDBContentModule.showFullTMDBSection('${title}', '${type}', '${endpoint}', '${region}')">View All ›</button>
        `;
        section.appendChild(header);

        const scrollContainer = document.createElement('div');
        scrollContainer.className = 'netflix-scroll-container';

        const row = document.createElement('div');
        row.className = 'netflix-row';

        items.slice(0, 20).forEach(item => {
            const card = document.createElement('div');
            card.className = 'netflix-card tmdb-card';
            
            const itemTitle = item.title || item.name;
            const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';
            const year = item.release_date || item.first_air_date;
            const yearText = year ? new Date(year).getFullYear() : '';

            card.innerHTML = `
                <img src="${this.getPosterUrl(item.poster_path)}" alt="${itemTitle}" />
                <div class="netflix-card-overlay">
                    <h4>${itemTitle}</h4>
                    <div class="tmdb-card-info">
                        <span class="tmdb-rating">⭐ ${rating}</span>
                        ${yearText ? `<span class="tmdb-year">${yearText}</span>` : ''}
                    </div>
                </div>
            `;
            
            card.addEventListener('click', () => {
                this.showTMDBDetails(item, type);
            });
            
            row.appendChild(card);
        });

        scrollContainer.appendChild(row);
        section.appendChild(scrollContainer);

        return section;
    },

    // Show TMDB item details and search in all providers
    async showTMDBDetails(item, type, skipSearch = false) {
        const title = item.title || item.name;
        const tmdbId = item.id;
        
        // If skipSearch, just open TMDB page
        if (skipSearch) {
            const tmdbUrl = type === 'movie' 
                ? `https://www.themoviedb.org/movie/${tmdbId}`
                : `https://www.themoviedb.org/tv/${tmdbId}`;
            window.open(tmdbUrl, '_blank');
            return;
        }
        
        try {
            if (typeof window.performSearch !== 'function') {
                throw new Error('Search function unavailable');
            }

            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.value = title;
            }

            const originalShowLoading = window.showLoading;
            try {
                if (typeof originalShowLoading === 'function') {
                    window.showLoading = () => {};
                }
                await window.performSearch();
            } finally {
                if (typeof originalShowLoading === 'function') {
                    window.showLoading = originalShowLoading;
                }
            }
        } catch (error) {
            console.error('Search error:', error);
            alert(`Failed to search for "${title}"`);
        }
    },
    
    // Show search results modal with Similar and Recommended sections
    async showSearchResultsModal(title, results, tmdbItem) {
        const modal = document.createElement('div');
        modal.className = 'history-modal tmdb-search-modal';
        
        const type = tmdbItem.title ? 'movie' : 'tv';
        const tmdbId = tmdbItem.id;
        
        // Fetch similar and recommended content
        let similarContent = [];
        let recommendedContent = [];
        
        try {
            const TMDB_API_KEY = 'be880dc5b7df8623008f6cc66c0c7396';
            const [similarRes, recommendedRes] = await Promise.all([
                fetch(`https://api.themoviedb.org/3/${type}/${tmdbId}/similar?api_key=${TMDB_API_KEY}&page=1`),
                fetch(`https://api.themoviedb.org/3/${type}/${tmdbId}/recommendations?api_key=${TMDB_API_KEY}&page=1`)
            ]);
            
            if (similarRes.ok) {
                const data = await similarRes.json();
                similarContent = data.results || [];
            }
            
            if (recommendedRes.ok) {
                const data = await recommendedRes.json();
                recommendedContent = data.results || [];
            }
        } catch (error) {
            console.error('Failed to fetch similar/recommended:', error);
        }
        
        if (results.length === 0) {
            modal.innerHTML = `
                <div class="history-modal-content" style="max-width: 1400px;">
                    <div class="history-modal-header">
                        <h2>"${title}" - Not Found</h2>
                        <button onclick="TMDBContentModule.closeSearchModal()" class="history-close-btn">✕</button>
                    </div>
                    <div class="history-modal-body">
                        <p style="color: var(--text-muted); text-align: center; padding: 40px;">
                            This content is not available in any provider yet.<br>
                            Try searching manually or check back later.
                        </p>
                        ${this.renderSimilarAndRecommended(similarContent, recommendedContent, type)}
                    </div>
                </div>
            `;
        } else {
            modal.innerHTML = `
                <div class="history-modal-content" style="max-width: 1400px;">
                    <div class="history-modal-header">
                        <h2>"${title}" - Found in ${results.length} Provider(s)</h2>
                        <button onclick="TMDBContentModule.closeSearchModal()" class="history-close-btn">✕</button>
                    </div>
                    <div class="history-modal-body">
                        ${results.map(result => `
                            <div class="tmdb-provider-section">
                                <h3 class="tmdb-provider-name">📦 ${result.displayName}</h3>
                                <div class="tmdb-results-grid">
                                    ${result.posts.map(post => `
                                        <div class="tmdb-result-card" onclick="TMDBContentModule.closeSearchModal(); loadDetails('${result.provider}', '${post.link}')">
                                            <img src="${post.image}" alt="${post.title}" />
                                            <div class="tmdb-result-info">
                                                <h4>${post.title}</h4>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        `).join('')}
                        ${this.renderSimilarAndRecommended(similarContent, recommendedContent, type)}
                    </div>
                </div>
            `;
        }
        
        document.body.appendChild(modal);
    },
    
    closeSearchModal() {
        const modal = document.querySelector('.tmdb-search-modal');
        if (modal) modal.remove();
    },
    
    // Render Similar and Recommended sections
    renderSimilarAndRecommended(similarContent, recommendedContent, type) {
        let html = '';
        
        // Recommended section
        if (recommendedContent.length > 0) {
            html += `
                <div class="tmdb-similar-section">
                    <h3 class="tmdb-section-title">⭐ Recommended for You</h3>
                    <div class="tmdb-similar-grid">
                        ${recommendedContent.slice(0, 12).map(item => {
                            const itemTitle = item.title || item.name;
                            const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';
                            const posterUrl = item.poster_path 
                                ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
                                : 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22300%22%3E%3Crect width=%22200%22 height=%22300%22 fill=%22%23333%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 fill=%22%23666%22 text-anchor=%22middle%22 dy=%22.3em%22%3ENo Image%3C/text%3E%3C/svg%3E';
                            
                            return `
                                <div class="tmdb-similar-card" onclick='TMDBContentModule.showTMDBDetails(${JSON.stringify(item).replace(/'/g, "&apos;")}, "${type}", false)'>
                                    <img src="${posterUrl}" alt="${itemTitle}" />
                                    <div class="tmdb-similar-info">
                                        <h4>${itemTitle}</h4>
                                        <span class="tmdb-rating">⭐ ${rating}</span>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }
        
        // Similar section
        if (similarContent.length > 0) {
            html += `
                <div class="tmdb-similar-section">
                    <h3 class="tmdb-section-title">🎬 Similar ${type === 'movie' ? 'Movies' : 'TV Shows'}</h3>
                    <div class="tmdb-similar-grid">
                        ${similarContent.slice(0, 12).map(item => {
                            const itemTitle = item.title || item.name;
                            const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';
                            const posterUrl = item.poster_path 
                                ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
                                : 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22300%22%3E%3Crect width=%22200%22 height=%22300%22 fill=%22%23333%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 fill=%22%23666%22 text-anchor=%22middle%22 dy=%22.3em%22%3ENo Image%3C/text%3E%3C/svg%3E';
                            
                            return `
                                <div class="tmdb-similar-card" onclick='TMDBContentModule.showTMDBDetails(${JSON.stringify(item).replace(/'/g, "&apos;")}, "${type}", false)'>
                                    <img src="${posterUrl}" alt="${itemTitle}" />
                                    <div class="tmdb-similar-info">
                                        <h4>${itemTitle}</h4>
                                        <span class="tmdb-rating">⭐ ${rating}</span>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }
        
        return html;
    },
    
    // Show loading overlay during provider search (disabled)
    showSearchLoadingOverlay(title) {
        this.closeSearchLoadingOverlay();
    },
    
    closeSearchLoadingOverlay() {
        const overlay = document.querySelector('.tmdb-search-loading-overlay');
        if (overlay) overlay.remove();
    },
    
    // Show full TMDB section with pagination
    async showFullTMDBSection(title, type, endpoint, region) {
        const modal = document.createElement('div');
        modal.className = 'history-modal tmdb-full-modal';
        modal.innerHTML = `
            <div class="history-modal-content" style="max-width: 1200px;">
                <div class="history-modal-header">
                    <h2>${title}</h2>
                    <button onclick="TMDBContentModule.closeTMDBModal()" class="history-close-btn">✕</button>
                </div>
                <div class="history-modal-body">
                    <div id="tmdbFullGrid" class="posts-grid"></div>
                    <div id="tmdbPagination" class="pagination"></div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Store current section info
        this.currentSection = { title, type, endpoint, region, page: 1 };
        
        // Load first page
        await this.loadTMDBPage(1);
    },
    
    // Load TMDB page
    async loadTMDBPage(page) {
        const grid = document.getElementById('tmdbFullGrid');
        const pagination = document.getElementById('tmdbPagination');
        if (!grid || !this.currentSection) return;
        
        grid.innerHTML = '<p style="text-align: center; color: var(--text-muted);">Loading...</p>';
        
        try {
            let url = '';
            const { type, endpoint, region } = this.currentSection;
            
            // Build URL based on endpoint
            if (endpoint === 'trending') {
                url = `${this.BASE_URL}/trending/${type}/day?api_key=${this.API_KEY}&page=${page}`;
            } else if (endpoint === 'popular') {
                url = `${this.BASE_URL}/${type}/popular?api_key=${this.API_KEY}${region ? `&region=${region}` : ''}&page=${page}`;
            } else if (endpoint === 'top_rated') {
                url = `${this.BASE_URL}/${type}/top_rated?api_key=${this.API_KEY}${region ? `&region=${region}` : ''}&page=${page}`;
            } else if (endpoint === 'now_playing') {
                url = `${this.BASE_URL}/movie/now_playing?api_key=${this.API_KEY}&region=${region}&page=${page}`;
            } else if (endpoint === 'upcoming') {
                url = `${this.BASE_URL}/movie/upcoming?api_key=${this.API_KEY}&region=${region}&page=${page}`;
            }
            
            const response = await fetch(url);
            const data = await response.json();
            const items = data.results || [];
            
            // Render items
            grid.innerHTML = '';
            items.forEach(item => {
                const card = window.renderPostCard({
                    title: item.title || item.name,
                    image: this.getPosterUrl(item.poster_path),
                    link: item.id.toString()
                }, 'tmdb');
                
                // Override click handler to search providers
                card.onclick = () => this.showTMDBDetails(item, type);
                grid.appendChild(card);
            });
            
            // Render pagination
            const totalPages = Math.min(data.total_pages || 1, 500); // TMDB limit
            this.renderTMDBPagination(pagination, page, totalPages);
            
            this.currentSection.page = page;
            
        } catch (error) {
            console.error('Failed to load TMDB page:', error);
            grid.innerHTML = '<p style="color: var(--primary-color); text-align: center;">Failed to load content</p>';
        }
    },
    
    // Render TMDB pagination
    renderTMDBPagination(container, currentPage, totalPages) {
        if (!container) return;
        
        const maxButtons = 7;
        let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
        let endPage = Math.min(totalPages, startPage + maxButtons - 1);
        
        if (endPage - startPage < maxButtons - 1) {
            startPage = Math.max(1, endPage - maxButtons + 1);
        }
        
        let html = '<div class="pagination-buttons">';
        
        // Previous button
        if (currentPage > 1) {
            html += `<button onclick="TMDBContentModule.loadTMDBPage(${currentPage - 1})">‹ Prev</button>`;
        }
        
        // First page
        if (startPage > 1) {
            html += `<button onclick="TMDBContentModule.loadTMDBPage(1)">1</button>`;
            if (startPage > 2) html += '<span>...</span>';
        }
        
        // Page numbers
        for (let i = startPage; i <= endPage; i++) {
            if (i === currentPage) {
                html += `<button class="active">${i}</button>`;
            } else {
                html += `<button onclick="TMDBContentModule.loadTMDBPage(${i})">${i}</button>`;
            }
        }
        
        // Last page
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) html += '<span>...</span>';
            html += `<button onclick="TMDBContentModule.loadTMDBPage(${totalPages})">${totalPages}</button>`;
        }
        
        // Next button
        if (currentPage < totalPages) {
            html += `<button onclick="TMDBContentModule.loadTMDBPage(${currentPage + 1})">Next ›</button>`;
        }
        
        html += '</div>';
        container.innerHTML = html;
    },
    
    closeTMDBModal() {
        const modal = document.querySelector('.tmdb-full-modal');
        if (modal) modal.remove();
        this.currentSection = null;
    },

    // Render all TMDB sections for home page
    async renderAllSections(container) {
        console.log('📺 Loading TMDB content sections...');

        try {
            // Fetch all data in parallel
            const [
                trendingMovies,
                popularIndia,
                topRated,
                nowPlaying,
                upcoming,
                popularTV,
                topRatedTV
            ] = await Promise.all([
                this.getTrendingMovies(),
                this.getPopularMoviesIndia(),
                this.getTopRatedMovies(),
                this.getNowPlayingIndia(),
                this.getUpcomingIndia(),
                this.getPopularTVShows(),
                this.getTopRatedTVShows()
            ]);

            // Render sections with endpoint info for pagination (removed Coming Soon)
            const sections = [
                { title: '🔥 Trending Today', items: trendingMovies, type: 'movie', endpoint: 'trending', region: '' },
                { title: '🇮🇳 Popular in India', items: popularIndia, type: 'movie', endpoint: 'popular', region: 'IN' },
                { title: '⭐ Top Rated Movies', items: topRated, type: 'movie', endpoint: 'top_rated', region: 'IN' },
                { title: '🎬 Now Playing in Theatres', items: nowPlaying, type: 'movie', endpoint: 'now_playing', region: 'IN' },
                { title: '📺 Popular TV Shows', items: popularTV, type: 'tv', endpoint: 'popular', region: '' },
                { title: '🏆 Top Rated TV Shows', items: topRatedTV, type: 'tv', endpoint: 'top_rated', region: '' }
            ];

            sections.forEach(({ title, items, type, endpoint, region }) => {
                const section = this.renderTMDBSection(title, items, type, endpoint, region);
                if (section) {
                    container.appendChild(section);
                }
            });

            console.log('✅ TMDB content sections loaded');
        } catch (error) {
            console.error('Failed to render TMDB sections:', error);
        }
    }
};

// Make TMDBContentModule globally accessible
window.TMDBContentModule = TMDBContentModule;
