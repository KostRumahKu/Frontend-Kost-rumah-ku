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

// ── Penyewa ───────────────────────────────────────────────────────────────────
// params: { status: 'aktif' | 'nonaktif', search }
export const getDaftarPenyewa = (params) => apiFetch(`/api/admin/penyewa/${toQuery(params)}`);
export const getDetailPenyewa = (id)     => apiFetch(`/api/admin/penyewa/${id}`);
// data: { nama-lengkap, email, nomor-telepon, nama-kontak-darurat, nomor-kontak-darurat }
export const tambahPenyewa    = (data)   => apiFetch('/api/admin/penyewa', { method: 'POST', body: data });
export const ubahPenyewa      = (id, data) => apiFetch(`/api/admin/penyewa/${id}`, { method: 'PUT', body: data });
export const hapusPenyewa     = (id)     => apiFetch(`/api/admin/penyewa/${id}`, { method: 'DELETE' });

// ── Tagihan ───────────────────────────────────────────────────────────────────
// params: { status, 'bulan-tagihan', 'id-pengguna' }
export const getDaftarTagihan = (params) => apiFetch(`/api/admin/tagihan/${toQuery(params)}`);
export const getDetailTagihan = (id)     => apiFetch(`/api/admin/tagihan/${id}`);
// data: { id-pengguna, bulan-tagihan, tanggal-jatuh-tempo, jumlah-tagihan? }
export const buatTagihan      = (data)   => apiFetch('/api/admin/tagihan', { method: 'POST', body: data });
// data: { jumlah-tagihan?, tanggal-jatuh-tempo?, status? }
export const ubahTagihan      = (id, data) => apiFetch(`/api/admin/tagihan/${id}`, { method: 'PUT', body: data });
export const hapusTagihan     = (id)     => apiFetch(`/api/admin/tagihan/${id}`, { method: 'DELETE' });

// ── Pembayaran ────────────────────────────────────────────────────────────────
// params: { status: 'menunggu' | 'terverifikasi' | 'ditolak', 'id-pengguna', 'id-tagihan' }
export const getDaftarPembayaran = (params) => apiFetch(`/api/admin/pembayaran/${toQuery(params)}`);
export const getDetailPembayaran = (id)     => apiFetch(`/api/admin/pembayaran/${id}`);
// status: 'terverifikasi' | 'ditolak'. Terverifikasi otomatis melunasi tagihan.
export const prosesPembayaran = (id, status) =>
  apiFetch(`/api/admin/pembayaran/${id}/proses`, { method: 'PUT', body: { status } });

// ── Booking ───────────────────────────────────────────────────────────────────
// params: { status: 'menunggu' | 'disetujui' | 'ditolak' }
export const getDaftarBooking = (params) => apiFetch(`/api/admin/booking/${toQuery(params)}`);
export const getDetailBooking = (id)     => apiFetch(`/api/admin/booking/${id}`);
// status: 'disetujui' | 'ditolak'. Backend mengirim email hasil booking ke calon penyewa.
export const prosesBooking = (id, status, catatanAdmin = '-') =>
  apiFetch(`/api/admin/booking/${id}/proses`, { method: 'PUT', body: { status, 'catatan-admin': catatanAdmin } });

// ── Laporan ───────────────────────────────────────────────────────────────────
// bulan: jumlah bulan terakhir untuk grafik pemasukan (1-24, default 6)
export const getLaporan = (bulan) => apiFetch(`/api/admin/laporan/${toQuery({ bulan })}`);

// ── Profil admin ──────────────────────────────────────────────────────────────
export const getProfilAdmin    = () => apiFetch('/api/admin/profil');
// data: { nama-lengkap?, nomor-telepon?, nama-kontak-darurat?, nomor-kontak-darurat? }
export const ubahProfilAdmin   = (data) => apiFetch('/api/admin/profil', { method: 'PUT', body: data });
export const gantiPasswordAdmin = (passwordLama, passwordBaru) =>
  apiFetch('/api/admin/profil/ganti-password', {
    method: 'PUT',
    body: { 'password-lama': passwordLama, 'password-baru': passwordBaru },
  });
