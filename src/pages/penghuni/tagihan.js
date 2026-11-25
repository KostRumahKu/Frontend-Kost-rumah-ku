import { mountPenghuniNav } from '../../components/penghuni-nav.js';
import { requireRole, logout } from '../../utils/auth-guard.js';
import { formatRupiah } from '../../utils/format.js';
import { $, tampilPesan, urlAman, pasangDialog } from '../../utils/dom.js';
import {
  getTagihan,
  generateTagihanPdf,
} from '../../services/penyewa-service.js';

const sesi = requireRole('penyewa');
if (sesi) init();

let semuaTagihan = [];

function init() {
  mountPenghuniNav({
    sidebarEl: $('sidebar'),
    bottomEl:  $('bottom-nav'),
    active:    'tagihan',
    onLogout:  logout,
  });
  $('logout-mobile').addEventListener('click', logout);

  pasangDialog($('dlg-detail'));

  muatTagihan();
}

function formatTanggal(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(d);
}

function formatRupiahTagihan(angka) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(angka ?? 0));
}

function getIdTagihan(t) {
  return t?._id ?? t?.id ?? '';
}

function urlPembayaran(t) {
  const id = getIdTagihan(t);
  return id ? `/penghuni/pembayaran?id=${encodeURIComponent(id)}` : '/penghuni/pembayaran';
}

