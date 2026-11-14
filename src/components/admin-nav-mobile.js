// Bar navigasi melayang di bawah untuk mobile.
import { adminItems } from './admin-nav-items.js';

const ICON_PATH = '/public/icons';

// Catatan: label/href ditulis developer (bukan input pengguna), aman lewat innerHTML.
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
 * @param {object}  opts
 * @param {Element} opts.el       elemen div wadah bar bawah
 * @param {Array}   [opts.items]  daftar menu, default: adminItems
 * @param {string}  opts.active   id menu yang aktif
 */
export function mountAdminBottomNav({
  el,
  items = adminItems,
  active,
}) {
  el.innerHTML = renderBottom({ items });

  el.querySelectorAll('[data-nav-id]').forEach((a) => {
    if (a.dataset.navId === active) a.setAttribute('aria-current', 'page');
  });
  el.querySelectorAll('img').forEach((img) =>
    img.addEventListener('error', () => img.classList.add('invisible'))
  );
}
