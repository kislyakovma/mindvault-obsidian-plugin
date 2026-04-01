import { App, TFile, TFolder, normalizePath } from "obsidian";
import { MindVaultApi } from "./api";

export class SyncManager {
  constructor(private app: App, private api: MindVaultApi, private briefId: string) {}

  async push(): Promise<number> {
    const files = this.app.vault.getMarkdownFiles();
    let count = 0;
    for (const file of files) {
      if (file.path.startsWith(".")) continue;
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

  async pull(): Promise<number> {
    const remoteFiles = await this.api.listFiles(this.briefId);
    const flat = this.api.flattenFiles(remoteFiles);
    let count = 0;

    for (const { path, isDir } of flat) {
      const normalized = normalizePath(path);
      if (isDir) {
        const folder = this.app.vault.getAbstractFileByPath(normalized);
        if (!folder) {
          await this.app.vault.createFolder(normalized).catch(() => {});
        }
        continue;
      }
      if (!path.endsWith(".md")) continue;
      try {
        const content = await this.api.readFile(this.briefId, path);
        const existing = this.app.vault.getAbstractFileByPath(normalized);
        if (existing instanceof TFile) {
          await this.app.vault.modify(existing, content);
        } else {
          // Ensure parent folder exists
          const parts = normalized.split("/");
          if (parts.length > 1) {
            const dirPath = parts.slice(0, -1).join("/");
            const dir = this.app.vault.getAbstractFileByPath(dirPath);
            if (!dir) await this.app.vault.createFolder(dirPath).catch(() => {});
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

  async fullSync(): Promise<{ pushed: number; pulled: number }> {
    const pushed = await this.push();
    const pulled = await this.pull();
    return { pushed, pulled };
  }
}
