// Logic for pages/admin/booking.html: lihat booking, terima/tolak, detail calon penyewa
import { mountAdminNav } from '../../components/admin-nav.js';
import { StatCard } from '../../components/stat-card.js';
import { Button } from '../../components/button.js';
import { Dialog, DaftarInfo, FormDialog } from '../../components/dialog.js';
import { ICON, tombolAksi, isiTabel, halamanData, renderPaging } from '../../components/table-kit.js';
import { requireRole, logout } from '../../utils/auth-guard.js';
import { $, el, badge, cocok, tampilPesan, urlAman, formatTanggalSaja, formatTanggalRingkas } from '../../utils/dom.js';
import { formatRupiah } from '../../utils/format.js';
import { getDaftarBooking, validasiBooking } from '../../services/admin-service.js';

let semua = [];
let halaman = 1;
let sedangDiproses = null; // { booking, status }

// Bentuk data dari backend: id-pengguna {_id, nama-lengkap, email, nomor-telepon}, id-kamar {_id, nama-kamar, tipe-kamar, lantai, harga},
// durasi-bulan, status ('berhasil' dst), tanggal-mulai, tanggal-pesan, batas-waktu-bayar, total-tagihan.
const menunggu = (b) => /menunggu|pending/i.test(b.status ?? '');
function badgeStatus(b) {
  const st = b.status ?? '-';
  if (/berhasil|setuju/i.test(st)) return badge(st === 'berhasil' ? 'Berhasil' : st, 'hijau');
  if (menunggu(b)) return badge('Menunggu', 'kuning');
  if (/tolak|gagal|batal|kadaluarsa/i.test(st)) return badge(st, 'merah');
  return badge(st, 'abu');
}
const calon = (b) => (b['id-pengguna'] && typeof b['id-pengguna'] === 'object' ? b['id-pengguna'] : {});
const kamar = (b) => (b['id-kamar'] && typeof b['id-kamar'] === 'object' ? b['id-kamar'] : null);
const namaCalon = (b) => calon(b)['nama-lengkap'] ?? '-';
const namaKamar = (b) => (kamar(b) ? `Kamar ${kamar(b)['nama-kamar'] ?? kamar(b)._id}` : '-');

const formCatatan = FormDialog({
  title: 'Proses booking',
  fields: [{ name: 'catatan', label: 'Catatan untuk calon penyewa', type: 'textarea', rows: 3, placeholder: 'Contoh: silakan lunasi sebelum batas waktu bayar.' }],
  catatan: 'Hasil booking dikirim ke email calon penyewa sebagai notifikasi.',
  onSubmit: async ({ catatan }) => {
    const { booking, status } = sedangDiproses;
    await validasiBooking(booking._id, status, catatan || '-');
    detail.close();
    tampilPesan('ok', status === 'setujui'
      ? `Booking ${namaCalon(booking)} disetujui dan notifikasi dikirim.`
      : `Booking ${namaCalon(booking)} ditolak dan notifikasi dikirim.`);
    await muat();
  },
});

function mulaiProses(b, status) {
  sedangDiproses = { booking: b, status };
  formCatatan.open({}, {
    title: `${status === 'setujui' ? 'Setujui' : 'Tolak'} booking ${namaCalon(b)}`,
    submitLabel: status === 'setujui' ? 'Setujui booking' : 'Tolak booking',
  });
}

const detail = Dialog({ title: 'Detail booking', lebar: 'max-w-xl' });

