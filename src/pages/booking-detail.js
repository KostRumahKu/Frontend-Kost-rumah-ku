// Logic for pages/booking-detail.html — Halaman khusus /booking/:id (GET /api/public/booking/:id)
import { mountNavbar } from '../components/navbar.js';
import { landingNavItems, mountMobileBottomNav } from '../components/mobile-bottom-nav.js';
import {
  getDetailBookingPublik,
  getDaftarRekeningPublik,
  uploadBuktiBooking,
} from '../services/public-service.js';
import { formatRupiah } from '../utils/format.js';
import { $, tampilPesan, urlAman, formatTanggalSaja } from '../utils/dom.js';

mountNavbar({
  topEl: $('top-nav'),
  active: 'pesan',
  actions: [
    { label: 'Masuk', href: '/auth/login', solid: true },
  ],
});

mountMobileBottomNav({
  rootEl: $('bottom-nav'),
  variant: 'landing',
  items: landingNavItems,
  active: 'pesan',
});

let bookingId = '';
let rekeningList = [];

function ambilBookingIdDariUrl() {
  const m = window.location.pathname.match(/^\/booking\/([^/]+)/);
  if (m) return decodeURIComponent(m[1]);
  return new URLSearchParams(window.location.search).get('id') ?? '';
}

const normalStatus = (s) =>
  String(s ?? '').trim().toLowerCase().replace(/[\s_]+/g, '-');

function cariField(objList, keys) {
  for (const obj of objList) {
    if (!obj || typeof obj !== 'object') continue;
    for (const k of keys) {
      const v = obj[k];
      if (v !== undefined && v !== null && String(v).trim() !== '' && String(v).trim() !== '-') {
        return v;
      }
    }
  }
  return '';
}

function bacaFallbackSession(id) {
  try {
    const teks = sessionStorage.getItem(`booking-info:${id}`);
    return teks ? JSON.parse(teks) : {};
  } catch {
    return {};
  }
}

function ekstrakInfoBooking(b, raw, id) {
  const fb = bacaFallbackSession(id);
  const objekOrang = [
    b?.calon,
    b?.['calon-penyewa'],
    b?.calonPenyewa,
    b?.calon_penyewa,
    b?.['data-calon'],
    b?.dataCalon,
    b?.['data-penyewa'],
    b?.dataPenyewa,
    b?.['data-pengguna'],
    b?.dataPengguna,
    b?.penyewa,
    b?.pengguna,
    b?.pemesan,
    b?.user,
    b?.pelanggan,
    raw?.calon,
    raw?.['calon-penyewa'],
    raw?.calonPenyewa,
    raw?.['data-calon'],
    raw?.dataCalon,
    raw?.['data-penyewa'],
    raw?.dataPenyewa,
    raw?.['data-pengguna'],
    raw?.dataPengguna,
    raw?.penyewa,
    raw?.pengguna,
    raw?.pemesan,
    raw?.user,
    b,
    raw,
  ].filter((x) => x && typeof x === 'object' && !Array.isArray(x));

  const objekSewa = [
    b,
    b?.sewa,
    b?.['data-sewa'],
    b?.dataSewa,
    b?.tagihan,
    raw,
    raw?.sewa,
    raw?.['data-sewa'],
    raw?.dataSewa,
    raw?.tagihan,
  ].filter((x) => x && typeof x === 'object' && !Array.isArray(x));

  const nama = cariField(objekOrang, [
    'nama-lengkap', 'namaLengkap', 'nama_lengkap',
    'nama-calon', 'namaCalon', 'nama_calon',
    'nama-penyewa', 'namaPenyewa', 'nama_penyewa',
    'nama-pemesan', 'namaPemesan', 'nama_pemesan',
    'nama', 'name', 'fullName', 'full-name',
  ]) || fb.nama || '';

  const email = cariField(objekOrang, [
    'email', 'email-calon', 'emailCalon', 'email_calon',
    'email-penyewa', 'emailPenyewa', 'email-pemesan', 'emailPemesan',
    'alamat-email', 'alamatEmail',
  ]) || fb.email || '';

  const telepon = cariField(objekOrang, [
    'nomor-telepon', 'nomorTelepon', 'nomor_telepon',
    'no-telepon', 'noTelepon', 'no_telepon',
    'telepon', 'telp', 'nomor-hp', 'nomorHp', 'no-hp', 'noHp', 'no_hp',
    'hp', 'nomor-wa', 'no-wa', 'whatsapp', 'phone', 'phoneNumber',
  ]) || fb.telepon || '';

  const tanggalMulai = cariField(objekSewa, [
    'tanggal-mulai', 'tanggalMulai', 'tanggal_mulai',
    'tanggal-mulai-sewa', 'tanggalMulaiSewa',
    'tanggal-masuk', 'tanggalMasuk', 'tanggal_masuk',
    'mulai-sewa', 'mulaiSewa', 'tanggal-sewa', 'tanggalSewa',
    'tanggal-check-in', 'tanggalCheckIn', 'check-in', 'checkIn',
    'tgl-mulai', 'tglMulai', 'startDate', 'start-date',
  ]) || fb.tanggalMulai || '';

  const batasBayar = cariField(objekSewa, [
    'batas-waktu-bayar', 'batasWaktuBayar', 'batas_waktu_bayar',
    'batas-bayar', 'batasBayar',
    'tanggal-jatuh-tempo', 'tanggalJatuhTempo', 'jatuh-tempo',
    'expiredAt', 'expired-at', 'dueDate',
  ]);

  const tanggalPesan = cariField(objekSewa, [
    'tanggal-pesan', 'tanggalPesan', 'tanggal_pesan',
    'tanggal-booking', 'tanggalBooking',
    'createdAt', 'created-at',
  ]);

  return { nama, email, telepon, tanggalMulai, batasBayar, tanggalPesan };
}

