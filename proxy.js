// Cricket API Proxy Server
const express = require("express");
const cors = require("cors");
const axios = require("axios");

class CricketProxy {
    constructor(port = 5051) {
        this.app = express();
        this.port = port;
        this.setupMiddleware();
        this.setupRoutes();
    }

    setupMiddleware() {
        // Enable CORS
        this.app.use(cors({
            origin: "*",
            methods: ["GET", "POST", "OPTIONS"],
            allowedHeaders: ["Content-Type", "Authorization"],
        }));

        // JSON parsing
        this.app.use(express.json());

        // Logging
        this.app.use((req, res, next) => {
            console.log(`${new Date().toISOString()} - Cricket Proxy: ${req.method} ${req.url}`);
            next();
        });
    }

    setupRoutes() {
        // Health check
        this.app.get("/health", (req, res) => {
            res.json({ 
                status: "healthy", 
                service: "cricket-proxy",
                timestamp: new Date().toISOString() 
            });
        });

        // Cricket test endpoint
        this.app.get("/test", (req, res) => {
            console.log('🏏 Cricket proxy test endpoint hit');
            res.json({ 
                status: "Cricket Proxy is working", 
                timestamp: new Date().toISOString(),
                port: this.port,
                endpoints: ["/health", "/test", "/matches"]
            });
        });

        // Main cricket matches endpoint
        this.app.get("/matches", async (req, res) => {
            try {
                console.log('🏏 Fetching cricket matches from Cricbuzz...');
                
                const response = await axios.get("https://www.cricbuzz.com/api/home", {
                    headers: { 
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                        "Accept": "application/json, text/plain, */*",
                        "Accept-Language": "en-US,en;q=0.9",
                        "Cache-Control": "no-cache",
                        "Referer": "https://www.cricbuzz.com/",
                        "Origin": "https://www.cricbuzz.com"
                    },
                    timeout: 15000
                });

                console.log('🏏 Cricket data fetched successfully');
                
                // Set CORS headers
                res.set('Access-Control-Allow-Origin', '*');
                res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
                res.set('Access-Control-Allow-Headers', 'Content-Type');
                
                res.json(response.data);
                
            } catch (error) {
                console.error('🏏 Cricket API error:', error.message);
                
                res.status(500).json({
                    error: "Failed to fetch cricket data",
                    details: error.message,
                    fallback: {
                        matches: [],
                        message: "Cricket data temporarily unavailable"
                    }
                });
            }
        });

        // Cricbuzz direct proxy (alternative endpoint)
        this.app.get("/cricbuzz", async (req, res) => {
            try {
                const response = await axios.get("https://www.cricbuzz.com/api/home", {
                    headers: { "User-Agent": "Mozilla/5.0" },
                    timeout: 10000
                });
                
                res.set('Access-Control-Allow-Origin', '*');
                res.json(response.data);
                
            } catch (error) {
                res.status(500).json({
                    error: "Failed",
                    details: error.toString()
                });
            }
        });

        // 404 handler
        this.app.use((req, res) => {
            res.status(404).json({
                error: "Cricket Proxy - Endpoint not found",
                availableEndpoints: [
                    "GET /health",
                    "GET /test", 
                    "GET /matches",
                    "GET /cricbuzz"
                ],
                requestedPath: req.path
            });
        });
    }

    async start() {
        return new Promise((resolve, reject) => {
            const server = this.app.listen(this.port, (error) => {
                if (error) {
                    reject(error);
                    return;
                }
                
                console.log(`
🏏 Cricket Proxy Server Started!
📡 Port: ${this.port}
🌐 Health: http://localhost:${this.port}/health
🧪 Test: http://localhost:${this.port}/test
🏏 Matches: http://localhost:${this.port}/matches
                `);
                
                resolve(server);
            });
        });
    }
}

// Auto-start if run directly
if (require.main === module) {
    const proxy = new CricketProxy();
    proxy.start().catch(console.error);
}

module.exports = { CricketProxy };