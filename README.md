# MindVault Sync

Sync your Obsidian vault with your [MindVault](https://mvault.ru) AI assistant.

## Features

- **Two-way sync** — push your notes to MindVault, pull them back to Obsidian
- **Auto-sync** — syncs in the background every N minutes (configurable, default 15)
- **One-click connect** — OAuth flow, no manual API key entry needed
- **Ribbon button** — manual sync from the sidebar
- **Status bar** — shows last sync time

## Installation

### Via BRAT (recommended while awaiting Community Plugins review)

1. Install [BRAT](https://github.com/TfTHacker/obsidian42-brat)
2. Add repository: `kislyakovma/mindvault-obsidian-plugin`

### Manual

1. Download `main.js`, `manifest.json`, `styles.css` from the [latest release](https://github.com/kislyakovma/mindvault-obsidian-plugin/releases)
2. Create folder `.obsidian/plugins/mindvault-sync/` in your vault
3. Copy the files there
4. In Obsidian: Settings → Community plugins → Enable **MindVault Sync**

## Setup

1. Open plugin settings → click **Connect**
2. Authorize in the browser (takes ~10 seconds)
3. Select which assistant to sync with
4. Press the 🔵 button in the sidebar or wait for auto-sync

## How it works

- **Push** — all `.md` files from Obsidian are sent to the MindVault vault
- **Pull** — files from MindVault vault are downloaded to Obsidian
- Conflict resolution: push first, then pull (last-write-wins)

## Privacy

The plugin only communicates with `api.mvault.ru`. No data is sent to any third parties. Network requests only happen after explicit user authorization.

## Requirements

A [MindVault](https://mvault.ru) account with an active AI assistant.

---

## На русском

### Установка через BRAT

1. Установи плагин [BRAT](https://github.com/TfTHacker/obsidian42-brat)
2. Добавь репозиторий: `kislyakovma/mindvault-obsidian-plugin`

### Использование

1. Настройки плагина → **Подключить**
2. Разреши доступ в браузере
3. Выбери ассистента из списка
4. Нажми кнопку в сайдбаре или жди автосинхронизации

## Разработка

```bash
npm install
npm run build   # собрать main.js
```