function kumpulkanStatusDariObjek(obj, excludeGenericSuccess = false) {
  if (!obj || typeof obj !== 'object') return [];
  const hasil = [];
  const kunciPrioritas = [
    'status',
    'status-pemesanan', 'statusPemesanan', 'status_pemesanan',
    'status-booking', 'statusBooking', 'status_booking',
    'status-validasi', 'statusValidasi', 'status_validasi',
    'status-pembayaran', 'statusPembayaran', 'status_pembayaran',
    'status-tagihan', 'statusTagihan', 'status_tagihan',
  ];

  const tambah = (val) => {
    if (typeof val !== 'string' || !val.trim()) return;
    const norm = normalStatus(val);
    if (excludeGenericSuccess && norm === 'sukses') return;
    if (!hasil.includes(norm)) hasil.push(norm);
  };

  for (const k of kunciPrioritas) tambah(obj[k]);
  for (const [k, v] of Object.entries(obj)) {
    if (/status/i.test(k) && typeof v === 'string') tambah(v);
  }
  return hasil;
}

function cocokStatusList(list) {
  const isNegatif = (s) => /^(menunggu|belum|tidak|bukan|gagal|non)/.test(s);

  const isDisetujui = (s) =>
    !isNegatif(s) &&
    /(setuju|terima|lunas|terverifikasi|dikonfirmasi|terkonfirmasi|selesai|berhasil|approved|accepted|verified|confirmed|paid|done|completed|(?:^|-)aktif(?:$|-)|(?:^|-)acc(?:$|-)|(?:^|-)valid(?:$|-))/.test(s);

  const isDibatalkan = (s) =>
    /(batal|cancel|expired|kedaluwarsa|kadaluwarsa|hangus|gugur)/.test(s);

  const isDitolak = (s) =>
    /(tolak|reject)/.test(s);

  const isMenungguValidasi = (s) =>
    /(menunggu-validasi|menunggu-konfirmasi|menunggu-verifikasi|verifikasi|diproses|review|sudah-bayar|sudah-upload|terunggah)/.test(s);

  const isMenungguPembayaran = (s) =>
    /(menunggu-pembayaran|belum-bayar|belum-dibayar|belum-lunas|pending-payment|unpaid)/.test(s);

  if (list.some(isDisetujui)) return 'disetujui';
  if (list.some(isDibatalkan)) return 'dibatalkan';
  if (list.some(isDitolak)) return 'ditolak';
  if (list.some(isMenungguValidasi)) return 'menunggu-validasi';
  if (list.some(isMenungguPembayaran)) return 'menunggu-pembayaran';
  return null;
}

