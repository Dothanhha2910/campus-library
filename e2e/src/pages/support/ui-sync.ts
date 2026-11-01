import type { Locator, Page, Response } from '@playwright/test';

export interface RequestMatcher {
  /** HTTP method(s) of the request to wait for. */
  method: string | string[];
  /** Pathname of the request, e.g. '/api/books' or /^\/api\/loans\/\d+\/return$/. */
  path: string | RegExp;
  /** Optional extra condition on the request URL (query string, ...). */
  where?: (url: URL) => boolean;
}

function matches(response: Response, matcher: RequestMatcher): boolean {
  const methods = Array.isArray(matcher.method) ? matcher.method : [matcher.method];
  if (!methods.includes(response.request().method())) return false;
  const url = new URL(response.url());
  const pathOk = typeof matcher.path === 'string' ? url.pathname === matcher.path : matcher.path.test(url.pathname);
  return pathOk && (matcher.where ? matcher.where(url) : true);
}

/** Waits until the browser has had two frames to paint after the last DOM change. */
export async function settleUi(page: Page): Promise<void> {
  await page.evaluate(
    () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
  );
}

/**
 * Runs `trigger` (a click, typing, ...) and resolves once the matching API response has been
 * fully received and the page has rendered the outcome. Keeps page objects free of sleeps.
 */
export async function waitForApi(page: Page, matcher: RequestMatcher, trigger: () => Promise<unknown>): Promise<Response> {
  const pending = page.waitForResponse((response) => matches(response, matcher));
  await trigger();
  const response = await pending;
  await response.finished();
  await settleUi(page);
  return response;
}

/**
 * Like `waitForApi` but for actions that fire several requests (for example "save" followed by
 * "reload the list"). All waiters are registered before the trigger runs.
 */
export async function waitForAllApis(page: Page, matchers: RequestMatcher[], trigger: () => Promise<unknown>): Promise<void> {
  const pending = matchers.map((matcher) => page.waitForResponse((response) => matches(response, matcher)));
  await trigger();
  const responses = await Promise.all(pending);
  await Promise.all(responses.map((response) => response.finished()));
  await settleUi(page);
}

/**
 * Text of an element, or '' when the element is not on the page. Error getters use it so that a
 * form which unexpectedly closed (because the app accepted invalid input) produces a readable
 * assertion failure ("expected <message>, received ''") instead of a locator timeout.
 */
export async function readText(locator: Locator): Promise<string> {
  if ((await locator.count()) === 0) return '';
  return ((await locator.first().textContent()) ?? '').trim();
}
