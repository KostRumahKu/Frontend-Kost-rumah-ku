// Logic for pages/admin/tagihan.html: daftar tagihan bulanan dan validasi bukti pembayaran
import { mountAdminNav } from '../../components/admin-nav.js';
import { StatCard } from '../../components/stat-card.js';
import { ICON, tombolAksi, isiTabel, halamanData, renderPaging } from '../../components/table-kit.js';
import { buatDialogTagihan, badgeStatus, sudahBayar, menungguValidasi, penyewa, kamar } from '../../components/tagihan-kit.js';
import { requireRole, logout } from '../../utils/auth-guard.js';
import { $, el, cocok, tampilPesan, formatTanggalSaja } from '../../utils/dom.js';
import { formatRupiah } from '../../utils/format.js';
import { getDaftarTagihan } from '../../services/admin-service.js';

let semua = [];
let halaman = 1;

const dlg = buatDialogTagihan({ onSelesai: async (pesan) => { tampilPesan('ok', pesan); await muat(); } });

const KOLOM = [
  { render: (t) => t['nomor-tagihan'], cls: 'font-medium whitespace-nowrap' },
  { render: (t) => penyewa(t) },
  { render: (t) => kamar(t) },
  { render: (t) => t['bulan-tagihan'], cls: 'whitespace-nowrap' },
  { render: (t) => formatRupiah(t['jumlah-tagihan']), cls: 'whitespace-nowrap' },
  { render: (t) => formatTanggalSaja(t['tanggal-jatuh-tempo']), cls: 'whitespace-nowrap' },
  { render: (t) => badgeStatus(t) },
  {
    render: (t) => {
      const w = el('div', 'flex justify-end gap-1');
      w.append(tombolAksi('Lihat tagihan dan bukti', ICON.lihat, () => dlg.buka(t)));
      if (menungguValidasi(t)) {
        w.append(
          tombolAksi('Terima pembayaran', ICON.terima, () => dlg.mulaiValidasi(t, 'disetujui'), 'text-green-700'),
          tombolAksi('Tolak pembayaran', ICON.tolak, () => dlg.mulaiValidasi(t, 'ditolak'), 'text-red-700'),
        );
      }
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
    return cocok(kata, t['nomor-tagihan'], penyewa(t), kamar(t));
  });
}

function renderStats() {
  const total = semua.reduce((n, t) => n + (t['jumlah-tagihan'] || 0), 0);
  const lunas = semua.filter(sudahBayar).reduce((n, t) => n + (t['jumlah-tagihan'] || 0), 0);
  $('stats').replaceChildren(
    StatCard({ label: 'Total tagihan', value: formatRupiah(total) }),
    StatCard({ label: 'Belum dibayar', value: formatRupiah(total - lunas) }),
    StatCard({ label: 'Sudah dibayar', value: formatRupiah(lunas) }),
    StatCard({ label: 'Menunggu validasi', value: semua.filter(menungguValidasi).length }),
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
  $('btn-buat')?.remove(); // tagihan dibuat otomatis oleh sistem, tidak ada endpoint buat manual
  $('cari').addEventListener('input', () => { halaman = 1; renderTabel(); });
  ['filter-periode', 'filter-status'].forEach((id) => $(id).addEventListener('change', () => { halaman = 1; renderTabel(); }));
  renderStats();
  muat();
}

if (requireRole('admin')) init();
