/**
 * imports
 */

import puppeteer, { Browser } from "puppeteer";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";

/**
 * imports (internals)
 */

/**
 * types
 */

export type BrowserOptions = {
  userDataDir?: string;
};

export type OpenOptions = {
  url: string;
  overrideWaitNetworkIdleTimeout?: number;
};

/**
 * consts
 */

const BROWSER_TIMEOUT = 2 * 1000;

const DEFAULT_VIEWPORT = { width: 1280, height: 800 };

/**
 * class
 */

export default class {
  /**
   * private: attributes
   */

  private browser: Browser | null = null;

  private lastBrowserCheck: number = 0;

  private browserCheckInterval: number = 30 * 1000;

  /**
   * private: methods
   */

  private listMacBrowserPaths() {
    return [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      "/Applications/Firefox.app/Contents/MacOS/firefox",
      "/Applications/Safari.app/Contents/MacOS/Safari",
    ];
  }

  private listWindowsBrowserPaths() {
    const programFiles = process.env.ProgramW6432 || process.env.ProgramFiles || "C:\\Program Files";
    const programFilesX86 = process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";
    const localAppData = process.env.LOCALAPPDATA || process.env.USERPROFILE + "\\AppData\\Local";
    return [
      `${programFiles}\\Google\\Chrome\\Application\\chrome.exe`,
      `${programFiles}\\Microsoft\\Edge\\Application\\msedge.exe`,
      `${programFiles}\\Mozilla Firefox\\firefox.exe`,
      `${programFilesX86}\\Microsoft\\Edge\\Application\\msedge.exe`,
      `${programFilesX86}\\Google\\Chrome\\Application\\chrome.exe`,
      `${localAppData}\\Google\\Chrome\\Application\\chrome.exe`,
      `${localAppData}\\Microsoft\\Edge\\Application\\msedge.exe`,
    ];
  }

  private listLinuxBrowserPaths() {
    return [
      "/usr/bin/google-chrome",
      "/usr/bin/chromium",
      "/usr/bin/chromium-browser",
      "/usr/bin/firefox",
      "/snap/bin/chromium",
      "/usr/bin/microsoft-edge",
      "/opt/microsoft/msedge/msedge",
    ];
  }

  private getUserDataDir(): string {
    if (this.options.userDataDir) {
      return this.options.userDataDir;
    }
    const tempDir = os.tmpdir();
    const userDataDir = path.join(tempDir, "my-browser-api");
    if (!fs.existsSync(userDataDir)) {
      fs.mkdirSync(userDataDir, { recursive: true });
    }
    return userDataDir;
  }

  private locateBrowser() {
    const os = process.platform;
    let browserPaths: string[] = [];
    if (os === "darwin") {
      browserPaths = this.listMacBrowserPaths();
    } else if (os === "win32") {
      browserPaths = this.listWindowsBrowserPaths();
    } else if (os === "linux") {
      browserPaths = this.listLinuxBrowserPaths();
    } else {
      throw new Error(`Unsupported platform: ${os}`);
    }
    let executablePath = "";
    for (const path of browserPaths) {
      try {
        if (fs.existsSync(path)) {
          executablePath = path;
          break;
        }
      } catch (e) {
        continue;
      }
    }
    return executablePath;
  }

  private async isBrowserAlive(): Promise<boolean> {
    if (!this.browser) {
      return false;
    }
    try {
      // Try to get browser version - this will fail if browser is disconnected
      await this.browser.version();
      return true;
    } catch (error: any) {
      console.warn("Browser instance appears to be dead:", error.message);
      return false;
    }
  }

  private killMacBrowser(executablePath: string, userDataDir: string) {
    try {
      const ps = spawnSync("ps", ["aux"], { encoding: "utf-8" });
      if (ps.error) throw ps.error;
      const lines = ps.stdout.split("\n").filter((line) => line.includes(executablePath) && line.includes(userDataDir));
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[1];
        if (pid) {
          spawnSync("kill", ["-9", pid]);
          console.log(`Killed leftover browser process with PID ${pid}`);
        }
      }
    } catch (error: any) {
      console.warn("No leftover processes found or error killing (unix):", error.message);
    }
  }

  private killWindowsBrowser(userDataDir: string) {
    try {
      const wmic = spawnSync("wmic", ["process", "where", `CommandLine like '%${userDataDir}%'`, "get", "ProcessId"], { encoding: "utf-8" });
      if (wmic.error) throw wmic.error;
      const lines = wmic.stdout.split("\n").filter((line) => /\d+/.test(line));
      for (const line of lines) {
        const pid = line.trim();
        if (pid) {
          spawnSync("taskkill", ["/PID", pid, "/F"]);
          console.log(`Killed leftover browser process with PID ${pid}`);
        }
      }
    } catch (error: any) {
      console.warn("No leftover processes found or error killing (win):", error.message);
    }
  }

  private async cleanupDeadBrowser() {
    if (this.browser) {
      try {
        await this.browser.close();
        console.log("Browser instance closed cleanly");
      } catch (error: any) {
        console.warn("Error while closing browser:", error.message);
      } finally {
        this.browser = null;
      }
    }
    const userDataDir = this.getUserDataDir();
    const executablePath = this.locateBrowser();
    if (process.platform === "darwin" || process.platform === "linux") {
      this.killMacBrowser(executablePath, userDataDir);
    }
    if (process.platform === "win32") {
      this.killWindowsBrowser(userDataDir);
    }
  }

  private async getBrowser() {
    const now = Date.now();
    if (this.browser && now - this.lastBrowserCheck > this.browserCheckInterval) {
      this.lastBrowserCheck = now;
      const isAlive = await this.isBrowserAlive();
      if (!isAlive) {
        console.log("Browser instance is dead, recreating...");
        await this.cleanupDeadBrowser();
      }
    }
    if (!this.browser) {
      const executablePath = this.locateBrowser();
      const userDataDir = this.getUserDataDir();
      const launchOptions: any = {
        headless: false,
        defaultViewport: DEFAULT_VIEWPORT,
        userDataDir,
        args: [
          "--no-first-run",
          "--no-default-browser-check",
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--no-zygote",
        ],
      };
      if (executablePath) {
        launchOptions.executablePath = executablePath;
      }
      try {
        this.browser = await puppeteer.launch(launchOptions);
        this.lastBrowserCheck = now;
        console.log("New browser instance created successfully");
      } catch (error: any) {
        console.error("Failed to launch browser:", error.message);
        throw error;
      }
    }
    return this.browser;
  }

  /**
   * constructor
   */

  constructor(private options: BrowserOptions) {}

  /**
   * public: methods
   */

  public async open(options: OpenOptions) {
    const { url, overrideWaitNetworkIdleTimeout } = options;
    const browser = await this.getBrowser();
    const page = await browser.newPage();
    const response = await page.goto(url, { timeout: BROWSER_TIMEOUT });
    if (!response?.ok()) {
      throw new Error(`error opening ${url}: ${response?.status()}`);
    }
    if (overrideWaitNetworkIdleTimeout) {
      await new Promise((f) => setTimeout(f, overrideWaitNetworkIdleTimeout));
    } else {
      await page.waitForNetworkIdle({ timeout: BROWSER_TIMEOUT });
    }
    return page;
  }

  public async ensureBrowserAlive() {
    this.lastBrowserCheck = 0; // Reset the check timer to force a check
    await this.getBrowser();
  }

  public async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
