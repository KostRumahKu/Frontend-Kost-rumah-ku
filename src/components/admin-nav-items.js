// Daftar item menu admin.
// Sesuaikan href dengan rute di script.js.
// Bar mobile muat sekitar 5 menu; kalau menunya bertambah, perlu tombol "Lainnya".
export const adminItems = [
  { id: 'dashboard',  label: 'Dashboard',  icon: 'home.webp',        href: '/admin/dashboard-admin' },
  { id: 'kamar',      label: 'Kamar',       icon: 'rooms.webp',       href: '/admin/kamar' },
  { id: 'penghuni',   label: 'Penghuni',    icon: 'contact.webp',     href: '/admin/penghuni' },
  { id: 'pembayaran', label: 'Pembayaran',  icon: 'facilities.webp',  href: '/admin/pembayaran' },
  { id: 'pengumuman', label: 'Pengumuman',  icon: 'testimonial.webp', href: '/admin/pengumuman' },
];