function cocokBulanIni(nilaiBulan) {
  if (!nilaiBulan) return false;
  const now = new Date();
  const bulanId = now.toLocaleString('id-ID', { month: 'long', year: 'numeric' }).toLowerCase();
  const bulanEn = now.toLocaleString('en-US', { month: 'long', year: 'numeric' }).toLowerCase();
  const yyyyMm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const mmYyyy = `${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
  const norm = String(nilaiBulan).trim().toLowerCase();
  return norm === bulanId || norm === bulanEn || norm.startsWith(yyyyMm) || norm === mmYyyy;
}

const STATUS_MAP = {
  'lunas':               { label: 'Lunas',               pill: 'bg-green-100 text-green-700', box: 'border-green-300 bg-green-50 text-green-800' },
  'belum-bayar':         { label: 'Belum Bayar',         pill: 'bg-red-100 text-red-700',     box: 'border-[var(--color-primary)]/35 bg-[var(--color-cream)]/40 text-[var(--color-primary)]' },
  'menunggu-konfirmasi': { label: 'Menunggu Konfirmasi', pill: 'bg-amber-100 text-amber-700', box: 'border-amber-300 bg-amber-50 text-amber-800' },
  'ditolak':             { label: 'Ditolak',             pill: 'bg-red-100 text-red-700',     box: 'border-red-300 bg-red-50 text-red-700' },
  'terlambat':           { label: 'Terlambat',           pill: 'bg-red-100 text-red-700',     box: 'border-red-300 bg-red-50 text-red-700' },
};

const bisaDibayar = (status) => {
  const s = String(status ?? '').toLowerCase();
  return s === 'belum-bayar' || s === 'ditolak' || s === 'terlambat';
};

function statusBadge(status) {
  const key = String(status ?? '').toLowerCase();
  const s = STATUS_MAP[key] ?? { label: status ?? '-', pill: 'bg-stone-100 text-stone-600' };
  const el = document.createElement('span');
  el.className   = `inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${s.pill}`;
  el.textContent = s.label;
  return el;
}

function waktuUrut(t) {
  const raw = t?.['dibuat-pada'] ?? t?.['tanggal-jatuh-tempo'] ?? 0;
  const ts = new Date(raw).getTime();
  return Number.isNaN(ts) ? 0 : ts;
}

async function muatTagihan() {
  try {
    const data = await getTagihan();
    const rawList = Array.isArray(data) ? data : (Array.isArray(data?.tagihan) ? data.tagihan : []);
    semuaTagihan = [...rawList].sort((a, b) => waktuUrut(b) - waktuUrut(a));

    $('skeleton-bulan-ini').classList.add('hidden');
    $('skeleton-riwayat').classList.add('hidden');

    const tagihanBulanIni = semuaTagihan.find((t) => cocokBulanIni(t['bulan-tagihan']));
    const tagihanAktif = tagihanBulanIni ?? semuaTagihan.find((t) => {
      const st = String(t.status ?? '').toLowerCase();
      return st !== 'lunas';
    }) ?? null;

    $('konten-bulan-ini').classList.add('hidden');
    $('tidak-ada-tagihan').classList.add('hidden');

    if (tagihanAktif) {
      const key = String(tagihanAktif.status ?? '').toLowerCase();
      const s = STATUS_MAP[key] ?? { label: tagihanAktif.status ?? '-', box: 'border-stone-300 bg-stone-50 text-stone-700' };

      $('judul-tagihan-aktif').textContent = tagihanBulanIni ? 'Tagihan Bulan Ini' : 'Tagihan Aktif';
      $('tagihan-jumlah').textContent      = formatRupiahTagihan(tagihanAktif['jumlah-tagihan']);
      $('tagihan-bulan').textContent       = `Periode : ${tagihanAktif['bulan-tagihan'] ?? '-'}`;
      $('tagihan-jatuh-tempo').textContent = `Jatuh Tempo : ${formatTanggal(tagihanAktif['tanggal-jatuh-tempo'])}`;

      const badge = $('tagihan-status-badge');
      badge.textContent = s.label;
      badge.className   = `mt-1.5 inline-flex min-w-[11rem] items-center justify-center rounded-lg border px-5 py-2 text-sm font-semibold ${s.box}`;

      const btnBayar = $('btn-bayar');
      if (bisaDibayar(tagihanAktif.status)) {
        btnBayar.href = urlPembayaran(tagihanAktif);
        btnBayar.classList.remove('hidden');
        btnBayar.classList.add('inline-flex');
      } else if (key === 'lunas') {
        btnBayar.href = '/penghuni/pembayaran';
        btnBayar.classList.remove('hidden');
        btnBayar.classList.add('inline-flex');
      } else {
        btnBayar.classList.add('hidden');
        btnBayar.classList.remove('inline-flex');
      }

      $('konten-bulan-ini').classList.remove('hidden');
    } else {
      $('tidak-ada-tagihan').classList.remove('hidden');
    }

    // ── Riwayat ───────────────────────────────────────────────────────────────
    if (semuaTagihan.length === 0) {
      $('tabel-riwayat').classList.add('hidden');
      $('riwayat-kosong').classList.remove('hidden');
      return;
    }

    $('riwayat-kosong').classList.add('hidden');
    const tbody = $('tbody-riwayat');
    tbody.replaceChildren();

    semuaTagihan.forEach((t) => {
      const tr = document.createElement('tr');
      tr.className = 'transition-colors hover:bg-[var(--color-cream)]/50';

      const cells = [
        { text: t['bulan-tagihan'] ?? '-',               cls: 'font-medium' },
        { text: formatRupiah(t['jumlah-tagihan']),       cls: 'font-semibold text-[var(--color-primary)] whitespace-nowrap' },
        { text: formatTanggal(t['tanggal-jatuh-tempo']), cls: 'text-[var(--color-muted)] whitespace-nowrap' },
      ];

      cells.forEach(({ text, cls }) => {
        const td = document.createElement('td');
        td.className   = `px-6 py-4 text-sm ${cls}`;
        td.textContent = text;
        tr.append(td);
      });

      const tdStatus = document.createElement('td');
      tdStatus.className = 'px-6 py-4';
      tdStatus.append(statusBadge(t.status));
      tr.append(tdStatus);

      const tdAksi = document.createElement('td');
      tdAksi.className = 'px-6 py-4';
      const aksiWrap = document.createElement('div');
      aksiWrap.className = 'flex flex-wrap items-center gap-1.5';

      if (bisaDibayar(t.status)) {
        const aBayar = document.createElement('a');
        aBayar.href = urlPembayaran(t);
        aBayar.className = 'rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-medium text-[var(--color-cream)] transition-colors hover:bg-[var(--color-primary-dark)]';
        aBayar.textContent = 'Bayar';
        aksiWrap.append(aBayar);
      }

      const btnDetail = document.createElement('button');
      btnDetail.type        = 'button';
      btnDetail.className   = 'rounded-lg border border-[var(--color-primary)]/30 bg-transparent px-3 py-1.5 text-xs font-medium text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)]/10';
      btnDetail.textContent = 'Detail';
      btnDetail.addEventListener('click', () => bukaDetail(t));

      const btnPdf = document.createElement('button');
      btnPdf.type        = 'button';
      btnPdf.className   = 'rounded-lg border border-[var(--color-primary)]/30 bg-transparent px-3 py-1.5 text-xs font-medium text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)]/10 disabled:opacity-50';
      btnPdf.textContent = 'PDF';
      btnPdf.addEventListener('click', () => unduhPdf(t, btnPdf));

      aksiWrap.append(btnDetail, btnPdf);
      tdAksi.append(aksiWrap);
      tr.append(tdAksi);

      tbody.append(tr);
    });

    $('tabel-riwayat').classList.remove('hidden');
  } catch (err) {
    $('skeleton-bulan-ini').classList.add('hidden');
    $('skeleton-riwayat').classList.add('hidden');
    tampilPesan('error', err.message);
  }
}

// ── Unduh PDF Tagihan ─────────────────────────────────────────────────────────
async function unduhPdf(tagihan, btn) {
  const id = getIdTagihan(tagihan);
  if (!id) return;
  const labelAwal = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Membuat...';
  tampilPesan('', '');

  try {
    const hasil = await generateTagihanPdf(id);
    if (hasil.type === 'blob') {
      const url = URL.createObjectURL(hasil.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tagihan-${tagihan['nomor-tagihan'] ?? id}.pdf`;
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      tampilPesan('ok', 'PDF tagihan berhasil diunduh.');
    } else if (hasil.url && /^https?:\/\//.test(hasil.url)) {
      window.open(hasil.url, '_blank', 'noopener,noreferrer');
      tampilPesan('ok', 'PDF tagihan dibuka di tab baru.');
    } else {
      tampilPesan('ok', 'PDF tagihan berhasil dibuat.');
    }
  } catch (err) {
    tampilPesan('error', err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = labelAwal;
  }
}

