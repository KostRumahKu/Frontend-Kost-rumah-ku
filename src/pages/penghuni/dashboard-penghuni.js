import { mountPenghuniNav } from '../../components/penghuni-nav.js';
import { requireRole, logout } from '../../utils/auth-guard.js';
import { formatRupiah } from '../../utils/format.js';
import { getDashboardPenyewa, getPengumuman } from '../../services/penyewa-service.js';

const sesi = requireRole('penyewa');
if (sesi) init(sesi);

function init(sesi) {
  mountPenghuniNav({
    sidebarEl: document.getElementById('sidebar'),
    bottomEl:  document.getElementById('bottom-nav'),
    active:    'dashboard',
    onLogout:  logout,
  });

  document.getElementById('logout-mobile').addEventListener('click', logout);

  // Sapa penyewa
  const namaEl = document.getElementById('nama-penyewa');
  namaEl.textContent = sesi.nama ?? '—';

  const salamEl = document.getElementById('salam');
  salamEl.textContent = sesi.nama ? `Halo, ${sesi.nama.split(' ')[0]}` : '';

  muatDashboard();
  muatPengumuman();
}

// ── Format tanggal singkat (DD/MM/YYYY) ───────────────────────────────────────
function formatTanggalSingkat(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
}

// ── Dashboard (info sewa) ─────────────────────────────────────────────────────
async function muatDashboard() {
  const skeleton  = document.getElementById('info-sewa-skeleton');
  const infoEl    = document.getElementById('info-sewa');
  const kosongEl  = document.getElementById('info-sewa-kosong');
  const errorEl   = document.getElementById('dash-error');

  try {
    const data = await getDashboardPenyewa();
    skeleton.classList.add('hidden');

    const kamar  = data?.kamar;
    const sewa   = data?.sewa;

    if (!kamar && !sewa) {
      kosongEl.classList.remove('hidden');
      return;
    }

    // Foto kamar
    const fotoWrap  = document.getElementById('foto-kamar-wrap');
    const fotoImg   = document.getElementById('foto-kamar');
    const fotoPlaceholder = document.getElementById('foto-placeholder');
    const fotoUrl   = Array.isArray(kamar?.foto)
      ? kamar.foto.find((f) => /^https?:\/\//.test(f))
      : null;

    if (fotoUrl) {
      fotoImg.src = fotoUrl;
      fotoImg.addEventListener('error', () => {
        fotoWrap.classList.add('hidden');
        fotoPlaceholder.classList.replace('hidden', 'flex');
      });
      fotoWrap.classList.replace('hidden', 'block');
    } else {
      fotoPlaceholder.classList.replace('hidden', 'flex');
    }

    // Info kamar
    document.getElementById('sewa-tipe').textContent    = kamar?.['tipe-kamar'] ?? '-';
    document.getElementById('sewa-lantai').textContent  = kamar?.lantai ? `Lantai ${kamar.lantai}` : '-';
    document.getElementById('sewa-nomor').textContent   = kamar?.['nama-kamar'] ?? '-';
    document.getElementById('sewa-harga').textContent   = kamar?.harga ? `${formatRupiah(kamar.harga)} / bulan` : '-';

    // Periode sewa
    const mulai   = formatTanggalSingkat(sewa?.['tanggal-mulai']);
    const berakhir = formatTanggalSingkat(sewa?.['tanggal-berakhir']);
    document.getElementById('sewa-periode').textContent = `${mulai} – ${berakhir}`;

    // Status badge
    const statusEl  = document.getElementById('sewa-status');
    const statusTeks = sewa?.status ?? kamar?.status ?? '-';
    const statusMap  = {
      terisi:        { label: 'Sedang disewa',    cls: 'inline-flex rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800' },
      'sedang-disewa': { label: 'Sedang disewa',  cls: 'inline-flex rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800' },
      aktif:         { label: 'Aktif',            cls: 'inline-flex rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800' },
      dipesan:       { label: 'Dipesan',          cls: 'inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800' },
    };
    const st = statusMap[statusTeks.toLowerCase()] ?? { label: statusTeks, cls: 'inline-flex rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-700' };
    const badge = document.createElement('span');
    badge.className   = st.cls;
    badge.textContent = st.label;
    statusEl.replaceChildren(badge);

    infoEl.classList.remove('hidden');
  } catch (err) {
    skeleton.classList.add('hidden');
    errorEl.textContent = err.message;
    errorEl.classList.remove('hidden');
  }
}

// ── Pengumuman terbaru ────────────────────────────────────────────────────────
async function muatPengumuman() {
  const listEl = document.getElementById('list-pengumuman');

  try {
    const data = await getPengumuman('aktif');
    const list = Array.isArray(data) ? data : [];

    listEl.replaceChildren();

    if (list.length === 0) {
      const kosong = document.createElement('p');
      kosong.className   = 'py-5 text-center text-sm text-[var(--color-muted)]';
      kosong.textContent = 'Belum ada pengumuman aktif.';
      listEl.append(kosong);
      return;
    }

    // Tampilkan maks 4 pengumuman terbaru
    const urut = [...list]
      .sort((a, b) => new Date(b['dibuat-pada']) - new Date(a['dibuat-pada']))
      .slice(0, 4);

    urut.forEach((item) => {
      const wrap = document.createElement('div');
      wrap.className = 'flex items-start gap-3 py-3.5';

      const icon = document.createElement('span');
      icon.className = 'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)]/15 text-[var(--color-accent)]';
      icon.setAttribute('aria-hidden', 'true');
      icon.innerHTML = '<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zm0 16a2 2 0 002-2H8a2 2 0 002 2z" /></svg>';

      const textWrap = document.createElement('div');
      textWrap.className = 'min-w-0 flex-1';

      const judul = document.createElement('p');
      judul.className   = 'truncate text-sm font-medium text-[var(--color-ink)]';
      judul.textContent = item.judul;

      const tanggal = document.createElement('p');
      tanggal.className   = 'mt-0.5 text-xs text-[var(--color-muted)]';
      tanggal.textContent = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(item['dibuat-pada']));

      textWrap.append(judul, tanggal);
      wrap.append(icon, textWrap);
      listEl.append(wrap);
    });
  } catch {
    listEl.replaceChildren();
    const err = document.createElement('p');
    err.className   = 'py-4 text-center text-xs text-[var(--color-muted)]';
    err.textContent = 'Gagal memuat pengumuman.';
    listEl.append(err);
  }
}
