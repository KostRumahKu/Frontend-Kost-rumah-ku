// Logic for pages/kamar.html — Katalog 3 Tipe Kamar dari backend (/api/public/data-kamar) dengan slider loop
import { mountNavbar } from '../components/navbar.js';
import { landingNavItems, mountMobileBottomNav } from '../components/mobile-bottom-nav.js';
import { API_BASE_URL } from '../utils/config.js';
import { $, pasangDialog } from '../utils/dom.js';

mountNavbar({
  topEl: $('top-nav'),
  active: 'kamar',
  actions: [
    { label: 'Masuk', href: '/auth/login', solid: true },
  ],
});

mountMobileBottomNav({
  rootEl: $('bottom-nav'),
  variant: 'landing',
  items: landingNavItems,
  active: 'kamar',
});

const dlg = $('dlg-detail-kamar');
pasangDialog(dlg);

// Informasi tampilan bahasa Indonesia per tipe (harga, foto, fasilitas, dan jumlahTersedia diambil dari backend)
const INFO_TIPE = {
  standart: {
    nama: 'Standar',
    label: 'Kamar Standar',
    badge: 'Tipe Standar',
    deskripsi: 'Kamar nyaman dan bersih yang dilengkapi tempat tidur, lemari pakaian, meja & kursi belajar, serta akses Wi-Fi untuk kenyamanan harianmu.',
    fasilitasFallback: ['Kasur', 'Lemari Pakaian', 'Meja & Kursi', 'Wi-Fi'],
  },
  standard: {
    nama: 'Standar',
    label: 'Kamar Standar',
    badge: 'Tipe Standar',
    deskripsi: 'Kamar nyaman dan bersih yang dilengkapi tempat tidur, lemari pakaian, meja & kursi belajar, serta akses Wi-Fi untuk kenyamanan harianmu.',
    fasilitasFallback: ['Kasur', 'Lemari Pakaian', 'Meja & Kursi', 'Wi-Fi'],
  },
  tulip: {
    nama: 'Tulip',
    label: 'Kamar Tulip',
    badge: 'Tipe Tulip',
    deskripsi: 'Kamar dengan ruang lebih lega yang dilengkapi tempat tidur nyaman, AC, kamar mandi dalam, meja, kursi, dan lemari pakaian.',
    fasilitasFallback: ['AC', 'Kamar Mandi Dalam', 'Meja & Kursi', 'Lemari Pakaian'],
  },
  amarilis: {
    nama: 'Amarilis',
    label: 'Kamar Amarilis',
    badge: 'Tipe Amarilis',
    deskripsi: 'Tipe kamar eksklusif dengan fasilitas lengkap meliputi AC, kamar mandi dalam, tempat tidur nyaman, meja kerja, kursi, dan lemari luas.',
    fasilitasFallback: ['AC', 'Kamar Mandi Dalam', 'Meja & Kursi', 'Lemari Luas'],
  },
};

let daftarTipe = [];
let slideIdx = 0;
let isAnimating = false;
let animTimer = null;

function formatHargaKartu(angka) {
  return `Rp ${new Intl.NumberFormat('id-ID').format(Number(angka || 0))}`;
}

