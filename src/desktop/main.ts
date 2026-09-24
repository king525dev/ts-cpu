import { app, BrowserWindow } from "electron";
import { join } from "node:path";

// esbuild will output this file as CommonJS, where `__dirname` is a Node
// global pointing at the directory containing the compiled file. TypeScript
// doesn't know about it here because the source is ESM, so we declare it.
declare const __dirname: string;

function createWindow(): void {
    const win = new BrowserWindow({
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
            sandbox: true,
        },
    });

    win.loadFile(join(__dirname, "renderer", "index.html"));
}

app.whenReady().then(createWindow);

// On macOS, apps stay alive when all windows are closed, and users expect
// clicking the dock icon to reopen a window. On Windows and Linux, the
// convention is to quit.
app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});