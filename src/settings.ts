import { App, PluginSettingTab, Setting } from "obsidian";
import type MindVaultPlugin from "./main";
import { MindVaultApi } from "./api";

export interface MindVaultSettings {
  apiUrl: string;
  token: string;
  briefId: string;
  syncIntervalMinutes: number;
  userEmail: string;
  userName: string;
}

export const DEFAULT_SETTINGS: MindVaultSettings = {
  apiUrl: "https://api.mvault.ru",
  token: "",
  briefId: "",
  syncIntervalMinutes: 15,
  userEmail: "",
  userName: "",
};

export class MindVaultSettingTab extends PluginSettingTab {
  plugin: MindVaultPlugin;

  constructor(app: App, plugin: MindVaultPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass("mindvault-settings");

    new Setting(containerEl).setName("MindVault sync").setHeading();

    // Connection status
    if (this.plugin.settings.token) {
      const badge = containerEl.createEl("div", { cls: "mindvault-status-connected" });
      badge.createEl("span", { text: "●" });
      badge.createEl("span", {
        text: this.plugin.settings.userEmail
          ? `Connected: ${this.plugin.settings.userEmail}`
          : "Connected",
      });

      new Setting(containerEl)
        .setName("Account")
        .setDesc("Disconnect from your MindVault account")
        .addButton((btn) =>
          btn
            .setButtonText("Disconnect")
            .setClass("mindvault-btn-disconnect")
            .onClick(async () => {
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
      badge.createEl("span", { text: "○" });
      badge.createEl("span", { text: "Not connected" });

      new Setting(containerEl)
        .setName("Connect MindVault")
        .setDesc("Opens a browser for authorization — takes about 10 seconds")
        .addButton((btn) =>
          btn
            .setButtonText("Connect →")
            .setClass("mindvault-btn-connect")
            .onClick(() => this.plugin.startOAuthFlow())
        );
    }

    // Brief selector
    if (this.plugin.settings.token) {
      const briefSetting = new Setting(containerEl)
        .setName("Assistant")
        .setDesc("Which assistant to sync with");

      const select = briefSetting.controlEl.createEl("select", {
        cls: "mindvault-brief-select",
      });

      const loadOption = select.createEl("option", { text: "Loading...", value: "" });

      const api = new MindVaultApi(this.plugin.settings.apiUrl, this.plugin.settings.token);
      void api.getBriefs().then((briefs) => {
        loadOption.remove();
        if (briefs.length === 0) {
          select.createEl("option", { text: "No assistants found", value: "" });
          return;
        }
        for (const b of briefs) {
          const opt = select.createEl("option", {
            text: `${b.title}${b.botStatus === "active" ? " ✓" : ""}`,
            value: b.id,
          });
          if (b.id === this.plugin.settings.briefId) opt.selected = true;
        }
        select.onchange = async () => {
          this.plugin.settings.briefId = select.value;
          await this.plugin.saveSettings();
        };
      }).catch(() => {
        loadOption.text = "Failed to load";
      });
    }

    // Sync interval
    new Setting(containerEl)
      .setName("Auto-sync interval (minutes)")
      .setDesc("How often to sync in the background")
      .addSlider((slider) =>
        slider
          .setLimits(1, 60, 1)
          .setValue(this.plugin.settings.syncIntervalMinutes)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.syncIntervalMinutes = value;
            await this.plugin.saveSettings();
            this.plugin.resetSyncInterval();
          })
      );

    // API URL
    new Setting(containerEl)
      .setName("API URL")
      .setDesc("Do not change unless instructed")
      .addText((text) =>
        text
          .setPlaceholder("https://api.mvault.ru")
          .setValue(this.plugin.settings.apiUrl)
          .onChange(async (value) => {
            this.plugin.settings.apiUrl = value.trim() || "https://api.mvault.ru";
            await this.plugin.saveSettings();
          })
      );

    // Manual sync
    if (this.plugin.settings.token && this.plugin.settings.briefId) {
      new Setting(containerEl)
        .setName("Sync now")
        .setDesc("Run a full synchronization manually")
        .addButton((btn) =>
          btn
            .setButtonText("⟳ Sync")
            .setClass("mindvault-btn-sync")
            .onClick(() => { void this.plugin.runSync() })
        );
    }
  }
}
