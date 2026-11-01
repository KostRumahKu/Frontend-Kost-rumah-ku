// Penyimpanan sesi login di browser. Semua akses sesi lewat file ini,
// supaya mudah diganti kalau cara penyimpanannya berubah.
const KEY = 'kostrumahku-session';

export function saveSession({ token, peran, nama }) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ token, peran, nama }));
  } catch {
    // penyimpanan diblokir browser; pengguna harus login ulang saat membuka halaman lain
  }
}

export function getSession() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Shortcut untuk ambil JWT token dari sesi aktif. */
export function getToken() {
  return getSession()?.token ?? null;
}

export function clearSession() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // abaikan
  }
}
