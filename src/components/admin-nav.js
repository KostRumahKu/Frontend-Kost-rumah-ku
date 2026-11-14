// Pintu masuk tipis — re-export agar semua halaman admin tidak perlu ubah import.
export { adminItems } from './admin-nav-items.js';
import { mountAdminSidebar } from './admin-nav-desktop.js';
import { mountAdminBottomNav } from './admin-nav-mobile.js';
import { adminItems } from './admin-nav-items.js';

/**
 * Memasang sidebar (desktop) dan bar bawah (mobile) sekaligus.
 * Signature sama persis dengan versi lama agar semua halaman admin tidak perlu diubah.
 *
 * @param {object}   opts
 * @param {Element}  opts.sidebarEl  wadah sidebar desktop
 * @param {Element}  opts.bottomEl   wadah bar bawah mobile
 * @param {Array}    [opts.items]    daftar menu, default: adminItems
 * @param {object}   [opts.brand]    { name, href }
 * @param {string}   opts.active     id menu yang aktif
 * @param {Function} [opts.onLogout]
 */
export function mountAdminNav({
  sidebarEl,
  bottomEl,
  items = adminItems,
  brand = { name: 'KostRumahKu', href: '/' },
  active,
  onLogout,
}) {
  mountAdminSidebar({ el: sidebarEl, items, brand, active, onLogout });
  mountAdminBottomNav({ el: bottomEl, items, active });
}
