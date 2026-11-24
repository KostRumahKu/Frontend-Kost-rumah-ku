// Logic for pages/admin/tagihan.html
import { mountAdminNav } from '../../components/admin-nav.js';
import { StatCard } from '../../components/stat-card.js';
import { hydrateButtons } from '../../components/button.js';
import { Dialog, DaftarInfo, FormDialog } from '../../components/dialog.js';
import { ICON, tombolAksi, isiTabel, halamanData, renderPaging } from '../../components/table-kit.js';
import { requireRole, logout } from '../../utils/auth-guard.js';
import { $, el, badge, cocok, tampilPesan, formatTanggalSaja } from '../../utils/dom.js';
import { formatRupiah } from '../../utils/format.js';
import { getDaftarTagihan, getDaftarPenyewa, buatTagihan, ubahTagihan, hapusTagihan } from '../../services/admin-service.js';

let semua = [];
let halaman = 1;
let sedangUbah = null;

/* Bentuk data dari backend: nomor-tagihan, bulan-tagihan, jumlah-tagihan, tanggal-jatuh-tempo,
 * status (belum-bayar | lunas | terlambat), nama-penyewa, nama-kamar. */
const sudahBayar = (t) => t.status === 'lunas';
const terlambat = (t) => !sudahBayar(t) && (t.status === 'terlambat' || new Date(t['tanggal-jatuh-tempo']) < new Date());

function badgeStatus(t) {
  if (sudahBayar(t)) return badge('Sudah dibayar', 'hijau');
  return terlambat(t) ? badge('Terlambat', 'merah') : badge('Belum dibayar', 'kuning');
}

const tanggalInput = (iso) => (iso ? new Date(iso).toISOString().slice(0, 10) : '');

/* ---------- Form buat / ubah ---------- */
const formBuat = FormDialog({
  title: 'Buat tagihan',
  fields: [
    { name: 'id-pengguna', label: 'Penyewa', type: 'select', required: true, options: [{ value: '', label: 'Memuat...' }] },
    { name: 'bulan-tagihan', label: 'Periode', required: true, placeholder: 'Contoh: Desember 2026', hint: 'Tulis dengan format yang sama seperti tagihan otomatis, yaitu nama bulan dan tahun.' },
    { name: 'tanggal-jatuh-tempo', label: 'Jatuh tempo', type: 'date', required: true },
    { name: 'jumlah-tagihan', label: 'Jumlah (Rp)', type: 'number', min: 1, hint: 'Kosongkan untuk memakai harga kamar penyewa.' },
  ],
  onSubmit: async (nilai) => {
    const data = { ...nilai, 'tanggal-jatuh-tempo': `${nilai['tanggal-jatuh-tempo']}T16:59:59.000Z` };
    if (data['jumlah-tagihan'] === '' || data['jumlah-tagihan'] === undefined) delete data['jumlah-tagihan'];
    await buatTagihan(data);
    tampilPesan('ok', 'Tagihan berhasil dibuat.');
    await muat();
  },
});

const formUbah = FormDialog({
  title: 'Ubah tagihan',
  fields: [
    { name: 'jumlah-tagihan', label: 'Jumlah (Rp)', type: 'number', required: true, min: 1 },
    { name: 'tanggal-jatuh-tempo', label: 'Jatuh tempo', type: 'date', required: true },
    { name: 'status', label: 'Status', type: 'select', required: true, options: [
      { value: 'belum-bayar', label: 'Belum dibayar' },
      { value: 'terlambat', label: 'Terlambat' },
      { value: 'lunas', label: 'Sudah dibayar' },
    ] },
  ],
  onSubmit: async (nilai) => {
    await ubahTagihan(sedangUbah._id, { ...nilai, 'tanggal-jatuh-tempo': `${nilai['tanggal-jatuh-tempo']}T16:59:59.000Z` });
    tampilPesan('ok', `Tagihan ${sedangUbah['nomor-tagihan']} berhasil diperbarui.`);
    await muat();
  },
});

async function bukaBuat() {
  tampilPesan('', '');
  formBuat.open({}, {});
  // Isi pilihan penyewa (hanya yang sudah menempati kamar, karena tagihan butuh kamar)
  const select = formBuat.dlg.querySelector('select');
  try {
    const penyewa = (await getDaftarPenyewa({ status: 'aktif' })) ?? [];
    select.replaceChildren(
      new Option('Pilih penyewa', ''),
      ...penyewa.map((p) => new Option(`${p['nama-lengkap']} (Kamar ${p['nama-kamar'] ?? p['id-kamar']})`, p._id)),
    );
  } catch (err) {
    select.replaceChildren(new Option('Gagal memuat penyewa', ''));
    tampilPesan('error', err.message);
  }
}

/* ---------- Detail ---------- */
const detail = Dialog({ title: 'Detail tagihan' });
function bukaDetail(t) {
  detail.setTitle(`Tagihan ${t['nomor-tagihan']}`);
  detail.body.replaceChildren(DaftarInfo([
    ['Penyewa', t['nama-penyewa']],
    ['Kamar', t['nama-kamar']],
    ['Periode', t['bulan-tagihan']],
    ['Jumlah', formatRupiah(t['jumlah-tagihan'])],
    ['Jatuh tempo', formatTanggalSaja(t['tanggal-jatuh-tempo'])],
    ['Status', badgeStatus(t)],
  ]));
  detail.open();
}