// Klasifikasi status booking sesuai workflow:
// 1. menunggu-pembayaran (belum unggah bukti)
// 2. menunggu-validasi (sudah unggah bukti, menunggu admin)
// 3. disetujui (admin setuju → akun & password dikirim via email)
// 4. ditolak (admin tolak → kesempatan ke-2 unggah ulang bukti)
// 5. dibatalkan (admin batalkan / kadaluwarsa → selesai dibatalkan)
function klasifikasiStatus(booking, raw = null) {
  const statusUtama = kumpulkanStatusDariObjek(booking, true);
  const hasilUtama = cocokStatusList(statusUtama);
  if (hasilUtama) return hasilUtama;

  const statusSekunder = [
    ...kumpulkanStatusDariObjek(booking?.validasi, true),
    ...kumpulkanStatusDariObjek(booking?.pembayaran, true),
    ...kumpulkanStatusDariObjek(booking?.tagihan, true),
    ...(raw && raw !== booking ? kumpulkanStatusDariObjek(raw, true) : []),
    ...(raw && raw !== booking ? kumpulkanStatusDariObjek(raw?.validasi, true) : []),
    ...(raw && raw !== booking ? kumpulkanStatusDariObjek(raw?.pembayaran, true) : []),
    ...(raw && raw !== booking ? kumpulkanStatusDariObjek(raw?.tagihan, true) : []),
  ];
  const hasilSekunder = cocokStatusList(statusSekunder);
  if (hasilSekunder) return hasilSekunder;

  if (
    booking?.disetujui === true ||
    booking?.isApproved === true ||
    booking?.terverifikasi === true ||
    booking?.lunas === true ||
    booking?.['akun-dibuat'] === true
  ) {
    return 'disetujui';
  }

  const punyaBukti = Boolean(
    urlAman(
      booking?.['bukti-pembayaran'] ??
      booking?.buktiPembayaran ??
      booking?.tagihan?.['bukti-pembayaran'] ??
      raw?.tagihan?.['bukti-pembayaran']
    )
  );

  // Status generik "menunggu" / "pending": cek apakah sudah unggah bukti atau belum
  return punyaBukti ? 'menunggu-validasi' : 'menunggu-pembayaran';
}

const BADGE_MAP = {
  'menunggu-pembayaran': { label: 'Menunggu Pembayaran', cls: 'bg-amber-100 text-amber-800' },
  'menunggu-validasi':   { label: 'Menunggu Validasi Admin', cls: 'bg-blue-100 text-blue-800' },
  'disetujui':           { label: 'Disetujui', cls: 'bg-green-100 text-green-800' },
  'ditolak':             { label: 'Ditolak (Unggah Ulang)', cls: 'bg-red-100 text-red-700' },
  'dibatalkan':          { label: 'Dibatalkan', cls: 'bg-stone-200 text-stone-700' },
};

function renderStepper(state) {
  const stepsEl = $('workflow-steps');
  const s1Done = true;
  const s2Done = state === 'menunggu-validasi' || state === 'disetujui';
  const s2Active = state === 'menunggu-pembayaran' || state === 'ditolak';
  const s3Done = state === 'disetujui';
  const s3Active = state === 'menunggu-validasi' || state === 'dibatalkan';

  const items = [
    { num: '1', label: 'Booking Dibuat', done: s1Done, active: false },
    { num: '2', label: state === 'ditolak' ? 'Unggah Ulang Bukti' : 'Pembayaran', done: s2Done, active: s2Active },
    {
      num: '3',
      label: state === 'disetujui' ? 'Disetujui & Akun Aktif' : (state === 'dibatalkan' ? 'Dibatalkan' : 'Validasi Admin'),
      done: s3Done,
      active: s3Active,
    },
  ];

  stepsEl.replaceChildren(...items.map((st) => {
    const li = document.createElement('li');
    const isStrong = st.done || st.active;
    li.className = `flex items-center gap-2.5 ${isStrong ? 'font-semibold text-[var(--color-primary)]' : 'text-[var(--color-muted)]'}`;

    const circle = document.createElement('span');
    circle.className = st.done
      ? 'flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-700 text-white'
      : (st.active
        ? 'flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-[var(--color-cream)]'
        : 'flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/15 text-[var(--color-primary)]');
    circle.textContent = st.done ? '✓' : st.num;

    const text = document.createElement('span');
    text.textContent = st.label;
    li.append(circle, text);
    return li;
  }));
}

