const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("appBridge", {
  ping: () => "pong",
  openExternalPlayer: (payload) => ipcRenderer.invoke("open-external-player", payload),
});
