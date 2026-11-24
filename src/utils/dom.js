// Helper DOM kecil yang dipakai bersama oleh halaman admin.
export const $ = (id) => document.getElementById(id);

export function el(tag, className = '', text = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

export function setMessage(node, message) {
  node.textContent = message;
  node.classList.toggle('hidden', !message);
}

/** Tampilkan pesan sukses/error di elemen #page-success dan #page-error. */
export function tampilPesan(jenis, teks) {
  setMessage($('page-success'), jenis === 'ok' ? teks : '');
  setMessage($('page-error'), jenis === 'error' ? teks : '');
}

export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const phoneRegex = /^[0-9+\s-]{8,16}$/;

export const formatTanggalSaja = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '-' : new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(d);
};

export const formatTanggalRingkas = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '-' : new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(d);
};

export const formatBulan = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '-' : new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(d);
};

/** Ambil URL http(s) pertama dari string atau array, selain itu null (cegah javascript: dll). */
export const urlAman = (v) => {
  const list = Array.isArray(v) ? v : [v];
  return list.find((x) => typeof x === 'string' && /^https?:\/\//.test(x)) ?? null;
};

export const KELAS_INPUT =
  'w-full rounded-lg border border-[var(--color-primary)]/30 bg-white px-3 py-2.5 text-sm placeholder:text-[var(--color-muted)]/70 focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50 aria-[invalid=true]:border-red-700';

export const KELAS_FILTER =
  'rounded-lg border border-[var(--color-primary)]/30 bg-white px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50';

/** Lencana status berwarna. warna: 'hijau' | 'kuning' | 'merah' | 'abu' */
const WARNA = {
  hijau: 'bg-green-100 text-green-800',
  kuning: 'bg-amber-100 text-amber-800',
  merah: 'bg-red-100 text-red-800',
  abu: 'bg-stone-200 text-stone-700',
};
export const badge = (label, warna = 'abu') =>
  el('span', `inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${WARNA[warna] ?? WARNA.abu}`, label);

/** Pasang perilaku tutup (klik backdrop dan tombol [data-close]) ke dialog statis di HTML. */
export function pasangDialog(dlg) {
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  dlg.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => dlg.close()));
}

/** Penyaring sederhana: true bila semua kata kunci ada di gabungan teks. */
export const cocok = (kata, ...bagian) =>
  !kata || bagian.join(' ').toLowerCase().includes(kata.toLowerCase());