function renderBanner(state, booking, info) {
  const banner = $('status-banner');
  const email = info?.email || 'email terdaftar';
  const catatan = booking?.['catatan-admin'] ?? booking?.catatanAdmin ?? '';

  const config = {
    'menunggu-pembayaran': {
      cls: 'border-amber-300 bg-amber-50 text-amber-950',
      judul: 'Pesanan Berhasil Dibuat — Silakan Lakukan Pembayaran',
      isi: `Pilih rekening resmi di sebelah kanan, transfer sesuai total tagihan, lalu unggah bukti pembayaran. Jika perlu keluar dari web terlebih dahulu, kamu bisa membuka kembali halaman tagihan ini lewat tautan jalan pintas yang dikirim ke ${email}.`,
    },
    'menunggu-validasi': {
      cls: 'border-blue-300 bg-blue-50 text-blue-950',
      judul: 'Bukti Pembayaran Diterima — Menunggu Validasi Admin',
      isi: `Bukti pembayaranmu sedang diperiksa oleh admin. Kamu aman keluar dari halaman ini dan bisa mengecek status kapan saja melalui tautan jalan pintas di email ${email}.`,
    },
    'disetujui': {
      cls: 'border-green-300 bg-green-50 text-green-950',
      judul: 'Pembayaran Disetujui — Akun Penghuni Sudah Aktif!',
      isi: `Selamat! Pembayaran dan pesanan kamar kamu telah disetujui oleh admin. Silakan cek email kamu (${email}) di kotak masuk atau folder spam untuk melihat password login, lalu masuk ke halaman login.`,
    },
    'ditolak': {
      cls: 'border-red-300 bg-red-50 text-red-950',
      judul: 'Bukti Pembayaran Ditolak — Kesempatan ke-2 Unggah Ulang',
      isi: catatan && catatan !== '-'
        ? `Alasan penolakan admin: "${catatan}". Silakan periksa kembali bukti transfer dan unggah ulang bukti pembayaran yang valid di sebelah kanan.`
        : 'Bukti pembayaran sebelumnya ditolak oleh admin. Kamu diberikan kesempatan ke-2 untuk mengunggah ulang bukti pembayaran yang valid di sebelah kanan.',
    },
    'dibatalkan': {
      cls: 'border-stone-300 bg-stone-100 text-stone-900',
      judul: 'Pemesanan Dibatalkan',
      isi: catatan && catatan !== '-'
        ? `Pemesanan ini telah dibatalkan (${catatan}). Jika kamu masih ingin menyewa kamar di KostRumahKu, silakan buat pemesanan baru.`
        : 'Pemesanan ini telah dibatalkan. Jika kamu masih ingin menyewa kamar di KostRumahKu, silakan buat pemesanan baru.',
    },
  }[state];

  banner.className = `rounded-2xl border p-5 shadow-sm ${config.cls}`;
  banner.replaceChildren();
  const h = document.createElement('h2');
  h.className = 'font-[family-name:var(--font-heading)] text-lg font-semibold';
  h.textContent = config.judul;
  const p = document.createElement('p');
  p.className = 'mt-1 text-sm leading-relaxed opacity-90';
  p.textContent = config.isi;
  banner.append(h, p);
}

