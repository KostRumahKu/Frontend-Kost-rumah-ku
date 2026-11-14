// Halaman verifikasi OTP — /auth/verifikasi-otp
// Step 2: masukkan OTP, simpan ke sessionStorage, redirect ke /auth/sandi-baru
import { lupaSandi } from '../../services/auth-service.js';

const form      = document.getElementById('form-otp');
const otpInput  = document.getElementById('otp');
const otpError  = document.getElementById('otp-error');
const formError = document.getElementById('form-error');
const infoEl    = document.getElementById('info');
const submitBtn = document.getElementById('submit-btn');
const kirimUlangBtn = document.getElementById('btn-kirim-ulang');

// Ambil email dari step sebelumnya
const email = sessionStorage.getItem('reset-email');
if (!email) {
  // Kalau tidak ada email, balik ke step 1
  window.location.replace('/auth/lupa-sandi');
}

// Teks info mengikuti HTML (tidak ditimpa di sini)

function showError(el, msg) { el.textContent = msg; el.classList.remove('hidden'); }
function clearError(el)     { el.textContent = '';  el.classList.add('hidden');    }
function setInvalid(input, v) { input.setAttribute('aria-invalid', String(v)); }
function setLoading(on) {
  submitBtn.disabled    = on;
  submitBtn.textContent = on ? 'Memverifikasi…' : 'Verifikasi';
}

// Hanya terima angka
otpInput.addEventListener('input', () => {
  otpInput.value = otpInput.value.replace(/\D/g, '').slice(0, 6);
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!email) return;
  clearError(formError);
  clearError(otpError);
  setInvalid(otpInput, false);

  const otp = otpInput.value.trim();
  if (!otp || !/^\d{6}$/.test(otp)) {
    showError(otpError, 'Kode OTP harus 6 digit angka.'); setInvalid(otpInput, true); return;
  }

  // Simpan OTP untuk dipakai di step berikutnya
  sessionStorage.setItem('reset-otp', otp);
  window.location.href = '/auth/sandi-baru';
});

// Kirim ulang OTP
kirimUlangBtn.addEventListener('click', async () => {
  if (!email) return;
  clearError(formError);
  kirimUlangBtn.disabled    = true;
  kirimUlangBtn.textContent = 'Mengirim…';
  try {
    await lupaSandi(email);
    infoEl.textContent = 'Kode OTP baru sudah dikirim. Periksa semua folder emailmu, termasuk spam.';
  } catch (err) {
    showError(formError, err.message);
  } finally {
    kirimUlangBtn.disabled    = false;
    kirimUlangBtn.textContent = 'Kirim ulang OTP';
  }
});