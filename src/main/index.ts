import { app, BrowserWindow, dialog, session } from "electron";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { openStore, type Store } from "./storage";
import { Workflow } from "./workflow";
import { registerBridge } from "./bridge";
import { ResearchJobs } from "./codex/jobs";
if (process.env.CONTENT_STUDIO_DATA_DIR)
  app.setPath("userData", resolve(process.env.CONTENT_STUDIO_DATA_DIR));
app.setName("Content Studio");
const single = app.requestSingleInstanceLock();
let store: Store | undefined;
let jobs: ResearchJobs | undefined;
if (!single) app.quit();
else {
  app.on("second-instance", () => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
  app
    .whenReady()
    .then(async () => {
      session.defaultSession.setPermissionRequestHandler(
        (_webContents, _permission, callback) => callback(false),
      );
      session.defaultSession.setPermissionCheckHandler(() => false);
      const dir = app.getPath("userData");
      store = await openStore(
        dir,
        app.isPackaged
          ? join(process.resourcesPath, "sql-wasm.wasm")
          : undefined,
      );
      const workflow = new Workflow(store, dir);
      jobs = new ResearchJobs(store, workflow, dir);
      function createWindow() {
        const window = new BrowserWindow({
          width: 1320,
          height: 900,
          minWidth: 740,
          minHeight: 650,
          title: "Content Studio",
          backgroundColor: "#141820",
          autoHideMenuBar: true,
          webPreferences: {
            preload: join(__dirname, "../preload/index.js"),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            webSecurity: true,
            webviewTag: false,
          },
        });
        const url =
          !app.isPackaged && process.env.ELECTRON_RENDERER_URL
            ? process.env.ELECTRON_RENDERER_URL
            : pathToFileURL(join(__dirname, "../renderer/index.html")).href;
        registerBridge(window, url, store!, workflow, jobs!);
        window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
        window.webContents.on("will-navigate", (event, next) => {
          if (next !== url) event.preventDefault();
        });
        window.webContents.on("will-attach-webview", (event) =>
          event.preventDefault(),
        );
        window.loadURL(url);
      }
      createWindow();
      app.on("activate", () => {
        if (!BrowserWindow.getAllWindows().length) createWindow();
      });
    })
    .catch((error) => {
      console.error("Studio startup failed:", error);
      dialog.showErrorBox(
        "Content Studio could not start",
        "Your saved work has been kept. Check disk space and restart the app.",
      );
      app.quit();
    });
  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
  app.on("before-quit", () => jobs?.close());
  app.on("will-quit", () => store?.close());
}