function renderPanelKanan(state, booking, info) {
  const formUpload = $('form-upload-bukti');
  const panelAkhir = $('panel-status-akhir');

  if (state === 'menunggu-pembayaran' || state === 'ditolak') {
    panelAkhir.classList.add('hidden');
    formUpload.classList.remove('hidden');

    if (state === 'ditolak') {
      $('upload-judul').textContent = 'Unggah Ulang Bukti Pembayaran (Kesempatan ke-2)';
      $('upload-sub').textContent = 'Pastikan nominal transfer, rekening tujuan, dan gambar bukti pembayaran terlihat jelas agar validasi admin berjalan lancar.';
      $('btn-kirim-bukti').textContent = 'Kirim Ulang Bukti Pembayaran';
    } else {
      $('upload-judul').textContent = 'Pembayaran & Unggah Bukti';
      $('upload-sub').textContent = 'Transfer sesuai total tagihan ke salah satu rekening resmi berikut, lalu kirim URL foto bukti pembayaran.';
      $('btn-kirim-bukti').textContent = 'Kirim Bukti Pembayaran';
    }

    muatRekening();
    return;
  }

  formUpload.classList.add('hidden');
  panelAkhir.classList.remove('hidden');
  panelAkhir.replaceChildren();

  const wrap = document.createElement('div');
  wrap.className = 'space-y-4';

  const h = document.createElement('h2');
  h.className = 'font-[family-name:var(--font-heading)] text-xl font-semibold text-[var(--color-primary)]';

  const p = document.createElement('p');
  p.className = 'text-sm leading-relaxed text-[var(--color-muted)]';

  const aksi = document.createElement('div');
  aksi.className = 'flex flex-wrap gap-3 pt-2';

  if (state === 'disetujui') {
    const email = info?.email || 'email terdaftar';

    const statusPill = document.createElement('span');
    statusPill.className = 'inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800';
    statusPill.textContent = '✓ Pembayaran Disetujui';

    h.textContent = 'Pesanan & Pembayaran Disetujui!';
    p.textContent = 'Admin telah menyetujui pembayaran kamu dan akun penghuni KostRumahKu sudah aktif.';

    const infoPassword = document.createElement('div');
    infoPassword.className = 'rounded-xl border border-green-300 bg-green-50 p-4 text-xs leading-relaxed text-green-950';
    const infoTitle = document.createElement('p');
    infoTitle.className = 'font-semibold text-green-900';
    infoTitle.textContent = 'Cek Email untuk Password Login';
    const infoText = document.createElement('p');
    infoText.className = 'mt-1 text-green-900/90';
    infoText.textContent = `Password akun penghuni telah dikirimkan ke ${email}. Silakan cek kotak masuk (atau folder spam/promosi) email kamu, lalu gunakan email dan password tersebut untuk masuk.`;
    infoPassword.append(infoTitle, infoText);

    const btnLogin = document.createElement('a');
    btnLogin.href = '/auth/login';
    btnLogin.className = 'inline-flex items-center justify-center rounded-xl bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-[var(--color-cream)] shadow-sm transition-colors hover:bg-[var(--color-primary-dark)]';
    btnLogin.textContent = 'Masuk ke Halaman Login →';

    const btnBeranda = document.createElement('a');
    btnBeranda.href = '/';
    btnBeranda.className = 'inline-flex items-center justify-center rounded-xl border border-[var(--color-primary)]/30 bg-white px-5 py-3 text-sm font-semibold text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)] hover:text-[var(--color-cream)]';
    btnBeranda.textContent = 'Kembali ke Beranda';

    aksi.append(btnLogin, btnBeranda);
    wrap.append(statusPill, h, p, infoPassword, aksi);
    panelAkhir.append(wrap);
    return;
  } else if (state === 'menunggu-validasi') {
    const email = info?.email || 'email terdaftar';
    h.textContent = 'Pembayaran Sedang Diverifikasi Admin';
    p.textContent = 'Bukti pembayaran kamu sudah kami terima dan sedang menunggu validasi dari admin KostRumahKu. Jika disetujui, akun login penghuni akan dikirimkan otomatis ke email kamu.';

    const infoEmail = document.createElement('div');
    infoEmail.className = 'rounded-xl border border-[var(--color-primary)]/15 bg-[var(--color-cream)]/70 p-4 text-xs leading-relaxed text-[var(--color-ink)]';
    const infoTitle = document.createElement('p');
    infoTitle.className = 'font-semibold text-[var(--color-primary)]';
    infoTitle.textContent = 'Jalan Pintas via Email';
    const infoText = document.createElement('p');
    infoText.className = 'mt-1 text-[var(--color-muted)]';
    infoText.textContent = `Kamu bisa menutup atau keluar dari web sekarang. Gunakan tautan yang dikirim ke ${email} untuk langsung kembali ke halaman tagihan ini guna mengecek status validasi (atau mengunggah ulang bukti jika admin menolak).`;
    infoEmail.append(infoTitle, infoText);

    const btnCekLagi = document.createElement('button');
    btnCekLagi.type = 'button';
    btnCekLagi.className = 'cursor-pointer rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-[var(--color-cream)] transition-colors hover:bg-[var(--color-primary-dark)]';
    btnCekLagi.textContent = 'Periksa Status Sekarang';
    btnCekLagi.addEventListener('click', () => muatDetailBooking());

    const btnBeranda = document.createElement('a');
    btnBeranda.href = '/';
    btnBeranda.className = 'rounded-xl border border-[var(--color-primary)]/30 bg-white px-5 py-2.5 text-sm font-semibold text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)] hover:text-[var(--color-cream)]';
    btnBeranda.textContent = 'Kembali ke Beranda';

    aksi.append(btnCekLagi, btnBeranda);
    wrap.append(h, p, infoEmail, aksi);
    panelAkhir.append(wrap);
    return;
  } else {
    h.textContent = 'Pesanan Dibatalkan';
    p.textContent = 'Booking ini telah dibatalkan oleh admin atau melewati batas waktu pembayaran, sehingga kamar dikembalikan ke status tersedia. Kamu dapat melakukan pemesanan ulang kapan saja.';

    const btnPesanLagi = document.createElement('a');
    btnPesanLagi.href = '/kamar';
    btnPesanLagi.className = 'rounded-xl bg-[var(--color-primary)] px-6 py-2.5 text-sm font-semibold text-[var(--color-cream)] shadow-sm transition-colors hover:bg-[var(--color-primary-dark)]';
    btnPesanLagi.textContent = 'Lihat Kamar & Pesan Ulang';
    aksi.append(btnPesanLagi);
  }

  wrap.append(h, p, aksi);
  panelAkhir.append(wrap);
}

