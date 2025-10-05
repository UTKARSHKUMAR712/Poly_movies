// Bollywood & Indian Cinema Page
const BollywoodModule = {
    currentPage: 1,
    totalPages: 1,
    currentYear: 'all',
    currentSort: 'popularity.desc',
    currentTab: 'movies', // 'movies' or 'tv'
    isLoading: false,
    
    // TV Shows state
    tvCurrentPage: 1,
    tvTotalPages: 1,
    tvCurrentSort: 'popularity.desc',

    async loadBollywoodPage() {
        console.log('🎬 Loading Bollywood page...');
        
        if (window.showView) {
            showView('bollywood');
        }
        
        if (window.updateNavLinks) {
            updateNavLinks('bollywood');
        }
        
        const container = document.getElementById('bollywoodContent');
        if (!container) return;
        
        // Reset state
        this.currentPage = 1;
        this.currentYear = 'all';
        this.currentSort = 'popularity.desc';
        this.currentTab = 'movies';
        this.tvCurrentPage = 1;
        this.tvCurrentSort = 'popularity.desc';
        
        container.innerHTML = `
            <div class="content-header">
                <h1>🇮🇳 Bollywood & Indian Cinema</h1>
                <p class="content-subtitle">Discover the best of Hindi cinema</p>
            </div>
            
            <div class="bollywood-tabs">
                <button class="bollywood-tab active" onclick="BollywoodModule.switchTab('movies')">
                    🎬 Movies
                </button>
                <button class="bollywood-tab" onclick="BollywoodModule.switchTab('tv')">
                    📺 TV Shows
                </button>
            </div>
            
            <div id="bollywoodFilters" class="bollywood-filters"></div>
            <div id="bollywoodGrid" class="bollywood-grid"></div>
            <div id="bollywoodLoadMore" class="load-more-container" style="display: none;"></div>
        `;
        
        // Load initial content
        this.renderFilters();
        await this.loadMovies();
    },
    
    switchTab(tab) {
        this.currentTab = tab;
        
        // Update tab buttons
        document.querySelectorAll('.bollywood-tab').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');
        
        // Render appropriate filters and content
        this.renderFilters();
        
        if (tab === 'movies') {
            this.loadMovies(false);
        } else {
            this.loadTVShows(false);
        }
    },
    
    renderFilters() {
        const filtersContainer = document.getElementById('bollywoodFilters');
        if (!filtersContainer) return;
        
        if (this.currentTab === 'movies') {
            filtersContainer.innerHTML = `
                <div class="filter-group">
                    <label>Year:</label>
                    <select id="yearFilter" onchange="BollywoodModule.onFilterChange()">
                        <option value="all">All Years</option>
                        <option value="2025">2025</option>
                        <option value="2024">2024</option>
                        <option value="2023">2023</option>
                        <option value="2022">2022</option>
                        <option value="2021">2021</option>
                        <option value="2020">2020</option>
                        <option value="2019">2019</option>
                        <option value="2018">2018</option>
                        <option value="2017">2017</option>
                        <option value="2016">2016</option>
                        <option value="2015">2015</option>
                        <option value="2010">2010s</option>
                        <option value="2000">2000s</option>
                        <option value="1990">1990s</option>
                        <option value="1980">1980s</option>
                        <option value="1970">1970s</option>
                    </select>
                </div>
                
                <div class="filter-group">
                    <label>Sort By:</label>
                    <select id="sortFilter" onchange="BollywoodModule.onFilterChange()">
                        <optgroup label="Popularity">
                            <option value="popularity.desc">Most Popular</option>
                            <option value="popularity.asc">Least Popular</option>
                        </optgroup>
                        <optgroup label="Release Date">
                            <option value="release_date.desc">Latest Release</option>
                            <option value="release_date.asc">Oldest Release</option>
                            <option value="primary_release_date.desc">Latest Primary Release</option>
                            <option value="primary_release_date.asc">Oldest Primary Release</option>
                        </optgroup>
                        <optgroup label="Rating">
                            <option value="vote_average.desc">Highest Rated</option>
                            <option value="vote_average.asc">Lowest Rated</option>
                        </optgroup>
                        <optgroup label="Vote Count">
                            <option value="vote_count.desc">Most Voted</option>
                            <option value="vote_count.asc">Least Voted</option>
                        </optgroup>
                        <optgroup label="Revenue">
                            <option value="revenue.desc">Highest Revenue</option>
                            <option value="revenue.asc">Lowest Revenue</option>
                        </optgroup>
                        <optgroup label="Title">
                            <option value="original_title.asc">Title (A-Z)</option>
                            <option value="original_title.desc">Title (Z-A)</option>
                        </optgroup>
                    </select>
                </div>
            `;
            
            // Set current values
            document.getElementById('yearFilter').value = this.currentYear;
            document.getElementById('sortFilter').value = this.currentSort;
        } else {
            filtersContainer.innerHTML = `
                <div class="filter-group">
                    <label>Sort By:</label>
                    <select id="tvSortFilter" onchange="BollywoodModule.onTVFilterChange()">
                        <optgroup label="Popularity">
                            <option value="popularity.desc">Most Popular</option>
                            <option value="popularity.asc">Least Popular</option>
                        </optgroup>
                        <optgroup label="First Air Date">
                            <option value="first_air_date.desc">Latest Release</option>
                            <option value="first_air_date.asc">Oldest Release</option>
                        </optgroup>
                        <optgroup label="Rating">
                            <option value="vote_average.desc">Highest Rated</option>
                            <option value="vote_average.asc">Lowest Rated</option>
                        </optgroup>
                        <optgroup label="Vote Count">
                            <option value="vote_count.desc">Most Voted</option>
                            <option value="vote_count.asc">Least Voted</option>
                        </optgroup>
                        <optgroup label="Name">
                            <option value="name.asc">Name (A-Z)</option>
                            <option value="name.desc">Name (Z-A)</option>
                            <option value="original_name.asc">Original Name (A-Z)</option>
                            <option value="original_name.desc">Original Name (Z-A)</option>
                        </optgroup>
                    </select>
                </div>
            `;
            
            // Set current value
            document.getElementById('tvSortFilter').value = this.tvCurrentSort;
        }
    },
    
    async loadMovies(append = false) {
        if (this.isLoading) return;
        
        const grid = document.getElementById('bollywoodGrid');
        const loadMoreContainer = document.getElementById('bollywoodLoadMore');
        
        if (!grid) return;
        
        this.isLoading = true;
        
        if (!append) {
            grid.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 40px;">Loading Bollywood movies...</p>';
        }
        
        try {
            const TMDB_API_KEY = 'be880dc5b7df8623008f6cc66c0c7396';
            const BASE_URL = 'https://api.themoviedb.org/3';
            
            // Build URL with filters
            let url = `${BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_original_language=hi&region=IN&sort_by=${this.currentSort}&page=${this.currentPage}`;
            
            // Add year filter if not "all"
            if (this.currentYear !== 'all') {
                const year = parseInt(this.currentYear);
                if (year >= 2015) {
                    // Specific year
                    url += `&primary_release_year=${year}`;
                } else {
                    // Decade range
                    url += `&primary_release_date.gte=${year}-01-01&primary_release_date.lte=${year + 9}-12-31`;
                }
            }
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error('Failed to fetch Bollywood movies');
            }
            
            const data = await response.json();
            this.totalPages = data.total_pages || 1;
            
            if (!append) {
                grid.innerHTML = '';
            }
            
            if (data.results && data.results.length > 0) {
                data.results.forEach(movie => {
                    const card = this.createMovieCard(movie);
                    grid.appendChild(card);
                });
                
                // Show/update load more button
                if (this.currentPage < this.totalPages) {
                    loadMoreContainer.style.display = 'block';
                    loadMoreContainer.innerHTML = `
                        <button class="load-more-btn" onclick="BollywoodModule.loadMore()">
                            Load More (Page ${this.currentPage + 1} of ${this.totalPages})
                        </button>
                    `;
                } else {
                    loadMoreContainer.style.display = 'none';
                }
            } else {
                if (!append) {
                    grid.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 40px;">No movies found for selected filters.</p>';
                }
                loadMoreContainer.style.display = 'none';
            }
            
        } catch (error) {
            console.error('Failed to load Bollywood movies:', error);
            if (!append) {
                grid.innerHTML = '<p style="color: var(--primary-color); text-align: center; padding: 40px;">Failed to load movies. Please try again.</p>';
            }
        } finally {
            this.isLoading = false;
        }
    },
    
    createMovieCard(movie) {
        const card = document.createElement('div');
        card.className = 'bollywood-card';
        
        const title = movie.title || movie.original_title;
        const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
        const year = movie.release_date ? new Date(movie.release_date).getFullYear() : '';
        const posterUrl = movie.poster_path 
            ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
            : 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22300%22%3E%3Crect width=%22200%22 height=%22300%22 fill=%22%23333%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 fill=%22%23666%22 text-anchor=%22middle%22 dy=%22.3em%22%3ENo Image%3C/text%3E%3C/svg%3E';
        
        card.innerHTML = `
            <img src="${posterUrl}" alt="${title}" />
            <div class="bollywood-card-overlay">
                <h4>${title}</h4>
                <div class="bollywood-card-info">
                    <span class="bollywood-rating">⭐ ${rating}</span>
                    ${year ? `<span class="bollywood-year">${year}</span>` : ''}
                </div>
                ${movie.overview ? `<p class="bollywood-overview">${movie.overview.substring(0, 100)}...</p>` : ''}
            </div>
        `;
        
        card.addEventListener('click', () => {
            if (window.TMDBContentModule) {
                window.TMDBContentModule.showTMDBDetails(movie, 'movie', false);
            }
        });
        
        return card;
    },
    
    onFilterChange() {
        const yearFilter = document.getElementById('yearFilter');
        const sortFilter = document.getElementById('sortFilter');
        
        this.currentYear = yearFilter.value;
        this.currentSort = sortFilter.value;
        this.currentPage = 1;
        
        this.loadMovies(false);
    },
    
    onTVFilterChange() {
        const tvSortFilter = document.getElementById('tvSortFilter');
        
        this.tvCurrentSort = tvSortFilter.value;
        this.tvCurrentPage = 1;
        
        this.loadTVShows(false);
    },
    
    async loadMore() {
        if (this.currentTab === 'movies') {
            this.currentPage++;
            await this.loadMovies(true);
        } else {
            this.tvCurrentPage++;
            await this.loadTVShows(true);
        }
    },
    
    async loadTVShows(append = false) {
        if (this.isLoading) return;
        
        const grid = document.getElementById('bollywoodGrid');
        const loadMoreContainer = document.getElementById('bollywoodLoadMore');
        
        if (!grid) return;
        
        this.isLoading = true;
        
        if (!append) {
            grid.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 40px;">Loading Hindi TV shows...</p>';
        }
        
        try {
            const TMDB_API_KEY = 'be880dc5b7df8623008f6cc66c0c7396';
            const BASE_URL = 'https://api.themoviedb.org/3';
            
            // Build URL for TV shows
            let url = `${BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&with_original_language=hi&watch_region=IN&sort_by=${this.tvCurrentSort}&page=${this.tvCurrentPage}`;
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error('Failed to fetch Hindi TV shows');
            }
            
            const data = await response.json();
            this.tvTotalPages = data.total_pages || 1;
            
            if (!append) {
                grid.innerHTML = '';
            }
            
            if (data.results && data.results.length > 0) {
                // Filter out adult/erotic content
                const filteredResults = data.results.filter(show => {
                    if (show.adult) return false;
                    
                    const overview = (show.overview || '').toLowerCase();
                    const name = (show.name || '').toLowerCase();
                    const originalName = (show.original_name || '').toLowerCase();
                    
                    // List of adult/erotic keywords to filter
                    const adultKeywords = [
                        'erotic', 'erotica', 'adult', 'explicit', 'sexual', 
                        'xxx', 'porn', 'nude', 'sensual', 'seductive',
                        'ullu', 'charmsukh', 'palang tod', 'riti riwaj'
                    ];
                    
                    // Check if any keyword exists in overview or name
                    return !adultKeywords.some(keyword => 
                        overview.includes(keyword) || 
                        name.includes(keyword) || 
                        originalName.includes(keyword)
                    );
                });
                
                filteredResults.forEach(show => {
                    const card = this.createTVCard(show);
                    grid.appendChild(card);
                });
                
                // Show/update load more button
                if (this.tvCurrentPage < this.tvTotalPages) {
                    loadMoreContainer.style.display = 'block';
                    loadMoreContainer.innerHTML = `
                        <button class="load-more-btn" onclick="BollywoodModule.loadMore()">
                            Load More (Page ${this.tvCurrentPage + 1} of ${this.tvTotalPages})
                        </button>
                    `;
                } else {
                    loadMoreContainer.style.display = 'none';
                }
            } else {
                if (!append) {
                    grid.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 40px;">No TV shows found.</p>';
                }
                loadMoreContainer.style.display = 'none';
            }
            
        } catch (error) {
            console.error('Failed to load Hindi TV shows:', error);
            if (!append) {
                grid.innerHTML = '<p style="color: var(--primary-color); text-align: center; padding: 40px;">Failed to load TV shows. Please try again.</p>';
            }
        } finally {
            this.isLoading = false;
        }
    },
    
    createTVCard(show) {
        const card = document.createElement('div');
        card.className = 'bollywood-card';
        
        const title = show.name || show.original_name;
        const rating = show.vote_average ? show.vote_average.toFixed(1) : 'N/A';
        const year = show.first_air_date ? new Date(show.first_air_date).getFullYear() : '';
        const posterUrl = show.poster_path 
            ? `https://image.tmdb.org/t/p/w500${show.poster_path}`
            : 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22300%22%3E%3Crect width=%22200%22 height=%22300%22 fill=%22%23333%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 fill=%22%23666%22 text-anchor=%22middle%22 dy=%22.3em%22%3ENo Image%3C/text%3E%3C/svg%3E';
        
        card.innerHTML = `
            <img src="${posterUrl}" alt="${title}" />
            <div class="bollywood-card-overlay">
                <h4>${title}</h4>
                <div class="bollywood-card-info">
                    <span class="bollywood-rating">⭐ ${rating}</span>
                    ${year ? `<span class="bollywood-year">${year}</span>` : ''}
                </div>
                ${show.overview ? `<p class="bollywood-overview">${show.overview.substring(0, 100)}...</p>` : ''}
            </div>
        `;
        
        card.addEventListener('click', () => {
            if (window.TMDBContentModule) {
                window.TMDBContentModule.showTMDBDetails(show, 'tv', false);
            }
        });
        
        return card;
    }
};

// Make globally accessible
window.BollywoodModule = BollywoodModule;
