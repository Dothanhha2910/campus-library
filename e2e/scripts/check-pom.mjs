// Fails when the suite breaks the Page Object Model rules (see README.md, "POM rules").
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const root = new URL('..', import.meta.url).pathname;

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? files(full) : full.endsWith('.ts') ? [full] : [];
  });
}

/** Removes comments and string contents so that prose and messages cannot trigger a rule. */
function code(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const violations = [];
const report = (file, line, rule) => violations.push(`${relative(root, file)}:${line}  ${rule}`);

function scan(file, rules) {
  const lines = code(readFileSync(file, 'utf8')).split('\n');
  lines.forEach((text, index) => {
    for (const [pattern, message] of rules) if (pattern.test(text)) report(file, index + 1, message);
  });
}

// 1. Specs describe behaviour only: no selectors, no raw Playwright page, no sleeping.
const specRules = [
  [/\.(locator|getByRole|getByText|getByLabel|getByPlaceholder|getByTestId|getByTitle|getByAltText)\s*\(/, 'selector in a spec - move it into a page object'],
  [/\bpage\s*[.,}]/, 'raw `page` used in a spec - use page objects through the `app` fixture'],
  [/from\s+['"]@playwright\/test['"]/, "import test/expect from '../../src/fixtures', not from @playwright/test"],
  [/waitForTimeout\s*\(|setTimeout\s*\(/, 'fixed sleep in a spec'],
  [/from\s+['"][^'"]*\/pages\/(?!App['"])/, 'specs reach page objects through the `app` fixture (type imports of App are fine)'],
];
for (const file of files(join(root, 'tests'))) scan(file, specRules);

// 2. Page objects never assert and never sleep.
const pageRules = [
  [/\bexpect\s*[(.]/, 'assertion inside a page object - return a value and assert in the spec'],
  [/waitForTimeout\s*\(/, 'fixed sleep in a page object - wait for a condition instead'],
  [/\btest\s*\.\s*(describe|step|expect)/, 'test API used inside a page object'],
];
const pageFiles = files(join(root, 'src', 'pages'));
for (const file of pageFiles) scan(file, pageRules);

// 3. Page objects do not depend on each other; only the App registry knows them all.
const SHARED = new Set(['BasePage', 'AuthPage']);
for (const file of pageFiles) {
  const rel = relative(join(root, 'src', 'pages'), file).split(sep).join('/');
  if (rel === 'App.ts' || rel.startsWith('components/') || rel.startsWith('support/')) continue;
  readFileSync(file, 'utf8').split('\n').forEach((text, index) => {
    const match = /^import .* from '(\.\.?\/(?:[\w/]*\/)?(\w+Page))';/.exec(text);
    if (match && !SHARED.has(match[2])) report(file, index + 1, `page object imports another page object (${match[2]})`);
  });
}

// 4. The test layer never reaches into the browser directly.
for (const file of files(join(root, 'src', 'api'))) scan(file, [[/from\s+['"][^'"]*\/pages\//, 'API objects must not depend on page objects']]);

if (violations.length) {
  console.error(`POM check failed (${violations.length}):\n  ${violations.join('\n  ')}`);
  process.exit(1);
}
console.log('POM check passed: no selectors in specs, no assertions in page objects, no page-to-page imports.');
