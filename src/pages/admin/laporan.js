// Logic for pages/admin/laporan.html: pemasukan, kamar, penyewa aktif, status operasional
import { mountAdminNav } from '../../components/admin-nav.js';
import { StatCard } from '../../components/stat-card.js';
import { isiTabel } from '../../components/table-kit.js';
import { requireRole, logout } from '../../utils/auth-guard.js';
import { $, el, tampilPesan } from '../../utils/dom.js';
import { formatRupiah } from '../../utils/format.js';
import { getRingkasanKeuangan, getDaftarTransaksi, getDaftarKamar, getDaftarPenyewa, getDaftarTagihan, getDaftarBooking } from '../../services/admin-service.js';
import { sudahBayar, terlambat, penyewa as namaPenyewa, kamar as namaKamarTagihan, idPenyewa } from '../../components/tagihan-kit.js';

const namaBulan = (kunci) => {
  const [t, b] = kunci.split('-').map(Number);
  return new Intl.DateTimeFormat('id-ID', { month: 'short', year: 'numeric' }).format(new Date(t, b - 1, 1));
};

const daftar = (d) => (Array.isArray(d) ? d : []);

/** Kumpulkan semua data laporan dari endpoint yang ada, lalu hitung sendiri turunannya. */
async function kumpulkan(jmlBulan) {
  const [ringkasan, transaksi, kamar, penyewa, tagihan, booking] = await Promise.all([
    getRingkasanKeuangan(), getDaftarTransaksi(), getDaftarKamar({ diarsipkan: 'false' }), getDaftarPenyewa(), getDaftarTagihan(), getDaftarBooking(),
  ]);

  const trx = daftar(transaksi);
  const sekarang = new Date();
  const kunci = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const perBulan = [];
  for (let i = jmlBulan - 1; i >= 0; i--) perBulan.push({ bulan: kunci(new Date(sekarang.getFullYear(), sekarang.getMonth() - i, 1)), total: 0, keluar: 0 });
  trx.forEach((t) => {
    const m = perBulan.find((x) => x.bulan === kunci(new Date(t['tanggal-transaksi'] ?? t['dibuat-pada'])));
    if (!m) return;
    if (t['tipe-transaksi'] === 'pemasukan') m.total += t.nominal || 0; else m.keluar += t.nominal || 0;
  });

  const km = daftar(kamar);
  const hitungKamar = (st) => km.filter((k) => k.status === st).length;
  const kmInfo = { total: km.length, kosong: hitungKamar('kosong'), dipesan: hitungKamar('dipesan'), terisi: hitungKamar('terisi'), perbaikan: hitungKamar('perbaikan') };
  const dapatDisewa = kmInfo.total - kmInfo.perbaikan;

  const pnyw = daftar(penyewa);
  const tgh = daftar(tagihan);
  const peta = new Map();
  tgh.forEach((t) => {
    const id = idPenyewa(t) ?? namaPenyewa(t);
    const r = peta.get(id) ?? { nama: namaPenyewa(t), kamar: namaKamarTagihan(t), total: 0, lunas: 0, belumLunas: 0, nunggak: 0 };
    r.total += t['jumlah-tagihan'] || 0;
    if (sudahBayar(t)) r.lunas += t['jumlah-tagihan'] || 0; else r.belumLunas += 1;
    if (terlambat(t)) r.nunggak += 1;
    peta.set(id, r);
  });

  return {
    ringkasan: ringkasan ?? {},
    perBulan,
    kamar: kmInfo,
    penyewaAktif: pnyw.filter((p) => p['id-kamar'] && typeof p['id-kamar'] === 'object').length,
    hunian: dapatDisewa > 0 ? Math.round((kmInfo.terisi / dapatDisewa) * 100) : 0,
    nunggak: tgh.filter(terlambat).length,
    menungguBayar: tgh.filter((t) => !sudahBayar(t) && t['bukti-pembayaran']).length,
    bookingMenunggu: daftar(booking).filter((b) => /menunggu|pending/i.test(b.status ?? '')).length,
    perPenyewa: [...peta.values()].sort((a, b) => (b.total - b.lunas) - (a.total - a.lunas)),
  };
}

function renderStats(l) {
  $('stats').replaceChildren(
    StatCard({ label: 'Total pemasukan', value: formatRupiah(l.ringkasan['total-pemasukan'] ?? 0) }),
    StatCard({ label: 'Total pengeluaran', value: formatRupiah(l.ringkasan['total-pengeluaran'] ?? 0), note: `Saldo ${formatRupiah(l.ringkasan.saldo ?? 0)}` }),
    StatCard({ label: 'Kamar kosong', value: l.kamar.kosong, note: `dari ${l.kamar.total} kamar` }),
    StatCard({ label: 'Penyewa aktif', value: l.penyewaAktif }),
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
  const o = { 'tingkat-hunian': l.hunian, 'tagihan-nunggak': l.nunggak, 'pembayaran-menunggu-verifikasi': l.menungguBayar, 'booking-menunggu': l.bookingMenunggu };
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
  { render: (p) => p.nama, cls: 'font-medium' },
  { render: (p) => p.kamar },
  { render: (p) => rp(p.total), cls: 'whitespace-nowrap' },
  { render: (p) => rp(p.lunas), cls: 'whitespace-nowrap' },
  { render: (p) => rp(p.total - p.lunas), cls: 'whitespace-nowrap font-medium' },
  { render: (p) => p.belumLunas },
  { render: (p) => (p.nunggak > 0 ? `${p.nunggak} tagihan` : '-'), cls: 'whitespace-nowrap' },
];

async function muat() {
  tampilPesan('', '');
  try {
    const l = await kumpulkan(Number($('filter-bulan').value) || 6);
    renderStats(l);
    renderGrafik(l.perBulan);
    renderOperasional(l);
    isiTabel($('tabel-body'), KOLOM, l.perPenyewa, 'Belum ada data tagihan penyewa.');
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
