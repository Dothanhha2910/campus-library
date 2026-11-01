/* Campus Library - single-page frontend (vanilla JS, no build step).
 * Frontend defects are guarded by bug('<ID>') - see instructor/ANSWER_KEY.md. */
'use strict';

/* ---------------------------------------------------------------- helpers */
const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const state = { user: null, config: { rules: {} }, token: localStorage.getItem('token') };
const bug = () => !!state.config.injectBugs; // frontend planted bugs follow the server flag

const ICONS = {
  book: '<path d="M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2z"/><path d="M4 21V5"/>',
  library: '<path d="m16 6 4 14"/><path d="M12 6v14"/><path d="M8 8v12"/><path d="M4 4v16"/>',
  loans: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M3 10h18M8 2v4M16 2v4"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
  out: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  check: '<path d="m5 12 5 5 9-10"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v5h1"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m3 7 9 6 9-6"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="3"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20a7 7 0 0 1 14 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M22 20a6 6 0 0 0-4.5-5.8"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v5M12 18h.01"/>',
  coin: '<circle cx="12" cy="12" r="9"/><path d="M14.5 9a3 3 0 0 0-5 1.5c0 3.5 5 1.5 5 5A3 3 0 0 1 9 16M12 6.5v1.5M12 16v1.5"/>',
  stack: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
  unlock: '<rect x="4" y="11" width="16" height="10" rx="3"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.5-4M4 13a8 8 0 0 0 14.5 4"/><path d="M5 3v4h4M19 21v-4h-4"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
  cal: '<rect x="3" y="4" width="18" height="17" rx="3"/><path d="M3 10h18M8 2v4M16 2v4"/>',
};
const icon = (name) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ''}</svg>`;

const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-');
const money = (n) => `$${Number(n || 0).toFixed(2)}`;
const initials = (name) => String(name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const hue = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
const coverStyle = (cat) => `background:linear-gradient(135deg,hsl(${hue(cat)} 72% 56%),hsl(${(hue(cat) + 48) % 360} 70% 42%))`;
const debounce = (fn, ms = 300) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

class ApiError extends Error {
  constructor(status, message, fields) { super(message); this.status = status; this.fields = fields || {}; }
}

async function api(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth && state.token) headers.Authorization = `Bearer ${state.token}`;
  let res;
  try {
    res = await fetch('/api' + path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Is the backend running?');
  }
  const data = res.status === 204 ? null : await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && auth && state.user) { endSession(); toast('Your session has expired. Please sign in again.', 'info'); }
    throw new ApiError(res.status, data.error || `Request failed (${res.status})`, data.fields);
  }
  return data;
}
const qs = (obj) => {
  const p = new URLSearchParams();
  Object.entries(obj).forEach(([k, v]) => v !== '' && v !== undefined && v !== null && p.set(k, v));
  return p.toString();
};

/* ---------------------------------------------------------------- toast & dialog */
function toast(message, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="ico">${icon(type === 'success' ? 'check' : type === 'error' ? 'x' : 'info')}</span><span>${esc(message)}</span>`;
  $('#toasts').append(el);
  setTimeout(() => { el.classList.add('leaving'); setTimeout(() => el.remove(), 320); }, 3800);
}

function openModal(html, { small = false, onMount } = {}) {
  const dlg = $('#dialog');
  dlg.innerHTML = `<div class="modal ${small ? 'small' : ''}">${html}</div>`;
  if (!dlg.open) dlg.showModal();
  $$('[data-close]', dlg).forEach((b) => b.addEventListener('click', () => dlg.close()));
  onMount && onMount(dlg);
  return dlg;
}
const closeModal = () => { const d = $('#dialog'); d.open && d.close(); };
$('#dialog').addEventListener('click', (e) => { if (e.target.id === 'dialog') closeModal(); });

function confirmBox({ title, message, okLabel = 'Confirm', danger = false }) {
  return new Promise((resolve) => {
    const dlg = openModal(
      `<h3>${esc(title)}</h3><p class="modal-sub">${esc(message)}</p>
       <div class="modal-actions"><button class="btn btn-ghost" data-close>Cancel</button>
       <button class="btn ${danger ? 'btn-solid-danger' : 'btn-primary'}" id="ok">${esc(okLabel)}</button></div>`,
      { small: true }
    );
    let done = false;
    $('#ok', dlg).addEventListener('click', () => { done = true; dlg.close(); resolve(true); });
    dlg.addEventListener('close', () => !done && resolve(false), { once: true });
  });
}

/* ---------------------------------------------------------------- form helpers */
function showErrors(form, err) {
  $$('.field-error', form).forEach((e) => (e.textContent = ''));
  $$('.input', form).forEach((i) => i.classList.remove('invalid'));
  const box = $('.form-error', form);
  if (box) box.textContent = '';
  const fields = err.fields || {};
  let shown = false;
  Object.entries(fields).forEach(([name, msg]) => {
    const slot = $(`[data-error="${name}"]`, form);
    if (slot) { slot.textContent = msg; shown = true; $(`[name="${name}"]`, form)?.classList.add('invalid'); }
  });
  if (!shown && box) box.textContent = err.message;
}
const clearErrors = (form) => showErrors(form, { fields: {}, message: '' });
const formValues = (form) => Object.fromEntries(new FormData(form));
async function submitForm(form, fn) {
  const btn = $('button[type="submit"]', form);
  btn && (btn.disabled = true);
  clearErrors(form);
  try { await fn(); } catch (e) { if (e instanceof ApiError) showErrors(form, e); else throw e; }
  finally { btn && (btn.disabled = false); }
}
const field = (label, name, { type = 'text', value = '', placeholder = '', hint = '', attrs = '' } = {}) =>
  `<div class="field"><label for="f-${name}">${label}</label>
   <input class="input" id="f-${name}" name="${name}" type="${type}" value="${esc(value)}" placeholder="${esc(placeholder)}" ${attrs}/>
   ${hint ? `<div class="hint">${hint}</div>` : ''}<div class="field-error" data-error="${name}"></div></div>`;

