import { mountPenghuniNav } from '../../components/penghuni-nav.js';
import { requireRole, logout } from '../../utils/auth-guard.js';
import { getSession, saveSession } from '../../utils/session.js';
import { formatRupiah, formatTanggal } from '../../utils/format.js';
import { $, urlAman, pasangDialog } from '../../utils/dom.js';
import { apiFetch } from '../../services/api.js';
import {
  getDashboardPenyewa,
  getTagihan,
  getPengumuman,
} from '../../services/penyewa-service.js';

const sesi = requireRole('penyewa');
if (sesi) init(sesi);

function init(sesi) {
  mountPenghuniNav({
    sidebarEl: $('sidebar'),
    bottomEl:  $('bottom-nav'),
    active:    'dashboard',
    onLogout:  logout,
  });

  $('logout-mobile').addEventListener('click', logout);
  pasangDialog($('dlg-pengumuman-dash'));

  updateSapaan(sesi.nama);

  muatDashboard();
  muatPengumuman();
}

function updateSapaan(nama) {
  const bersih = (nama ?? '').trim();
  $('nama-penyewa').textContent = bersih || '—';
  $('salam').textContent = bersih ? `Halo, ${bersih.split(' ')[0]}` : '';
}

// ── Format tanggal singkat (DD/MM/YYYY) ───────────────────────────────────────
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

function tambahBulan(date, bulan = 1) {
  const d = new Date(date.getTime());
  const hariAsli = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + Math.max(1, Number(bulan) || 1));
  const hariTerakhir = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(hariAsli, hariTerakhir));
  return d;
}

