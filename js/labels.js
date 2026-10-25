// Turning dropped PDFs and images into label items (rendering, trimming, rotating).

// pdf.js worker: load via blob so it also works when this file is opened from disk
const workerReady = (async () => {
  const url = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  try {
    const blob = new Blob([await (await fetch(url)).text()], { type: 'text/javascript' });
    pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(blob);
  } catch (e) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = url;
  }
})();

// ---------- loading files ----------
async function addPdf(file) {
  await workerReady;
  const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
  const scale = PDF_DPI / 72;
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const vp = page.getViewport({ scale });
    const c = document.createElement('canvas');
    c.width = Math.round(vp.width); c.height = Math.round(vp.height);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    const trimmed = trimCanvas(c);
    if (!trimmed) continue; // blank page
    const base = (file.name || 'label.pdf').replace(/\.pdf$/i, '');
    addItem({ name: base + (pdf.numPages > 1 ? ` (pagina ${n})` : ''), source: c, trimmed, pxPerMm: PDF_DPI / 25.4 });
  }
}

async function addImage(file) {
  const img = await new Promise((ok, fail) => {
    const i = new Image(); i.onload = () => ok(i); i.onerror = fail; i.src = URL.createObjectURL(file);
  });
  const c = document.createElement('canvas');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  c.getContext('2d').drawImage(img, 0, 0);
  const name = file.name && file.name !== 'image.png' ? file.name.replace(/\.[a-z]+$/i, '') : 'Screenshot';
  addItem({ name, source: c, trimmed: trimCanvas(c) || c, pxPerMm: null });
}

function addItem(it) {
  it.id = nextId++;
  it.urls = {};
  const c = current(it);
  // Images have no known real size: assume a standard 10x15 cm label
  it.widthMm = it.pxPerMm ? c.width / it.pxPerMm : (c.width <= c.height ? 100 : 150);
  items.push(it);
}

// ---------- image processing ----------
function trimCanvas(src) {
  const { width: w, height: h } = src;
  const data = src.getContext('2d').getImageData(0, 0, w, h).data;
  let top = h, left = w, right = -1, bottom = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (data[i + 3] > 20 && (data[i] < 235 || data[i + 1] < 235 || data[i + 2] < 235)) {
        if (x < left) left = x; if (x > right) right = x;
        if (y < top) top = y; if (y > bottom) bottom = y;
      }
    }
  }
  if (right < 0) return null;
  const pad = Math.round(Math.min(w, h) * 0.01);
  left = Math.max(0, left - pad); top = Math.max(0, top - pad);
  right = Math.min(w - 1, right + pad); bottom = Math.min(h - 1, bottom + pad);
  const c = document.createElement('canvas');
  c.width = right - left + 1; c.height = bottom - top + 1;
  c.getContext('2d').drawImage(src, left, top, c.width, c.height, 0, 0, c.width, c.height);
  return c;
}

function rotate90(src) {
  const c = document.createElement('canvas');
  c.width = src.height; c.height = src.width;
  const ctx = c.getContext('2d');
  ctx.translate(c.width, 0);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(src, 0, 0);
  return c;
}

const current = it => $('trim').checked ? it.trimmed : it.source;
const naturalWidth = it => it.pxPerMm ? current(it).width / it.pxPerMm : null;
const aspect = it => current(it).height / current(it).width;

function imageUrl(it, rot) {
  const key = ($('trim').checked ? 't' : 's') + rot;
  if (!it.urls[key]) {
    const c = rot ? rotate90(current(it)) : current(it);
    it.urls[key] = new Promise(ok => c.toBlob(b => ok(URL.createObjectURL(b)), 'image/png'));
  }
  return it.urls[key];
}
