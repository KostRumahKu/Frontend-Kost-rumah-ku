// Logic for pages/admin/dashboard-admin.html
import { mountAdminNav } from '../../components/admin-nav.js';
import { requireRole, logout } from '../../utils/auth-guard.js';
import { getDashboardRingkasan } from '../../services/admin-service.js';

const sesi = requireRole('admin');
if (sesi) init(sesi);

function init(sesi) {
  mountAdminNav({
    sidebarEl: document.getElementById('sidebar'),
    bottomEl: document.getElementById('bottom-nav'),
    active: 'dashboard',
    onLogout: logout,
  });

  document.getElementById('logout-mobile').addEventListener('click', logout);
  document.getElementById('salam').textContent = sesi.nama ? `Halo, ${sesi.nama}` : '';

  renderStats(null); // tampilkan kartu dulu dengan nilai "..."
  muatRingkasan();
}

function statCard(label, value, note = '') {
  const card = document.createElement('article');
  card.className = 'rounded-xl bg-[var(--color-surface)] p-4 shadow-sm md:p-5';

  const l = document.createElement('p');
  l.className = 'text-sm text-[var(--color-muted)]';
  l.textContent = label;

  const v = document.createElement('p');
  v.className = 'mt-2 font-[family-name:var(--font-heading)] text-3xl font-semibold text-[var(--color-primary)]';
  v.textContent = value;

  const n = document.createElement('p');
  n.className = 'mt-1 text-xs text-[var(--color-muted)]';
  n.textContent = note;

  card.append(l, v, n);
  return card;
}

function renderStats(data) {
  const kamar = data?.kamar ?? {};
  const tagihan = data?.tagihan ?? {};
  const nilai = (n) => (data ? (n ?? '-') : '...');

  document.getElementById('stats').replaceChildren(
    statCard('Total kamar', nilai(kamar.total)),
    statCard('Kamar kosong', nilai(kamar.kosong)),
    statCard('Kamar terisi', nilai(kamar.terisi)),
    statCard('Tagihan menunggak', nilai(tagihan.nunggak), data ? `${tagihan.mendatang ?? 0} tagihan mendatang` : '')
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