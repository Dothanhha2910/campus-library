import { ApiClient, ApiResponse } from './ApiClient';
import type { ApiPage, ApiStats, ApiUser, Query } from './models';

/** /api/admin/* */
export class AdminApi {
  constructor(private readonly client: ApiClient) {}

  stats(token: string | undefined): Promise<ApiResponse<ApiStats>> {
    return this.client.send('GET', '/admin/stats', { token });
  }

  users(token: string | undefined, query: Query = {}): Promise<ApiResponse<ApiPage<ApiUser>>> {
    return this.client.send('GET', '/admin/users', { token, query });
  }

  setRole(token: string | undefined, userId: number, role: string): Promise<ApiResponse<{ user: ApiUser }>> {
    return this.client.send('PATCH', `/admin/users/${userId}/role`, { token, body: { role } });
  }

  setActive(token: string | undefined, userId: number, active: boolean): Promise<ApiResponse<{ user: ApiUser }>> {
    return this.client.send('PATCH', `/admin/users/${userId}/active`, { token, body: { active } });
  }

  unlock(token: string | undefined, userId: number): Promise<ApiResponse<{ user: ApiUser }>> {
    return this.client.send('POST', `/admin/users/${userId}/unlock`, { token });
  }
}