function capitalize(str) {
  const s = String(str ?? '').trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

function ambilFotoValid(foto) {
  const list = Array.isArray(foto) ? foto : (foto ? [foto] : []);
  const valid = list.find((f) => typeof f === 'string' && /^(https?:\/\/|\/)/.test(f.trim()));
  return valid ? valid.trim() : '/public/img/halaman.webp';
}

function ambilSemuaFotoValid(foto) {
  const list = Array.isArray(foto) ? foto : (foto ? [foto] : []);
  return list
    .filter((f) => typeof f === 'string' && /^(https?:\/\/|\/)/.test(f.trim()))
    .map((f) => f.trim());
}

function normalisasiItemKatalog(item) {
  const rawKey = String(item?.tipeKamar ?? item?.['tipe-kamar'] ?? item?.tipe ?? '').trim();
  const keyLower = rawKey.toLowerCase();
  const meta = INFO_TIPE[keyLower] ?? {
    nama: capitalize(rawKey || 'Standar'),
    label: `Kamar ${capitalize(rawKey || 'Standar')}`,
    badge: `Tipe ${capitalize(rawKey || 'Standar')}`,
    deskripsi: `Kamar Tipe ${capitalize(rawKey || 'Standar')} dengan suasana tenang, bersih, dan nyaman untuk tinggal di KostRumahKu.`,
    fasilitasFallback: ['Kasur', 'Lemari Pakaian', 'Meja & Kursi', 'Wi-Fi'],
  };

  let fasilitas = [];
  if (Array.isArray(item?.fasilitas) && item.fasilitas.length > 0) {
    fasilitas = item.fasilitas
      .map((f) => (typeof f === 'string' ? f.trim() : (f?.nama ?? f?.label ?? '')))
      .filter(Boolean);
  } else if (typeof item?.fasilitas === 'string' && item.fasilitas.trim()) {
    fasilitas = item.fasilitas.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);
  } else {
    fasilitas = meta.fasilitasFallback;
  }

  const deskripsi = item?.deskripsi && String(item.deskripsi).trim()
    ? String(item.deskripsi).trim()
    : (Array.isArray(item?.fasilitas) && item.fasilitas.length > 0
      ? `Kamar ini dilengkapi dengan ${fasilitas.join(', ')} untuk menunjang kenyamanan selama masa tinggalmu.`
      : meta.deskripsi);

  const jumlahTersedia = Number(item?.jumlahTersedia ?? item?.['jumlah-tersedia'] ?? 0);
  const harga = Number(item?.harga ?? 0);

  return {
    key: rawKey || keyLower,
    nama: meta.nama,
    label: meta.label,
    badge: meta.badge,
    deskripsi,
    harga,
    fasilitas,
    fotoUtama: ambilFotoValid(item?.foto),
    semuaFoto: ambilSemuaFotoValid(item?.foto),
    jumlahTersedia,
  };
}

