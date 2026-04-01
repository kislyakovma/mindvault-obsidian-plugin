import { App, PluginSettingTab, Setting, Notice } from "obsidian";
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

    containerEl.createEl("h2", { text: "MindVault Sync" });

    // Connection status
    if (this.plugin.settings.token) {
      const info = containerEl.createEl("p", {
        text: `Подключён${this.plugin.settings.userEmail ? ": " + this.plugin.settings.userEmail : ""}`,
        cls: "setting-item-description",
      });
      info.style.color = "var(--color-green)";

      new Setting(containerEl)
        .setName("Отключить")
        .setDesc("Выйти из аккаунта MindVault")
        .addButton((btn) =>
          btn
            .setButtonText("Отключить")
            .setWarning()
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
      new Setting(containerEl)
        .setName("Подключить MindVault")
        .setDesc("Откроет браузер для авторизации")
        .addButton((btn) =>
          btn.setButtonText("Подключить").setCta().onClick(() => {
            this.plugin.startOAuthFlow();
          })
        );
    }

    // API URL
    new Setting(containerEl)
      .setName("API URL")
      .setDesc("URL MindVault API (не меняй без нужды)")
      .addText((text) =>
        text
          .setPlaceholder("https://api.mvault.ru")
          .setValue(this.plugin.settings.apiUrl)
          .onChange(async (value) => {
            this.plugin.settings.apiUrl = value.trim() || "https://api.mvault.ru";
            await this.plugin.saveSettings();
          })
      );

    // Brief selector
    if (this.plugin.settings.token) {
      const briefSetting = new Setting(containerEl)
        .setName("Ассистент")
        .setDesc("Выбери, с каким ассистентом синхронизировать vault");

      const select = briefSetting.controlEl.createEl("select");
      select.style.width = "100%";

      const loadOption = select.createEl("option", { text: "Загрузка...", value: "" });

      // Load briefs async
      const api = new MindVaultApi(this.plugin.settings.apiUrl, this.plugin.settings.token);
      api.getBriefs().then((briefs) => {
        loadOption.remove();
        if (briefs.length === 0) {
          select.createEl("option", { text: "Нет ассистентов", value: "" });
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
        loadOption.text = "Ошибка загрузки";
      });
    }

    // Sync interval
    new Setting(containerEl)
      .setName("Интервал синхронизации (минуты)")
      .setDesc("Как часто автоматически синхронизировать (1-60)")
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

    // Manual sync
    if (this.plugin.settings.token && this.plugin.settings.briefId) {
      new Setting(containerEl)
        .setName("Синхронизировать сейчас")
        .setDesc("Запустить полную синхронизацию вручную")
        .addButton((btn) =>
          btn.setButtonText("Синхронизировать").onClick(() => {
            this.plugin.runSync();
          })
        );
    }
  }
}
