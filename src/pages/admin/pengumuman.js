// Logic for pages/admin/pengumuman.html
import { mountAdminNav } from '../../components/admin-nav.js';
import { requireRole, logout } from '../../utils/auth-guard.js';
import { getRiwayatPengumuman, buatPengumuman } from '../../services/admin-service.js';
import { formatTanggal } from '../../utils/format.js';

function setMessage(el, message) {
  el.textContent = message;
  el.classList.toggle('hidden', !message);
}

function buildCard(item) {
  const card = document.createElement('article');
  card.className = 'rounded-xl bg-[var(--color-surface)] p-5 shadow-sm';

  const title = document.createElement('h3');
  title.className = 'font-[family-name:var(--font-heading)] text-lg font-semibold';
  title.textContent = item.judul;

  const date = document.createElement('p');
  date.className = 'mt-0.5 text-xs text-[var(--color-muted)]';
  date.textContent = formatTanggal(item['dibuat-pada']);

  const body = document.createElement('p');
  body.className = 'mt-3 whitespace-pre-line text-sm';
  body.textContent = item.pesan;

  card.append(title, date, body);

  // Hanya link http(s) yang ditampilkan sebagai gambar
  if (typeof item.gambar === 'string' && /^https?:\/\//.test(item.gambar)) {
    const img = document.createElement('img');
    img.src = item.gambar;
    img.alt = `Gambar pengumuman: ${item.judul}`;
    img.loading = 'lazy';
    img.className = 'mt-3 max-h-56 w-full rounded-lg object-cover';
    img.addEventListener('error', () => img.remove());
    card.append(img);
  }
  return card;
}

function renderRiwayat(list) {
  const wadah = document.getElementById('riwayat');
  wadah.replaceChildren();

  if (list.length === 0) {
    const kosong = document.createElement('p');
    kosong.className = 'text-sm text-[var(--color-muted)]';
    kosong.textContent = 'Belum ada pengumuman.';
    wadah.append(kosong);
    return;
  }

  // Terbaru di atas
  const urut = [...list].sort((a, b) => new Date(b['dibuat-pada']) - new Date(a['dibuat-pada']));
  wadah.append(...urut.map(buildCard));
}

async function muatRiwayat() {
  const errorEl = document.getElementById('riwayat-error');
  setMessage(errorEl, '');
  try {
    renderRiwayat(await getRiwayatPengumuman());
  } catch (err) {
    setMessage(errorEl, err.message);
    document.getElementById('riwayat').replaceChildren();
  }
}

function pasangForm() {
  const form = document.getElementById('form-pengumuman');
  const judulInput = document.getElementById('judul');
  const pesanInput = document.getElementById('pesan');
  const gambarInput = document.getElementById('gambar');
  const errorEl = document.getElementById('form-error');
  const successEl = document.getElementById('form-success');
  const submitBtn = document.getElementById('submit-btn');

  const inputs = [judulInput, pesanInput, gambarInput];
  inputs.forEach((el) =>
    el.addEventListener('input', () => el.removeAttribute('aria-invalid'))
  );

  const tandai = (el) => el.setAttribute('aria-invalid', 'true');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    setMessage(errorEl, '');
    setMessage(successEl, '');
    inputs.forEach((el) => el.removeAttribute('aria-invalid'));

    const judul = judulInput.value.trim();
    const pesan = pesanInput.value.trim();
    const gambar = gambarInput.value.trim();

    if (!judul) {
      tandai(judulInput);
      setMessage(errorEl, 'Judul wajib diisi.');
      judulInput.focus();
      return;
    }
    if (!pesan) {
      tandai(pesanInput);
      setMessage(errorEl, 'Pesan wajib diisi.');
      pesanInput.focus();
      return;
    }
    if (gambar && !/^https?:\/\/\S+$/.test(gambar)) {
      tandai(gambarInput);
      setMessage(errorEl, 'Link gambar harus diawali http:// atau https://.');
      gambarInput.focus();
      return;
    }

    // Email tidak bisa ditarik setelah terkirim, jadi minta konfirmasi dulu
    if (!window.confirm('Pengumuman akan dikirim ke email semua penyewa aktif dan tidak bisa ditarik kembali. Lanjutkan?')) {
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Mengirim...';
    try {
      await buatPengumuman({ judul, pesan, gambar });
      form.reset();
      setMessage(successEl, 'Pengumuman berhasil dibuat dan sedang dikirim ke email penyewa aktif.');
      await muatRiwayat();
    } catch (err) {
      setMessage(errorEl, err.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Kirim pengumuman';
    }
  });
}

function init() {
  mountAdminNav({
    sidebarEl: document.getElementById('sidebar'),
    bottomEl: document.getElementById('bottom-nav'),
    active: 'pengumuman',
    onLogout: logout,
  });
  document.getElementById('logout-mobile').addEventListener('click', logout);

  pasangForm();
  muatRiwayat();
}

if (requireRole('admin')) init();