'use strict';
/* ==========================================================================
   Local store: IndexedDB key-value (state + sync meta). Falls back to localStorage in saveState when unavailable.
   ========================================================================== */
const Store = {
  DB: 'nihongo_quest_db', STORE: 'kv', dbp: null, available: false,
  open() {
    if (this.dbp) return this.dbp;
    this.dbp = new Promise(resolve => {
      try {
        if (!('indexedDB' in window)) { resolve(null); return; }
        const req = indexedDB.open(this.DB, 1);
        req.onupgradeneeded = (ev) => { const db = ev.target.result; if (!db.objectStoreNames.contains(this.STORE)) db.createObjectStore(this.STORE); };
        req.onsuccess = (ev) => { this.available = true; resolve(ev.target.result); };
        req.onerror = () => resolve(null);
        req.onblocked = () => resolve(null);
      } catch (e) { resolve(null); }
    });
    return this.dbp;
  },
  async get(key) {
    const db = await this.open();
    if (!db) return undefined;
    return new Promise(resolve => {
      try {
        const req = db.transaction(this.STORE).objectStore(this.STORE).get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(undefined);
      } catch (e) { resolve(undefined); }
    });
  },
  async set(key, value) {
    const db = await this.open();
    if (!db) return false;
    return new Promise(resolve => {
      try {
        const tx = db.transaction(this.STORE, 'readwrite');
        tx.objectStore(this.STORE).put(value, key);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
        tx.onabort = () => resolve(false);
      } catch (e) { resolve(false); }
    });
  }
};
