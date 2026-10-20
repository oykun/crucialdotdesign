// Real 3D phones for the Caura hero: an iPhone 16 Pro (titanium) and a Pixel (aluminium), built in three.js
// to real proportions (mm), with screens drawn as textures and studio reflections on the metal.
// They turn to face you as you scroll, lean a little toward the cursor and float. Falls back to the CSS phones.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const host = document.getElementById('world'), cv = document.getElementById('phones3d');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

function roundedRect(w, h, r){
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
}
// a flat rounded shape with UVs running 0..1 across it (ShapeGeometry's own UVs are in shape units)
function plate(w, h, r){
  const g = new THREE.ShapeGeometry(roundedRect(w, h, r), 24), p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + w / 2) / w, (p.getY(i) + h / 2) / h);
  return g;
}
const rr = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };

// ---- screens, drawn live into canvases on one shared 19s clock (LOOP / STEPS below, matched by the page's map cards) ----
// iPhone: 3.0s a payment slides into Paid this week · MOT booked notification lands as the Pixel ticks the MOT (STEPS[3])
// · then the MOT ring's alert turns into a tick, attention 2 -> 1 · ~3s later All sorted · the last second winds it back, no fade
function iphoneScreen(shot){
  const W = 860, H = 1850, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  const LIME = '#b7f005', AMBER = '#f59e0b', sh = shot.height * W / shot.width;
  const ease = t => t <= 0 ? 0 : t >= 1 ? 1 : 1 - Math.pow(1 - t, 3), k = (t, a, b) => ease((t - a) / (b - a));
  const tick = (cx, cy, r, col) => { x.strokeStyle = col; x.lineWidth = r * .22; x.lineCap = 'round'; x.lineJoin = 'round'; x.beginPath();
    x.moveTo(cx - r * .42, cy + r * .02); x.lineTo(cx - r * .1, cy + r * .32); x.lineTo(cx + r * .45, cy - r * .3); x.stroke(); };
  c.paint = now => {
    const t = now == null ? 0 : now % LOOP;
    x.globalAlpha = 1; x.fillStyle = '#16242c'; x.fillRect(0, 0, W, H);
    x.drawImage(shot, 0, 0, W, sh);
    // MOT ring: the orange alert becomes a lime tick once the MOT is booked
    const back = k(t, LOOP - 1000, LOOP - 250);                                          // the loop winds back, the screen never blanks
    const bk = k(t, MOT + 200, MOT + 600) * (1 - back);
    if (bk > 0) { x.save(); x.translate(173, 393); x.scale(bk, bk);
      x.fillStyle = '#16242c'; x.beginPath(); x.arc(0, 0, 25, 0, 7); x.fill();
      x.fillStyle = LIME; x.beginPath(); x.arc(0, 0, 19, 0, 7); x.fill(); tick(0, 0, 19, '#16242c'); x.restore(); }
    // attention row: 2 -> 1 -> all sorted
    let y = sh + 24; const n = t < MOT + 200 || back > .5 ? 2 : t < MOT + 3100 ? 1 : 0;
    const flash = Math.max(0, 1 - Math.abs(t - (t < MOT + 1650 ? MOT + 200 : MOT + 3100)) / 500);   // a soft lime pulse on each change
    x.strokeStyle = flash > .05 ? `rgba(183,240,5,${.18 + flash * .5})` : 'rgba(255,255,255,.16)'; x.lineWidth = 3; rr(x, 40, y, W - 80, 130, 30); x.stroke();
    if (n) { x.strokeStyle = AMBER; x.lineWidth = 5; x.beginPath(); x.arc(110, y + 65, 30, 0, 7); x.stroke();
      x.fillStyle = '#fff'; x.font = '600 32px Inter'; x.textAlign = 'center'; x.fillText(String(n), 110, y + 76);
      x.textAlign = 'left'; x.font = '500 36px Inter'; x.fillStyle = '#e8ecef'; x.fillText(n === 2 ? '2 items need attention for C4 URA' : '1 item needs attention for C4 URA', 166, y + 78); }
    else { x.fillStyle = LIME; x.beginPath(); x.arc(110, y + 65, 30, 0, 7); x.fill(); tick(110, y + 65, 30, '#16242c');
      x.textAlign = 'left'; x.font = '600 36px Inter'; x.fillStyle = '#fff'; x.fillText('All sorted for C4 URA', 166, y + 78); }
    y += 170;
    for (const [i, lab, g] of [[0, 'Parking', 'P'], [1, 'Fuel prices', '£']]) {
      const bx = 40 + i * ((W - 100) / 2 + 20), bw = (W - 100) / 2;
      x.strokeStyle = 'rgba(255,255,255,.16)'; x.lineWidth = 3; rr(x, bx, y, bw, 250, 30); x.stroke();
      x.strokeStyle = 'rgba(255,255,255,.55)'; x.beginPath(); x.arc(bx + bw / 2, y + 100, 40, 0, 7); x.stroke();
      x.fillStyle = '#fff'; x.textAlign = 'center'; x.font = '600 38px Inter'; x.fillText(g, bx + bw / 2, y + 114);
      x.font = '500 34px Inter'; x.fillStyle = '#e8ecef'; x.fillText(lab, bx + bw / 2, y + 205);
    }
    y += 320; x.textAlign = 'left';
    x.fillStyle = 'rgba(255,255,255,.5)'; x.font = '600 26px Inter'; x.fillText('PAID THIS WEEK', 44, y);
    y += 30;
    // a new payment slides in at the top and pushes the others down
    const ROW = 108, s = k(t, 3000, 3600) * (1 - back), fresh = Math.max(0, 1 - k(t, 5200, 6400));
    x.save(); x.beginPath(); x.rect(0, y, W, ROW * 3 + 4); x.clip();
    const rows = [['Congestion charge', '£15.00', true], ['Dart Charge', '£2.50'], ['Parking · Waterloo', '£7.49'], ['EV charging', '£32.00']];
    rows.forEach(([lab, v, isNew], i) => {
      const ry = y + (i - 1) * ROW + s * ROW; if (isNew && s <= 0) return;
      x.globalAlpha = isNew ? s : 1;
      if (isNew && fresh > 0) { x.fillStyle = `rgba(183,240,5,${.1 * fresh})`; rr(x, 30, ry + 16, W - 60, ROW - 14, 18); x.fill(); }
      x.fillStyle = '#e8ecef'; x.font = '500 36px Inter'; x.fillText(lab, 44, ry + 70); const lw = x.measureText(lab).width;
      if (isNew && fresh > 0) { x.globalAlpha = s * fresh; x.fillStyle = LIME; x.font = '600 24px Inter'; x.fillText('Just now', 44 + lw + 18, ry + 68); x.globalAlpha = s; }
      x.fillStyle = '#e8ecef'; x.textAlign = 'right'; x.font = '600 36px Inter'; x.fillText(v, W - 44, ry + 70); x.textAlign = 'left';
      x.fillStyle = 'rgba(255,255,255,.08)'; x.fillRect(44, ry + 104, W - 88, 2);
      x.globalAlpha = 1;
    });
    x.restore();
    x.fillStyle = 'rgba(255,255,255,.75)'; rr(x, W / 2 - 140, H - 40, 280, 12, 6); x.fill();   // home indicator
    // the notification drops in under the Dynamic Island, then slides away
    const nv = k(t, MOT, MOT + 450) - k(t, MOT + 2300, MOT + 2750);
    if (nv > 0) { const ny = -200 + nv * 330;
      x.fillStyle = 'rgba(28,44,54,.97)'; rr(x, 28, ny, W - 56, 168, 40); x.fill();
      x.strokeStyle = 'rgba(255,255,255,.1)'; x.lineWidth = 2; rr(x, 28, ny, W - 56, 168, 40); x.stroke();
      x.fillStyle = LIME; rr(x, 56, ny + 40, 88, 88, 22); x.fill(); tick(100, ny + 84, 34, '#16242c');
      x.fillStyle = '#fff'; x.font = '600 34px Inter'; x.fillText('MOT booked', 168, ny + 76);
      x.fillStyle = 'rgba(255,255,255,.62)'; x.font = '500 28px Inter'; x.fillText('C4 URA · Mon 9 Sept, 08:30', 168, ny + 120);
      x.textAlign = 'right'; x.fillStyle = 'rgba(255,255,255,.45)'; x.font = '500 26px Inter'; x.fillText('now', W - 64, ny + 76); x.textAlign = 'left'; }
    x.fillStyle = '#000'; rr(x, W / 2 - 128, 28, 256, 76, 38); x.fill();                     // Dynamic Island, always on top
  };
  c.paint(null);
  return c;
}
// the Pixel: a driver's checklist for BE57 YTK, ticked off live on the same 19s clock as the map cards
// (STEPS must match the page script): each tick fills, the line under it changes, the progress count moves
const LOOP = 19000, STEPS = [1800, 4200, 6600, 9000, 11400, 13800], MOT = STEPS[3];
function pixelScreen(){
  const W = 860, H = 1830, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  const ease = t => t <= 0 ? 0 : t >= 1 ? 1 : 1 - Math.pow(1 - t, 3), k = (t, a, b) => ease((t - a) / (b - a));
  const items = [['Walkaround', 'Due before you set off', 'Submitted 07:12'], ['Licence check', 'Check due today', 'Verified with DVLA'],
                 ['Dart Charge', 'Crossing at 06:48 · pay by midnight', 'Paid · £2.50'], ['MOT', 'Due 14 Nov · book a garage', 'Booked · Mon 9 Sept'],
                 ['Mileage', "Log today's trips", 'Logged · 42 miles'], ['Fuel receipt', 'Shell, Vauxhall · add photo', 'Added · £64.20']];
  c.paint = now => {
    const t = now == null ? 0 : now % LOOP, back = k(t, LOOP - 1000, LOOP - 250), on = s => t >= s && back < .5;   // winds back, no fade
    x.fillStyle = '#f7f7f7'; x.fillRect(0, 0, W, H);
    x.fillStyle = '#0b0d0e'; x.beginPath(); x.arc(W / 2, 60, 22, 0, 7); x.fill();               // punch-hole camera
    x.fillStyle = '#ffd400'; rr(x, 56, 150, 230, 64, 10); x.fill();
    x.fillStyle = '#111'; x.font = '700 34px Inter'; x.fillText('BE57 YTK', 78, 194);
    x.fillStyle = '#16242c'; x.font = '600 64px Inter'; x.fillText("Today's checks", 56, 300);
    const doneN = STEPS.filter(on).length;
    x.fillStyle = '#6b7680'; x.font = '500 32px Inter'; x.fillText(`Ford Transit · ${doneN} of ${STEPS.length} done`, 56, 352);
    x.fillStyle = '#e3e6e8'; rr(x, 56, 380, W - 112, 10, 5); x.fill();                        // progress bar
    const prog = STEPS.reduce((a, s) => a + k(t, s, s + 600), 0) / STEPS.length * (1 - back);
    if (prog > 0) { x.fillStyle = '#16242c'; rr(x, 56, 380, (W - 112) * prog, 10, 5); x.fill(); }
    let y = 420;
    items.forEach(([name, todo, done], i) => {
      const p = k(t, STEPS[i], STEPS[i] + 500) * (1 - back), isDone = on(STEPS[i]);
      if (isDone) { x.fillStyle = `rgba(183,240,5,${.14 * (1 - k(t, STEPS[i] + 900, STEPS[i] + 2200))})`; rr(x, 36, y + 12, W - 72, 140, 20); x.fill(); }
      x.fillStyle = '#16242c'; x.font = '500 40px Inter'; x.fillText(name, 56, y + 66);
      x.fillStyle = isDone ? '#3d6b00' : '#6b7680'; x.font = '400 30px Inter'; x.fillText(isDone ? done : todo, 56, y + 110);
      const cx = W - 96, cy = y + 78;
      x.strokeStyle = '#c9ced2'; x.lineWidth = 4; x.beginPath(); x.arc(cx, cy, 32, 0, 7); x.stroke();
      if (p > 0) {
        x.fillStyle = '#16242c'; x.beginPath(); x.arc(cx, cy, 34 * Math.min(1, p * 1.4), 0, 7); x.fill();
        const q = Math.max(0, (p - .35) / .65);                                                // the tick draws itself in
        if (q > 0) { x.strokeStyle = '#b7f005'; x.lineWidth = 7; x.lineCap = 'round'; x.lineJoin = 'round'; x.beginPath();
          const pts = [[cx - 16, cy], [cx - 4, cy + 14], [cx + 20, cy - 14]], seg1 = Math.min(1, q * 2), seg2 = Math.max(0, q * 2 - 1);
          x.moveTo(...pts[0]); x.lineTo(pts[0][0] + (pts[1][0] - pts[0][0]) * seg1, pts[0][1] + (pts[1][1] - pts[0][1]) * seg1);
          if (seg2 > 0) x.lineTo(pts[1][0] + (pts[2][0] - pts[1][0]) * seg2, pts[1][1] + (pts[2][1] - pts[1][1]) * seg2);
          x.stroke(); }
      }
      x.fillStyle = '#e6e6e6'; x.fillRect(56, y + 158, W - 112, 2); y += 165;
    });
    // all four done: a quiet confirmation at the bottom
    const all = k(t, STEPS[STEPS.length - 1] + 700, STEPS[STEPS.length - 1] + 1200) * (1 - back);
    if (all > 0) { x.globalAlpha = all; x.fillStyle = '#16242c'; rr(x, 56, y + 30, W - 112, 120, 30); x.fill();
      x.fillStyle = '#b7f005'; x.font = '600 36px Inter'; x.textAlign = 'center'; x.fillText('All checks done. Drive safe.', W / 2, y + 102); x.textAlign = 'left'; x.globalAlpha = 1; }
  };
  c.paint(null);
  return c;
}

