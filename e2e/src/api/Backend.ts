import type { APIRequestContext } from '@playwright/test';
import { AdminApi } from './AdminApi';
import { ApiClient } from './ApiClient';
import { AuthApi } from './AuthApi';
import { BooksApi } from './BooksApi';
import { LoansApi } from './LoansApi';
import { ProfileApi } from './ProfileApi';
import { SystemApi } from './SystemApi';

/** Entry point to the REST API: one object per resource group. */
export class Backend {
  readonly auth: AuthApi;
  readonly books: BooksApi;
  readonly loans: LoansApi;
  readonly profile: ProfileApi;
  readonly admin: AdminApi;
  readonly system: SystemApi;

  constructor(request: APIRequestContext) {
    const client = new ApiClient(request);
    this.auth = new AuthApi(client);
    this.books = new BooksApi(client);
    this.loans = new LoansApi(client);
    this.profile = new ProfileApi(client);
    this.admin = new AdminApi(client);
    this.system = new SystemApi(client);
  }
}
