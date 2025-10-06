# PolyMovies Desktop

PolyMovies Desktop is a hybrid Electron application that packages the Vega providers ecosystem together with a local Express API and Chromium front-end. It delivers a self-contained streaming content explorer for Windows without requiring a system-wide Node.js installation.

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

- Built with guidance and provider modules from [`Zenda-Cross/vega-providers`](https://github.com/Zenda-Cross/vega-providers.git)
- Special thanks to [Zenda-Cross](https://github.com/Zenda-Cross) for the original project and continuing inspiration

## License

Refer to the original project license or include your preferred license terms here.
