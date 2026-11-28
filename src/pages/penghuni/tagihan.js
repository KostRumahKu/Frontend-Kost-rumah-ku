import { mountPenghuniNav } from '../../components/penghuni-nav.js';
import { requireRole, logout } from '../../utils/auth-guard.js';
import { formatRupiah } from '../../utils/format.js';
import { $, tampilPesan, urlAman, pasangDialog } from '../../utils/dom.js';
import {
  getTagihan,
  mintaTagihan,
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

  $('btn-ajukan').addEventListener('click', (e) => ajukanTagihanBaru(e.currentTarget));
  $('btn-ajukan-kosong').addEventListener('click', (e) => ajukanTagihanBaru(e.currentTarget));

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
  return t?._id ?? t?.id ?? t?.['id-tagihan'] ?? '';
}

function urlPembayaran(t) {
  const id = getIdTagihan(t);
  return id ? `/penghuni/pembayaran?id=${encodeURIComponent(id)}` : '/penghuni/pembayaran';
}

function extractTagihanList(data) {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== 'object') return [];
  for (const key of ['tagihan', 'riwayat', 'daftar', 'items', 'data']) {
    if (Array.isArray(data[key])) return data[key];
  }
  if (data._id || data.id || data['bulan-tagihan']) return [data];
  return [];
}

const BULAN_MAP = {
  januari: 0, februari: 1, febuari: 1, maret: 2, april: 3, mei: 4, juni: 5,
  juli: 6, agustus: 7, september: 8, oktober: 9, november: 10, desember: 11,
};

function parsePeriodeBulan(str) {
  const clean = String(str ?? '').trim().toLowerCase();
  const m = clean.match(/([a-z]+)\s+(\d{4})/);
  if (m && BULAN_MAP[m[1]] !== undefined) {
    return { month: BULAN_MAP[m[1]], year: Number(m[2]) };
  }
  const iso = clean.match(/^(\d{4})-(\d{2})/);
  if (iso) {
    return { month: Number(iso[2]) - 1, year: Number(iso[1]) };
  }
  return null;
}

function cocokBulanIni(nilaiBulan) {
  const p = parsePeriodeBulan(nilaiBulan);
  if (!p) return false;
  const now = new Date();
  return p.month === now.getMonth() && p.year === now.getFullYear();
}

const normalStatus = (status) =>
  String(status ?? '').trim().toLowerCase().replace(/[\s_]+/g, '-');

const STATUS_MAP = {
  'lunas':               { label: 'Lunas',               pill: 'bg-green-100 text-green-700', box: 'border-green-300 bg-green-50 text-green-800' },
  'belum-bayar':         { label: 'Belum Bayar',         pill: 'bg-red-100 text-red-700',     box: 'border-[var(--color-primary)]/35 bg-[var(--color-cream)]/40 text-[var(--color-primary)]' },
  'belum-lunas':         { label: 'Belum Bayar',         pill: 'bg-red-100 text-red-700',     box: 'border-[var(--color-primary)]/35 bg-[var(--color-cream)]/40 text-[var(--color-primary)]' },
  'menunggu-pembayaran': { label: 'Belum Bayar',         pill: 'bg-red-100 text-red-700',     box: 'border-[var(--color-primary)]/35 bg-[var(--color-cream)]/40 text-[var(--color-primary)]' },
  'menunggu-konfirmasi': { label: 'Menunggu Konfirmasi', pill: 'bg-amber-100 text-amber-700', box: 'border-amber-300 bg-amber-50 text-amber-800' },
  'menunggu-verifikasi': { label: 'Menunggu Konfirmasi', pill: 'bg-amber-100 text-amber-700', box: 'border-amber-300 bg-amber-50 text-amber-800' },
  'menunggu':            { label: 'Menunggu Konfirmasi', pill: 'bg-amber-100 text-amber-700', box: 'border-amber-300 bg-amber-50 text-amber-800' },
  'ditolak':             { label: 'Ditolak',             pill: 'bg-red-100 text-red-700',     box: 'border-red-300 bg-red-50 text-red-700' },
  'terlambat':           { label: 'Terlambat',           pill: 'bg-red-100 text-red-700',     box: 'border-red-300 bg-red-50 text-red-700' },
};

