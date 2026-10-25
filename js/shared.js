// Shared constants, helpers and state used by every other script.

const PDF_DPI = 300;
const A4 = { w: 210, h: 297 };
const $ = id => document.getElementById(id);
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const animate = () => !reduceMotion.matches;
const wait = ms => new Promise(r => setTimeout(r, ms));

let items = [];   // { id, name, source, trimmed, pxPerMm, widthMm, urls }
let nextId = 1;
const folder = $('folder');
