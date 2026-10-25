// Fitting labels onto as few A4 pages as possible, at true size.

// ---------- packing ----------
// Shelf packing: fill rows left to right, rows top to bottom, new page when full.
function pack(boxes, W, H, gap, mode) {
  const pages = [];
  let page = null, row = null;
  const newPage = () => { page = []; pages.push(page); row = { y: 0, h: 0, x: 0 }; };
  newPage();

  for (const b of boxes) {
    const options = mode === 'asis' ? [[b.w, b.h, 0]]
      : mode === 'rot' ? [[b.h, b.w, 90]]
      : [[b.w, b.h, 0], [b.h, b.w, 90]];
    const fitsRow = ([w, h]) => row.x + (row.x ? gap : 0) + w <= W && row.y + h <= H;
    const fitsNewRow = ([w, h]) => w <= W && row.y + row.h + gap + h <= H;

    // Prefer the orientation that fits in the current row without making it taller
    let o = options.filter(fitsRow).sort((a, b) => (a[1] > row.h) - (b[1] > row.h) || a[0] - b[0])[0];
    if (!o) {
      o = options.filter(fitsNewRow).sort((a, b) => a[1] - b[1])[0];
      if (o) row = { y: row.y + row.h + gap, h: 0, x: 0 };
      else {
        if (page.length) newPage();
        o = options.filter(([w, h]) => w <= W && h <= H)[0] || options[0];
      }
    }
    const x = row.x ? row.x + gap : 0;
    page.push({ item: b.item, x, y: row.y, w: o[0], h: o[1], rot: o[2] });
    row.x = x + o[0];
    row.h = Math.max(row.h, o[1]);
  }
  return pages;
}

function layout() {
  const margin = Math.max(0, +$('margin').value || 0);
  const gap = 2 * margin; // each label keeps its own margin, so neighbours sit two margins apart
  const W = A4.w - 2 * margin, H = A4.h - 2 * margin;
  const allowRotate = $('rotate').checked;

  // Size every label; shrink only if it can't fit on a page at all
  const boxes = items.map(it => {
    let w = it.widthMm, h = w * aspect(it);
    const fit = Math.max(Math.min(W / w, H / h), allowRotate ? Math.min(W / h, H / w) : 0);
    const shrunk = fit < 1;
    if (shrunk) { w *= fit; h *= fit; }
    return { item: it, w, h, shrunk };
  });

  const sorted = [...boxes].sort((a, b) => Math.max(b.w, b.h) - Math.max(a.w, a.h));
  const candidates = [pack(boxes, W, H, gap, 'asis'), pack(sorted, W, H, gap, 'asis')];
  if (allowRotate) candidates.push(
    pack(boxes, W, H, gap, 'rot'), pack(sorted, W, H, gap, 'rot'),
    pack(boxes, W, H, gap, 'auto'), pack(sorted, W, H, gap, 'auto'));
  // Fewest pages wins; candidates without rotation come first, so they win ties
  const pages = candidates.reduce((best, p) => p.length < best.length ? p : best);
  return { pages, margin, shrunk: boxes.filter(b => b.shrunk).length };
}
