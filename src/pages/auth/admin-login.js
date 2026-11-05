// Halaman login gabungan owner + admin — /staff/login
// Coba endpoint owner dulu; kalau gagal coba admin.
// Redirect ditentukan dari field `peran` di response backend.
import { loginOwner, loginAdmin } from '../../services/auth-service.js';
import { saveSession } from '../../utils/session.js';
import { ROLE_HOME } from '../../utils/config.js';

const form       = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const sandiInput = document.getElementById('kata-sandi');
const toggleBtn  = document.getElementById('toggle-sandi');
const submitBtn  = document.getElementById('submit-btn');
const formError  = document.getElementById('form-error');
const emailError = document.getElementById('email-error');
const sandiError = document.getElementById('sandi-error');

// ── Toggle kata sandi ────────────────────────────────────────────────────────
toggleBtn.addEventListener('click', () => {
  const show = sandiInput.type === 'password';
  sandiInput.type       = show ? 'text' : 'password';
  toggleBtn.textContent = show ? 'Sembunyikan' : 'Tampilkan';
  toggleBtn.setAttribute('aria-pressed', String(show));
});

// ── Helper UI ────────────────────────────────────────────────────────────────
function showError(el, msg) { el.textContent = msg; el.classList.remove('hidden'); }
function clearError(el)     { el.textContent = '';  el.classList.add('hidden');    }
function setInvalid(input, v) { input.setAttribute('aria-invalid', String(v)); }
function setLoading(on) {
  submitBtn.disabled    = on;
  submitBtn.textContent = on ? 'Memproses…' : 'Masuk';
}

// ── Validasi ─────────────────────────────────────────────────────────────────
function validate(email, sandi) {
  let ok = true;
  [emailError, sandiError, formError].forEach(clearError);
  setInvalid(emailInput, false);
  setInvalid(sandiInput, false);

  if (!email) {
    showError(emailError, 'Email wajib diisi.'); setInvalid(emailInput, true); ok = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showError(emailError, 'Format email tidak valid.'); setInvalid(emailInput, true); ok = false;
  }
  if (!sandi) {
    showError(sandiError, 'Kata sandi wajib diisi.'); setInvalid(sandiInput, true); ok = false;
  }
  return ok;
}

// ── Login: coba owner dulu, fallback ke admin ────────────────────────────────
async function loginStaff(email, sandi) {
  try {
    return await loginOwner(email, sandi);
  } catch {
    // bukan owner, coba admin
  }
  return await loginAdmin(email, sandi); // kalau ini juga gagal, error-nya akan naik ke submit handler
}

// ── Submit ───────────────────────────────────────────────────────────────────
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = emailInput.value.trim();
  const sandi = sandiInput.value;
  if (!validate(email, sandi)) return;

  setLoading(true);
  try {
    const data = await loginStaff(email, sandi); // { token, peran, nama }
    saveSession(data);
    const tujuan = ROLE_HOME[data.peran] ?? '/';
    window.location.href = tujuan;
  } catch (err) {
    showError(formError, err.message);
    setLoading(false);
  }
});
