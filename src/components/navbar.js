// Navbar reusable: header atas (desktop) + tab bar bawah (mobile)
const ICON_PATH = '/public/icons';

export const defaultItems = [
  { id: 'beranda', label: 'Beranda', icon: 'home.webp', href: '/' },
  { id: 'kamar', label: 'Kamar', icon: 'rooms.webp', href: '/kamar' },
  { id: 'pesan', label: 'Pesan', icon: 'rooms.webp', href: '/pesan' },
  { id: 'fasilitas', label: 'Fasilitas', icon: 'facilities.webp', href: 'fasilitas' },
  { id: 'testimoni', label: 'Testimoni', icon: 'testimonial.webp', href: 'testimoni' },
  { id: 'lokasi', label: 'Lokasi', icon: 'location.webp', href: 'lokasi' },
  { id: 'kontak', label: 'Kontak', icon: 'contact.webp', href: 'kontak' },
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
  const cls = 'group flex flex-1 flex-col items-center gap-1 py-2 text-[10px] text-white/65 aria-[current=page]:text-white';
  const img = `<img src="${ICON_PATH}/${item.icon}" alt="" class="h-6 w-6 opacity-65 group-aria-[current=page]:opacity-100" />`;
  const inner = `${img}${item.mobileLabel ?? item.label}`;
  return item.href
    ? `<a href="${item.href}" data-nav-id="${item.id}" class="${cls}">${inner}</a>`
    : `<button type="button" data-nav-id="${item.id}" class="${cls}">${inner}</button>`;
}

function actionItem(a) {
  const cls = 'rounded-lg border border-[var(--color-cream)] bg-[var(--color-cream)] px-5 py-2 font-[family-name:var(--font-body)] font-semibold tracking-[0.02em] text-[var(--color-primary)] shadow-sm transition-colors hover:border-[var(--color-cream)]/70 hover:bg-[var(--color-primary-dark)] hover:text-[var(--color-cream)]';
  return a.href
    ? `<a href="${a.href}" class="${cls}">${a.label}</a>`
    : `<button type="button" data-action="${a.action}" class="${cls}">${a.label}</button>`;
}

function renderTop({ items, brand, actions }) {
  const links = items.map((item) => `<li>${topItem(item)}</li>`).join('');

  return `
    <div class="bg-[var(--color-primary)] text-[var(--color-cream)] border-b border-white/10">
      <div class="mx-auto flex w-full max-w-[90rem] items-center justify-between px-6 py-3.5 md:px-10">
        <a href="${brand.href}" class="flex items-center gap-2.5 font-[family-name:var(--font-heading)] text-lg font-semibold tracking-[0.04em] transition-opacity hover:opacity-90">${logo}${brand.name}</a>
        <nav aria-label="Main"><ul class="flex items-center gap-1.5 font-[family-name:var(--font-body)] text-sm font-medium tracking-[0.025em]">${links}</ul></nav>
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
  brand = { name: 'KostRumahKu', href: '/' },
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