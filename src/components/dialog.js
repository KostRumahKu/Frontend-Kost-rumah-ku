// Dialog dan dialog-form reusable, dibuat lewat DOM API (tanpa innerHTML dari data).
import { el, setMessage, emailRegex, phoneRegex, KELAS_INPUT } from '../utils/dom.js';
import { buttonClass } from './button.js';

const SVG_TUTUP =
  '<svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" d="M6 6l12 12M18 6 6 18" /></svg>';

let urut = 0;

/** Dialog kosong: isi lewat `body` dan `footer`. */
export function Dialog({ title = '', lebar = 'max-w-lg' } = {}) {
  const id = `dlg-${(urut += 1)}`;
  const dlg = el('dialog', `m-auto max-h-[90dvh] w-[calc(100%-2rem)] ${lebar} overflow-y-auto rounded-2xl bg-[var(--color-surface)] p-0 text-[var(--color-ink)] shadow-xl backdrop:bg-black/50`);
  dlg.setAttribute('aria-labelledby', `${id}-judul`);

  const wrap = el('div', 'p-5 sm:p-6');
  const head = el('div', 'flex items-start justify-between gap-3');
  const h2 = el('h2', 'font-[family-name:var(--font-heading)] text-xl font-semibold', title);
  h2.id = `${id}-judul`;
  const tutup = el('button', 'rounded-lg p-2 hover:bg-black/5');
  tutup.type = 'button';
  tutup.setAttribute('aria-label', 'Tutup');
  tutup.innerHTML = SVG_TUTUP; // konstanta, bukan input pengguna
  tutup.addEventListener('click', () => dlg.close());
  head.append(h2, tutup);

  const error = el('p', 'mt-4 hidden rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800');
  error.setAttribute('role', 'alert');
  const body = el('div', 'mt-4');
  const footer = el('div', '');

  wrap.append(head, error, body, footer);
  dlg.append(wrap);
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  document.body.append(dlg);

  return {
    dlg, body, footer,
    setTitle: (t) => { h2.textContent = t; },
    setError: (m) => setMessage(error, m),
    open: () => { setMessage(error, ''); dlg.showModal(); },
    close: () => dlg.close(),
  };
}

/** Baris "label: nilai" untuk dialog detail. nilai boleh string atau Node. */
export function DaftarInfo(baris, kelas = 'bg-[var(--color-cream)]') {
  const dl = el('dl', `grid grid-cols-3 gap-x-3 gap-y-3 rounded-xl p-4 text-sm ${kelas}`);
  baris.forEach(([label, nilai]) => {
    const dd = el('dd', 'col-span-2 break-words font-medium text-[var(--color-ink)]');
    if (nilai instanceof Node) dd.append(nilai);
    else dd.textContent = nilai === undefined || nilai === null || nilai === '' ? '-' : String(nilai);
    dl.append(el('dt', 'self-center text-[var(--color-muted)]', label), dd);
  });
  return dl;
}

/**
 * Dialog berisi form.
 * fields: [{ name, label, type?, required?, options?, placeholder?, hint?, min?, readonly? }]
 *   type: text | email | tel | number | date | textarea | select
 * onSubmit(values) -> Promise; bila melempar error, pesannya tampil di dialog.
 * open(nilaiAwal, { title, submitLabel }) membuka dialog dengan isian awal.
 */
export function FormDialog({ title, fields, submitLabel = 'Simpan', onSubmit, catatan = '' }) {
  const d = Dialog({ title });
  const form = el('form', 'space-y-4');
  form.noValidate = true;
  const inputs = {};

  if (catatan) form.append(el('p', 'rounded-lg bg-[var(--color-cream)] px-4 py-3 text-sm text-[var(--color-muted)]', catatan));

  fields.forEach((f) => {
    const wrap = el('div');
    const id = `f-${f.name}-${Math.random().toString(36).slice(2, 7)}`;
    const label = el('label', 'mb-1.5 block text-sm font-medium', f.label);
    label.htmlFor = id;
    if (!f.required) label.append(el('span', 'ml-1 font-normal text-[var(--color-muted)]', '(opsional)'));

    let input;
    if (f.type === 'textarea') {
      input = el('textarea', KELAS_INPUT);
      input.rows = f.rows ?? 4;
    } else if (f.type === 'select') {
      input = el('select', KELAS_INPUT);
      (f.options ?? []).forEach((o) => input.append(new Option(o.label, o.value)));
    } else {
      input = el('input', KELAS_INPUT);
      input.type = f.type ?? 'text';
      if (f.min !== undefined) input.min = f.min;
      if (input.type === 'number') input.inputMode = 'numeric';
    }
    input.id = id;
    input.name = f.name;
    if (f.placeholder) input.placeholder = f.placeholder;
    input.autocomplete = 'off';
    input.addEventListener('input', () => input.removeAttribute('aria-invalid'));
    inputs[f.name] = input;

    wrap.append(label, input);
    if (f.hint) wrap.append(el('p', 'mt-1 text-xs text-[var(--color-muted)]', f.hint));
    form.append(wrap);
  });

  const aksi = el('div', 'flex justify-end gap-3 pt-2');
  const batal = el('button', buttonClass('outline'), 'Batal');
  batal.type = 'button';
  batal.addEventListener('click', () => d.close());
  const kirim = el('button', buttonClass('primary'), submitLabel);
  kirim.type = 'submit';
  aksi.append(batal, kirim);
  form.append(aksi);
  d.body.append(form);

  const gagal = (input, pesan) => {
    input.setAttribute('aria-invalid', 'true');
    d.setError(pesan);
    input.focus();
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    d.setError('');
    const nilai = {};

    for (const f of fields) {
      const input = inputs[f.name];
      input.removeAttribute('aria-invalid');
      const v = input.value.trim();
      if (f.required && !v) return gagal(input, `${f.label} wajib diisi.`);
      if (v && f.type === 'email' && !emailRegex.test(v)) return gagal(input, 'Format email tidak valid.');
      if (v && f.type === 'tel' && !phoneRegex.test(v)) return gagal(input, `${f.label} tidak valid.`);
      if (v && f.type === 'number') {
        const n = Number(v);
        if (!Number.isFinite(n) || (f.min !== undefined && n < f.min)) return gagal(input, `${f.label} tidak valid.`);
        nilai[f.name] = n;
        continue;
      }
      nilai[f.name] = v;
    }

    const labelAsli = kirim.textContent;
    kirim.disabled = true;
    kirim.textContent = 'Menyimpan...';
    try {
      await onSubmit(nilai);
      d.close();
    } catch (err) {
      d.setError(err.message);
    } finally {
      kirim.disabled = false;
      kirim.textContent = labelAsli;
    }
  });

  return {
    dlg: d.dlg,
    close: d.close,
    open(awal = {}, opsi = {}) {
      form.reset();
      fields.forEach((f) => {
        const input = inputs[f.name];
        input.removeAttribute('aria-invalid');
        input.readOnly = Boolean(f.readonly);
        input.value = awal[f.name] ?? f.value ?? '';
      });
      if (opsi.title) d.setTitle(opsi.title);
      kirim.textContent = opsi.submitLabel ?? submitLabel;
      d.open();
    },
  };
}
