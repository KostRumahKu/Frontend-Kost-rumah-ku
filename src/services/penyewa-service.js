import { apiFetch } from './api.js';
import { API_BASE_URL } from '../utils/config.js';
import { getToken, clearSession } from '../utils/session.js';
import { clearApiCache } from './api.js';

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const getDashboardPenyewa = () => apiFetch('/api/penyewa/dashboard');

// ── Tagihan & Pembayaran ──────────────────────────────────────────────────────
export const getTagihan = () => apiFetch('/api/penyewa/tagihan');

// Trigger backend untuk men-generate tagihan bulan berikutnya
export const mintaTagihan = () =>
  apiFetch('/api/penyewa/permintaan-tagihan', { method: 'POST' });

// Bayar tagihan (bisa 1 bulan atau multi bulan)
// data: { 'id-tagihan-Dasar', 'jumlah-bulan', 'bukti-pembayaran', 'id-rekening' }
export const kirimPembayaran = (data) =>
  apiFetch('/api/penyewa/pembayaran', { method: 'POST', body: data });

// Daftar rekening pembayaran resmi kost
export const getDaftarRekening = () =>
  apiFetch('/api/public/rekening', { auth: false });

function cariUrlPdf(obj) {
  if (!obj) return null;
  if (typeof obj === 'string') {
    const s = obj.trim();
    if (/^(https?:\/\/|\/|data:application\/pdf)/i.test(s)) return s;
    return null;
  }
  if (typeof obj !== 'object') return null;

  const keys = [
    'url', 'pdfUrl', 'pdf-url', 'pdf_url', 'pdf',
    'file', 'fileUrl', 'file-url', 'link',
    'downloadUrl', 'download-url', 'invoiceUrl', 'invoice-url',
  ];
  for (const k of keys) {
    if (typeof obj[k] === 'string' && obj[k].trim()) {
      const found = cariUrlPdf(obj[k]);
      if (found) return found;
    }
  }
  if (obj.data && obj.data !== obj) {
    const nested = cariUrlPdf(obj.data);
    if (nested) return nested;
  }
  return null;
}

function cariBase64Pdf(obj) {
  if (!obj || typeof obj !== 'object') return null;
  const keys = ['base64', 'pdfBase64', 'pdf-base64', 'fileBase64', 'buffer'];
  for (const k of keys) {
    if (typeof obj[k] === 'string' && obj[k].length > 50) return obj[k];
  }
  if (obj.data && obj.data !== obj) return cariBase64Pdf(obj.data);
  return null;
}

function base64ToPdfBlob(b64) {
  const clean = b64.replace(/^data:application\/pdf;base64,/i, '').replace(/\s/g, '');
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: 'application/pdf' });
}

// Generate PDF tagihan (tangani blob PDF, base64, maupun JSON berisi URL)
export async function generateTagihanPdf(idTagihan) {
  const url = `${API_BASE_URL()}/api/penyewa/generate/${encodeURIComponent(idTagihan)}/pdf`;
  const headers = { Accept: 'application/pdf, application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const doRequest = (method) => fetch(url, { method, headers });

  let res;
  try {
    res = await doRequest('POST');
    if (res.status === 404 || res.status === 405) {
      res = await doRequest('GET');
    }
  } catch {
    throw new Error('Tidak dapat terhubung ke server. Periksa koneksi internetmu.');
  }

  if (res.status === 401) {
    clearApiCache();
    clearSession();
    window.location.replace('/auth/login');
    throw new Error('Sesi berakhir. Silakan masuk lagi.');
  }

  const ct = (res.headers.get('content-type') ?? '').toLowerCase();
  const buf = await res.arrayBuffer();
  const bytes = new Uint8Array(buf);
  const isPdfSignature =
    bytes.length >= 4 &&
    bytes[0] === 0x25 && // %
    bytes[1] === 0x50 && // P
    bytes[2] === 0x44 && // D
    bytes[3] === 0x46;   // F

  if (!res.ok) {
    let pesan = `Gagal membuat PDF tagihan (HTTP ${res.status}).`;
    try {
      const txt = new TextDecoder('utf-8').decode(bytes);
      const errJson = JSON.parse(txt);
      pesan = errJson?.pesan ?? errJson?.message ?? pesan;
    } catch { /* bukan JSON */ }
    throw new Error(pesan);
  }

  if (isPdfSignature || ct.includes('application/pdf') || ct.includes('octet-stream')) {
    return { type: 'blob', blob: new Blob([buf], { type: 'application/pdf' }) };
  }

  let hasil = null;
  try {
    const txt = new TextDecoder('utf-8').decode(bytes);
    hasil = JSON.parse(txt);
  } catch {
    throw new Error('Format respon PDF dari server tidak dikenali.');
  }

  if (hasil?.status && hasil.status !== 'sukses') {
    throw new Error(hasil?.pesan ?? hasil?.message ?? 'Gagal membuat PDF tagihan.');
  }

  const b64 = cariBase64Pdf(hasil);
  if (b64) {
    return { type: 'blob', blob: base64ToPdfBlob(b64) };
  }

  const pdfUrl = cariUrlPdf(hasil);
  if (pdfUrl) {
    if (pdfUrl.startsWith('data:application/pdf;base64,')) {
      return { type: 'blob', blob: base64ToPdfBlob(pdfUrl) };
    }
    return { type: 'url', url: pdfUrl };
  }

  throw new Error('Server tidak mengembalikan file atau tautan PDF.');
}

// ── Pengumuman ────────────────────────────────────────────────────────────────
// filter: 'aktif' | 'riwayat'
export const getPengumuman = (filter) =>
  apiFetch(`/api/penyewa/pengumuman${filter ? `?filter=${filter}` : ''}`);

// ── Profil ────────────────────────────────────────────────────────────────────
// data: { nama-lengkap, nomor-telepon, nama-kontak-darurat?, nomor-kontak-darurat?, foto-profil? }
export const updateProfil = (data) =>
  apiFetch('/api/penyewa/profil', { method: 'PUT', body: data });

// Request OTP untuk ganti email
export const requestOtpEmail = (emailBaru) =>
  apiFetch('/api/penyewa/profil/email/request-otp', {
    method: 'POST',
    body: { 'email-baru': emailBaru },
  });

// Verifikasi OTP untuk konfirmasi ganti email
export const verifyOtpEmail = (emailBaru, otp) =>
  apiFetch('/api/penyewa/profil/email/verify-otp', {
    method: 'POST',
    body: { 'email-baru': emailBaru, otp },
  });

// Hapus foto profil
export const hapusFotoProfil = () =>
  apiFetch('/api/penyewa/profil/foto', { method: 'DELETE' });

// Ganti password
export const gantiPassword = (passwordLama, passwordBaru) =>
  apiFetch('/api/penyewa/profil/ganti-password', {
    method: 'PUT',
    body: { 'password-lama': passwordLama, 'password-baru': passwordBaru },
  });