/* ---------------------------------------------------------------- session */
function setSession(token, user) {
  state.token = token; state.user = user;
  localStorage.setItem('token', token);
}
function endSession() {
  state.user = null; state.token = null;
  localStorage.removeItem('token');
  go('#/login');
}
const theme = {
  toggle() {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('theme', next);
    const b = $('#theme-btn'); if (b) b.innerHTML = icon(next === 'dark' ? 'sun' : 'moon');
  },
};

/* ---------------------------------------------------------------- router */
const go = (hash) => { if (location.hash === hash) route(); else location.hash = hash; };
window.addEventListener('hashchange', route);

const PAGES = {
  '#/books': { render: booksPage, nav: 'Books', ico: 'library' },
  '#/loans': { render: loansPage, nav: 'My Loans', ico: 'loans' },
  '#/profile': { render: profilePage, nav: 'Profile', ico: 'user' },
  '#/admin': { render: adminPage, nav: 'Admin', ico: 'shield', admin: true },
};

async function route() {
  const hash = location.hash || '#/books';
  if (!state.user) {
    if (state.token) {
      try { state.user = (await api('/auth/me')).user; } catch { state.token = null; localStorage.removeItem('token'); }
    }
  }
  if (!state.user) {
    return renderAuth(hash === '#/register' ? 'register' : 'login');
  }
  if (hash === '#/login' || hash === '#/register') return go('#/books');
  const page = PAGES[hash];
  if (!page || (page.admin && state.user.role !== 'admin')) return go('#/books');
  renderShell();
  $$('.nav a').forEach((a) => a.classList.toggle('active', a.getAttribute('href') === hash));
  const main = $('#main');
  main.innerHTML = '';
  await page.render(main);
}

function renderShell() {
  if ($('#main')) { updateUserChip(); return; }
  $('#app').innerHTML = `
    <header class="topbar"><div class="topbar-inner">
      <a class="brand" href="#/books"><span class="brand-mark">${icon('book')}</span>Campus Library</a>
      <nav class="nav" id="nav"></nav><span class="spacer"></span>
      <button class="icon-btn" id="theme-btn" title="Toggle theme"></button>
      <div class="user-chip" id="user-chip"></div>
      <button class="icon-btn" id="logout-btn" title="Sign out">${icon('out')}</button>
    </div></header>
    <main class="page" id="main"></main>`;
  $('#nav').innerHTML = Object.entries(PAGES)
    .filter(([, p]) => !p.admin || state.user.role === 'admin')
    .map(([h, p]) => `<a href="${h}">${icon(p.ico)}<span>${p.nav}</span></a>`).join('');
  $('#theme-btn').innerHTML = icon(document.documentElement.dataset.theme === 'dark' ? 'sun' : 'moon');
  $('#theme-btn').addEventListener('click', theme.toggle);
  $('#logout-btn').addEventListener('click', logout);
  updateUserChip();
}
function updateUserChip() {
  $('#user-chip').innerHTML = `<span class="avatar">${esc(initials(state.user.name))}</span>
    <span class="meta"><b>${esc(state.user.name)}</b><span>${esc(state.user.role)}</span></span>`;
}
async function logout() {
  try { await api('/auth/logout', { method: 'POST' }); } catch { /* ignore */ }
  // BUG AUTH-5: the token is left in localStorage, so a page refresh signs the user straight back in
  if (bug()) { state.user = null; state.token = null; go('#/login'); return; }
  endSession();
}

/* ---------------------------------------------------------------- auth page */
const GOOGLE_SVG = `<svg viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>`;