// ---- one phone: metal body, black glass front, lit screen, side buttons ----
function phone({w, h, d, r, bezel, metal, screen, buttons}){
  const g = new THREE.Group();
  const bevel = 1.1, body = new THREE.ExtrudeGeometry(roundedRect(w - bevel * 2, h - bevel * 2, r - bevel), {depth: d - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 8, curveSegments: 32});
  body.translate(0, 0, -(d - bevel * 2) / 2);
  const glass = new THREE.MeshPhysicalMaterial({color: 0x050608, roughness: .08, metalness: 0, clearcoat: 1, clearcoatRoughness: .04});
  g.add(new THREE.Mesh(body, [glass, metal]));                                                   // caps = glass, sides = metal
  const tex = new THREE.CanvasTexture(screen); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; g.userData.tex = tex; g.userData.screen = screen;
  const scr = new THREE.Mesh(plate(w - bezel * 2, h - bezel * 2, r - bezel), new THREE.MeshPhysicalMaterial({color: 0x000000, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 1, roughness: .35, metalness: 0, clearcoat: .25, clearcoatRoughness: .25, envMapIntensity: .12, toneMapped: false}));   // exact colours, only a faint sheen so it never blows out
  scr.position.z = d / 2 + .02; g.add(scr);
  for (const [side, y, len] of buttons) {
    const b = new THREE.Mesh(new THREE.CapsuleGeometry(.55, len, 4, 12), metal);
    b.position.set(side * (w / 2 + .15), y, 0); g.add(b);
  }
  return g;
}

