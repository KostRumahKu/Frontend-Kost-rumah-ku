// Logic for pages/admin/pembayaran.html: verifikasi bukti, terima/tolak, histori, pantau status
import { mountAdminNav } from '../../components/admin-nav.js';
import { StatCard } from '../../components/stat-card.js';
import { Button } from '../../components/button.js';
import { Dialog, DaftarInfo } from '../../components/dialog.js';
import { ICON, tombolAksi, isiTabel, halamanData, renderPaging } from '../../components/table-kit.js';
import { requireRole, logout } from '../../utils/auth-guard.js';
import { $, el, badge, cocok, tampilPesan, urlAman, formatTanggalSaja, formatTanggalRingkas } from '../../utils/dom.js';
import { formatRupiah } from '../../utils/format.js';
import { getDaftarPembayaran, prosesPembayaran } from '../../services/admin-service.js';

let semua = [];
let halaman = 1;

const STATUS = {
  menunggu:      { label: 'Menunggu verifikasi', warna: 'kuning' },
  terverifikasi: { label: 'Terverifikasi',       warna: 'hijau' },
  ditolak:       { label: 'Ditolak',             warna: 'merah' },
};
const STATUS_TAGIHAN = {
  'belum-bayar': { label: 'Belum bayar', warna: 'kuning' },
  lunas:         { label: 'Lunas',       warna: 'hijau' },
  terlambat:     { label: 'Terlambat',   warna: 'merah' },
};
const badgeStatus = (p) => { const s = STATUS[p.status] ?? { label: p.status, warna: 'abu' }; return badge(s.label, s.warna); };
const badgeTagihan = (p) => { const s = STATUS_TAGIHAN[p['status-tagihan']] ?? { label: p['status-tagihan'] ?? '-', warna: 'abu' }; return badge(s.label, s.warna); };

const detail = Dialog({ title: 'Detail pembayaran', lebar: 'max-w-xl' });

async function proses(p, status) {
  const teks = status === 'terverifikasi'
    ? `Terima pembayaran ${formatRupiah(p['jumlah-bayar'])} dari ${p['nama-penyewa']}? Tagihan ${p['nomor-tagihan']} akan ditandai lunas.`
    : `Tolak pembayaran dari ${p['nama-penyewa']} untuk tagihan ${p['nomor-tagihan']}?`;
  if (!window.confirm(teks)) return;
  try {
    await prosesPembayaran(p._id, status);
    detail.close();
    tampilPesan('ok', status === 'terverifikasi' ? 'Pembayaran diterima dan tagihan ditandai lunas.' : 'Pembayaran ditolak.');
    await muat();
  } catch (err) {
    detail.dlg.open ? detail.setError(err.message) : tampilPesan('error', err.message);
  }
}

function bukaDetail(p) {
  detail.setTitle(`Pembayaran ${p['nomor-tagihan'] ?? ''}`.trim());
  detail.body.replaceChildren();

  const foto = urlAman(p['foto-bukti']);
  if (foto) {
    const a = el('a', 'mb-4 block');
    a.href = foto; a.target = '_blank'; a.rel = 'noopener noreferrer';
    const img = el('img', 'max-h-72 w-full rounded-xl bg-white object-contain');
    img.src = foto; img.alt = `Bukti pembayaran ${p['nama-penyewa'] ?? ''}`; img.loading = 'lazy';
    img.addEventListener('error', () => a.replaceWith(el('p', 'mb-4 rounded-xl bg-[var(--color-cream)] px-4 py-3 text-sm text-[var(--color-muted)]', 'Bukti pembayaran tidak dapat dimuat.')));
    a.append(img);
    detail.body.append(a);
  } else {
    detail.body.append(el('p', 'mb-4 rounded-xl bg-[var(--color-cream)] px-4 py-3 text-sm text-[var(--color-muted)]', 'Belum ada bukti pembayaran yang diunggah.'));
  }

  detail.body.append(DaftarInfo([
    ['Penyewa', p['nama-penyewa']],
    ['Kamar', p['nama-kamar']],
    ['Tagihan', `${p['nomor-tagihan'] ?? '-'} (${p['bulan-tagihan'] ?? '-'})`],
    ['Nilai tagihan', formatRupiah(p['jumlah-tagihan'])],
    ['Jumlah dibayar', formatRupiah(p['jumlah-bayar'])],
    ['Metode', p['metode-pembayaran']],
    ['Tanggal bayar', formatTanggalSaja(p['tanggal-bayar'])],
    ['Status bayar', badgeStatus(p)],
    ['Status tagihan', badgeTagihan(p)],
  ]));

  detail.footer.replaceChildren();
  if (p.status === 'menunggu') {
    detail.footer.className = 'mt-5 flex flex-wrap justify-end gap-2 border-t border-[var(--color-primary)]/10 pt-5';
    detail.footer.append(
      Button({ label: 'Tolak', variant: 'danger', onClick: () => proses(p, 'ditolak') }),
      Button({ label: 'Terima pembayaran', variant: 'primary', onClick: () => proses(p, 'terverifikasi') }),
    );
  }
  detail.open();
}

