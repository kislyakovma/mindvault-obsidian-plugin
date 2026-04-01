var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => MindVaultPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian3 = require("obsidian");

// src/settings.ts
var import_obsidian = require("obsidian");

// src/api.ts
var MindVaultApi = class {
  constructor(apiUrl, token) {
    this.apiUrl = apiUrl;
    this.token = token;
  }
  async request(method, path, body) {
    const res = await fetch(`${this.apiUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json"
      },
      body: body !== void 0 ? JSON.stringify(body) : void 0
    });
    if (!res.ok) {
      throw new Error(`MindVault API error: ${res.status} ${await res.text()}`);
    }
    if (res.status === 204)
      return void 0;
    return res.json();
  }
  async getMe() {
    return this.request("GET", "/api/auth/me");
  }
  async getBriefs() {
    return this.request("GET", "/api/brief");
  }
  async listFiles(briefId) {
    return this.request("GET", `/api/vault/${briefId}/files`);
  }
  async readFile(briefId, path) {
    const res = await this.request(
      "GET",
      `/api/vault/${briefId}/file?path=${encodeURIComponent(path)}`
    );
    return res.content;
  }
  async writeFile(briefId, path, content) {
    await this.request(
      "PUT",
      `/api/vault/${briefId}/file?path=${encodeURIComponent(path)}`,
      { content }
    );
  }
  async createFile(briefId, path, isDir) {
    await this.request("POST", `/api/vault/${briefId}/file`, {
      path,
      isDir
    });
  }
  async deleteFile(briefId, path) {
    await this.request(
      "DELETE",
      `/api/vault/${briefId}/file?path=${encodeURIComponent(path)}`
    );
  }
  // Flatten nested file tree into list of file paths
  flattenFiles(files, prefix = "") {
    const result = [];
    for (const f of files) {
      const fullPath = prefix ? `${prefix}/${f.name}` : f.name;
      result.push({ path: fullPath, isDir: f.isDir });
      if (f.isDir && f.children) {
        result.push(...this.flattenFiles(f.children, fullPath));
      }
    }
    return result;
  }
};

// src/settings.ts
var DEFAULT_SETTINGS = {
  apiUrl: "https://api.mvault.ru",
  token: "",
  briefId: "",
  syncIntervalMinutes: 15,
  userEmail: "",
  userName: ""
};
var MindVaultSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass("mindvault-settings");
    containerEl.createEl("h2", { text: "MindVault Sync" });
    if (this.plugin.settings.token) {
      const badge = containerEl.createEl("div", { cls: "mindvault-status-connected" });
      badge.createEl("span", { text: "\u25CF" });
      badge.createEl("span", {
        text: this.plugin.settings.userEmail ? `\u041F\u043E\u0434\u043A\u043B\u044E\u0447\u0451\u043D: ${this.plugin.settings.userEmail}` : "\u041F\u043E\u0434\u043A\u043B\u044E\u0447\u0451\u043D"
      });
      new import_obsidian.Setting(containerEl).setName("\u0410\u043A\u043A\u0430\u0443\u043D\u0442").setDesc("\u0412\u044B\u0439\u0442\u0438 \u0438\u0437 \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0430 MindVault").addButton(
        (btn) => btn.setButtonText("\u041E\u0442\u043A\u043B\u044E\u0447\u0438\u0442\u044C").setClass("mindvault-btn-disconnect").onClick(async () => {
          this.plugin.settings.token = "";
          this.plugin.settings.userEmail = "";
          this.plugin.settings.userName = "";
          this.plugin.settings.briefId = "";
          await this.plugin.saveSettings();
          this.plugin.updateStatusBar();
          this.display();
        })
      );
    } else {
      const badge = containerEl.createEl("div", { cls: "mindvault-status-disconnected" });
      badge.createEl("span", { text: "\u25CB" });
      badge.createEl("span", { text: "\u041D\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0451\u043D" });
      new import_obsidian.Setting(containerEl).setName("\u041F\u043E\u0434\u043A\u043B\u044E\u0447\u0438\u0442\u044C MindVault").setDesc("\u041E\u0442\u043A\u0440\u043E\u0435\u0442 \u0431\u0440\u0430\u0443\u0437\u0435\u0440 \u0434\u043B\u044F \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u0438 \u2014 \u0437\u0430\u0439\u043C\u0451\u0442 10 \u0441\u0435\u043A\u0443\u043D\u0434").addButton(
        (btn) => btn.setButtonText("\u041F\u043E\u0434\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u2192").setClass("mindvault-btn-connect").onClick(() => this.plugin.startOAuthFlow())
      );
    }
    if (this.plugin.settings.token) {
      const briefSetting = new import_obsidian.Setting(containerEl).setName("\u0410\u0441\u0441\u0438\u0441\u0442\u0435\u043D\u0442").setDesc("\u0421 \u043A\u0430\u043A\u0438\u043C \u0430\u0441\u0441\u0438\u0441\u0442\u0435\u043D\u0442\u043E\u043C \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u0442\u044C vault");
      const select = briefSetting.controlEl.createEl("select", {
        cls: "mindvault-brief-select"
      });
      const loadOption = select.createEl("option", { text: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430...", value: "" });
      const api = new MindVaultApi(this.plugin.settings.apiUrl, this.plugin.settings.token);
      api.getBriefs().then((briefs) => {
        loadOption.remove();
        if (briefs.length === 0) {
          select.createEl("option", { text: "\u041D\u0435\u0442 \u0430\u0441\u0441\u0438\u0441\u0442\u0435\u043D\u0442\u043E\u0432", value: "" });
          return;
        }
        for (const b of briefs) {
          const opt = select.createEl("option", {
            text: `${b.title}${b.botStatus === "active" ? " \u2713" : ""}`,
            value: b.id
          });
          if (b.id === this.plugin.settings.briefId)
            opt.selected = true;
        }
        select.onchange = async () => {
          this.plugin.settings.briefId = select.value;
          await this.plugin.saveSettings();
        };
      }).catch(() => {
        loadOption.text = "\u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438";
      });
    }
    new import_obsidian.Setting(containerEl).setName("\u0410\u0432\u0442\u043E\u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u044F (\u043C\u0438\u043D\u0443\u0442\u044B)").setDesc("\u041A\u0430\u043A \u0447\u0430\u0441\u0442\u043E \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0432 \u0444\u043E\u043D\u0435").addSlider(
      (slider) => slider.setLimits(1, 60, 1).setValue(this.plugin.settings.syncIntervalMinutes).setDynamicTooltip().onChange(async (value) => {
        this.plugin.settings.syncIntervalMinutes = value;
        await this.plugin.saveSettings();
        this.plugin.resetSyncInterval();
      })
    );
    new import_obsidian.Setting(containerEl).setName("API URL").setDesc("\u041D\u0435 \u043C\u0435\u043D\u044F\u0439 \u0431\u0435\u0437 \u043D\u0435\u043E\u0431\u0445\u043E\u0434\u0438\u043C\u043E\u0441\u0442\u0438").addText(
      (text) => text.setPlaceholder("https://api.mvault.ru").setValue(this.plugin.settings.apiUrl).onChange(async (value) => {
        this.plugin.settings.apiUrl = value.trim() || "https://api.mvault.ru";
        await this.plugin.saveSettings();
      })
    );
    if (this.plugin.settings.token && this.plugin.settings.briefId) {
      new import_obsidian.Setting(containerEl).setName("\u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0441\u0435\u0439\u0447\u0430\u0441").setDesc("\u0417\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C \u043F\u043E\u043B\u043D\u0443\u044E \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u044E \u0432\u0440\u0443\u0447\u043D\u0443\u044E").addButton(
        (btn) => btn.setButtonText("\u27F3 \u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u0442\u044C").setClass("mindvault-btn-sync").onClick(() => this.plugin.runSync())
      );
    }
  }
};

// src/sync.ts
var import_obsidian2 = require("obsidian");
var SyncManager = class {
  constructor(app, api, briefId) {
    this.app = app;
    this.api = api;
    this.briefId = briefId;
  }
  async push() {
    const files = this.app.vault.getMarkdownFiles();
    let count = 0;
    for (const file of files) {
      if (file.path.startsWith("."))
        continue;
      try {
        const content = await this.app.vault.read(file);
        await this.api.writeFile(this.briefId, file.path, content);
        count++;
      } catch (e) {
        console.warn(`[MindVault] Failed to push ${file.path}:`, e);
      }
    }
    return count;
  }
  async pull() {
    const remoteFiles = await this.api.listFiles(this.briefId);
    const flat = this.api.flattenFiles(remoteFiles);
    let count = 0;
    for (const { path, isDir } of flat) {
      const normalized = (0, import_obsidian2.normalizePath)(path);
      if (isDir) {
        const folder = this.app.vault.getAbstractFileByPath(normalized);
        if (!folder) {
          await this.app.vault.createFolder(normalized).catch(() => {
          });
        }
        continue;
      }
      if (!path.endsWith(".md"))
        continue;
      try {
        const content = await this.api.readFile(this.briefId, path);
        const existing = this.app.vault.getAbstractFileByPath(normalized);
        if (existing instanceof import_obsidian2.TFile) {
          await this.app.vault.modify(existing, content);
        } else {
          const parts = normalized.split("/");
          if (parts.length > 1) {
            const dirPath = parts.slice(0, -1).join("/");
            const dir = this.app.vault.getAbstractFileByPath(dirPath);
            if (!dir)
              await this.app.vault.createFolder(dirPath).catch(() => {
              });
          }
          await this.app.vault.create(normalized, content);
        }
        count++;
      } catch (e) {
        console.warn(`[MindVault] Failed to pull ${path}:`, e);
      }
    }
    return count;
  }
  async fullSync() {
    const pushed = await this.push();
    const pulled = await this.pull();
    return { pushed, pulled };
  }
};

// src/main.ts
var MINDVAULT_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" stroke-width="8"/><path d="M30 50 Q50 20 70 50 Q50 80 30 50Z" fill="currentColor"/></svg>`;
var MindVaultPlugin = class extends import_obsidian3.Plugin {
  constructor() {
    super(...arguments);
    this.syncIntervalId = null;
    this.isSyncing = false;
  }
  async onload() {
    await this.loadSettings();
    (0, import_obsidian3.addIcon)("mindvault", MINDVAULT_ICON);
    this.addRibbonIcon("mindvault", "MindVault Sync", () => {
      if (!this.settings.token) {
        new import_obsidian3.Notice("\u041F\u043E\u0434\u043A\u043B\u044E\u0447\u0438 MindVault \u0432 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0430\u0445 \u043F\u043B\u0430\u0433\u0438\u043D\u0430");
        this.openSettings();
        return;
      }
      if (!this.settings.briefId) {
        new import_obsidian3.Notice("\u0412\u044B\u0431\u0435\u0440\u0438 \u0430\u0441\u0441\u0438\u0441\u0442\u0435\u043D\u0442\u0430 \u0432 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0430\u0445 \u043F\u043B\u0430\u0433\u0438\u043D\u0430");
        this.openSettings();
        return;
      }
      this.runSync();
    });
    this.statusBarEl = this.addStatusBarItem();
    this.updateStatusBar();
    this.addSettingTab(new MindVaultSettingTab(this.app, this));
    this.registerObsidianProtocolHandler("mindvault-callback", async (params) => {
      const token = params.token;
      if (!token) {
        new import_obsidian3.Notice("MindVault: \u043E\u0448\u0438\u0431\u043A\u0430 \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u0438 \u2014 \u0442\u043E\u043A\u0435\u043D \u043D\u0435 \u043F\u043E\u043B\u0443\u0447\u0435\u043D");
        return;
      }
      this.settings.token = token;
      await this.saveSettings();
      try {
        const api = new MindVaultApi(this.settings.apiUrl, token);
        const me = await api.getMe();
        this.settings.userEmail = me.email;
        this.settings.userName = me.name || me.email;
        await this.saveSettings();
        new import_obsidian3.Notice(`MindVault \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0451\u043D: ${me.email}`);
        this.updateStatusBar();
      } catch (e) {
        new import_obsidian3.Notice("MindVault \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0451\u043D, \u043D\u043E \u043D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u043F\u0440\u043E\u0444\u0438\u043B\u044C");
      }
    });
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
      this.statusBarEl.setText("MV: \u043D\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0451\u043D");
    } else if (!this.settings.briefId) {
      this.statusBarEl.setText("MV: \u0432\u044B\u0431\u0435\u0440\u0438 \u0430\u0441\u0441\u0438\u0441\u0442\u0435\u043D\u0442\u0430");
    } else {
      const now = new Date().toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });
      this.statusBarEl.setText(`MV: \u0441\u0438\u043D\u043A ${now}`);
    }
  }
  resetSyncInterval() {
    if (this.syncIntervalId !== null) {
      window.clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
    }
    if (!this.settings.token || !this.settings.briefId)
      return;
    const ms = this.settings.syncIntervalMinutes * 60 * 1e3;
    this.syncIntervalId = window.setInterval(() => {
      this.runSync(true);
    }, ms);
  }
  async runSync(silent = false) {
    if (this.isSyncing) {
      if (!silent)
        new import_obsidian3.Notice("\u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u044F \u0443\u0436\u0435 \u0432\u044B\u043F\u043E\u043B\u043D\u044F\u0435\u0442\u0441\u044F...");
      return;
    }
    if (!this.settings.token || !this.settings.briefId) {
      new import_obsidian3.Notice("MindVault: \u043D\u0430\u0441\u0442\u0440\u043E\u0439 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435 \u0432 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0430\u0445");
      return;
    }
    this.isSyncing = true;
    this.statusBarEl.setText("MV: \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u044F...");
    if (!silent)
      new import_obsidian3.Notice("MindVault: \u043D\u0430\u0447\u0430\u043B\u043E \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u0438...");
    try {
      const api = new MindVaultApi(this.settings.apiUrl, this.settings.token);
      const sync = new SyncManager(this.app, api, this.settings.briefId);
      const { pushed, pulled } = await sync.fullSync();
      const msg = `MindVault: \u0441\u0438\u043D\u043A \u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043D \u2014 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u043E ${pushed}, \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u043E ${pulled} \u0444\u0430\u0439\u043B\u043E\u0432`;
      if (!silent)
        new import_obsidian3.Notice(msg);
      console.log("[MindVault]", msg);
    } catch (e) {
      const msg = `MindVault: \u043E\u0448\u0438\u0431\u043A\u0430 \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u0438 \u2014 ${e.message}`;
      new import_obsidian3.Notice(msg);
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
    new import_obsidian3.Notice("\u041E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u0431\u0440\u0430\u0443\u0437\u0435\u0440 \u0438 \u0440\u0430\u0437\u0440\u0435\u0448\u0438\u0442\u0435 \u0434\u043E\u0441\u0442\u0443\u043F MindVault");
  }
  openSettings() {
    this.app.setting.open();
    this.app.setting.openTabById("mindvault-sync");
  }
};
