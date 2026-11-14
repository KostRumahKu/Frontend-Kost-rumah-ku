// Halaman lupa sandi — /auth/lupa-sandi
// Step 1: masukkan email, kirim OTP, redirect ke /auth/verifikasi-otp
import { lupaSandi } from '../../services/auth-service.js';

const form       = document.getElementById('form-lupa');
const emailInput = document.getElementById('email');
const emailError = document.getElementById('email-error');
const formError  = document.getElementById('form-error');
const submitBtn  = document.getElementById('submit-btn');

function showError(el, msg) { el.textContent = msg; el.classList.remove('hidden'); }
function clearError(el)     { el.textContent = '';  el.classList.add('hidden');    }
function setInvalid(input, v) { input.setAttribute('aria-invalid', String(v)); }
function setLoading(on) {
  submitBtn.disabled    = on;
  submitBtn.textContent = on ? 'Mengirim…' : 'Kirim kode OTP';
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearError(formError);
  clearError(emailError);
  setInvalid(emailInput, false);

  const email = emailInput.value.trim();
  if (!email) {
    showError(emailError, 'Email wajib diisi.'); setInvalid(emailInput, true); return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showError(emailError, 'Format email tidak valid.'); setInvalid(emailInput, true); return;
  }

  setLoading(true);
  try {
    await lupaSandi(email);
    // Simpan email untuk dipakai di halaman berikutnya
    sessionStorage.setItem('reset-email', email);
    window.location.href = '/auth/verifikasi-otp';
  } catch (err) {
    showError(formError, err.message);
    setLoading(false);
  }
});
