// Sidebar collapsible untuk desktop.
import { adminItems } from './admin-nav-items.js';

const ICON_PATH = '/public/icons';
const STORAGE_KEY = 'admin-sidebar-collapsed';

const logo =
  '<svg class="h-7 w-7 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3 2 12h3v8h5v-5h4v5h5v-8h3L12 3Z" /></svg>';

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

function applyCollapsed(el, collapsed) {
  if (collapsed) {
    el.classList.remove('w-60');
    el.classList.add('w-16');
    el.querySelectorAll('.nav-label').forEach((n) => n.classList.add('hidden'));
    el.querySelector('.chevron-icon')?.classList.add('rotate-180');
    el.querySelector('[data-toggle-sidebar]')?.setAttribute('aria-label', 'Buka sidebar');
  } else {
    el.classList.remove('w-16');
    el.classList.add('w-60');
    el.querySelectorAll('.nav-label').forEach((n) => n.classList.remove('hidden'));
    el.querySelector('.chevron-icon')?.classList.remove('rotate-180');
    el.querySelector('[data-toggle-sidebar]')?.setAttribute('aria-label', 'Tutup sidebar');
  }
}

/**
 * @param {object}   opts
 * @param {Element}  opts.el        elemen aside wadah sidebar
 * @param {Array}    [opts.items]   daftar menu, default: adminItems
 * @param {object}   [opts.brand]   { name, href }
 * @param {string}   opts.active    id menu yang aktif
 * @param {Function} [opts.onLogout]
 */
export function mountAdminSidebar({
  el,
  items = adminItems,
  brand = { name: 'KostRumahKu', href: '/' },
  active,
  onLogout,
}) {
  el.innerHTML = renderSidebar({ items, brand });

  // Tandai menu aktif
  el.querySelectorAll('[data-nav-id]').forEach((a) => {
    if (a.dataset.navId === active) a.setAttribute('aria-current', 'page');
  });
  el.querySelectorAll('img').forEach((img) =>
    img.addEventListener('error', () => img.classList.add('invisible'))
  );

  // Logout
  el.querySelector('[data-logout]')?.addEventListener('click', () => onLogout?.());

  // Toggle collapse
  let collapsed = localStorage.getItem(STORAGE_KEY) === 'true';
  applyCollapsed(el, collapsed);
  el.style.transition = 'width 200ms ease';

  el.querySelector('[data-toggle-sidebar]')?.addEventListener('click', () => {
    collapsed = !collapsed;
    localStorage.setItem(STORAGE_KEY, String(collapsed));
    applyCollapsed(el, collapsed);
  });
}
