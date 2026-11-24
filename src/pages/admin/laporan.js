// Logic for pages/admin/laporan.html: pemasukan, kamar, penyewa aktif, status operasional
import { mountAdminNav } from '../../components/admin-nav.js';
import { StatCard } from '../../components/stat-card.js';
import { isiTabel } from '../../components/table-kit.js';
import { requireRole, logout } from '../../utils/auth-guard.js';
import { $, el, tampilPesan } from '../../utils/dom.js';
import { formatRupiah } from '../../utils/format.js';
import { getLaporan } from '../../services/admin-service.js';

const namaBulan = (kunci) => {
  const [t, b] = kunci.split('-').map(Number);
  return new Intl.DateTimeFormat('id-ID', { month: 'short', year: 'numeric' }).format(new Date(t, b - 1, 1));
};

function renderStats(l) {
  $('stats').replaceChildren(
    StatCard({ label: 'Pemasukan bulan ini', value: formatRupiah(l.pemasukan['bulan-ini']) }),
    StatCard({ label: 'Total pemasukan', value: formatRupiah(l.pemasukan.total), note: 'Semua pembayaran terverifikasi' }),
    StatCard({ label: 'Kamar kosong', value: l.kamar.kosong, note: `dari ${l.kamar.total} kamar` }),
    StatCard({ label: 'Penyewa aktif', value: l['penyewa-aktif'] }),
  );
}

function renderGrafik(perBulan) {
  const wadah = $('grafik');
  wadah.replaceChildren();
  const maks = Math.max(...perBulan.map((m) => m.total), 0);

  if (maks === 0) {
    wadah.append(el('p', 'text-sm text-[var(--color-muted)]', 'Belum ada pemasukan pada rentang ini.'));
    return;
  }
  perBulan.forEach((m) => {
    const baris = el('div', 'grid grid-cols-[4.5rem_1fr_7rem] items-center gap-3 text-sm');
    baris.setAttribute('aria-label', `${namaBulan(m.bulan)}: ${formatRupiah(m.total)}`);
    const batang = el('div', 'h-5 rounded bg-[var(--color-primary)]/10');
    const isi = el('div', 'h-5 rounded bg-[var(--color-primary)]');
    isi.style.width = `${Math.max((m.total / maks) * 100, m.total > 0 ? 2 : 0)}%`;
    batang.append(isi);
    baris.append(
      el('span', 'text-[var(--color-muted)]', namaBulan(m.bulan)),
      batang,
      el('span', 'whitespace-nowrap text-right font-medium', formatRupiah(m.total)),
    );
    wadah.append(baris);
  });
}

function baris(label, nilai, href) {
  const li = el('li', 'flex items-center justify-between gap-3 py-2 text-sm');
  const kiri = href ? el('a', 'text-[var(--color-primary)] underline-offset-2 hover:underline', label) : el('span', '', label);
  if (href) kiri.href = href;
  li.append(kiri, el('span', 'font-semibold', String(nilai)));
  return li;
}

function renderOperasional(l) {
  const o = l.operasional;
  const wadah = $('operasional');
  wadah.replaceChildren();

  const hunian = el('div');
  hunian.append(
    el('div', 'flex items-baseline justify-between text-sm', ''),
  );
  hunian.firstChild.append(el('span', 'text-[var(--color-muted)]', 'Tingkat hunian'), el('span', 'font-[family-name:var(--font-heading)] text-2xl font-semibold text-[var(--color-primary)]', `${o['tingkat-hunian']}%`));
  const track = el('div', 'mt-2 h-2.5 rounded-full bg-[var(--color-primary)]/10');
  track.setAttribute('role', 'progressbar');
  track.setAttribute('aria-valuenow', String(o['tingkat-hunian']));
  track.setAttribute('aria-valuemin', '0');
  track.setAttribute('aria-valuemax', '100');
  track.setAttribute('aria-label', 'Tingkat hunian kamar');
  const isi = el('div', 'h-2.5 rounded-full bg-[var(--color-primary)]');
  isi.style.width = `${o['tingkat-hunian']}%`;
  track.append(isi);
  hunian.append(track);

  const kamar = el('ul', 'mt-4 divide-y divide-[var(--color-primary)]/10 border-t border-[var(--color-primary)]/10');
  kamar.append(
    baris('Kamar kosong', l.kamar.kosong),
    baris('Kamar dipesan', l.kamar.dipesan),
    baris('Kamar terisi', l.kamar.terisi),
    baris('Kamar perbaikan', l.kamar.perbaikan),
  );

  const perhatian = el('ul', 'mt-4 divide-y divide-[var(--color-primary)]/10 border-t border-[var(--color-primary)]/10');
  perhatian.append(
    baris('Tagihan menunggak', o['tagihan-nunggak'], '/admin/tagihan'),
    baris('Pembayaran menunggu verifikasi', o['pembayaran-menunggu-verifikasi'], '/admin/pembayaran'),
    baris('Booking menunggu keputusan', o['booking-menunggu'], '/admin/booking'),
  );

  wadah.append(hunian, kamar, perhatian);
}

const rp = (n) => formatRupiah(n);
const KOLOM = [
  { render: (p) => p['nama-penyewa'], cls: 'font-medium' },
  { render: (p) => p['nama-kamar'] ?? '-' },
  { render: (p) => rp(p['total-tagihan']), cls: 'whitespace-nowrap' },
  { render: (p) => rp(p['total-lunas']), cls: 'whitespace-nowrap' },
  { render: (p) => rp(p['sisa-tagihan']), cls: 'whitespace-nowrap font-medium' },
  { render: (p) => p['tagihan-belum-lunas'] },
  { render: (p) => (p['tagihan-nunggak'] > 0 ? `${p['tagihan-nunggak']} tagihan` : '-'), cls: 'whitespace-nowrap' },
];

async function muat() {
  tampilPesan('', '');
  try {
    const l = await getLaporan($('filter-bulan').value);
    renderStats(l);
    renderGrafik(l.pemasukan['per-bulan']);
    renderOperasional(l);
    isiTabel($('tabel-body'), KOLOM, l['pembayaran-penyewa'], 'Belum ada data tagihan penyewa.');
  } catch (err) {
    tampilPesan('error', err.message);
  }
}

function init() {
  mountAdminNav({ sidebarEl: $('sidebar'), bottomEl: $('bottom-nav'), active: 'laporan', onLogout: logout });
  $('logout-mobile').addEventListener('click', logout);
  $('filter-bulan').addEventListener('change', muat);
  muat();
}

if (requireRole('admin')) init();
