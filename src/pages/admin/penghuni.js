// Logic for pages/admin/penghuni.html: kelola data penyewa
import { mountAdminNav } from '../../components/admin-nav.js';
import { StatCard } from '../../components/stat-card.js';
import { hydrateButtons } from '../../components/button.js';
import { Dialog, DaftarInfo, FormDialog } from '../../components/dialog.js';
import { ICON, tombolAksi, isiTabel, halamanData, renderPaging } from '../../components/table-kit.js';
import { requireRole, logout } from '../../utils/auth-guard.js';
import { $, el, badge, cocok, tampilPesan, formatTanggalSaja, formatTanggalRingkas } from '../../utils/dom.js';
import { getDaftarPenyewa, tambahPenyewa, ubahPenyewa, hapusPenyewa } from '../../services/admin-service.js';

let semua = [];
let halaman = 1;

const FIELD = [
  { name: 'nama-lengkap',         label: 'Nama lengkap',         required: true },
  { name: 'email',                label: 'Email',                required: true, type: 'email' },
  { name: 'nomor-telepon',        label: 'Nomor telepon',        required: true, type: 'tel' },
  { name: 'nama-kontak-darurat',  label: 'Nama kontak darurat',  required: true },
  { name: 'nomor-kontak-darurat', label: 'Nomor kontak darurat', required: true, type: 'tel' },
];

let sedangUbah = null;
const formPenyewa = FormDialog({
  title: 'Tambah penyewa',
  fields: FIELD,
  catatan: 'Akun login dibuat otomatis dan kata sandi awal dikirim ke email penyewa. Kamar diatur lewat halaman Kamar.',
  onSubmit: async (nilai) => {
    if (sedangUbah) {
      await ubahPenyewa(sedangUbah._id, nilai);
      tampilPesan('ok', `Data ${nilai['nama-lengkap']} berhasil diperbarui.`);
    } else {
      await tambahPenyewa(nilai);
      tampilPesan('ok', `Penyewa ${nilai['nama-lengkap']} berhasil ditambahkan.`);
    }
    await muat();
  },
});

const detail = Dialog({ title: 'Detail penyewa' });

function bukaDetail(p) {
  detail.setTitle(p['nama-lengkap']);
  detail.body.replaceChildren(DaftarInfo([
    ['ID', p._id],
    ['Email', p.email],
    ['Telepon', p['nomor-telepon']],
    ['Kamar', p.aktif ? `Kamar ${p['nama-kamar'] ?? p['id-kamar']}` : 'Belum menempati kamar'],
    ['Masa sewa', p['tanggal-mulai'] ? `${formatTanggalSaja(p['tanggal-mulai'])} s.d. ${formatTanggalSaja(p['tanggal-berakhir'])}` : '-'],
    ['Kontak darurat', `${p['nama-kontak-darurat'] ?? '-'} (${p['nomor-kontak-darurat'] ?? '-'})`],
  ]));
  detail.open();
}

async function aksiHapus(p) {
  if (!window.confirm(`Hapus penyewa ${p['nama-lengkap']}? Tindakan ini tidak bisa dibatalkan.`)) return;
  try {
    await hapusPenyewa(p._id);
    tampilPesan('ok', `Penyewa ${p['nama-lengkap']} berhasil dihapus.`);
    await muat();
  } catch (err) {
    tampilPesan('error', err.message);
  }
}

const KOLOM = [
  { render: (p) => p['nama-lengkap'], cls: 'font-medium' },
  { render: (p) => p.email },
  { render: (p) => p['nomor-telepon'], cls: 'whitespace-nowrap' },
  { render: (p) => (p.aktif ? `Kamar ${p['nama-kamar'] ?? p['id-kamar']}` : '-') },
  { render: (p) => (p['tanggal-mulai'] ? `${formatTanggalRingkas(p['tanggal-mulai'])} s.d. ${formatTanggalRingkas(p['tanggal-berakhir'])}` : '-'), cls: 'whitespace-nowrap' },
  { render: (p) => (p.aktif ? badge('Menempati kamar', 'hijau') : badge('Belum ada kamar', 'abu')) },
  {
    render: (p) => {
      const w = el('div', 'flex justify-end gap-1');
      w.append(
        tombolAksi('Lihat penyewa', ICON.lihat, () => bukaDetail(p)),
        tombolAksi('Ubah penyewa', ICON.ubah, () => { sedangUbah = p; formPenyewa.open(p, { title: `Ubah ${p['nama-lengkap']}`, submitLabel: 'Simpan perubahan' }); }),
        tombolAksi('Hapus penyewa', ICON.hapus, () => aksiHapus(p), 'text-red-700'),
      );
      return w;
    },
  },
];

function tersaring() {
  const kata = $('cari').value.trim();
  const status = $('filter-status').value;
  return semua.filter((p) => {
    if (status === 'aktif' && !p.aktif) return false;
    if (status === 'nonaktif' && p.aktif) return false;
    return cocok(kata, p['nama-lengkap'], p.email, p['nomor-telepon'], p['nama-kamar'] ?? '');
  });
}

function renderStats() {
  const aktif = semua.filter((p) => p.aktif).length;
  $('stats').replaceChildren(
    StatCard({ label: 'Total penyewa', value: semua.length }),
    StatCard({ label: 'Menempati kamar', value: aktif }),
    StatCard({ label: 'Belum ada kamar', value: semua.length - aktif }),
  );
}

function renderTabel() {
  const hasil = tersaring();
  const h = halamanData(hasil, halaman);
  halaman = h.halaman;
  $('jumlah').textContent = `${hasil.length} penyewa`;
  isiTabel($('tabel-body'), KOLOM, h.irisan, 'Tidak ada penyewa yang cocok.');
  renderPaging($('paging'), halaman, h.total, (ke) => { halaman = ke; renderTabel(); });
}

async function muat() {
  try {
    const data = await getDaftarPenyewa();
    semua = Array.isArray(data) ? data : [];
  } catch (err) {
    semua = [];
    tampilPesan('error', err.message);
  }
  renderStats();
  renderTabel();
}

function init() {
  mountAdminNav({ sidebarEl: $('sidebar'), bottomEl: $('bottom-nav'), active: 'penghuni', onLogout: logout });
  $('logout-mobile').addEventListener('click', logout);
  hydrateButtons(document);

  $('btn-tambah').addEventListener('click', () => {
    tampilPesan('', '');
    sedangUbah = null;
    formPenyewa.open({}, { title: 'Tambah penyewa', submitLabel: 'Simpan penyewa' });
  });
  $('cari').addEventListener('input', () => { halaman = 1; renderTabel(); });
  $('filter-status').addEventListener('change', () => { halaman = 1; renderTabel(); });

  renderStats();
  muat();
}

if (requireRole('admin')) init();