function renderAuth(mode) {
  const isLogin = mode === 'login';
  $('#app').innerHTML = `
  <div class="auth">
    <section class="auth-hero">
      <div class="brand"><span class="brand-mark">${icon('book')}</span>Campus Library</div>
      <div class="hero-copy">
        <h1>Borrow smarter.<br/>Read more.</h1>
        <p>Browse the catalogue, borrow in one click and never lose track of due dates.</p>
        <div class="hero-points">
          <div class="hero-point"><span class="ico">${icon('search')}</span><div><b>Instant search</b><span>Filter by title, author, ISBN or category</span></div></div>
          <div class="hero-point"><span class="ico">${icon('clock')}</span><div><b>Smart loans</b><span>${state.config.rules.loanDays || 14}-day loans with one renewal</span></div></div>
          <div class="hero-point"><span class="ico">${icon('shield')}</span><div><b>Secure sign-in</b><span>Email &amp; password or Google single sign-on</span></div></div>
        </div>
      </div>
      <div class="hero-foot">SQA Class 10 &middot; System under test</div>
    </section>
    <section class="auth-panel"><div class="auth-card">
      <h2>${isLogin ? 'Welcome back' : 'Create your account'}</h2>
      <p class="sub">${isLogin ? 'Sign in to continue to your library.' : 'Join in less than a minute.'}</p>
      <div class="seg">
        <button class="${isLogin ? 'active' : ''}" data-mode="login">Sign in</button>
        <button class="${!isLogin ? 'active' : ''}" data-mode="register">Register</button>
      </div>
      <form id="auth-form" novalidate>
        <div class="form-error"></div>
        ${isLogin ? '' : field('Full name', 'name', { placeholder: 'Nguyen Van A', attrs: 'autocomplete="name"' })}
        ${field('Email', 'email', { type: 'email', placeholder: 'you@example.com', attrs: 'autocomplete="email"' })}
        ${field('Password', 'password', { type: 'password', placeholder: isLogin ? 'Your password' : 'Min 8 characters, letters + digits', attrs: `autocomplete="${isLogin ? 'current-password' : 'new-password'}"` })}
        <button class="btn btn-primary btn-block" type="submit">${isLogin ? 'Sign in' : 'Create account'}</button>
      </form>
      <div class="divider">or continue with</div>
      <div class="google-wrap" id="google-slot"></div>
      ${isLogin ? `<div class="demo-box"><b>Demo accounts</b><div class="muted">Click to fill the form:</div>
        <div class="chips"><button class="chip-btn" data-fill="admin@library.test|Admin@123">Admin</button>
        <button class="chip-btn" data-fill="user@library.test|User@1234">Member</button></div></div>` : ''}
    </div></section>
  </div>`;

  $$('.seg button').forEach((b) => b.addEventListener('click', () => go('#/' + b.dataset.mode)));
  $$('[data-fill]').forEach((b) => b.addEventListener('click', () => {
    const [e, p] = b.dataset.fill.split('|');
    $('[name=email]').value = e; $('[name=password]').value = p;
  }));
  const form = $('#auth-form');
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    submitForm(form, async () => {
      const v = formValues(form);
      const data = await api(isLogin ? '/auth/login' : '/auth/register', { method: 'POST', auth: false, body: v });
      setSession(data.token, data.user);
      toast(isLogin ? `Welcome back, ${data.user.name}!` : 'Account created. Welcome!', 'success');
      go('#/books');
    });
  });
  mountGoogle($('#google-slot'));
}

async function googleLogin(credential) {
  try {
    const data = await api('/auth/google', { method: 'POST', auth: false, body: { credential } });
    setSession(data.token, data.user);
    toast(`Signed in with Google as ${data.user.email}`, 'success');
    go('#/books');
  } catch (e) { toast(e.message, 'error'); }
}

function mountGoogle(slot) {
  const { googleClientId, googleMock } = state.config;
  if (googleClientId) {
    const init = () => {
      google.accounts.id.initialize({ client_id: googleClientId, callback: (r) => googleLogin(r.credential) });
      google.accounts.id.renderButton(slot, { theme: 'outline', size: 'large', width: 360, text: 'continue_with', shape: 'pill' });
    };
    if (window.google?.accounts) return init();
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client'; s.async = true; s.onload = init;
    s.onerror = () => (slot.innerHTML = '<span class="muted">Could not load Google sign-in.</span>');
    document.head.append(s);
  } else if (googleMock) {
    slot.innerHTML = `<button class="btn-google" type="button">${GOOGLE_SVG}Continue with Google <span class="badge plain" style="margin-left:4px">mock</span></button>`;
    $('button', slot).addEventListener('click', () =>
      openModal(`<h3>Google sign-in (mock)</h3><p class="modal-sub">Simulates a verified Google account. For local testing only.</p>
        <form id="mock-form">${field('Google email', 'email', { type: 'email', value: 'student@gmail.com' })}${field('Display name', 'name', { value: 'Student Google' })}
        <div class="modal-actions"><button type="button" class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" type="submit">Continue</button></div></form>`,
      { small: true, onMount: (d) => $('#mock-form', d).addEventListener('submit', (e) => {
        e.preventDefault(); const v = formValues(e.target); closeModal();
        googleLogin(`mock:${v.email}:${v.name}`);
      }) }));
  } else {
    slot.innerHTML = `<button class="btn-google" type="button" disabled title="Set GOOGLE_CLIENT_ID in backend/.env">${GOOGLE_SVG}Continue with Google</button>`;
  }
}

/* ---------------------------------------------------------------- pagination */
function renderPager(el, { page, totalPages, total }, onChange) {
  const pages = [];
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - page) <= 1) pages.push(p);
    else if (pages[pages.length - 1] !== '…') pages.push('…');
  }
  el.innerHTML = `<button data-p="${page - 1}" ${page <= 1 ? 'disabled' : ''}>&lsaquo;</button>
    ${pages.map((p) => p === '…' ? '<button disabled>…</button>' : `<button data-p="${p}" class="${p === page ? 'active' : ''}">${p}</button>`).join('')}
    <button data-p="${page + 1}" ${page >= totalPages ? 'disabled' : ''}>&rsaquo;</button>
    <div class="info">Page ${page} of ${totalPages} &middot; ${total} result${total === 1 ? '' : 's'}</div>`;
  $$('button[data-p]', el).forEach((b) => b.addEventListener('click', () => onChange(Number(b.dataset.p))));
}
const emptyState = (ic, title, text) =>
  `<div class="empty"><div class="big">${icon(ic)}</div><h3>${esc(title)}</h3><p>${esc(text)}</p></div>`;
