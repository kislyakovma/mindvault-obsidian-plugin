import { Plugin, Notice, addIcon } from "obsidian";
import { MindVaultSettings, DEFAULT_SETTINGS, MindVaultSettingTab } from "./settings";
import { MindVaultApi } from "./api";
import { SyncManager } from "./sync";

const MINDVAULT_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" stroke-width="8"/><path d="M30 50 Q50 20 70 50 Q50 80 30 50Z" fill="currentColor"/></svg>`;

export default class MindVaultPlugin extends Plugin {
  settings: MindVaultSettings;
  private statusBarEl: HTMLElement;
  private syncIntervalId: number | null = null;
  private isSyncing = false;

  async onload() {
    await this.loadSettings();

    addIcon("mindvault", MINDVAULT_ICON);

    // Ribbon icon
    this.addRibbonIcon("mindvault", "Sync vault", () => {
      if (!this.settings.token) {
        new Notice("Connect in plugin settings");
        this.openSettings();
        return;
      }
      if (!this.settings.briefId) {
        new Notice("Select an assistant in plugin settings");
        this.openSettings();
        return;
      }
      void this.runSync();
    });

    // Status bar
    this.statusBarEl = this.addStatusBarItem();
    this.updateStatusBar();

    // Settings tab
    this.addSettingTab(new MindVaultSettingTab(this.app, this));

    // OAuth callback handler
    this.registerObsidianProtocolHandler("mindvault-callback", async (params) => {
      const token = params.token;
      if (!token) {
        new Notice("Authorization error — token not received");
        return;
      }
      this.settings.token = token;
      await this.saveSettings();

      // Load user info
      try {
        const api = new MindVaultApi(this.settings.apiUrl, token);
        const me = await api.getMe();
        this.settings.userEmail = me.email;
        this.settings.userName = me.name ?? me.email;
        await this.saveSettings();
        new Notice(`MindVault connected: ${me.email}`);
        this.updateStatusBar();
      } catch {
        new Notice("Connected, but failed to load profile");
      }
    });

    // Start auto-sync
    this.resetSyncInterval();
  }

  onunload() {
    if (this.syncIntervalId !== null) {
      window.clearInterval(this.syncIntervalId);
    }
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  updateStatusBar() {
    if (!this.settings.token) {
      this.statusBarEl.setText("Not connected");
    } else if (!this.settings.briefId) {
      this.statusBarEl.setText("Select an assistant");
    } else {
      const now = new Date().toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" });
      this.statusBarEl.setText(`MV: synced ${now}`);
    }
  }

  resetSyncInterval() {
    if (this.syncIntervalId !== null) {
      window.clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
    }
    if (!this.settings.token || !this.settings.briefId) return;

    const ms = this.settings.syncIntervalMinutes * 60 * 1000;
    this.syncIntervalId = window.setInterval(() => {
      void this.runSync(true);
    }, ms);
  }

  async runSync(silent = false) {
    if (this.isSyncing) {
      if (!silent) new Notice("Sync is already running...");
      return;
    }
    if (!this.settings.token || !this.settings.briefId) {
      new Notice("Configure connection in settings");
      return;
    }

    this.isSyncing = true;
    this.statusBarEl.setText("Syncing...");
    if (!silent) new Notice("Starting sync...");

    try {
      const api = new MindVaultApi(this.settings.apiUrl, this.settings.token);
      const sync = new SyncManager(this.app, api, this.settings.briefId);
      const { pushed, pulled } = await sync.fullSync();
      const msg = `MindVault: sync complete — pushed ${pushed}, pulled ${pulled} files`;
      if (!silent) new Notice(msg);
      console.debug("[MindVault]", msg);
    } catch (e: unknown) {
      const msg = `MindVault: sync error — ${e instanceof Error ? e.message : String(e)}`;
      new Notice(msg);
      console.error("[MindVault]", e);
    } finally {
      this.isSyncing = false;
      this.updateStatusBar();
    }
  }

  startOAuthFlow() {
    const state = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const url = `${this.settings.apiUrl.replace("api.", "console.")}/app/obsidian-auth?state=${state}&callback=obsidian%3A%2F%2Fmindvault-callback`;
    window.open(url);
    new Notice("Open the browser and authorize MindVault");
  }

  openSettings() {
    // @ts-ignore
    this.app.setting.open();
    // @ts-ignore
    this.app.setting.openTabById("mindvault-sync");
  }
}
