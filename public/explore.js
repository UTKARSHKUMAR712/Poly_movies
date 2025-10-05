// Explore Module - Aggregates content from all providers
const ExploreModule = {
    state: {
        allGenres: new Map(), // Map<genreName, [{provider, filter}]>
        loadedContent: new Map(), // Cache for loaded content
        currentGenre: null,
        currentGenrePage: 1,
        allContentPage: 1,
        allContentPosts: [], // Store all loaded posts for "All Content"
        genreContentPosts: [], // Store all loaded posts for genre view
    },

    // Initialize explore module by collecting all genres from all providers
    async init(providers) {
        console.log('🔍 Initializing Explore module with', providers.length, 'providers');
        this.state.allGenres.clear();
        
        // Collect all genres from all providers
        for (const provider of providers) {
            try {
                const catalogData = await fetch(`${API_BASE}/api/${provider.value}/catalog`).then(r => r.json());
                
                // Add catalog items as genres
                if (catalogData.catalog && Array.isArray(catalogData.catalog)) {
                    catalogData.catalog.forEach(item => {
                        const genreName = item.title;
                        if (!this.state.allGenres.has(genreName)) {
                            this.state.allGenres.set(genreName, []);
                        }
                        this.state.allGenres.get(genreName).push({
                            provider: provider.value,
                            filter: item.filter,
                            displayName: provider.display_name
                        });
                    });
                }
                
                // Add explicit genres
                if (catalogData.genres && Array.isArray(catalogData.genres)) {
                    catalogData.genres.forEach(genre => {
                        const genreName = genre.title;
                        if (!this.state.allGenres.has(genreName)) {
                            this.state.allGenres.set(genreName, []);
                        }
                        this.state.allGenres.get(genreName).push({
                            provider: provider.value,
                            filter: genre.filter,
                            displayName: provider.display_name
                        });
                    });
                }
            } catch (error) {
                console.warn(`Failed to load catalog for ${provider.value}:`, error);
            }
        }
        
        console.log('✅ Collected', this.state.allGenres.size, 'unique genres/categories');
    },

    // Render the explore page
    renderExplorePage() {
        const container = document.getElementById('exploreContent');
        if (!container) return;
        
        container.innerHTML = `
            <div class="explore-header">
                <h1>🌍 Explore All Content</h1>
                <p class="explore-subtitle">Browse movies and TV shows from all providers</p>
            </div>
            
            <div class="explore-sections">
                <div class="explore-section">
                    <h2>📂 Browse by Category</h2>
                    <div id="exploreGenres" class="genres-grid"></div>
                </div>
                
                <div class="explore-section" id="exploreAllContent">
                    <h2>🎬 All Content</h2>
                    <div id="exploreAllPosts" class="posts-grid"></div>
                    <div id="exploreAllPagination" class="pagination"></div>
                </div>
            </div>
        `;
        
        this.renderGenres();
        this.loadAllContent();
    },

    // Render all unique genres
    renderGenres() {
        const container = document.getElementById('exploreGenres');
        if (!container) return;
        
        container.innerHTML = '';
        
        // Convert Map to sorted array
        const sortedGenres = Array.from(this.state.allGenres.keys()).sort();
        
        sortedGenres.forEach(genreName => {
            const providers = this.state.allGenres.get(genreName);
            const genreBtn = document.createElement('button');
            genreBtn.className = 'genre-btn';
            genreBtn.innerHTML = `
                ${genreName}
                <span class="genre-count">${providers.length}</span>
            `;
            genreBtn.addEventListener('click', () => {
                this.loadGenreContent(genreName);
            });
            container.appendChild(genreBtn);
        });
    },

    // Load content for a specific genre from all providers
    async loadGenreContent(genreName, page = 1, append = false) {
        showLoading(true, `Loading ${genreName}...`);
        
        try {
            const providers = this.state.allGenres.get(genreName);
            if (!providers || providers.length === 0) {
                showError('No providers found for this genre');
                return;
            }
            
            // Store current genre
            this.state.currentGenre = genreName;
            this.state.currentGenrePage = page;
            
            // Fetch content from all providers for this genre
            const fetchPromises = providers.map(async ({provider, filter, displayName}) => {
                try {
                    const response = await fetch(`${API_BASE}/api/${provider}/posts?filter=${encodeURIComponent(filter)}&page=${page}`);
                    if (!response.ok) return { posts: [], provider, hasMore: false };
                    
                    const data = await response.json();
                    const posts = Array.isArray(data) ? data : (data.posts || []);
                    const hasMore = data.hasNextPage || (Array.isArray(posts) && posts.length >= 20);
                    
                    // Add provider info to each post
                    return {
                        posts: posts.map(post => ({...post, provider, displayName})),
                        provider,
                        hasMore
                    };
                } catch (error) {
                    console.warn(`Failed to fetch ${genreName} from ${provider}:`, error);
                    return { posts: [], provider, hasMore: false };
                }
            });
            
            const results = await Promise.all(fetchPromises);
            
            // Combine results
            let newPosts = [];
            let hasMoreContent = false;
            results.forEach(result => {
                if (result.posts && result.posts.length > 0) {
                    newPosts = newPosts.concat(result.posts);
                }
                if (result.hasMore) {
                    hasMoreContent = true;
                }
            });
            
            // Shuffle for variety
            shuffleArray(newPosts);
            
            // Append or replace posts
            if (append) {
                this.state.genreContentPosts = this.state.genreContentPosts.concat(newPosts);
            } else {
                this.state.genreContentPosts = newPosts;
            }
            
            // Update the page
            document.getElementById('searchTitle').textContent = `${genreName} - All Providers`;
            renderPosts(this.state.genreContentPosts, 'searchResults', 'explore');
            
            // Render pagination/load more button
            const paginationContainer = document.getElementById('searchPagination');
            if (hasMoreContent) {
                paginationContainer.innerHTML = `
                    <button class="load-more-btn" onclick="ExploreModule.loadMoreGenreContent()">
                        📥 Load More
                    </button>
                `;
            } else {
                paginationContainer.innerHTML = '<p style="color: #b3b3b3; text-align: center;">No more content available</p>';
            }
            
            showView('search');
            
        } catch (error) {
            showError('Failed to load genre content: ' + error.message);
        } finally {
            showLoading(false);
        }
    },
    
    // Load more content for current genre
    async loadMoreGenreContent() {
        if (!this.state.currentGenre) return;
        const nextPage = this.state.currentGenrePage + 1;
        await this.loadGenreContent(this.state.currentGenre, nextPage, true);
    },

    // Load all content from all providers (mixed)
    async loadAllContent(page = 1, append = false) {
        const container = document.getElementById('exploreAllPosts');
        const paginationContainer = document.getElementById('exploreAllPagination');
        if (!container) return;
        
        showLoading(true, 'Loading content from all providers...');
        
        try {
            // Get all providers
            const providers = state.providers;
            this.state.allContentPage = page;
            
            // Calculate which providers to fetch from based on page
            const providersPerPage = 10;
            const startIndex = (page - 1) * providersPerPage;
            const endIndex = startIndex + providersPerPage;
            const providersToFetch = providers.slice(startIndex, endIndex);
            
            if (providersToFetch.length === 0) {
                if (!append) {
                    container.innerHTML = '<p style="color: #b3b3b3; grid-column: 1 / -1;">No more content available.</p>';
                }
                paginationContainer.innerHTML = '<p style="color: #b3b3b3; text-align: center;">No more content available</p>';
                showLoading(false);
                return;
            }
            
            // Fetch from selected providers
            const fetchPromises = providersToFetch.map(async (provider) => {
                try {
                    // Try to get the first catalog item
                    const catalogResponse = await fetch(`${API_BASE}/api/${provider.value}/catalog`);
                    if (!catalogResponse.ok) return { posts: [], provider: provider.value };
                    
                    const catalogData = await catalogResponse.json();
                    const firstFilter = catalogData.catalog && catalogData.catalog.length > 0 
                        ? catalogData.catalog[0].filter 
                        : '';
                    
                    const postsResponse = await fetch(`${API_BASE}/api/${provider.value}/posts?filter=${encodeURIComponent(firstFilter)}&page=1`);
                    if (!postsResponse.ok) return { posts: [], provider: provider.value };
                    
                    const data = await postsResponse.json();
                    const posts = Array.isArray(data) ? data : (data.posts || []);
                    
                    // Take only first 8 posts from each provider
                    return {
                        posts: posts.slice(0, 8).map(post => ({
                            ...post, 
                            provider: provider.value,
                            displayName: provider.display_name
                        })),
                        provider: provider.value
                    };
                } catch (error) {
                    console.warn(`Failed to fetch from ${provider.value}:`, error);
                    return { posts: [], provider: provider.value };
                }
            });
            
            const results = await Promise.all(fetchPromises);
            
            // Combine all posts
            let newPosts = [];
            results.forEach(result => {
                if (result.posts && result.posts.length > 0) {
                    newPosts = newPosts.concat(result.posts);
                }
            });
            
            // Shuffle for variety
            shuffleArray(newPosts);
            
            // Append or replace posts
            if (append) {
                this.state.allContentPosts = this.state.allContentPosts.concat(newPosts);
            } else {
                this.state.allContentPosts = newPosts;
            }
            
            // Render posts
            container.innerHTML = '';
            if (this.state.allContentPosts.length === 0) {
                container.innerHTML = '<p style="color: #b3b3b3; grid-column: 1 / -1;">No content available.</p>';
            } else {
                this.state.allContentPosts.forEach(post => {
                    container.appendChild(renderPostCard(post, post.provider));
                });
            }
            
            // Render load more button
            const hasMore = endIndex < providers.length;
            if (hasMore) {
                paginationContainer.innerHTML = `
                    <button class="load-more-btn" onclick="ExploreModule.loadMoreAllContent()">
                        📥 Load More
                    </button>
                `;
            } else {
                paginationContainer.innerHTML = '<p style="color: #b3b3b3; text-align: center;">No more content available</p>';
            }
            
        } catch (error) {
            console.error('Failed to load all content:', error);
            container.innerHTML = '<p style="color: #e50914; grid-column: 1 / -1;">Failed to load content.</p>';
        } finally {
            showLoading(false);
        }
    },
    
    // Load more content for "All Content" section
    async loadMoreAllContent() {
        const nextPage = this.state.allContentPage + 1;
        await this.loadAllContent(nextPage, true);
    }
};

// Make ExploreModule globally accessible
window.ExploreModule = ExploreModule;
