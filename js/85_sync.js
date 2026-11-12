'use strict';
/* ==========================================================================
   Cloud sync (Supabase): magic-link login, debounced push, pull on open/foreground/online, last-write-wins.
   Local state is the source of truth; the cloud row is a mirror. API keys never leave the device.
   ========================================================================== */
const Sync = {
  client: null, session: null, email: null, status: 'off', lastError: null, onChange: null,
  meta: null, timer: null, deferred: false, pulling: false, bound: false, conflicted: false,

  setStatus(next) {
    if (this.status === next) return;
    this.status = next;
    if (this.onChange) { try { this.onChange(); } catch (e) { /* ignore */ } }
  },

  // opts.client lets tests inject a fake client; production builds one from NQ_CONFIG.
  async init(opts) {
    opts = opts || {};
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    const cfg = window.NQ_CONFIG || {};
    // PKCE: a magic link only completes in the browser that asked for it, so a link someone else started cannot log this device into their account
    try {
      this.client = opts.client || ((cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase) ? supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, { auth: { flowType: 'pkce' } }) : null);
    } catch (e) { console.warn('supabase client not created', e); this.client = null; }
    this.meta = (await Store.get('meta')) || {};
    this.meta = Object.assign({ deviceId: uid('dev'), userId: null, pendingSync: false, lastSyncedAt: null, lastPulledUpdatedAt: null, everSynced: false }, this.meta);
    if (SyncCore.isPacked(state)) await this.reopenOwnPack();
    // 1.9.1: a device that synced before and holds progress now counts as having had it from the start, not only after its next
    // sync under this version (an upgraded device was not covered by the empty-progress guard until then)
    if (this.meta.everSynced && !SyncCore.isEmptyProgress(state)) this.meta.hadProgress = true;
    await Store.set('meta', this.meta);
    if (!this.bound) {
      this.bound = true;
      saveHooks.push(() => Sync.schedulePush());
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) { if (Sync.meta && Sync.meta.pendingSync) Sync.push(); } else Sync.pull();
      });
      window.addEventListener('online', () => Sync.pull());
    }
    this.session = null; this.email = null;
    if (!this.client) { this.setStatus('off'); return; }
    this.client.auth.onAuthStateChange((_evt, session) => this.applySession(session));
    try {
      const res = await this.client.auth.getSession();
      this.applySession(res && res.data && res.data.session);
    } catch (e) { this.applySession(null); }
  },

  // An app before 1.9.0 that pulled a packed row (uploads are packed since 1.14.0-test.2) took it for an empty progress and kept
  // the pack inside its own. Updated, this opens it again and adds what was answered since, so the phone shows its progress at
  // once instead of after the cloud refuses its next upload (2026-11-12)
  async reopenOwnPack() {
    try {
      const own = SyncCore.withoutPack(state), answered = !SyncCore.isEmptyProgress(own);
      own.updatedAt = '';   // the pack wins everything but the records
      state = normalizeState(SyncCore.keepLocalSecrets(SyncCore.mergeStates(await SyncCore.unpackState(state), own), state));
      buildRegistry();
      if (answered) { state.updatedAt = new Date().toISOString(); this.meta.pendingSync = true; }
      await Store.set('state', state);
      if (!modalOpen()) route();
    } catch (e) { console.warn('own pack not opened', e); }
  },

  // packed for the cloud; a browser without CompressionStream (Safari before 16.4) sends it plain
  async packed(s) {
    try { return await SyncCore.packState(s); } catch (e) { return SyncCore.withoutPack(s); }
  },

  applySession(session) {
    const had = Boolean(this.session);
    this.session = session || null;
    this.email = session && session.user ? session.user.email : null;
    if (!session) {
      if (this.timer) { clearTimeout(this.timer); this.timer = null; }
      if (this.meta && this.meta.pendingSync) { this.meta.pendingSync = false; Store.set('meta', this.meta); }
      this.setStatus('off');
      return;
    }
    // sync bookkeeping belongs to one account: a different user on this device starts as "never synced"
    if (this.meta.userId !== session.user.id) {
      Object.assign(this.meta, { userId: session.user.id, everSynced: false, hadProgress: false, pendingSync: false, lastSyncedAt: null, lastPulledUpdatedAt: null });
      Store.set('meta', this.meta);
    }
    if (!had) { this.setStatus('idle'); this.pull(); }   // TOKEN_REFRESHED etc. keep whatever status we are in
  },

  pendingEmail: null,
  async signIn(email) {
    if (!this.client) { toast('尚未設定雲端同步'); return; }
    const addr = SyncCore.normalizeEmail(email);
    if (!addr || !addr.includes('@')) { toast('請輸入正確的 email'); return; }
    const { error } = await this.client.auth.signInWithOtp({ email: addr, options: { emailRedirectTo: location.origin + location.pathname } });
    if (error) { toast('寄送失敗：' + error.message, 5000); return; }
    this.pendingEmail = addr;
    toast('已寄出登入信。在這個 app 裡輸入信中的 8 位數驗證碼，或用同一個瀏覽器點開信裡的連結', 7000);
    if (modalOpen()) refreshSettings();
  },

  async verifyCode(code) {
    if (!this.client || !this.pendingEmail) return;
    const token = String(code || '').replace(/\D/g, '');
    if (token.length < 8) { toast('請輸入信中的 8 位數驗證碼'); return; }
    const { error } = await this.client.auth.verifyOtp({ email: this.pendingEmail, token, type: 'email' });
    if (error) { toast('驗證失敗：' + error.message, 5000); return; }
    this.pendingEmail = null;
    if (modalOpen()) refreshSettings();
  },

  async signOut() {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    if (this.client) { try { await this.client.auth.signOut(); } catch (e) { /* ignore */ } }
    this.applySession(null);
  },

  async deleteCloud() {
    if (!this.client || !this.session) return;
    const { error } = await this.client.from('progress').delete().eq('user_id', this.session.user.id);
    if (error) { toast('刪除失敗：' + error.message, 5000); return; }
    this.meta.everSynced = false; this.meta.lastPulledUpdatedAt = null; await Store.set('meta', this.meta);
    toast('已刪除雲端資料，本機進度仍保留');
  },

  // The whole progress goes up each time (~230 KB mid-course, ~1 MB at the end of N3; packed a tenth of that since
  // 1.14.0-test.2), so a practice set or exam sends it once
  // at its end (flushDeferred) instead of 2 s after every answer; the app going to the background sends it at once. (1.0.38)
  schedulePush() {
    if (!this.session || !this.client) return;
    this.meta.pendingSync = true; Store.set('meta', this.meta);
    this.setStatus('pending');
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    if (this.busy()) { this.deferred = true; return; }
    this.timer = setTimeout(() => { this.timer = null; this.push(); }, 2000);
  },

  busy() { return Boolean(SESSION || (EXAM && !EXAM.finished)); },   // never swap state under a running practice or exam (a finished exam only shows its result)

  // Upload is conditional: once this device has synced, the row is only replaced when its updated_at is still the
  // one we last pulled or pushed. Otherwise another device wrote in between and pull() decides (it merges the
  // two copies). `final` stops a pull→push→pull loop if the condition keeps failing.
  async push(final) {
    const session = this.session; // re-read: a logout during the debounce must cancel the upload
    if (!session || !this.client) return;
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    if (this.conflicted && this.busy()) { this.deferred = true; this.setStatus('pending'); return; }   // already known: wait for the session to end
    this.setStatus('syncing');
    try {
      if (!state.updatedAt) state.updatedAt = new Date().toISOString();   // e.g. right after the localStorage migration
      // 1.8.2: a device that had progress and now has none (it lost its own) never sends the empty one over a cloud that has
      // some: it takes the cloud's instead. Only 重設所有進度 sends an empty one on purpose (allowEmpty). meta.hadProgress: the
      // last progress this device sent or took was not empty
      if (SyncCore.isEmptyProgress(state) && this.meta.hadProgress && !this.allowEmpty) {
        const { data: row, error: rowError } = await this.client.from('progress').select('state, updated_at').eq('user_id', session.user.id).maybeSingle();
        if (rowError) throw rowError;
        if (row) row.state = await SyncCore.unpackState(row.state);
        if (row && !SyncCore.isEmptyProgress(row.state)) { await this.applyCloud(row); this.lastError = null; this.setStatus('idle'); return; }
      }
      const payload = Object.assign({ user_id: session.user.id }, SyncCore.buildPushPayload(SyncCore.stripSecrets(state), this.meta.deviceId));
      payload.state = await this.packed(payload.state);
      const base = this.meta.everSynced ? this.meta.lastPulledUpdatedAt : null;
      if (base) {
        const { data, error } = await this.client.from('progress').update(payload).eq('user_id', session.user.id).eq('updated_at', base).select('updated_at');
        if (error) { if (await this.refusedShrink(error, session)) return; throw error; }
        if (!data || !data.length) {
          this.conflicted = true;
          if (final) { this.lastError = '雲端資料與本機不一致，請按「立即同步」'; this.setStatus('error'); return; }
          if (this.busy()) { this.deferred = true; this.setStatus('pending'); return; }
          await this.pull({ afterConflict: true });
          return;
        }
      } else {
        const { error } = await this.client.from('progress').upsert(payload);
        if (error) { if (await this.refusedShrink(error, session)) return; throw error; }
      }
      this.conflicted = false; this.allowEmpty = false;
      Object.assign(this.meta, { pendingSync: false, lastSyncedAt: new Date().toISOString(), lastPulledUpdatedAt: payload.updated_at, everSynced: true, hadProgress: !SyncCore.isEmptyProgress(state) });
      await Store.set('meta', this.meta);
      this.lastError = null; this.setStatus('idle');
    } catch (e) {
      this.lastError = (e && e.message) || String(e); this.setStatus('error');
    }
  },

  // 1.9.1: the cloud refuses a progress with far fewer records than the one it holds (supabase/progress-guard.sql), whatever the
  // app's version. Then the two are merged record by record — the merge only grows — and that goes up instead
  async refusedShrink(error, session) {
    if (!error || !(error.code === '23514' || /progress shrink/.test(String(error.hint || error.message || '')))) return false;
    const { data: row, error: e2 } = await this.client.from('progress').select('state, updated_at').eq('user_id', session.user.id).maybeSingle();
    if (e2 || !row || !row.state) return false;
    row.state = await SyncCore.unpackState(row.state);
    await this.applyCloud({ state: SyncCore.mergeStates(state, row.state), updated_at: row.updated_at }, true);
    this.meta.pendingSync = true; await Store.set('meta', this.meta);
    this.schedulePush();
    return true;
  },

  async pull(opts) {
    opts = opts || {};
    const session = this.session;
    if (!session || !this.client) return;
    if (this.busy()) { this.deferred = true; return; }
    if (this.pulling) return;
    this.pulling = true;
    let next = null;
    this.setStatus('syncing');
    try {
      // a synced device asks for the cloud's stamp first and downloads the progress only when another device moved it (1.0.38);
      // a first sync looks at the cloud's progress itself (empty or not)
      const row = async (cols) => { const { data: d, error } = await this.client.from('progress').select(cols).eq('user_id', session.user.id).maybeSingle(); if (error) throw error; return d; };
      let data = this.meta.everSynced ? await row('updated_at') : null;
      if (!this.meta.everSynced || (data && !SyncCore.sameStamp(data.updated_at, this.meta.lastPulledUpdatedAt))) data = await row('state, updated_at');
      if (data && data.state) data.state = await SyncCore.unpackState(data.state);   // a packed row (2026-11-11) opened before anything reads it
      const pick = SyncCore.pullDecision(this.meta, state, data);
      // a first sync adopts a cloud that has progress over whatever this device had: no copy is kept (1.0.47)
      if (pick === 'adopt' || pick === 'conflict') {
        if (pick === 'conflict') {
          // both sides changed: merge record by record, adopt the merge with the cloud's stamp as base, then upload it
          await this.applyCloud({ state: SyncCore.mergeStates(state, data.state), updated_at: data.updated_at }, true);
          next = 'push';
        } else await this.applyCloud(data);
      } else {
        if (!data) { this.meta.lastPulledUpdatedAt = null; await Store.set('meta', this.meta); }   // row gone (deleted elsewhere): the next push creates it
        next = pick;
      }
    } catch (e) {
      this.lastError = (e && e.message) || String(e); this.setStatus('error');
    } finally { this.pulling = false; }
    if (next === 'push') await this.push(Boolean(opts.afterConflict));
    else if (next === 'idle') this.setStatus('idle');
  },

  async applyCloud(data, conflict) {
    try {
      const next = normalizeState(SyncCore.keepLocalSecrets(data.state, state));
      state = next;
      buildRegistry();
      // a merge brings progress made elsewhere into a list this device made from its own: redo it (answered items stay);
      // it goes up with the merge
      if (conflict && state.today.plan) makeTodayPlan();
      await Store.set('state', state);   // not saveState(): that would echo the pull straight back to the cloud
      this.conflicted = false;
      Object.assign(this.meta, { pendingSync: false, lastSyncedAt: new Date().toISOString(), lastPulledUpdatedAt: data.updated_at, everSynced: true, hadProgress: !SyncCore.isEmptyProgress(state) });
      await Store.set('meta', this.meta);
      applyTheme(); applyFurigana();
      audioPrefetchSoon();   // progress made on another device changes today's plan
      if (!modalOpen()) route();
      toast(conflict ? '另一台裝置同時更新了進度，已把兩邊的紀錄合併。' : '已從雲端更新進度', conflict ? 7000 : undefined);
      this.lastError = null; this.setStatus('idle');
    } catch (e) {
      this.lastError = '雲端資料無法讀取，已保留本機進度'; this.setStatus('error'); toast(this.lastError, 5000);
    }
  },

  flushDeferred() { if (this.deferred) { this.deferred = false; this.pull(); } }
};
