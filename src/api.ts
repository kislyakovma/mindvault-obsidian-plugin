import { requestUrl, RequestUrlParam } from "obsidian";

export interface Brief {
  id: string;
  title: string;
  botStatus: string;
}

export interface VaultFile {
  path: string;
  name: string;
  isDir: boolean;
  children?: VaultFile[];
}

export interface UserInfo {
  id: string;
  email: string;
  name?: string;
}

export class MindVaultApi {
  constructor(private apiUrl: string, private token: string) {}

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const params: RequestUrlParam = {
      url: `${this.apiUrl}${path}`,
      method,
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
    };
    if (body !== undefined) {
      params.body = JSON.stringify(body);
    }
    const response = await requestUrl(params);
    if (response.status === 204) return undefined as T;
    return response.json as T;
  }

  async getMe(): Promise<UserInfo> {
    return this.request<UserInfo>("GET", "/api/auth/me");
  }

  async getBriefs(): Promise<Brief[]> {
    return this.request<Brief[]>("GET", "/api/brief");
  }

  async listFiles(briefId: string): Promise<VaultFile[]> {
    return this.request<VaultFile[]>("GET", `/api/vault/${briefId}/files`);
  }

  async readFile(briefId: string, path: string): Promise<string> {
    const res = await this.request<{ content: string }>(
      "GET",
      `/api/vault/${briefId}/file?path=${encodeURIComponent(path)}`
    );
    return res.content;
  }

  async writeFile(briefId: string, path: string, content: string): Promise<void> {
    await this.request<void>(
      "PUT",
      `/api/vault/${briefId}/file?path=${encodeURIComponent(path)}`,
      { content }
    );
  }

  async createFile(briefId: string, path: string, isDir: boolean): Promise<void> {
    await this.request<void>("POST", `/api/vault/${briefId}/file`, {
      path,
      isDir,
    });
  }

  async deleteFile(briefId: string, path: string): Promise<void> {
    await this.request<void>(
      "DELETE",
      `/api/vault/${briefId}/file?path=${encodeURIComponent(path)}`
    );
  }

  flattenFiles(files: VaultFile[], prefix = ""): { path: string; isDir: boolean }[] {
    const result: { path: string; isDir: boolean }[] = [];
    for (const f of files) {
      const fullPath = prefix ? `${prefix}/${f.name}` : f.name;
      result.push({ path: fullPath, isDir: f.isDir });
      if (f.isDir && f.children) {
        result.push(...this.flattenFiles(f.children, fullPath));
      }
    }
    return result;
  }
}
