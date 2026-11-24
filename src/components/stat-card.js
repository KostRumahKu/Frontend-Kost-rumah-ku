// Kartu ringkasan statistik untuk dashboard admin.

/**
 * @param {object} opts
 * @param {string} opts.label  judul kartu
 * @param {string|number} opts.value  nilai utama
 * @param {string} [opts.note]  catatan kecil di bawah nilai
 * @returns {HTMLElement}
 */
export function StatCard({ label, value, note = '' }) {
  const card = document.createElement('article');
  card.className = 'rounded-xl bg-[var(--color-surface)] p-4 shadow-sm md:p-5';

  const l = document.createElement('p');
  l.className = 'text-sm text-[var(--color-muted)]';
  l.textContent = label;

  const v = document.createElement('p');
  v.className = 'mt-2 break-words font-[family-name:var(--font-heading)] text-2xl font-semibold sm:text-3xl text-[var(--color-primary)]';
  v.textContent = value;

  const n = document.createElement('p');
  n.className = 'mt-1 text-xs text-[var(--color-muted)]';
  n.textContent = note;

  card.append(l, v, n);
  return card;
}
