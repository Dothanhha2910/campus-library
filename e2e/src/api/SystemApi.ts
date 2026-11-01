import { ApiClient, ApiResponse } from './ApiClient';

/** /api/health and /api/config */
export class SystemApi {
  constructor(private readonly client: ApiClient) {}

  health(): Promise<ApiResponse<{ status: string }>> {
    return this.client.send('GET', '/health');
  }
}
