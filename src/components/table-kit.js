// Potongan tabel yang dipakai halaman-halaman admin: ikon aksi, isi tabel, paginasi.
import { el } from '../utils/dom.js';

export const ICON = {
  lihat: '<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>',
  ubah:  '<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5M17.5 3.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4 8.5-8.5Z"/></svg>',
  hapus: '<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg>',
  terima: '<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m5 12 5 5 9-10"/></svg>',
  tolak: '<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" d="M6 6l12 12M18 6 6 18"/></svg>',
};

/** Tombol ikon di kolom aksi. ikon dari ICON (konstanta, aman untuk innerHTML). */
export function tombolAksi(label, ikon, onClick, warna = 'text-[var(--color-primary)]') {
  const b = el('button', `rounded-lg p-1.5 transition-colors hover:bg-black/5 ${warna}`);
  b.type = 'button';
  b.setAttribute('aria-label', label);
  b.title = label;
  b.innerHTML = ikon;
  b.addEventListener('click', onClick);
  return b;
}

/**
 * Isi <tbody>.
 * kolom: [{ render(row) -> string | Node, cls? }]
 */
export function isiTabel(tbody, kolom, baris, pesanKosong = 'Tidak ada data.') {
  tbody.replaceChildren();
  if (baris.length === 0) {
    const tr = el('tr');
    const td = el('td', 'px-3 py-6 text-center text-[var(--color-muted)]', pesanKosong);
    td.colSpan = kolom.length;
    tr.append(td);
    tbody.append(tr);
    return;
  }
  baris.forEach((row) => {
    const tr = el('tr', 'border-b border-[var(--color-primary)]/10');
    kolom.forEach((k) => {
      const td = el('td', `px-3 py-3 ${k.cls ?? ''}`);
      const isi = k.render(row);
      if (isi instanceof Node) td.append(isi);
      else td.textContent = isi ?? '-';
      tr.append(td);
    });
    tbody.append(tr);
  });
}

/** Potong array untuk halaman tertentu dan kembalikan info paginasi. */
export function halamanData(data, halaman, perHalaman = 10) {
  const total = Math.max(1, Math.ceil(data.length / perHalaman));
  const h = Math.min(Math.max(halaman, 1), total);
  return { halaman: h, total, irisan: data.slice((h - 1) * perHalaman, h * perHalaman) };
}

export function renderPaging(nav, halaman, total, onUbah) {
  nav.replaceChildren();
  if (total <= 1) return;
  const tombol = (label, ke, aktif = false, aria = '') => {
    const b = el('button', `min-w-8 rounded-full px-2.5 py-1 font-medium transition-colors ${aktif ? 'bg-[var(--color-primary)] text-[var(--color-cream)]' : 'text-[var(--color-primary)] hover:bg-black/5'}`, label);
    b.type = 'button';
    if (aktif) b.setAttribute('aria-current', 'page');
    if (aria) b.setAttribute('aria-label', aria);
    b.addEventListener('click', () => onUbah(ke));
    return b;
  };
  if (halaman > 1) nav.append(tombol('‹', halaman - 1, false, 'Halaman sebelumnya'));
  for (let i = 1; i <= total; i += 1) nav.append(tombol(String(i), i, i === halaman));
  if (halaman < total) nav.append(tombol('›', halaman + 1, false, 'Halaman berikutnya'));
}
