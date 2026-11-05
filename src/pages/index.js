// Logic for pages/index.html (landing page)
import { mountNavbar } from '../components/navbar.js';
import { landingNavItems, mountMobileBottomNav } from '../components/mobile-bottom-nav.js';

mountNavbar({
  topEl: document.getElementById('top-nav'),
  active: 'beranda',
  actions: [
    { label: 'Masuk', href: 'auth/login' },
  ],
});

mountMobileBottomNav({
  rootEl: document.getElementById('bottom-nav'),
  variant: 'landing',
  items: landingNavItems,
  active: 'beranda',
});

document.getElementById('hero-img').addEventListener('error', (e) => e.target.remove());