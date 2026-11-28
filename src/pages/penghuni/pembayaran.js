import { mountPenghuniNav } from '../../components/penghuni-nav.js';
import { requireRole, logout } from '../../utils/auth-guard.js';
import { $, tampilPesan, urlAman, formatTanggalSaja } from '../../utils/dom.js';
import {
  getTagihan,
  kirimPembayaran,
  getDaftarRekening,
} from '../../services/penyewa-service.js';

const sesi = requireRole('penyewa');
if (sesi) init();

let tagihanBelumLunas = [];
let rekeningList = [];

const getIdTagihan = (t) => t?._id ?? t?.id ?? t?.['id-tagihan'] ?? '';

const normalStatus = (status) =>
  String(status ?? '').trim().toLowerCase().replace(/[\s_]+/g, '-');

const bisaDibayar = (status) => {
  const s = normalStatus(status);
  return ['belum-bayar', 'belum-lunas', 'menunggu-pembayaran', 'unpaid', 'pending', 'ditolak', 'terlambat'].includes(s);
};

function extractTagihanList(data) {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== 'object') return [];
  for (const key of ['tagihan', 'riwayat', 'daftar', 'items', 'data']) {
    if (Array.isArray(data[key])) return data[key];
  }
  if (data._id || data.id || data['bulan-tagihan']) return [data];
  return [];
}

function formatRupiah2(angka) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(angka ?? 0));
}

function init() {
  mountPenghuniNav({
    sidebarEl: $('sidebar'),
    bottomEl:  $('bottom-nav'),
    active:    'tagihan',
    onLogout:  logout,
  });
  $('logout-mobile').addEventListener('click', logout);

  const q = new URLSearchParams(window.location.search);
  const prefBulan = Number(q.get('bulan'));
  if (Number.isInteger(prefBulan) && prefBulan >= 1 && prefBulan <= 24) {
    $('jumlah-bulan').value = String(prefBulan);
  }

  $('pilih-tagihan').addEventListener('change', perbaruiRingkasan);
  $('jumlah-bulan').addEventListener('input', perbaruiRingkasan);

  document.querySelectorAll('[data-quick-bulan]').forEach((btn) => {
    btn.addEventListener('click', () => {
      $('jumlah-bulan').value = btn.dataset.quickBulan;
      perbaruiRingkasan();
    });
  });

  $('bukti-url').addEventListener('input', () => {
    const url = urlAman($('bukti-url').value.trim());
    if (url) {
      $('preview-img').src = url;
      $('preview-wrap').classList.remove('hidden');
    } else {
      $('preview-wrap').classList.add('hidden');
    }
  });

  $('form-pembayaran').addEventListener('submit', submitPembayaran);

  muatData();
}

function tagihanTerpilih() {
  const id = $('pilih-tagihan').value;
  return tagihanBelumLunas.find((t) => getIdTagihan(t) === id) ?? tagihanBelumLunas[0] ?? null;
}

function perbaruiRingkasan() {
  const t = tagihanTerpilih();
  if (!t) return;

  const bulan = Math.max(1, Math.min(24, Number($('jumlah-bulan').value) || 1));
  const perBulan = Number(t['jumlah-tagihan'] ?? 0);

  $('sum-nomor').textContent    = t['nomor-tagihan'] ?? getIdTagihan(t) ?? '-';
  $('sum-periode').textContent  = t['bulan-tagihan'] ?? '-';
  $('sum-tempo').textContent    = formatTanggalSaja(t['tanggal-jatuh-tempo']);
  $('sum-perbulan').textContent = formatRupiah2(perBulan);
  $('sum-total').textContent    = formatRupiah2(perBulan * bulan);
}

