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
    this.addRibbonIcon("mindvault", "MindVault Sync", () => {
      if (!this.settings.token) {
        new Notice("Подключи MindVault в настройках плагина");
        this.openSettings();
        return;
      }
      if (!this.settings.briefId) {
        new Notice("Выбери ассистента в настройках плагина");
        this.openSettings();
        return;
      }
      this.runSync();
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
        new Notice("MindVault: ошибка авторизации — токен не получен");
        return;
      }
      this.settings.token = token;
      await this.saveSettings();

      // Load user info
      try {
        const api = new MindVaultApi(this.settings.apiUrl, token);
        const me = await api.getMe();
        this.settings.userEmail = me.email;
        this.settings.userName = me.name || me.email;
        await this.saveSettings();
        new Notice(`MindVault подключён: ${me.email}`);
        this.updateStatusBar();
      } catch {
        new Notice("MindVault подключён, но не удалось загрузить профиль");
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
      this.statusBarEl.setText("MV: не подключён");
    } else if (!this.settings.briefId) {
      this.statusBarEl.setText("MV: выбери ассистента");
    } else {
      const now = new Date().toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });
      this.statusBarEl.setText(`MV: синк ${now}`);
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
      this.runSync(true);
    }, ms);
  }

  async runSync(silent = false) {
    if (this.isSyncing) {
      if (!silent) new Notice("Синхронизация уже выполняется...");
      return;
    }
    if (!this.settings.token || !this.settings.briefId) {
      new Notice("MindVault: настрой подключение в настройках");
      return;
    }

    this.isSyncing = true;
    this.statusBarEl.setText("MV: синхронизация...");
    if (!silent) new Notice("MindVault: начало синхронизации...");

    try {
      const api = new MindVaultApi(this.settings.apiUrl, this.settings.token);
      const sync = new SyncManager(this.app, api, this.settings.briefId);
      const { pushed, pulled } = await sync.fullSync();
      const msg = `MindVault: синк завершён — отправлено ${pushed}, получено ${pulled} файлов`;
      if (!silent) new Notice(msg);
      console.log("[MindVault]", msg);
    } catch (e: any) {
      const msg = `MindVault: ошибка синхронизации — ${e.message}`;
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
    new Notice("Откройте браузер и разрешите доступ MindVault");
  }

  openSettings() {
    // @ts-ignore
    this.app.setting.open();
    // @ts-ignore
    this.app.setting.openTabById("mindvault-sync");
  }
}