const skeletons = (n, cls = '') => Array.from({ length: n }, () => `<div class="skeleton ${cls}"></div>`).join('');

/* ---------------------------------------------------------------- books page */
const booksState = { q: '', category: '', available: false, sort: 'title', order: 'asc', page: 1 };

async function booksPage(main) {
  const isAdmin = state.user.role === 'admin';
  const cats = (await api('/books/categories').catch(() => ({ categories: [] }))).categories;
  main.innerHTML = `
    <div class="page-head"><div><h1>Book catalogue</h1><p>Find your next read and borrow it in one click.</p></div>
      ${isAdmin ? `<button class="btn btn-primary" id="add-book">${icon('plus')}Add book</button>` : ''}</div>
    <div class="toolbar">
      <div class="input-icon">${icon('search')}<input class="input" id="q" placeholder="Search title, author or ISBN…" value="${esc(booksState.q)}"/></div>
      <select class="input" id="category"><option value="">All categories</option>${cats.map((c) => `<option ${c === booksState.category ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>
      <select class="input" id="sort">
        ${[['title', 'Title'], ['author', 'Author'], ['year', 'Year'], ['newest', 'Newest']].map(([v, l]) => `<option value="${v}" ${booksState.sort === v ? 'selected' : ''}>Sort: ${l}</option>`).join('')}
      </select>
      <select class="input" id="order"><option value="asc" ${booksState.order === 'asc' ? 'selected' : ''}>Ascending</option><option value="desc" ${booksState.order === 'desc' ? 'selected' : ''}>Descending</option></select>
      <label class="toggle"><input type="checkbox" id="available" ${booksState.available ? 'checked' : ''}/><span class="track"></span>Available only</label>
    </div>
    <div class="book-grid" id="grid"></div><div class="pager" id="pager"></div>`;

  const changed = (resetPage = true) => { if (resetPage) booksState.page = 1; loadBooks(); };
  $('#q').addEventListener('input', debounce((e) => { booksState.q = e.target.value.trim(); changed(); }));
  // BUG BOOK-6: category / sort / order / availability changes keep the current page number
  // (the page should reset to 1), so users can land on an empty page
  $('#category').addEventListener('change', (e) => { booksState.category = e.target.value; changed(!bug()); });
  $('#sort').addEventListener('change', (e) => { booksState.sort = e.target.value; changed(!bug()); });
  $('#order').addEventListener('change', (e) => { booksState.order = e.target.value; changed(!bug()); });
  $('#available').addEventListener('change', (e) => { booksState.available = e.target.checked; changed(!bug()); });
  isAdmin && $('#add-book').addEventListener('click', () => bookDialog());
  loadBooks();
}

async function loadBooks() {
  const grid = $('#grid'); if (!grid) return;
  grid.innerHTML = skeletons(6);
  try {
    const s = booksState;
    const data = await api('/books?' + qs({ q: s.q, category: s.category, available: s.available ? 'true' : '', sort: s.sort, order: s.order, page: s.page, pageSize: 8 }));
    if (!data.items.length) {
      grid.innerHTML = `<div style="grid-column:1/-1">${emptyState('search', 'No books found', 'Try a different search term or clear the filters.')}</div>`;
    } else {
      const isAdmin = state.user.role === 'admin';
      grid.innerHTML = data.items.map((b, i) => `
        <article class="book" style="animation-delay:${i * 45}ms">
          <div class="cover" style="${coverStyle(b.category)}"><span class="cat">${esc(b.category)}</span><span class="glyph">${esc(initials(b.title))}</span></div>
          <div class="book-body">
            <h3 class="book-title" title="${esc(b.title)}">${esc(b.title)}</h3>
            <div class="book-author">${esc(b.author)}</div>
            <div class="book-meta"><span>${b.year}</span><span>ISBN ${esc(b.isbn)}</span></div>
            <div class="book-foot">
              <span class="badge ${b.copiesAvailable > 0 ? 'ok' : 'bad'}">${b.copiesAvailable}/${b.copiesTotal} available</span>
              <div class="book-actions">
                ${isAdmin ? `<button class="icon-btn" style="width:34px;height:34px" data-edit="${b.id}" title="Edit">${icon('edit')}</button>
                <button class="icon-btn" style="width:34px;height:34px" data-del="${b.id}" title="Delete">${icon('trash')}</button>` : ''}
                <button class="btn btn-primary btn-sm" data-borrow="${b.id}" ${b.copiesAvailable < 1 ? 'disabled' : ''}>Borrow</button>
              </div>
            </div>
          </div>
        </article>`).join('');
      $$('[data-borrow]', grid).forEach((b) => b.addEventListener('click', () => borrowBook(Number(b.dataset.borrow))));
      $$('[data-edit]', grid).forEach((b) => b.addEventListener('click', () => bookDialog(data.items.find((x) => x.id === Number(b.dataset.edit)))));
      $$('[data-del]', grid).forEach((b) => b.addEventListener('click', () => deleteBook(data.items.find((x) => x.id === Number(b.dataset.del)))));
    }
    renderPager($('#pager'), data, (p) => { booksState.page = p; loadBooks(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
  } catch (e) {
    grid.innerHTML = `<div style="grid-column:1/-1">${emptyState('alert', 'Something went wrong', e.message)}</div>`;
    $('#pager').innerHTML = '';
  }
}

async function borrowBook(id) {
  try {
    await api('/loans', { method: 'POST', body: { bookId: id } });
    toast('Book borrowed! Due in ' + (state.config.rules.loanDays || 14) + ' days.', 'success');
  } catch (e) {
    // BUG LOAN-6: failures are reported as success - the user is told the book was borrowed
    if (bug()) toast('Book borrowed! Due in ' + (state.config.rules.loanDays || 14) + ' days.', 'success');
    else toast(e.message, 'error');
  }
  loadBooks();
}

function bookDialog(book) {
  const editing = !!book;
  openModal(`<h3>${editing ? 'Edit book' : 'Add a new book'}</h3><p class="modal-sub">${editing ? 'Update the catalogue entry.' : 'Add a title to the library catalogue.'}</p>
    <form id="book-form" novalidate><div class="form-error"></div>
      ${field('Title', 'title', { value: book?.title })}
      <div class="grid-2">${field('Author', 'author', { value: book?.author })}${field('Category', 'category', { value: book?.category })}</div>
      ${field('ISBN', 'isbn', { value: book?.isbn, hint: '10 or 13 digits, numbers only' })}
      <div class="grid-2">${field('Year', 'year', { type: 'number', value: book?.year ?? '' })}${field('Total copies', 'copiesTotal', { type: 'number', value: book?.copiesTotal ?? '' })}</div>
      <div class="modal-actions"><button type="button" class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" type="submit">${editing ? 'Save changes' : 'Add book'}</button></div>
    </form>`, { onMount: (dlg) => {
      const form = $('#book-form', dlg);
      form.addEventListener('submit', (ev) => {
        ev.preventDefault();
        submitForm(form, async () => {
          const v = formValues(form);
          const body = { ...v, year: v.year === '' ? null : Number(v.year), copiesTotal: v.copiesTotal === '' ? null : Number(v.copiesTotal) };
          await api(editing ? `/books/${book.id}` : '/books', { method: editing ? 'PUT' : 'POST', body });
          closeModal(); toast(editing ? 'Book updated' : 'Book added', 'success'); loadBooks();
        });
      });
    } });
}

async function deleteBook(book) {
  if (!(await confirmBox({ title: 'Delete this book?', message: `"${book.title}" and its loan history will be removed.`, okLabel: 'Delete', danger: true }))) return;
  try { await api(`/books/${book.id}`, { method: 'DELETE' }); toast('Book deleted', 'success'); loadBooks(); }
  catch (e) { toast(e.message, 'error'); }
}

/* ---------------------------------------------------------------- loans page */
const loansState = { status: 'all', page: 1 };
const STATUS_BADGE = { active: ['info', 'Borrowed'], overdue: ['bad', 'Overdue'], returned: ['ok', 'Returned'] };

async function loansPage(main) {
  main.innerHTML = `<div class="page-head"><div><h1>My loans</h1><p>Max ${state.config.rules.maxActiveLoans || 3} books at a time &middot; ${state.config.rules.loanDays || 14}-day loans &middot; ${money(state.config.rules.finePerDay)} per overdue day.</p></div></div>
    <div class="tabs" id="tabs">${['all', 'active', 'overdue', 'returned'].map((s) => `<button data-s="${s}" class="${loansState.status === s ? 'active' : ''}">${s[0].toUpperCase() + s.slice(1)}</button>`).join('')}</div>
    <div class="loan-list" id="list"></div><div class="pager" id="pager"></div>`;
  $$('#tabs button').forEach((b) => b.addEventListener('click', () => {
    loansState.status = b.dataset.s; loansState.page = 1;
    $$('#tabs button').forEach((x) => x.classList.toggle('active', x === b)); loadLoans();
  }));
  loadLoans();
}

function loanRow(l, i, { admin = false } = {}) {
  const [cls, label] = STATUS_BADGE[l.status];
  const open = l.status !== 'returned';
  return `<article class="loan" style="animation-delay:${i * 40}ms">
    <div class="mini" style="${coverStyle(l.bookTitle)}">${esc(initials(l.bookTitle))}</div>
    <div><h4>${esc(l.bookTitle)}</h4>
      <div class="dates"><span>Borrowed ${fmtDate(l.borrowedAt)}</span><span>Due ${fmtDate(l.dueAt)}</span>${l.returnedAt ? `<span>Returned ${fmtDate(l.returnedAt)}</span>` : ''}${l.renewed ? '<span>Renewed</span>' : ''}</div></div>
    <div style="text-align:right"><span class="badge ${cls}">${label}${l.daysOverdue ? ` ${l.daysOverdue}d` : ''}</span>${l.fine ? `<div class="fine">${l.status === 'overdue' ? 'Fine so far ' : 'Fine paid '}${money(l.fine)}</div>` : ''}</div>
    <div class="actions">${open ? `<button class="btn btn-ghost btn-sm" data-return="${l.id}">${icon('undo')}Return</button>
      <button class="btn btn-ghost btn-sm" data-renew="${l.id}">${icon('refresh')}Renew</button>` : ''}</div></article>`;
}

async function loadLoans() {
  const list = $('#list'); if (!list) return;
  list.innerHTML = skeletons(3, 'row-sk');
  try {
    const data = await api('/loans/mine?' + qs({ status: loansState.status, page: loansState.page, pageSize: 6 }));
    list.innerHTML = data.items.length ? data.items.map((l, i) => loanRow(l, i)).join('')
      : emptyState('loans', 'No loans here yet', 'Books you borrow will show up on this page.');
    $$('[data-return]', list).forEach((b) => b.addEventListener('click', () => loanAction(`/loans/${b.dataset.return}/return`, 'Book returned', loadLoans)));
    $$('[data-renew]', list).forEach((b) => b.addEventListener('click', () => loanAction(`/loans/${b.dataset.renew}/renew`, 'Loan renewed', loadLoans)));
    renderPager($('#pager'), data, (p) => { loansState.page = p; loadLoans(); });
  } catch (e) { list.innerHTML = emptyState('alert', 'Something went wrong', e.message); }
}

async function loanAction(path, okMsg, reload) {
  try {
    const { loan } = await api(path, { method: 'POST' });
    toast(loan.fine && path.endsWith('return') ? `${okMsg}. Fine charged: ${money(loan.fine)}` : okMsg, loan.fine && path.endsWith('return') ? 'info' : 'success');
  } catch (e) { toast(e.message, 'error'); }
  reload();
}

/* ---------------------------------------------------------------- profile page */
async function profilePage(main) {
  const { user, stats } = await api('/profile');
  state.user = { ...state.user, ...user }; updateUserChip();
  main.innerHTML = `<div class="page-head"><div><h1>My profile</h1><p>Manage your personal information and security.</p></div></div>
    <div class="profile-grid">
      <div class="card profile-card"><div class="avatar lg">${esc(initials(user.name))}</div>
        <h2>${esc(user.name)}</h2><div class="email">${esc(user.email)}</div>
        <div class="row wrap" style="justify-content:center"><span class="badge brand">${esc(user.role)}</span>${user.google ? '<span class="badge info">Google linked</span>' : ''}</div>
        <div class="mini-stats"><div><b>${stats.totalLoans}</b><span>Total loans</span></div><div><b>${stats.activeLoans}</b><span>Active</span></div><div><b>${money(stats.finesPaid)}</b><span>Fines paid</span></div></div></div>
      <div class="stack">
        <div class="card"><h3>Personal information</h3><p class="card-sub">Your email address cannot be changed.</p>
          <form id="info-form" novalidate><div class="form-error"></div>
            ${field('Email', 'email', { value: user.email, attrs: 'disabled' })}
            <div class="grid-2">${field('Full name', 'name', { value: user.name })}${field('Phone (optional)', 'phone', { value: user.phone || '', placeholder: '+84901234567' })}</div>
            <button class="btn btn-primary" type="submit">Save changes</button></form></div>
        <div class="card"><h3>Change password</h3><p class="card-sub">${user.hasPassword ? 'Use at least 8 characters with a letter and a digit.' : 'You sign in with Google, so there is no password to change.'}</p>
          <form id="pw-form" novalidate><div class="form-error"></div>
            ${field('Current password', 'currentPassword', { type: 'password', attrs: user.hasPassword ? '' : 'disabled' })}
            ${field('New password', 'newPassword', { type: 'password', attrs: user.hasPassword ? '' : 'disabled' })}
            <button class="btn btn-primary" type="submit" ${user.hasPassword ? '' : 'disabled'}>Update password</button></form></div>
        <div class="card danger-card"><h3>Danger zone</h3><p class="card-sub">Deleting your account is permanent. You must return all borrowed books first.</p>
          <button class="btn btn-danger" id="delete-account">${icon('trash')}Delete my account</button></div>
      </div></div>`;

  const info = $('#info-form');
  info.addEventListener('submit', (e) => { e.preventDefault(); submitForm(info, async () => {
    const v = formValues(info);
    const res = await api('/profile', { method: 'PUT', body: { name: v.name, phone: v.phone } });
    state.user = { ...state.user, ...res.user }; updateUserChip(); toast('Profile updated', 'success');
  }); });
  const pw = $('#pw-form');
  pw.addEventListener('submit', (e) => { e.preventDefault(); submitForm(pw, async () => {
    await api('/profile/password', { method: 'PUT', body: formValues(pw) });
    pw.reset(); toast('Password updated', 'success');
  }); });
  $('#delete-account').addEventListener('click', () => {
    openModal(`<h3>Delete your account?</h3><p class="modal-sub">This cannot be undone. Type <b>DELETE</b> to confirm.</p>
      <form id="del-form" novalidate><div class="form-error"></div>${field('Confirmation', 'confirm', { placeholder: 'DELETE' })}
      <div class="modal-actions"><button type="button" class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-solid-danger" type="submit">Delete account</button></div></form>`,
    { small: true, onMount: (dlg) => { const f = $('#del-form', dlg); f.addEventListener('submit', (e) => { e.preventDefault(); submitForm(f, async () => {
      await api('/profile', { method: 'DELETE', body: formValues(f) });
      closeModal(); toast('Your account has been deleted', 'info'); endSession();
    }); }); } });
  });
}

