// Logic for pages/pesan.html — Formulir Booking Calon Penyewa → diarahkan ke halaman khusus /booking/:id
import { mountNavbar } from '../components/navbar.js';
import { landingNavItems, mountMobileBottomNav } from '../components/mobile-bottom-nav.js';
import { getKatalogKamarPublik, buatBookingPublik } from '../services/public-service.js';
import { formatRupiah } from '../utils/format.js';
import { $, emailRegex } from '../utils/dom.js';

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

let katalog = [];

const LABEL_TIPE = {
  standart: 'Kamar Standar',
  standard: 'Kamar Standar',
  tulip: 'Kamar Tulip',
  amarilis: 'Kamar Amarilis',
};

const ATURAN_LANTAI = {
  tulip: { lantai: ['2'], tetap: true, info: 'Kamar Tulip hanya tersedia di Lantai 2.' },
  amarilis: { lantai: ['3'], tetap: true, info: 'Kamar Amarilis hanya tersedia di Lantai 3.' },
  standart: { lantai: ['1', '2', '3'], tetap: false, info: 'Kamar Standar tersedia di Lantai 1, 2, dan 3.' },
  standard: { lantai: ['1', '2', '3'], tetap: false, info: 'Kamar Standar tersedia di Lantai 1, 2, dan 3.' },
};

function getHariIniIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const todayIso = getHariIniIso();
const inputMulai = $('b-mulai');
inputMulai.value = todayIso;
inputMulai.min = todayIso;

function validasiTanggalMulai() {
  const errEl = $('b-mulai-error');
  const val = inputMulai.value;
  const minTgl = getHariIniIso();
  inputMulai.min = minTgl;

  if (!val || val < minTgl) {
    setFieldError(inputMulai, errEl, 'Tanggal mulai sewa tidak boleh tanggal yang sudah lewat.');
    return false;
  }
  setFieldError(inputMulai, errEl, '');
  return true;
}

// Hanya pilih lewat kalender (blokir ketik manual / paste) & klik seluruh kotak langsung buka picker
inputMulai.addEventListener('keydown', (e) => {
  if (e.key === 'Tab' || e.key === 'Shift' || e.key === 'Escape') return;
  e.preventDefault();
  if (e.key === 'Enter' || e.key === ' ') {
    try { inputMulai.showPicker?.(); } catch { /* abaikan */ }
  }
});
inputMulai.addEventListener('paste', (e) => e.preventDefault());
inputMulai.addEventListener('drop', (e) => e.preventDefault());
inputMulai.addEventListener('click', () => {
  try { inputMulai.showPicker?.(); } catch { /* abaikan */ }
});
inputMulai.addEventListener('change', () => {
  const minTgl = getHariIniIso();
  if (!inputMulai.value || inputMulai.value < minTgl) {
    inputMulai.value = minTgl;
    setFieldError(inputMulai, $('b-mulai-error'), 'Tanggal mulai sewa tidak boleh tanggal yang sudah lewat.');
  } else {
    setFieldError(inputMulai, $('b-mulai-error'), '');
  }
});

