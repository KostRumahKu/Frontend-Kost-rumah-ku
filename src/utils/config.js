// Konfigurasi yang diinjek oleh server Express via endpoint /api/client-config.
// Dibaca sebagai getter supaya selalu ambil nilai terbaru dari window.__ENV__,
// menghindari race condition antara fetch async dan import synchronous module.

function env(key) {
  return (typeof window !== 'undefined' && window.__ENV__?.[key]) ?? '';
}

// Alamat dasar API Back End.
export const API_BASE_URL = () => env('API_BASE_URL');

// Internal key untuk header x-internal-key di setiap request ke backend.
export const INTERNAL_KEY  = () => env('INTERNAL_KEY');

// Tujuan setelah login berdasarkan "peran" dari API.
export const ROLE_HOME = {
  penyewa: '/dashboard-penghuni',
  owner:   '/dashboard-owner',
  admin:   '/admin/dashboard-admin',
};