function buatKartu(tipe) {
  const card = document.createElement('article');
  // Semua 3 kartu memakai desain tema coklat KostRumahKu yang seragam, rapi, dan responsif dengan subtle hover
  card.className = 'group/card flex w-full shrink-0 flex-col overflow-hidden rounded-2xl border border-[var(--color-primary-dark)]/45 bg-[var(--color-primary)] text-[var(--color-cream)] shadow-lg transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-[var(--color-accent)]/60 hover:shadow-xl sm:grid sm:h-[22.5rem] sm:grid-cols-12 lg:h-[23.5rem] lg:w-[calc(50%-0.75rem)]';

  // ── Panel Kiri (atas di mobile): Foto Kamar dari Backend ────────────────────
  const left = document.createElement('div');
  left.className = 'relative h-44 w-full shrink-0 overflow-hidden bg-black/20 sm:col-span-5 sm:h-full sm:border-r sm:border-black/25';

  const img = document.createElement('img');
  img.src = tipe.fotoUtama;
  img.alt = tipe.label;
  img.className = 'h-full w-full object-cover transition-transform duration-500 ease-out group-hover/card:scale-[1.03]';
  img.addEventListener('error', () => {
    if (!img.src.endsWith('/public/img/halaman.webp')) {
      img.src = '/public/img/halaman.webp';
    }
  });
  left.append(img);

  const overlay = document.createElement('div');
  overlay.className = 'pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent';
  left.append(overlay);

  // Badge ketersediaan (hijau untuk tersedia, merah lembut untuk penuh)
  const stokBadge = document.createElement('span');
  const tersedia = tipe.jumlahTersedia > 0;
  stokBadge.className = tersedia
    ? 'absolute bottom-3 left-3 inline-flex h-7 items-center gap-1.5 rounded-full bg-green-100/95 px-3 font-[family-name:var(--font-body)] text-[11px] font-semibold leading-none tracking-[0.015em] text-green-900 shadow-sm backdrop-blur-[2px]'
    : 'absolute bottom-3 left-3 inline-flex h-7 items-center gap-1.5 rounded-full bg-red-100/95 px-3 font-[family-name:var(--font-body)] text-[11px] font-semibold leading-none tracking-[0.015em] text-red-800 shadow-sm backdrop-blur-[2px]';
  const stokDot = document.createElement('span');
  stokDot.className = tersedia ? 'h-1.5 w-1.5 rounded-full bg-green-600' : 'h-1.5 w-1.5 rounded-full bg-red-600';
  stokDot.setAttribute('aria-hidden', 'true');
  const stokText = document.createElement('span');
  stokText.textContent = tersedia ? `${tipe.jumlahTersedia} Kamar Tersedia` : 'Penuh Saat Ini';
  stokBadge.append(stokDot, stokText);
  left.append(stokBadge);

  // ── Panel Kanan: Informasi Kamar Terstruktur ────────────────────────────────
  const right = document.createElement('div');
  right.className = 'flex flex-1 flex-col justify-between p-5 sm:col-span-7 sm:h-full sm:px-5 sm:py-4 lg:px-6 lg:py-5';

  const topContent = document.createElement('div');

  // 1. Pill Tipe Kamar
  const pill = document.createElement('span');
  pill.className = 'inline-flex h-6 items-center rounded-full bg-[var(--color-cream)] px-3.5 font-[family-name:var(--font-body)] text-[11px] font-semibold leading-none tracking-[0.04em] text-[var(--color-primary)] shadow-2xs';
  pill.textContent = tipe.badge;

  // 2. Judul + garis bawah (Playfair Display untuk nama kamar)
  const title = document.createElement('h2');
  title.className = 'mt-2.5 border-b border-[var(--color-cream)]/25 pb-1.5 font-[family-name:var(--font-heading)] text-[1.3rem] font-semibold leading-snug tracking-[0.015em] text-[var(--color-cream)]';
  title.textContent = tipe.label;

  // 3. Deskripsi (Lato, nyaman dibaca, tinggi konsisten)
  const desc = document.createElement('p');
  desc.className = 'mt-2 line-clamp-3 min-h-[3.6rem] font-[family-name:var(--font-body)] text-[12.5px] font-normal leading-[1.55] tracking-[0.01em] text-[var(--color-cream)]/90';
  desc.textContent = tipe.deskripsi;

  // 4. Price Badge dari Backend (Playfair Display untuk nominal harga + / bulan konsisten)
  const priceWrap = document.createElement('div');
  priceWrap.className = 'mt-3';
  const priceBox = document.createElement('div');
  priceBox.className = 'inline-flex items-baseline gap-1.5 rounded-xl bg-[var(--color-cream)] px-3.5 py-1.5 shadow-xs';
  const priceNominal = document.createElement('span');
  priceNominal.className = 'font-[family-name:var(--font-heading)] text-[1.1rem] font-bold leading-none tracking-[0.01em] text-[var(--color-primary)]';
  priceNominal.textContent = formatHargaKartu(tipe.harga);
  const priceUnit = document.createElement('span');
  priceUnit.className = 'font-[family-name:var(--font-body)] text-[11px] font-medium leading-none tracking-[0.02em] text-[var(--color-muted)]';
  priceUnit.textContent = '/ bulan';
  priceBox.append(priceNominal, priceUnit);
  priceWrap.append(priceBox);

  // 5. Tombol Pesan Sekarang & Lihat Detail (Lato, tinggi & radius seragam, transisi & active feedback)
  const btnRow = document.createElement('div');
  btnRow.className = 'mt-2.5 flex flex-wrap gap-2';

  const btnBaseCls =
    'inline-flex h-9 cursor-pointer items-center justify-center rounded-lg border border-[var(--color-cream)] bg-[var(--color-cream)] px-4 font-[family-name:var(--font-body)] text-xs font-semibold leading-none tracking-[0.02em] text-[var(--color-primary)] shadow-xs transition-all duration-200 ease-out hover:border-[var(--color-cream)]/80 hover:bg-[var(--color-primary-dark)] hover:text-[var(--color-cream)] hover:shadow-sm active:scale-[0.97] active:bg-[#362013] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-cream)]/70';

  const btnPesan = document.createElement('a');
  btnPesan.href = `/pesan?tipe=${encodeURIComponent(tipe.key)}`;
  btnPesan.className = btnBaseCls;
  btnPesan.textContent = 'Pesan Sekarang';

  const btnDetail = document.createElement('button');
  btnDetail.type = 'button';
  btnDetail.className = btnBaseCls;
  btnDetail.textContent = 'Lihat Detail';
  btnDetail.addEventListener('click', () => bukaDetail(tipe));

  btnRow.append(btnPesan, btnDetail);
  topContent.append(pill, title, desc, priceWrap, btnRow);

  // 6. Amenity Pills di bagian bawah kartu (seragam tinggi, padding, ikon sejajar vertikal)
  const fasRow = document.createElement('div');
  fasRow.className = 'mt-3 flex flex-wrap gap-1.5 border-t border-[var(--color-cream)]/15 pt-2.5';
  tipe.fasilitas.slice(0, 5).forEach((f) => {
    const chip = document.createElement('span');
    chip.className = 'group inline-flex h-7 items-center gap-1.5 rounded-full bg-[var(--color-cream)] px-3 font-[family-name:var(--font-body)] text-[11px] font-medium leading-none tracking-[0.015em] text-[var(--color-primary)] ring-1 ring-inset ring-[var(--color-cream)] shadow-2xs transition-colors duration-200 hover:bg-[var(--color-primary-dark)] hover:text-[var(--color-cream)] hover:ring-[var(--color-cream)]/70';
    chip.append(buatElemenIkonFasilitas(f, 'h-3.5 w-3.5 transition-[filter] duration-200 group-hover:brightness-0 group-hover:invert'));
    const txt = document.createElement('span');
    txt.className = 'leading-none';
    txt.textContent = f;
    chip.append(txt);
    fasRow.append(chip);
  });

  right.append(topContent, fasRow);
  card.append(left, right);
  return card;
}

