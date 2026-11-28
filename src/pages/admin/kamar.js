// Logic for pages/admin/kamar.html
import { mountAdminNav } from '../../components/admin-nav.js';
import { Button, hydrateButtons } from '../../components/button.js';
import { AdminRoomCard, statusInfo, firstPhoto } from '../../components/admin-room-card.js';
import { requireRole, logout } from '../../utils/auth-guard.js';
import { formatRupiah } from '../../utils/format.js';
import {
  getDaftarKamar,
  getDetailKamar,
  tambahKamar,
  ubahKamar,
  hapusKamar,
  resetKamar,
  inputPenghuniManual,
  entryDataLama,
  pindahKamar,
} from '../../services/admin-service.js';

/* ---------- Helper ---------- */
const $ = (id) => document.getElementById(id);

function el(tag, className = '', text = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function setMessage(node, message) {
  node.textContent = message;
  node.classList.toggle('hidden', !message);
}

function tampilPesan(jenis, teks) {
  setMessage($('page-success'), jenis === 'ok' ? teks : '');
  setMessage($('page-error'), jenis === 'error' ? teks : '');
}

const formatTanggalSaja = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '-' : new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(d);
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^[0-9+\s-]{8,16}$/;

/* ---------- State ---------- */
let kamarAktif = null;
let modeForm = 'add'; // 'add' | 'edit'

const dlgForm    = $('dlg-form');
const dlgDetail  = $('dlg-detail');
const dlgPenghuni = $('dlg-penghuni');
const dlgPindah  = $('dlg-pindah');

/* ---------- Daftar kamar ---------- */
function renderKamar(list) {
  const wadah = $('daftar');
  wadah.replaceChildren();
  $('jumlah').textContent = `${list.length} kamar`;

  if (list.length === 0) {
    wadah.append(el('p', 'text-sm text-[var(--color-muted)]', 'Tidak ada kamar yang cocok dengan filter ini.'));
    return;
  }
  wadah.append(...list.map((room) => AdminRoomCard(room, bukaDetail)));
}

async function muatKamar() {
  const params = { diarsipkan: $('filter-arsip').checked ? 'true' : 'false' };
  if ($('filter-status').value) params.status = $('filter-status').value;
  if ($('filter-lantai').value) params.lantai = $('filter-lantai').value;

  try {
    const data = await getDaftarKamar(params);
    renderKamar(Array.isArray(data) ? data : []);
  } catch (err) {
    $('daftar').replaceChildren();
    $('jumlah').textContent = '';
    tampilPesan('error', err.message);
  }
}

/* ---------- Detail kamar ---------- */
async function bukaDetail(id) {
  tampilPesan('', '');
  try {
    kamarAktif = await getDetailKamar(id);
  } catch (err) {
    tampilPesan('error', err.message);
    return;
  }
  renderDetail(kamarAktif);
  dlgDetail.showModal();
}

function renderDetail(room) {
  const status = statusInfo(room.status);
  const penghuni = room['penghuni-aktif'];
  const riwayat = Array.isArray(room['riwayat-sewa']) ? room['riwayat-sewa'] : [];

  $('dlg-detail-title').textContent = `Kamar ${room['nama-kamar']}`;
  setMessage($('detail-error'), '');

  const body = $('detail-body');
  const aksi = $('detail-actions');
  body.replaceChildren();
  aksi.replaceChildren();

  // ── Foto ────────────────────────────────────────────────────────────────────
  const foto = firstPhoto(room);
  if (foto) {
    const img = el('img', 'mb-4 h-44 w-full rounded-xl object-cover');
    img.src = foto;
    img.alt = `Foto kamar ${room['nama-kamar']}`;
    img.addEventListener('error', () => img.remove());
    body.append(img);
  }

  // ── Info kamar ───────────────────────────────────────────────────────────────
  const infoKamar = el('div', 'rounded-xl bg-[var(--color-cream)] p-4');
  const dl = el('dl', 'grid grid-cols-3 gap-x-3 gap-y-3 text-sm');
  const addRow = (label, value) => {
    const dd = el('dd', 'col-span-2 font-medium text-[var(--color-ink)]');
    if (value instanceof Node) dd.append(value);
    else dd.textContent = value;
    dl.append(el('dt', 'text-[var(--color-muted)] self-center', label), dd);
  };

  addRow('Status', el('span', `rounded-full px-3 py-1 text-xs font-medium ${status.cls}`, status.label));
  addRow('Tipe', room['tipe-kamar'] ?? '-');
  addRow('Lantai', String(room.lantai ?? '-'));
  addRow('Harga', `${formatRupiah(room.harga ?? 0)} / bulan`);
  addRow('Fasilitas', (room.fasilitas ?? []).length ? room.fasilitas.join(', ') : '-');
  infoKamar.append(dl);
  body.append(infoKamar);

  // ── Info penghuni ────────────────────────────────────────────────────────────
  const judulPenghuni = el('p', 'mt-4 mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]', 'Penghuni aktif');
  body.append(judulPenghuni);

  if (penghuni) {
    const infoPenghuni = el('div', 'rounded-xl bg-[var(--color-accent)]/10 p-4');
    const dp = el('dl', 'grid grid-cols-3 gap-x-3 gap-y-3 text-sm');
    const add = (label, value) => dp.append(
      el('dt', 'text-[var(--color-muted)] self-center', label),
      el('dd', 'col-span-2 font-medium text-[var(--color-ink)]', value || '-')
    );
    add('Nama',    penghuni['nama-lengkap']);
    add('Email',   penghuni.email);
    add('Telepon', penghuni['nomor-telepon']);
    add('Periode', `${formatTanggalSaja(penghuni['tanggal-mulai'])} s.d. ${formatTanggalSaja(penghuni['tanggal-berakhir'])}`);
    infoPenghuni.append(dp);
    body.append(infoPenghuni);
  } else {
    body.append(el('p', 'rounded-xl bg-[var(--color-cream)] px-4 py-3 text-sm text-[var(--color-muted)]', 'Belum ada penghuni aktif.'));
  }

  // ── Riwayat ──────────────────────────────────────────────────────────────────
  const riwayatEl = el('p', 'mt-3 text-xs text-[var(--color-muted)]', `Riwayat sewa: ${riwayat.length} catatan`);
  body.append(riwayatEl);

  if (room.diarsipkan) {
    aksi.append(el('p', 'text-sm text-[var(--color-muted)]', 'Kamar ini sudah diarsipkan, jadi tidak bisa diubah.'));
    return;
  }

  // ── Garis pemisah ────────────────────────────────────────────────────────────
  aksi.className = 'mt-5 border-t border-[var(--color-primary)]/10 pt-5 flex flex-wrap gap-2';

  aksi.append(Button({ label: 'Ubah',              variant: 'outline', onClick: () => bukaFormUbah(room) }));
  aksi.append(
    penghuni
      ? Button({ label: 'Pindahkan penghuni', variant: 'outline', onClick: () => bukaPindah(room) })
      : Button({ label: 'Tambah penghuni',    variant: 'outline', onClick: () => bukaPenghuni(room) })
  );
  aksi.append(Button({ label: 'Reset kamar', variant: 'outline', onClick: () => aksiReset(room) }));
  // Tombol hapus dipisah ke kanan
  const hapusBtn = Button({ label: 'Hapus', variant: 'danger', onClick: () => aksiHapus(room), className: 'ml-auto' });
  aksi.append(hapusBtn);
}

async function jalankanAksi(fn, pesanSukses) {
  const tombol = [...$('detail-actions').querySelectorAll('button')];
  setMessage($('detail-error'), '');
  tombol.forEach((b) => (b.disabled = true));
  try {
    await fn();
    dlgDetail.close();
    tampilPesan('ok', pesanSukses);
    await muatKamar();
  } catch (err) {
    setMessage($('detail-error'), err.message);
    tombol.forEach((b) => (b.disabled = false));
  }
}

function aksiReset(room) {
  if (!window.confirm(`Kamar ${room['nama-kamar']} akan dikosongkan dan riwayat penghuninya diarsipkan. Lanjutkan?`)) return;
  jalankanAksi(() => resetKamar(room._id), `Kamar ${room['nama-kamar']} berhasil direset menjadi kosong.`);
}

function aksiHapus(room) {
  if (!window.confirm(`Hapus kamar ${room['nama-kamar']}? Tindakan ini tidak bisa dibatalkan.`)) return;
  jalankanAksi(() => hapusKamar(room._id), `Kamar ${room['nama-kamar']} berhasil dihapus.`);
}

/* ---------- Form tambah / ubah kamar ---------- */
function aturModeForm(mode) {
  modeForm = mode;
  document.querySelectorAll('#form-kamar [data-only]').forEach((n) =>
    n.classList.toggle('hidden', n.dataset.only !== mode)
  );
  document.querySelectorAll('#form-kamar [aria-invalid]').forEach((n) => n.removeAttribute('aria-invalid'));
  setMessage($('form-error'), '');
}

function bukaFormTambah() {
  tampilPesan('', '');
  $('form-kamar').reset();
  aturModeForm('add');
  $('dlg-form-title').textContent = 'Tambah kamar';
  $('f-submit').textContent = 'Simpan kamar';
  dlgForm.showModal();
}

function bukaFormUbah(room) {
  dlgDetail.close();
  $('form-kamar').reset();
  aturModeForm('edit');
  $('dlg-form-title').textContent = `Ubah kamar ${room['nama-kamar']}`;
  $('f-submit').textContent = 'Simpan perubahan';
  $('f-info').textContent = `Tipe ${room['tipe-kamar'] ?? '-'}, lantai ${room.lantai ?? '-'}, ${formatRupiah(room.harga ?? 0)} / bulan. Data ini tidak bisa diubah dari sini.`;
  $('f-nama').value  = room['nama-kamar'] ?? '';
  $('f-status').value = room.status ?? '';
  $('f-foto').value  = (room.foto ?? []).join('\n');
  $('f-fasilitas').value = (room.fasilitas ?? []).join('\n');
  dlgForm.showModal();
}

function tandaiInvalid(input, message) {
  input.setAttribute('aria-invalid', 'true');
  setMessage($('form-error'), message);
  input.focus();
}

$('form-kamar').addEventListener('submit', async (e) => {
  e.preventDefault();
  setMessage($('form-error'), '');
  document.querySelectorAll('#form-kamar [aria-invalid]').forEach((n) => n.removeAttribute('aria-invalid'));

  const foto   = $('f-foto').value.split('\n').map((s) => s.trim()).filter(Boolean);
  const fasilitas = $('f-fasilitas').value.split('\n').map((s) => s.trim()).filter(Boolean);
  const status = $('f-status').value;
  let aksi, pesanSukses;

  if (modeForm === 'add') {
    const tipe  = $('f-tipe').value.trim();
    const lantai = Number($('f-lantai').value);
    const harga  = Number($('f-harga').value);

    if (!tipe)                                          return tandaiInvalid($('f-tipe'),   'Tipe kamar wajib dipilih.');
    if (!Number.isInteger(lantai) || lantai < 1 || lantai > 2) return tandaiInvalid($('f-lantai'), 'Lantai harus berupa angka 1 atau 2.');
    if (!(harga > 0))                                   return tandaiInvalid($('f-harga'),  'Harga harus lebih dari 0.');

    const data = { lantai, harga, 'tipe-kamar': tipe, foto, fasilitas };
    if (status) data.status = status;
    aksi = () => tambahKamar(data);
    pesanSukses = 'Kamar baru berhasil ditambahkan.';
  } else {
    const nama = $('f-nama').value.trim();
    if (!nama) return tandaiInvalid($('f-nama'), 'Nama kamar tidak boleh kosong.');

    const data = { 'nama-kamar': nama, foto, fasilitas };
    if (status) data.status = status;
    aksi = () => ubahKamar(kamarAktif._id, data);
    pesanSukses = 'Data kamar berhasil diperbarui.';
  }

  const submit = $('f-submit');
  const label  = submit.textContent;
  submit.disabled = true;
  submit.textContent = 'Menyimpan...';
  try {
    await aksi();
    dlgForm.close();
    tampilPesan('ok', pesanSukses);
    await muatKamar();
  } catch (err) {
    setMessage($('form-error'), err.message);
  } finally {
    submit.disabled = false;
    submit.textContent = label;
  }
});

/* ---------- Tambah penghuni ---------- */
const MODE_NOTE = {
  manual: 'Untuk penghuni baru. Tagihan pertama dibuat otomatis dan dilunasi sesuai metode pembayaran.',
  lama:   'Untuk penghuni yang sudah lebih dulu tinggal. Tanggal mulai boleh tanggal lampau.',
};

function bukaPenghuni(room) {
  dlgDetail.close();
  $('form-penghuni').reset();
  document.querySelectorAll('#form-penghuni [aria-invalid]').forEach((n) => n.removeAttribute('aria-invalid'));
  setMessage($('penghuni-error'), '');
  $('mode-note').textContent = MODE_NOTE.manual;
  $('dlg-penghuni-title').textContent = `Tambah penghuni, kamar ${room['nama-kamar']}`;
  dlgPenghuni.showModal();
}

document.querySelectorAll('#form-penghuni input[name="mode"]').forEach((radio) =>
  radio.addEventListener('change', () => { $('mode-note').textContent = MODE_NOTE[radio.value]; })
);

$('form-penghuni').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = $('penghuni-error');
  setMessage(errorEl, '');
  document.querySelectorAll('#form-penghuni [aria-invalid]').forEach((n) => n.removeAttribute('aria-invalid'));

  const f = {
    nama:        $('p-nama'),
    email:       $('p-email'),
    telp:        $('p-telp'),
    daruratNama: $('p-darurat-nama'),
    daruratTelp: $('p-darurat-telp'),
    durasi:      $('p-durasi'),
    mulai:       $('p-mulai'),
  };
  const gagal = (input, message) => {
    input.setAttribute('aria-invalid', 'true');
    setMessage(errorEl, message);
    input.focus();
  };

  const durasi = Number(f.durasi.value);
  if (!f.nama.value.trim())                        return gagal(f.nama,        'Nama lengkap wajib diisi.');
  if (!emailRegex.test(f.email.value.trim()))      return gagal(f.email,       'Format email tidak valid.');
  if (!phoneRegex.test(f.telp.value.trim()))       return gagal(f.telp,        'Nomor telepon tidak valid.');
  if (!f.daruratNama.value.trim())                 return gagal(f.daruratNama, 'Nama kontak darurat wajib diisi.');
  if (!phoneRegex.test(f.daruratTelp.value.trim())) return gagal(f.daruratTelp, 'Nomor kontak darurat tidak valid.');
  if (!Number.isInteger(durasi) || durasi < 1)     return gagal(f.durasi,      'Durasi harus berupa angka bulat minimal 1.');
  if (!f.mulai.value)                              return gagal(f.mulai,       'Tanggal mulai wajib diisi.');

  const data = {
    dataPengguna: {
      'nama-lengkap':         f.nama.value.trim(),
      email:                  f.email.value.trim(),
      'nomor-telepon':        f.telp.value.trim(),
      'nama-kontak-darurat':  f.daruratNama.value.trim(),
      'nomor-kontak-darurat': f.daruratTelp.value.trim(),
    },
    dataSewa: {
      'durasi-bulan':       durasi,
      'tanggal-mulai':      `${f.mulai.value}T00:00:00.000Z`,
      'metode-pembayaran':  $('p-metode').value,
    },
  };

  const mode = document.querySelector('#form-penghuni input[name="mode"]:checked').value;
  const kirim = mode === 'lama' ? entryDataLama : inputPenghuniManual;

  const submit = $('p-submit');
  submit.disabled = true;
  submit.textContent = 'Menyimpan...';
  try {
    const hasil = await kirim(kamarAktif._id, data);
    dlgPenghuni.close();
    const tagihan = hasil?.nomorInvoice
      ? ` Tagihan ${hasil.nomorInvoice} sebesar ${formatRupiah(hasil.totalHarga ?? 0)} dibuat otomatis.`
      : '';
    tampilPesan('ok', `Penghuni berhasil ditambahkan ke kamar ${kamarAktif['nama-kamar']}.${tagihan}`);
    await muatKamar();
  } catch (err) {
    setMessage(errorEl, err.message);
  } finally {
    submit.disabled = false;
    submit.textContent = 'Simpan penghuni';
  }
});

