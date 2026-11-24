// Bar navigasi melayang di bawah untuk mobile.
// Maksimal MAKS_LANGSUNG menu tampil langsung; kalau menu lebih banyak, sisanya masuk tombol "Lainnya".
import { adminItems } from './admin-nav-items.js';

const ICON_PATH = '/public/icons';
const MAKS_LANGSUNG = 5;

const kelasTombol =
  'flex h-12 flex-1 items-center justify-center rounded-full transition-colors aria-[current=page]:bg-white/60';

const iconLainnya =
  '<svg class="h-6 w-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>';

// Catatan: label/href ditulis developer (bukan input pengguna), aman lewat innerHTML.
function renderBottom({ items }) {
  const perlu = items.length > MAKS_LANGSUNG;
  const langsung = perlu ? items.slice(0, MAKS_LANGSUNG - 1) : items;
  const sisa = perlu ? items.slice(MAKS_LANGSUNG - 1) : [];

  const link = (i) => `
      <a href="${i.href}" data-nav-id="${i.id}" aria-label="${i.label}" title="${i.label}" class="${kelasTombol}">
        <img src="${ICON_PATH}/${i.icon}" alt="" class="h-6 w-6" />
      </a>`;

  const tombolLainnya = perlu
    ? `<button type="button" data-more aria-label="Menu lainnya" aria-expanded="false" aria-controls="menu-lainnya" title="Lainnya" class="${kelasTombol} text-[var(--color-ink)]">${iconLainnya}</button>`
    : '';

  const panel = perlu
    ? `<div id="menu-lainnya" hidden class="fixed inset-x-4 bottom-[calc(max(1rem,env(safe-area-inset-bottom))+4.5rem)] z-30 rounded-2xl border border-white/40 bg-[var(--color-cream)]/95 p-2 shadow-lg backdrop-blur-md">
        <ul>${sisa.map((i) => `
          <li><a href="${i.href}" data-nav-id="${i.id}" class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--color-ink)] aria-[current=page]:bg-white/70">
            <img src="${ICON_PATH}/${i.icon}" alt="" class="h-5 w-5" />${i.label}</a></li>`).join('')}
        </ul>
      </div>`
    : '';

  return `
    ${panel}
    <nav aria-label="Menu admin" class="fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-30 flex gap-1 rounded-full border border-white/40 bg-[var(--color-cream)]/70 p-2 shadow-lg backdrop-blur-md">
      ${langsung.map(link).join('')}${tombolLainnya}
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

  const more = el.querySelector('[data-more]');
  const panel = el.querySelector('#menu-lainnya');
  if (more && panel) {
    // Tombol "Lainnya" ikut menyala bila menu aktif ada di dalam panel
    if (panel.querySelector('[aria-current="page"]')) more.setAttribute('aria-current', 'page');

    const toggle = (buka) => {
      panel.hidden = !buka;
      more.setAttribute('aria-expanded', String(buka));
    };
    more.addEventListener('click', () => toggle(panel.hidden));
    document.addEventListener('click', (e) => {
      if (!panel.hidden && !panel.contains(e.target) && !more.contains(e.target)) toggle(false);
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') toggle(false); });
  }
}
