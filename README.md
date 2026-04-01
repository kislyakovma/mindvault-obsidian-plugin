# MindVault Sync — плагин для Obsidian

Синхронизирует твой Obsidian vault с [MindVault](https://mvault.ru) AI-ассистентом.

## Установка

1. Скачай `main.js` и `manifest.json` из [последнего релиза](https://github.com/kislyakovma/mindvault-obsidian-plugin/releases)
2. Создай папку `.obsidian/plugins/mindvault-sync/` в своём vault
3. Скопируй оба файла туда
4. В Obsidian: Настройки → Сторонние плагины → Включи "MindVault Sync"

## Использование

1. Зайди в настройки плагина → нажми **Подключить**
2. В браузере разреши доступ к своему аккаунту MindVault
3. Выбери ассистента из выпадающего списка
4. Нажми кнопку 🔵 в боковой панели или дождись автосинхронизации (каждые 15 минут по умолчанию)

## Как работает

- **Push** — все `.md` файлы из Obsidian отправляются в vault ассистента
- **Pull** — файлы из vault ассистента скачиваются в Obsidian
- Конфликты решаются по принципу "последний пишет побеждает" (сначала push, потом pull)

## Разработка

```bash
npm install
npm run build   # собрать main.js
npm run dev     # пересборка при изменениях
```