// ── Infinite Loop Carousel ────────────────────────────────────────────────────
function renderTrack() {
  const track = $('kamar-track');
  if (daftarTipe.length === 0) return;

  // Gandakan 2 kartu awal di belakang agar loop kanan & kiri mulus tanpa putus
  const clonedItems = [...daftarTipe, ...daftarTipe.slice(0, Math.min(2, daftarTipe.length))];
  track.replaceChildren(...clonedItems.map(buatKartu));
  slideIdx = 0;
  setTrackOffset(0, false);
  renderDots();
  updateActiveDot();
}

function getStepWidth() {
  const firstCard = $('kamar-track').firstElementChild;
  if (!firstCard) return 0;
  return firstCard.getBoundingClientRect().width + 24; // gap-6 = 24px
}

function setTrackOffset(idx, animate = true) {
  const track = $('kamar-track');
  track.style.transition = animate ? 'transform 550ms cubic-bezier(0.25, 1, 0.5, 1)' : 'none';
  const offset = idx * getStepWidth();
  track.style.transform = `translate3d(-${offset}px, 0, 0)`;
}

function renderDots() {
  const dots = $('slider-dots');
  dots.replaceChildren();

  daftarTipe.forEach((tipe, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('role', 'tab');
    btn.textContent = tipe.nama;
    btn.addEventListener('click', () => {
      if (isAnimating) return;
      slideIdx = i;
      setTrackOffset(slideIdx, true);
      updateActiveDot();
    });
    dots.append(btn);
  });
}

function updateActiveDot() {
  const realIdx = ((slideIdx % daftarTipe.length) + daftarTipe.length) % daftarTipe.length;
  $('slider-dots').querySelectorAll('button').forEach((btn, i) => {
    const aktif = i === realIdx;
    btn.setAttribute('aria-selected', aktif ? 'true' : 'false');
    btn.className = aktif
      ? 'inline-flex h-8 cursor-pointer items-center justify-center rounded-full bg-[var(--color-primary)] px-5 font-[family-name:var(--font-body)] text-xs font-semibold leading-none tracking-[0.025em] text-[var(--color-cream)] shadow-sm transition-all duration-200 ease-out active:scale-[0.97]'
      : 'inline-flex h-8 cursor-pointer items-center justify-center rounded-full bg-transparent px-5 font-[family-name:var(--font-body)] text-xs font-medium leading-none tracking-[0.025em] text-[var(--color-primary)]/75 transition-all duration-200 ease-out hover:bg-[var(--color-cream)] hover:text-[var(--color-primary)] active:scale-[0.97]';
  });
}

function selesaiAnimasi() {
  clearTimeout(animTimer);
  if (slideIdx >= daftarTipe.length) {
    slideIdx = 0;
    setTrackOffset(slideIdx, false);
  }
  isAnimating = false;
  updateActiveDot();
}

function geserKanan() {
  if (isAnimating || daftarTipe.length <= 1) return;
  isAnimating = true;
  slideIdx += 1;
  setTrackOffset(slideIdx, true);
  updateActiveDot();
  clearTimeout(animTimer);
  animTimer = setTimeout(selesaiAnimasi, 600);
}

