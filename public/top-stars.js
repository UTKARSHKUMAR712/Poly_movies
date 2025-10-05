// Top Stars Module for Bollywood
const TopStarsModule = {
    stars: [
        "Shah Rukh Khan", "Aamir Khan", "Amitabh Bachchan", "Salman Khan", "Akshay Kumar", 
        "Ajay Devgn", "Hrithik Roshan", "Ranbir Kapoor", "Ranveer Singh", "Saif Ali Khan", 
        "Varun Dhawan", "Sidharth Malhotra", "Tiger Shroff", "Abhishek Bachchan", "Vicky Kaushal", 
        "Rajkummar Rao", "Ayushmann Khurrana", "John Abraham", "Arjun Kapoor", "Kartik Aaryan", 
        "Pankaj Tripathi", "Nawazuddin Siddiqui", "Irrfan Khan", "Sunil Shetty", "Govinda", 
        "Sanjay Dutt", "Kunal Kemmu", "Anil Kapoor", "Arshad Warsi", "Jackie Shroff", "Riteish Deshmukh",
        "Deepika Padukone", "Alia Bhatt", "Priyanka Chopra", "Kareena Kapoor", "Katrina Kaif", 
        "Anushka Sharma", "Taapsee Pannu", "Kiara Advani", "Janhvi Kapoor", "Bhumi Pednekar"
    ],
    currentStar: null,
    currentPage: 1,
    totalPages: 1,
    isLoading: false,

    renderStarsSection() {
        const bollywoodContent = document.getElementById('bollywoodContent');
        if (!bollywoodContent) return;

        // Check if stars section already exists
        let starsSection = document.getElementById('topStarsSection');
        
        if (!starsSection) {
            starsSection = document.createElement('div');
            starsSection.id = 'topStarsSection';
            starsSection.className = 'top-stars-section';
            
            // Find the tabs and insert after them
            const tabs = bollywoodContent.querySelector('.bollywood-tabs');
            if (tabs && tabs.nextSibling) {
                bollywoodContent.insertBefore(starsSection, tabs.nextSibling);
            } else {
                bollywoodContent.appendChild(starsSection);
            }
        }

        starsSection.innerHTML = `
            <div class="top-stars-header">
                <h2 class="top-stars-title">⭐ From Top Stars</h2>
            </div>
            <div class="top-stars-scroll-container">
                <div class="top-stars-wrapper">
                    ${this.stars.map(star => `
                        <button class="star-chip" onclick="TopStarsModule.openStarPage('${star.replace(/'/g, "\\'")}')">
                            ${star}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    },

    openStarPage(starName) {
        this.currentStar = starName;
        this.currentPage = 1;
        
        if (window.showView) {
            showView('topStar');
        }
        
        if (window.updateNavLinks) {
            updateNavLinks('topStar');
        }
        
        const container = document.getElementById('topStarContent');
        if (!container) return;
        
        container.innerHTML = `
            <div class="content-header">
                <h1>⭐ ${starName}</h1>
                <p class="content-subtitle">Movies featuring ${starName}</p>
            </div>
            
            <div id="starMoviesGrid" class="star-movies-grid"></div>
            <div id="starLoadMore" class="load-more-container" style="display: none;"></div>
        `;
        
        this.loadStarMovies();
    },

    async loadStarMovies(append = false) {
        if (this.isLoading) return;
        
        const grid = document.getElementById('starMoviesGrid');
        const loadMoreContainer = document.getElementById('starLoadMore');
        
        if (!grid) return;
        
        this.isLoading = true;
        
        if (!append) {
            grid.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 40px;">Loading movies...</p>';
        }
        
        try {
            const TMDB_API_KEY = 'be880dc5b7df8623008f6cc66c0c7396';
            const BASE_URL = 'https://api.themoviedb.org/3';
            
            const url = `${BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(this.currentStar)}&page=${this.currentPage}`;
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error('Failed to fetch star movies');
            }
            
            const data = await response.json();
            this.totalPages = data.total_pages || 1;
            
            if (!append) {
                grid.innerHTML = '';
            }
            
            if (data.results && data.results.length > 0) {
                // Filter out results without posters
                const filteredResults = data.results.filter(movie => movie.poster_path);
                
                if (filteredResults.length === 0 && !append) {
                    grid.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 40px;">No movies found with posters for this star.</p>';
                    loadMoreContainer.style.display = 'none';
                } else {
                    filteredResults.forEach(movie => {
                        const card = this.createMovieCard(movie);
                        grid.appendChild(card);
                    });
                    
                    // Show/update load more button
                    if (this.currentPage < this.totalPages) {
                        loadMoreContainer.style.display = 'block';
                        loadMoreContainer.innerHTML = `
                            <button class="load-more-btn" onclick="TopStarsModule.loadMore()">
                                Load More (Page ${this.currentPage + 1} of ${this.totalPages})
                            </button>
                        `;
                    } else {
                        loadMoreContainer.style.display = 'none';
                    }
                }
            } else {
                if (!append) {
                    grid.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 40px;">No movies found for this star.</p>';
                }
                loadMoreContainer.style.display = 'none';
            }
            
        } catch (error) {
            console.error('Failed to load star movies:', error);
            if (!append) {
                grid.innerHTML = '<p style="color: var(--primary-color); text-align: center; padding: 40px;">Failed to load movies. Please try again.</p>';
            }
        } finally {
            this.isLoading = false;
        }
    },

    createMovieCard(movie) {
        const card = document.createElement('div');
        card.className = 'star-movie-card';
        
        const title = movie.title || movie.original_title;
        const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
        const year = movie.release_date ? new Date(movie.release_date).getFullYear() : '';
        const posterUrl = `https://image.tmdb.org/t/p/w500${movie.poster_path}`;
        
        card.innerHTML = `
            <img src="${posterUrl}" alt="${title}" />
            <div class="star-movie-card-overlay">
                <h4>${title}</h4>
                <div class="star-movie-card-info">
                    <span class="star-movie-rating">⭐ ${rating}</span>
                    ${year ? `<span class="star-movie-year">${year}</span>` : ''}
                </div>
                ${movie.overview ? `<p class="star-movie-overview">${movie.overview.substring(0, 100)}...</p>` : ''}
            </div>
        `;
        
        card.addEventListener('click', () => {
            if (window.TMDBContentModule) {
                window.TMDBContentModule.showTMDBDetails(movie, 'movie', false);
            }
        });
        
        return card;
    },

    async loadMore() {
        this.currentPage++;
        await this.loadStarMovies(true);
    }
};

// Make globally accessible
window.TopStarsModule = TopStarsModule;
