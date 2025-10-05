// Popular Stars Module for Home Page
const PopularStarsModule = {
    currentPage: 1,
    totalPages: 1,
    isLoading: false,
    allStars: [],
    viewAllPage: 1,
    viewAllTotalPages: 1,
    viewAllStars: [],

    async init() {
        await this.loadPopularStars();
        this.renderStarsSection();
    },

    async loadPopularStars() {
        try {
            const TMDB_API_KEY = 'be880dc5b7df8623008f6cc66c0c7396';
            const response = await fetch(`https://api.themoviedb.org/3/person/popular?api_key=${TMDB_API_KEY}&page=${this.currentPage}`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch popular stars');
            }
            
            const data = await response.json();
            this.totalPages = data.total_pages || 1;
            
            // Filter stars who have at least one Hindi or English movie
            const filteredStars = data.results.filter(star => {
                if (!star.known_for || star.known_for.length === 0) return false;
                
                return star.known_for.some(work => {
                    const lang = work.original_language;
                    return lang === 'hi' || lang === 'en' || lang === 'hin';
                });
            });
            
            this.allStars = [...this.allStars, ...filteredStars];
            
            console.log('✅ Loaded', filteredStars.length, 'popular stars');
        } catch (error) {
            console.error('Failed to load popular stars:', error);
        }
    },

    renderStarsSection() {
        const catalogSections = document.getElementById('catalogSections');
        if (!catalogSections) return;

        // Check if stars section already exists
        let starsSection = document.getElementById('popularStarsSection');
        
        if (!starsSection) {
            starsSection = document.createElement('div');
            starsSection.id = 'popularStarsSection';
            starsSection.className = 'popular-stars-section';
            catalogSections.appendChild(starsSection);
        }

        // Show only first 15 stars on home page
        const displayStars = this.allStars.slice(0, 15);

        starsSection.innerHTML = `
            <div class="popular-stars-header">
                <h2 class="popular-stars-title">⭐ Popular Stars</h2>
                <button class="view-all-btn" onclick="PopularStarsModule.openViewAllPage()">
                    View All →
                </button>
            </div>
            <div class="popular-stars-scroll-container">
                <div class="popular-stars-wrapper">
                    ${displayStars.map(star => {
                        const profileUrl = star.profile_path 
                            ? `https://image.tmdb.org/t/p/w185${star.profile_path}`
                            : 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22185%22 height=%22278%22%3E%3Crect width=%22185%22 height=%22278%22 fill=%22%23333%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 fill=%22%23666%22 text-anchor=%22middle%22 dy=%22.3em%22%3ENo Image%3C/text%3E%3C/svg%3E';
                        
                        return `
                            <div class="popular-star-card" onclick="PopularStarsModule.openStarDetails(${star.id}, '${star.name.replace(/'/g, "\\'")}')">
                                <img src="${profileUrl}" alt="${star.name}" />
                                <div class="popular-star-name">${star.name}</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    },

    openViewAllPage() {
        if (window.showView) {
            showView('popularStarsAll');
        }
        
        if (window.updateNavLinks) {
            updateNavLinks('popularStarsAll');
        }
        
        this.loadViewAllPage();
    },

    async loadViewAllPage() {
        const container = document.getElementById('popularStarsAllContent');
        if (!container) return;
        
        // Reset view all state
        this.viewAllPage = 1;
        this.viewAllStars = [];
        
        container.innerHTML = `
            <div class="content-header">
                <h1>⭐ Popular Stars</h1>
                <p class="content-subtitle">Discover popular actors and actresses</p>
            </div>
            <div id="viewAllStarsGrid" class="view-all-stars-grid">
                <p style="color: var(--text-muted); text-align: center; padding: 40px;">Loading...</p>
            </div>
            <div id="viewAllLoadMore" class="load-more-container" style="display: none;"></div>
        `;
        
        await this.loadViewAllStars();
    },

    async loadViewAllStars(append = false) {
        try {
            const TMDB_API_KEY = 'be880dc5b7df8623008f6cc66c0c7396';
            const response = await fetch(`https://api.themoviedb.org/3/person/popular?api_key=${TMDB_API_KEY}&page=${this.viewAllPage}`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch popular stars');
            }
            
            const data = await response.json();
            this.viewAllTotalPages = data.total_pages || 1;
            
            // Filter stars who have at least one Hindi or English movie
            const filteredStars = data.results.filter(star => {
                if (!star.known_for || star.known_for.length === 0) return false;
                
                return star.known_for.some(work => {
                    const lang = work.original_language;
                    return lang === 'hi' || lang === 'en' || lang === 'hin';
                });
            });
            
            this.viewAllStars = [...this.viewAllStars, ...filteredStars];
            
            this.renderViewAllStars(append);
            
        } catch (error) {
            console.error('Failed to load view all stars:', error);
            const grid = document.getElementById('viewAllStarsGrid');
            if (grid && !append) {
                grid.innerHTML = '<p style="color: var(--primary-color); text-align: center; padding: 40px;">Failed to load stars.</p>';
            }
        }
    },

    renderViewAllStars(append = false) {
        const grid = document.getElementById('viewAllStarsGrid');
        const loadMoreContainer = document.getElementById('viewAllLoadMore');
        
        if (!grid) return;
        
        if (!append) {
            grid.innerHTML = '';
        }
        
        this.viewAllStars.forEach(star => {
            const card = this.createStarCard(star);
            grid.appendChild(card);
        });
        
        // Update load more button
        if (loadMoreContainer) {
            if (this.viewAllPage < this.viewAllTotalPages) {
                loadMoreContainer.style.display = 'block';
                loadMoreContainer.innerHTML = `
                    <button class="load-more-btn" onclick="PopularStarsModule.loadMoreViewAll()">
                        Load More (Page ${this.viewAllPage + 1} of ${this.viewAllTotalPages})
                    </button>
                `;
            } else {
                loadMoreContainer.style.display = 'none';
            }
        }
    },

    async loadMoreViewAll() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.viewAllPage++;
        
        await this.loadViewAllStars(true);
        
        this.isLoading = false;
    },

    createStarCard(star) {
        const card = document.createElement('div');
        card.className = 'view-all-star-card';
        
        const profileUrl = star.profile_path 
            ? `https://image.tmdb.org/t/p/w185${star.profile_path}`
            : 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22185%22 height=%22278%22%3E%3Crect width=%22185%22 height=%22278%22 fill=%22%23333%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 fill=%22%23666%22 text-anchor=%22middle%22 dy=%22.3em%22%3ENo Image%3C/text%3E%3C/svg%3E';
        
        card.innerHTML = `
            <img src="${profileUrl}" alt="${star.name}" />
            <div class="view-all-star-name">${star.name}</div>
            <div class="view-all-star-dept">${star.known_for_department || 'Acting'}</div>
        `;
        
        card.addEventListener('click', () => {
            this.openStarDetails(star.id, star.name);
        });
        
        return card;
    },

    openStarDetails(starId, starName) {
        if (window.showView) {
            showView('popularStar');
        }
        
        if (window.updateNavLinks) {
            updateNavLinks('popularStar');
        }
        
        this.loadStarDetailsPage(starId, starName);
    },

    async loadStarDetailsPage(starId, starName) {
        const container = document.getElementById('popularStarContent');
        if (!container) return;
        
        container.innerHTML = `
            <div class="content-header">
                <h1>⭐ ${starName}</h1>
                <p class="content-subtitle">Known for</p>
            </div>
            <div id="starKnownForGrid" class="star-known-for-grid">
                <p style="color: var(--text-muted); text-align: center; padding: 40px;">Loading...</p>
            </div>
        `;
        
        try {
            const TMDB_API_KEY = 'be880dc5b7df8623008f6cc66c0c7396';
            const response = await fetch(`https://api.themoviedb.org/3/person/${starId}?api_key=${TMDB_API_KEY}&append_to_response=combined_credits`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch star details');
            }
            
            const data = await response.json();
            const grid = document.getElementById('starKnownForGrid');
            
            if (!grid) return;
            
            // Get all credits (movies and TV shows)
            const allCredits = [
                ...(data.combined_credits?.cast || []),
                ...(data.combined_credits?.crew || [])
            ];
            
            // Filter for Hindi/English content with posters
            const filteredCredits = allCredits.filter(credit => {
                const lang = credit.original_language;
                return (lang === 'hi' || lang === 'en' || lang === 'hin') && credit.poster_path;
            });
            
            // Remove duplicates by id
            const uniqueCredits = Array.from(new Map(filteredCredits.map(item => [item.id, item])).values());
            
            // Sort by popularity
            uniqueCredits.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
            
            if (uniqueCredits.length === 0) {
                grid.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 40px;">No movies or shows found.</p>';
                return;
            }
            
            grid.innerHTML = '';
            
            uniqueCredits.forEach(credit => {
                const card = this.createCreditCard(credit);
                grid.appendChild(card);
            });
            
        } catch (error) {
            console.error('Failed to load star details:', error);
            const grid = document.getElementById('starKnownForGrid');
            if (grid) {
                grid.innerHTML = '<p style="color: var(--primary-color); text-align: center; padding: 40px;">Failed to load content.</p>';
            }
        }
    },

    createCreditCard(credit) {
        const card = document.createElement('div');
        card.className = 'star-credit-card';
        
        const title = credit.title || credit.name;
        const rating = credit.vote_average ? credit.vote_average.toFixed(1) : 'N/A';
        const year = credit.release_date ? new Date(credit.release_date).getFullYear() : 
                     credit.first_air_date ? new Date(credit.first_air_date).getFullYear() : '';
        const posterUrl = `https://image.tmdb.org/t/p/w500${credit.poster_path}`;
        const mediaType = credit.media_type || (credit.title ? 'movie' : 'tv');
        
        card.innerHTML = `
            <img src="${posterUrl}" alt="${title}" />
            <div class="star-credit-overlay">
                <h4>${title}</h4>
                <div class="star-credit-info">
                    <span class="star-credit-rating">⭐ ${rating}</span>
                    ${year ? `<span class="star-credit-year">${year}</span>` : ''}
                </div>
                ${credit.character ? `<p class="star-credit-role">as ${credit.character}</p>` : ''}
            </div>
        `;
        
        card.addEventListener('click', () => {
            if (window.TMDBContentModule) {
                window.TMDBContentModule.showTMDBDetails(credit, mediaType, false);
            }
        });
        
        return card;
    }
};

// Make globally accessible
window.PopularStarsModule = PopularStarsModule;
