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
          label: "Refresh",
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function registerExternalPlayerHandler() {
  const candidateExecutables = [
    "vlc",
    "vlc.exe",
    "mpc-hc64.exe",
    "mpc-hc.exe",
    "mpv",
    "mpv.exe",
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
        programFiles && path.join(programFiles, "VideoLAN", "VLC", "vlc.exe"),
        programFilesX86 && path.join(programFilesX86, "VideoLAN", "VLC", "vlc.exe"),
        localAppData && path.join(localAppData, "Programs", "VideoLAN", "VLC", "vlc.exe"),
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
    const { url, title } = payload || {};
    if (!url) {
      return { ok: false, error: "Missing stream URL" };
    }

    const playerPath = findPlayerExecutable();

    if (!playerPath) {
      await shell.openExternal(url);
      return { ok: true, fallback: "browser" };
    }

    const args = [];
    if (title) {
      args.push("--meta-title", title);
    }
    args.push(url);

    try {
      const child = spawn(playerPath, args, {
        detached: true,
        stdio: "ignore",
      });
      child.unref();
      return { ok: true, player: playerPath };
    } catch (error) {
      console.error("Failed to launch external player:", error);
      try {
        await shell.openExternal(url);
        return { ok: true, fallback: "browser" };
      } catch (fallbackError) {
        return { ok: false, error: fallbackError.message };
      }
    }
  });
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
