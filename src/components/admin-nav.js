// Navbar admin: sidebar collapsible (desktop) + bar melayang di bawah (mobile)
const ICON_PATH = '/public/icons';
const STORAGE_KEY = 'admin-sidebar-collapsed';

export const adminItems = [
  { id: 'dashboard',  label: 'Dashboard',  icon: 'home.webp',        href: '/admin/dashboard-admin' },
  { id: 'kamar',      label: 'Kamar',       icon: 'rooms.webp',       href: '/admin/kamar' },
  { id: 'penghuni',   label: 'Penghuni',    icon: 'contact.webp',     href: '/admin/penghuni' },
  { id: 'pembayaran', label: 'Pembayaran',  icon: 'facilities.webp',  href: '/admin/pembayaran' },
  { id: 'pengumuman', label: 'Pengumuman',  icon: 'testimonial.webp', href: '/admin/pengumuman' },
];

const logo =
  '<svg class="h-7 w-7 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3 2 12h3v8h5v-5h4v5h5v-8h3L12 3Z" /></svg>';

// Ikon chevron (arah berubah via rotate CSS)
const iconChevron =
  '<svg class="chevron-icon h-4 w-4 shrink-0 transition-transform duration-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" /></svg>';

// Catatan: label/href ditulis developer (bukan input pengguna), aman lewat innerHTML.
function renderSidebar({ items, brand }) {
  const links = items
    .map(
      (i) => `
      <li>
        <a href="${i.href}" data-nav-id="${i.id}"
          class="nav-link flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--color-cream)] transition-colors hover:bg-white/10 aria-[current=page]:bg-[var(--color-cream)] aria-[current=page]:text-[var(--color-primary)]">
          <img src="${ICON_PATH}/${i.icon}" alt="" class="h-5 w-5 shrink-0" />
          <span class="nav-label truncate">${i.label}</span>
        </a>
      </li>`
    )
    .join('');

  return `
    <div class="flex h-full flex-col bg-[var(--color-primary)] text-[var(--color-cream)]">

      <!-- Header sidebar: logo + tombol toggle -->
      <div class="flex items-center justify-between px-4 py-4">
        <a href="${brand.href}" class="brand-link flex items-center gap-2 font-[family-name:var(--font-heading)] text-lg font-semibold leading-tight overflow-hidden">
          ${logo}
          <span class="nav-label truncate">${brand.name}</span>
        </a>
        <button type="button" data-toggle-sidebar
          aria-label="Tutup sidebar"
          class="ml-1 shrink-0 rounded-lg p-1.5 transition-colors hover:bg-white/10">
          ${iconChevron}
        </button>
      </div>

      <nav aria-label="Menu admin" class="flex-1 px-2">
        <ul class="space-y-0.5">${links}</ul>
      </nav>

      <div class="px-2 pb-4">
        <button type="button" data-logout
          class="nav-link flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors hover:bg-white/10">
          <svg class="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
          </svg>
          <span class="nav-label">Keluar</span>
        </button>
      </div>
    </div>`;
}

function renderBottom({ items }) {
  const links = items
    .map(
      (i) => `
      <a href="${i.href}" data-nav-id="${i.id}" aria-label="${i.label}" title="${i.label}"
        class="flex h-12 flex-1 items-center justify-center rounded-full transition-colors aria-[current=page]:bg-white/60">
        <img src="${ICON_PATH}/${i.icon}" alt="" class="h-6 w-6" />
      </a>`
    )
    .join('');

  return `
    <nav aria-label="Menu admin" class="fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-30 flex gap-1 rounded-full border border-white/40 bg-[var(--color-cream)]/70 p-2 shadow-lg backdrop-blur-md">
      ${links}
    </nav>`;
}

/**
 * Terapkan state collapsed ke elemen sidebar.
 * collapsed = true  → sidebar sempit (icon only, w-16)
 * collapsed = false → sidebar lebar (w-60)
 */
function applyCollapsed(sidebarEl, collapsed) {
  if (collapsed) {
    sidebarEl.classList.remove('w-60');
    sidebarEl.classList.add('w-16');
    sidebarEl.querySelectorAll('.nav-label').forEach((el) => el.classList.add('hidden'));
    const chevron = sidebarEl.querySelector('.chevron-icon');
    if (chevron) chevron.classList.add('rotate-180');
    const toggle = sidebarEl.querySelector('[data-toggle-sidebar]');
    if (toggle) toggle.setAttribute('aria-label', 'Buka sidebar');
  } else {
    sidebarEl.classList.remove('w-16');
    sidebarEl.classList.add('w-60');
    sidebarEl.querySelectorAll('.nav-label').forEach((el) => el.classList.remove('hidden'));
    const chevron = sidebarEl.querySelector('.chevron-icon');
    if (chevron) chevron.classList.remove('rotate-180');
    const toggle = sidebarEl.querySelector('[data-toggle-sidebar]');
    if (toggle) toggle.setAttribute('aria-label', 'Tutup sidebar');
  }
}

/**
 * @param {object}   opts
 * @param {Element}  opts.sidebarEl  wadah sidebar (desktop)
 * @param {Element}  opts.bottomEl   wadah bar bawah (mobile)
 * @param {Array}    [opts.items]    daftar menu, default: adminItems
 * @param {object}   [opts.brand]    { name, href }
 * @param {string}   opts.active     id menu yang aktif
 * @param {Function} [opts.onLogout] dipanggil saat tombol Keluar ditekan
 */
export function mountAdminNav({
  sidebarEl,
  bottomEl,
  items = adminItems,
  brand = { name: 'KostRumahKu', href: '/' },
  active,
  onLogout,
}) {
  sidebarEl.innerHTML = renderSidebar({ items, brand });
  bottomEl.innerHTML  = renderBottom({ items });

  // Tandai menu aktif
  [sidebarEl, bottomEl].forEach((root) => {
    root.querySelectorAll('[data-nav-id]').forEach((el) => {
      if (el.dataset.navId === active) el.setAttribute('aria-current', 'page');
    });
    // Sembunyikan gambar yang gagal dimuat
    root.querySelectorAll('img').forEach((img) =>
      img.addEventListener('error', () => img.classList.add('invisible'))
    );
  });

  // Logout
  sidebarEl.querySelector('[data-logout]')?.addEventListener('click', () => onLogout?.());

  // ── Toggle collapse sidebar (hanya desktop) ──────────────────────────────
  // Baca state tersimpan; default: tidak collapsed
  let collapsed = localStorage.getItem(STORAGE_KEY) === 'true';
  applyCollapsed(sidebarEl, collapsed);

  sidebarEl.querySelector('[data-toggle-sidebar]')?.addEventListener('click', () => {
    collapsed = !collapsed;
    localStorage.setItem(STORAGE_KEY, String(collapsed));
    applyCollapsed(sidebarEl, collapsed);
  });

  // Transisi lebar sidebar agar animasinya halus
  sidebarEl.style.transition = 'width 200ms ease';
}
