// Kartu kamar untuk halaman daftar kamar admin.
import { formatRupiah } from '../utils/format.js';
import { Button } from './button.js';

const STATUS = {
  kosong:    { label: 'Kosong',    cls: 'bg-green-100 text-green-800' },
  dipesan:   { label: 'Dipesan',   cls: 'bg-amber-100 text-amber-800' },
  terisi:    { label: 'Terisi',    cls: 'bg-stone-200 text-stone-700' },
  perbaikan: { label: 'Perbaikan', cls: 'bg-red-100 text-red-800'    },
};

export const statusInfo = (s) => STATUS[s] ?? { label: s ?? '-', cls: 'bg-stone-200 text-stone-700' };

export const firstPhoto = (room) =>
  (room.foto ?? []).find((f) => typeof f === 'string' && /^https?:\/\//.test(f));

function buildPlaceholder() {
  const div = document.createElement('div');
  div.className = 'flex h-32 items-center justify-center bg-[var(--color-primary)]/10 text-sm text-[var(--color-muted)]';
  div.textContent = 'Belum ada foto';
  return div;
}

/**
 * @param {object}   room         data kamar dari API
 * @param {Function} onLihatDetail  dipanggil dengan room._id saat tombol diklik
 * @returns {HTMLElement}
 */
export function AdminRoomCard(room, onLihatDetail) {
  const status = statusInfo(room.status);
  const card = document.createElement('article');
  card.className = 'overflow-hidden rounded-xl bg-[var(--color-surface)] shadow-sm';

  // Foto
  const foto = firstPhoto(room);
  let media = buildPlaceholder();
  if (foto) {
    media = document.createElement('img');
    media.className = 'h-32 w-full object-cover';
    media.src = foto;
    media.alt = `Foto kamar ${room['nama-kamar']}`;
    media.loading = 'lazy';
    media.addEventListener('error', () => media.replaceWith(buildPlaceholder()));
  }

  // Body
  const body = document.createElement('div');
  body.className = 'p-4';

  const row = document.createElement('div');
  row.className = 'flex items-start justify-between gap-3';

  const h3 = document.createElement('h3');
  h3.className = 'font-[family-name:var(--font-heading)] text-lg font-semibold';
  h3.textContent = `Kamar ${room['nama-kamar']}`;

  const badge = document.createElement('span');
  badge.className = `rounded-full px-3 py-1 text-xs font-medium ${status.cls}`;
  badge.textContent = status.label;

  row.append(h3, badge);

  const info = document.createElement('p');
  info.className = 'mt-1 text-sm capitalize text-[var(--color-muted)]';
  info.textContent = `${room['tipe-kamar'] ?? '-'}, lantai ${room.lantai ?? '-'}`;

  const harga = document.createElement('p');
  harga.className = 'mt-3 font-semibold text-[var(--color-primary)]';
  harga.textContent = `${formatRupiah(room.harga ?? 0)} / bulan`;

  body.append(row, info, harga);

  if (room.diarsipkan) {
    const arsip = document.createElement('p');
    arsip.className = 'mt-2 text-xs font-medium text-[var(--color-muted)]';
    arsip.textContent = 'Diarsipkan';
    body.append(arsip);
  }

  body.append(
    Button({ label: 'Lihat detail', variant: 'outline', className: 'mt-4 w-full', onClick: () => onLihatDetail(room._id) })
  );

  card.append(media, body);
  return card;
}
