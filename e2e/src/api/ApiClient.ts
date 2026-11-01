import type { APIRequestContext } from '@playwright/test';

export interface ApiResponse<T = any> {
  status: number;
  body: T;
}

export interface SendOptions {
  token?: string;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
}

/** Thin HTTP wrapper shared by every API object. It knows nothing about endpoints. */
export class ApiClient {
  constructor(private readonly request: APIRequestContext) {}

  async send<T = any>(method: string, path: string, options: SendOptions = {}): Promise<ApiResponse<T>> {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(options.query ?? {})) {
      if (value !== undefined && value !== '') params.set(key, String(value));
    }
    const url = `/api${path}${params.size ? `?${params}` : ''}`;
    const response = await this.request.fetch(url, {
      method,
      headers: options.token ? { Authorization: `Bearer ${options.token}` } : undefined,
      data: options.body,
      failOnStatusCode: false,
    });
    const text = await response.text();
    return { status: response.status(), body: (text ? JSON.parse(text) : null) as T };
  }
}
