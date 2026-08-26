/**
 * Storage adapter
 * -----------------
 * ถ้ารันอยู่ในแชท Claude (artifact) จะมี window.storage ให้ใช้อยู่แล้ว -> ใช้ตัวนั้นตรงๆ
 * ถ้ารันนอกแชท Claude (Live Server, โฮสต์จริง ฯลฯ) จะไม่มี window.storage
 *   -> จำลองพฤติกรรมเดียวกันด้วย localStorage ของเบราว์เซอร์ (เก็บเฉพาะเครื่องนี้ เครื่องนี้เบราว์เซอร์นี้เท่านั้น)
 *
 * หมายเหตุ: โหมด localStorage นี้ "สำหรับทดสอบตอนพัฒนาเท่านั้น" ข้อมูลจะไม่ sync ข้ามเครื่อง/เบราว์เซอร์
 * เมื่อจะขึ้นใช้งานจริง (ให้ลูกค้าหลายคนสั่งพร้อมกัน) ต้องเปลี่ยนไปต่อฐานข้อมูลจริง (ดู README.md)
 */
const Storage = (() => {
  const hasRealStorage = typeof window !== 'undefined' && !!window.storage;

  if (hasRealStorage) {
    return window.storage;
  }

  // ---- localStorage fallback (dev only) ----
  const PREFIX = 'khanom_dev__';

  return {
    async set(key, value) {
      try {
        localStorage.setItem(PREFIX + key, value);
        return { key, value, shared: true };
      } catch (e) {
        return null;
      }
    },
    async get(key) {
      const v = localStorage.getItem(PREFIX + key);
      if (v === null) throw new Error('Key not found: ' + key);
      return { key, value: v, shared: true };
    },
    async delete(key) {
      localStorage.removeItem(PREFIX + key);
      return { key, deleted: true, shared: true };
    },
    async list(prefix = '') {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const fullKey = localStorage.key(i);
        if (fullKey && fullKey.startsWith(PREFIX + prefix)) {
          keys.push(fullKey.slice(PREFIX.length));
        }
      }
      return { keys, prefix, shared: true };
    },
  };
})();

if (!Storage) {
  console.warn('Storage adapter failed to initialize.');
} else if (typeof window !== 'undefined' && !window.storage) {
  console.info('[khanom-project] ใช้ localStorage แทน window.storage (โหมดทดสอบ local)');
}
