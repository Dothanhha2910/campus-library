import { ApiClient, ApiResponse } from './ApiClient';
import type { ApiUser } from './models';

/** /api/profile/* */
export class ProfileApi {
  constructor(private readonly client: ApiClient) {}

  get(token: string | undefined): Promise<ApiResponse<{ user: ApiUser; stats: { totalLoans: number; activeLoans: number; finesPaid: number } }>> {
    return this.client.send('GET', '/profile', { token });
  }

  update(token: string | undefined, data: { name?: unknown; phone?: unknown }): Promise<ApiResponse<{ user: ApiUser }>> {
    return this.client.send('PUT', '/profile', { token, body: data });
  }

  changePassword(token: string | undefined, data: { currentPassword?: unknown; newPassword?: unknown }): Promise<ApiResponse<{ message: string }>> {
    return this.client.send('PUT', '/profile/password', { token, body: data });
  }

  remove(token: string | undefined, confirm?: unknown): Promise<ApiResponse<null>> {
    return this.client.send('DELETE', '/profile', { token, body: confirm === undefined ? {} : { confirm } });
  }
}
