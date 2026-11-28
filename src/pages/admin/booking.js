// Logic for pages/admin/booking.html: lihat booking, terima/tolak, detail calon penyewa
import { mountAdminNav } from '../../components/admin-nav.js';
import { StatCard } from '../../components/stat-card.js';
import { Button } from '../../components/button.js';
import { Dialog, DaftarInfo, FormDialog } from '../../components/dialog.js';
import { ICON, tombolAksi, isiTabel, halamanData, renderPaging } from '../../components/table-kit.js';
import { requireRole, logout } from '../../utils/auth-guard.js';
import { $, el, badge, cocok, tampilPesan, urlAman, formatTanggalSaja, formatTanggalRingkas } from '../../utils/dom.js';
import { formatRupiah } from '../../utils/format.js';
import { getDaftarBooking, prosesBooking } from '../../services/admin-service.js';

let semua = [];
let halaman = 1;
let sedangDiproses = null; // { booking, status }

const STATUS = {
  menunggu:  { label: 'Menunggu',  warna: 'kuning' },
  disetujui: { label: 'Disetujui', warna: 'hijau' },
  ditolak:   { label: 'Ditolak',   warna: 'merah' },
};
const badgeStatus = (b) => { const s = STATUS[b.status] ?? { label: b.status, warna: 'abu' }; return badge(s.label, s.warna); };
const namaCalon = (b) => b.calon?.['nama-lengkap'] ?? '-';
const namaKamar = (b) => (b.kamar ? `Kamar ${b.kamar['nama-kamar']}` : `Kamar ${b['id-kamar']}`);

const formCatatan = FormDialog({
  title: 'Proses booking',
  fields: [{ name: 'catatan', label: 'Catatan untuk calon penyewa', type: 'textarea', rows: 3, placeholder: 'Contoh: silakan lunasi sebelum batas waktu bayar.' }],
  catatan: 'Hasil booking dikirim ke email calon penyewa sebagai notifikasi.',
  onSubmit: async ({ catatan }) => {
    const { booking, status } = sedangDiproses;
    await prosesBooking(booking._id, status, catatan || '-');
    detail.close();
    tampilPesan('ok', status === 'disetujui'
      ? `Booking ${namaCalon(booking)} disetujui dan notifikasi dikirim.`
      : `Booking ${namaCalon(booking)} ditolak dan notifikasi dikirim.`);
    await muat();
  },
});

function mulaiProses(b, status) {
  sedangDiproses = { booking: b, status };
  formCatatan.open({}, {
    title: `${status === 'disetujui' ? 'Setujui' : 'Tolak'} booking ${namaCalon(b)}`,
    submitLabel: status === 'disetujui' ? 'Setujui booking' : 'Tolak booking',
  });
}

const detail = Dialog({ title: 'Detail booking', lebar: 'max-w-xl' });

function bukaDetail(b) {
  detail.setTitle(`Booking ${namaCalon(b)}`);
  detail.body.replaceChildren(
    el('p', 'mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]', 'Calon penyewa'),
    DaftarInfo([
      ['Nama', namaCalon(b)],
      ['Email', b.calon?.email],
      ['Telepon', b.calon?.['nomor-telepon']],
      ['Kontak darurat', b.calon ? `${b.calon['nama-kontak-darurat'] ?? '-'} (${b.calon['nomor-kontak-darurat'] ?? '-'})` : '-'],
    ]),
    el('p', 'mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]', 'Booking'),
    DaftarInfo([
      ['Kamar', b.kamar ? `${namaKamar(b)} (${b.kamar['tipe-kamar']}, lantai ${b.kamar.lantai})` : namaKamar(b)],
      ['Harga', b.kamar?.harga ? `${formatRupiah(b.kamar.harga)} / bulan` : '-'],
      ['Fasilitas', b.kamar?.fasilitas?.length ? b.kamar.fasilitas.join(', ') : '-'],
      ['Durasi', `${b['durasi-bulan']} bulan`],
      ['Mulai sewa', formatTanggalSaja(b['tanggal-mulai'])],
      ['Tanggal pesan', formatTanggalSaja(b['tanggal-pesan'])],
      ['Batas bayar', formatTanggalSaja(b['batas-waktu-bayar'])],
      ['Status', badgeStatus(b)],
    ]),
  );

  const bukti = urlAman(b['bukti-pembayaran']);
  if (bukti) {
    const a = el('a', 'mt-3 inline-block text-sm font-medium text-[var(--color-primary)] underline', 'Lihat bukti pembayaran');
    a.href = bukti; a.target = '_blank'; a.rel = 'noopener noreferrer';
    detail.body.append(a);
  }

  detail.footer.replaceChildren();
  if (b.status === 'menunggu') {
    detail.footer.className = 'mt-5 flex flex-wrap justify-end gap-2 border-t border-[var(--color-primary)]/10 pt-5';
    detail.footer.append(
      Button({ label: 'Tolak', variant: 'danger', onClick: () => mulaiProses(b, 'ditolak') }),
      Button({ label: 'Setujui', variant: 'primary', onClick: () => mulaiProses(b, 'disetujui') }),
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
      if (b.status === 'menunggu') {
        w.append(
          tombolAksi('Setujui booking', ICON.terima, () => mulaiProses(b, 'disetujui'), 'text-green-700'),
          tombolAksi('Tolak booking', ICON.tolak, () => mulaiProses(b, 'ditolak'), 'text-red-700'),
        );
      }
      return w;
    },
  },
];

function tersaring() {
  const kata = $('cari').value.trim();
  const status = $('filter-status').value;
  return semua.filter((b) => (!status || b.status === status) && cocok(kata, namaCalon(b), namaKamar(b), b.calon?.email ?? ''));
}

function renderStats() {
  const hitung = (s) => semua.filter((b) => b.status === s).length;
  $('stats').replaceChildren(
    StatCard({ label: 'Menunggu keputusan', value: hitung('menunggu') }),
    StatCard({ label: 'Disetujui', value: hitung('disetujui') }),
    StatCard({ label: 'Ditolak', value: hitung('ditolak') }),
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