function bukaDetail(b) {
  detail.setTitle(`Booking ${namaCalon(b)}`);
  detail.body.replaceChildren(
    el('p', 'mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]', 'Calon penyewa'),
    DaftarInfo([
      ['Nama', namaCalon(b)],
      ['Email', calon(b).email],
      ['Telepon', calon(b)['nomor-telepon']],
    ]),
    el('p', 'mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]', 'Booking'),
    DaftarInfo([
      ['Kamar', kamar(b) ? `${namaKamar(b)} (${kamar(b)['tipe-kamar'] ?? '-'}, lantai ${kamar(b).lantai ?? '-'})` : '-'],
      ['Harga', kamar(b)?.harga ? `${formatRupiah(kamar(b).harga)} / bulan` : '-'],
      ['Durasi', `${b['durasi-bulan']} bulan`],
      ['Total tagihan', b['total-tagihan'] != null ? formatRupiah(b['total-tagihan']) : '-'],
      ['Mulai sewa', formatTanggalSaja(b['tanggal-mulai'])],
      ['Tanggal pesan', formatTanggalSaja(b['tanggal-pesan'])],
      ['Batas bayar', formatTanggalSaja(b['batas-waktu-bayar'])],
      ['Status', badgeStatus(b)],
    ]),
  );

  const bukti = urlAman(b['bukti-pembayaran'] ?? b['bukti']);
  if (bukti) {
    const a = el('a', 'mt-3 inline-block text-sm font-medium text-[var(--color-primary)] underline', 'Lihat bukti pembayaran');
    a.href = bukti; a.target = '_blank'; a.rel = 'noopener noreferrer';
    detail.body.append(a);
  }

  detail.footer.replaceChildren();
  if (menunggu(b)) {
    detail.footer.className = 'mt-5 flex flex-wrap justify-end gap-2 border-t border-[var(--color-primary)]/10 pt-5';
    detail.footer.append(
      Button({ label: 'Tolak', variant: 'danger', onClick: () => mulaiProses(b, 'tolak') }),
      Button({ label: 'Setujui', variant: 'primary', onClick: () => mulaiProses(b, 'setujui') }),
    );
  }
  detail.open();
}

const KOLOM = [
  { render: (b) => formatTanggalRingkas(b['tanggal-pesan']), cls: 'whitespace-nowrap' },
  { render: (b) => namaCalon(b), cls: 'font-medium' },
  { render: (b) => namaKamar(b), cls: 'whitespace-nowrap' },
  {
    render: (b) => {
      const w = el('div', 'whitespace-nowrap');
      w.append(el('div', '', formatTanggalRingkas(b['tanggal-mulai'])), el('div', 'text-xs text-[var(--color-muted)]', `${b['durasi-bulan']} bulan`));
      return w;
    },
  },
  { render: (b) => formatTanggalRingkas(b['batas-waktu-bayar']), cls: 'whitespace-nowrap' },
  { render: (b) => badgeStatus(b) },
  {
    render: (b) => {
      const w = el('div', 'flex justify-end gap-1');
      w.append(tombolAksi('Lihat detail booking', ICON.lihat, () => bukaDetail(b)));
      if (menunggu(b)) {
        w.append(
          tombolAksi('Setujui booking', ICON.terima, () => mulaiProses(b, 'setujui'), 'text-green-700'),
          tombolAksi('Tolak booking', ICON.tolak, () => mulaiProses(b, 'tolak'), 'text-red-700'),
        );
      }
      return w;
    },
  },
];

function tersaring() {
  const kata = $('cari').value.trim();
  const status = $('filter-status').value;
  return semua.filter((b) => (!status || (status === 'menunggu' ? menunggu(b) : b.status === status)) && cocok(kata, namaCalon(b), namaKamar(b), calon(b).email ?? ''));
}

function renderStats() {
  const hitung = (f) => semua.filter(f).length;
  $('stats').replaceChildren(
    StatCard({ label: 'Menunggu keputusan', value: hitung(menunggu) }),
    StatCard({ label: 'Berhasil', value: hitung((b) => /berhasil|setuju/i.test(b.status ?? '')) }),
    StatCard({ label: 'Ditolak / gagal', value: hitung((b) => /tolak|gagal|batal|kadaluarsa/i.test(b.status ?? '')) }),
    StatCard({ label: 'Total booking', value: semua.length }),
  );
}

function renderTabel() {
  const hasil = tersaring();
  const h = halamanData(hasil, halaman);
  halaman = h.halaman;
  $('jumlah').textContent = `${hasil.length} booking`;
  isiTabel($('tabel-body'), KOLOM, h.irisan, 'Tidak ada booking yang cocok.');
  renderPaging($('paging'), halaman, h.total, (ke) => { halaman = ke; renderTabel(); });
}

async function muat() {
  try {
    const data = await getDaftarBooking();
    semua = Array.isArray(data) ? data : [];
  } catch (err) {
    semua = [];
    tampilPesan('error', err.message);
  }
  renderStats();
  renderTabel();
}

function init() {
  mountAdminNav({ sidebarEl: $('sidebar'), bottomEl: $('bottom-nav'), active: 'booking', onLogout: logout });
  $('logout-mobile').addEventListener('click', logout);
  $('cari').addEventListener('input', () => { halaman = 1; renderTabel(); });
  $('filter-status').addEventListener('change', () => { halaman = 1; renderTabel(); });
  renderStats();
  muat();
}

if (requireRole('admin')) init();