async function muatRekening() {
  const wrap = $('daftar-rekening');
  if (rekeningList.length === 0) {
    try {
      const data = await getDaftarRekeningPublik();
      rekeningList = Array.isArray(data) ? data : (Array.isArray(data?.rekening) ? data.rekening : []);
    } catch (err) {
      wrap.replaceChildren();
      const p = document.createElement('p');
      p.className = 'text-xs text-red-700';
      p.textContent = err.message;
      wrap.append(p);
      return;
    }
  }

  if (rekeningList.length === 0) {
    wrap.replaceChildren();
    const p = document.createElement('p');
    p.className = 'text-xs text-[var(--color-muted)]';
    p.textContent = 'Belum ada rekening resmi yang tersedia.';
    wrap.append(p);
    return;
  }

  wrap.replaceChildren(...rekeningList.map((r, i) => {
    const idRek = r._id ?? r.id ?? '';
    const label = document.createElement('label');
    label.className = 'flex cursor-pointer flex-col gap-2 rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-cream)]/40 p-3.5 transition-colors has-[:checked]:border-[var(--color-primary)] has-[:checked]:bg-[var(--color-cream)]';

    const top = document.createElement('div');
    top.className = 'flex items-start gap-2.5';

    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'id-rekening';
    radio.value = idRek;
    radio.checked = i === 0;
    radio.className = 'mt-1 accent-[var(--color-primary)]';

    const info = document.createElement('div');
    info.className = 'min-w-0 flex-1 text-xs';

    const bank = document.createElement('p');
    bank.className = 'text-sm font-semibold text-[var(--color-ink)]';
    bank.textContent = `${r['nama-bank'] ?? '-'} (${r.jenis ?? '-'})`;

    const norek = document.createElement('p');
    norek.className = 'mt-0.5 font-mono text-sm font-semibold text-[var(--color-primary)]';
    norek.textContent = r['nomor-rekening'] ?? '-';

    const pemilik = document.createElement('p');
    pemilik.className = 'text-[var(--color-muted)]';
    pemilik.textContent = `a.n. ${r['nama-pemilik'] ?? '-'}`;

    info.append(bank, norek, pemilik);

    const btnSalin = document.createElement('button');
    btnSalin.type = 'button';
    btnSalin.className = 'shrink-0 cursor-pointer rounded-md border border-[var(--color-primary)]/25 bg-white px-2.5 py-1 text-[11px] font-medium text-[var(--color-primary)] hover:bg-[var(--color-cream)]';
    btnSalin.textContent = 'Salin';
    btnSalin.addEventListener('click', (ev) => {
      ev.preventDefault();
      navigator.clipboard?.writeText(r['nomor-rekening'] ?? '');
      btnSalin.textContent = 'Disalin';
      setTimeout(() => { btnSalin.textContent = 'Salin'; }, 1500);
    });

    top.append(radio, info, btnSalin);
    label.append(top);

    const qris = urlAman(r['foto-qris']);
    if (qris) {
      const img = document.createElement('img');
      img.src = qris;
      img.alt = `QRIS ${r['nama-bank'] ?? ''}`;
      img.className = 'mt-1 max-h-40 self-center rounded-lg border border-black/10 bg-white p-1 object-contain';
      img.addEventListener('error', () => img.remove());
      label.append(img);
    }

    return label;
  }));
}

