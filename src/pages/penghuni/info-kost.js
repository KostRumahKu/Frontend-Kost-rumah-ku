import { mountPenghuniNav } from '../../components/penghuni-nav.js';
import { requireRole, logout } from '../../utils/auth-guard.js';
import { $, urlAman } from '../../utils/dom.js';
import { getSemuaPeraturan } from '../../services/penyewa-service.js';

const sesi = requireRole('penyewa');
if (sesi) init();

function init() {
  mountPenghuniNav({
    sidebarEl: $('sidebar'),
    bottomEl:  $('bottom-nav'),
    active:    'infokost',
    onLogout:  logout,
  });
  $('logout-mobile').addEventListener('click', logout);

  document.querySelectorAll('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', () => {
      navigator.clipboard?.writeText(btn.dataset.copy ?? '');
      const awal = btn.textContent;
      btn.textContent = 'Disalin';
      setTimeout(() => { btn.textContent = awal; }, 1500);
    });
  });

  muatPeraturan();
}

async function muatPeraturan() {
  const skeleton = $('peraturan-skeleton');
  const listEl   = $('peraturan-list');
  const kosongEl = $('peraturan-kosong');

  try {
    const data = await getSemuaPeraturan();
    const list = Array.isArray(data)
      ? data
      : (Array.isArray(data?.peraturan) ? data.peraturan : []);

    skeleton.classList.add('hidden');

    if (list.length === 0) {
      kosongEl.classList.remove('hidden');
      return;
    }

    listEl.replaceChildren(...list.map((item, idx) => {
      const li = document.createElement('li');
      li.className = 'flex items-start gap-3 rounded-xl bg-[var(--color-cream)]/55 p-3.5';

      const num = document.createElement('span');
      num.className = 'flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-xs font-semibold text-[var(--color-cream)]';
      num.textContent = String(idx + 1);

      const content = document.createElement('div');
      content.className = 'min-w-0 flex-1';

      const desc = document.createElement('p');
      desc.className = 'whitespace-pre-line text-sm text-[var(--color-ink)]';
      desc.textContent = item.deskripsi ?? item.isi ?? item.judul ?? '-';
      content.append(desc);

      const imgUrl = urlAman(item.gambar);
      if (imgUrl) {
        const img = document.createElement('img');
        img.src = imgUrl;
        img.alt = 'Gambar peraturan kost';
        img.loading = 'lazy';
        img.className = 'mt-2.5 max-h-40 rounded-lg object-cover';
        img.addEventListener('error', () => img.remove());
        content.append(img);
      }

      li.append(num, content);
      return li;
    }));

    listEl.classList.remove('hidden');
  } catch {
    skeleton.classList.add('hidden');
    kosongEl.classList.remove('hidden');
  }
}
