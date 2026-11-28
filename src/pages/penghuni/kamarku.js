import { mountPenghuniNav } from '../../components/penghuni-nav.js';
import { requireRole, logout } from '../../utils/auth-guard.js';
import { formatRupiah } from '../../utils/format.js';
import { $, tampilPesan, urlAman, formatTanggalSaja } from '../../utils/dom.js';
import { apiFetch } from '../../services/api.js';
import {
  getDashboardPenyewa,
  getTagihan,
  getPengajuan,
  buatPengajuan,
  batalkanPengajuan,
} from '../../services/penyewa-service.js';

const sesi = requireRole('penyewa');
if (sesi) init();

function init() {
  mountPenghuniNav({
    sidebarEl: $('sidebar'),
    bottomEl:  $('bottom-nav'),
    active:    'kamarku',
    onLogout:  logout,
  });
  $('logout-mobile').addEventListener('click', logout);

  const todayIso = new Date().toISOString().slice(0, 10);
  $('p-tanggal').min = todayIso;
  $('p-tanggal').value = todayIso;

  $('form-pengajuan').addEventListener('submit', kirimPengajuan);

  muatKamar();
  muatPengajuan();
}

function formatTanggalSingkat(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
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

function waktuPeriodeTagihan(t) {
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

const normalStatus = (s) => String(s ?? '').trim().toLowerCase().replace(/[\s_]+/g, '-');

function extractList(data, keys = ['pengajuan', 'tagihan', 'riwayat', 'kamar', 'daftar', 'items', 'data']) {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== 'object') return [];
  for (const k of keys) {
    if (Array.isArray(data[k])) return data[k];
  }
  return [];
}

function pickFirst(...vals) {
  for (const v of vals) {
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return null;
}

async function muatKamar() {
  try {
    const [data, rawTagihan, rawKamarPublik] = await Promise.all([
      getDashboardPenyewa(),
      getTagihan().catch(() => []),
      apiFetch('/api/public/data-kamar', { auth: false }).catch(() => []),
    ]);

    $('kamar-skeleton').classList.add('hidden');

    const tagihanList = [...extractList(rawTagihan)].sort(
      (a, b) => waktuPeriodeTagihan(b) - waktuPeriodeTagihan(a)
    );
    const kamarPublikList = extractList(rawKamarPublik);

    const profil =
      data?.profil ??
      data?.pengguna ??
      data?.penyewa ??
      data?.user ??
      (data?.['nama-lengkap'] || data?.email ? data : {}) ??
      {};

    const kamarObj =
      data?.kamar ??
      data?.['info-kamar'] ??
      data?.['detail-kamar'] ??
      data?.['data-kamar'] ??
      data?.['informasi-kamar'] ??
      {};

    const sewaObj =
      data?.sewa ??
      data?.['info-sewa'] ??
      data?.['informasi-sewa'] ??
      data?.['detail-sewa'] ??
      data?.['data-sewa'] ??
      data?.kontrak ??
      {};

    const tagihanTerbaru = tagihanList[0] ?? {};
    const idKamarRaw = pickFirst(
      kamarObj['id-kamar'],
      kamarObj._id,
      kamarObj.id,
      sewaObj['id-kamar'],
      profil['id-kamar'],
      data?.['id-kamar'],
      tagihanTerbaru['id-kamar'],
      kamarObj['nama-kamar'],
      kamarObj['nomor-kamar'],
      sewaObj['nama-kamar'],
      profil['nama-kamar'],
      tagihanTerbaru['nama-kamar'],
    );

    const idStr = idKamarRaw !== null ? String(idKamarRaw).trim().toLowerCase() : '';
    const emailUser = String(profil.email ?? '').trim().toLowerCase();
    const idUser = String(profil._id ?? profil.id ?? '').trim();

    const kamarMatch = kamarPublikList.find((r) => {
      if (!r || typeof r !== 'object') return false;
      const kandidatIds = [r._id, r.id, r['id-kamar'], r['nama-kamar'], r['nomor-kamar']]
        .filter((x) => x !== undefined && x !== null)
        .map((x) => String(x).trim().toLowerCase());
      if (idStr && kandidatIds.includes(idStr)) return true;

      const penghuni = r['penghuni-aktif'];
      if (penghuni && typeof penghuni === 'object') {
        if (idUser && String(penghuni._id ?? penghuni.id ?? '') === idUser) return true;
        if (emailUser && String(penghuni.email ?? '').toLowerCase() === emailUser) return true;
      }
      return false;
    }) ?? {};

    const penghuniAktifKamar = kamarObj['penghuni-aktif'] ?? kamarMatch['penghuni-aktif'] ?? {};

    const tipeKamar = pickFirst(
      kamarObj['tipe-kamar'],
      kamarObj.tipe,
      sewaObj['tipe-kamar'],
      kamarMatch['tipe-kamar'],
      kamarMatch.tipe,
      profil['tipe-kamar'],
      data?.['tipe-kamar'],
    );

    const nomorKamar = pickFirst(
      kamarObj['nama-kamar'],
      kamarObj['nomor-kamar'],
      kamarObj.nomor,
      sewaObj['nama-kamar'],
      sewaObj['nomor-kamar'],
      kamarMatch['nama-kamar'],
      kamarMatch['nomor-kamar'],
      profil['nama-kamar'],
      data?.['nama-kamar'],
      idKamarRaw,
    );

    let lantai = pickFirst(
      kamarObj.lantai,
      kamarObj['lantai-kamar'],
      sewaObj.lantai,
      kamarMatch.lantai,
      profil.lantai,
      data?.lantai,
    );
    if (!lantai && nomorKamar && /^\d{4}$/.test(String(nomorKamar))) {
      lantai = String(nomorKamar).charAt(0);
    }

    const harga = pickFirst(
      kamarObj.harga,
      kamarObj['harga-sewa'],
      sewaObj.harga,
      sewaObj['harga-sewa'],
      kamarMatch.harga,
      profil.harga,
      data?.harga,
      tagihanTerbaru['jumlah-tagihan'],
    );

    const tambahBulan = (date, bulan = 1) => {
      const d = new Date(date.getTime());
      const hariAsli = d.getDate();
      d.setDate(1);
      d.setMonth(d.getMonth() + Math.max(1, Number(bulan) || 1));
      const hariTerakhir = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      d.setDate(Math.min(hariAsli, hariTerakhir));
      return d;
    };

    const tagihanLunasTerjauh = tagihanList.find((t) =>
      ['lunas', 'paid', 'terverifikasi'].includes(normalStatus(t.status))
    );

    const tglMulaiSewa = pickFirst(
      sewaObj['tanggal-mulai'],
      sewaObj['mulai-sewa'],
      penghuniAktifKamar['tanggal-mulai'],
      profil['tanggal-mulai'],
      data?.['tanggal-mulai'],
    );
    const durasiSewa = Number(pickFirst(
      sewaObj['durasi-bulan'],
      penghuniAktifKamar['durasi-bulan'],
      profil['durasi-bulan'],
      data?.['durasi-bulan'],
      0,
    ));
    const akhirDariMulai =
      tglMulaiSewa && durasiSewa > 0 && !Number.isNaN(new Date(tglMulaiSewa).getTime())
        ? tambahBulan(new Date(tglMulaiSewa), durasiSewa)
        : null;

    let akhirDariTagihanLunas = null;
    if (tagihanLunasTerjauh) {
      const dasar = tagihanLunasTerjauh['tanggal-jatuh-tempo'] ?? tagihanLunasTerjauh['tanggal-mulai'] ?? tagihanLunasTerjauh['dibuat-pada'];
      const d = dasar ? new Date(dasar) : null;
      if (d && !Number.isNaN(d.getTime())) {
        let bulan = Number(tagihanLunasTerjauh['durasi-bulan'] ?? tagihanLunasTerjauh['jumlah-bulan'] ?? 0);
        if (!bulan && Number(harga) > 0 && Number(tagihanLunasTerjauh['jumlah-tagihan']) > 0) {
          const rasio = Number(tagihanLunasTerjauh['jumlah-tagihan']) / Number(harga);
          if (Number.isInteger(rasio) && rasio >= 1 && rasio <= 24) bulan = rasio;
        }
        akhirDariTagihanLunas = tambahBulan(d, bulan || 1);
      }
    }

    const kandidatAkhir = [
      sewaObj['tanggal-berakhir'],
      sewaObj['tanggal-habis'],
      sewaObj['tanggal-selesai'],
      sewaObj['akhir-sewa'],
      sewaObj['selesai-sewa'],
      sewaObj.tanggalBerakhir,
      kamarObj['tanggal-berakhir'],
      penghuniAktifKamar['tanggal-berakhir'],
      penghuniAktifKamar['tanggal-habis'],
      profil['tanggal-berakhir'],
      data?.['tanggal-berakhir'],
      data?.['tanggal-habis'],
      akhirDariMulai,
      akhirDariTagihanLunas,
    ]
      .filter(Boolean)
      .map((val) => (val instanceof Date ? val : new Date(val)))
      .filter((d) => !Number.isNaN(d.getTime()))
      .sort((a, b) => b.getTime() - a.getTime());

    const tglBerakhir =
      kandidatAkhir[0]?.toISOString() ??
      tagihanTerbaru['tanggal-jatuh-tempo'] ??
      null;

    const rawFotos =
      (Array.isArray(kamarObj.foto) && kamarObj.foto.length ? kamarObj.foto : null) ??
      (Array.isArray(kamarMatch.foto) && kamarMatch.foto.length ? kamarMatch.foto : null) ??
      [kamarObj.foto, sewaObj.foto, kamarMatch.foto, data?.foto];
    const fotos = (Array.isArray(rawFotos) ? rawFotos : [rawFotos])
      .filter((f) => typeof f === 'string' && /^https?:\/\//.test(f));

    const adaData = Boolean(
      tipeKamar || nomorKamar || lantai || harga || tglBerakhir || tagihanList.length > 0
    );

    if (!adaData) {
      $('kamar-kosong').classList.remove('hidden');
      return;
    }

    if (nomorKamar) {
      $('kamar-placeholder-label').textContent = `Kamar ${nomorKamar}`;
    }

    const fotoWrap = $('kamar-foto-wrap');
    const fotoImg  = $('kamar-foto');
    const fotoPh   = $('kamar-foto-placeholder');

    if (fotos.length > 0) {
      fotoImg.src = fotos[0];
      fotoImg.onerror = () => {
        fotoWrap.classList.add('hidden');
        fotoPh.classList.replace('hidden', 'flex');
      };
      fotoWrap.classList.remove('hidden');

      if (fotos.length > 1) {
        const thumbs = $('kamar-galeri-thumbs');
        thumbs.replaceChildren(...fotos.slice(0, 4).map((url) => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'h-12 overflow-hidden rounded-lg border border-[var(--color-primary)]/20 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]';
          const img = document.createElement('img');
          img.src = url;
          img.alt = 'Thumbnail kamar';
          img.className = 'h-full w-full object-cover';
          btn.append(img);
          btn.addEventListener('click', () => { fotoImg.src = url; });
          return btn;
        }));
        thumbs.classList.replace('hidden', 'grid');
      }
    } else {
      fotoPh.classList.replace('hidden', 'flex');
    }

    $('k-judul-besar').textContent = nomorKamar ? `Kamar ${nomorKamar}` : 'Kamar Kost';
    $('k-nomor').textContent       = nomorKamar ?? '-';
    $('k-tipe').textContent        = tipeKamar ?? 'Standard';
    $('k-lantai').textContent      = lantai ? `Lantai ${lantai}` : '-';
    $('k-harga').textContent       = harga ? `${formatRupiah(harga)} / bulan` : '-';

    const berakhirFmt = formatTanggalSingkat(tglBerakhir);
    if (berakhirFmt) {
      $('k-periode').textContent = `s.d. ${berakhirFmt}`;
    } else if (tagihanLunasTerjauh?.['bulan-tagihan']) {
      $('k-periode').textContent = `s.d. ${tagihanLunasTerjauh['bulan-tagihan']}`;
    } else {
      $('k-periode').textContent = 'Aktif';
    }

    // Status badge
    const badge = $('k-status-badge');
    badge.textContent = 'Sedang Disewa';
    badge.className = 'rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800';

    // Fasilitas kamar
    const fasList =
      (Array.isArray(kamarObj.fasilitas) && kamarObj.fasilitas.length ? kamarObj.fasilitas : null) ??
      (Array.isArray(kamarMatch.fasilitas) && kamarMatch.fasilitas.length ? kamarMatch.fasilitas : null) ??
      ['Kasur', 'Lemari Pakaian', 'Meja & Kursi', 'Wi-Fi Kost', 'Kamar Mandi Bersih'];

    const fasWrap = $('k-fasilitas');
    fasWrap.replaceChildren(...fasList.map((f) => {
      const chip = document.createElement('span');
      chip.className = 'inline-flex items-center gap-1.5 rounded-full border border-[var(--color-primary)]/15 bg-[var(--color-cream)]/70 px-3.5 py-1 text-xs font-medium text-[var(--color-primary)]';
      chip.textContent = f;
      return chip;
    }));

    $('kamar-konten').classList.remove('hidden');
  } catch (err) {
    $('kamar-skeleton').classList.add('hidden');
    tampilPesan('error', err.message);
  }
}

// ── Pengajuan Pindah Kamar / Berhenti Sewa ────────────────────────────────────
const STATUS_PENGAJUAN = {
  'menunggu-konfirmasi': { label: 'Menunggu Konfirmasi', cls: 'bg-amber-100 text-amber-800' },
  menunggu:              { label: 'Menunggu Konfirmasi', cls: 'bg-amber-100 text-amber-800' },
  disetujui:             { label: 'Disetujui',           cls: 'bg-green-100 text-green-800' },
  selesai:               { label: 'Selesai',             cls: 'bg-green-100 text-green-800' },
  ditolak:               { label: 'Ditolak',             cls: 'bg-red-100 text-red-700' },
  dibatalkan:            { label: 'Dibatalkan',          cls: 'bg-stone-200 text-stone-700' },
};

const LABEL_JENIS = {
  'pindah-kamar':  'Pindah Kamar',
  'berhenti-sewa': 'Berhenti Sewa',
};

async function muatPengajuan() {
  const skeleton = $('pengajuan-skeleton');
  const listEl   = $('pengajuan-list');
  const kosongEl = $('pengajuan-kosong');

  try {
    const data = await getPengajuan();
    const list = extractList(data, ['pengajuan', 'riwayat', 'daftar', 'items', 'data']);
    skeleton.classList.add('hidden');

    if (list.length === 0) {
      listEl.classList.add('hidden');
      kosongEl.classList.remove('hidden');
      return;
    }

    kosongEl.classList.add('hidden');
    const urut = [...list].sort(
      (a, b) => new Date(b['dibuat-pada'] ?? b['tanggal-target'] ?? 0) - new Date(a['dibuat-pada'] ?? a['tanggal-target'] ?? 0)
    );

    listEl.replaceChildren(...urut.map((p) => {
      const card = document.createElement('article');
      card.className = 'rounded-xl border border-[var(--color-primary)]/15 bg-[var(--color-cream)]/45 p-4';

      const top = document.createElement('div');
      top.className = 'flex flex-wrap items-center justify-between gap-2';

      const jenisKey = normalStatus(p['jenis-pengajuan']);
      const title = document.createElement('h3');
      title.className = 'text-sm font-semibold text-[var(--color-ink)]';
      title.textContent = LABEL_JENIS[jenisKey] ?? (p['jenis-pengajuan'] ?? 'Pengajuan');

      const stKey = normalStatus(p.status);
      const st = STATUS_PENGAJUAN[stKey] ?? { label: p.status ?? '-', cls: 'bg-stone-200 text-stone-700' };
      const badge = document.createElement('span');
      badge.className = `rounded-full px-2.5 py-0.5 text-xs font-medium ${st.cls}`;
      badge.textContent = st.label;

      top.append(title, badge);

      const tgl = document.createElement('p');
      tgl.className = 'mt-1 text-xs text-[var(--color-muted)]';
      tgl.textContent = `Target: ${formatTanggalSaja(p['tanggal-target'])}`;

      const alasan = document.createElement('p');
      alasan.className = 'mt-2 text-sm text-[var(--color-ink)]';
      alasan.textContent = p.alasan ?? '-';

      card.append(top, tgl, alasan);

      if (p['catatan-admin'] && p['catatan-admin'] !== '-') {
        const catatan = document.createElement('p');
        catatan.className = 'mt-2.5 rounded-lg bg-white/80 px-3 py-2 text-xs text-[var(--color-muted)]';
        catatan.textContent = `Catatan admin: ${p['catatan-admin']}`;
        card.append(catatan);
      }

      if (stKey === 'menunggu-konfirmasi' || stKey === 'menunggu') {
        const aksi = document.createElement('div');
        aksi.className = 'mt-3 flex justify-end border-t border-[var(--color-primary)]/10 pt-3';
        const btnBatal = document.createElement('button');
        btnBatal.type = 'button';
        btnBatal.className = 'rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-60';
        btnBatal.textContent = 'Batalkan Pengajuan';
        btnBatal.addEventListener('click', () => aksiBatalkan(p._id ?? p.id, btnBatal));
        aksi.append(btnBatal);
        card.append(aksi);
      }

      return card;
    }));

    listEl.classList.remove('hidden');
  } catch (err) {
    skeleton.classList.add('hidden');
    kosongEl.classList.remove('hidden');
    if (err?.message) {
      kosongEl.querySelector('p').textContent = 'Belum ada riwayat pengajuan';
    }
  }
}

async function kirimPengajuan(e) {
  e.preventDefault();
  tampilPesan('', '');
  const formErr = $('pengajuan-form-error');
  formErr.classList.add('hidden');

  const jenis   = $('p-jenis').value;
  const tanggal = $('p-tanggal').value;
  const alasan  = $('p-alasan').value.trim();

  if (!jenis || !tanggal || !alasan) {
    formErr.textContent = 'Harap lengkapi jenis pengajuan, tanggal target, dan alasan.';
    formErr.classList.remove('hidden');
    return;
  }

  const btn = $('btn-kirim-pengajuan');
  btn.disabled = true;
  btn.textContent = 'Mengirim...';

  try {
    await buatPengajuan({
      'jenis-pengajuan': jenis,
      'tanggal-target': tanggal,
      alasan,
    });
    $('p-alasan').value = '';
    tampilPesan('ok', 'Pengajuan berhasil dikirim! Menunggu konfirmasi dari admin.');
    await muatPengajuan();
  } catch (err) {
    formErr.textContent = err.message;
    formErr.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Kirim Pengajuan';
  }
}

async function aksiBatalkan(id, btn) {
  if (!id || !window.confirm('Batalkan pengajuan ini?')) return;
  tampilPesan('', '');
  btn.disabled = true;
  btn.textContent = 'Membatalkan...';

  try {
    await batalkanPengajuan(id);
    tampilPesan('ok', 'Pengajuan berhasil dibatalkan.');
    await muatPengajuan();
  } catch (err) {
    tampilPesan('error', err.message);
    btn.disabled = false;
    btn.textContent = 'Batalkan Pengajuan';
  }
}
