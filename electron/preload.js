const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("appBridge", {
  ping: () => "pong",
  openExternalPlayer: (payload) => ipcRenderer.invoke("open-external-player", payload),
});

// Enhanced API for download functionality
contextBridge.exposeInMainWorld("electronAPI", {
  // Download functions
  startDownload: (options) => ipcRenderer.invoke("start-download", options),
  cancelDownload: (downloadId) => ipcRenderer.invoke("cancel-download", downloadId),
  pauseDownload: (downloadId) => ipcRenderer.invoke("pause-download", downloadId),
  resumeDownload: (downloadId) => ipcRenderer.invoke("resume-download", downloadId),

  // Download progress listener
  onDownloadProgress: (callback) => {
    console.log('📊 Setting up download progress listener in preload');
    ipcRenderer.on('download-progress', (event, data) => {
      console.log('📊 Progress received in preload:', data);
      callback(data);
    });
  },

  // Remove download progress listener
  removeDownloadProgressListener: () => {
    ipcRenderer.removeAllListeners('download-progress');
  },

  // System info
  getSystemInfo: () => ({
    platform: process.platform,
    arch: process.arch,
    version: process.version
  })
});