const bisaDibayar = (status) => {
  const s = normalStatus(status);
  return ['belum-bayar', 'belum-lunas', 'menunggu-pembayaran', 'unpaid', 'pending', 'ditolak', 'terlambat'].includes(s);
};

const sudahLunas = (status) => {
  const s = normalStatus(status);
  return ['lunas', 'paid', 'terverifikasi'].includes(s);
};

const sedangMenunggu = (status) => {
  const s = normalStatus(status);
  return ['menunggu-konfirmasi', 'menunggu-verifikasi', 'menunggu'].includes(s);
};

function statusBadge(status) {
  const key = normalStatus(status);
  const s = STATUS_MAP[key] ?? { label: status ?? '-', pill: 'bg-stone-100 text-stone-600' };
  const el = document.createElement('span');
  el.className   = `inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${s.pill}`;
  el.textContent = s.label;
  return el;
}

function waktuUrut(t) {
  const p = parsePeriodeBulan(t?.['bulan-tagihan']);
  if (p) {
    if (t?.['tanggal-jatuh-tempo']) {
      const jt = new Date(t['tanggal-jatuh-tempo']);
      if (!Number.isNaN(jt.getTime())) return jt.getTime();
    }
    return new Date(p.year, p.month + 1, 0).getTime();
  }
  const raw = t?.['tanggal-jatuh-tempo'] ?? t?.['dibuat-pada'] ?? 0;
  const ts = new Date(raw).getTime();
  return Number.isNaN(ts) ? 0 : ts;
}

function tampilkanTombol(el, tampil) {
  el.classList.toggle('hidden', !tampil);
  el.classList.toggle('inline-flex', tampil);
}