async function start(){
  if (!host || !cv) return;
  let renderer;
  try { renderer = new THREE.WebGLRenderer({canvas: cv, antialias: true, alpha: true}); } catch (e) { return; }
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene(), pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture;
  const key = new THREE.DirectionalLight(0xffffff, 1.2); key.position.set(-60, 120, 140); scene.add(key);
  const camera = new THREE.PerspectiveCamera(26, 1, 10, 2000);

  await document.fonts.load('600 40px Inter'); await document.fonts.load('500 40px Inter');
  const shot = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = new URL('caura-driver-app-screen.jpg', import.meta.url).href; });

  const titanium = new THREE.MeshPhysicalMaterial({color: 0x8d8f91, metalness: 1, roughness: .32, clearcoat: .4, clearcoatRoughness: .3});
  const aluminium = new THREE.MeshPhysicalMaterial({color: 0xc9ccce, metalness: 1, roughness: .22});
  // iPhone 16 Pro: 71.5 × 149.6 × 8.25 mm. Pixel 9 Pro: 72 × 152.8 × 8.5 mm.
  const iphone = phone({w: 71.5, h: 149.6, d: 8.25, r: 12, bezel: 1.9, metal: titanium, screen: iphoneScreen(shot),
    buttons: [[-1, 34, 4], [-1, 22, 9], [-1, 9, 9], [1, 18, 15]]});
  const pixel = phone({w: 72, h: 152.8, d: 8.5, r: 10, bezel: 2.3, metal: aluminium, screen: pixelScreen(),
    buttons: [[1, 28, 9], [1, 10, 16]]});
  iphone.position.set(54, 4, 0); pixel.position.set(-54, -2, -8);   // side by side, each turned in toward the middle (set in the loop)
  const rig = new THREE.Group(); rig.add(pixel, iphone); scene.add(rig);

  function size(){
    const w = host.clientWidth, h = host.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h;
    const fit = w < 700 ? 1.25 : w < 1240 ? 1.3 : 1;              // pull back on phones, and at mid widths so the map cards keep clear
    camera.position.set(0, 4, 400 * fit / Math.min(1, w / h * 1.1)); camera.lookAt(0, 0, 0); camera.updateProjectionMatrix();
  }
  size(); addEventListener('resize', size);
  host.classList.add('three');                                     // hide the CSS phones

  const mouse = {x: 0, y: 0}; host.addEventListener('pointermove', e => { const b = host.getBoundingClientRect(); mouse.x = (e.clientX - b.left) / b.width - .5; mouse.y = (e.clientY - b.top) / b.height - .5; });
  let running = true, tx = 0, ty = 0, painted = 0;
  new IntersectionObserver(es => es.forEach(e => { const was = running; running = e.isIntersecting; if (running && !was) requestAnimationFrame(loop); })).observe(host);
  const ease = t => 1 - Math.pow(1 - t, 3);
  function loop(now){
    if (!running) return;
    const t = reduce ? 1 : ease(Math.min(1, Math.max(0, scrollY / 560)));
    tx += ((reduce ? 0 : mouse.x) - tx) * .06; ty += ((reduce ? 0 : mouse.y) - ty) * .06;
    const f = reduce ? 0 : Math.sin(now / 1600) * .02;
    const inward = .2 + .26 * (1 - t);                               // mirrored: both face the centre, settling to a subtle angle
    iphone.rotation.y = -inward; pixel.rotation.y = inward;
    iphone.rotation.z = -.13; pixel.rotation.z = .13;               // rolled toward each other: tops apart, bottoms close (iPhone clockwise, Pixel anticlockwise)
    rig.rotation.y = tx * .16;
    rig.rotation.x = -.05 * (1 - t) - .07 + ty * .08 + f * .4;       // mostly facing you, a touch tilted back
    rig.position.y = f * 60 - 8;
    if (!reduce && now - painted > 33) { painted = now;                                     // live screens, ~30fps
      for (const ph of [iphone, pixel]) { ph.userData.screen.paint(now); ph.userData.tex.needsUpdate = true; } }
    renderer.render(scene, camera);
    if (!reduce) requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}
start().catch(() => host && host.classList.remove('three'));
