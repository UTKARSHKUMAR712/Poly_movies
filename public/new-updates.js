// New & Updates Page - Shows upcoming movies and now playing
async function loadNewUpdatesPage() {
    console.log('📰 Loading New & Updates page...');
    
    if (window.showView) {
        showView('newUpdates');
    }
    
    if (window.updateNavLinks) {
        updateNavLinks('newUpdates');
    }
    
    const container = document.getElementById('newUpdatesContent');
    if (!container) return;
    
    container.innerHTML = `
        <div class="content-header">
            <h1>🎯 New & Updates</h1>
            <p class="content-subtitle">Upcoming releases and latest updates</p>
        </div>
        <div id="newUpdatesGrid" class="content-sections"></div>
    `;
    
    const grid = document.getElementById('newUpdatesGrid');
    
    if (window.showLoading) showLoading(true, 'Loading updates...');
    
    try {
        const TMDB_API_KEY = 'be880dc5b7df8623008f6cc66c0c7396';
        const BASE_URL = 'https://api.themoviedb.org/3';
        
        // Fetch upcoming and now playing
        const [upcoming, nowPlaying, upcomingTV] = await Promise.all([
            fetch(`${BASE_URL}/movie/upcoming?api_key=${TMDB_API_KEY}&region=IN&page=1`).then(r => r.json()),
            fetch(`${BASE_URL}/movie/now_playing?api_key=${TMDB_API_KEY}&region=IN&page=1`).then(r => r.json()),
            fetch(`${BASE_URL}/tv/on_the_air?api_key=${TMDB_API_KEY}&page=1`).then(r => r.json())
        ]);
        
        // Render sections (without provider search - direct TMDB links)
        renderTMDBSection(grid, '🎯 Coming Soon', upcoming.results || [], 'movie', true);
        renderTMDBSection(grid, '🎬 Now in Theatres', nowPlaying.results || [], 'movie', true);
        renderTMDBSection(grid, '📺 On The Air (TV)', upcomingTV.results || [], 'tv', true);
        
        console.log('✅ New & Updates page loaded');
    } catch (error) {
        console.error('Failed to load new & updates:', error);
        grid.innerHTML = '<p style="color: var(--primary-color); text-align: center;">Failed to load updates</p>';
    } finally {
        if (window.showLoading) showLoading(false);
    }
}

// Render TMDB section for New & Updates (direct links, no provider search)
function renderTMDBSection(container, title, items, type, skipSearch = false) {
    if (!items || items.length === 0) return;
    
    const section = document.createElement('div');
    section.className = 'netflix-section';
    
    const header = document.createElement('div');
    header.className = 'netflix-section-header';
    header.innerHTML = `<h3 class="netflix-section-title">${title}</h3>`;
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
        const posterUrl = item.poster_path 
            ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
            : 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22300%22%3E%3Crect width=%22200%22 height=%22300%22 fill=%22%23333%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 fill=%22%23666%22 text-anchor=%22middle%22 dy=%22.3em%22%3ENo Image%3C/text%3E%3C/svg%3E';
        
        card.innerHTML = `
            <img src="${posterUrl}" alt="${itemTitle}" />
            <div class="netflix-card-overlay">
                <h4>${itemTitle}</h4>
                <div class="tmdb-card-info">
                    <span class="tmdb-rating">⭐ ${rating}</span>
                    ${yearText ? `<span class="tmdb-year">${yearText}</span>` : ''}
                </div>
            </div>
        `;
        
        card.addEventListener('click', () => {
            if (window.TMDBContentModule && skipSearch) {
                // Open TMDB page directly
                window.TMDBContentModule.showTMDBDetails(item, type, true);
            } else if (window.TMDBContentModule) {
                // Search providers
                window.TMDBContentModule.showTMDBDetails(item, type, false);
            }
        });
        
        row.appendChild(card);
    });
    
    scrollContainer.appendChild(row);
    section.appendChild(scrollContainer);
    container.appendChild(section);
}

// Make function globally accessible
window.loadNewUpdatesPage = loadNewUpdatesPage;
