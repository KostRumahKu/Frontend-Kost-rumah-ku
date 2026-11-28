import { mountPenghuniNav } from '../../components/penghuni-nav.js';
import { requireRole, logout } from '../../utils/auth-guard.js';
import { getSession, saveSession } from '../../utils/session.js';
import { $, emailRegex, urlAman, pasangDialog } from '../../utils/dom.js';
import {
  getDashboardPenyewa,
  updateProfil,
  hapusFotoProfil,
  requestOtpEmail,
  verifyOtpEmail,
  gantiPassword,
} from '../../services/penyewa-service.js';

const sesi = requireRole('penyewa');
if (sesi) init();

let emailBaru = '';
let profilSaatIni = {};

const se = (el, msg) => { el.textContent = msg; el.classList.remove('hidden'); };
const he = (el) => { el.textContent = ''; el.classList.add('hidden'); };
const setInvalid = (el, v) => el.setAttribute('aria-invalid', String(v));

function setPageMsg(type, msg) {
  he($('page-error'));
  he($('page-success'));
  if (type === 'ok')    se($('page-success'), msg);
  if (type === 'error') se($('page-error'), msg);
  if (msg) window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setLoading(btn, on, label) {
  btn.disabled = on;
  btn.textContent = on ? 'Memproses…' : label;
}

function init() {
  mountPenghuniNav({
    sidebarEl: $('sidebar'),
    bottomEl:  $('bottom-nav'),
    active:    'profil',
    onLogout:  logout,
  });
  $('logout-mobile').addEventListener('click', logout);
  pasangDialog($('dlg-foto'));

  document.querySelectorAll('[data-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = $(btn.dataset.toggle);
      if (!input) return;
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.textContent = show ? 'Sembunyikan' : 'Tampilkan';
    });
  });

  ['btn-buka-foto', 'btn-ganti-foto'].forEach((id) => {
    $(id)?.addEventListener('click', bukaDialogFoto);
  });

  $('f-foto-url').addEventListener('input', () => updatePreviewFoto($('f-foto-url').value.trim()));
  $('form-foto').addEventListener('submit', simpanFotoProfil);
  $('btn-hapus-foto').addEventListener('click', aksiHapusFoto);

  $('form-info').addEventListener('submit', simpanInfoProfil);
  $('form-email-1').addEventListener('submit', submitRequestOtp);
  $('form-email-2').addEventListener('submit', submitVerifyOtp);
  $('btn-resend-otp').addEventListener('click', kirimUlangOtp);
  $('btn-back-email').addEventListener('click', () => {
    $('email-step-2').classList.add('hidden');
    $('email-step-1').classList.remove('hidden');
    he($('email-error'));
    he($('email-success'));
    emailBaru = '';
  });
  $('f-otp-email').addEventListener('input', () => {
    $('f-otp-email').value = $('f-otp-email').value.replace(/\D/g, '').slice(0, 6);
  });

  $('form-password').addEventListener('submit', submitGantiPassword);

  muatProfil();
}

async function muatProfil() {
  try {
    const data = await getDashboardPenyewa();
    const profil = data?.profil ?? data?.pengguna ?? data?.penyewa ?? {};
    const kamar = data?.kamar;
    profilSaatIni = { ...profil };

    $('profil-skeleton').classList.add('hidden');
    $('profil-konten').classList.remove('hidden');

    tampilFoto(profil['foto-profil']);
    $('profil-nama').textContent    = profil['nama-lengkap'] ?? sesi?.nama ?? '—';
    $('profil-email').textContent   = profil.email ?? '—';
    $('profil-telepon').textContent = profil['nomor-telepon'] ?? '—';

    if (kamar?.['nama-kamar']) {
      const badge = $('profil-kamar-badge');
      badge.textContent = kamar.lantai
        ? `Kamar ${kamar['nama-kamar']} • Lantai ${kamar.lantai}`
        : `Kamar ${kamar['nama-kamar']}`;
      badge.classList.remove('hidden');
    }

    $('f-nama').value         = profil['nama-lengkap'] ?? '';
    $('f-telepon').value      = profil['nomor-telepon'] ?? '';
    $('f-darurat-nama').value = profil['nama-kontak-darurat'] ?? '';
    $('f-darurat-telp').value = profil['nomor-kontak-darurat'] ?? '';

    const s = getSession();
    if (s && profil['nama-lengkap'] && s.nama !== profil['nama-lengkap']) {
      saveSession({ ...s, nama: profil['nama-lengkap'] });
    }
  } catch (err) {
    $('profil-skeleton').classList.add('hidden');
    se($('page-error'), err.message);
  }
}

