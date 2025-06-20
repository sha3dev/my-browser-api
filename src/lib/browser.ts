/**
 * imports
 */

import puppeteer, { Browser, Page } from "puppeteer";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

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
};

/**
 * consts
 */

const BROWSER_TIMEOUT = 60 * 1000;

/**
 * class
 */

export default class {
  /**
   * private: attributes
   */

  private browser: Browser | null = null;

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
    const userDataDir = path.join(tempDir, "hype-bot");
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

  private async getBrowser() {
    if (!this.browser) {
      const executablePath = this.locateBrowser();
      const launchOptions: any = {
        headless: false,
        defaultViewport: ,
        userDataDir: this.getUserDataDir(),
        // ignoreDefaultArgs: ["--enable-automation"],
      };
      if (executablePath) {
        launchOptions.executablePath = executablePath;
      }
      this.browser = await puppeteer.launch(launchOptions);
    }
    return this.browser;
  }

  /**
   * constructor
   */

  constructor(private options: BrowserOptions) {}

  /**
   * public
   */

  public async open(options: OpenOptions) {
    const { url } = options;
    const browser = await this.getBrowser();
    const page = await browser.newPage();
    const response = await page.goto(url, { timeout: BROWSER_TIMEOUT });
    if (!response?.ok()) {
      throw new Error(`error opening ${url}: ${response?.status()}`);
    }
    await page.waitForNetworkIdle({ timeout: BROWSER_TIMEOUT });
    return page;
  }
}