function geserKiri() {
  if (isAnimating || daftarTipe.length <= 1) return;
  isAnimating = true;
  if (slideIdx <= 0) {
    slideIdx = daftarTipe.length;
    setTrackOffset(slideIdx, false);
    void $('kamar-track').offsetWidth;
  }
  slideIdx -= 1;
  setTrackOffset(slideIdx, true);
  updateActiveDot();
  clearTimeout(animTimer);
  animTimer = setTimeout(selesaiAnimasi, 600);
}

$('kamar-track').addEventListener('transitionend', (e) => {
  if (e.propertyName === 'transform') selesaiAnimasi();
});

$('btn-next').addEventListener('click', geserKanan);
$('btn-prev').addEventListener('click', geserKiri);

window.addEventListener('resize', () => {
  slideIdx = ((slideIdx % Math.max(1, daftarTipe.length)) + Math.max(1, daftarTipe.length)) % Math.max(1, daftarTipe.length);
  setTrackOffset(slideIdx, false);
});

// ── Modal Detail Tipe Kamar (Konsep Traveloka) ────────────────────────────────
let dlgFotos = [];
let dlgFotoIdx = 0;

function cariPathIkonFasilitas(nama) {
  const s = String(nama ?? '').toLowerCase();
  if (s.includes('ac') || s.includes('pendingin') || s.includes('air conditioner')) {
    return '/public/icons/air-conditioner.webp';
  }
  if (s.includes('mandi') || s.includes('bath') || s.includes('shower') || s.includes('toilet')) {
    return '/public/icons/bathtub.webp';
  }
  if (s.includes('kursi') || s.includes('meja') || s.includes('chair') || s.includes('desk')) {
    return '/public/icons/chair.webp';
  }
  if (s.includes('lemari') || s.includes('wardrobe') || s.includes('wardobe') || s.includes('cabinet')) {
    return '/public/icons/wardobe.webp';
  }
  if (s.includes('wifi') || s.includes('wi-fi') || s.includes('internet')) {
    return '/public/icons/facilities.webp';
  }
  if (s.includes('kasur') || s.includes('tidur') || s.includes('bed')) {
    return '/public/icons/rooms.webp';
  }
  return null;
}

function buatElemenIkonFasilitas(nama, sizeCls = 'h-5 w-5') {
  const path = cariPathIkonFasilitas(nama);
  if (path) {
    const img = document.createElement('img');
    img.src = path;
    img.alt = '';
    img.setAttribute('aria-hidden', 'true');
    img.className = `${sizeCls} shrink-0 object-contain`;
    img.addEventListener('error', () => img.remove());
    return img;
  }
  const wrap = document.createElement('span');
  wrap.className = `${sizeCls} inline-flex shrink-0 items-center justify-center text-current`;
  wrap.setAttribute('aria-hidden', 'true');
  wrap.innerHTML = '<svg class="h-full w-full" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>';
  return wrap;
}

function renderFotoModal() {
  const mainImg = $('dlg-main-img');
  const counter = $('dlg-galeri-counter');
  const prevBtn = $('dlg-img-prev');
  const nextBtn = $('dlg-img-next');

  const src = dlgFotos[dlgFotoIdx] ?? '/public/img/halaman.webp';
  mainImg.src = src;
  mainImg.onerror = () => {
    if (!mainImg.src.endsWith('/public/img/halaman.webp')) {
      mainImg.src = '/public/img/halaman.webp';
    }
  };

  counter.textContent = `${dlgFotoIdx + 1}/${dlgFotos.length}`;
  const multi = dlgFotos.length > 1;
  prevBtn.classList.toggle('hidden', !multi);
  nextBtn.classList.toggle('hidden', !multi);

  $('dlg-thumbs').querySelectorAll('button').forEach((btn, i) => {
    const aktif = i === dlgFotoIdx;
    btn.className = aktif
      ? 'h-14 w-20 shrink-0 cursor-pointer overflow-hidden rounded-lg ring-2 ring-[var(--color-cream)] opacity-100 transition-all'
      : 'h-14 w-20 shrink-0 cursor-pointer overflow-hidden rounded-lg opacity-55 transition-all hover:opacity-90';
  });
}

$('dlg-img-prev').addEventListener('click', () => {
  if (dlgFotos.length <= 1) return;
  dlgFotoIdx = (dlgFotoIdx - 1 + dlgFotos.length) % dlgFotos.length;
  renderFotoModal();
});

