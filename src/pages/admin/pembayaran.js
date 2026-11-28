// Logic for pages/admin/pembayaran.html: verifikasi bukti, terima/tolak, histori, pantau status.
// Backend tidak punya endpoint /pembayaran: data pembayaran adalah tagihan yang sudah dibayar atau diajukan bukti bayarnya.
import { mountAdminNav } from '../../components/admin-nav.js';
import { StatCard } from '../../components/stat-card.js';
import { ICON, tombolAksi, isiTabel, halamanData, renderPaging } from '../../components/table-kit.js';
import { buatDialogTagihan, badgeStatus, sudahBayar, menungguValidasi, ditolak, penyewa, kamar, idPenyewa } from '../../components/tagihan-kit.js';
import { requireRole, logout } from '../../utils/auth-guard.js';
import { $, el, cocok, tampilPesan, formatTanggalRingkas } from '../../utils/dom.js';
import { formatRupiah } from '../../utils/format.js';
import { getDaftarTagihan } from '../../services/admin-service.js';

let semua = [];
let halaman = 1;

const dlg = buatDialogTagihan({ onSelesai: async (pesan) => { tampilPesan('ok', pesan); await muat(); } });

const adaPembayaran = (t) => sudahBayar(t) || ditolak(t) || menungguValidasi(t) || Boolean(t['bukti-pembayaran']);
const cocokStatus = (t, s) => (s === 'menunggu' ? menungguValidasi(t) : s === 'terverifikasi' ? sudahBayar(t) : s === 'ditolak' ? ditolak(t) : true);

const KOLOM = [
  { render: (t) => formatTanggalRingkas(t['diperbarui-pada'] ?? t['dibuat-pada']), cls: 'whitespace-nowrap' },
  { render: (t) => penyewa(t), cls: 'font-medium' },
  { render: (t) => kamar(t) },
  { render: (t) => t['nomor-tagihan'] ?? '-', cls: 'whitespace-nowrap' },
  {
    render: (t) => {
      const w = el('div', 'whitespace-nowrap');
      w.append(el('div', '', formatRupiah(t['jumlah-tagihan'])), el('div', 'text-xs text-[var(--color-muted)]', t['metode-pembayaran'] ?? '-'));
      return w;
    },
  },
  { render: (t) => badgeStatus(t) },
  {
    render: (t) => {
      const w = el('div', 'flex justify-end gap-1');
      w.append(tombolAksi('Lihat bukti dan detail', ICON.lihat, () => dlg.buka(t)));
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
  const status = $('filter-status').value;
  const id = $('filter-penyewa').value;
  return semua.filter((t) => cocokStatus(t, status) && (!id || idPenyewa(t) === id) && cocok(kata, t['nomor-tagihan'] ?? '', penyewa(t), kamar(t)));
}

function renderStats() {
  const diterima = semua.filter(sudahBayar).reduce((n, t) => n + (t['jumlah-tagihan'] || 0), 0);
  $('stats').replaceChildren(
    StatCard({ label: 'Menunggu verifikasi', value: semua.filter(menungguValidasi).length }),
    StatCard({ label: 'Terverifikasi', value: semua.filter(sudahBayar).length }),
    StatCard({ label: 'Ditolak', value: semua.filter(ditolak).length }),
    StatCard({ label: 'Total pembayaran diterima', value: formatRupiah(diterima) }),
  );
}

function isiFilterPenyewa() {
  const select = $('filter-penyewa');
  const dipilih = select.value;
  const peta = new Map();
  semua.forEach((t) => { const id = idPenyewa(t); if (id) peta.set(id, penyewa(t)); });
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
    const data = await getDaftarTagihan();
    semua = (Array.isArray(data) ? data : []).filter(adaPembayaran);
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
