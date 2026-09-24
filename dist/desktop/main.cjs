"use strict";

// src/desktop/main.ts
var import_electron = require("electron");
var import_node_path = require("node:path");
function createWindow() {
  const win = new import_electron.BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 720,
    minHeight: 500,
    title: "OXN",
    backgroundColor: "#141414",
    webPreferences: {
      // The renderer is a normal browser page. It has no access to
      // Node.js, no access to the filesystem, no access to the main
      // process. The CPU runs entirely inside it.
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  win.loadFile((0, import_node_path.join)(__dirname, "renderer", "index.html"));
}
import_electron.app.whenReady().then(createWindow);
import_electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") import_electron.app.quit();
});
import_electron.app.on("activate", () => {
  if (import_electron.BrowserWindow.getAllWindows().length === 0) createWindow();
});