function tampilFoto(url) {
  const img = $('foto-profil');
  const ph  = $('foto-placeholder');
  const btn = $('btn-hapus-foto');
  const safe = urlAman(url);

  if (safe) {
    img.src = safe;
    img.classList.remove('hidden');
    ph.classList.add('hidden');
    ph.classList.remove('flex');
    btn.classList.remove('hidden');
    img.onerror = () => {
      img.classList.add('hidden');
      ph.classList.remove('hidden');
      ph.classList.add('flex');
      btn.classList.add('hidden');
    };
  } else {
    img.removeAttribute('src');
    img.classList.add('hidden');
    ph.classList.remove('hidden');
    ph.classList.add('flex');
    btn.classList.add('hidden');
  }
}

function updatePreviewFoto(rawUrl) {
  const img = $('foto-preview');
  const ph  = $('foto-preview-ph');
  const safe = urlAman(rawUrl);

  if (safe) {
    img.src = safe;
    img.classList.remove('hidden');
    ph.classList.add('hidden');
    ph.classList.remove('flex');
    img.onerror = () => {
      img.classList.add('hidden');
      ph.classList.remove('hidden');
      ph.classList.add('flex');
    };
  } else {
    img.removeAttribute('src');
    img.classList.add('hidden');
    ph.classList.remove('hidden');
    ph.classList.add('flex');
  }
}

function bukaDialogFoto() {
  he($('foto-error'));
  const current = profilSaatIni['foto-profil'] ?? '';
  $('f-foto-url').value = current;
  updatePreviewFoto(current);
  $('dlg-foto').showModal();
}

async function simpanFotoProfil(e) {
  e.preventDefault();
  he($('foto-error'));

  const fotoUrl = $('f-foto-url').value.trim();
  if (!urlAman(fotoUrl)) {
    se($('foto-error'), 'Masukkan URL foto yang valid (diawali http:// atau https://).');
    return;
  }

  const nama = $('f-nama').value.trim() || profilSaatIni['nama-lengkap'] || '';
  const telepon = $('f-telepon').value.trim() || profilSaatIni['nomor-telepon'] || '';
  if (!nama || !telepon) {
    se($('foto-error'), 'Lengkapi nama lengkap dan nomor telepon terlebih dahulu.');
    return;
  }

  const btn = $('btn-simpan-foto');
  setLoading(btn, true, 'Simpan foto');
  try {
    const payload = {
      'nama-lengkap': nama,
      'nomor-telepon': telepon,
      'foto-profil': fotoUrl,
    };
    const daruratNama = $('f-darurat-nama').value.trim();
    const daruratTelp = $('f-darurat-telp').value.trim();
    if (daruratNama) payload['nama-kontak-darurat'] = daruratNama;
    if (daruratTelp) payload['nomor-kontak-darurat'] = daruratTelp;

    await updateProfil(payload);
    profilSaatIni['foto-profil'] = fotoUrl;
    tampilFoto(fotoUrl);
    $('dlg-foto').close();
    setPageMsg('ok', 'Foto profil berhasil diperbarui.');
  } catch (err) {
    se($('foto-error'), err.message);
  } finally {
    setLoading(btn, false, 'Simpan foto');
  }
}

async function aksiHapusFoto() {
  if (!window.confirm('Hapus foto profil?')) return;
  const btn = $('btn-hapus-foto');
  setLoading(btn, true, 'Hapus foto');
  try {
    await hapusFotoProfil();
    profilSaatIni['foto-profil'] = '';
    tampilFoto(null);
    setPageMsg('ok', 'Foto profil berhasil dihapus.');
  } catch (err) {
    setPageMsg('error', err.message);
  } finally {
    setLoading(btn, false, 'Hapus foto');
  }
}

async function simpanInfoProfil(e) {
  e.preventDefault();
  he($('info-error'));
  he($('info-success'));
  he($('f-nama-err'));
  he($('f-telepon-err'));
  setInvalid($('f-nama'), false);
  setInvalid($('f-telepon'), false);

  const nama = $('f-nama').value.trim();
  const telepon = $('f-telepon').value.trim();
  let ok = true;

  if (!nama) {
    se($('f-nama-err'), 'Nama lengkap wajib diisi.');
    setInvalid($('f-nama'), true);
    ok = false;
  }
  if (!telepon) {
    se($('f-telepon-err'), 'Nomor telepon wajib diisi.');
    setInvalid($('f-telepon'), true);
    ok = false;
  }
  if (!ok) return;

  const btn = $('btn-simpan-info');
  setLoading(btn, true, 'Simpan perubahan');
  try {
    const payload = {
      'nama-lengkap': nama,
      'nomor-telepon': telepon,
      'nama-kontak-darurat':  $('f-darurat-nama').value.trim() || undefined,
      'nomor-kontak-darurat': $('f-darurat-telp').value.trim() || undefined,
    };
    if (urlAman(profilSaatIni['foto-profil'])) {
      payload['foto-profil'] = profilSaatIni['foto-profil'];
    }

    await updateProfil(payload);
    profilSaatIni = { ...profilSaatIni, ...payload };
    $('profil-nama').textContent    = nama;
    $('profil-telepon').textContent = telepon;

    const s = getSession();
    if (s) saveSession({ ...s, nama });

    se($('info-success'), 'Informasi profil berhasil diperbarui.');
  } catch (err) {
    se($('info-error'), err.message);
  } finally {
    setLoading(btn, false, 'Simpan perubahan');
  }
}

