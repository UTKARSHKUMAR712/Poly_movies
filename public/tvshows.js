// TV Shows Module - Aggregates all TV shows from all providers with caching
const TVShowsModule = {
    state: {
        currentPage: 1,
        loadedShows: [],
        allProviders: [],
        cache: new Map(),
        cacheTimestamp: new Map(),
        isLoading: false,
    },

    // Cache configuration
    CACHE_DURATION: 10 * 60 * 1000, // 10 minutes

    // Initialize TV shows module
    async init(providers) {
        console.log('📺 Initializing TV Shows module with', providers.length, 'providers');
        this.state.allProviders = providers;
        this.state.currentPage = 1;
        this.state.loadedShows = [];
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
            console.log('📋 Using cached TV shows data for:', key);
            return this.state.cache.get(key);
        }
        return null;
    },

    // Set cache
    setCache(key, data) {
        console.log('💾 Caching TV shows data for:', key);
        this.state.cache.set(key, data);
        this.state.cacheTimestamp.set(key, Date.now());
    },

    // Clear cache
    clearCache() {
        this.state.cache.clear();
        this.state.cacheTimestamp.clear();
        console.log('🗑️ Cleared TV shows cache');
    },

    // Render the TV shows page
    renderTVShowsPage() {
        const container = document.getElementById('tvShowsContent');
        if (!container) return;

        container.innerHTML = `
            <div class="content-header">
                <h1>📺 TV Shows</h1>
                <p class="content-subtitle">Browse TV shows and series from all providers</p>
            </div>
            
            <div class="content-sections">
                <div id="tvShowsGrid" class="posts-grid"></div>
                <div id="tvShowsPagination" class="pagination"></div>
            </div>
        `;

        // Clear any existing continue watching sections that might interfere
        const existingContinueWatching = container.querySelectorAll('.continue-watching-section, .history-section');
        existingContinueWatching.forEach(section => section.remove());

        this.loadTVShows();
    },

    // Load TV shows from all providers with progressive loading and caching
    async loadTVShows(page = 1, append = false) {
        const container = document.getElementById('tvShowsGrid');
        if (!container) return;

        // Prevent multiple simultaneous loads
        if (this.state.isLoading) {
            console.log('⚠️ TV shows already loading, skipping...');
            return;
        }

        this.state.isLoading = true;
        const cacheKey = `tvshows_page_${page}`;

        // Check cache first
        const cachedData = this.getFromCache(cacheKey);
        if (cachedData && !append) {
            console.log('⚡ Loading TV shows from cache');
            this.state.loadedShows = cachedData.shows;
            this.state.currentPage = page;

            // Render cached data immediately
            container.innerHTML = '';
            this.state.loadedShows.forEach(post => {
                container.appendChild(renderPostCard(post, post.provider));
            });

            // Update pagination
            this.updatePagination(cachedData.hasMore);
            this.state.isLoading = false;
            return;
        }

        if (typeof window.showLoadingWithContext === 'function') {
            window.showLoadingWithContext(true, 'Loading TV shows from all providers...', 'default');
        } else {
            showLoading(true, 'Loading TV shows from all providers...');
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
                    container.innerHTML = '<p style="color: #b3b3b3; grid-column: 1 / -1;">No more TV shows available.</p>';
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
                container.innerHTML = '<div class="loading-placeholder">Loading TV shows...</div>';
                this.state.loadedShows = [];
            }

            let loadedCount = 0;
            const totalProviders = providersToFetch.length;

            // Progressive loading - show content as it arrives
            const fetchPromises = providersToFetch.map(async (provider, index) => {
                try {
                    // Check individual provider cache
                    const providerCacheKey = `tvshows_${provider.value}_page1`;
                    const cachedProviderData = this.getFromCache(providerCacheKey);

                    let providerShows = [];

                    if (cachedProviderData) {
                        console.log(`📋 Using cached data for provider: ${provider.value}`);
                        providerShows = cachedProviderData;
                    } else {
                        // Get catalog to find TV show sections
                        const catalogResponse = await fetch(`${API_BASE}/api/${provider.value}/catalog`);
                        if (!catalogResponse.ok) throw new Error('Catalog fetch failed');

                        const catalogData = await catalogResponse.json();

                        // Find TV show-related sections
                        let tvFilter = '';
                        if (catalogData.catalog && Array.isArray(catalogData.catalog)) {
                            const tvSection = catalogData.catalog.find(item => {
                                const title = item.title.toLowerCase();
                                return title.includes('tv') || title.includes('show') ||
                                    title.includes('series') || title.includes('web series');
                            });
                            if (tvSection) {
                                tvFilter = tvSection.filter;
                            } else {
                                // If no specific TV section, try second catalog item
                                tvFilter = catalogData.catalog[1]?.filter || catalogData.catalog[0]?.filter || '';
                            }
                        }

                        const postsResponse = await fetch(`${API_BASE}/api/${provider.value}/posts?filter=${encodeURIComponent(tvFilter)}&page=1`);
                        if (!postsResponse.ok) throw new Error('Posts fetch failed');

                        const data = await postsResponse.json();
                        const posts = Array.isArray(data) ? data : (data.posts || []);

                        // Take first 10 posts from each provider
                        providerShows = posts.slice(0, 10).map(post => ({
                            ...post,
                            provider: provider.value,
                            displayName: provider.display_name
                        }));

                        // Cache provider data
                        this.setCache(providerCacheKey, providerShows);
                    }

                    // Progressive rendering - add shows as they arrive
                    if (providerShows.length > 0) {
                        // Remove loading placeholder on first load
                        if (loadedCount === 0 && !append) {
                            container.innerHTML = '';
                        }

                        // Add shows to state
                        this.state.loadedShows = this.state.loadedShows.concat(providerShows);

                        // Render new shows immediately
                        providerShows.forEach(post => {
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

                        console.log(`✅ Loaded ${providerShows.length} TV shows from ${provider.display_name}`);
                    }

                    loadedCount++;

                    // Update loading message
                    if (typeof window.showLoadingWithContext === 'function') {
                        window.showLoadingWithContext(true, `Loading TV shows... (${loadedCount}/${totalProviders} providers)`, 'default');
                    }

                    return { posts: providerShows, provider: provider.value };

                } catch (error) {
                    console.warn(`Failed to fetch TV shows from ${provider.value}:`, error);
                    loadedCount++;
                    return { posts: [], provider: provider.value };
                }
            });

            // Wait for all providers to complete
            await Promise.all(fetchPromises);

            // Shuffle for variety after all content is loaded
            if (!append) {
                shuffleArray(this.state.loadedShows);

                // Re-render with shuffled order
                container.innerHTML = '';
                this.state.loadedShows.forEach((post, index) => {
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
                shows: this.state.loadedShows,
                hasMore: hasMore
            });

            // Update pagination
            this.updatePagination(hasMore);

            console.log(`📺 Loaded ${this.state.loadedShows.length} TV shows from ${loadedCount} providers`);

        } catch (error) {
            console.error('Failed to load TV shows:', error);
            if (!append) {
                container.innerHTML = '<p style="color: #e50914; grid-column: 1 / -1;">Failed to load TV shows. Please try again.</p>';
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
        const paginationContainer = document.getElementById('tvShowsPagination');
        if (!paginationContainer) return;

        if (hasMore) {
            // Create button with event listener instead of onclick
            paginationContainer.innerHTML = `
                <button class="load-more-btn" ${this.state.isLoading ? 'disabled' : ''}>
                    📥 Load More TV Shows
                </button>
            `;
            
            // Add event listener
            const loadMoreBtn = paginationContainer.querySelector('.load-more-btn');
            if (loadMoreBtn) {
                loadMoreBtn.addEventListener('click', () => {
                    console.log('📺 Load more TV shows clicked');
                    this.loadMoreTVShows();
                });
            }
        } else {
            paginationContainer.innerHTML = '<p style="color: #b3b3b3; text-align: center;">No more TV shows available</p>';
        }
    },

    // Load more TV shows
    async loadMoreTVShows() {
        if (this.state.isLoading) return;
        const nextPage = this.state.currentPage + 1;
        await this.loadTVShows(nextPage, true);
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

// Make TVShowsModule globally accessible
window.TVShowsModule = TVShowsModule;
