// Pemanggilan API khusus admin
import { apiFetch } from './api.js';

const toQuery = (params = {}) => {
  const q = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
  ).toString();
  return q ? `?${q}` : '';
};

/* ---------- Dashboard ---------- */
// filter (opsional): 'tagihan-nunggak' | 'tagihan-mendatang' | 'kamar-kosong'
export const getDashboardRingkasan = (filter) =>
  apiFetch(`/api/admin/dashboard/${toQuery({ filter })}`);

/* ---------- Kamar ---------- */
// params (opsional): { diarsipkan, status, lantai }
export const getDaftarKamar = (params) => apiFetch(`/api/admin/kamar/${toQuery(params)}`);
export const getDetailKamar = (id) => apiFetch(`/api/admin/kamar/${id}`);
export const tambahKamar = (data) => apiFetch('/api/admin/kamar', { method: 'POST', body: data });
export const ubahKamar = (id, data) => apiFetch(`/api/admin/kamar/${id}`, { method: 'PUT', body: data });
export const hapusKamar = (id) => apiFetch(`/api/admin/kamar/${id}`, { method: 'DELETE' });
export const resetKamar = (id) => apiFetch(`/api/admin/kamar/${id}/reset`, { method: 'POST' });

// data: { dataPengguna: { 'nama-lengkap', email, 'nomor-telepon', 'nama-kontak-darurat', 'nomor-kontak-darurat' },
//         dataSewa: { 'durasi-bulan', 'tanggal-mulai', 'metode-pembayaran' } }
export const inputPenghuniManual = (idKamar, data) =>
  apiFetch(`/api/admin/kamar/${idKamar}/input-penghuni-manual`, { method: 'POST', body: data });

// Format body sama seperti inputPenghuniManual, untuk data penghuni lama
export const entryDataLama = (idKamar, data) =>
  apiFetch(`/api/admin/kamar/${idKamar}/entry-data-lama`, { method: 'POST', body: data });

export const pindahKamar = (idPengguna, idKamarBaru) =>
  apiFetch('/api/admin/kamar/pindah', {
    method: 'POST',
    body: { 'id-pengguna': idPengguna, 'id-kamar-baru': idKamarBaru },
  });

/* ---------- Pengumuman (broadcast) ---------- */
export const getRiwayatPengumuman = () => apiFetch('/api/admin/pengumuman');

// gambar opsional (berupa URL)
export const buatPengumuman = ({ judul, pesan, gambar }) =>
  apiFetch('/api/admin/pengumuman', {
    method: 'POST',
    body: { judul, pesan, ...(gambar ? { gambar } : {}) },
  });