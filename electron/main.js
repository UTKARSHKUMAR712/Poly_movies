const path = require("path");
const fs = require("fs");
const http = require("http");
const { spawn } = require("child_process");
const { setTimeout: delay } = require("node:timers/promises");
const { app, BrowserWindow, Menu, ipcMain, shell } = require("electron");
const { startDevServer } = require("../dev-server");

const iconPath = path.join(__dirname, "..", "icons", "cropped_circle_image (1).ico");

let devServerInstance = null;
let mainWindow = null;
let isQuitting = false;

const singleInstanceLock = app.requestSingleInstanceLock();

if (!singleInstanceLock) {
  app.quit();
}

registerExternalPlayerHandler();
registerDownloadHandler();

app.on("second-instance", () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    if (!mainWindow.isVisible()) {
      mainWindow.show();
    }
    mainWindow.focus();
  }
});

async function createWindow() {
  const initialPort = Number(process.env.PORT) || 3001;
  const host = process.env.HOST || "127.0.0.1";

  app.setName("PolyMovies");
  configureMenu();

  try {
    devServerInstance = await startDevServer(initialPort, host);
  } catch (error) {
    if (error?.code === "EADDRINUSE") {
      const fallbackPort = initialPort + 1;
      console.warn(
        `Port ${initialPort} is busy. Retrying on port ${fallbackPort}...`
      );
      try {
        devServerInstance = await startDevServer(fallbackPort, host);
        process.env.PORT = String(fallbackPort);
      } catch (retryError) {
        console.error("Failed to start internal server on fallback port:", retryError);
        app.exit(1);
        return;
      }
    } else {
      console.error("Failed to start internal server:", error);
      app.exit(1);
      return;
    }
  }

  try {
    const activePort = Number(process.env.PORT) || initialPort;
    await waitForServer(host, activePort, "/health", 30, 1000);
  } catch (error) {
    console.error("Server did not become ready in time:", error);
    app.exit(1);
    return;
  }

  const activePort = Number(process.env.PORT) || initialPort;
  mainWindow = new BrowserWindow({
    show: false,
    backgroundColor: "#141414",
    title: "PolyMovies",
    icon: iconPath,
    webPreferences: {
      webSecurity: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  await mainWindow.loadURL(`http://${host}:${activePort}`);

  const showAndFocus = () => {
    if (!mainWindow) return;
    if (!mainWindow.isVisible()) {
      mainWindow.show();
    }
    if (!mainWindow.isMaximized()) {
      mainWindow.maximize();
    }
    mainWindow.focus();
  };

  mainWindow.once("ready-to-show", showAndFocus);
  mainWindow.webContents.on("did-finish-load", showAndFocus);

  global.setTimeout(() => {
    showAndFocus();
  }, 5000);

  mainWindow.on("enter-full-screen", () => {
    mainWindow?.setMenuBarVisibility(false);
  });

  mainWindow.on("leave-full-screen", () => {
    mainWindow?.setMenuBarVisibility(true);
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow).catch((error) => {
  console.error("Fatal error during app initialization:", error);
  app.exit(1);
});

function configureMenu() {
  const template = [
    {
      label: "View",
      submenu: [
        {
          role: "reload",
          label: "Refresh"
        },
        {
          role: "togglefullscreen",
          label: "Full Screen"
        },
        // {
        //   role: "toggledevtools",
        //   label: "Developer Tools"
        // },
        { type: "separator" },
        {
          role: "resetzoom",
          label: "Reset Zoom"
        },
        {
          role: "zoomIn",
          label: "Zoom In"
        },
        {
          role: "zoomOut",
          label: "Zoom Out"
        }
      ]
    },
    {
      label: "Help",
      submenu: [
        {
          label: "About",
          click() {
            if (mainWindow) mainWindow.webContents.send("show-about-dialog");
          }
        },
        {
          label: "Report Issue",
          click() {
            require("electron").shell.openExternal("https://github.com/UTKARSHKUMAR712/Poly_movies/issues");
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function registerDownloadHandler() {
  const { download } = require('electron');
  const path = require('path');
  const os = require('os');
  
  // Track active download items
  const activeDownloads = new Map();
  // Track download progress for speed calculation
  const downloadProgress = new Map();

  // Handle download requests from renderer
  ipcMain.handle('start-download', async (event, options) => {
    const { url, filename } = options;
    
    if (!url) {
      return { success: false, error: 'No URL provided' };
    }

    try {
      console.log(`📥 Starting download: ${filename || 'Unknown file'}`);
      
      return new Promise((resolve) => {
        if (!mainWindow) {
          resolve({ success: false, error: 'Main window not available' });
          return;
        }

        mainWindow.webContents.downloadURL(url);

        // Handle download events
        mainWindow.webContents.session.on('will-download', (event, item, webContents) => {
          // Set download path
          const downloadsPath = path.join(os.homedir(), 'Downloads');
          const downloadPath = path.join(downloadsPath, filename || item.getFilename());
          item.setSavePath(downloadPath);

          console.log(`📥 Download started: ${item.getFilename()}`);
          console.log(`📁 Save path: ${downloadPath}`);
          
          // Store download item for cancellation
          if (options.downloadId) {
            activeDownloads.set(options.downloadId, item);
            console.log(`📊 Tracking download: ${options.downloadId}`);
          }

          // Track download progress
          item.on('updated', (event, state) => {
            if (state === 'interrupted') {
              console.log('📥 Download interrupted');
            } else if (state === 'progressing') {
              if (item.isPaused()) {
                console.log('📥 Download paused');
              } else {
                const receivedBytes = item.getReceivedBytes();
                const totalBytes = item.getTotalBytes();
                const progress = totalBytes > 0 ? (receivedBytes / totalBytes) * 100 : 0;
                
                // Improved speed calculation
                const now = Date.now();
                const downloadId = options.downloadId;
                let speed = 0;
                
                if (downloadId && downloadProgress.has(downloadId)) {
                  const lastProgress = downloadProgress.get(downloadId);
                  const timeDiff = (now - lastProgress.timestamp) / 1000; // seconds
                  const bytesDiff = receivedBytes - lastProgress.bytes;
                  
                  if (timeDiff > 0) {
                    speed = bytesDiff / timeDiff; // bytes per second
                  }
                }
                
                // Store current progress for next calculation
                if (downloadId) {
                  downloadProgress.set(downloadId, {
                    bytes: receivedBytes,
                    timestamp: now
                  });
                }
                
                const eta = calculateETA(receivedBytes, totalBytes, speed);

                // Send progress to renderer
                webContents.send('download-progress', {
                  downloadId: options.downloadId,
                  progress: progress,
                  downloadedBytes: receivedBytes,
                  totalBytes: totalBytes,
                  speed: speed,
                  eta: eta,
                  state: state,
                  filename: item.getFilename()
                });

                console.log(`📥 Download progress: ${progress.toFixed(1)}% (${receivedBytes}/${totalBytes} bytes)`);
              }
            }
          });

          item.once('done', (event, state) => {
            // Clean up tracking
            if (options.downloadId) {
              activeDownloads.delete(options.downloadId);
              downloadProgress.delete(options.downloadId);
              console.log(`📊 Removed from tracking: ${options.downloadId}`);
            }
            
            if (state === 'completed') {
              console.log('✅ Download completed successfully');
              resolve({ 
                success: true, 
                path: downloadPath,
                filename: item.getFilename(),
                size: item.getReceivedBytes()
              });
            } else {
              console.log(`❌ Download failed: ${state}`);
              resolve({ 
                success: false, 
                error: `Download ${state}`,
                state: state
              });
            }
          });
        });
      });

    } catch (error) {
      console.error('❌ Download error:', error);
      return { success: false, error: error.message };
    }
  });

  // Helper function to calculate download speed
  function calculateDownloadSpeed(receivedBytes, startTime) {
    const currentTime = Date.now();
    const elapsedSeconds = (currentTime - startTime) / 1000;
    return elapsedSeconds > 0 ? receivedBytes / elapsedSeconds : 0;
  }

  // Helper function to calculate ETA
  function calculateETA(receivedBytes, totalBytes, speed) {
    if (speed <= 0 || totalBytes <= 0) return 0;
    const remainingBytes = totalBytes - receivedBytes;
    return remainingBytes / speed;
  }

  // Handle download cancellation
  ipcMain.handle('cancel-download', async (event, downloadId) => {
    console.log(`🚫 Cancel download requested: ${downloadId}`);
    
    const downloadItem = activeDownloads.get(downloadId);
    if (downloadItem && !downloadItem.isDone()) {
      try {
        downloadItem.cancel();
        activeDownloads.delete(downloadId);
        console.log(`✅ Download cancelled successfully: ${downloadId}`);
        return { success: true, message: 'Download cancelled' };
      } catch (error) {
        console.error(`❌ Failed to cancel download: ${error.message}`);
        return { success: false, error: error.message };
      }
    } else {
      console.log(`⚠️ Download not found or already completed: ${downloadId}`);
      return { success: false, error: 'Download not found or already completed' };
    }
  });

  // Handle download pause
  ipcMain.handle('pause-download', async (event, downloadId) => {
    // Implementation for pausing downloads
    console.log(`⏸️ Pause download requested: ${downloadId}`);
    return { success: true };
  });

  // Handle download resume
  ipcMain.handle('resume-download', async (event, downloadId) => {
    // Implementation for resuming downloads
    console.log(`▶️ Resume download requested: ${downloadId}`);
    return { success: true };
  });
}

function registerExternalPlayerHandler() {
  const candidateExecutables = [
    "vlc",           // VLC Player (Unix/Linux)
    "vlc.exe",       // VLC Player (Windows)
    "mpc-hc64.exe",  // MPC-HC 64-bit
    "mpc-hc.exe",    // MPC-HC 32-bit
    "mpv",           // MPV Player (Unix/Linux)
    "mpv.exe",       // MPV Player (Windows)
  ];

  let cachedPlayerPath = null;

  function findPlayerExecutable() {
    const platform = process.platform;

    if (cachedPlayerPath && fs.existsSync(cachedPlayerPath)) {
      return cachedPlayerPath;
    }

    const seen = new Set();
    const checkCandidate = (candidatePath) => {
      if (!candidatePath) return null;
      const trimmed = candidatePath.trim();
      if (!trimmed || seen.has(trimmed)) return null;
      seen.add(trimmed);

      try {
        if (fs.existsSync(trimmed)) {
          cachedPlayerPath = trimmed;
          return cachedPlayerPath;
        }
      } catch (_) {
        /* ignore file system errors */
      }
      return null;
    };

    const possiblePaths = [];

    if (platform === "darwin") {
      possiblePaths.push("/Applications/VLC.app/Contents/MacOS/VLC");
      possiblePaths.push("/Applications/IINA.app/Contents/MacOS/IINA");
    }

    if (platform === "win32") {
      const programFiles = process.env["ProgramFiles"];
      const programFilesX86 = process.env["ProgramFiles(x86)"];
      const localAppData = process.env["LocalAppData"];

      const windowsKnown = [
        // VLC Player paths
        programFiles && path.join(programFiles, "VideoLAN", "VLC", "vlc.exe"),
        programFilesX86 && path.join(programFilesX86, "VideoLAN", "VLC", "vlc.exe"),
        localAppData && path.join(localAppData, "Programs", "VideoLAN", "VLC", "vlc.exe"),

        // MPC-HC paths
        programFiles && path.join(programFiles, "MPC-HC", "mpc-hc64.exe"),
        programFilesX86 && path.join(programFilesX86, "MPC-HC", "mpc-hc.exe"),
      ];

      windowsKnown.forEach((candidate) => {
        if (candidate) possiblePaths.push(candidate);
      });
    }

    const pathDirectories = (process.env.PATH || "").split(path.delimiter).filter(Boolean);
    for (const candidate of candidateExecutables) {
      for (const dir of pathDirectories) {
        possiblePaths.push(path.join(dir, candidate));
      }
    }

    for (const candidatePath of possiblePaths) {
      const result = checkCandidate(candidatePath);
      if (result) {
        console.log("🎯 External player detected:", result);
        return result;
      }
    }

    for (const candidate of candidateExecutables) {
      const result = checkCandidate(candidate);
      if (result) {
        console.log("🎯 External player detected via command:", result);
        return result;
      }
    }

    cachedPlayerPath = null;
    return null;
  }

  ipcMain.handle("open-external-player", async (_event, payload) => {
    const { url, title, player: preferredPlayer } = payload || {};
    if (!url) {
      return { ok: false, error: "Missing stream URL" };
    }

    console.log(`🎬 External player request: ${preferredPlayer || 'auto'} for ${url.substring(0, 50)}...`);

    // Try multiple methods with retries
    const methods = [
      () => trySpecificPlayer(preferredPlayer, url, title),
      () => tryAnyAvailablePlayer(url, title),
      () => tryAllKnownPlayers(url, title),
      () => trySystemDefault(url, title),
      () => tryBrowserFallback(url)
    ];

    for (let i = 0; i < methods.length; i++) {
      try {
        const result = await methods[i]();
        if (result && result.ok) {
          console.log(`✅ External player method ${i + 1} succeeded:`, result);
          return result;
        }
      } catch (error) {
        console.warn(`⚠️ External player method ${i + 1} failed:`, error.message);
      }
    }

    return { ok: false, error: "All external player methods failed" };
  });

  // Try specific player
  async function trySpecificPlayer(playerType, url, title) {
    if (!playerType) return null;

    const playerPath = findSpecificPlayer(playerType);
    if (!playerPath) return null;

    return await launchPlayer(playerPath, url, title);
  }

  // Try any available player
  async function tryAnyAvailablePlayer(url, title) {
    const playerPath = findPlayerExecutable();
    if (!playerPath) return null;

    return await launchPlayer(playerPath, url, title);
  }

  // Try all known players
  async function tryAllKnownPlayers(url, title) {
    const playerTypes = ['vlc', 'potplayer', 'mpv'];

    for (const playerType of playerTypes) {
      try {
        const result = await trySpecificPlayer(playerType, url, title);
        if (result && result.ok) {
          return result;
        }
      } catch (error) {
        console.warn(`Failed to try ${playerType}:`, error.message);
      }
    }

    return null;
  }

  // Try system default
  async function trySystemDefault(url, title) {
    try {
      await shell.openExternal(url);
      return { ok: true, fallback: "system_default" };
    } catch (error) {
      return null;
    }
  }

  // Browser fallback
  async function tryBrowserFallback(url) {
    try {
      await shell.openExternal(url);
      return { ok: true, fallback: "browser" };
    } catch (error) {
      return null;
    }
  }

  // Launch player with retries
  async function launchPlayer(playerPath, url, title, retries = 3) {
    const args = buildPlayerArgs(playerPath, title, url);

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`🎬 Attempt ${attempt}: Launching ${playerPath}`);
        console.log(`🎬 Args: ${args.join(' ')}`);

        const child = spawn(playerPath, args, {
          detached: true,
          stdio: "ignore",
        });

        child.unref();

        // Wait a bit to see if the process starts successfully
        await new Promise(resolve => setTimeout(resolve, 500));

        return { ok: true, player: playerPath };
      } catch (error) {
        console.error(`❌ Attempt ${attempt} failed:`, error.message);

        if (attempt === retries) {
          throw error;
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    throw new Error(`Failed to launch player after ${retries} attempts`);
  }

  // Enhanced player detection with more comprehensive paths
  function findSpecificPlayer(playerType) {
    const platform = process.platform;
    const programFiles = process.env["ProgramFiles"];
    const programFilesX86 = process.env["ProgramFiles(x86)"];
    const localAppData = process.env["LocalAppData"];
    const appData = process.env["APPDATA"];
    const userProfile = process.env["USERPROFILE"];

    const playerPaths = {
      vlc: [
        // Standard installation paths
        programFiles && path.join(programFiles, "VideoLAN", "VLC", "vlc.exe"),
        programFilesX86 && path.join(programFilesX86, "VideoLAN", "VLC", "vlc.exe"),
        localAppData && path.join(localAppData, "Programs", "VideoLAN", "VLC", "vlc.exe"),
        // Portable versions
        path.join(process.cwd(), "VLC", "vlc.exe"),
        path.join(userProfile, "Desktop", "VLC", "vlc.exe"),
        // PATH executables
        "vlc.exe",
        "vlc",
        // Alternative paths
        "C:\\Program Files\\VideoLAN\\VLC\\vlc.exe",
        "C:\\Program Files (x86)\\VideoLAN\\VLC\\vlc.exe"
      ],
      potplayer: [
        // Standard installation paths
        programFiles && path.join(programFiles, "DAUM", "PotPlayer", "PotPlayerMini64.exe"),
        programFiles && path.join(programFiles, "DAUM", "PotPlayer", "PotPlayer64.exe"),
        programFilesX86 && path.join(programFilesX86, "DAUM", "PotPlayer", "PotPlayerMini.exe"),
        programFilesX86 && path.join(programFilesX86, "DAUM", "PotPlayer", "PotPlayer.exe"),
        // Alternative DAUM paths
        programFiles && path.join(programFiles, "Daum", "PotPlayer", "PotPlayerMini64.exe"),
        programFilesX86 && path.join(programFilesX86, "Daum", "PotPlayer", "PotPlayerMini.exe"),
        // Portable versions
        path.join(process.cwd(), "PotPlayer", "PotPlayerMini64.exe"),
        path.join(userProfile, "Desktop", "PotPlayer", "PotPlayerMini64.exe"),
        // PATH executables
        "PotPlayerMini64.exe",
        "PotPlayerMini.exe",
        "PotPlayer64.exe",
        "PotPlayer.exe",
        // Direct paths
        "C:\\Program Files\\DAUM\\PotPlayer\\PotPlayerMini64.exe",
        "C:\\Program Files (x86)\\DAUM\\PotPlayer\\PotPlayerMini.exe"
      ],
      mpv: [
        // Standard installation paths
        programFiles && path.join(programFiles, "mpv", "mpv.exe"),
        programFilesX86 && path.join(programFilesX86, "mpv", "mpv.exe"),
        localAppData && path.join(localAppData, "Programs", "mpv", "mpv.exe"),
        // Scoop installation
        userProfile && path.join(userProfile, "scoop", "apps", "mpv", "current", "mpv.exe"),
        // Chocolatey installation
        "C:\\ProgramData\\chocolatey\\bin\\mpv.exe",
        // Portable versions
        path.join(process.cwd(), "mpv", "mpv.exe"),
        path.join(userProfile, "Desktop", "mpv", "mpv.exe"),
        // PATH executables
        "mpv.exe",
        "mpv"
      ],
      mpc: [
        // MPC-HC paths
        programFiles && path.join(programFiles, "MPC-HC", "mpc-hc64.exe"),
        programFilesX86 && path.join(programFilesX86, "MPC-HC", "mpc-hc.exe"),
        programFiles && path.join(programFiles, "K-Lite Codec Pack", "MPC-HC64", "mpc-hc64.exe"),
        programFilesX86 && path.join(programFilesX86, "K-Lite Codec Pack", "MPC-HC", "mpc-hc.exe"),
        "mpc-hc64.exe",
        "mpc-hc.exe"
      ],
      wmplayer: [
        // Windows Media Player
        "C:\\Program Files\\Windows Media Player\\wmplayer.exe",
        "C:\\Program Files (x86)\\Windows Media Player\\wmplayer.exe",
        programFiles && path.join(programFiles, "Windows Media Player", "wmplayer.exe"),
        programFilesX86 && path.join(programFilesX86, "Windows Media Player", "wmplayer.exe"),
        "wmplayer.exe"
      ]
    };

    const candidates = playerPaths[playerType] || [];

    // Try each candidate path
    for (const candidate of candidates) {
      if (!candidate) continue;
      try {
        if (fs.existsSync(candidate)) {
          console.log(`🎯 Found ${playerType} at: ${candidate}`);
          return candidate;
        }
      } catch (error) {
        // Continue searching
      }
    }

    // Try PATH search as fallback
    return searchInPath(playerType);
  }

  // Search for player in PATH
  function searchInPath(playerType) {
    const pathEnv = process.env.PATH || '';
    const pathDirs = pathEnv.split(path.delimiter);

    const executables = {
      vlc: ['vlc.exe', 'vlc'],
      potplayer: ['PotPlayerMini64.exe', 'PotPlayerMini.exe', 'PotPlayer64.exe', 'PotPlayer.exe'],
      mpv: ['mpv.exe', 'mpv'],
      mpc: ['mpc-hc64.exe', 'mpc-hc.exe'],
      wmplayer: ['wmplayer.exe']
    };

    const playerExecutables = executables[playerType] || [];

    for (const dir of pathDirs) {
      for (const exe of playerExecutables) {
        const fullPath = path.join(dir, exe);
        try {
          if (fs.existsSync(fullPath)) {
            console.log(`🎯 Found ${playerType} in PATH: ${fullPath}`);
            return fullPath;
          }
        } catch (error) {
          // Continue searching
        }
      }
    }

    return null;
  }

  // Build appropriate arguments for different players
  function buildPlayerArgs(playerPath, title, url) {
    const args = [];
    const playerName = path.basename(playerPath).toLowerCase();

    if (playerName.includes('vlc')) {
      // VLC arguments for standalone player
      if (title) {
        args.push('--meta-title', title);
      }
      args.push(url);
    } else if (playerName.includes('pot')) {
      // PotPlayer arguments
      args.push(url);
      if (title) {
        args.push('/title', title);
      }
    } else if (playerName.includes('mpv')) {
      // MPV arguments
      if (title) {
        args.push(`--force-media-title=${title}`);
      }
      args.push(url);
    } else {
      // Generic arguments
      if (title) {
        args.push('--title', title);
      }
      args.push(url);
    }

    return args;
  }
}

async function waitForServer(host, port, pathSuffix = "/health", retries = 30, delayMs = 1000) {
  const url = `http://${host}:${port}${pathSuffix}`;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      await ping(url);
      return;
    } catch (error) {
      if (attempt === retries - 1) {
        throw error;
      }
      await setTimeout(delayMs);
    }
  }
}

function ping(url) {
  return new Promise((resolve, reject) => {
    const request = http.get(url, (response) => {
      response.resume();

      if (response.statusCode && response.statusCode < 400) {
        resolve();
      } else {
        reject(new Error(`Unexpected status code ${response.statusCode}`));
      }
    });

    request.on("error", reject);
    request.end();
  });
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", (event) => {
  if (isQuitting || !devServerInstance?.stop) {
    return;
  }

  event.preventDefault();
  isQuitting = true;

  devServerInstance
    .stop()
    .catch((error) => {
      console.error("Error shutting down internal server:", error);
    })
    .finally(() => {
      devServerInstance = null;
      app.exit(0);
    });
});