/* ---------- Pindah kamar ---------- */
async function bukaPindah(room) {
  const penghuni = room['penghuni-aktif'];
  const select   = $('pindah-tujuan');
  const submit   = $('pindah-submit');
  const errorEl  = $('pindah-error');

  dlgDetail.close();
  setMessage(errorEl, '');
  select.replaceChildren();
  submit.disabled = true;
  $('dlg-pindah-title').textContent = `Pindahkan penghuni, kamar ${room['nama-kamar']}`;
  $('pindah-info').textContent = `Penghuni: ${penghuni?.['nama-lengkap'] ?? '-'}. Tagihan bulan berikutnya akan menyesuaikan harga kamar baru.`;
  dlgPindah.showModal();

  try {
    const kosong = await getDaftarKamar({ status: 'kosong', diarsipkan: 'false' });
    const tujuan = (Array.isArray(kosong) ? kosong : []).filter((k) => k._id !== room._id);

    if (tujuan.length === 0) {
      setMessage(errorEl, 'Tidak ada kamar kosong sebagai tujuan.');
      return;
    }
    tujuan.forEach((k) => {
      const opt = document.createElement('option');
      opt.value = k._id;
      opt.textContent = `Kamar ${k['nama-kamar']} (${k['tipe-kamar']}, lantai ${k.lantai}, ${formatRupiah(k.harga ?? 0)})`;
      select.append(opt);
    });
    submit.disabled = false;
  } catch (err) {
    setMessage(errorEl, err.message);
  }
}

