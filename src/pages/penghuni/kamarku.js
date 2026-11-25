import { mountPenghuniNav } from '../../components/penghuni-nav.js';
import { requireRole, logout } from '../../utils/auth-guard.js';

const sesi = requireRole('penyewa');
if (sesi) {
  mountPenghuniNav({
    sidebarEl: document.getElementById('sidebar'),
    bottomEl:  document.getElementById('bottom-nav'),
    active:    'kamarku',
    onLogout:  logout,
  });
  document.getElementById('logout-mobile').addEventListener('click', logout);
}