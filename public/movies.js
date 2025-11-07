// Movies Module - Aggregates all movies from all providers with caching
const MoviesModule = {
    state: {
        currentPage: 1,
        loadedMovies: [],
        allProviders: [],
        cache: new Map(),
        cacheTimestamp: new Map(),
        isLoading: false,
    },

    // Cache configuration
    CACHE_DURATION: 10 * 60 * 1000, // 10 minutes

    // Initialize movies module
    async init(providers) {
        console.log('🎬 Initializing Movies module with', providers.length, 'providers');
        this.state.allProviders = providers;
        this.state.currentPage = 1;
        this.state.loadedMovies = [];
        this.state.isLoading = false;
    },

    // Check if cache is valid
    isCacheValid(key) {
        if (!this.state.cache.has(key)) return false;
        const timestamp = this.state.cacheTimestamp.get(key);
        return timestamp && (Date.now() - timestamp) < this.CACHE_DURATION;
    },

    // Get from cache
    getFromCache(key) {
        if (this.isCacheValid(key)) {
            console.log('📋 Using cached movies data for:', key);
            return this.state.cache.get(key);
        }
        return null;
    },

    // Set cache
    setCache(key, data) {
        console.log('💾 Caching movies data for:', key);
        this.state.cache.set(key, data);
        this.state.cacheTimestamp.set(key, Date.now());
    },

    // Clear cache
    clearCache() {
        this.state.cache.clear();
        this.state.cacheTimestamp.clear();
        console.log('🗑️ Cleared movies cache');
    },

    // Render the movies page
    renderMoviesPage() {
        const container = document.getElementById('moviesContent');
        if (!container) return;

        container.innerHTML = `
            <div class="content-header">
                <h1>🎬 Movies</h1>
                <p class="content-subtitle">Browse movies from all providers</p>
            </div>
            
            <div class="content-sections">
                <div id="moviesGrid" class="posts-grid"></div>
                <div id="moviesPagination" class="pagination"></div>
            </div>
        `;

        // Clear any existing continue watching sections that might interfere
        const existingContinueWatching = container.querySelectorAll('.continue-watching-section, .history-section');
        existingContinueWatching.forEach(section => section.remove());

        this.loadMovies();
    },

    // Load movies from all providers with progressive loading and caching
    async loadMovies(page = 1, append = false) {
        const container = document.getElementById('moviesGrid');
        const paginationContainer = document.getElementById('moviesPagination');
        if (!container) return;

        // Prevent multiple simultaneous loads
        if (this.state.isLoading) {
            console.log('⚠️ Movies already loading, skipping...');
            return;
        }

        this.state.isLoading = true;
        const cacheKey = `movies_page_${page}`;

        // Check cache first
        const cachedData = this.getFromCache(cacheKey);
        if (cachedData && !append) {
            console.log('⚡ Loading movies from cache');
            this.state.loadedMovies = cachedData.movies;
            this.state.currentPage = page;

            // Render cached data immediately
            container.innerHTML = '';
            this.state.loadedMovies.forEach(post => {
                container.appendChild(renderPostCard(post, post.provider));
            });

            // Update pagination
            this.updatePagination(cachedData.hasMore);
            this.state.isLoading = false;
            return;
        }

        if (typeof window.showLoadingWithContext === 'function') {
            window.showLoadingWithContext(true, 'Loading movies from all providers...', 'default');
        } else {
            showLoading(true, 'Loading movies from all providers...');
        }

        try {
            const providers = this.state.allProviders;
            this.state.currentPage = page;

            // Calculate which providers to fetch from based on page
            const providersPerPage = 6; // Reduced for better performance
            const startIndex = (page - 1) * providersPerPage;
            const endIndex = startIndex + providersPerPage;
            const providersToFetch = providers.slice(startIndex, endIndex);

            if (providersToFetch.length === 0) {
                if (!append) {
                    container.innerHTML = '<p style="color: #b3b3b3; grid-column: 1 / -1;">No more movies available.</p>';
                }
                this.updatePagination(false);
                this.state.isLoading = false;
                if (typeof window.showLoadingWithContext === 'function') {
                    window.showLoadingWithContext(false);
                } else {
                    showLoading(false);
                }
                return;
            }

            // Initialize container for progressive loading
            if (!append) {
                container.innerHTML = '<div class="loading-placeholder">Loading movies...</div>';
                this.state.loadedMovies = [];
            }

            let loadedCount = 0;
            const totalProviders = providersToFetch.length;

            // Progressive loading - show content as it arrives
            const fetchPromises = providersToFetch.map(async (provider, index) => {
                try {
                    // Check individual provider cache
                    const providerCacheKey = `movies_${provider.value}_page1`;
                    const cachedProviderData = this.getFromCache(providerCacheKey);

                    let providerMovies = [];

                    if (cachedProviderData) {
                        console.log(`📋 Using cached data for provider: ${provider.value}`);
                        providerMovies = cachedProviderData;
                    } else {
                        // Get catalog to find movie sections
                        const catalogResponse = await fetch(`${API_BASE}/api/${provider.value}/catalog`);
                        if (!catalogResponse.ok) throw new Error('Catalog fetch failed');

                        const catalogData = await catalogResponse.json();

                        // Find movie-related sections
                        let movieFilter = '';
                        if (catalogData.catalog && Array.isArray(catalogData.catalog)) {
                            const movieSection = catalogData.catalog.find(item => {
                                const title = item.title.toLowerCase();
                                return title.includes('movie') || title.includes('film');
                            });
                            if (movieSection) {
                                movieFilter = movieSection.filter;
                            } else {
                                // If no specific movie section, use first catalog item
                                movieFilter = catalogData.catalog[0]?.filter || '';
                            }
                        }

                        const postsResponse = await fetch(`${API_BASE}/api/${provider.value}/posts?filter=${encodeURIComponent(movieFilter)}&page=1`);
                        if (!postsResponse.ok) throw new Error('Posts fetch failed');

                        const data = await postsResponse.json();
                        const posts = Array.isArray(data) ? data : (data.posts || []);

                        // Take first 10 posts from each provider
                        providerMovies = posts.slice(0, 10).map(post => ({
                            ...post,
                            provider: provider.value,
                            displayName: provider.display_name
                        }));

                        // Cache provider data
                        this.setCache(providerCacheKey, providerMovies);
                    }

                    // Progressive rendering - add movies as they arrive
                    if (providerMovies.length > 0) {
                        // Remove loading placeholder on first load
                        if (loadedCount === 0 && !append) {
                            container.innerHTML = '';
                        }

                        // Add movies to state
                        this.state.loadedMovies = this.state.loadedMovies.concat(providerMovies);

                        // Render new movies immediately
                        providerMovies.forEach(post => {
                            const card = renderPostCard(post, post.provider);
                            card.style.opacity = '0';
                            card.style.transform = 'translateY(20px)';
                            container.appendChild(card);

                            // Animate in
                            setTimeout(() => {
                                card.style.transition = 'all 0.3s ease';
                                card.style.opacity = '1';
                                card.style.transform = 'translateY(0)';
                            }, index * 100); // Stagger animation
                        });

                        console.log(`✅ Loaded ${providerMovies.length} movies from ${provider.display_name}`);
                    }

                    loadedCount++;

                    // Update loading message
                    if (typeof window.showLoadingWithContext === 'function') {
                        window.showLoadingWithContext(true, `Loading movies... (${loadedCount}/${totalProviders} providers)`, 'default');
                    }

                    return { posts: providerMovies, provider: provider.value };

                } catch (error) {
                    console.warn(`Failed to fetch movies from ${provider.value}:`, error);
                    loadedCount++;
                    return { posts: [], provider: provider.value };
                }
            });

            // Wait for all providers to complete
            await Promise.all(fetchPromises);

            // Shuffle for variety after all content is loaded
            if (!append) {
                shuffleArray(this.state.loadedMovies);

                // Re-render with shuffled order
                container.innerHTML = '';
                this.state.loadedMovies.forEach((post, index) => {
                    const card = renderPostCard(post, post.provider);
                    card.style.opacity = '0';
                    card.style.transform = 'translateY(20px)';
                    container.appendChild(card);

                    // Animate in with stagger
                    setTimeout(() => {
                        card.style.transition = 'all 0.3s ease';
                        card.style.opacity = '1';
                        card.style.transform = 'translateY(0)';
                    }, index * 50);
                });
            }

            // Cache the complete page data
            const hasMore = endIndex < providers.length;
            this.setCache(cacheKey, {
                movies: this.state.loadedMovies,
                hasMore: hasMore
            });

            // Update pagination
            this.updatePagination(hasMore);

            console.log(`🎬 Loaded ${this.state.loadedMovies.length} movies from ${loadedCount} providers`);

        } catch (error) {
            console.error('Failed to load movies:', error);
            if (!append) {
                container.innerHTML = '<p style="color: #e50914; grid-column: 1 / -1;">Failed to load movies. Please try again.</p>';
            }
        } finally {
            this.state.isLoading = false;
            if (typeof window.showLoadingWithContext === 'function') {
                window.showLoadingWithContext(false);
            } else {
                showLoading(false);
            }
        }
    },

    // Update pagination UI
    updatePagination(hasMore) {
        const paginationContainer = document.getElementById('moviesPagination');
        if (!paginationContainer) return;

        if (hasMore) {
            // Create button with event listener instead of onclick
            paginationContainer.innerHTML = `
                <button class="load-more-btn" ${this.state.isLoading ? 'disabled' : ''}>
                    📥 Load More Movies
                </button>
            `;

            // Add event listener
            const loadMoreBtn = paginationContainer.querySelector('.load-more-btn');
            if (loadMoreBtn) {
                loadMoreBtn.addEventListener('click', () => {
                    console.log('🎬 Load more movies clicked');
                    this.loadMoreMovies();
                });
            }
        } else {
            paginationContainer.innerHTML = '<p style="color: #b3b3b3; text-align: center;">No more movies available</p>';
        }
    },

    // Load more movies
    async loadMoreMovies() {
        if (this.state.isLoading) return;
        const nextPage = this.state.currentPage + 1;
        await this.loadMovies(nextPage, true);
    },

    // Get cache info for debugging
    getCacheInfo() {
        return {
            cacheSize: this.state.cache.size,
            cachedKeys: Array.from(this.state.cache.keys()),
            cacheTimestamps: Array.from(this.state.cacheTimestamp.entries())
        };
    }
};

// Make MoviesModule globally accessible
window.MoviesModule = MoviesModule;