const KOLOM = [
  { render: (p) => formatTanggalRingkas(p['tanggal-bayar']), cls: 'whitespace-nowrap' },
  { render: (p) => p['nama-penyewa'] ?? '-', cls: 'font-medium' },
  { render: (p) => p['nama-kamar'] ?? '-' },
  { render: (p) => p['nomor-tagihan'] ?? '-', cls: 'whitespace-nowrap' },
  {
    render: (p) => {
      const w = el('div', 'whitespace-nowrap');
      w.append(el('div', '', formatRupiah(p['jumlah-bayar'])), el('div', 'text-xs text-[var(--color-muted)]', p['metode-pembayaran'] ?? '-'));
      return w;
    },
  },
  { render: (p) => badgeStatus(p) },
  {
    render: (p) => {
      const w = el('div', 'flex justify-end gap-1');
      w.append(tombolAksi('Lihat bukti dan detail', ICON.lihat, () => bukaDetail(p)));
      if (p.status === 'menunggu') {
        w.append(
          tombolAksi('Terima pembayaran', ICON.terima, () => proses(p, 'terverifikasi'), 'text-green-700'),
          tombolAksi('Tolak pembayaran', ICON.tolak, () => proses(p, 'ditolak'), 'text-red-700'),
        );
      }
      return w;
    },
  },
];

function tersaring() {
  const kata = $('cari').value.trim();
  const status = $('filter-status').value;
  const penyewa = $('filter-penyewa').value;
  return semua.filter((p) => {
    if (status && p.status !== status) return false;
    if (penyewa && p['id-pengguna'] !== penyewa) return false;
    return cocok(kata, p['nomor-tagihan'] ?? '', p['nama-penyewa'] ?? '', p['nama-kamar'] ?? '');
  });
}

function renderStats() {
  const hitung = (s) => semua.filter((p) => p.status === s).length;
  const pemasukan = semua.filter((p) => p.status === 'terverifikasi').reduce((n, p) => n + (p['jumlah-bayar'] || 0), 0);
  $('stats').replaceChildren(
    StatCard({ label: 'Menunggu verifikasi', value: hitung('menunggu') }),
    StatCard({ label: 'Terverifikasi', value: hitung('terverifikasi') }),
    StatCard({ label: 'Ditolak', value: hitung('ditolak') }),
    StatCard({ label: 'Total pembayaran diterima', value: formatRupiah(pemasukan) }),
  );
}

function isiFilterPenyewa() {
  const select = $('filter-penyewa');
  const dipilih = select.value;
  const peta = new Map();
  semua.forEach((p) => { if (p['id-pengguna']) peta.set(p['id-pengguna'], p['nama-penyewa'] ?? p['id-pengguna']); });
  const urut = [...peta.entries()].sort((a, b) => a[1].localeCompare(b[1], 'id'));
  select.replaceChildren(new Option('Semua penyewa', ''), ...urut.map(([id, nama]) => new Option(nama, id)));
  select.value = peta.has(dipilih) ? dipilih : '';
}

function renderTabel() {
  const hasil = tersaring();
  const h = halamanData(hasil, halaman);
  halaman = h.halaman;
  $('jumlah').textContent = `${hasil.length} pembayaran`;
  isiTabel($('tabel-body'), KOLOM, h.irisan, 'Tidak ada pembayaran yang cocok.');
  renderPaging($('paging'), halaman, h.total, (ke) => { halaman = ke; renderTabel(); });
}

async function muat() {
  try {
    const data = await getDaftarPembayaran();
    semua = Array.isArray(data) ? data : [];
  } catch (err) {
    semua = [];
    tampilPesan('error', err.message);
  }
  renderStats();
  isiFilterPenyewa();
  renderTabel();
}

function init() {
  mountAdminNav({ sidebarEl: $('sidebar'), bottomEl: $('bottom-nav'), active: 'pembayaran', onLogout: logout });
  $('logout-mobile').addEventListener('click', logout);
  $('cari').addEventListener('input', () => { halaman = 1; renderTabel(); });
  ['filter-status', 'filter-penyewa'].forEach((id) => $(id).addEventListener('change', () => { halaman = 1; renderTabel(); }));
  renderStats();
  muat();
}

if (requireRole('admin')) init();
