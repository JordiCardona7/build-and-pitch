/* ============================================================
   board-engine.js — Motor de la pizarra            DUEÑO: P2
   Dibuja una lista de "ops" (ver docs/CONTRACTS.md) con trazo a mano
   y un marcador que sigue la punta. Todo es pausable a medio trazo.
   No sabe nada de voz ni de la API: solo dibuja.
   ============================================================ */
const NS = 'http://www.w3.org/2000/svg';
export const COLORS = { negro:'#1f2430', azul:'#1d4ed8', rojo:'#d62828', verde:'#15803d', morado:'#7c3aed', naranja:'#ea7a12' };
const col = c => COLORS[c] || c || COLORS.negro;

let defs, hand, handPos = { x:920, y:560 };

/** Llamar una vez con el <svg> de la pizarra (viewBox 0 0 1000 600, con #defs y #hand). */
export function initBoard(svg) {
  defs = svg.querySelector('defs');
  hand = svg.querySelector('#hand');
}

/** Un contexto = una capa que se pausa por separado (clase principal vs. hoja de aclaración). */
export function makeCtx(layerEl) { return { paused:false, layer:layerEl }; }

/* ---------- animación ---------- */
export function tween(ms, fn, ctx) {
  return new Promise(res => {
    let elapsed = 0, last = null;
    function frame(t) {
      if (last === null) last = t;
      const dt = t - last; last = t;
      if (!ctx.paused) elapsed += dt;
      const p = Math.min(1, elapsed / ms);
      fn(p);
      p < 1 ? requestAnimationFrame(frame) : res();
    }
    requestAnimationFrame(frame);
  });
}
export function waitResume(ctx) {
  return new Promise(res => (function chk(){ ctx.paused ? setTimeout(chk, 80) : res(); })());
}
export function el(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  parent.appendChild(e);
  return e;
}
const jit = (a = 2.5) => (Math.random() - .5) * a;

/* ---------- marcador ---------- */
function moveHand(x, y) { hand.setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)})`); }
async function travel(x, y, ctx) {
  const sx = handPos.x, sy = handPos.y, d = Math.hypot(x - sx, y - sy);
  await tween(Math.min(380, 90 + d * .35), p => {
    const e = p < .5 ? 2*p*p : 1 - Math.pow(-2*p + 2, 2) / 2;
    moveHand(sx + (x - sx) * e, sy + (y - sy) * e);
  }, ctx);
  handPos = { x, y };
}

/* ---------- geometría "a mano" ---------- */
const lineD = (x1,y1,x2,y2) => `M${x1+jit()} ${y1+jit()} Q${(x1+x2)/2+jit(4)} ${(y1+y2)/2+jit(4)} ${x2+jit()} ${y2+jit()}`;
const rectD = (x,y,w,h) => `M${x+jit()} ${y+jit()} L${x+w+jit()} ${y+jit()} L${x+w+jit()} ${y+h+jit()} L${x+jit()} ${y+h+jit()} Z`;
function ellipseD(cx, cy, rx, ry, overshoot = 1.1, wobble = .05) {
  let d = ''; const n = 48;
  for (let i = 0; i <= n; i++) {
    const a = -Math.PI * .65 + (i / n) * Math.PI * 2 * overshoot;
    const k = 1 + (Math.random() - .5) * wobble;
    d += (i ? 'L' : 'M') + (cx + Math.cos(a) * rx * k).toFixed(1) + ' ' + (cy + Math.sin(a) * ry * k).toFixed(1);
  }
  return d;
}

async function strokePath(d, ctx, { color = COLORS.negro, width = 4, speed = 1.4, opacity = 1 } = {}) {
  const p = el('path', { d, fill:'none', stroke:color, 'stroke-width':width, 'stroke-linecap':'round',
                         'stroke-linejoin':'round', 'stroke-opacity':opacity }, ctx.layer);
  const L = p.getTotalLength();
  p.style.strokeDasharray = L; p.style.strokeDashoffset = L;
  const s = p.getPointAtLength(0);
  await travel(s.x, s.y, ctx);
  await tween(Math.max(220, L * speed), q => {
    p.style.strokeDashoffset = L * (1 - q);
    const pt = p.getPointAtLength(L * q); moveHand(pt.x, pt.y);
  }, ctx);
  const e = p.getPointAtLength(L); handPos = { x:e.x, y:e.y };
  return p;
}

/* ---------- ops ---------- */
async function opWrite(o, ctx) {
  const size = o.size || 42;
  const t = el('text', { x:o.x, y:o.y, 'font-size':size, fill:col(o.color), 'font-family':'Caveat, cursive',
                         'font-weight':700, 'text-anchor':o.anchor || 'start' }, ctx.layer);
  t.textContent = o.text;
  const bb = t.getBBox();
  const id = 'clip' + Math.random().toString(36).slice(2);
  const r = el('rect', { x:bb.x - 6, y:bb.y - 12, width:0, height:bb.height + 24 }, el('clipPath', { id }, defs));
  t.setAttribute('clip-path', `url(#${id})`);
  await travel(bb.x, bb.y + bb.height * .7, ctx);
  const n = Math.max(1, o.text.length);
  await tween(Math.max(300, n * 80), p => {
    const w = (bb.width + 12) * p;
    r.setAttribute('width', w);
    moveHand(bb.x + w - 6, bb.y + bb.height * .68 + Math.sin(p * n * 3.1) * bb.height * .2);
  }, ctx);
  handPos = { x:bb.x + bb.width, y:bb.y + bb.height * .7 };
  return bb;
}

