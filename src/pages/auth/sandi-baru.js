// Halaman sandi baru — /auth/sandi-baru
// Step 3: masukkan sandi baru, hit konfirmasi API, redirect ke login
import { konfirmasiLupaSandi } from '../../services/auth-service.js';

const form       = document.getElementById('form-sandi');
const sandiInput = document.getElementById('sandi-baru');
const sandiError = document.getElementById('sandi-error');
const formError  = document.getElementById('form-error');
const submitBtn  = document.getElementById('submit-btn');
const toggleBtn  = document.getElementById('toggle-sandi');

// Ambil email + OTP dari step sebelumnya
const email = sessionStorage.getItem('reset-email');
const otp   = sessionStorage.getItem('reset-otp');

if (!email || !otp) {
  // Kalau data tidak lengkap, balik ke step 1
  window.location.replace('/auth/lupa-sandi');
}

function showError(el, msg) { el.textContent = msg; el.classList.remove('hidden'); }
function clearError(el)     { el.textContent = '';  el.classList.add('hidden');    }
function setInvalid(input, v) { input.setAttribute('aria-invalid', String(v)); }
function setLoading(on) {
  submitBtn.disabled    = on;
  submitBtn.textContent = on ? 'Menyimpan…' : 'Simpan sandi baru';
}

toggleBtn.addEventListener('click', () => {
  const show = sandiInput.type === 'password';
  sandiInput.type       = show ? 'text' : 'password';
  toggleBtn.textContent = show ? 'Sembunyikan' : 'Tampilkan';
  toggleBtn.setAttribute('aria-pressed', String(show));
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearError(formError);
  clearError(sandiError);
  setInvalid(sandiInput, false);

  const sandiBaru = sandiInput.value;
  if (sandiBaru.length < 8) {
    showError(sandiError, 'Sandi baru minimal 8 karakter.'); setInvalid(sandiInput, true); return;
  }

  setLoading(true);
  try {
    await konfirmasiLupaSandi(email, otp, sandiBaru);
    // Bersihkan data reset dari sessionStorage
    sessionStorage.removeItem('reset-email');
    sessionStorage.removeItem('reset-otp');
    window.location.href = '/auth/login?reset=sukses';
  } catch (err) {
    showError(formError, err.message);
    setLoading(false);
  }
});
