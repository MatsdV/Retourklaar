// User interface: input, rendering the list and pages, and the controls.

// ---------- input ----------
const fileInput = $('file');
$('drop').onclick = () => fileInput.click();
$('drop').onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); } };
fileInput.onchange = () => { intake([...fileInput.files], null); fileInput.value = ''; };

let dragDepth = 0;
const carriesFiles = e => [...(e.dataTransfer?.types || [])].includes('Files');
const setDragging = on => {
  document.body.classList.toggle('dragging', on);
  folder.classList.toggle('open', on);
};
window.addEventListener('dragenter', e => {
  if (!carriesFiles(e)) return;
  e.preventDefault();
  if (dragDepth++ === 0) setDragging(true);
});
window.addEventListener('dragleave', e => {
  if (!carriesFiles(e)) return;
  if (--dragDepth <= 0) { dragDepth = 0; setDragging(false); }
});
window.addEventListener('dragover', e => { if (carriesFiles(e)) e.preventDefault(); });
window.addEventListener('drop', e => {
  if (!carriesFiles(e)) return;
  e.preventDefault();
  dragDepth = 0;
  intake([...e.dataTransfer.files], { x: e.clientX, y: e.clientY });
});
document.addEventListener('paste', e => {
  const files = [...e.clipboardData.items]
    .filter(i => i.type.startsWith('image/') || i.type === 'application/pdf')
    .map(i => i.getAsFile());
  if (files.length) intake(files, null);
});

const isPdf = f => f.type === 'application/pdf' || /\.pdf$/i.test(f.name || '');
const isImage = f => f.type.startsWith('image/');

let queue = Promise.resolve();
function intake(files, point) {
  queue = queue.then(() => intakeNow(files, point)).catch(console.error);
}

async function intakeNow(files, point) {
  $('error').textContent = '';
  const usable = files.filter(f => isPdf(f) || isImage(f));
  if (!usable.length) {
    setDragging(false);
    if (files.length) {
      if (point) await evaporate(point);
      $('error').textContent = 'Dit bestand wordt niet herkend. Gebruik een PDF, PNG of JPG.';
    }
    return;
  }

  folder.classList.add('open');
  await dropIntoFolder(usable.length, point);
  document.body.classList.remove('dragging');
  folder.classList.remove('open');
  bounce(folder);

  document.body.classList.add('busy');
  const before = items.length;
  const failed = [];
  for (const file of usable) {
    try { isPdf(file) ? await addPdf(file) : await addImage(file); }
    catch (err) { console.error(err); failed.push(file.name || 'bestand'); }
  }
  document.body.classList.remove('busy');
  if (failed.length) $('error').textContent = `Kon ${failed.join(', ')} niet openen. Probeer het bestand opnieuw te downloaden.`;

  const added = items.slice(before).map(it => it.id);
  if (!added.length) { folder.classList.remove('filled'); return; }
  await render({ fromFolder: added, enterWorkspace: !document.body.classList.contains('has-files') });
}

// ---------- render ----------
let renderToken = 0;
async function render({ fromFolder = [], enterWorkspace = false } = {}) {
  const token = ++renderToken;
  if (!items.length) { leaveWorkspace(); return; }

  // Resolve every image first so the swap happens in one frame
  const plan = layout();
  const urls = new Map();
  for (const page of plan.pages) for (const p of page) urls.set(p, await imageUrl(p.item, p.rot));
  if (token !== renderToken) return;

  document.querySelectorAll('.ghost').forEach(g => g.remove());
  const old = snapshotLabels();
  const commit = () => {
    if (enterWorkspace) document.body.classList.add('has-files');
    renderList();
    renderPages(plan, urls, fromFolder);
  };
  if (enterWorkspace && animate() && document.startViewTransition) {
    await document.startViewTransition(commit).finished.catch(() => {});
  } else commit();
  if (token !== renderToken) return;
  playLayout(old, fromFolder);
}

function renderPages({ pages, margin, shrunk }, urls, hiddenIds) {
  const n = items.length;
  const p = pages.length;
  $('summary').innerHTML = shrunk
    ? `<span class="warn">${shrunk === 1 ? 'Eén label is' : shrunk + ' labels zijn'} te groot voor A4 en iets verkleind.</span>` : '';
  $('previewCount').textContent = `${p} ${p === 1 ? 'pagina' : "pagina's"}`;

  const main = $('pages');
  main.innerHTML = '';
  pages.forEach((page, i) => {
    const wrap = document.createElement('div');
    wrap.className = 'sheet-wrap';
    wrap.innerHTML = `<div class="page-label">Pagina ${i + 1} van ${pages.length}</div>`;
    const sheet = document.createElement('div');
    sheet.className = 'sheet' + ($('cut').checked ? ' with-cut' : '');
    // cut line on the outer edge of each label's margin
    sheet.style.setProperty('--cut', margin + 'mm');
    for (const b of page) {
      const el = document.createElement('div');
      el.className = 'label';
      el.dataset.id = b.item.id;
      el.style.cssText = `left:${margin + b.x}mm;top:${margin + b.y}mm;width:${b.w}mm;height:${b.h}mm`;
      if (hiddenIds.includes(b.item.id) && animate()) el.style.visibility = 'hidden';
      const img = new Image();
      img.src = urls.get(b);
      img.alt = b.item.name;
      el.appendChild(img);
      sheet.appendChild(el);
    }
    wrap.appendChild(sheet);
    main.appendChild(wrap);
  });
  fitPreview();
}

const trashIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg>';

function renderList() {
  const list = $('list');
  const open = new Set([...list.querySelectorAll('details[open]')].map(d => +d.dataset.id));
  list.innerHTML = '';
  for (const it of items) {
    const nat = naturalWidth(it);
    const h = Math.round(it.widthMm * aspect(it));
    const el = document.createElement('details');
    el.className = 'item';
    el.dataset.id = it.id;
    el.open = open.has(it.id);
    el.innerHTML = `
      <summary>
        <img class="thumb" alt="">
        <span class="name"></span>
        <button class="trash" type="button">${trashIcon}</button>
      </summary>
      <div class="item-details">
        <div>${nat
          ? `Formaat ${Math.round(it.widthMm)} × ${h} mm` + (Math.abs(it.widthMm - nat) > 0.5 ? ' (aangepast)' : ' — precies zoals in de PDF')
          : `Formaat geschat op ${Math.round(it.widthMm)} × ${h} mm. Bij een afbeelding is de echte maat onbekend.`}</div>
        <label class="row">Breedte <input type="number" min="20" max="297" step="1" inputmode="numeric"> mm
          ${nat && Math.abs(it.widthMm - nat) > 0.5 ? '<button type="button" class="pill-button reset">Terug naar ware grootte</button>' : ''}
        </label>
      </div>`;
    imageUrl(it, 0).then(u => el.querySelector('.thumb').src = u);
    el.querySelector('.name').textContent = it.name;
    el.querySelector('.name').title = it.name;
    const trash = el.querySelector('.trash');
    trash.setAttribute('aria-label', `Verwijder ${it.name}`);
    trash.onclick = e => { e.preventDefault(); e.stopPropagation(); removeItem(it, el); };
    const input = el.querySelector('input');
    input.value = Math.round(it.widthMm);
    input.onchange = () => { const v = parseFloat(input.value); if (v > 0) { it.widthMm = v; render(); } };
    const reset = el.querySelector('.reset');
    if (reset) reset.onclick = () => { it.widthMm = nat; render(); };
    const highlight = on => document.querySelectorAll(`.label[data-id="${it.id}"]`).forEach(l => l.classList.toggle('hl', on));
    el.querySelector('summary').onmouseenter = () => highlight(true);
    el.querySelector('summary').onmouseleave = () => highlight(false);
    list.appendChild(el);
  }
}

async function removeItem(it, row) {
  if (animate()) {
    row.style.overflow = 'hidden';
    await row.animate(
      [{ height: row.offsetHeight + 'px', opacity: 1 }, { height: '0px', opacity: 0 }],
      { duration: 260, easing: 'cubic-bezier(.4,0,.2,1)' }).finished;
  }
  items = items.filter(x => x !== it);
  render();
}

function leaveWorkspace() {
  renderToken++;
  const commit = () => {
    document.body.classList.remove('has-files');
    $('pages').innerHTML = '';
    $('list').innerHTML = '';
  };
  folder.classList.remove('filled');
  if (animate() && document.startViewTransition) document.startViewTransition(commit);
  else commit();
}

// ---------- controls ----------
$('trim').onchange = () => {
  // keep PDFs at true size when toggling the trim
  for (const it of items) if (it.pxPerMm) it.widthMm = naturalWidth(it);
  render();
};
['rotate', 'cut', 'margin'].forEach(id => $(id).onchange = () => render());
$('clear').onclick = () => { items = []; render(); };
$('print').onclick = () => window.print();
$('previewToggle').onclick = () => {
  const main = $('preview');
  const open = main.classList.toggle('expanded');
  $('previewToggle').setAttribute('aria-expanded', open);
  if (!open) return;
  fitPreview();
  if (animate()) $('pages').animate([{ opacity: 0, transform: 'translateY(-8px)' }, { opacity: 1, transform: 'none' }],
    { duration: 300, easing: 'cubic-bezier(.22,1,.36,1)' });
};

// ---------- fit preview to screen ----------
function fitPreview() {
  const main = $('pages');
  const avail = main.clientWidth;
  if (!avail) return;
  for (const wrap of main.querySelectorAll('.sheet-wrap')) {
    const sheet = wrap.querySelector('.sheet');
    const label = wrap.querySelector('.page-label');
    const w = sheet.offsetWidth, h = sheet.offsetHeight;
    const s = Math.min(1, avail / w, (innerHeight - 110) / h);
    sheet.style.transform = `scale(${s})`;
    wrap.style.width = w * s + 'px';
    wrap.style.height = h * s + label.offsetHeight + 8 + 'px';
  }
}
window.addEventListener('resize', fitPreview);