async function muatDetailBooking(pesanSukses = '') {
  tampilPesan('', '');
  $('booking-skeleton').classList.remove('hidden');
  $('booking-konten').classList.add('hidden');

  if (!bookingId) {
    $('booking-skeleton').classList.add('hidden');
    tampilPesan('error', 'ID Pemesanan tidak ditemukan di URL.');
    return;
  }

  try {
    const raw = await getDetailBookingPublik(bookingId);
    const b = raw?.pemesanan ?? raw?.booking ?? raw?.detail ?? raw?.data ?? raw ?? {};

    $('booking-skeleton').classList.add('hidden');

    const state = klasifikasiStatus(b, raw);
    const badgeInfo = BADGE_MAP[state];

    $('detail-id').textContent = b._id ?? b.id ?? b['id-pemesanan'] ?? bookingId;
    const badgeEl = $('detail-status-badge');
    badgeEl.textContent = badgeInfo.label;
    badgeEl.className = `rounded-full px-3 py-1 text-xs font-semibold ${badgeInfo.cls}`;

    const kamarLabel = b.kamar
      ? `Kamar ${b.kamar['nama-kamar'] ?? b.kamar.namaKamar ?? b.kamar['nomor-kamar'] ?? b.kamar.nomorKamar ?? '-'} (${b.kamar['tipe-kamar'] ?? b.kamar.tipeKamar ?? '-'}, Lantai ${b.kamar.lantai ?? '-'})`
      : (b['tipe-kamar'] ?? b.tipeKamar
        ? `Tipe ${b['tipe-kamar'] ?? b.tipeKamar} (Lantai ${b.lantai ?? '-'})`
        : (b['id-kamar'] ?? b.idKamar ? `Kamar ${b['id-kamar'] ?? b.idKamar}` : '-'));

    const durasi = Number(b['durasi-bulan'] ?? b.durasiBulan ?? 0);
    const total =
      b['total-harga'] ??
      b.totalHarga ??
      b['total-bayar'] ??
      b.totalBayar ??
      b['total-tagihan'] ??
      b.totalTagihan ??
      b['jumlah-tagihan'] ??
      b.jumlahTagihan ??
      b['jumlah-bayar'] ??
      b.jumlahBayar ??
      b.nominal ??
      b.tagihan?.nominal ??
      raw?.tagihan?.nominal ??
      (b.kamar?.harga && durasi ? Number(b.kamar.harga) * durasi : null);

    const invoiceNo =
      b['nomor-invoice'] ??
      b.nomorInvoice ??
      b['kode-invoice'] ??
      b.invoice ??
      b.tagihan?.['nomor-invoice'] ??
      raw?.tagihan?.['nomor-invoice'] ??
      '';

    const info = ekstrakInfoBooking(b, raw, bookingId);
    const mulaiFmt = info.tanggalMulai ? formatTanggalSaja(info.tanggalMulai) : '-';
    const batasFmt = info.batasBayar ? formatTanggalSaja(info.batasBayar) : '-';
    const pesanFmt = info.tanggalPesan ? formatTanggalSaja(info.tanggalPesan) : '-';

    const rows = [
      ...(invoiceNo ? [['No. Invoice', invoiceNo]] : []),
      ...(info.nama ? [['Nama Calon', info.nama]] : []),
      ...(info.email ? [['Email', info.email]] : []),
      ...(info.telepon ? [['Telepon', info.telepon]] : []),
      ['Kamar',         kamarLabel],
      ['Durasi Sewa',   durasi ? `${durasi} Bulan` : '-'],
      ...(mulaiFmt !== '-' ? [['Mulai Sewa', mulaiFmt]] : []),
      ...(pesanFmt !== '-' && mulaiFmt === '-' ? [['Tanggal Pesan', pesanFmt]] : []),
      ...(batasFmt !== '-' ? [['Batas Bayar', batasFmt]] : []),
      ['Total Tagihan', total ? formatRupiah(total) : '-'],
    ];

    const dl = $('detail-list');
    dl.replaceChildren(...rows.map(([lbl, val]) => {
      const row = document.createElement('div');
      row.className = 'flex justify-between gap-4 border-b border-[var(--color-primary)]/10 pb-2 last:border-0 last:pb-0';
      const dt = document.createElement('dt');
      dt.className = 'shrink-0 text-[var(--color-muted)]';
      dt.textContent = lbl;
      const dd = document.createElement('dd');
      dd.className = 'text-right font-medium text-[var(--color-ink)] break-all';
      dd.textContent = val;
      row.append(dt, dd);
      return row;
    }));

    // Catatan admin
    const catatan = b['catatan-admin'] ?? b.catatanAdmin ?? '';
    if (catatan && catatan !== '-') {
      $('catatan-admin-teks').textContent = catatan;
      $('catatan-admin-box').classList.remove('hidden');
    } else {
      $('catatan-admin-box').classList.add('hidden');
    }

    // Bukti pembayaran terunggah
    const buktiUrl = urlAman(b['bukti-pembayaran'] ?? b.buktiPembayaran ?? b.tagihan?.['bukti-pembayaran']);
    if (buktiUrl) {
      $('bukti-terunggah-img').src = buktiUrl;
      $('bukti-terunggah-link').href = buktiUrl;
      $('bukti-terunggah-box').classList.remove('hidden');
    } else {
      $('bukti-terunggah-box').classList.add('hidden');
    }

    renderBanner(state, b, info);
    renderStepper(state);
    renderPanelKanan(state, b, info);

    $('booking-konten').classList.remove('hidden');

    if (pesanSukses) {
      tampilPesan('ok', pesanSukses);
    } else {
      // Tampilkan pesan sukses sekali jika baru saja redirect dari halaman pesan
      try {
        if (sessionStorage.getItem(`booking-baru:${bookingId}`) === '1') {
          sessionStorage.removeItem(`booking-baru:${bookingId}`);
          tampilPesan('ok', 'Pesanan berhasil dibuat! Silakan pilih rekening dan unggah bukti pembayaran.');
        }
      } catch { /* abaikan */ }
    }
  } catch (err) {
    $('booking-skeleton').classList.add('hidden');
    tampilPesan('error', err.message);
  }
}

