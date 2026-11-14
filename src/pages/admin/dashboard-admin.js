// Logic for pages/admin/dashboard-admin.html
import { mountAdminNav } from '../../components/admin-nav.js';
import { StatCard } from '../../components/stat-card.js';
import { requireRole, logout } from '../../utils/auth-guard.js';
import { getDashboardRingkasan } from '../../services/admin-service.js';

const sesi = requireRole('admin');
if (sesi) init(sesi);

function init(sesi) {
  mountAdminNav({
    sidebarEl: document.getElementById('sidebar'),
    bottomEl:  document.getElementById('bottom-nav'),
    active:    'dashboard',
    onLogout:  logout,
  });

  document.getElementById('logout-mobile').addEventListener('click', logout);
  document.getElementById('salam').textContent = sesi.nama ? `Halo, ${sesi.nama}` : '';

  renderStats(null); // tampilkan kartu dulu dengan nilai "..."
  muatRingkasan();
}

function renderStats(data) {
  const kamar   = data?.kamar   ?? {};
  const tagihan = data?.tagihan ?? {};
  const nilai   = (n) => (data ? (n ?? '-') : '...');

  document.getElementById('stats').replaceChildren(
    StatCard({ label: 'Total kamar',       value: nilai(kamar.total)  }),
    StatCard({ label: 'Kamar kosong',      value: nilai(kamar.kosong) }),
    StatCard({ label: 'Kamar terisi',      value: nilai(kamar.terisi) }),
    StatCard({
      label: 'Tagihan menunggak',
      value: nilai(tagihan.nunggak),
      note:  data ? `${tagihan.mendatang ?? 0} tagihan mendatang` : '',
    }),
  );
}

async function muatRingkasan() {
  const errorEl = document.getElementById('dash-error');
  try {
    renderStats(await getDashboardRingkasan());
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove('hidden');
    renderStats({}); // ganti "..." jadi "-"
  }
}