function showError(msg) {
  const el = $('page-error');
  el.textContent = msg;
  el.classList.toggle('hidden', !msg);
  if (msg) window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setFieldError(inputEl, errorEl, msg, wrapperEl = null) {
  errorEl.textContent = msg;
  errorEl.classList.toggle('hidden', !msg);
  inputEl.setAttribute('aria-invalid', msg ? 'true' : 'false');
  if (wrapperEl) {
    wrapperEl.classList.toggle('border-red-600', Boolean(msg));
    wrapperEl.classList.toggle('border-[var(--color-primary)]/30', !msg);
  }
}

function validasiEmail(wajibIsi = false) {
  const input = $('b-email');
  const errEl = $('b-email-error');
  const val = input.value.trim();

  if (!val) {
    if (wajibIsi) {
      setFieldError(input, errEl, 'Harus isi email dengan benar.');
      return false;
    }
    setFieldError(input, errEl, '');
    return true;
  }

  if (!emailRegex.test(val)) {
    setFieldError(input, errEl, 'Harus isi email dengan benar.');
    return false;
  }

  setFieldError(input, errEl, '');
  return true;
}

/** Bersihkan input nomor lokal (bagian setelah prefix tetap "62"): hanya angka, buang awalan 0 atau 62 ganda. */
function bersihkanNomorLokal(raw) {
  let digits = String(raw ?? '').replace(/\D/g, '');
  if (digits.startsWith('62')) digits = digits.slice(2);
  while (digits.startsWith('0')) digits = digits.slice(1);
  return digits.slice(0, 14);
}

function getNomorDengan62(inputId) {
  const lokal = bersihkanNomorLokal($(inputId).value);
  return lokal ? `62${lokal}` : '';
}

function validasiTelepon(inputId, errorId, wrapId, wajibIsi = false) {
  const input = $(inputId);
  const errEl = $(errorId);
  const wrapEl = $(wrapId);
  const lokal = bersihkanNomorLokal(input.value);
  if (input.value !== lokal) input.value = lokal;

  if (!lokal) {
    if (wajibIsi) {
      setFieldError(input, errEl, 'Nomor telepon wajib diisi (diawali 62).', wrapEl);
      return false;
    }
    setFieldError(input, errEl, '', wrapEl);
    return true;
  }

  const penuh = `62${lokal}`;
  if (!/^62\d{8,14}$/.test(penuh)) {
    setFieldError(input, errEl, 'Nomor telepon harus diawali 62 dan terdiri dari 10–16 digit (contoh: 6281234567890).', wrapEl);
    return false;
  }

  setFieldError(input, errEl, '', wrapEl);
  return true;
}

function capitalize(str) {
  const s = String(str ?? '').trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

function tipeTerpilihObj() {
  const val = $('b-tipe').value.toLowerCase();
  return katalog.find((k) => String(k.tipeKamar ?? '').toLowerCase() === val) ?? null;
}

function sinkronkanPilihanLantai(prefLantai = '') {
  const tipeKey = String($('b-tipe').value ?? '').trim().toLowerCase();
  const aturan = ATURAN_LANTAI[tipeKey] ?? { lantai: ['1', '2', '3'], tetap: false, info: '' };
  const selectLantai = $('b-lantai');
  const sebelumnya = prefLantai || selectLantai.value;

  selectLantai.replaceChildren(
    ...aturan.lantai.map((lt) => new Option(`Lantai ${lt}`, lt))
  );

  if (aturan.tetap) {
    selectLantai.value = aturan.lantai[0];
    selectLantai.disabled = true;
  } else {
    selectLantai.disabled = false;
    selectLantai.value = aturan.lantai.includes(sebelumnya) ? sebelumnya : aturan.lantai[0];
  }

  $('b-lantai-info').textContent = aturan.info;
}

function perbaruiRingkasan() {
  const item = tipeTerpilihObj();
  const durasi = Number($('b-durasi').value || 1);
  const lantai = $('b-lantai').value || '1';

  const key = String(item?.tipeKamar ?? $('b-tipe').value ?? '').toLowerCase();
  const label = LABEL_TIPE[key] ?? (key ? `Kamar ${capitalize(key)}` : '—');
  const harga = Number(item?.harga ?? 0);
  const stok = item?.jumlahTersedia;

  $('sum-tipe').textContent = label;
  $('sum-lantai').textContent = `Lantai ${lantai}`;
  $('sum-durasi').textContent = `${durasi} Bulan`;
  $('sum-harga').textContent = harga > 0 ? `${formatRupiah(harga)} / bln` : '—';
  $('sum-total').textContent = harga > 0 ? formatRupiah(harga * durasi) : '—';

  const stokEl = $('b-tipe-stok');
  if (typeof stok === 'number') {
    if (stok > 0) {
      stokEl.textContent = `Tersedia ${stok} kamar kosong untuk tipe ini.`;
      stokEl.className = 'mt-1 text-xs font-medium text-green-700';
    } else {
      stokEl.textContent = 'Kamar tipe ini sedang penuh saat ini.';
      stokEl.className = 'mt-1 text-xs font-medium text-red-700';
    }
  } else {
    stokEl.textContent = '';
  }
}

async function muatKatalog() {
  const q = new URLSearchParams(window.location.search);
  const prefTipe = String(q.get('tipe') ?? '').trim().toLowerCase();
  const prefLantai = String(q.get('lantai') ?? '').trim();

  try {
    const data = await getKatalogKamarPublik();
    katalog = Array.isArray(data?.katalog) ? data.katalog : [];
  } catch {
    katalog = [];
  }

  if (katalog.length === 0) {
    katalog = [
      { tipeKamar: 'standart', harga: 300000, jumlahTersedia: 1 },
      { tipeKamar: 'tulip', harga: 1000000, jumlahTersedia: 1 },
      { tipeKamar: 'amarilis', harga: 2000000, jumlahTersedia: 0 },
    ];
  }

  const selectTipe = $('b-tipe');
  selectTipe.replaceChildren(
    ...katalog.map((item) => {
      const key = String(item.tipeKamar ?? '').trim();
      const label = LABEL_TIPE[key.toLowerCase()] ?? `Kamar ${capitalize(key)}`;
      const stokTeks = typeof item.jumlahTersedia === 'number'
        ? (item.jumlahTersedia > 0 ? ` (${item.jumlahTersedia} tersedia)` : ' (Penuh)')
        : '';
      return new Option(`${label} — ${formatRupiah(item.harga)}/bln${stokTeks}`, key);
    })
  );

  if (prefTipe) {
    const cocok = katalog.find((k) => {
      const t = String(k.tipeKamar ?? '').toLowerCase();
      if (t === prefTipe) return true;
      if ((prefTipe === 'standard' || prefTipe === 'standart') && (t === 'standard' || t === 'standart')) return true;
      return false;
    });
    if (cocok) selectTipe.value = cocok.tipeKamar;
  }

  sinkronkanPilihanLantai(prefLantai);
  perbaruiRingkasan();
}

const DURASI_MIN = 1;
const DURASI_MAX = 36;

function aturDurasi(nilaiBaru) {
  const angka = Math.min(DURASI_MAX, Math.max(DURASI_MIN, Math.round(Number(nilaiBaru) || DURASI_MIN)));
  $('b-durasi').value = String(angka);
  $('btn-durasi-kurang').disabled = angka <= DURASI_MIN;
  $('btn-durasi-tambah').disabled = angka >= DURASI_MAX;
  perbaruiRingkasan();
}

$('b-tipe').addEventListener('change', () => {
  sinkronkanPilihanLantai();
  perbaruiRingkasan();
});

$('b-lantai').addEventListener('change', perbaruiRingkasan);

$('btn-durasi-kurang').addEventListener('click', () => {
  aturDurasi(Number($('b-durasi').value || DURASI_MIN) - 1);
});

$('btn-durasi-tambah').addEventListener('click', () => {
  aturDurasi(Number($('b-durasi').value || DURASI_MIN) + 1);
});

$('b-durasi').addEventListener('input', () => {
  const v = Number($('b-durasi').value);
  if (Number.isFinite(v) && v >= DURASI_MIN && v <= DURASI_MAX) {
    $('btn-durasi-kurang').disabled = v <= DURASI_MIN;
    $('btn-durasi-tambah').disabled = v >= DURASI_MAX;
    perbaruiRingkasan();
  }
});

$('b-durasi').addEventListener('blur', () => aturDurasi($('b-durasi').value));
$('b-durasi').addEventListener('change', () => aturDurasi($('b-durasi').value));

// Set kondisi awal tombol kurang/tambah durasi
$('btn-durasi-kurang').disabled = Number($('b-durasi').value || 1) <= DURASI_MIN;
$('btn-durasi-tambah').disabled = Number($('b-durasi').value || 1) >= DURASI_MAX;

$('b-email').addEventListener('input', () => validasiEmail(false));
$('b-email').addEventListener('blur', () => validasiEmail(true));

[
  ['b-telepon', 'b-telepon-error', 'wrap-telepon'],
  ['b-darurat-telp', 'b-darurat-telp-error', 'wrap-darurat-telp'],
].forEach(([inputId, errorId, wrapId]) => {
  $(inputId).addEventListener('input', () => {
    const cleaned = bersihkanNomorLokal($(inputId).value);
    if ($(inputId).value !== cleaned) $(inputId).value = cleaned;
    if ($(errorId).textContent) validasiTelepon(inputId, errorId, wrapId, false);
  });
  $(inputId).addEventListener('blur', () => validasiTelepon(inputId, errorId, wrapId, false));
});

$('form-booking').addEventListener('submit', async (e) => {
  e.preventDefault();
  showError('');

  const emailValid = validasiEmail(true);
  const telpValid = validasiTelepon('b-telepon', 'b-telepon-error', 'wrap-telepon', true);
  const daruratTelpValid = validasiTelepon('b-darurat-telp', 'b-darurat-telp-error', 'wrap-darurat-telp', true);
  const tanggalValid = validasiTanggalMulai();
  aturDurasi($('b-durasi').value);

  const payload = {
    'nama-lengkap': $('b-nama').value.trim(),
    email: $('b-email').value.trim(),
    'nomor-telepon': getNomorDengan62('b-telepon'),
    'nama-kontak-darurat': $('b-darurat-nama').value.trim(),
    'nomor-kontak-darurat': getNomorDengan62('b-darurat-telp'),
    'tipe-kamar': $('b-tipe').value.trim(),
    'durasi-bulan': Number($('b-durasi').value),
    lantai: Number($('b-lantai').value),
    'tanggal-mulai': $('b-mulai').value,
  };

  if (!emailValid) {
    showError('Harus isi email dengan benar.');
    $('b-email').focus();
    return;
  }
  if (!telpValid) {
    showError('Nomor telepon harus diawali dengan 62 dan diisi dengan benar.');
    $('b-telepon').focus();
    return;
  }
  if (!daruratTelpValid) {
    showError('Nomor kontak darurat harus diawali dengan 62 dan diisi dengan benar.');
    $('b-darurat-telp').focus();
    return;
  }
  if (!tanggalValid) {
    showError('Tanggal mulai sewa tidak boleh tanggal yang sudah lewat.');
    $('b-mulai').focus();
    return;
  }
  if (!payload['nama-lengkap'] || !payload['nama-kontak-darurat']) {
    showError('Harap lengkapi seluruh data diri dan kontak darurat.');
    return;
  }
  if (!payload['tipe-kamar'] || !payload.lantai || !payload['tanggal-mulai']) {
    showError('Harap lengkapi pilihan kamar, lantai, dan tanggal mulai sewa.');
    return;
  }

  const btn = $('btn-submit-booking');
  btn.disabled = true;
  btn.textContent = 'Membuat pesanan...';

  try {
    const res = await buatBookingPublik(payload);
    const idPemesanan =
      res?.['id-pemesanan'] ??
      res?.idPemesanan ??
      res?._id ??
      res?.id ??
      res?.pemesanan?._id ??
      res?.booking?._id ??
      '';

    if (!idPemesanan) {
      throw new Error('Pesanan dibuat, tetapi ID pemesanan tidak ditemukan di respon server.');
    }

    // Simpan ringkas ke sessionStorage (opsional) lalu langsung arahkan ke halaman khusus /booking/:id
    try {
      sessionStorage.setItem(`booking-baru:${idPemesanan}`, '1');
      sessionStorage.setItem(
        `booking-info:${idPemesanan}`,
        JSON.stringify({
          nama: payload['nama-lengkap'],
          email: payload.email,
          telepon: payload['nomor-telepon'],
          tanggalMulai: payload['tanggal-mulai'],
        })
      );
    } catch { /* abaikan */ }

    window.location.assign(`/booking/${encodeURIComponent(idPemesanan)}`);
  } catch (err) {
    showError(err.message);
    btn.disabled = false;
    btn.textContent = 'Buat Pesanan & Lanjut Bayar';
  }
});

$('form-cek-cepat').addEventListener('submit', (e) => {
  e.preventDefault();
  const id = $('cek-id-cepat').value.trim();
  if (!id) {
    showError('Masukkan ID pemesanan terlebih dahulu untuk mengecek status.');
    return;
  }
  window.location.assign(`/booking/${encodeURIComponent(id)}`);
});

muatKatalog();
