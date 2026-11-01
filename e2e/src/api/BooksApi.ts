import { ApiClient, ApiResponse } from './ApiClient';
import type { ApiBook, ApiPage, Query } from './models';
import type { BookInput } from '../support/data';

/** /api/books/* */
export class BooksApi {
  constructor(private readonly client: ApiClient) {}

  list(token: string | undefined, query: Query = {}): Promise<ApiResponse<ApiPage<ApiBook>>> {
    return this.client.send('GET', '/books', { token, query });
  }

  categories(token: string | undefined): Promise<ApiResponse<{ categories: string[] }>> {
    return this.client.send('GET', '/books/categories', { token });
  }

  get(token: string | undefined, id: number | string): Promise<ApiResponse<{ book: ApiBook }>> {
    return this.client.send('GET', `/books/${id}`, { token });
  }

  create(token: string | undefined, data: Partial<BookInput> | Record<string, unknown>): Promise<ApiResponse<{ book: ApiBook }>> {
    return this.client.send('POST', '/books', { token, body: data });
  }

  update(token: string | undefined, id: number, data: Partial<BookInput> | Record<string, unknown>): Promise<ApiResponse<{ book: ApiBook }>> {
    return this.client.send('PUT', `/books/${id}`, { token, body: data });
  }

  remove(token: string | undefined, id: number): Promise<ApiResponse<null>> {
    return this.client.send('DELETE', `/books/${id}`, { token });
  }
}
