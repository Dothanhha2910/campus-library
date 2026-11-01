import { ApiClient, ApiResponse } from './ApiClient';
import type { ApiLoan, ApiPage, Query } from './models';

/** /api/loans/* */
export class LoansApi {
  constructor(private readonly client: ApiClient) {}

  borrow(token: string | undefined, bookId: unknown): Promise<ApiResponse<{ loan: ApiLoan }>> {
    return this.client.send('POST', '/loans', { token, body: { bookId } });
  }

  mine(token: string | undefined, query: Query = {}): Promise<ApiResponse<ApiPage<ApiLoan>>> {
    return this.client.send('GET', '/loans/mine', { token, query });
  }

  all(token: string | undefined, query: Query = {}): Promise<ApiResponse<ApiPage<ApiLoan>>> {
    return this.client.send('GET', '/loans', { token, query });
  }

  giveBack(token: string | undefined, loanId: number): Promise<ApiResponse<{ loan: ApiLoan }>> {
    return this.client.send('POST', `/loans/${loanId}/return`, { token });
  }

  renew(token: string | undefined, loanId: number): Promise<ApiResponse<{ loan: ApiLoan }>> {
    return this.client.send('POST', `/loans/${loanId}/renew`, { token });
  }

  setDueDate(token: string | undefined, loanId: number, dueAt: unknown): Promise<ApiResponse<{ loan: ApiLoan }>> {
    return this.client.send('PATCH', `/loans/${loanId}/due-date`, { token, body: { dueAt } });
  }
}