function hitungAkhirTagihanLunas(tagihan, hargaBulanan) {
  if (!tagihan) return null;
  const dasar = tagihan['tanggal-jatuh-tempo'] ?? tagihan['tanggal-mulai'] ?? tagihan['dibuat-pada'];
  if (!dasar) return null;
  const d = new Date(dasar);
  if (Number.isNaN(d.getTime())) return null;

  let bulan = Number(tagihan['durasi-bulan'] ?? tagihan['jumlah-bulan'] ?? 0);
  if (!bulan && Number(hargaBulanan) > 0 && Number(tagihan['jumlah-tagihan']) > 0) {
    const rasio = Number(tagihan['jumlah-tagihan']) / Number(hargaBulanan);
    if (Number.isInteger(rasio) && rasio >= 1 && rasio <= 24) bulan = rasio;
  }
  return tambahBulan(d, bulan || 1);
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

function waktuPeriodeTagihan(t) {
  const p = parsePeriodeBulan(t?.['bulan-tagihan']);
  if (p) {
    // Gunakan tanggal jatuh tempo jika bulan & tahunnya sama, atau akhir bulan tersebut
    if (t?.['tanggal-jatuh-tempo']) {
      const jt = new Date(t['tanggal-jatuh-tempo']);
      if (!Number.isNaN(jt.getTime())) return jt.getTime();
    }
    return new Date(p.year, p.month + 1, 0).getTime();
  }
  if (t?.['tanggal-jatuh-tempo']) {
    const jt = new Date(t['tanggal-jatuh-tempo']);
    if (!Number.isNaN(jt.getTime())) return jt.getTime();
  }
  if (t?.['dibuat-pada']) {
    const dp = new Date(t['dibuat-pada']);
    if (!Number.isNaN(dp.getTime())) return dp.getTime();
  }
  return 0;
}

const normalStatus = (s) => String(s ?? '').trim().toLowerCase().replace(/[\s_]+/g, '-');

function extractList(data, keys = ['tagihan', 'riwayat', 'kamar', 'daftar', 'items', 'data']) {
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

// ── Dashboard (Informasi Sewa + Ringkasan Tagihan) ────────────────────────────
async function muatDashboard() {
  const skeleton = $('info-sewa-skeleton');
  const infoEl   = $('info-sewa');
  const kosongEl = $('info-sewa-kosong');
  const errorEl  = $('dash-error');

  try {
    const [data, rawTagihan, rawKamarPublik] = await Promise.all([
      getDashboardPenyewa(),
      getTagihan().catch(() => []),
      apiFetch('/api/public/data-kamar', { auth: false }).catch(() => []),
    ]);

    skeleton.classList.add('hidden');

    // Urutkan tagihan berdasarkan periode paling jauh ke paling lama
    const tagihanList = [...extractList(rawTagihan)].sort(
      (a, b) => waktuPeriodeTagihan(b) - waktuPeriodeTagihan(a)
    );
    const kamarPublikList = extractList(rawKamarPublik);

    perbaruiKartuTagihan(tagihanList);

    const profil =
      data?.profil ??
      data?.pengguna ??
      data?.penyewa ??
      data?.user ??
      (data?.['nama-lengkap'] || data?.email ? data : {}) ??
      {};

    if (profil['nama-lengkap']) {
      updateSapaan(profil['nama-lengkap']);
      const s = getSession();
      if (s && s.nama !== profil['nama-lengkap']) {
        saveSession({ ...s, nama: profil['nama-lengkap'] });
      }
    }

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

    // Cari batas akhir masa sewa:
    // Prioritaskan tanggal berakhir paling jauh antara data sewa, (tanggal-mulai + durasi),
    // dan akhir periode dari tagihan terjauh yang sudah LUNAS (+ durasi bulan tagihan)
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

    const akhirDariTagihanLunas = hitungAkhirTagihanLunas(tagihanLunasTerjauh, harga);

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

    // Jika belum ada tagihan lunas tapi ada tagihan aktif, gunakan jatuh tempo tagihan aktif
    const tglBerakhir =
      kandidatAkhir[0]?.toISOString() ??
      tagihanTerbaru['tanggal-jatuh-tempo'] ??
      null;

    const fotoUrl = urlAman(
      kamarObj.foto ??
      sewaObj.foto ??
      kamarMatch.foto ??
      data?.foto
    );

    const adaDataSewa = Boolean(
      tipeKamar || nomorKamar || lantai || harga || tglBerakhir || tagihanList.length > 0
    );

    if (!adaDataSewa) {
      kosongEl.classList.remove('hidden');
      return;
    }

    // Render Foto Kamar
    const fotoWrap        = $('foto-kamar-wrap');
    const fotoImg         = $('foto-kamar');
    const fotoPlaceholder = $('foto-placeholder');

    if (nomorKamar) {
      $('foto-placeholder-label').textContent = `Kamar ${nomorKamar}`;
    }

    if (fotoUrl) {
      fotoImg.src = fotoUrl;
      fotoImg.onerror = () => {
        fotoWrap.classList.add('hidden');
        fotoPlaceholder.classList.replace('hidden', 'flex');
      };
      fotoWrap.classList.replace('hidden', 'block');
    } else {
      fotoPlaceholder.classList.replace('hidden', 'flex');
    }

    // Render Detail Kamar & Sewa
    $('sewa-tipe').textContent   = tipeKamar ?? 'Standard';
    $('sewa-lantai').textContent = lantai ? `${lantai}` : '-';
    $('sewa-nomor').textContent  = nomorKamar ?? '-';
    $('sewa-harga').textContent  = harga ? `${formatRupiah(harga)} / bulan` : '-';

    // Update kartu ringkasan Kamarku di bagian atas
    if (nomorKamar) {
      $('stat-kamar-judul').textContent = `Kamar ${nomorKamar}`;
      const subParts = [
        tipeKamar ? `Tipe ${tipeKamar}` : null,
        lantai ? `Lantai ${lantai}` : null,
      ].filter(Boolean);
      if (subParts.length > 0) {
        $('stat-kamar-sub').textContent = subParts.join(' • ');
      }
    }

    const berakhirFmt = formatTanggalSingkat(tglBerakhir);
    if (berakhirFmt) {
      $('sewa-periode').textContent = `s.d. ${berakhirFmt}`;
    } else if (tagihanLunasTerjauh?.['bulan-tagihan']) {
      $('sewa-periode').textContent = `s.d. ${tagihanLunasTerjauh['bulan-tagihan']}`;
    } else if (tagihanTerbaru['bulan-tagihan']) {
      $('sewa-periode').textContent = `s.d. ${tagihanTerbaru['bulan-tagihan']}`;
    } else {
      $('sewa-periode').textContent = 'Aktif';
    }

    // Status badge
    const statusEl  = $('sewa-status');
    const statusRaw = pickFirst(sewaObj.status, kamarObj.status, profil.status, 'Sedang Disewa');
    const statusKey = normalStatus(statusRaw);
    const statusMap = {
      terisi:          { label: 'Sedang Disewa', cls: 'inline-flex rounded-full bg-green-100 px-3 py-0.5 text-xs font-semibold text-green-800' },
      'sedang-disewa': { label: 'Sedang Disewa', cls: 'inline-flex rounded-full bg-green-100 px-3 py-0.5 text-xs font-semibold text-green-800' },
      aktif:           { label: 'Sedang Disewa', cls: 'inline-flex rounded-full bg-green-100 px-3 py-0.5 text-xs font-semibold text-green-800' },
      dipesan:         { label: 'Dipesan',       cls: 'inline-flex rounded-full bg-amber-100 px-3 py-0.5 text-xs font-semibold text-amber-800' },
    };
    const st = statusMap[statusKey] ?? {
      label: statusRaw,
      cls: 'inline-flex rounded-full bg-green-100 px-3 py-0.5 text-xs font-semibold text-green-800',
    };
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

// ── Ringkasan pada Kartu Tagihan di Dashboard ─────────────────────────────────
function perbaruiKartuTagihan(tagihanList) {
  if (!Array.isArray(tagihanList) || tagihanList.length === 0) return;

  const isBelumBayar = (t) =>
    ['belum-bayar', 'belum-lunas', 'menunggu-pembayaran', 'unpaid', 'pending', 'ditolak', 'terlambat'].includes(
      normalStatus(t.status)
    );

  const tagihanBulanIni = tagihanList.find((t) => cocokBulanIni(t['bulan-tagihan']));
  const tagihanBelumBayar = tagihanList.find(isBelumBayar);

  // Jika bulan ini belum bayar → tampilkan Tagihan Bulan Ini
  // Jika bulan ini sudah lunas tapi ada tagihan bulan berikutnya (mis. hasil pengajuan) → tampilkan Tagihan Bulan Berikutnya
  let aktif = null;
  let labelKartu = 'Tagihan Bulan Ini';

  if (tagihanBulanIni && isBelumBayar(tagihanBulanIni)) {
    aktif = tagihanBulanIni;
    labelKartu = 'Tagihan Bulan Ini';
  } else if (tagihanBelumBayar) {
    aktif = tagihanBelumBayar;
    labelKartu = cocokBulanIni(tagihanBelumBayar['bulan-tagihan'])
      ? 'Tagihan Bulan Ini'
      : 'Tagihan Bulan Berikutnya';
  } else if (tagihanBulanIni) {
    aktif = tagihanBulanIni;
    labelKartu = 'Tagihan Bulan Ini';
  } else {
    aktif = tagihanList[0];
    labelKartu = cocokBulanIni(aktif?.['bulan-tagihan'])
      ? 'Tagihan Bulan Ini'
      : 'Tagihan Bulan Berikutnya';
  }

  if (aktif) {
    $('stat-tagihan-label').textContent   = labelKartu;
    $('stat-tagihan-nominal').textContent = formatRupiah(aktif['jumlah-tagihan']);
    $('stat-tagihan-sub').textContent     = `Periode ${aktif['bulan-tagihan'] ?? '-'}`;

    const badge = $('stat-tagihan-badge');
    const st = normalStatus(aktif.status);
    if (st === 'lunas') {
      badge.textContent = 'Lunas';
      badge.className = 'rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-800';
    } else if (st.includes('menunggu')) {
      badge.textContent = 'Verifikasi';
      badge.className = 'rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800';
    } else {
      badge.textContent = 'Belum Bayar';
      badge.className = 'rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700';
    }
  }
}

// ── Pengumuman terbaru ────────────────────────────────────────────────────────
function bukaDetailPengumuman(item) {
  $('dlg-p-judul').textContent   = item.judul ?? 'Pengumuman';
  $('dlg-p-tanggal').textContent = formatTanggal(item['dibuat-pada']) || '-';

  const body = $('dlg-p-body');
  body.replaceChildren();

  const imgUrl = urlAman(item.gambar);
  if (imgUrl) {
    const img = document.createElement('img');
    img.src = imgUrl;
    img.alt = item.judul ?? 'Gambar pengumuman';
    img.className = 'max-h-56 w-full rounded-xl object-cover';
    img.addEventListener('error', () => img.remove());
    body.append(img);
  }

  const p = document.createElement('p');
  p.className = 'whitespace-pre-line text-sm text-[var(--color-ink)]';
  p.textContent = item.pesan ?? '-';
  body.append(p);

  $('dlg-pengumuman-dash').showModal();
}

async function muatPengumuman() {
  const listEl = $('list-pengumuman');

  try {
    const data = await getPengumuman('aktif');
    const list = Array.isArray(data) ? data : (Array.isArray(data?.pengumuman) ? data.pengumuman : []);

    listEl.replaceChildren();

    $('stat-pengumuman-jumlah').textContent = `${list.length} Pengumuman`;
    if (list[0]?.judul) {
      $('stat-pengumuman-sub').textContent = list[0].judul;
    }

    if (list.length === 0) {
      const kosong = document.createElement('p');
      kosong.className   = 'py-5 text-center text-sm text-[var(--color-muted)]';
      kosong.textContent = 'Belum ada pengumuman aktif.';
      listEl.append(kosong);
      return;
    }

    const urut = [...list]
      .sort((a, b) => new Date(b['dibuat-pada'] ?? 0) - new Date(a['dibuat-pada'] ?? 0))
      .slice(0, 4);

    urut.forEach((item) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'flex w-full items-start gap-3 py-3.5 text-left transition-colors hover:bg-[var(--color-cream)]/40 -mx-2 px-2 rounded-lg';
      btn.addEventListener('click', () => bukaDetailPengumuman(item));

      const icon = document.createElement('span');
      icon.className = 'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/15 text-[var(--color-primary)]';
      icon.setAttribute('aria-hidden', 'true');
      icon.innerHTML = '<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zm0 16a2 2 0 002-2H8a2 2 0 002 2z" /></svg>';

      const textWrap = document.createElement('div');
      textWrap.className = 'min-w-0 flex-1';

      const judul = document.createElement('p');
      judul.className   = 'truncate text-sm font-medium text-[var(--color-ink)]';
      judul.textContent = item.judul;

      const tanggal = document.createElement('p');
      tanggal.className = 'mt-0.5 text-xs text-[var(--color-muted)]';
      const d = new Date(item['dibuat-pada']);
      tanggal.textContent = Number.isNaN(d.getTime())
        ? '-'
        : new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(d);

      textWrap.append(judul, tanggal);
      btn.append(icon, textWrap);
      listEl.append(btn);
    });
  } catch {
    listEl.replaceChildren();
    const err = document.createElement('p');
    err.className   = 'py-4 text-center text-xs text-[var(--color-muted)]';
    err.textContent = 'Gagal memuat pengumuman.';
    listEl.append(err);
  }
}
