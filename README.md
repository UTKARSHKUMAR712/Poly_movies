<img width="1919" height="1079" alt="Screenshot 2025-10-07 051951" src="https://github.com/user-attachments/assets/d191a49a-46a3-47fc-abaf-7993cb06ef2a" /># PolyMovies Desktop

PolyMovies Desktop is a hybrid Electron application that packages the Vega providers ecosystem together with a local Express API and Chromium front-end. It delivers a self-contained streaming content explorer for Windows without requiring a system-wide Node.js installation.
![Uploading Screenshot 2025-10-07 <img width="1869" height="1079" alt="Screenshot 2025-10-07 052031" src="https://github.com/user-attachments/assets/61731376-8c35-4199-98c7-fafeba8cabcf" />

<img width="1919" height="1079" alt="Screenshot 2025-10-07 052018" src="https://github.com/user-attachments/assets/df4aba8b-39f7-4471-86ec-30dca8331d5f" />

<img width="1919" height="1079" alt="Screenshot 2025-10-07 052129" src="https://github.com/user-attachments/assets/9e78b5f5-9d0d-4739-a183-ed6bb7b854d4" />
<img width="1861" height="997" alt="Screenshot 2025-10-07 052102" src="https://github.com/user-attachments/assets/7721c010-1a6b-4508-8980-468da1fc0162" />

## Features

### 🎬 Core Streaming Features
- **Electron Shell** — `electron/main.js` boots the Express server from `dev-server.js`, waits for `/health`, maximizes the window with a standard title bar, hides the menu bar when entering fullscreen, and restores it afterward.
- **Provider Engine** — `providers/` supplies source integrations compiled by `build-simple.js` into `dist/`. The `manifest.json` and provider modules expose catalogs, posts, metadata, episodes, and stream functions.
- **Local API** — `dev-server.js` serves REST endpoints such as `/api/:provider/catalog`, `/posts`, `/search`, `/meta`, `/episodes`, and `/stream`. It also forwards extraction helpers via `/api/proxy/...` routes.
- **Player Experience** — `loadPlayer()` and `playStream()` handle auto-play, HLS (via `hls.js`), custom headers, fallback extraction, subtitle tracks, MKV download prompts, and watch-progress tracking with `HistoryModule`.

### 📺 Live TV & Cricket Streaming
- **Live TV Module** — `public/livetv.js` provides optimized streaming for 13,000+ channels with virtual scrolling, GitHub playlist integration, and horizontal category navigation.
- **Cricket Live Streaming** — `public/cricket-live.js` offers dedicated cricket streaming with:
  - Dynamic channel loading from API endpoints
  - Dropdown menu with scroll-to-load more channels functionality
  - Real-time cricket match data integration
  - Full-screen cricket player with HLS.js support
  - Channel switching with quality indicators and Dolby Atmos detection
  - Auto-loading channels on scroll with pagination (20 channels per page)

### 🔍 Content Discovery
- **Home Dashboard** — `public/app.js` orchestrates navigation between views (`home`, `movies`, `tvshows`, `explore`, `history`, `bollywood`, etc.), renders provider catalogs, and auto-mixes TMDB content (`TMDBContentModule.renderAllSections()`), watch history resumes, and provider-specific sections.
- **Universal Search** — `performSearch()` fans out queries across every provider and merges results, while `loadFullCatalog()` paginates provider-specific filters.
- **Genre & Explore Browsing** — `ExploreModule`, `GenreBrowserModule`, and `loadFullCatalog()` aggregate genres, shuffle multi-provider content, and expose TMDB-backed discovery pages (including pagination and load-more).

### 📚 Content Collections
- **Watch History & Continue Watching** — `public/history.js` persists viewing data in `localStorage`, surfaces continue-watching rows, modals, and allows clearing/removing entries.
- **Special Collections** — `bollywood.js` renders Bollywood and Indian content with TMDB filters and tabbed movies/TV, `new-updates.js` shows upcoming/now-playing items, and `movies.js`/`tvshows.js` aggregate titles across all providers with load-more flows.
- **TMDB Content** — `TMDBContentModule` orchestrates TMDB-backed discovery pages, including pagination and load-more.
- **Popular Bollywood Stars** — `popular-stars.js` highlights Bollywood stars and TMDB popular actors.
- **Top Bollywood Stars** — `top-stars.js` highlights Bollywood stars and TMDB popular actors.

### ⬇️ Advanced Download System
- **Download Manager** — Enhanced download system with real-time progress tracking:
  - **Real-time Progress**: Live percentage, speed (MB/s, KB/s), and ETA display
  - **Smart Filenames**: Auto-generated names with quality, server, and date info
  - **Multiple Downloads**: Support for concurrent downloads with queue management
  - **Progress Panel**: Collapsible download panel with live status updates
  - **Download Controls**: Pause, resume, cancel, and retry functionality
  - **Download History**: Persistent history with localStorage integration
  - **Notifications**: Toast notifications for download events
  - **Electron Integration**: Native download API with system integration
  - **Fallback Support**: Browser-based downloads when Electron unavailable
  - **Auto-cleanup**: Automatic removal of completed downloads after timeout

### 🎮 External Player Integration
- **Multi-Platform Player Support** — Enhanced external player integration:
  - **Desktop**: VLC, PotPlayer, MPV, MPC-HC, Windows Media Player
  - **Android**: VLC for Android, MX Player, MPV for Android, BSPlayer
  - **iOS**: VLC for iOS, Infuse 7, PlayerXtreme
  - Automatic player detection and fallback systems
  - Custom protocol handling for seamless streaming
  - Enhanced mobile player support with multiple launch methods

### 🎨 User Interface
- **Responsive UI Theme** — `public/styles.css` provides sticky navigation, reduced margins, thin scrollbars, Netflix-style sections, modals, genre cards, and detailed view layouts. Global spacing updates keep the logo/back button separation consistent across views.
- **Enhanced Cricket UI** — Horizontal scrollable channel selector with auto-loading, channel groups, and quality indicators.
- **Assets & Branding** — `icons/cropped_circle_image (1).ico` serves as the Windows icon, while `public/assets/` adds genre imagery used by `GenreBrowserModule.getGenreImage()`.

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Installation

```bash
npm install
```

### Build the provider bundle

```bash
npm run build
```

This compiles TypeScript providers, organizes outputs under `dist/`, and minifies JavaScript.

### Run the Express API (optional)

```bash
npm run dev
```

Launches the standalone development server at `http://localhost:3001` for browser testing.

## Electron Development Workflow

```bash
npm run electron:dev
```

- Executes `npm run build` to refresh providers.
- Starts the Express server inside Electron.
- Opens the PolyMovies desktop app in a maximized window with standard title bar controls.

## Packaging for Distribution

Portable executable:

```bash
npm run electron:build:portable
```

NSIS installer:

```bash
npm run electron:build:installer
```

Outputs are written to the `release/` directory. Both formats embed Chromium and Node.js, so end users only need the generated `.exe`.

## Project Structure

```
public/            # Front-end assets (HTML/CSS/JS)
├── app.js         # Main application logic and navigation
├── download-manager.js  # Enhanced download system with progress tracking
├── cricket-live.js      # Cricket streaming with dynamic channel loading
├── livetv.js           # Live TV module with 13,000+ channels
├── history.js          # Watch history and continue watching
├── styles.css          # Enhanced UI with download panel styles
└── index.html          # Main HTML with all module imports

providers/         # Provider source folders (TypeScript)
dist/              # Compiled provider outputs (generated)
electron/          # Electron entry point and preload scripts
├── main.js        # Enhanced with download and external player handlers
└── preload.js     # IPC bridge with download API exposure

icons/             # Application icons
build-simple.js    # Provider build pipeline
dev-server.js      # Express server powering the API
package.json       # Scripts, dependencies, electron-builder config
```

## Technical Features

### Download System Architecture
- **Frontend**: `download-manager.js` handles UI, progress tracking, and browser downloads
- **Backend**: Electron main process manages native downloads with progress events
- **IPC Communication**: Secure bridge between renderer and main process
- **Progress Calculation**: Real-time speed, ETA, and percentage calculations
- **Storage**: localStorage for download history and preferences

### Cricket Streaming System
- **Dynamic Loading**: API-based channel fetching with pagination
- **Virtual Scrolling**: Efficient rendering of large channel lists
- **Auto-loading**: Scroll-triggered channel loading for seamless browsing
- **HLS Integration**: Advanced streaming with hls.js and quality detection

### External Player Integration
- **Multi-platform**: Support for VLC, PotPlayer, MPV across Windows, Android, iOS
- **Protocol Handling**: Custom URL schemes and intent-based launching
- **Fallback Systems**: Multiple launch methods with automatic retry logic
- **Enhanced Mobile**: Improved Android/iOS app integration with better compatibility

## Usage Guide

### Download System
1. **Stream Downloads**: Click the download button (⬇️) on any stream option
2. **Manual Downloads**: Use File → Download Stream from the menu
3. **Progress Tracking**: Monitor downloads in the bottom-right panel
4. **Download Controls**: Pause, resume, or cancel downloads as needed
5. **History**: View completed downloads in the download history

### Cricket Streaming
1. **Access**: Click "📺 Live TV" → Cricket section appears at top
2. **Channel Selection**: Click "📺 Watch Live" to open channel selector
3. **Browse Channels**: Scroll down to auto-load more channels (20 per page)
4. **Switch Channels**: Use the dropdown menu to switch between cricket channels
5. **Full Screen**: Press F key or click fullscreen button for immersive viewing

### External Players
1. **Desktop**: Click "📺 External" → Choose VLC, PotPlayer, or MPV
2. **Mobile**: Automatic detection of installed players (VLC, MX Player, etc.)
3. **Manual**: Copy stream URL and paste in your preferred player
4. **Troubleshooting**: Try different players if one doesn't work

### Testing Downloads (Developer)
```javascript
// Test the download system
testDownloadSystem()

// Check download statistics
showDownloadStats()

// Start a custom download
DownloadManager.startDownload('https://example.com/video.mp4', 'my_video.mp4')
```

## Credits

- Built with provider modules from [`Zenda-Cross/vega-providers`](https://github.com/Zenda-Cross/vega-providers.git)
- Special thanks to [Zenda-Cross](https://github.com/Zenda-Cross) for the provider ecosystem
- Cricket API integration for live match data
- Enhanced download system with Electron integration