async function submitRequestOtp(e) {
  e.preventDefault();
  he($('email-error'));
  he($('email-success'));

  const email = $('f-email-baru').value.trim();
  if (!email || !emailRegex.test(email)) {
    setInvalid($('f-email-baru'), true);
    se($('email-error'), 'Format email tidak valid.');
    return;
  }
  setInvalid($('f-email-baru'), false);

  const btn = $('btn-req-otp');
  setLoading(btn, true, 'Kirim OTP');
  try {
    await requestOtpEmail(email);
    emailBaru = email;
    $('email-step-1').classList.add('hidden');
    $('email-step-2').classList.remove('hidden');
    $('f-otp-email').focus();
    se($('email-success'), `Kode OTP dikirim ke ${email}.`);
  } catch (err) {
    se($('email-error'), err.message);
  } finally {
    setLoading(btn, false, 'Kirim OTP');
  }
}

async function kirimUlangOtp() {
  if (!emailBaru) return;
  he($('email-error'));
  he($('email-success'));
  const btn = $('btn-resend-otp');
  setLoading(btn, true, 'Kirim ulang OTP');
  try {
    await requestOtpEmail(emailBaru);
    se($('email-success'), `Kode OTP baru telah dikirim ke ${emailBaru}.`);
  } catch (err) {
    se($('email-error'), err.message);
  } finally {
    setLoading(btn, false, 'Kirim ulang OTP');
  }
}

async function submitVerifyOtp(e) {
  e.preventDefault();
  he($('email-error'));
  he($('email-success'));

  const otp = $('f-otp-email').value.trim();
  if (!/^\d{6}$/.test(otp)) {
    setInvalid($('f-otp-email'), true);
    se($('email-error'), 'Kode OTP harus 6 digit angka.');
    return;
  }
  setInvalid($('f-otp-email'), false);

  const btn = $('btn-verify-otp');
  setLoading(btn, true, 'Verifikasi');
  try {
    await verifyOtpEmail(emailBaru, otp);
    profilSaatIni.email = emailBaru;
    $('profil-email').textContent = emailBaru;
    $('email-step-2').classList.add('hidden');
    $('email-step-1').classList.remove('hidden');
    $('f-email-baru').value = '';
    $('f-otp-email').value = '';
    emailBaru = '';
    se($('email-success'), 'Email berhasil diperbarui.');
  } catch (err) {
    se($('email-error'), err.message);
  } finally {
    setLoading(btn, false, 'Verifikasi');
  }
}

async function submitGantiPassword(e) {
  e.preventDefault();
  he($('pw-error'));
  he($('pw-success'));
  setInvalid($('f-pw-lama'), false);
  setInvalid($('f-pw-baru'), false);
  setInvalid($('f-pw-konfirmasi'), false);

  const pwLama = $('f-pw-lama').value;
  const pwBaru = $('f-pw-baru').value;
  const pwKonf = $('f-pw-konfirmasi').value;

  if (!pwLama) {
    setInvalid($('f-pw-lama'), true);
    se($('pw-error'), 'Password lama wajib diisi.');
    $('f-pw-lama').focus();
    return;
  }
  if (pwBaru.length < 8) {
    setInvalid($('f-pw-baru'), true);
    se($('pw-error'), 'Password baru minimal 8 karakter.');
    $('f-pw-baru').focus();
    return;
  }
  if (pwBaru !== pwKonf) {
    setInvalid($('f-pw-konfirmasi'), true);
    se($('pw-error'), 'Konfirmasi password baru tidak cocok.');
    $('f-pw-konfirmasi').focus();
    return;
  }

  const btn = $('btn-ganti-pw');
  setLoading(btn, true, 'Ganti password');
  try {
    await gantiPassword(pwLama, pwBaru);
    $('form-password').reset();
    se($('pw-success'), 'Password berhasil diperbarui.');
  } catch (err) {
    se($('pw-error'), err.message);
  } finally {
    setLoading(btn, false, 'Ganti password');
  }
}
