// Animations: files dropping into the folder and labels flying to their place.

// ---------- motion ----------
function snapshotLabels() {
  const map = new Map();
  for (const el of document.querySelectorAll('.sheet .label')) {
    map.set(+el.dataset.id, { rect: el.getBoundingClientRect(), node: el });
  }
  return map;
}

const onScreen = r => r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;

function playLayout(old, fromFolder) {
  const labels = [...document.querySelectorAll('.sheet .label')];
  if (!animate()) {
    labels.forEach(el => el.style.visibility = '');
    folder.classList.remove('filled');
    return;
  }
  const folderRect = folder.getBoundingClientRect();
  if (fromFolder.length) setTimeout(() => folder.classList.remove('filled'), 120);
  let k = 0;
  for (const el of labels) {
    const id = +el.dataset.id;
    if (fromFolder.includes(id)) fly(el, folderRect, 140 + 90 * k++, true);
    else if (old.has(id)) {
      const r = old.get(id).rect, to = el.getBoundingClientRect();
      if (Math.abs(r.left - to.left) + Math.abs(r.top - to.top) + Math.abs(r.width - to.width) > 2) fly(el, r, 0, false);
    }
  }
  // labels that disappeared fade out where they were
  for (const [id, o] of old) {
    if (labels.some(el => +el.dataset.id === id) || !onScreen(o.rect)) continue;
    const g = makeGhost(o.node, o.rect);
    g.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.85)' }],
      { duration: 280, easing: 'ease-in', fill: 'forwards' }).finished.then(() => g.remove());
  }
}

function makeGhost(el, r) {
  const g = el.cloneNode(true);
  g.classList.add('ghost');
  g.classList.remove('hl');
  Object.assign(g.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px', visibility: 'visible' });
  document.body.appendChild(g);
  return g;
}

function fly(el, from, delay, fromFolder) {
  const to = el.getBoundingClientRect();
  if (!to.width || (!onScreen(to) && !onScreen(from))) { el.style.visibility = ''; return; }
  const g = makeGhost(el, to);
  el.style.visibility = 'hidden';
  const s = Math.min(from.width / to.width, from.height / to.height);
  const dx = from.left + from.width / 2 - (to.left + to.width / 2);
  const dy = from.top + from.height / 2 - (to.top + to.height / 2);
  const start = `translate(${dx}px, ${dy}px) scale(${s})`;
  const frames = fromFolder
    ? [{ transform: start, opacity: 0 }, { opacity: 1, offset: .2 }, { transform: 'none', opacity: 1 }]
    : [{ transform: start }, { transform: 'none' }];
  g.animate(frames, { duration: fromFolder ? 760 : 520, delay, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' })
    .finished.catch(() => {}).then(() => { el.style.visibility = ''; g.remove(); });
}

async function dropIntoFolder(n, point) {
  if (!animate()) { folder.classList.add('filled'); return; }
  const f = folder.getBoundingClientRect();
  const target = { x: f.left + f.width / 2, y: f.top + f.height * 0.3 };
  const start = point || { x: target.x, y: target.y - 140 };
  const shrink = Math.max(.25, f.width / 160);
  const flights = [];
  for (let i = 0; i < Math.min(n, 3); i++) {
    const p = document.createElement('div');
    p.className = 'flying-paper';
    document.body.appendChild(p);
    const tilt = (i - 1) * 9;
    flights.push(p.animate([
      { left: start.x + 'px', top: start.y + 'px', transform: `translate(-50%, -50%) rotate(${tilt}deg) scale(1)`, opacity: 1 },
      { left: target.x + 'px', top: target.y + 'px', transform: `translate(-50%, -30%) rotate(0deg) scale(${shrink})`, opacity: 1, offset: .8 },
      { left: target.x + 'px', top: target.y + 'px', transform: `translate(-50%, 10%) rotate(0deg) scale(${shrink})`, opacity: 0 },
    ], { duration: 560, delay: i * 70, easing: 'cubic-bezier(.45,0,.2,1)', fill: 'both' }).finished.then(() => p.remove()));
  }
  setTimeout(() => folder.classList.add('filled'), 420);
  await Promise.all(flights);
  await wait(120);
}

async function evaporate(point) {
  if (!animate()) return;
  const p = document.createElement('div');
  p.className = 'flying-paper';
  Object.assign(p.style, { left: point.x + 'px', top: point.y + 'px' });
  document.body.appendChild(p);
  await p.animate([
    { transform: 'translate(-50%, -50%) scale(1)', opacity: .9 },
    { transform: 'translate(-50%, -50%) scale(1.5)', opacity: 0 },
  ], { duration: 320, easing: 'ease-out' }).finished;
  p.remove();
}

function bounce(el) {
  if (!animate()) return;
  el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.05)' }, { transform: 'scale(1)' }],
    { duration: 380, easing: 'cubic-bezier(.34,1.45,.55,1)' });
}
