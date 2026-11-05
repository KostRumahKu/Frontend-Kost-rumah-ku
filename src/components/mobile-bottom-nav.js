import { icon } from './icons.js';

const variants = {
  landing: {
    label: 'Navigasi utama',
  },
  tenant: {
    label: 'Navigasi penyewa',
  },
};

export const landingNavItems = [
  { id: 'beranda', label: 'Beranda', icon: 'home', href: '#beranda' },
  { id: 'kamar', label: 'Kamar', icon: 'rooms', href: 'kamar' },
  { id: 'fasilitas', label: 'Fasilitas', icon: 'facilities', href: 'fasilitas' },
  { id: 'akun', label: 'Akun', icon: 'account', href: 'auth/login' },
];

function renderNav({ items, variant, variantName }) {
  const links = items.map((item) => {
    const content = icon(item.icon ?? 'placeholder', 'mobile-bottom-nav__icon');
    const common = `data-nav-id="${item.id}" aria-label="${item.label}" class="mobile-bottom-nav__item"`;

    return item.href
      ? `<a href="${item.href}" ${common}>${content}</a>`
      : `<button type="button" ${common}>${content}</button>`;
  }).join('');

  return `
    <nav aria-label="${variant.label}" class="mobile-bottom-nav" data-variant="${variantName}" data-visibility="hidden">
      ${links}
    </nav>`;
}

export function mountMobileBottomNav({
  rootEl,
  variant: variantName = 'landing',
  items = landingNavItems,
  active = items[0]?.id,
  onSelect,
}) {
  const variant = variants[variantName];
  if (!variant) throw new Error(`Unknown mobile bottom nav variant: ${variantName}`);

  rootEl.innerHTML = renderNav({ items, variant, variantName });
  const nav = rootEl.querySelector('nav');
  let visible = false;
  let lastScrollY = window.scrollY;
  let scrollFrame = 0;

  nav.inert = true;

  function setVisible(nextVisible) {
    if (visible === nextVisible && !nav.inert) return;
    visible = nextVisible;
    nav.dataset.visibility = visible ? 'visible' : 'hidden';
    nav.inert = !visible;
    if (visible) nav.removeAttribute('aria-hidden');
    else nav.setAttribute('aria-hidden', 'true');
  }

  function handleScroll() {
    if (scrollFrame) return;
    scrollFrame = window.requestAnimationFrame(() => {
      scrollFrame = 0;
      const currentY = Math.max(0, window.scrollY);
      const distance = currentY - lastScrollY;
      if (currentY <= 24) setVisible(true);
      else if (distance > 8) setVisible(false);
      else if (distance < -8) setVisible(true);
      if (Math.abs(distance) > 8) lastScrollY = currentY;
    });
  }

  const showOnFocus = () => setVisible(true);
  window.addEventListener('scroll', handleScroll, { passive: true });
  nav.addEventListener('focusin', showOnFocus);
  window.requestAnimationFrame(() => setVisible(true));

  function setActive(id) {
    nav.querySelectorAll('[data-nav-id]').forEach((el) => {
      const isActive = el.dataset.navId === id;
      if (isActive) el.setAttribute('aria-current', 'page');
      else el.removeAttribute('aria-current');
    });
  }

  nav.addEventListener('click', (event) => {
    const item = event.target.closest('[data-nav-id]');
    if (!item) return;
    setActive(item.dataset.navId);
    if (item.tagName === 'BUTTON') onSelect?.(item.dataset.navId);
  });

  setActive(active);
  return {
    setActive,
    destroy() {
      window.removeEventListener('scroll', handleScroll);
      nav.removeEventListener('focusin', showOnFocus);
      if (scrollFrame) window.cancelAnimationFrame(scrollFrame);
      nav.remove();
      rootEl.replaceChildren();
    },
  };
}
