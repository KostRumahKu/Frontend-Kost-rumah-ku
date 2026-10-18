// Logic for pages/index.html (landing page)
import { mountNavbar } from '../components/navbar.js';

mountNavbar({
  topEl: document.getElementById('top-nav'),
  bottomEl: document.getElementById('bottom-nav'),
  active: 'beranda',
  actions: [
    { label: 'Masuk', href: 'auth/login' },
    { label: 'Daftar', href: 'register' },
  ],
});

document.getElementById('hero-img').addEventListener('error', (e) => e.target.remove());