async function muatTagihan() {
  try {
    const data = await getTagihan();
    const rawList = extractTagihanList(data);
    semuaTagihan = [...rawList].sort((a, b) => waktuUrut(b) - waktuUrut(a));

    $('skeleton-bulan-ini').classList.add('hidden');
    $('skeleton-riwayat').classList.add('hidden');

    const tagihanBulanIni = semuaTagihan.find((t) => cocokBulanIni(t['bulan-tagihan']));
    const tagihanBelumBayar = semuaTagihan.find((t) => bisaDibayar(t.status));
    const tagihanMenunggu = semuaTagihan.find((t) => sedangMenunggu(t.status));

    // Prioritas kartu atas:
    // 1. Jika tagihan bulan ini BELUM LUNAS (belum bayar / menunggu konfirmasi) → tampilkan Tagihan Bulan Ini
    // 2. Jika bulan ini sudah lunas tapi ada tagihan bulan berikutnya yang belum bayar / menunggu → tampilkan Tagihan Bulan Berikutnya (mis. Maret 2027)
    // 3. Jika semua sudah lunas → tampilkan Tagihan Bulan Ini (Lunas) + tombol Ajukan Tagihan
    let tagihanAktif = null;
    if (tagihanBulanIni && !sudahLunas(tagihanBulanIni.status)) {
      tagihanAktif = tagihanBulanIni;
    } else if (tagihanBelumBayar) {
      tagihanAktif = tagihanBelumBayar;
    } else if (tagihanMenunggu) {
      tagihanAktif = tagihanMenunggu;
    } else {
      tagihanAktif = tagihanBulanIni ?? semuaTagihan[0] ?? null;
    }

    $('konten-bulan-ini').classList.add('hidden');
    $('tidak-ada-tagihan').classList.add('hidden');

    if (tagihanAktif) {
      const key = normalStatus(tagihanAktif.status);
      const s = STATUS_MAP[key] ?? { label: tagihanAktif.status ?? '-', box: 'border-stone-300 bg-stone-50 text-stone-700' };
      const isBulanIni = cocokBulanIni(tagihanAktif['bulan-tagihan']);

      $('judul-tagihan-aktif').textContent = isBulanIni
        ? 'Tagihan Bulan Ini'
        : 'Tagihan Bulan Berikutnya';
      $('tagihan-jumlah').textContent      = formatRupiahTagihan(tagihanAktif['jumlah-tagihan']);
      $('tagihan-bulan').textContent       = `Periode : ${tagihanAktif['bulan-tagihan'] ?? '-'}`;
      $('tagihan-jatuh-tempo').textContent = `Jatuh Tempo : ${formatTanggal(tagihanAktif['tanggal-jatuh-tempo'])}`;

      const badge = $('tagihan-status-badge');
      badge.textContent = s.label;
      badge.className   = `mt-1.5 inline-flex min-w-[11rem] items-center justify-center rounded-lg border px-5 py-2 text-sm font-semibold ${s.box}`;

      const btnBayar  = $('btn-bayar');
      const btnAjukan = $('btn-ajukan');

      if (bisaDibayar(tagihanAktif.status)) {
        $('btn-bayar-label').textContent = 'Bayar';
        btnBayar.href = urlPembayaran(tagihanAktif);
        tampilkanTombol(btnBayar, true);
        tampilkanTombol(btnAjukan, false);
      } else if (sudahLunas(tagihanAktif.status)) {
        // Semua tagihan saat ini sudah lunas → tampilkan tombol Ajukan Tagihan untuk bulan berikutnya
        tampilkanTombol(btnBayar, false);
        tampilkanTombol(btnAjukan, true);
      } else {
        // Sedang menunggu konfirmasi admin
        tampilkanTombol(btnBayar, false);
        tampilkanTombol(btnAjukan, false);
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
      btnPdf.addEventListener('click', () => unduhPdf(t, btnPdf, false));

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

// ── Trigger Ajukan Tagihan (generate tagihan bulan depan langsung di tabel) ──
async function ajukanTagihanBaru(btn) {
  tampilPesan('', '');
  const labelNode = btn.querySelector('#btn-ajukan-label') ?? btn;
  const labelAwal = labelNode.textContent;
  btn.disabled = true;
  labelNode.textContent = 'Mengajukan...';

  try {
    await mintaTagihan();
    tampilPesan('ok', 'Tagihan bulan berikutnya berhasil dibuat! Silakan klik tombol Bayar pada tagihan baru di riwayat.');
    await muatTagihan();
  } catch (err) {
    tampilPesan('error', err.message);
  } finally {
    btn.disabled = false;
    labelNode.textContent = labelAwal;
  }
}

// ── Pesan di dalam modal detail ───────────────────────────────────────────────
function setDetailMsg(type, msg) {
  const el = $('detail-msg');
  if (!msg) {
    el.textContent = '';
    el.classList.add('hidden');
    return;
  }
  el.textContent = msg;
  el.className = type === 'ok'
    ? 'mt-3 rounded-lg bg-green-50 px-3.5 py-2.5 text-xs text-green-800'
    : 'mt-3 rounded-lg bg-red-50 px-3.5 py-2.5 text-xs text-red-800';
}

// ── Unduh PDF Tagihan ─────────────────────────────────────────────────────────
async function unduhPdf(tagihan, btn, inDialog = false) {
  const id = getIdTagihan(tagihan);
  if (!id) {
    const msg = 'ID tagihan tidak ditemukan.';
    inDialog ? setDetailMsg('error', msg) : tampilPesan('error', msg);
    return;
  }

  const labelAwal = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Mengunduh...';
  if (inDialog) setDetailMsg('', '');
  else tampilPesan('', '');

  try {
    const hasil = await generateTagihanPdf(id);
    const namaFile = `tagihan-${tagihan['nomor-tagihan'] ?? id}.pdf`;

    if (hasil.type === 'blob') {
      const blobUrl = URL.createObjectURL(hasil.blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = namaFile;
      a.style.display = 'none';
      const parent = inDialog ? $('dlg-detail') : document.body;
      parent.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      const okMsg = 'PDF tagihan berhasil diunduh.';
      inDialog ? setDetailMsg('ok', okMsg) : tampilPesan('ok', okMsg);
    } else if (hasil.type === 'url' && hasil.url) {
      const a = document.createElement('a');
      a.href = hasil.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.download = namaFile;
      a.style.display = 'none';
      const parent = inDialog ? $('dlg-detail') : document.body;
      parent.append(a);
      a.click();
      a.remove();
      const okMsg = 'PDF tagihan berhasil dibuka/diunduh.';
      inDialog ? setDetailMsg('ok', okMsg) : tampilPesan('ok', okMsg);
    }
  } catch (err) {
    inDialog ? setDetailMsg('error', err.message) : tampilPesan('error', err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = labelAwal;
  }
}

// ── Dialog Detail Tagihan ─────────────────────────────────────────────────────
function bukaDetail(t) {
  setDetailMsg('', '');
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
  btnPdf.addEventListener('click', () => unduhPdf(t, btnPdf, true));
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
