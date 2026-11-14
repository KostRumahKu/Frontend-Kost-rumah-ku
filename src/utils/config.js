function env(key) {
  return (typeof window !== 'undefined' && window.__ENV__?.[key]) ?? '';
}

export const API_BASE_URL = () => env('API_BASE_URL');
export const INTERNAL_KEY  = () => env('INTERNAL_KEY');

export const ROLE_HOME = {
  penyewa: '/dashboard-penghuni',
  owner:   '/dashboard-owner',
  pemilik: '/dashboard-owner',
  admin:   '/admin/dashboard-admin',
};