/* ---------------------------------------------------------------- admin page */
const adminState = { tab: 'dashboard', users: { q: '', role: '', active: '', page: 1 }, loans: { q: '', status: 'all', page: 1 } };

async function adminPage(main) {
  main.innerHTML = `<div class="page-head"><div><h1>Administration</h1><p>Monitor the library and manage its users.</p></div></div>
    <div class="tabs" id="tabs">${[['dashboard', 'Dashboard'], ['users', 'Users'], ['loans', 'All loans']].map(([k, l]) => `<button data-t="${k}" class="${adminState.tab === k ? 'active' : ''}">${l}</button>`).join('')}</div>
    <section id="panel"></section>`;
  $$('#tabs button').forEach((b) => b.addEventListener('click', () => {
    adminState.tab = b.dataset.t; $$('#tabs button').forEach((x) => x.classList.toggle('active', x === b)); renderAdminTab();
  }));
  renderAdminTab();
}
const renderAdminTab = () => ({ dashboard: adminDashboard, users: adminUsers, loans: adminLoans })[adminState.tab]($('#panel'));

async function adminDashboard(panel) {
  panel.innerHTML = `<div class="stats">${skeletons(4, 'row-sk')}</div>`;
  try {
    const s = await api('/admin/stats');
    const cards = [
      ['ico-a', 'users', s.users, 'Registered users'], ['ico-b', 'stack', s.books, 'Book titles'],
      ['ico-c', 'book', s.copiesAvailable, 'Copies on shelf'], ['ico-e', 'loans', s.activeLoans, 'Active loans'],
      ['ico-d', 'alert', s.overdueLoans, 'Overdue loans'], ['ico-f', 'coin', money(s.finesCollected), 'Fines collected'],
    ];
    const max = Math.max(1, ...s.topBooks.map((b) => b.loans));
    panel.innerHTML = `<div class="stats">${cards.map(([c, ic, n, l], i) => `<div class="stat" style="animation-delay:${i * 60}ms"><div class="ico ${c}">${icon(ic)}</div><div class="num">${n}</div><div class="label">${l}</div></div>`).join('')}</div>
      <div class="card"><h3>Most borrowed books</h3><p class="card-sub">Top titles by number of loans.</p>
        ${s.topBooks.length ? `<div class="bars">${s.topBooks.map((b) => `<div class="bar-row"><div class="top"><span>${esc(b.title)}</span><span class="muted">${b.loans} loan${b.loans === 1 ? '' : 's'}</span></div><div class="bar"><i style="width:${(b.loans / max) * 100}%"></i></div></div>`).join('')}</div>` : emptyState('book', 'No loans yet', 'Borrowing activity will appear here.')}</div>`;
  } catch (e) { panel.innerHTML = emptyState('alert', 'Something went wrong', e.message); }
}