$('form-pindah').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl  = $('pindah-error');
  const penghuni = kamarAktif?.['penghuni-aktif'];
  const tujuan   = $('pindah-tujuan').value; // string _id MongoDB
  setMessage(errorEl, '');

  if (!penghuni?._id || !tujuan) {
    setMessage(errorEl, 'Data penghuni atau kamar tujuan tidak lengkap.');
    return;
  }

  const submit = $('pindah-submit');
  submit.disabled = true;
  submit.textContent = 'Memindahkan...';
  try {
    const hasil = await pindahKamar(penghuni._id, tujuan);
    dlgPindah.close();
    tampilPesan('ok', hasil?.catatan_keuangan ?? 'Penghuni berhasil dipindahkan.');
    await muatKamar();
  } catch (err) {
    setMessage(errorEl, err.message);
  } finally {
    submit.disabled = false;
    submit.textContent = 'Pindahkan';
  }
});

/* ---------- Dialog umum ---------- */
document.querySelectorAll('dialog').forEach((dlg) => {
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  dlg.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => dlg.close()));
});

/* ---------- Init ---------- */
function init() {
  mountAdminNav({
    sidebarEl: $('sidebar'),
    bottomEl:  $('bottom-nav'),
    active:    'kamar',
    onLogout:  logout,
  });
  $('logout-mobile').addEventListener('click', logout);
  $('btn-tambah').addEventListener('click', bukaFormTambah);

  // Terapkan class tombol dari komponen button ke semua [data-btn] di halaman
  hydrateButtons(document);

  // Pilihan lantai 1-2
  const lantai = $('filter-lantai');
  for (let i = 1; i <= 2; i += 1) {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = `Lantai ${i}`;
    lantai.append(opt);
  }
  ['filter-status', 'filter-lantai', 'filter-arsip'].forEach((id) =>
    $(id).addEventListener('change', muatKamar)
  );

  muatKamar();
}

if (requireRole('admin')) init();
