import { apiFetch } from './api.js';

const toQuery = (params = {}) => {
  const q = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
  ).toString();
  return q ? `?${q}` : '';
};

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const getDashboardRingkasan = (filter) =>
  apiFetch(`/api/admin/dashboard/${toQuery({ filter })}`);

// ── Kamar ─────────────────────────────────────────────────────────────────────
// params: { diarsipkan, status, lantai }
export const getDaftarKamar  = (params)     => apiFetch(`/api/admin/kamar/${toQuery(params)}`);
export const getDetailKamar  = (id)         => apiFetch(`/api/admin/kamar/${id}`);
export const tambahKamar     = (data)       => apiFetch('/api/admin/kamar', { method: 'POST', body: data });
export const ubahKamar       = (id, data)   => apiFetch(`/api/admin/kamar/${id}`, { method: 'PUT', body: data });
export const hapusKamar      = (id)         => apiFetch(`/api/admin/kamar/${id}`, { method: 'DELETE' });
export const resetKamar      = (id)         => apiFetch(`/api/admin/kamar/${id}/reset`, { method: 'POST' });

// data: { dataPengguna: { nama-lengkap, email, nomor-telepon, nama-kontak-darurat, nomor-kontak-darurat },
//         dataSewa: { durasi-bulan, tanggal-mulai, metode-pembayaran } }
export const inputPenghuniManual = (idKamar, data) =>
  apiFetch(`/api/admin/kamar/${idKamar}/input-penghuni-manual`, { method: 'POST', body: data });

export const entryDataLama = (idKamar, data) =>
  apiFetch(`/api/admin/kamar/${idKamar}/entry-data-lama`, { method: 'POST', body: data });

// id-kamar-baru adalah Number sesuai API
export const pindahKamar = (idPengguna, idKamarBaru) =>
  apiFetch('/api/admin/kamar/pindah', {
    method: 'POST',
    body: { 'id-pengguna': idPengguna, 'id-kamar-baru': Number(idKamarBaru) },
  });

// ── Pengumuman ────────────────────────────────────────────────────────────────
export const getRiwayatPengumuman = () => apiFetch('/api/admin/pengumuman');

// Mengubah pengumuman tidak mengirim ulang email.
export const ubahPengumuman = (id, { judul, pesan, gambar }) =>
  apiFetch(`/api/admin/pengumuman/${id}`, { method: 'PUT', body: { judul, pesan, gambar } });
export const hapusPengumuman = (id) =>
  apiFetch(`/api/admin/pengumuman/${id}`, { method: 'DELETE' });

// gambar opsional (URL)
export const buatPengumuman = ({ judul, pesan, gambar }) =>
  apiFetch('/api/admin/pengumuman', {
    method: 'POST',
    body: { judul, pesan, ...(gambar ? { gambar } : {}) },
  });

// ── Pengajuan ─────────────────────────────────────────────────────────────────
// params opsional: { status, 'jenis-pengajuan', 'id-kamar-sekarang' }
// contoh: getDaftarPengajuan({ status: 'menunggu-konfirmasi', 'jenis-pengajuan': 'berhenti-sewa' })
export const getDaftarPengajuan = (params) =>
  apiFetch(`/api/admin/pengajuan/${toQuery(params)}`);

export const getDetailPengajuan = (id) =>
  apiFetch(`/api/admin/pengajuan/${id}`);

// status: 'disetujui' | 'ditolak'
// catatanAdmin: string (opsional)
export const prosesPengajuan = (id, status, catatanAdmin = '-') =>
  apiFetch(`/api/admin/pengajuan/${id}/proses`, {
    method: 'PUT',
    body: { status, 'catatan-admin': catatanAdmin },
  });

// Rollback pengajuan yang sudah disetujui tapi batal
export const rollbackPengajuan = (id) =>
  apiFetch(`/api/admin/pengajuan/${id}/rollback`, { method: 'PUT' });

// Selesaikan pengajuan
export const selesaikanPengajuan = (id) =>
  apiFetch(`/api/admin/pengajuan/${id}/selesai`, { method: 'PUT' });

// ── Pengguna / penyewa ───────────────────────────────────────────────────────
// params: { peran: 'penyewa' | 'admin' | ... }
export const getDaftarPengguna = (params) => apiFetch(`/api/admin/pengguna/${toQuery(params)}`);
export const getDaftarPenyewa  = () => getDaftarPengguna({ peran: 'penyewa' });
export const getDetailPengguna = (id) => apiFetch(`/api/admin/pengguna/${id}`);
// data: { nama-lengkap, nomor-telepon, nama-kontak-darurat, nomor-kontak-darurat }
export const ubahPenyewa       = (id, data) => apiFetch(`/api/admin/pengguna/${id}`, { method: 'PATCH', body: data });

// ── Tagihan & verifikasi pembayaran ───────────────────────────────────────────
export const getDaftarTagihan = () => apiFetch('/api/admin/tagihan/');
export const cariTagihan      = (idAtauInvoice) =>
  apiFetch('/api/admin/tagihan/cari-tagihan', { method: 'POST', body: { 'id-atau-invoice': idAtauInvoice } });
// status: 'disetujui' | 'ditolak'
export const validasiTagihan  = (id, status, catatanAdmin = '-') =>
  apiFetch(`/api/admin/tagihan/${id}/validasi`, { method: 'PUT', body: { 'status-validasi': status, 'catatan-admin': catatanAdmin } });

// ── Booking ───────────────────────────────────────────────────────────────────
export const getDaftarBooking = () => apiFetch('/api/admin/booking/');
// status: 'setujui' | 'tolak'
export const validasiBooking  = (id, status, catatanAdmin = '-') =>
  apiFetch(`/api/admin/booking/${id}/validasi`, { method: 'POST', body: { 'status-validasi': status, 'catatan-admin': catatanAdmin } });

// ── Keuangan (laporan) ────────────────────────────────────────────────────────
// { total-pemasukan, total-pengeluaran, saldo }
export const getRingkasanKeuangan = () => apiFetch('/api/admin/keuangan/ringkasan');
// [{ tipe-transaksi, kategori, nominal, keterangan, tanggal-transaksi }]
export const getDaftarTransaksi   = () => apiFetch('/api/admin/keuangan/');

// ── Profil admin ──────────────────────────────────────────────────────────────
export const getProfilAdmin  = () => apiFetch('/api/admin/pengguna/profil-admin');
export const ubahProfilAdmin = (data) => apiFetch('/api/admin/pengguna/profil-admin', { method: 'PATCH', body: data });