$('dlg-img-next').addEventListener('click', () => {
  if (dlgFotos.length <= 1) return;
  dlgFotoIdx = (dlgFotoIdx + 1) % dlgFotos.length;
  renderFotoModal();
});

function buatInfoBaris(svgPath, teks) {
  const row = document.createElement('div');
  row.className = 'flex items-center gap-2.5 text-sm text-[var(--color-ink)]';
  row.innerHTML = `<svg class="h-4 w-4 shrink-0 text-[var(--color-muted)]" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24" aria-hidden="true">${svgPath}</svg>`;
  const span = document.createElement('span');
  span.textContent = teks;
  row.append(span);
  return row;
}

function bukaDetail(tipe) {
  $('dlg-judul').textContent = tipe.label;
  $('dlg-badge').textContent = tipe.jumlahTersedia > 0
    ? `${tipe.jumlahTersedia} Kamar Tersedia`
    : 'Penuh Saat Ini';
  $('dlg-badge').className = tipe.jumlahTersedia > 0
    ? 'inline-flex h-7 items-center rounded-full bg-green-100 px-3 font-[family-name:var(--font-body)] text-[11px] font-semibold leading-none tracking-[0.015em] text-green-900'
    : 'inline-flex h-7 items-center rounded-full bg-red-100 px-3 font-[family-name:var(--font-body)] text-[11px] font-semibold leading-none tracking-[0.015em] text-red-800';

  $('dlg-galeri-label').textContent = `Foto ${tipe.label}`;
  $('dlg-harga').textContent = formatHargaKartu(tipe.harga);

  const btnPesan = $('dlg-btn-pesan');
  btnPesan.href = `/pesan?tipe=${encodeURIComponent(tipe.key)}`;
  if (tipe.jumlahTersedia > 0) {
    btnPesan.textContent = 'Pesan Kamar Ini';
    btnPesan.className = 'mt-3 flex h-11 w-full items-center justify-center rounded-xl bg-[var(--color-primary)] px-5 font-[family-name:var(--font-body)] text-sm font-semibold tracking-[0.02em] text-[var(--color-cream)] shadow-sm transition-all duration-200 hover:bg-[var(--color-primary-dark)] active:scale-[0.99]';
    btnPesan.removeAttribute('aria-disabled');
  } else {
    btnPesan.textContent = 'Lihat Ketersediaan / Ajukan Booking';
    btnPesan.className = 'mt-3 flex h-11 w-full items-center justify-center rounded-xl bg-[var(--color-primary)]/80 px-5 font-[family-name:var(--font-body)] text-sm font-semibold tracking-[0.02em] text-[var(--color-cream)] shadow-sm transition-all duration-200 hover:bg-[var(--color-primary-dark)] active:scale-[0.99]';
  }

  // Siapkan galeri foto (semua URL foto dari backend, atau fallback 1 foto halaman)
  dlgFotos = tipe.semuaFoto.length > 0 ? [...tipe.semuaFoto] : [tipe.fotoUtama];
  dlgFotoIdx = 0;

  const thumbsWrap = $('dlg-thumbs');
  thumbsWrap.replaceChildren(...dlgFotos.map((src, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    const img = document.createElement('img');
    img.src = src;
    img.alt = `Thumbnail ${i + 1}`;
    img.className = 'h-full w-full object-cover';
    img.addEventListener('error', () => {
      if (!img.src.endsWith('/public/img/halaman.webp')) img.src = '/public/img/halaman.webp';
    });
    btn.append(img);
    btn.addEventListener('click', () => {
      dlgFotoIdx = i;
      renderFotoModal();
    });
    return btn;
  }));
  renderFotoModal();

  // Isi panel informasi kanan (gaya Traveloka)
  const body = $('dlg-body');
  body.replaceChildren();

  // 1. Informasi Kamar
  const secInfo = document.createElement('section');
  secInfo.className = 'space-y-2.5 border-b border-[var(--color-primary)]/10 pb-4';
  const hInfo = document.createElement('h3');
  hInfo.className = 'text-sm font-bold text-[var(--color-ink)]';
  hInfo.textContent = 'Informasi Kamar';
  secInfo.append(
    hInfo,
    buatInfoBaris('<path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12l8.954-8.955a1.5 1.5 0 0 1 2.092 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75" />', `Kategori: ${tipe.badge}`),
    buatInfoBaris('<path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />', 'Kapasitas: 1 Penghuni / Kamar'),
    buatInfoBaris('<path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />', tipe.jumlahTersedia > 0 ? `Tersedia ${tipe.jumlahTersedia} kamar kosong` : 'Saat ini seluruh unit terisi'),
  );
  const pDesc = document.createElement('p');
  pDesc.className = 'pt-1 text-xs leading-relaxed text-[var(--color-muted)]';
  pDesc.textContent = tipe.deskripsi;
  secInfo.append(pDesc);

  // 2. Fasilitas Unggulan Kamar
  const secFitur = document.createElement('section');
  secFitur.className = 'space-y-2.5 border-b border-[var(--color-primary)]/10 pb-4';
  const hFitur = document.createElement('h3');
  hFitur.className = 'text-sm font-bold text-[var(--color-ink)]';
  hFitur.textContent = 'Fasilitas Kamar';
  const listFitur = document.createElement('ul');
  listFitur.className = 'space-y-2';
  tipe.fasilitas.forEach((f) => {
    const li = document.createElement('li');
    li.className = 'flex items-center gap-2.5 text-sm text-[var(--color-ink)]';
    li.append(buatElemenIkonFasilitas(f, 'h-5 w-5'));
    const span = document.createElement('span');
    span.textContent = f;
    li.append(span);
    listFitur.append(li);
  });
  secFitur.append(hFitur, listFitur);

  // 3. Fasilitas Umum Kost (2 kolom bullet seperti Basic Facilities Traveloka)
  const secUmum = document.createElement('section');
  secUmum.className = 'space-y-2.5';
  const hUmum = document.createElement('h3');
  hUmum.className = 'text-sm font-bold text-[var(--color-ink)]';
  hUmum.textContent = 'Fasilitas Bersama Kost';
  const ulUmum = document.createElement('ul');
  ulUmum.className = 'grid grid-cols-2 gap-x-4 gap-y-1.5 pl-4 text-xs text-[var(--color-muted)] list-disc';
  ['Wi-Fi Area Kost', 'Area Parkir Luas', 'Keamanan 24 Jam', 'Halaman Hijau Asri', 'Portal Tagihan Online', 'Lokasi Strategis Depok'].forEach((item) => {
    const li = document.createElement('li');
    li.textContent = item;
    ulUmum.append(li);
  });
  secUmum.append(hUmum, ulUmum);

  body.append(secInfo, secFitur, secUmum);
  dlg.showModal();
}

