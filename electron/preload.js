const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("appBridge", {
  ping: () => "pong",
});
