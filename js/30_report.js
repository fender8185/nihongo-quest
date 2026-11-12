'use strict';
/* ==========================================================================
   Error reports: an error nobody caught, a promise nobody handled and the 現在沒辦法開始 screen go to Supabase
   public.app_errors (supabase/app-errors.sql) with the version, page and device, so a problem on a learner's phone shows up
   without anyone telling us (2026-11-12). Loaded right after config.js: everything after it is covered.
   Sent by plain fetch, not the Supabase client: the stop screen comes before the client exists. Ten different errors a page
   at most; the same one again only counts (times); a report that cannot go up waits in localStorage for the next start.
   ========================================================================== */
const ErrorReport = {
  // tests (cdp.py sets NQ_E2E) and a copy served over plain http send nothing; a test that checks the reports sets NQ_REPORT_ON
  off: !window.NQ_REPORT_ON && (Boolean(window.NQ_E2E) || location.protocol !== 'https:'),
  MAX: 10, KEEP: 20, KEY: 'nq_err_queue', wait: 2000,
  made: 0, byKey: {}, queue: [], timer: null, sending: false, tag: '',

  init() {
    try { const q = JSON.parse(localStorage.getItem(this.KEY) || '[]'); if (Array.isArray(q)) this.queue = q.slice(-this.KEEP); } catch (e) { /* none */ }
    window.addEventListener('error', (e) => {
      const file = String(e.filename || '');
      if (file && !file.startsWith(location.origin)) return;   // a browser extension's script
      if (!file && /^Script error\.?$/.test(String(e.message || ''))) return;   // another origin's, no details
      if (/ResizeObserver loop/.test(String(e.message || ''))) return;   // harmless, Chrome reports it as an error
      this.note('error', e.message || (e.error && e.error.message) || 'error', (e.error && e.error.stack) || (file ? `${file}:${e.lineno}:${e.colno}` : ''));
    });
    window.addEventListener('unhandledrejection', (e) => {
      const r = e.reason;
      if (r && (r.name === 'NotAllowedError' || r.name === 'AbortError')) return;   // a sound the browser would not play yet, or cut off
      this.note('rejection', (r && r.message) || String(r), (r && r.stack) || '');
    });
    window.addEventListener('online', () => this.flush());
    // the test site's build (-test.N), from the cache's name as 設定 shows it
    try { if (window.caches) caches.keys().then((ks) => { const m = /-test\.\d+$/.exec(ks.filter((x) => /^nq-v/.test(x)).sort().pop() || ''); this.tag = m ? m[0] : ''; }).catch(() => {}); } catch (e) { /* none */ }
    if (this.queue.length) setTimeout(() => this.flush(), 3000);   // left from an earlier start
  },

  note(kind, message, stack, now) {
    try {
      message = String(message || '').slice(0, 1000); stack = String(stack || '').slice(0, 4000);
      const key = kind + '|' + message + '|' + stack.split('\n').slice(0, 2).join('|');
      const had = this.byKey[key];
      if (had) { had.times = Math.min(had.times + 1, 10000); if (this.queue.includes(had)) this.save(); return; }   // counted while it waits; once sent, not again
      if (this.made >= this.MAX) return;
      this.made++;
      const item = this.byKey[key] = { kind, message, stack, times: 1, first_at: new Date().toISOString(),
        version: typeof APP_VERSION === 'string' ? APP_VERSION + this.tag : '', site: location.host, place: (location.hash || '#/').slice(0, 120),
        agent: String(navigator.userAgent || '').slice(0, 400) };
      this.queue.push(item); this.queue = this.queue.slice(-this.KEEP); this.save();
      if (now) this.flush(); else if (!this.timer) this.timer = setTimeout(() => { this.timer = null; this.flush(); }, this.wait);
    } catch (e) { /* reporting must never break the app */ }
  },

  save() { try { localStorage.setItem(this.KEY, JSON.stringify(this.queue)); } catch (e) { /* no storage */ } },

  async flush() {
    const cfg = window.NQ_CONFIG || {};
    if (this.off || this.sending || !this.queue.length || !cfg.supabaseUrl || !cfg.supabaseAnonKey) return;
    if (navigator.onLine === false) return;
    this.sending = true;
    const batch = this.queue.slice();
    const sync = typeof Sync === 'object' && Sync ? Sync : null;   // Sync (js/85_sync.js) may not be there yet
    const device = (sync && sync.meta && sync.meta.deviceId) || null, token = sync && sync.session && sync.session.access_token;
    const send = (auth) => fetch(cfg.supabaseUrl + '/rest/v1/app_errors', { method: 'POST',   // no keepalive: it refuses bodies over 64 KB
      headers: Object.assign({ apikey: cfg.supabaseAnonKey, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, auth ? { Authorization: 'Bearer ' + auth } : {}),
      body: JSON.stringify(batch.map(x => Object.assign({ device_id: device }, x))) });
    try {
      let res = await send(token);
      if (!res.ok && token) res = await send(null);   // an expired login: sent without it
      // sent, or refused as malformed (400: it never would be): out of the queue; anything else waits for the next start or 'online'
      if (res.ok || res.status === 400) { this.queue = this.queue.filter(x => !batch.includes(x)); this.save(); }
    } catch (e) { /* offline */ }
    this.sending = false;
    if (this.queue.length && this.queue.some(x => !batch.includes(x)) && !this.timer) this.timer = setTimeout(() => { this.timer = null; this.flush(); }, this.wait);   // noted while sending
  }
};
ErrorReport.init();