// ── Muat Katalog dari Backend (/api/public/data-kamar) ────────────────────────
async function init() {
  try {
    const res = await fetch(`${API_BASE_URL()}/api/public/data-kamar`, {
      headers: { Accept: 'application/json' },
    });
    const json = await res.json().catch(() => null);
    const data = json?.data ?? json ?? {};
    const katalog = Array.isArray(data?.katalog) ? data.katalog : [];

    // Tampilkan ringkasan ketersediaan kamar bila tersedia dari backend
    const ketersediaan = data?.ketersediaan;
    if (ketersediaan && typeof ketersediaan.kosong === 'number') {
      const infoEl = $('ringkasan-ketersediaan');
      infoEl.textContent = ketersediaan.isPenuh
        ? 'Seluruh kamar saat ini sedang terisi penuh'
        : `${ketersediaan.kosong} dari ${ketersediaan.total} kamar tersedia untuk dipesan`;
      infoEl.classList.remove('hidden');
    }

    if (katalog.length > 0) {
      daftarTipe = katalog.map(normalisasiItemKatalog);
      renderTrack();
      return;
    }
  } catch { /* fallback ke default bila jaringan bermasalah */ }

  // Fallback jika request gagal
  daftarTipe = [
    normalisasiItemKatalog({ tipeKamar: 'standart', harga: 300000, fasilitas: null, foto: [], jumlahTersedia: 0 }),
    normalisasiItemKatalog({ tipeKamar: 'tulip', harga: 1000000, fasilitas: null, foto: [], jumlahTersedia: 0 }),
    normalisasiItemKatalog({ tipeKamar: 'amarilis', harga: 2000000, fasilitas: null, foto: [], jumlahTersedia: 0 }),
  ];
  renderTrack();
}

init();