$('bukti-url').addEventListener('input', () => {
  const url = urlAman($('bukti-url').value.trim());
  if (url) {
    $('preview-img').src = url;
    $('preview-wrap').classList.remove('hidden');
  } else {
    $('preview-wrap').classList.add('hidden');
  }
});

$('form-upload-bukti').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = $('upload-error');
  errEl.classList.add('hidden');
  tampilPesan('', '');

  const idRekening = document.querySelector('input[name="id-rekening"]:checked')?.value ?? '';
  const buktiUrl = $('bukti-url').value.trim();

  if (!idRekening) {
    errEl.textContent = 'Pilih rekening tujuan terlebih dahulu.';
    errEl.classList.remove('hidden');
    return;
  }
  if (!urlAman(buktiUrl)) {
    errEl.textContent = 'URL bukti pembayaran harus diawali http:// atau https://.';
    errEl.classList.remove('hidden');
    return;
  }

  const btn = $('btn-kirim-bukti');
  const labelAwal = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Mengirim bukti...';

  try {
    await uploadBuktiBooking({
      'id-pemesanan': bookingId,
      'bukti-pembayaran': buktiUrl,
      'id-rekening': idRekening,
    });
    $('bukti-url').value = '';
    $('preview-wrap').classList.add('hidden');
    await muatDetailBooking('Bukti pembayaran berhasil dikirim! Kamu bisa keluar dari web dan memantau status kapan saja lewat tautan di emailmu.');
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.textContent = labelAwal;
  }
});

$('btn-salin-id').addEventListener('click', () => {
  navigator.clipboard?.writeText($('detail-id').textContent.trim());
  $('btn-salin-id').textContent = 'Disalin';
  setTimeout(() => { $('btn-salin-id').textContent = 'Salin'; }, 1500);
});

bookingId = ambilBookingIdDariUrl();
muatDetailBooking();
