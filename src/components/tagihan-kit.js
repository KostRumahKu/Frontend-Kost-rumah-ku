// Bantuan bersama untuk halaman Tagihan dan Pembayaran (data dari /api/admin/tagihan).
// Bentuk data: nomor-tagihan, bulan-tagihan, jumlah-tagihan, tanggal-jatuh-tempo, status ('lunas', dst),
// nama-penyewa, id-pengguna {_id,nama-lengkap,email,nomor-telepon}, id-kamar {_id,nama-kamar,...},
// bukti-pembayaran (URL), metode-pembayaran, catatan-admin.
import { Button } from './button.js';
import { Dialog, DaftarInfo, FormDialog } from './dialog.js';
import { badge, el, urlAman, formatTanggalSaja } from '../utils/dom.js';
import { formatRupiah } from '../utils/format.js';
import { validasiTagihan } from '../services/admin-service.js';

export const sudahBayar = (t) => t.status === 'lunas';
export const ditolak = (t) => /tolak/i.test(t.status ?? '');
// Menunggu validasi: status menyebutkannya, atau penyewa sudah mengunggah bukti tetapi belum lunas/ditolak.
export const menungguValidasi = (t) =>
  /menunggu|validasi|verifik/i.test(t.status ?? '') || (!sudahBayar(t) && !ditolak(t) && Boolean(t['bukti-pembayaran']));
export const terlambat = (t) =>
  !sudahBayar(t) && !menungguValidasi(t) && (t.status === 'terlambat' || new Date(t['tanggal-jatuh-tempo']) < new Date());

export function badgeStatus(t) {
  if (sudahBayar(t)) return badge('Lunas', 'hijau');
  if (menungguValidasi(t)) return badge('Menunggu validasi', 'kuning');
  if (ditolak(t)) return badge('Ditolak', 'merah');
  return terlambat(t) ? badge('Terlambat', 'merah') : badge('Belum dibayar', 'kuning');
}

export const penyewa = (t) => t['nama-penyewa'] ?? t['id-pengguna']?.['nama-lengkap'] ?? '-';
export const kamar = (t) => {
  const k = t['id-kamar'];
  return k && typeof k === 'object' ? `Kamar ${k['nama-kamar'] ?? k._id}` : '-';
};
export const idPenyewa = (t) => (t['id-pengguna'] && typeof t['id-pengguna'] === 'object' ? t['id-pengguna']._id : t['id-pengguna']);

/**
 * Dialog detail tagihan + tombol terima/tolak bukti pembayaran.
 * @param {object} opsi { onSelesai(pesan) }  dipanggil setelah validasi berhasil
 */
export function buatDialogTagihan({ onSelesai }) {
  const detail = Dialog({ title: 'Detail tagihan', lebar: 'max-w-xl' });
  let aktif = null;
  let status = null;

  const formCatatan = FormDialog({
    title: 'Validasi pembayaran',
    fields: [{ name: 'catatan', label: 'Catatan untuk penyewa', type: 'textarea', rows: 3 }],
    onSubmit: async ({ catatan }) => {
      await validasiTagihan(aktif._id, status, catatan || '-');
      detail.close();
      onSelesai(status === 'disetujui'
        ? `Pembayaran ${aktif['nomor-tagihan']} diterima.`
        : `Pembayaran ${aktif['nomor-tagihan']} ditolak.`);
    },
  });

  function mulaiValidasi(t, st) {
    aktif = t; status = st;
    formCatatan.open({}, {
      title: `${st === 'disetujui' ? 'Terima' : 'Tolak'} pembayaran ${t['nomor-tagihan']}`,
      submitLabel: st === 'disetujui' ? 'Terima pembayaran' : 'Tolak pembayaran',
    });
  }

  function buka(t) {
    detail.setTitle(`Tagihan ${t['nomor-tagihan'] ?? ''}`.trim());
    detail.body.replaceChildren();

    const foto = urlAman(t['bukti-pembayaran']);
    if (foto) {
      const a = el('a', 'mb-4 block');
      a.href = foto; a.target = '_blank'; a.rel = 'noopener noreferrer';
      const img = el('img', 'max-h-72 w-full rounded-xl bg-white object-contain');
      img.src = foto; img.alt = `Bukti pembayaran ${penyewa(t)}`; img.loading = 'lazy';
      img.addEventListener('error', () => a.replaceWith(el('p', 'mb-4 rounded-xl bg-[var(--color-cream)] px-4 py-3 text-sm text-[var(--color-muted)]', 'Bukti pembayaran tidak dapat dimuat.')));
      a.append(img);
      detail.body.append(a);
    } else {
      detail.body.append(el('p', 'mb-4 rounded-xl bg-[var(--color-cream)] px-4 py-3 text-sm text-[var(--color-muted)]', 'Belum ada bukti pembayaran yang diunggah.'));
    }

    detail.body.append(DaftarInfo([
      ['Penyewa', penyewa(t)],
      ['Kontak', t['id-pengguna']?.['nomor-telepon']],
      ['Kamar', kamar(t)],
      ['Periode', t['bulan-tagihan']],
      ['Jumlah', formatRupiah(t['jumlah-tagihan'])],
      ['Jatuh tempo', formatTanggalSaja(t['tanggal-jatuh-tempo'])],
      ['Metode', t['metode-pembayaran'] ?? '-'],
      ['Catatan admin', t['catatan-admin'] ?? '-'],
      ['Status', badgeStatus(t)],
    ]));

    detail.footer.replaceChildren();
    if (menungguValidasi(t)) {
      detail.footer.className = 'mt-5 flex flex-wrap justify-end gap-2 border-t border-[var(--color-primary)]/10 pt-5';
      detail.footer.append(
        Button({ label: 'Tolak', variant: 'danger', onClick: () => mulaiValidasi(t, 'ditolak') }),
        Button({ label: 'Terima pembayaran', variant: 'primary', onClick: () => mulaiValidasi(t, 'disetujui') }),
      );
    }
    detail.open();
  }

  return { buka, mulaiValidasi };
}
