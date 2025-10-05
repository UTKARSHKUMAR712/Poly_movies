// Genre Browser Module
const GenreBrowserModule = {
    genres: [],
    currentGenre: null,
    currentPage: 1,
    totalPages: 1,
    currentSort: 'popularity.desc',
    isLoading: false,

    async init() {
        await this.loadGenres();
        this.renderGenreSection();
    },

    async loadGenres() {
        try {
            const TMDB_API_KEY = 'be880dc5b7df8623008f6cc66c0c7396';
            const response = await fetch(`https://api.themoviedb.org/3/genre/movie/list?api_key=${TMDB_API_KEY}&language=en`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch genres');
            }
            
            const data = await response.json();
            this.genres = data.genres || [];
            
            console.log('✅ Loaded', this.genres.length, 'genres');
        } catch (error) {
            console.error('Failed to load genres:', error);
            this.genres = [];
        }
    },

    renderGenreSection() {
        const catalogSections = document.getElementById('catalogSections');
        if (!catalogSections) return;

        // Check if genre section already exists
        let genreSection = document.getElementById('genreBrowserSection');
        
        if (!genreSection) {
            genreSection = document.createElement('div');
            genreSection.id = 'genreBrowserSection';
            genreSection.className = 'genre-browser-section';
            
            // Find hero banner and insert after it
            const heroBanner = catalogSections.querySelector('.hero-banner');
            if (heroBanner && heroBanner.nextSibling) {
                catalogSections.insertBefore(genreSection, heroBanner.nextSibling);
            } else if (heroBanner) {
                catalogSections.appendChild(genreSection);
            } else {
                // If no hero banner, append at the end
                catalogSections.appendChild(genreSection);
            }
        }

        // Filter out Western genre
        const filteredGenres = this.genres.filter(genre => genre.name !== 'Western');
        
        genreSection.innerHTML = `
            <div class="genre-browser-header">
                <h2 class="genre-browser-title">Popular Genres</h2>
            </div>
            <div class="genre-cards-scroll-container">
                <div class="genre-cards-wrapper">
                    ${filteredGenres.map(genre => `
                        <div class="genre-card" onclick="GenreBrowserModule.openGenrePage(${genre.id}, '${genre.name.replace(/'/g, "\\'")}')">
                            <img src="${this.getGenreImage(genre.name)}" alt="${genre.name}" />
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    getGenreImage(genreName) {
        const imageMap = {
            'Action': 'assets/action.png',
            'Adventure': 'assets/Adventure.png',
            'Animation': 'assets/animation.png',
            'Comedy': 'assets/comedy.png',
            'Crime': 'assets/crime.png',
            'Documentary': 'assets/documentry.png',
            'Drama': 'assets/drama.png',
            'Family': 'assets/family.png',
            'Fantasy': 'assets/fantasy.png',
            'History': 'assets/historical.png',
            'Horror': 'assets/horror.png',
            'Music': 'assets/musical.png',
            'Mystery': 'assets/Mystery.webp',
            'Romance': 'assets/romance.jpg',
            'Science Fiction': 'assets/sci-fi.png',
            'TV Movie': 'assets/TV.webp',
            'Thriller': 'assets/thriller.png',
            'War': 'assets/war.png'
        };
        return imageMap[genreName] || 'assets/drama.png';
    },
    
    getGenreEmoji(genreName) {
        const emojiMap = {
            'Action': '💥',
            'Adventure': '🗺️',
            'Animation': '🎨',
            'Comedy': '😂',
            'Crime': '🔫',
            'Documentary': '📹',
            'Drama': '🎭',
            'Family': '👨‍👩‍👧‍👦',
            'Fantasy': '🧙',
            'History': '📜',
            'Horror': '👻',
            'Music': '🎵',
            'Mystery': '🔍',
            'Romance': '💕',
            'Science Fiction': '🚀',
            'TV Movie': '📺',
            'Thriller': '😱',
            'War': '⚔️',
            'Western': '🤠'
        };
        return emojiMap[genreName] || '🎬';
    },

    openGenrePage(genreId, genreName) {
        this.currentGenre = { id: genreId, name: genreName };
        this.currentPage = 1;
        this.currentSort = 'popularity.desc';
        
        if (window.showView) {
            showView('genre');
        }
        
        if (window.updateNavLinks) {
            updateNavLinks('genre');
        }
        
        const container = document.getElementById('genreContent');
        if (!container) return;
        
        container.innerHTML = `
            <div class="content-header">
                <h1>${this.getGenreEmoji(genreName)} ${genreName} Movies</h1>
                <p class="content-subtitle">Discover the best ${genreName.toLowerCase()} movies</p>
            </div>
            
            <div class="genre-page-filters">
                <div class="filter-group">
                    <label>Sort By:</label>
                    <select id="genreSortFilter" onchange="GenreBrowserModule.onSortChange()">
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
            </div>
            
            <div id="genreGrid" class="genre-movies-grid"></div>
            <div id="genreLoadMore" class="load-more-container" style="display: none;"></div>
        `;
        
        this.loadGenreMovies();
    },

    async loadGenreMovies(append = false) {
        if (this.isLoading) return;
        
        const grid = document.getElementById('genreGrid');
        const loadMoreContainer = document.getElementById('genreLoadMore');
        
        if (!grid) return;
        
        this.isLoading = true;
        
        if (!append) {
            grid.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 40px;">Loading movies...</p>';
        }
        
        try {
            const TMDB_API_KEY = 'be880dc5b7df8623008f6cc66c0c7396';
            const BASE_URL = 'https://api.themoviedb.org/3';
            
            // Build URL with genre filter
            let url = `${BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_original_language=hi&region=IN&with_genres=${this.currentGenre.id}&sort_by=${this.currentSort}&page=${this.currentPage}`;
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error('Failed to fetch genre movies');
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
                        <button class="load-more-btn" onclick="GenreBrowserModule.loadMore()">
                            Load More (Page ${this.currentPage + 1} of ${this.totalPages})
                        </button>
                    `;
                } else {
                    loadMoreContainer.style.display = 'none';
                }
            } else {
                if (!append) {
                    grid.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 40px;">No movies found for this genre.</p>';
                }
                loadMoreContainer.style.display = 'none';
            }
            
        } catch (error) {
            console.error('Failed to load genre movies:', error);
            if (!append) {
                grid.innerHTML = '<p style="color: var(--primary-color); text-align: center; padding: 40px;">Failed to load movies. Please try again.</p>';
            }
        } finally {
            this.isLoading = false;
        }
    },

    createMovieCard(movie) {
        const card = document.createElement('div');
        card.className = 'genre-movie-card';
        
        const title = movie.title || movie.original_title;
        const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
        const year = movie.release_date ? new Date(movie.release_date).getFullYear() : '';
        const posterUrl = movie.poster_path 
            ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
            : 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22300%22%3E%3Crect width=%22200%22 height=%22300%22 fill=%22%23333%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 fill=%22%23666%22 text-anchor=%22middle%22 dy=%22.3em%22%3ENo Image%3C/text%3E%3C/svg%3E';
        
        card.innerHTML = `
            <img src="${posterUrl}" alt="${title}" />
            <div class="genre-movie-card-overlay">
                <h4>${title}</h4>
                <div class="genre-movie-card-info">
                    <span class="genre-movie-rating">⭐ ${rating}</span>
                    ${year ? `<span class="genre-movie-year">${year}</span>` : ''}
                </div>
                ${movie.overview ? `<p class="genre-movie-overview">${movie.overview.substring(0, 100)}...</p>` : ''}
            </div>
        `;
        
        card.addEventListener('click', () => {
            if (window.TMDBContentModule) {
                window.TMDBContentModule.showTMDBDetails(movie, 'movie', false);
            }
        });
        
        return card;
    },

    onSortChange() {
        const sortFilter = document.getElementById('genreSortFilter');
        this.currentSort = sortFilter.value;
        this.currentPage = 1;
        this.loadGenreMovies(false);
    },

    async loadMore() {
        this.currentPage++;
        await this.loadGenreMovies(true);
    }
};

// Make globally accessible
window.GenreBrowserModule = GenreBrowserModule;
