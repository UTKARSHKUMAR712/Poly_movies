<img width="1919" height="1079" alt="Screenshot 2025-10-07 051951" src="https://github.com/user-attachments/assets/d191a49a-46a3-47fc-abaf-7993cb06ef2a" /># PolyMovies Desktop

PolyMovies Desktop is a hybrid Electron application that packages the Vega providers ecosystem together with a local Express API and Chromium front-end. It delivers a self-contained streaming content explorer for Windows without requiring a system-wide Node.js installation..
![Uploading Screenshot 2025-10-07 <img width="1869" height="1079" alt="Screenshot 2025-10-07 052031" src="https://github.com/user-attachments/assets/61731376-8c35-4199-98c7-fafeba8cabcf" />

<img width="1919" height="1079" alt="Screenshot 2025-10-07 052018" src="https://github.com/user-attachments/assets/df4aba8b-39f7-4471-86ec-30dca8331d5f" />

<img width="1919" height="1079" alt="Screenshot 2025-10-07 052129" src="https://github.com/user-attachments/assets/9e78b5f5-9d0d-4739-a183-ed6bb7b854d4" />
<img width="1861" height="997" alt="Screenshot 2025-10-07 052102" src="https://github.com/user-attachments/assets/7721c010-1a6b-4508-8980-468da1fc0162" />

## Features

- **Electron Shell** — `electron/main.js` boots the Express server from `dev-server.js`, waits for `/health`, maximizes the window with a standard title bar, hides the menu bar when entering fullscreen, and restores it afterward.
- **Provider Engine** — `providers/` supplies source integrations compiled by `build-simple.js` into `dist/`. The `manifest.json` and provider modules expose catalogs, posts, metadata, episodes, and stream functions.
- **Local API** — `dev-server.js` serves REST endpoints such as `/api/:provider/catalog`, `/posts`, `/search`, `/meta`, `/episodes`, and `/stream`. It also forwards extraction helpers via `/api/proxy/...` routes.
- **Home Dashboard** — `public/app.js` orchestrates navigation between views (`home`, `movies`, `tvshows`, `explore`, `history`, `bollywood`, etc.), renders provider catalogs, and auto-mixes TMDB content (`TMDBContentModule.renderAllSections()`), watch history resumes, and provider-specific sections.
- **Universal Search** — `performSearch()` fans out queries across every provider and merges results, while `loadFullCatalog()` paginates provider-specific filters.
- **Player Experience** — `loadPlayer()` and `playStream()` handle auto-play, HLS (via `hls.js`), custom headers, fallback extraction, subtitle tracks, MKV download prompts, and watch-progress tracking with `HistoryModule`.
- **Watch History & Continue Watching** — `public/history.js` persists viewing data in `localStorage`, surfaces continue-watching rows, modals, and allows clearing/removing entries.
- **Genre & Explore Browsing** — `ExploreModule`, `GenreBrowserModule`, and `loadFullCatalog()` aggregate genres, shuffle multi-provider content, and expose TMDB-backed discovery pages (including pagination and load-more). `top-stars.js` and `popular-stars.js` highlight Bollywood stars and TMDB popular actors.
- **Special Collections** — `bollywood.js` renders Bollywood and Indian content with TMDB filters and tabbed movies/TV, `new-updates.js` shows upcoming/now-playing items, and `movies.js`/`tvshows.js` aggregate titles across all providers with load-more flows.
- **TMDB Content** — `TMDBContentModule` orchestrates TMDB-backed discovery pages, including pagination and load-more.
- **Bollywood Content** — `bollywood.js` renders Bollywood and Indian content with TMDB filters and tabbed movies/TV, `new-updates.js` shows upcoming/now-playing items, and `movies.js`/`tvshows.js` aggregate titles across all providers with load-more flows.
- **Popular Bollywood Stars** — `popular-stars.js` highlights Bollywood stars and TMDB popular actors.
- **Top Bollywood Stars** — `top-stars.js` highlights Bollywood stars and TMDB popular actors.

- **Responsive UI Theme** — `public/styles.css` provides sticky navigation, reduced margins, thin scrollbars, Netflix-style sections, modals, genre cards, and detailed view layouts. Global spacing updates keep the logo/back button separation consistent across views.
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
providers/         # Provider source folders (TypeScript)
dist/              # Compiled provider outputs (generated)
electron/          # Electron entry point and preload scripts
icons/             # Application icons
build-simple.js    # Provider build pipeline
dev-server.js      # Express server powering the API
package.json       # Scripts, dependencies, electron-builder config
```

## Credits

- Built with  provider modules from [`Zenda-Cross/vega-providers`](https://github.com/Zenda-Cross/vega-providers.git)
- Special thanks to [Zenda-Cross](https://github.com/Zenda-Cross) for the provider

