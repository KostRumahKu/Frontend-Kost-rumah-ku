// Ikon SVG sederhana untuk navbar (bottom bar mobile).
// Semua ikon memakai currentColor agar mengikuti warna teks parent.

const icons = {
  home: '<path d="M12 3 2 12h3v8h5v-5h4v5h5v-8h3L12 3Z" />',
  rooms: '<path d="M21 11V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v3a2 2 0 0 0-2 2v5h2v2h2v-2h12v2h2v-2h2v-5a2 2 0 0 0-2-2Zm-2 0H5V8h14Z" />',
  facilities: '<path d="M12 4C7 4 2.7 6.1 0 9.4l1.5 1.3C3.8 7.9 7.6 6 12 6s8.2 1.9 10.5 4.7L24 9.4C21.3 6.1 17 4 12 4Zm0 4c-3.3 0-6.3 1.3-8.5 3.5l1.5 1.5C7 11 9.4 10 12 10s5 1 7 3l1.5-1.5C18.3 9.3 15.3 8 12 8Zm0 4c-1.9 0-3.6.8-4.8 2l1.5 1.5c.9-.9 2-1.5 3.3-1.5s2.4.6 3.3 1.5l1.5-1.5C15.6 12.8 13.9 12 12 12Zm0 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" />',
  testimonial: '<path d="m12 2 3 6.5 7 .9-5 4.8 1.3 7L12 18l-6.3 3.2L7 14.2 2 9.4l7-.9L12 2Z" />',
  location: '<path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z" />',
  contact: '<path d="M6.6 10.8a15.5 15.5 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.2 11.5 11.5 0 0 0 3.6.6 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11.5 11.5 0 0 0 .6 3.6 1 1 0 0 1-.2 1l-2.3 2.2Z" />',
};

/**
 * Kembalikan markup SVG untuk nama ikon yang diberikan.
 * @param {string} name  nama ikon (lihat objek `icons` di atas)
 * @returns {string}    string SVG siap dipakai di innerHTML
 */
export function icon(name) {
  const path = icons[name] ?? '';
  return `<svg class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${path}</svg>`;
}
