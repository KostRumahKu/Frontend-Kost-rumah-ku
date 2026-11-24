// Daftar item menu admin.
// Sesuaikan href dengan rute di script.js.
// Bar mobile menampilkan 4 menu pertama, sisanya masuk tombol "Lainnya" (lihat admin-nav-mobile.js).
export const adminItems = [
  { id: 'dashboard',  label: 'Dashboard',  icon: 'home.webp',        href: '/admin/dashboard-admin' },
  { id: 'kamar',      label: 'Kamar',       icon: 'rooms.webp',       href: '/admin/kamar' },
  { id: 'booking',    label: 'Booking',     icon: 'booking.webp',     href: '/admin/booking' },
  { id: 'penghuni',   label: 'Penghuni',    icon: 'penghuni.webp',    href: '/admin/penghuni' },
  { id: 'tagihan',    label: 'Tagihan',     icon: 'tagihan.webp',     href: '/admin/tagihan' },
  { id: 'pembayaran', label: 'Pembayaran',  icon: 'pembayaran.webp',  href: '/admin/pembayaran' },
  { id: 'laporan',    label: 'Laporan',     icon: 'laporan.webp',     href: '/admin/laporan' },
  { id: 'pengumuman', label: 'Pengumuman',  icon: 'testimonial.webp', href: '/admin/pengumuman' },
  { id: 'profile',    label: 'Profile',     icon: 'profile.webp',     href: '/admin/profile' },
];
