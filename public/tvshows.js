// TV Shows Module - Aggregates all TV shows from all providers
const TVShowsModule = {
    state: {
        currentPage: 1,
        loadedShows: [],
        allProviders: [],
    },

    // Initialize TV shows module
    async init(providers) {
        console.log('📺 Initializing TV Shows module with', providers.length, 'providers');
        this.state.allProviders = providers;
        this.state.currentPage = 1;
        this.state.loadedShows = [];
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
        
        this.loadTVShows();
    },

    // Load TV shows from all providers
    async loadTVShows(page = 1, append = false) {
        const container = document.getElementById('tvShowsGrid');
        const paginationContainer = document.getElementById('tvShowsPagination');
        if (!container) return;
        
        showLoading(true, 'Loading TV shows from all providers...');
        
        try {
            const providers = this.state.allProviders;
            this.state.currentPage = page;
            
            // Calculate which providers to fetch from based on page
            const providersPerPage = 8;
            const startIndex = (page - 1) * providersPerPage;
            const endIndex = startIndex + providersPerPage;
            const providersToFetch = providers.slice(startIndex, endIndex);
            
            if (providersToFetch.length === 0) {
                if (!append) {
                    container.innerHTML = '<p style="color: #b3b3b3; grid-column: 1 / -1;">No more TV shows available.</p>';
                }
                paginationContainer.innerHTML = '<p style="color: #b3b3b3; text-align: center;">No more content available</p>';
                showLoading(false);
                return;
            }
            
            // Fetch TV shows from selected providers
            const fetchPromises = providersToFetch.map(async (provider) => {
                try {
                    // Get catalog to find TV show sections
                    const catalogResponse = await fetch(`${API_BASE}/api/${provider.value}/catalog`);
                    if (!catalogResponse.ok) return { posts: [], provider: provider.value };
                    
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
                    if (!postsResponse.ok) return { posts: [], provider: provider.value };
                    
                    const data = await postsResponse.json();
                    const posts = Array.isArray(data) ? data : (data.posts || []);
                    
                    // Take first 12 posts from each provider
                    return {
                        posts: posts.slice(0, 12).map(post => ({
                            ...post, 
                            provider: provider.value,
                            displayName: provider.display_name
                        })),
                        provider: provider.value
                    };
                } catch (error) {
                    console.warn(`Failed to fetch TV shows from ${provider.value}:`, error);
                    return { posts: [], provider: provider.value };
                }
            });
            
            const results = await Promise.all(fetchPromises);
            
            // Combine all posts
            let newShows = [];
            results.forEach(result => {
                if (result.posts && result.posts.length > 0) {
                    newShows = newShows.concat(result.posts);
                }
            });
            
            // Shuffle for variety
            shuffleArray(newShows);
            
            // Append or replace posts
            if (append) {
                this.state.loadedShows = this.state.loadedShows.concat(newShows);
            } else {
                this.state.loadedShows = newShows;
            }
            
            // Render posts
            container.innerHTML = '';
            if (this.state.loadedShows.length === 0) {
                container.innerHTML = '<p style="color: #b3b3b3; grid-column: 1 / -1;">No TV shows available.</p>';
            } else {
                this.state.loadedShows.forEach(post => {
                    container.appendChild(renderPostCard(post, post.provider));
                });
            }
            
            // Render load more button
            const hasMore = endIndex < providers.length;
            if (hasMore) {
                paginationContainer.innerHTML = `
                    <button class="load-more-btn" onclick="TVShowsModule.loadMoreTVShows()">
                        📥 Load More TV Shows
                    </button>
                `;
            } else {
                paginationContainer.innerHTML = '<p style="color: #b3b3b3; text-align: center;">No more TV shows available</p>';
            }
            
        } catch (error) {
            console.error('Failed to load TV shows:', error);
            container.innerHTML = '<p style="color: #e50914; grid-column: 1 / -1;">Failed to load TV shows.</p>';
        } finally {
            showLoading(false);
        }
    },
    
    // Load more TV shows
    async loadMoreTVShows() {
        const nextPage = this.state.currentPage + 1;
        await this.loadTVShows(nextPage, true);
    }
};

// Make TVShowsModule globally accessible
window.TVShowsModule = TVShowsModule;
