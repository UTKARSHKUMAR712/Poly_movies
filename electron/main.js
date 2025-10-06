const path = require("path");
const http = require("http");
const { setTimeout: delay } = require("node:timers/promises");
const { app, BrowserWindow, Menu } = require("electron");
const { startDevServer } = require("../dev-server");

const iconPath = path.join(__dirname, "..", "icons", "cropped_circle_image (1).ico");

let devServerInstance = null;
let mainWindow = null;
let isQuitting = false;

const singleInstanceLock = app.requestSingleInstanceLock();

if (!singleInstanceLock) {
  app.quit();
}

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