async function muatData() {
  const prefId = new URLSearchParams(window.location.search).get('id') ?? '';

  try {
    const [dataTagihan, dataRekening] = await Promise.all([
      getTagihan(),
      getDaftarRekening().catch(() => []),
    ]);

    const rawList = extractTagihanList(dataTagihan);
    tagihanBelumLunas = rawList.filter((t) => bisaDibayar(t.status));
    rekeningList = Array.isArray(dataRekening)
      ? dataRekening
      : (Array.isArray(dataRekening?.rekening) ? dataRekening.rekening : []);

    $('pay-skeleton').classList.add('hidden');

    if (tagihanBelumLunas.length === 0) {
      $('pay-konten').classList.add('hidden');
      $('pay-kosong').classList.remove('hidden');
      return;
    }

    $('pay-kosong').classList.add('hidden');

    const select = $('pilih-tagihan');
    select.disabled = false;
    select.replaceChildren(
      ...tagihanBelumLunas.map((t) => {
        const label = `${t['bulan-tagihan'] ?? 'Tagihan'} — ${formatRupiah2(t['jumlah-tagihan'])}`;
        return new Option(label, getIdTagihan(t));
      })
    );

    if (prefId && tagihanBelumLunas.some((t) => getIdTagihan(t) === prefId)) {
      select.value = prefId;
    }

    perbaruiRingkasan();
    renderRekening();
    $('pay-konten').classList.remove('hidden');
  } catch (err) {
    $('pay-skeleton').classList.add('hidden');
    tampilPesan('error', err.message);
  }
}

function renderRekening() {
  const wrap = $('daftar-rekening');
  if (rekeningList.length === 0) {
    wrap.replaceChildren();
    const p = document.createElement('p');
    p.className = 'text-xs text-[var(--color-muted)]';
    p.textContent = 'Belum ada rekening pembayaran yang terdaftar.';
    wrap.append(p);
    return;
  }

  wrap.replaceChildren(...rekeningList.map((r, i) => {
    const idRek = r._id ?? r.id ?? '';
    const label = document.createElement('label');
    label.className = 'flex cursor-pointer flex-col gap-2 rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-cream)]/40 p-4 transition-colors has-[:checked]:border-[var(--color-primary)] has-[:checked]:bg-[var(--color-cream)]';

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
    btnSalin.className = 'shrink-0 rounded-md border border-[var(--color-primary)]/25 bg-white px-2.5 py-1 text-[11px] font-medium text-[var(--color-primary)] hover:bg-[var(--color-cream)]';
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
      img.className = 'mt-1 max-h-44 self-center rounded-lg border border-black/10 bg-white p-1 object-contain';
      img.addEventListener('error', () => img.remove());
      label.append(img);
    }

    return label;
  }));
}

async function submitPembayaran(e) {
  e.preventDefault();
  tampilPesan('', '');

  const idTagihan = getIdTagihan(tagihanTerpilih());
  const jumlahBulanNum = Number($('jumlah-bulan').value);
  const idRekening = document.querySelector('input[name="id-rekening"]:checked')?.value ?? '';
  const buktiUrl = $('bukti-url').value.trim();

  if (!idTagihan) {
    tampilPesan('error', 'Tagihan dasar belum dipilih.');
    return;
  }
  if (!Number.isInteger(jumlahBulanNum) || jumlahBulanNum < 1 || jumlahBulanNum > 24) {
    tampilPesan('error', 'Jumlah bulan harus berupa angka antara 1 sampai 24.');
    return;
  }
  if (!idRekening) {
    tampilPesan('error', 'Pilih rekening tujuan pembayaran terlebih dahulu.');
    return;
  }
  if (!urlAman(buktiUrl)) {
    tampilPesan('error', 'URL bukti pembayaran harus diawali http:// atau https://.');
    return;
  }

  const btn = $('btn-submit-bayar');
  btn.disabled = true;
  btn.textContent = 'Mengirim pembayaran...';

  try {
    await kirimPembayaran({
      'id-tagihan-Dasar': idTagihan,
      'jumlah-bulan': String(jumlahBulanNum),
      'bukti-pembayaran': buktiUrl,
      'id-rekening': idRekening,
    });
    tampilPesan('ok', 'Bukti pembayaran berhasil dikirim! Menunggu konfirmasi dari admin.');
    setTimeout(() => window.location.assign('/penghuni/tagihan'), 1200);
  } catch (err) {
    tampilPesan('error', err.message);
    btn.disabled = false;
    btn.textContent = 'Kirim Bukti Pembayaran';
  }
}