async function aksiHapus(t) {
  if (!window.confirm(`Hapus tagihan ${t['nomor-tagihan']}? Bukti pembayaran terkait ikut terhapus dan tindakan ini tidak bisa dibatalkan.`)) return;
  try {
    await hapusTagihan(t._id);
    tampilPesan('ok', `Tagihan ${t['nomor-tagihan']} berhasil dihapus.`);
    await muat();
  } catch (err) {
    tampilPesan('error', err.message);
  }
}

/* ---------- Tabel ---------- */
const KOLOM = [
  { render: (t) => t['nomor-tagihan'], cls: 'font-medium whitespace-nowrap' },
  { render: (t) => t['nama-penyewa'] ?? '-' },
  { render: (t) => t['nama-kamar'] ?? '-' },
  { render: (t) => t['bulan-tagihan'], cls: 'whitespace-nowrap' },
  { render: (t) => formatRupiah(t['jumlah-tagihan']), cls: 'whitespace-nowrap' },
  { render: (t) => formatTanggalSaja(t['tanggal-jatuh-tempo']), cls: 'whitespace-nowrap' },
  { render: (t) => badgeStatus(t) },
  {
    render: (t) => {
      const w = el('div', 'flex justify-end gap-1');
      w.append(
        tombolAksi('Lihat tagihan', ICON.lihat, () => bukaDetail(t)),
        tombolAksi('Ubah tagihan', ICON.ubah, () => {
          sedangUbah = t;
          formUbah.open({ ...t, 'tanggal-jatuh-tempo': tanggalInput(t['tanggal-jatuh-tempo']) }, { title: `Ubah ${t['nomor-tagihan']}` });
        }),
        tombolAksi('Hapus tagihan', ICON.hapus, () => aksiHapus(t), 'text-red-700'),
      );
      return w;
    },
  },
];

function tersaring() {
  const kata = $('cari').value.trim();
  const periode = $('filter-periode').value;
  const status = $('filter-status').value;
  return semua.filter((t) => {
    if (periode && t['bulan-tagihan'] !== periode) return false;
    if (status === 'sudah' && !sudahBayar(t)) return false;
    if (status === 'belum' && sudahBayar(t)) return false;
    return cocok(kata, t['nomor-tagihan'], t['nama-penyewa'] ?? '', t['nama-kamar'] ?? '');
  });
}

function renderStats() {
  const total = semua.reduce((n, t) => n + (t['jumlah-tagihan'] || 0), 0);
  const lunas = semua.filter(sudahBayar).reduce((n, t) => n + (t['jumlah-tagihan'] || 0), 0);
  const penyewa = new Set(semua.map((t) => t['id-pengguna'])).size;
  $('stats').replaceChildren(
    StatCard({ label: 'Total tagihan', value: formatRupiah(total) }),
    StatCard({ label: 'Belum dibayar', value: formatRupiah(total - lunas) }),
    StatCard({ label: 'Sudah dibayar', value: formatRupiah(lunas) }),
    StatCard({ label: 'Total penyewa', value: penyewa }),
  );
}

function isiFilterPeriode() {
  const select = $('filter-periode');
  const dipilih = select.value;
  const daftar = [...new Set(semua.map((t) => t['bulan-tagihan']).filter(Boolean))];
  select.replaceChildren(new Option('Semua', ''), ...daftar.map((p) => new Option(p, p)));
  select.value = daftar.includes(dipilih) ? dipilih : '';
}

function renderTabel() {
  const hasil = tersaring();
  const h = halamanData(hasil, halaman);
  halaman = h.halaman;
  $('jumlah').textContent = `${hasil.length} tagihan`;
  isiTabel($('tabel-body'), KOLOM, h.irisan, 'Tidak ada tagihan yang cocok.');
  renderPaging($('paging'), halaman, h.total, (ke) => { halaman = ke; renderTabel(); });
}

async function muat() {
  try {
    const data = await getDaftarTagihan();
    semua = Array.isArray(data) ? data : [];
  } catch (err) {
    semua = [];
    tampilPesan('error', err.message);
  }
  renderStats();
  isiFilterPeriode();
  renderTabel();
}

function init() {
  mountAdminNav({ sidebarEl: $('sidebar'), bottomEl: $('bottom-nav'), active: 'tagihan', onLogout: logout });
  $('logout-mobile').addEventListener('click', logout);
  hydrateButtons(document);
  $('btn-buat').addEventListener('click', bukaBuat);
  $('cari').addEventListener('input', () => { halaman = 1; renderTabel(); });
  ['filter-periode', 'filter-status'].forEach((id) => $(id).addEventListener('change', () => { halaman = 1; renderTabel(); }));
  renderStats();
  muat();
}

if (requireRole('admin')) init();