async function adminUsers(panel) {
  const f = adminState.users;
  panel.innerHTML = `<div class="toolbar"><div class="input-icon">${icon('search')}<input class="input" id="uq" placeholder="Search name or email…" value="${esc(f.q)}"/></div>
    <select class="input" id="urole"><option value="">All roles</option><option value="member" ${f.role === 'member' ? 'selected' : ''}>Members</option><option value="admin" ${f.role === 'admin' ? 'selected' : ''}>Admins</option></select>
    <select class="input" id="uactive"><option value="">Any status</option><option value="true" ${f.active === 'true' ? 'selected' : ''}>Active</option><option value="false" ${f.active === 'false' ? 'selected' : ''}>Deactivated</option></select></div>
    <div class="table-wrap"><table><thead><tr><th>User</th><th>Role</th><th>Status</th><th>Sign-in</th><th>Joined</th><th></th></tr></thead><tbody id="ubody"></tbody></table></div><div class="pager" id="pager"></div>`;
  $('#uq').addEventListener('input', debounce((e) => { f.q = e.target.value.trim(); f.page = 1; loadUsers(); }));
  $('#urole').addEventListener('change', (e) => { f.role = e.target.value; f.page = 1; loadUsers(); });
  $('#uactive').addEventListener('change', (e) => { f.active = e.target.value; f.page = 1; loadUsers(); });
  loadUsers();
}

