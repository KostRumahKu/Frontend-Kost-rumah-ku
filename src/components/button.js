
const CLASSES = {
  // Tombol utama — solid, dipakai untuk aksi utama
  primary: 'rounded-lg bg-[var(--color-primary)] px-5 py-2.5 text-sm font-medium text-[var(--color-cream)] transition-colors hover:bg-[var(--color-primary-dark)] disabled:cursor-not-allowed disabled:opacity-60',

  // Tombol sekunder — transparan, border tipis, hover berwarna coklat lembut
  outline: 'rounded-lg border border-[var(--color-primary)]/30 bg-transparent px-5 py-2.5 text-sm font-medium text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)]/10 hover:border-[var(--color-primary)]/60 disabled:cursor-not-allowed disabled:opacity-60',

  // Tombol bahaya — transparan, border merah tipis, hover merah lembut
  danger: 'rounded-lg border border-red-300 bg-transparent px-5 py-2.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 hover:border-red-400 disabled:cursor-not-allowed disabled:opacity-60',
};

export function buttonClass(variant, extra = '') {
  const base = CLASSES[variant] ?? CLASSES.outline;
  return extra ? `${base} ${extra}` : base;
}

export function Button({ label, variant = 'outline', onClick, href, type = 'button', className = '' }) {
  if (href) {
    const a = document.createElement('a');
    a.href = href;
    a.className = buttonClass(variant, className);
    a.textContent = label;
    return a;
  }

  const btn = document.createElement('button');
  btn.type = type;
  btn.className = buttonClass(variant, className);
  btn.textContent = label;
  if (onClick) btn.addEventListener('click', onClick);
  return btn;
}

export function hydrateButtons(root = document) {
  root.querySelectorAll('[data-btn]').forEach((el) => {
    const variant = el.dataset.btn;
    const extra   = el.dataset.btnExtra ?? '';
    el.className  = buttonClass(variant, extra);
  });
}
