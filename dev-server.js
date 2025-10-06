const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");
const os = require("os");
const axios = require("axios");
const cheerio = require("cheerio");
const { getBaseUrl } = require("./dist/getBaseUrl.js");
const { hubcloudExtracter } = require("./dist/hubcloudExtractor.js");
const { superVideoExtractor } = require("./dist/superVideoExtractor.js");
const { gdFlixExtracter } = require("./dist/gdflixExtractor.js");

/**
 * Local development server for testing providers
 */
class DevServer {
  constructor({ port = 3001, host = "0.0.0.0" } = {}) {
    this.app = express();
    this.port = port;
    this.host = host;
    this.distDir = path.join(__dirname, "dist");
    this.currentDir = path.join(__dirname);
    this.rootDir = this.currentDir;
    this.publicDir = path.join(__dirname, "public");
    this.server = null;

    // Provider context for executing provider functions
    this.providerContext = {
      axios,
      cheerio,
      getBaseUrl,
      commonHeaders: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      extractors: {
        hubcloudExtracter,
        superVideoExtractor,
        gdFlixExtracter,
      },
      Aes: {},
    };

    this.setupMiddleware();
    this.setupRoutes();
    this.setupApiRoutes();
  }

  setupMiddleware() {
    // Enable CORS for mobile app
    this.app.use(
      cors({
        origin: "*",
        methods: ["GET", "POST", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
      })
    );

    // Serve static files from dist directory
    this.app.use("/dist", express.static(this.distDir));

    // Serve static files from public directory (frontend)
    this.app.use(express.static(this.publicDir));

    // JSON parsing
    this.app.use(express.json());

    // Logging
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
      next();
    });
  }

  setupRoutes() {
    // Serve manifest.json
    this.app.get("/manifest.json", (req, res) => {
      const manifestPath = path.join(this.currentDir, "manifest.json");
      console.log(`Serving manifest from: ${manifestPath}`);

      if (fs.existsSync(manifestPath)) {
        res.sendFile(manifestPath);
      } else {
        res.status(404).json({ error: "Manifest not found. Run build first." });
      }
    });

    // Serve individual provider files
    this.app.get("/dist/:provider/:file", (req, res) => {
      const { provider, file } = req.params;
      const filePath = path.join(this.distDir, provider, file);

      if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
      } else {
        res.status(404).json({
          error: `File not found: ${provider}/${file}`,
          hint: "Make sure to run build first",
        });
      }
    });

    // Build endpoint - trigger rebuild
    this.app.post("/build", (req, res) => {
      try {
        console.log("🔨 Triggering rebuild...");
        execSync("node build.js", { stdio: "inherit" });
        res.json({ success: true, message: "Build completed" });
      } catch (error) {
        console.error("Build failed:", error);
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });

    // Status endpoint
    this.app.get("/status", (req, res) => {
      const providers = this.getAvailableProviders();
      res.json({
        status: "running",
        port: this.port,
        providers: providers.length,
        providerList: providers,
        buildTime: this.getBuildTime(),
      });
    });

    // List available providers
    this.app.get("/providers", (req, res) => {
      const providers = this.getAvailableProviders();
      res.json(providers);
    });

    // Health check
    this.app.get("/health", (req, res) => {
      res.json({ status: "healthy", timestamp: new Date().toISOString() });
    });
  }

  setupApiRoutes() {
    // Get all providers from manifest
    this.app.get("/api/providers", (req, res) => {
      try {
        const manifestPath = path.join(this.currentDir, "manifest.json");
        if (!fs.existsSync(manifestPath)) {
          return res.status(404).json({ error: "Manifest not found" });
        }
        const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
        const enabledProviders = manifest.filter((p) => !p.disabled);
        res.json(enabledProviders);
      } catch (error) {
        console.error("Error reading manifest:", error);
        res.status(500).json({ error: error.message });
      }
    });

    // Get catalog for a provider
    this.app.get("/api/:provider/catalog", (req, res) => {
      try {
        const { provider } = req.params;
        const catalogPath = path.join(this.distDir, provider, "catalog.js");

        if (!fs.existsSync(catalogPath)) {
          return res.status(404).json({ error: "Catalog not found" });
        }

        // Clear cache to get fresh data
        delete require.cache[require.resolve(catalogPath)];
        const catalogModule = require(catalogPath);

        res.json({
          catalog: catalogModule.catalog || [],
          genres: catalogModule.genres || [],
        });
      } catch (error) {
        console.error(`Error loading catalog for ${req.params.provider}:`, error);
        res.status(500).json({ error: error.message });
      }
    });

    // Get posts for a provider
    this.app.get("/api/:provider/posts", async (req, res) => {
      try {
        const { provider } = req.params;
        const { filter = "", page = "1" } = req.query;
        const postsPath = path.join(this.distDir, provider, "posts.js");

        if (!fs.existsSync(postsPath)) {
          return res.status(404).json({ error: "Posts module not found" });
        }

        delete require.cache[require.resolve(postsPath)];
        const postsModule = require(postsPath);

        if (!postsModule.getPosts) {
          return res.status(404).json({ error: "getPosts function not found" });
        }

        const result = await postsModule.getPosts({
          filter,
          page: parseInt(page),
          providerValue: provider,
          signal: new AbortController().signal,
          providerContext: this.providerContext,
        });

        res.json(result);
      } catch (error) {
        console.error(`Error getting posts for ${req.params.provider}:`, error);
        res.status(500).json({ error: error.message });
      }
    });

    // Search posts for a provider
    this.app.get("/api/:provider/search", async (req, res) => {
      try {
        const { provider } = req.params;
        const { query = "", page = "1" } = req.query;
        const postsPath = path.join(this.distDir, provider, "posts.js");

        if (!fs.existsSync(postsPath)) {
          return res.status(404).json({ error: "Posts module not found" });
        }

        delete require.cache[require.resolve(postsPath)];
        const postsModule = require(postsPath);

        if (!postsModule.getSearchPosts) {
          return res.status(404).json({ error: "getSearchPosts function not found" });
        }

        const result = await postsModule.getSearchPosts({
          searchQuery: query,
          page: parseInt(page),
          providerValue: provider,
          signal: new AbortController().signal,
          providerContext: this.providerContext,
        });

        res.json(result);
      } catch (error) {
        console.error(`Error searching for ${req.params.provider}:`, error);
        res.status(500).json({ error: error.message });
      }
    });

    // Get metadata for an item
    this.app.get("/api/:provider/meta", async (req, res) => {
      try {
        const { provider } = req.params;
        const { link } = req.query;

        if (!link) {
          return res.status(400).json({ error: "Link parameter is required" });
        }

        const metaPath = path.join(this.distDir, provider, "meta.js");

        if (!fs.existsSync(metaPath)) {
          return res.status(404).json({ error: "Meta module not found" });
        }

        delete require.cache[require.resolve(metaPath)];
        const metaModule = require(metaPath);

        if (!metaModule.getMeta) {
          return res.status(404).json({ error: "getMeta function not found" });
        }

        const result = await metaModule.getMeta({
          link,
          providerContext: this.providerContext,
        });

        res.json(result);
      } catch (error) {
        console.error(`Error getting meta for ${req.params.provider}:`, error);
        res.status(500).json({ error: error.message });
      }
    });

    // Get episodes for a season/series
    this.app.get("/api/:provider/episodes", async (req, res) => {
      try {
        const { provider } = req.params;
        const { url } = req.query;

        if (!url) {
          return res.status(400).json({ error: "URL parameter is required" });
        }

        const episodesPath = path.join(this.distDir, provider, "episodes.js");

        if (!fs.existsSync(episodesPath)) {
          return res.status(404).json({ error: "Episodes module not found" });
        }

        delete require.cache[require.resolve(episodesPath)];
        const episodesModule = require(episodesPath);

        if (!episodesModule.getEpisodes) {
          return res.status(404).json({ error: "getEpisodes function not found" });
        }

        const result = await episodesModule.getEpisodes({
          url,
          providerContext: this.providerContext,
        });

        res.json(result);
      } catch (error) {
        console.error(`Error getting episodes for ${req.params.provider}:`, error);
        res.status(500).json({ error: error.message });
      }
    });

    // Get stream links for an item
    this.app.get("/api/:provider/stream", async (req, res) => {
      try {
        const { provider } = req.params;
        const { link, type = "movie" } = req.query;

        if (!link) {
          return res.status(400).json({ error: "Link parameter is required" });
        }

        const streamPath = path.join(this.distDir, provider, "stream.js");

        if (!fs.existsSync(streamPath)) {
          return res.status(404).json({ error: "Stream module not found" });
        }

        delete require.cache[require.resolve(streamPath)];
        const streamModule = require(streamPath);

        if (!streamModule.getStream) {
          return res.status(404).json({ error: "getStream function not found" });
        }

        console.log(`🎬 Calling getStream for ${provider} with link: ${link.substring(0, 80)}`);
        const result = await streamModule.getStream({
          link,
          type,
          signal: new AbortController().signal,
          providerContext: this.providerContext,
        });

        console.log(`✅ getStream returned ${result.length} streams for ${provider}`);
        if (result.length === 0) {
          console.warn(`⚠️ No streams returned for ${provider}. Link: ${link.substring(0, 80)}`);
        }

        // Process and validate streams
        const processedStreams = await Promise.all(result.map(async stream => {
          // Check if it's a Gofile direct download link that might be expired/limited
          const isGofileDirectDownload = stream.link.match(/file[\w-]*\.gofile\.io\/download\//);
          
          // Check if it's a Gofile page URL that needs extraction
          const isGofilePageUrl = stream.link.includes('gofile.io/d/');
          
          // Check if it's other page URLs that need extraction
          const needsExtraction = stream.link.includes('drive.google.com/file') ||
            stream.link.includes('hubcloud.cc') ||
            stream.link.match(/nexdrive\.pro\/[a-z0-9]+\/?$/);
          
          // Gofile streams removed - provider no longer supported
          
          // Handle other extraction needs
          if (needsExtraction) {
            return {
              ...stream,
              requiresExtraction: true,
              extractionService: this.getExtractionService(stream.link)
            };
          }
          
          return stream;
        }));

        res.json(processedStreams);
      } catch (error) {
        console.error(`Error getting stream for ${req.params.provider}:`, error);
        res.status(500).json({ error: error.message });
      }
    });

    // Stream proxy endpoint for CORS and extraction
    this.app.get("/api/proxy/stream", async (req, res) => {
      try {
        const { url } = req.query;
        
        if (!url) {
          return res.status(400).json({ error: "URL parameter is required" });
        }

        const decodedUrl = decodeURIComponent(url);
        console.log(`Proxying stream from: ${decodedUrl}`);

        // Extract direct link if it's a file hosting service
        let finalUrl = decodedUrl;

        if (decodedUrl.includes('nexdrive')) {
          finalUrl = await this.extractNexdriveLink(decodedUrl);
        }

        if (!finalUrl) {
          return res.status(404).json({ error: "Could not extract stream URL" });
        }

        // Return the extracted URL for client to play
        res.json({ streamUrl: finalUrl });
      } catch (error) {
        console.error('Stream proxy error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Video proxy endpoint - handles streams with custom headers
    this.app.get("/api/proxy/video", async (req, res) => {
      try {
        const { url, headers: customHeaders } = req.query;
        
        if (!url) {
          return res.status(400).json({ error: "URL parameter is required" });
        }

        const decodedUrl = decodeURIComponent(url);
        console.log(`Video proxy request: ${decodedUrl.substring(0, 80)}...`);

        // Parse custom headers if provided
        let streamHeaders = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        };
        
        if (customHeaders) {
          try {
            const parsed = JSON.parse(decodeURIComponent(customHeaders));
            streamHeaders = { ...streamHeaders, ...parsed };
          } catch (e) {
            console.warn('Failed to parse custom headers:', e);
          }
        }

        console.log('Fetching with headers:', Object.keys(streamHeaders));

        // Fetch the stream
        const response = await axios({
          method: 'GET',
          url: decodedUrl,
          headers: streamHeaders,
          responseType: 'stream',
          timeout: 30000
        });

        // Set appropriate response headers
        res.set({
          'Content-Type': response.headers['content-type'] || 'video/mp4',
          'Content-Length': response.headers['content-length'],
          'Accept-Ranges': 'bytes',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Range'
        });

        // Pipe the video stream to response
        response.data.pipe(res);

        response.data.on('error', (error) => {
          console.error('Stream error:', error);
          if (!res.headersSent) {
            res.status(500).json({ error: 'Stream error' });
          }
        });

      } catch (error) {
        console.error('Video proxy error:', error);
        if (!res.headersSent) {
          res.status(500).json({ error: error.message });
        }
      }
    });

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        error: "Not found",
        availableEndpoints: [
          "GET /manifest.json",
          "GET /dist/:provider/:file",
          "POST /build",
          "GET /status",
          "GET /providers",
          "GET /health",
          "GET /api/providers",
          "GET /api/:provider/catalog",
          "GET /api/:provider/posts?filter=&page=",
          "GET /api/:provider/search?query=&page=",
          "GET /api/:provider/meta?link=",
          "GET /api/:provider/episodes?url=",
          "GET /api/:provider/stream?link=&type=",
        ],
      });
    });
  }

  getAvailableProviders() {
    if (!fs.existsSync(this.distDir)) {
      return [];
    }

    return fs
      .readdirSync(this.distDir, { withFileTypes: true })
      .filter((item) => item.isDirectory())
      .map((item) => item.name);
  }

  getExtractionService(url) {
    if (url.includes('nexdrive')) return 'nexdrive';
    if (url.includes('hubcloud')) return 'hubcloud';
    if (url.includes('drive.google.com')) return 'gdrive';
    return null;
  }

  async extractNexdriveLink(url) {
    try {
      console.log('Extracting nexdrive/supervideo link:', url);
      
      // Nexdrive usually returns direct links or uses superVideoExtractor
      const result = await this.providerContext.extractors.superVideoExtractor(url);
      console.log('Nexdrive extraction result:', result);
      
      if (result && typeof result === 'object' && result.link) {
        return result.link;
      } else if (typeof result === 'string') {
        return result;
      }
      
      return null;
    } catch (error) {
      console.error('Nexdrive extraction error:', error);
      return null;
    }
  }

  getBuildTime() {
    const manifestPath = path.join(this.rootDir, "manifest.json");
    if (fs.existsSync(manifestPath)) {
      const stats = fs.statSync(manifestPath);
      return stats.mtime.toISOString();
    }
    return null;
  }

  async start() {
    // Get local IP address
    const interfaces = os.networkInterfaces();
    let localIp = "localhost";
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === "IPv4" && !iface.internal) {
          localIp = iface.address;
          break;
        }
      }
      if (localIp !== "localhost") break;
    }
    return await new Promise((resolve, reject) => {
      const handleError = (error) => {
        if (error && error.code === "EADDRINUSE") {
          const conflictError = new Error(
            `Port ${this.port} is already in use. Please close other instances or choose a different port.`
          );
          conflictError.code = "EADDRINUSE";
          reject(conflictError);
        } else {
          reject(error);
        }
      };

      this.server = this.app.listen(this.port, this.host, () => {
        this.server?.off("error", handleError);
        console.log(`
🚀 Vega Providers Dev Server Started!

📡 Server URL: http://localhost:${this.port}
📱 Mobile Test URL: http://${localIp}:${this.port}
🌐 Web Player: http://localhost:${this.port} (Open in browser)

💡 Usage:
  1. Run 'npm run auto' to start the dev server ☑️
  2. Open http://localhost:${this.port} in your browser
  3. Browse and play content from providers!

📱 For Vega App:
  - Update vega app to use: http://${localIp}:${this.port}

🔄 Auto-rebuild: POST to /build to rebuild after changes
      `);

      // Check if build exists
        if (!fs.existsSync(this.distDir)) {
          console.log('\n⚠️  No build found. Run "node build.js" first!\n');
        }
        resolve(this.server);
      });

      this.server?.once("error", handleError);
    });
  }

  async stop() {
    if (!this.server) {
      return;
    }

    await new Promise((resolve, reject) => {
      this.server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
    this.server = null;
  }
}

async function startDevServer(port = 3001, host = "0.0.0.0") {
  const devServer = new DevServer({ port, host });
  await devServer.start();
  return devServer;
}

module.exports = {
  DevServer,
  startDevServer,
};

if (require.main === module) {
  startDevServer();
}
