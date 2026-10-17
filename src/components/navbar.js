// Navbar reusable: header atas (desktop) + tab bar bawah (mobile)
import { icon } from './icons.js';

export const defaultItems = [
  { id: 'home', label: 'Home', icon: 'home', href: '' },
  { id: 'rooms', label: 'Rooms', icon: 'rooms', href: 'rooms' },
  { id: 'facilities', label: 'Facilities', icon: 'facilities', href: 'facilities' },
  { id: 'testimonial', label: 'Testimonial', mobileLabel: 'Reviews', icon: 'testimonial', href: 'testimonial' },
  { id: 'location', label: 'Location', icon: 'location', href: 'location' },
  { id: 'contact', label: 'Contact', icon: 'contact', href: 'contact' },
];

const logo =
  '<svg class="h-7 w-7" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3 2 12h3v8h5v-5h4v5h5v-8h3L12 3Z" /></svg>';

// Catatan: label/href ditulis developer (bukan input pengguna), jadi aman lewat innerHTML.
function topItem(item) {
  const cls = 'rounded-lg px-4 py-2 hover:bg-white/10 aria-[current=page]:bg-white/20';
  return item.href
    ? `<a href="${item.href}" data-nav-id="${item.id}" class="${cls}">${item.label}</a>`
    : `<button type="button" data-nav-id="${item.id}" class="${cls}">${item.label}</button>`;
}

function bottomItem(item) {
  const cls = 'flex flex-1 flex-col items-center gap-1 py-2 text-[10px] text-white/65 aria-[current=page]:text-white';
  const inner = `${icon(item.icon)}${item.mobileLabel ?? item.label}`;
  return item.href
    ? `<a href="${item.href}" data-nav-id="${item.id}" class="${cls}">${inner}</a>`
    : `<button type="button" data-nav-id="${item.id}" class="${cls}">${inner}</button>`;
}

function actionItem(a) {
  const cls = a.solid
    ? 'rounded-lg bg-[var(--color-cream)] px-4 py-2 font-medium text-[var(--color-primary)] hover:bg-white'
    : 'rounded-lg px-4 py-2 hover:bg-white/10';
  return a.href
    ? `<a href="${a.href}" class="${cls}">${a.label}</a>`
    : `<button type="button" data-action="${a.action}" class="${cls}">${a.label}</button>`;
}

function renderTop({ items, brand, actions }) {
  const links = items.map((item) => `<li>${topItem(item)}</li>`).join('');

  return `
    <div class="bg-[var(--color-primary)] text-[var(--color-cream)]">
      <div class="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <a href="${brand.href}" class="flex items-center gap-2 font-[family-name:var(--font-heading)] text-lg font-semibold tracking-wide">${logo}${brand.name}</a>
        <nav aria-label="Main"><ul class="flex items-center gap-2 text-sm">${links}</ul></nav>
        <div class="flex items-center gap-2 text-sm">${actions.map(actionItem).join('')}</div>
      </div>
    </div>`;
}

function renderBottom({ items }) {
  return `
    <nav aria-label="Main" class="flex border-t border-white/15 bg-[var(--color-primary)] pb-[env(safe-area-inset-bottom)] text-[var(--color-cream)]">
      ${items.map(bottomItem).join('')}
    </nav>`;
}

/**
 * Pasang navbar ke halaman.
 * @param {object}   opts
 * @param {Element}  [opts.topEl]     wadah header atas (desktop)
 * @param {Element}  [opts.bottomEl]  wadah tab bar bawah (mobile)
 * @param {Array}    [opts.items]     daftar menu, default: defaultItems
 * @param {object}   [opts.brand]     { name, href }
 * @param {Array}    [opts.actions]   tombol kanan header: [{ label, href? | action?, solid? }]
 * @param {string}   [opts.active]    id menu yang aktif
 * @param {Function} [opts.onSelect]  dipanggil dengan id saat menu/tombol aksi (tanpa href) diklik
 * @returns {{ setActive: (id: string) => void }}
 */
export function mountNavbar({
  topEl,
  bottomEl,
  items = defaultItems,
  brand = { name: 'KostRumahKu', href: 'index.html' },
  actions = [],
  active = items[0]?.id,
  onSelect,
}) {
  const roots = [topEl, bottomEl].filter(Boolean);

  if (topEl) topEl.innerHTML = renderTop({ items, brand, actions });
  if (bottomEl) bottomEl.innerHTML = renderBottom({ items });

  function setActive(id) {
    roots.forEach((root) => {
      root.querySelectorAll('[data-nav-id]').forEach((el) => {
        if (el.dataset.navId === id) el.setAttribute('aria-current', 'page');
        else el.removeAttribute('aria-current');
      });
    });
  }

  roots.forEach((root) =>
    root.addEventListener('click', (e) => {
      const el = e.target.closest('button[data-nav-id], button[data-action]');
      if (el) onSelect?.(el.dataset.navId ?? el.dataset.action);
    })
  );

  setActive(active);
  return { setActive };
}