async function opFrac(o, ctx) {
  const size = o.size || 44, color = o.color;
  const nb = await opWrite({ text:String(o.num), x:o.x, y:o.y - size * .18, size, color, anchor:'middle' }, ctx);
  const w = Math.max(nb.width, size * .5 * String(o.den).length) + 18;
  await strokePath(lineD(o.x - w/2, o.y, o.x + w/2, o.y), ctx, { color:col(color), width:3.5, speed:2 });
  await opWrite({ text:String(o.den), x:o.x, y:o.y + size * .82, size, color, anchor:'middle' }, ctx);
}

async function opArrow(o, ctx) {
  const c = col(o.color);
  await strokePath(lineD(o.x1, o.y1, o.x2, o.y2), ctx, { color:c, width:4 });
  const a = Math.atan2(o.y2 - o.y1, o.x2 - o.x1), L = 16;
  for (const s of [-1, 1]) {
    const ax = o.x2 - L * Math.cos(a + s * .5), ay = o.y2 - L * Math.sin(a + s * .5);
    await strokePath(`M${o.x2} ${o.y2} L${ax} ${ay}`, ctx, { color:c, width:4, speed:3 });
  }
}

/** Barra de fracción: entero partido en `parts`, pinta `shade` con zigzag de marcador. */
async function opBar(o, ctx) {
  const { x, y, w, h } = o, parts = o.parts || 1, shade = Math.min(o.shade || 0, parts);
  if (shade > 0) {
    const sw = w * shade / parts; let d = `M${x + 5} ${y + h - 5}`, up = true;
    for (let xx = x + 5; xx < x + sw - 5; xx += 11) { d += ` L${Math.min(xx + 6, x + sw - 5)} ${up ? y + 5 : y + h - 5}`; up = !up; }
    await strokePath(d, ctx, { color:col(o.color || 'azul'), width:10, speed:.3, opacity:.4 });
  }
  await strokePath(rectD(x, y, w, h), ctx, { width:4, speed:.8 });
  for (let i = 1; i < parts; i++) {
    const xx = x + w * i / parts;
    await strokePath(lineD(xx, y, xx, y + h), ctx, { width:3, speed:2 });
  }
}

/** "Tortilla" / pastel: círculo partido en `parts` rebanadas, pinta `shade` barriendo como con marcador. */
async function opPie(o, ctx) {
  const { cx, cy, r } = o, parts = o.parts || 1, shade = Math.min(o.shade || 0, parts);
  const start = -Math.PI / 2;  // empieza arriba, como las agujas del reloj
  const outline = await strokePath(ellipseD(cx, cy, r, r, 1.04, .03), ctx, { width:4, speed:.9 });
  for (let i = 0; i < parts && parts > 1; i++) {
    const a = start + (i / parts) * Math.PI * 2;
    await strokePath(lineD(cx, cy, cx + Math.cos(a) * r, cy + Math.sin(a) * r), ctx, { width:3, speed:2.2 });
  }
  if (shade > 0) {
    const end = start + (shade / parts) * Math.PI * 2;
    const wedge = el('path', { fill:col(o.color || 'naranja'), 'fill-opacity':.38, stroke:'none' }, ctx.layer);
    ctx.layer.insertBefore(wedge, outline); // el color queda debajo de las líneas de la tortilla
    const ri = r - 3;
    await travel(cx + Math.cos(start) * ri, cy + Math.sin(start) * ri, ctx);
    await tween(500 + 260 * shade, p => {
      const a = start + (end - start) * p;
      const large = (a - start) > Math.PI ? 1 : 0;
      const x1 = cx + Math.cos(start) * ri, y1 = cy + Math.sin(start) * ri;
      const x2 = cx + Math.cos(a) * ri, y2 = cy + Math.sin(a) * ri;
      wedge.setAttribute('d', p >= .999 && shade === parts
        ? `M${cx - ri} ${cy} A${ri} ${ri} 0 1 1 ${cx + ri} ${cy} A${ri} ${ri} 0 1 1 ${cx - ri} ${cy} Z`
        : `M${cx} ${cy} L${x1} ${y1} A${ri} ${ri} 0 ${large} 1 ${x2} ${y2} Z`);
      const wig = Math.sin(p * 40) * ri * .25;   // el marcador "colorea" de adentro hacia afuera
      moveHand(cx + Math.cos(a) * (ri * .6 + wig), cy + Math.sin(a) * (ri * .6 + wig));
    }, ctx);
  }
}

async function opClear(o, ctx) {
  const nodes = [...ctx.layer.childNodes].filter(n => !(n.dataset && n.dataset.keep));
  await tween(450, p => nodes.forEach(n => n.style.opacity = 1 - p), ctx);
  nodes.forEach(n => n.remove());
}

const OPS = {
  write: opWrite, frac: opFrac, arrow: opArrow, bar: opBar, pie: opPie, clear: opClear,
  line:   (o, c) => strokePath(lineD(o.x1, o.y1, o.x2, o.y2), c, { color:col(o.color), width:o.width || 4 }),
  rect:   (o, c) => strokePath(rectD(o.x, o.y, o.w, o.h), c, { color:col(o.color), speed:.8 }),
  circle: (o, c) => strokePath(ellipseD(o.cx, o.cy, o.rx, o.ry || o.rx), c, { color:col(o.color || 'rojo'), width:5, speed:.9 }),
  wait:   (o, c) => tween(o.ms || 500, () => {}, c),
};

/** Dibuja una lista de ops en orden, respetando pausas. Ops desconocidas se ignoran (no truena la clase). */
export async function drawOps(ops, ctx) {
  for (const o of ops || []) {
    await waitResume(ctx);
    const f = OPS[o.op];
    if (!f) { console.warn('op desconocida', o); continue; }
    try { await f(o, ctx); } catch (e) { console.warn('op fallida', o, e); }
  }
}
