const API_BASE_URL = window.location.origin;

// Utility Functions
function closeStickyAd() {
    const stickyAd = document.getElementById('stickyAd');
    if (stickyAd) {
        stickyAd.classList.add('hidden');
        setTimeout(() => {
            stickyAd.classList.remove('hidden');
        }, 300000); // Show again after 5 minutes
    }
}

// Format file size
function formatSize(bytes) {
    if (!bytes) return 'N/A';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const sizeStr = bytes.toString();
    if (sizeStr.includes('GB') || sizeStr.includes('MB')) return sizeStr;
    return bytes;
}

// Create Movie Card
function createMovieCard(movie) {
    return `
        <div class="movie-card" onclick="window.location.href='/movie/${movie.id}'">
            <div class="movie-poster">
                <img src="${movie.poster}" alt="${movie.title}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x450/1f1f1f/e50914?text=No+Image'">
                <span class="movie-quality">${movie.quality || 'HD'}</span>
            </div>
            <div class="movie-info">
                <h3 class="movie-title">${movie.title}</h3>
                <div class="movie-meta">
                    <span class="movie-category">${movie.category || 'Movie'}</span>
                    <span class="movie-size">${formatSize(movie.size)}</span>
                </div>
            </div>
        </div>
    `;
}

// Load Movies on Homepage
async function loadMovies(category = 'all') {
    const grid = document.getElementById('moviesGrid');
    if (!grid) return;

    grid.innerHTML = '<div class="loading">Loading movies...</div>';

    try {
        const response = await fetch(`${API_BASE_URL}/api/movies`);
        const result = await response.json();

        if (result.success && result.data) {
            let movies = result.data;
            
            if (category !== 'all') {
                movies = movies.filter(m => m.category === category);
            }

            if (movies.length === 0) {
                grid.innerHTML = '<div class="error">No movies found</div>';
                return;
            }

            grid.innerHTML = movies.map(movie => createMovieCard(movie)).join('');
        } else {
            grid.innerHTML = '<div class="error">Failed to load movies</div>';
        }
    } catch (error) {
        console.error('Error loading movies:', error);
        grid.innerHTML = '<div class="error">Error loading movies</div>';
    }
}

// Load Movie Details
async function loadMovieDetail() {
    const container = document.getElementById('movieDetail');
    if (!container) return;

    const movieId = window.location.pathname.split('/').pop();
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/movie/${movieId}`);
        const result = await response.json();

        if (result.success && result.data) {
            const movie = result.data;
            container.innerHTML = createMovieDetailHTML(movie);
            setupMovieButtons(movie);
        } else {
            container.innerHTML = '<div class="error">Movie not found</div>';
        }
    } catch (error) {
        console.error('Error loading movie:', error);
        container.innerHTML = '<div class="error">Error loading movie</div>';
    }
}

// Create Movie Detail HTML
function createMovieDetailHTML(movie) {
    return `
        <div class="movie-detail">
            <div class="movie-backdrop">
                <img src="${movie.poster}" alt="${movie.title}" onerror="this.src='https://via.placeholder.com/1280x720/1f1f1f/e50914?text=No+Image'">
            </div>
            
            <div class="movie-detail-content">
                <h1 class="movie-detail-title">${movie.title}</h1>
                
                <div class="movie-detail-meta">
                    <span>⭐ 8.5</span>
                    <span>${movie.quality || 'HD'}</span>
                    <span>${formatSize(movie.size)}</span>
                    <span>${movie.category || 'Movie'}</span>
                </div>
                
                <!-- Banner Ad -->
                <div class="ad-banner">
                    <div class="ad-placeholder">Advertisement</div>
                </div>
                
                <p class="movie-detail-description">${movie.description || 'No description available.'}</p>
                
                <!-- Native Ad -->
                <div class="native-ad">
                    <div class="ad-placeholder">Sponsored Content</div>
                </div>
                
                <div class="action-buttons">
                    <button class="btn btn-primary" onclick="showLinkModal('watch', '${movie.id}')">▶ Watch Now</button>
                    <button class="btn btn-secondary" onclick="showLinkModal('download', '${movie.id}')">⬇ Download</button>
                </div>
            </div>
        </div>
    `;
}

// Setup Movie Buttons
function setupMovieButtons(movie) {
    window.movieData = movie;
}

// Show Link Modal
function showLinkModal(type, movieId) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'linkModal';
    
    modal.innerHTML = `
        <div class="modal-content">
            <h3 class="modal-title">Get Your Link</h3>
            <p class="modal-message">Your link is being prepared...</p>
            <button class="btn-fake" onclick="handleFakeLink()">Get Link</button>
            <div id="realLinkSection" class="hidden">
                <div class="countdown" id="countdown">5</div>
                <p class="modal-message">Redirecting to ${type === 'watch' ? 'Watch' : 'Download'}...</p>
                <a href="#" id="realLink" class="btn-real hidden" target="_blank">Proceed to ${type === 'watch' ? 'Watch' : 'Download'}</a>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Store movie data for later use
    modal.dataset.movieId = movieId;
    modal.dataset.linkType = type;
}

// Handle Fake Link Button
function handleFakeLink() {
    const modal = document.getElementById('linkModal');
    const fakeBtn = modal.querySelector('.btn-fake');
    const realSection = modal.querySelector('#realLinkSection');
    
    fakeBtn.classList.add('hidden');
    realSection.classList.remove('hidden');
    
    let countdown = 5;
    const countdownEl = document.getElementById('countdown');
    
    const timer = setInterval(() => {
        countdown--;
        countdownEl.textContent = countdown;
        
        if (countdown === 0) {
            clearInterval(timer);
            showRealLink();
        }
    }, 1000);
}

// Show Real Link
async function showRealLink() {
    const modal = document.getElementById('linkModal');
    const movieId = modal.dataset.movieId;
    const linkType = modal.dataset.linkType;
    const realLink = document.getElementById('realLink');
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/movie/${movieId}`);
        const result = await response.json();
        
        if (result.success && result.data) {
            const movie = result.data;
            realLink.href = movie.link;
            realLink.classList.remove('hidden');
            
            // Auto click after showing
            setTimeout(() => {
                window.open(movie.link, '_blank');
                modal.remove();
            }, 1000);
        }
    } catch (error) {
        console.error('Error fetching movie link:', error);
    }
}

// Category Filter
function setupCategoryFilters() {
    const categoryBtns = document.querySelectorAll('.category-btn');
    
    categoryBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            categoryBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const category = btn.dataset.category;
            loadMovies(category);
        });
    });
}

// Initialize based on page
document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on homepage
    if (document.getElementById('moviesGrid')) {
        loadMovies();
        setupCategoryFilters();
    }
    
    // Check if we're on movie detail page
    if (document.getElementById('movieDetail')) {
        loadMovieDetail();
    }
    
    // Close modal on outside click
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.remove();
        }
    });
});

// Export functions for global use
window.closeStickyAd = closeStickyAd;
window.showLinkModal = showLinkModal;
window.handleFakeLink = handleFakeLink;