// ── Dialog Detail Tagihan ─────────────────────────────────────────────────────
function bukaDetail(t) {
  const body = $('detail-body');
  body.replaceChildren();

  const rows = [
    ['Nomor Tagihan', t['nomor-tagihan'] ?? '-'],
    ['Periode',       t['bulan-tagihan'] ?? '-'],
    ['Jumlah',        formatRupiahTagihan(t['jumlah-tagihan'])],
    ['Jatuh Tempo',   formatTanggal(t['tanggal-jatuh-tempo'])],
    ['Metode',        t['metode-pembayaran'] ?? '-'],
    ['Catatan Admin', t['catatan-admin'] ?? '-'],
  ];

  const dl = document.createElement('dl');
  dl.className = 'space-y-3 text-sm';

  rows.forEach(([label, value]) => {
    const wrap = document.createElement('div');
    wrap.className = 'flex justify-between gap-4';
    const dt = document.createElement('dt');
    dt.className   = 'shrink-0 text-[var(--color-muted)]';
    dt.textContent = label;
    const dd = document.createElement('dd');
    dd.className   = 'text-right font-medium break-all';
    dd.textContent = value;
    wrap.append(dt, dd);
    dl.append(wrap);
  });

  const wrapStatus = document.createElement('div');
  wrapStatus.className = 'mt-3 flex items-center justify-between gap-4 border-t border-[var(--color-primary)]/10 pt-3';
  const dtStatus = document.createElement('dt');
  dtStatus.className   = 'text-sm text-[var(--color-muted)]';
  dtStatus.textContent = 'Status';
  wrapStatus.append(dtStatus, statusBadge(t.status));
  dl.append(wrapStatus);
  body.append(dl);

  const buktiUrl = urlAman(t['bukti-pembayaran']);
  if (buktiUrl) {
    const buktiWrap = document.createElement('div');
    buktiWrap.className = 'mt-4 border-t border-[var(--color-primary)]/10 pt-3';
    const lbl = document.createElement('p');
    lbl.className = 'mb-2 text-xs text-[var(--color-muted)]';
    lbl.textContent = 'Bukti Pembayaran';
    const a = document.createElement('a');
    a.href = buktiUrl;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    const img = document.createElement('img');
    img.src = buktiUrl;
    img.alt = 'Bukti pembayaran';
    img.className = 'max-h-52 w-full rounded-xl border border-black/10 object-contain';
    img.addEventListener('error', () => {
      img.remove();
      a.className = 'text-xs font-medium text-[var(--color-primary)] underline break-all';
      a.textContent = buktiUrl;
    });
    a.append(img);
    buktiWrap.append(lbl, a);
    body.append(buktiWrap);
  }

  const footer = $('detail-footer');
  footer.replaceChildren();

  const btnPdf = document.createElement('button');
  btnPdf.type = 'button';
  btnPdf.className = 'rounded-lg border border-[var(--color-primary)]/30 px-4 py-2 text-xs font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 disabled:opacity-50';
  btnPdf.textContent = 'Unduh PDF';
  btnPdf.addEventListener('click', () => unduhPdf(t, btnPdf));
  footer.append(btnPdf);

  if (bisaDibayar(t.status)) {
    const aBayar = document.createElement('a');
    aBayar.href = urlPembayaran(t);
    aBayar.className = 'rounded-lg bg-[var(--color-primary)] px-4 py-2 text-xs font-medium text-[var(--color-cream)] hover:bg-[var(--color-primary-dark)]';
    aBayar.textContent = 'Lanjut Bayar';
    footer.append(aBayar);
  }

  $('dlg-detail').showModal();
}