async function loadUsers() {
  const body = $('#ubody'); if (!body) return;
  const f = adminState.users;
  try {
    const data = await api('/admin/users?' + qs({ ...f, pageSize: 8 }));
    body.innerHTML = data.items.length ? data.items.map((u) => {
      const me = u.id === state.user.id;
      // BUG ADM-5: the user's name is inserted into the page without escaping (stored XSS)
      const nameHtml = bug() ? u.name : esc(u.name);
      return `<tr><td><div class="cell-user"><span class="avatar">${esc(initials(u.name))}</span><div><b>${nameHtml}${me ? ' <span class="badge plain">you</span>' : ''}</b><span>${esc(u.email)}</span></div></div></td>
        <td><select class="input" data-role="${u.id}" ${me ? 'disabled' : ''}><option value="member" ${u.role === 'member' ? 'selected' : ''}>Member</option><option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option></select></td>
        <td><span class="badge ${u.active ? 'ok' : 'bad'}">${u.active ? 'Active' : 'Deactivated'}</span></td>
        <td>${u.google ? '<span class="badge info">Google</span> ' : ''}${u.hasPassword ? '<span class="badge plain">Password</span>' : ''}</td>
        <td class="muted">${fmtDate(u.createdAt)}</td>
        <td><div class="row" style="justify-content:flex-end">
          <button class="btn btn-ghost btn-sm" data-unlock="${u.id}" title="Clear failed-login lock">${icon('unlock')}Unlock</button>
          <button class="btn ${u.active ? 'btn-danger' : 'btn-ghost'} btn-sm" data-toggle="${u.id}" data-active="${u.active}">${u.active ? 'Deactivate' : 'Activate'}</button></div></td></tr>`;
    }).join('') : `<tr><td colspan="6">${emptyState('users', 'No users match', 'Adjust the search or filters.')}</td></tr>`;

    $$('[data-role]', body).forEach((s) => s.addEventListener('change', async () => {
      try { await api(`/admin/users/${s.dataset.role}/role`, { method: 'PATCH', body: { role: s.value } }); toast('Role updated', 'success'); }
      catch (e) { toast(e.message, 'error'); }
      loadUsers();
    }));
    $$('[data-toggle]', body).forEach((b) => b.addEventListener('click', async () => {
      try { await api(`/admin/users/${b.dataset.toggle}/active`, { method: 'PATCH', body: { active: b.dataset.active !== 'true' } }); toast('User updated', 'success'); }
      catch (e) { toast(e.message, 'error'); }
      loadUsers();
    }));
    $$('[data-unlock]', body).forEach((b) => b.addEventListener('click', async () => {
      try { await api(`/admin/users/${b.dataset.unlock}/unlock`, { method: 'POST' }); toast('Account unlocked', 'success'); }
      catch (e) { toast(e.message, 'error'); }
    }));
    renderPager($('#pager'), data, (p) => { f.page = p; loadUsers(); });
  } catch (e) { body.innerHTML = `<tr><td colspan="6">${emptyState('alert', 'Something went wrong', e.message)}</td></tr>`; }
}

