// Logic for pages/admin/profile.html: data akun admin dan ganti password
import { mountAdminNav } from '../../components/admin-nav.js';
import { buttonClass } from '../../components/button.js';
import { DaftarInfo } from '../../components/dialog.js';
import { requireRole, logout } from '../../utils/auth-guard.js';
import { getSession, saveSession } from '../../utils/session.js';
import { $, el, setMessage, phoneRegex, formatTanggalSaja, KELAS_INPUT } from '../../utils/dom.js';
import { getProfilAdmin, ubahProfilAdmin } from '../../services/admin-service.js';

const PERAN = { admin: 'Admin', pemilik: 'Pemilik' };

/** Bangun satu baris field + label. Mengembalikan { wrap, input }. */
function buatField({ id, label, type = 'text', autocomplete = 'off', hint = '' }) {
  const wrap = el('div');
  const l = el('label', 'mb-1.5 block text-sm font-medium', label);
  l.htmlFor = id;
  const input = el('input', KELAS_INPUT);
  input.id = id; input.type = type; input.autocomplete = autocomplete;
  input.addEventListener('input', () => input.removeAttribute('aria-invalid'));
  wrap.append(l, input);
  if (hint) wrap.append(el('p', 'mt-1 text-xs text-[var(--color-muted)]', hint));
  return { wrap, input };
}

function tombolKirim(teks) {
  const b = el('button', buttonClass('primary'), teks);
  b.type = 'submit';
  const baris = el('div', 'flex justify-end pt-2');
  baris.append(b);
  return { b, baris };
}

/* ---------- Data akun ---------- */
function pasangFormProfil(profil) {
  const form = $('form-profil');
  form.replaceChildren();
  const f = {
    'nama-lengkap': buatField({ id: 'p-nama', label: 'Nama lengkap', autocomplete: 'name' }),
    'nomor-telepon': buatField({ id: 'p-telp', label: 'Nomor telepon', type: 'tel', autocomplete: 'tel' }),
  };
  Object.entries(f).forEach(([k, { wrap, input }]) => { input.value = profil[k] ?? ''; form.append(wrap); });
  const { b, baris } = tombolKirim('Simpan perubahan');
  form.append(baris);

  form.onsubmit = async (e) => {
    e.preventDefault();
    const galat = $('profil-error'); const sukses = $('profil-sukses');
    setMessage(galat, ''); setMessage(sukses, '');
    const data = {};
    for (const [k, { input }] of Object.entries(f)) {
      input.removeAttribute('aria-invalid');
      data[k] = input.value.trim();
      const telp = k === 'nomor-telepon';
      if (!data[k] || (telp && !phoneRegex.test(data[k]))) {
        input.setAttribute('aria-invalid', 'true'); input.focus();
        setMessage(galat, telp && data[k] ? 'Nomor telepon tidak valid.' : 'Semua kolom wajib diisi.');
        return;
      }
    }
    b.disabled = true; b.textContent = 'Menyimpan...';
    try {
      const baru = await ubahProfilAdmin(data);
      const sesi = getSession();
      if (sesi) saveSession({ ...sesi, nama: baru['nama-lengkap'] }); // sapaan ikut berubah
      renderRingkas({ ...profil, ...baru });
      setMessage(sukses, 'Profil berhasil diperbarui.');
    } catch (err) {
      setMessage(galat, err.message);
    } finally {
      b.disabled = false; b.textContent = 'Simpan perubahan';
    }
  };
}

function renderRingkas(p) {
  $('ringkas').replaceChildren(DaftarInfo([
    ['Nama', p['nama-lengkap']],
    ['Email', p.email],
    ['Peran', PERAN[p.peran] ?? p.peran],
    ['Terdaftar', formatTanggalSaja(p['dibuat-pada'])],
  ]));
}

async function init() {
  mountAdminNav({ sidebarEl: $('sidebar'), bottomEl: $('bottom-nav'), active: 'profile', onLogout: logout });
  $('logout-mobile').addEventListener('click', logout);
  // Backend belum menyediakan endpoint ganti password, jadi bagiannya disembunyikan.
  $('judul-sandi')?.closest('section')?.remove();
  try {
    const profil = await getProfilAdmin();
    renderRingkas(profil);
    pasangFormProfil(profil);
  } catch (err) {
    $('ringkas').replaceChildren(el('p', 'text-sm text-red-800', err.message));
  }
}

if (requireRole('admin')) init();
