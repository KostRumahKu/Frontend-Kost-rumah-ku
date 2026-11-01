/**
 * Fetch konfigurasi dari server dan taruh di window.__ENV__
 * sebelum module lain dieksekusi.
 * 
 * Cara pakai di HTML (sebelum <script type="module">):
 *   <script>
 *     (async () => {
 *       try {
 *         const r = await fetch('/api/client-config');
 *         window.__ENV__ = await r.json();
 *       } catch { window.__ENV__ = {}; }
 *     })();
 *   </script>
 */

// Fungsi ini bisa dipanggil manual jika perlu await di module
export async function initEnv() {
  if (window.__ENV__) return; // sudah diisi oleh inline script
  try {
    const r = await fetch('/api/client-config');
    window.__ENV__ = await r.json();
  } catch {
    window.__ENV__ = {};
  }
}