async function adminLoans(panel) {
  const f = adminState.loans;
  panel.innerHTML = `<div class="toolbar"><div class="input-icon">${icon('search')}<input class="input" id="lq" placeholder="Search book, member name or email…" value="${esc(f.q)}"/></div>
    <select class="input" id="lstatus">${['all', 'active', 'overdue', 'returned'].map((s) => `<option value="${s}" ${f.status === s ? 'selected' : ''}>${s[0].toUpperCase() + s.slice(1)}</option>`).join('')}</select></div>
    <div class="table-wrap"><table><thead><tr><th>Book</th><th>Member</th><th>Due</th><th>Status</th><th>Fine</th><th></th></tr></thead><tbody id="lbody"></tbody></table></div><div class="pager" id="pager"></div>`;
  $('#lq').addEventListener('input', debounce((e) => { f.q = e.target.value.trim(); f.page = 1; loadAdminLoans(); }));
  $('#lstatus').addEventListener('change', (e) => { f.status = e.target.value; f.page = 1; loadAdminLoans(); });
  loadAdminLoans();
}

async function loadAdminLoans() {
  const body = $('#lbody'); if (!body) return;
  const f = adminState.loans;
  try {
    const data = await api('/loans?' + qs({ ...f, pageSize: 8 }));
    body.innerHTML = data.items.length ? data.items.map((l) => {
      const [cls, label] = STATUS_BADGE[l.status];
      return `<tr><td><b>${esc(l.bookTitle)}</b></td><td><div class="cell-user"><div><b>${esc(l.userName)}</b><span>${esc(l.userEmail)}</span></div></div></td>
        <td>${fmtDate(l.dueAt)}</td><td><span class="badge ${cls}">${label}${l.daysOverdue ? ` ${l.daysOverdue}d` : ''}</span></td><td>${l.fine ? money(l.fine) : '-'}</td>
        <td><div class="row" style="justify-content:flex-end">${l.status !== 'returned' ? `<button class="btn btn-ghost btn-sm" data-due="${l.id}" title="Testing tool: change the due date">${icon('cal')}Set due date</button>
          <button class="btn btn-ghost btn-sm" data-return="${l.id}">${icon('undo')}Return</button>` : ''}</div></td></tr>`;
    }).join('') : `<tr><td colspan="6">${emptyState('loans', 'No loans found', 'Adjust the search or filters.')}</td></tr>`;
    $$('[data-return]', body).forEach((b) => b.addEventListener('click', () => loanAction(`/loans/${b.dataset.return}/return`, 'Book returned', loadAdminLoans)));
    $$('[data-due]', body).forEach((b) => b.addEventListener('click', () => dueDateDialog(Number(b.dataset.due))));
    renderPager($('#pager'), data, (p) => { f.page = p; loadAdminLoans(); });
  } catch (e) { body.innerHTML = `<tr><td colspan="6">${emptyState('alert', 'Something went wrong', e.message)}</td></tr>`; }
}

function dueDateDialog(id) {
  openModal(`<h3>Set due date</h3><p class="modal-sub">Testing tool: move the due date into the past to simulate overdue loans and fines.</p>
    <form id="due-form" novalidate><div class="form-error"></div>${field('New due date', 'dueAt', { type: 'date' })}
    <div class="modal-actions"><button type="button" class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" type="submit">Save</button></div></form>`,
  { small: true, onMount: (dlg) => { const f = $('#due-form', dlg); f.addEventListener('submit', (e) => { e.preventDefault(); submitForm(f, async () => {
    await api(`/loans/${id}/due-date`, { method: 'PATCH', body: formValues(f) });
    closeModal(); toast('Due date updated', 'success'); loadAdminLoans();
  }); }); } });
}

/* ---------------------------------------------------------------- boot */
(async function boot() {
  try { state.config = await api('/config', { auth: false }); } catch { /* backend offline - pages show errors */ }
  route();
})();
