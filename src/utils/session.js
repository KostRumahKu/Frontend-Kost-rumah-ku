// Penyimpanan sesi login di browser.
// Token JWT dari backend disimpan di localStorage,
// dikirim sebagai Authorization: Bearer di setiap request API.
const KEY = 'kostrumahku-session';

export function saveSession({ token, peran, nama }) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ token, peran, nama }));
  } catch { /* abaikan */ }
}

export function getSession() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getToken() {
  return getSession()?.token ?? null;
}

export function clearSession() {
  try {
    localStorage.removeItem(KEY);
  } catch { /* abaikan */ }
}
