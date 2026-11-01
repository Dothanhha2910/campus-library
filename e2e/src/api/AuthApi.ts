import { ApiClient, ApiResponse } from './ApiClient';
import type { ApiUser } from './models';

export type AuthResult = { token: string; user: ApiUser };

/** /api/auth/* */
export class AuthApi {
  constructor(private readonly client: ApiClient) {}

  register(data: { name: unknown; email: unknown; password: unknown }): Promise<ApiResponse<AuthResult>> {
    return this.client.send('POST', '/auth/register', { body: data });
  }

  login(data: { email: unknown; password: unknown }): Promise<ApiResponse<AuthResult>> {
    return this.client.send('POST', '/auth/login', { body: data });
  }

  google(credential: string): Promise<ApiResponse<AuthResult>> {
    return this.client.send('POST', '/auth/google', { body: { credential } });
  }

  /** Mock-mode Google credential for the given account. */
  googleMock(email: string, name: string): Promise<ApiResponse<AuthResult>> {
    return this.google(`mock:${email}:${name}`);
  }

  me(token?: string): Promise<ApiResponse<{ user: ApiUser }>> {
    return this.client.send('GET', '/auth/me', { token });
  }

  logout(token?: string): Promise<ApiResponse<null>> {
    return this.client.send('POST', '/auth/logout', { token });
  }
}
