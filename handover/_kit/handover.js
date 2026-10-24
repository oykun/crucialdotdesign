// Crucial.Design handover kit. Renders a client's live brand page from window.HANDOVER
// (handover.json + assets/manifest.json, inlined by agency/scripts/handover/stage.py).
// Sections render only when their data exists, so a brand-only client and a later
// brand + UI client share this one file.
(function () {
  const H = window.HANDOVER;
  const A = f => H.base + 'assets/' + f;
  const M = H.manifest || {};
  const pal = Object.fromEntries(H.palette.map(c => [c.id, c]));
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const font = n => (H.fonts.find(f => f.name === n) || {}).family || 'inherit';

  // ---- colour maths: rgb, cmyk, WCAG contrast
  const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const cmyk = h => {
    const [r, g, b] = rgb(h).map(v => v / 255), k = 1 - Math.max(r, g, b);
    if (k === 1) return [0, 0, 0, 100];
    return [(1 - r - k) / (1 - k), (1 - g - k) / (1 - k), (1 - b - k) / (1 - k), k].map(v => Math.round(v * 100));
  };
  const lum = h => {
    const [r, g, b] = rgb(h).map(v => v / 255).map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const grade = r => r >= 7 ? 'AAA' : r >= 4.5 ? 'AA' : r >= 3 ? 'AA Large' : 'Fail';
  const ink = h => lum(h) > 0.4 ? '#111' : '#fff';

  // ---- clipboard + toast
  const toast = document.createElement('div');
  toast.className = 'toast';
  document.body.appendChild(toast);
  let tt;
  const say = m => { toast.textContent = m; toast.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => toast.classList.remove('on'), 1600); };
  const copy = async (text, m) => {
    try { await navigator.clipboard.writeText(text); say(m || 'Copied'); }
    catch (e) { say('Copy blocked by the browser'); }
  };
  const copySvg = async (url, m) => copy(await (await fetch(url)).text(), m || 'SVG copied. Paste it straight into Figma');

  const tokensCss = () => {
    const c = H.palette.map(p => `  ${p.token || '--' + p.id}: ${p.hex}; /* ${p.name} */`);
    const f = H.fonts.map(x => `  --font-${x.name.toLowerCase().replace(/\s+/g, '-')}: ${x.family};`);
    const t = (H.scale || []).map(s => {
      const k = s.label.toLowerCase().replace(/\s+/g, '-');
      return `  --text-${k}: ${s.weight} ${s.size / 16}rem/${s.lh} ${font(s.font)}; /* ${s.size}px, tracking ${s.tracking} */`;
    });
    return `/* ${H.client} brand tokens · ${location.href.split('?')[0]} */\n:root {\n${c.join('\n')}\n\n${f.join('\n')}\n\n${t.join('\n')}\n}\n`;
  };
  const icon = {
    down: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 2v9m0 0l-3.5-3.5M8 11l3.5-3.5M2.5 14h11"/></svg>',
    copy: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="5" y="5" width="9" height="9" rx="2"/><path d="M11 5V3.5A1.5 1.5 0 009.5 2h-6A1.5 1.5 0 002 3.5v6A1.5 1.5 0 003.5 11H5"/></svg>',
    doc: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 1.5h5.5L13 5v9.5H4z"/><path d="M9.5 1.5V5H13"/></svg>'
  };
  const chips = (png, svg) => `<div class="chips">${svg ? `<button class="chip" data-svg="${A(svg)}">Copy for Figma</button><a class="chip" href="${A(svg)}" download>SVG</a>` : ''}${png ? `<a class="chip" href="${A(png)}" download>${png.split('.').pop().toUpperCase()}</a>` : ''}</div>`;
  const frame = (file, alt, svg) => `<div class="frame"><img src="${A(file)}" alt="${esc(alt)}" loading="lazy">${chips(file, svg)}</div>`;
  const prose = (ps, cls = '') => ps && ps.length ? `<div class="prose ${cls}">${ps.map(p => `<p>${esc(p)}</p>`).join('')}</div>` : '';
  const mark = (group, c) => (M.marks || []).find(m => m.group === group && m.colour === c);

  // ---- sections. Each returns '' when its data is missing.
  const sections = [];
  const add = (id, title, html) => { if (html) sections.push({ id, title, html }); };

  add('introduction', 'Introduction', H.intro && `
    ${H.intro.image ? frame(H.intro.image, H.client) : ''}
    ${prose(H.intro.paragraphs, 'lead')}`);

  const disp = (H.scale || [])[0];
  const dispStyle = disp ? `font-family:${font(disp.font)};font-weight:${disp.weight};letter-spacing:${disp.tracking}` : '';
  add('story', 'Brand story', H.story && `
    <p class="one-liner" style="${dispStyle}">${esc(H.story.oneLiner)}</p>
    <div class="story">${H.story.items.map(i => `<div><span>${esc(i.label)}</span><p>${esc(i.text)}</p></div>`).join('')}</div>`);

  if (H.marks) {
    const mk = H.marks, lock = c => mark('Lockup', c) || mark('Symbol', c);
    const light = mk.colourways.reduce((a, b) => lum(pal[a].hex) < lum(pal[b].hex) ? a : b);
    const dark = mk.colourways.reduce((a, b) => lum(pal[a].hex) > lum(pal[b].hex) ? a : b);
    const lightField = pal.white ? 'white' : mk.fields.find(f => lum(pal[f].hex) > 0.5);
    const darkField = mk.fields.find(f => lum(pal[f].hex) < 0.05) || mk.fields[0];
    const accent = mk.colourways.find(c => c !== light && c !== dark);
    const L = lock(light), D = lock(dark);
    const symD = mark('Symbol', light);
    const busy = (H.imagery?.photos || [])[0]?.file || (H.applications || [])[0]?.file;
    const misuse = [
      ['Stretched', 'transform:scaleX(1.45)'],
      ['Rotated', 'transform:rotate(-14deg)'],
      ['Recoloured', 'filter:invert(32%) sepia(90%) saturate(2600%) hue-rotate(215deg)'],
      ['Effects added', 'filter:drop-shadow(3px 6px 4px rgba(0,0,0,.45))'],
      ['On a busy photo', '', busy ? `background:url('${A(busy)}') center/cover` : '', D],
      ['Low contrast', 'opacity:.14', `background:${(pal.soft || pal.white || H.palette[0]).hex}`]
    ];
    const anim = (M.motion || [])[0];
    const marksExtra = `
      ${mk.clearSpace && L ? `<div class="block"><h3>Clear space</h3>
        <div class="cs"><div class="cs-zone" style="--k:${mk.clearSpace || 0.5}">
          ${['tl', 'tr', 'bl', 'br'].map(c => `<i class="cs-x ${c}">x</i>`).join('')}
          <img src="${A(L.svg)}" alt=""></div></div>
        <p class="note">${esc(mk.clearSpaceNote || '')}</p></div>` : ''}
      ${mk.minSize && L ? `<div class="block"><h3>Minimum size</h3>
        <div class="scale"><div class="scale-row"><span>${mk.minSize.lockup} px</span><img src="${A(L.svg)}" style="height:${mk.minSize.lockup}px" alt=""></div>
          ${symD ? `<div class="scale-row"><span>${mk.minSize.symbol} px</span><img src="${A(symD.svg)}" style="height:${mk.minSize.symbol}px" alt=""></div>` : ''}</div>
        <p class="note">${esc(mk.minSizeNote || '')}</p></div>` : ''}
      ${L ? `<div class="block"><h3>Misuse</h3>
        <div class="misuse">${misuse.map(([t, css, bg, alt]) => `<div><div class="stage" style="${bg || ''}"><img src="${A((alt || L).svg)}" style="${css}" alt=""></div><span>${esc(t)}</span></div>`).join('')}</div>
        <p class="note">${esc(mk.misuseNote || '')}</p></div>` : ''}
      ${anim ? `<div class="block"><h3>Animation</h3>
        <div class="frame"><video src="${A(anim.mp4)}" autoplay muted loop playsinline></video>
          <div class="chips"><a class="chip" href="${A(anim.mp4)}" download>MP4</a><a class="chip" href="${A(anim.svg)}" download>SVG</a><a class="chip" href="${A(anim.lottie)}" download>Lottie</a></div></div>
        <p class="note">${esc(mk.animation?.note || '')}</p></div>` : ''}`;
    add('marks', 'Logo', `
      ${mk.scale && L ? `<div class="block"><h3>Logo scale</h3>
        <div class="scale">${mk.scale.map(px => `<div class="scale-row"><span>${px} px</span><img src="${A(L.svg)}" style="height:${px}px" alt=""></div>`).join('')}</div>
        <p class="note">${esc(mk.scaleNote || '')}</p></div>` : ''}
      <div class="block"><h3>Colour versions</h3>
        <div class="versions">
          ${L ? `<div class="version"><div class="frame" style="background:${pal[lightField].hex};box-shadow:inset 0 0 0 1px rgba(0,0,0,.06)"><img src="${A(L.svg)}" alt="${esc(L.name)} lockup">${chips(L.png, L.svg)}</div><p class="note" style="margin-top:12px">${esc(mk.lightNote || '')}</p></div>` : ''}
          ${D ? `<div class="version"><div class="frame" style="background:${pal[darkField].hex}"><img src="${A(D.svg)}" alt="${esc(D.name)} lockup">${chips(D.png, D.svg)}</div><p class="note" style="margin-top:12px">${esc(mk.darkNote || '')}</p></div>` : ''}
          ${['Symbol'].flatMap(g => [mark(g, dark), accent && mark(g, accent)]).filter(Boolean).map((s, i) => `<div class="version"><div class="frame sym" style="background:${i ? pal[darkField].hex : pal[mk.defaultField].hex}"><img src="${A(s.svg)}" alt="${esc(s.name)} symbol">${chips(s.png, s.svg)}</div><p class="note" style="margin-top:12px">${i ? `The ${esc(s.name)} symbol on ${esc(pal[darkField].name)}, as an accent.` : `The symbol on its own, on ${esc(pal[mk.defaultField].name)}. Use it for avatars, app icons and anything small.`}</p></div>`).join('')}
        </div></div>
      ${marksExtra}`);
  }

  add('colour', 'Colour', `
    <div class="block"><h3>Core palette <button class="btn" data-copy="tokens">${icon.copy}Copy CSS tokens</button></h3>
      <div class="swatches">${H.palette.map(p => {
        const [r, g, b] = rgb(p.hex), k = cmyk(p.hex);
        return `<div class="swatch"><div class="field" style="background:${p.hex};color:${ink(p.hex)}"><b>${esc(p.name)}</b><code>${esc(p.token || '')}</code></div>
          <div class="codes">
            <button class="code" data-v="${p.hex}"><span>HEX</span><em>${p.hex}</em></button>
            <button class="code" data-v="${r}, ${g}, ${b}"><span>RGB</span><em>${r}, ${g}, ${b}</em></button>
            <button class="code" data-v="${k.join(', ')}"><span>CMYK</span><em>${k.join(', ')}</em></button>
          </div><p>${esc(p.role || '')}</p></div>`;
      }).join('')}</div>
      ${prose(H.paletteNotes)}</div>
    ${H.palette.some(p => p.share) ? `<div class="block"><h3>Colour proportions</h3>
      <div class="props">${H.palette.filter(p => p.share).map(p => `<div style="flex:${p.share};background:${p.hex}" title="${esc(p.name)} ${p.share}%"></div>`).join('')}</div>
      <div class="props-key">${H.palette.filter(p => p.share).map(p => `<span><i style="background:${p.hex}"></i>${esc(p.name)} <em>${p.share}%</em></span>`).join('')}</div>
      ${prose(H.proportionNotes)}</div>` : ''}
    ${H.contrast ? `<div class="block"><h3>Readable combinations</h3>
      <div class="pairs">${H.contrast.pairs.map(([t, bg]) => {
        const r = ratio(pal[t].hex, pal[bg].hex), gr = grade(r);
        return `<div class="pair" style="background:${pal[bg].hex};color:${pal[t].hex}"><div class="aa">Aa</div><div><small>${esc(pal[t].name)} on ${esc(pal[bg].name)}</small><div class="r">${r.toFixed(1)}:1 <span class="badge ${gr === 'Fail' ? 'fail' : ''}">${gr}</span></div></div></div>`;
      }).join('')}</div>
      <p class="note">${esc(H.contrast.note || '')} AA needs 4.5:1 for body text, AA Large needs 3:1 for text from 24px, or 19px bold.</p></div>` : ''}`);

  add('typography', 'Typography', H.fonts && `
    <div class="block"><h3>Typefaces</h3>
      <div class="fonts">${H.fonts.map(f => `<div class="font"><div class="aa" style="font-family:${f.family}">Aa</div><b>${esc(f.name)}</b><small>${esc(f.weights)}</small><p>${esc(f.note)}</p>${f.url ? `<a href="${f.url}" target="_blank" rel="noopener">Get ${esc(f.name)}</a>` : ''}</div>`).join('')}</div></div>
    ${H.scale ? `<div class="block"><h3>Type scale <button class="btn" data-copy="tokens">${icon.copy}Copy type tokens</button></h3>
      <div class="tscale">${H.scale.map(s => `<div class="trow"><div><div class="lbl">${esc(s.label)}</div><span class="spec">${esc(s.font)} · ${s.weight} · ${s.size}px · ${+(s.size / 16).toFixed(3)}rem · lh ${s.lh}</span></div>
        <div class="smp" style="font-family:${font(s.font)};font-weight:${s.weight};font-size:${s.size}px;line-height:${s.lh};letter-spacing:${s.tracking};${s.colour && pal[s.colour] ? `color:${pal[s.colour].hex}` : ''}">${esc(s.sample)}</div></div>`).join('')}</div>
      <p class="note">${esc(H.scaleNote || '')}</p></div>` : ''}`);

  const sayAvoid = (say, avoid) => `<div class="sa"><div><h5>Do</h5><ul>${say.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div><div class="avoid"><h5>Don't</h5><ul>${avoid.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div></div>`;
  add('imagery', 'Imagery', H.imagery && `
    ${prose([H.imagery.note])}
    <div class="photos">${(H.imagery.photos || []).map(p => `<div>${frame(p.file, p.caption)}<div class="caption"><span>${esc(p.caption)}</span></div></div>`).join('')}</div>
    ${H.imagery.do ? `<div class="rule">${sayAvoid(H.imagery.do, H.imagery.dont || [])}</div>` : ''}`);

  if (H.voice) {
    const v = H.voice;
    add('voice', 'Tone of voice', `
      <p class="voice-sum">${esc(v.summary)}</p>
      ${v.examples ? `<div class="examples">${v.examples.map(e => `<div class="ex"><span>${esc(e.label)}</span><p style="font-family:${disp ? font(disp.font) : 'inherit'};font-weight:${disp ? disp.weight : 500}">${esc(e.text)}</p></div>`).join('')}</div>` : ''}
      ${v.rules ? `<div class="rules">${v.rules.map(r => `<div class="rule"><h4>${esc(r.title)}</h4><p>${esc(r.line)}</p>
        <div class="sa"><div><h5>Say</h5><ul>${r.say.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div><div class="avoid"><h5>Avoid</h5><ul>${r.avoid.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div></div></div>`).join('')}</div>` : ''}
      ${v.product ? `<div class="block"><h3>Product copy</h3>
        <div class="pc"><div class="pc-row pc-head"><span></span><span>Say</span><span>Avoid</span></div>
          ${v.product.map(r => `<div class="pc-row"><b>${esc(r.context)}</b><span>${esc(r.say)}</span><span class="no">${esc(r.avoid)}</span></div>`).join('')}</div></div>` : ''}`);
  }

  if (H.ui) {
    const U = H.ui;
    add('interface', 'Interface', `
      ${prose([U.note])}
      ${U.components ? `<div class="block"><h3>Components</h3>
        <div class="comps">${U.components.map((c, i) => `<div class="comp"><div class="comp-stage" style="background:${(pal[c.bg] || pal.white || H.palette[0]).hex}">${c.html}</div>
          <div class="comp-meta"><b>${esc(c.name)}</b><p>${esc(c.note)}</p><button class="btn" data-comp="${i}">${icon.copy}Copy HTML</button></div></div>`).join('')}</div></div>` : ''}
      ${U.radius ? `<div class="block"><h3>Corner radius</h3>
        <div class="radii">${U.radius.map(r => `<div><i style="border-top-left-radius:${Math.min(r.value, 96)}px"></i><b>${esc(r.name)} · ${r.value === 999 ? 'full' : r.value + 'px'}</b><span>${esc(r.note)}</span></div>`).join('')}</div></div>` : ''}
      ${U.spacing ? `<div class="block"><h3>Spacing</h3>
        <div class="space">${U.spacing.map(s => `<div><i style="width:${s.value}px"></i><b>${s.value}px</b><span>${esc(s.note)}</span></div>`).join('')}</div></div>` : ''}
      ${U.layout || U.darkMode ? `<div class="block"><h3>Layout and dark mode</h3><div class="story two">
        ${U.layout ? `<div><span>Layout</span><p>${esc(U.layout)}</p></div>` : ''}${U.darkMode ? `<div><span>Dark mode</span><p>${esc(U.darkMode)}</p></div>` : ''}</div></div>` : ''}`);
  }

  if (H.social) {
    const S = H.social;
    const av = (M.pfp || []).find(p => p.colour === H.marks.defaultField) || (M.pfp || [])[0];
    add('social', 'Social media', `
      <p class="note">${esc(S.note || '')}</p>
      ${S.profiles ? `<div class="block"><h3>Profiles</h3><div class="profs">${S.profiles.map(p => `
        <div class="prof ${p.platform.toLowerCase()}"><span class="plat">${esc(p.platform)}</span>
          <div class="prof-hd"><img src="${A(p.header)}" alt=""></div>
          <div class="prof-body">${av ? `<img class="prof-av" src="${A(av.png)}" alt="">` : ''}
            <div class="prof-btn">${p.platform === 'YouTube' ? 'Subscribe' : 'Follow'}</div>
            <b>${esc(p.name)}</b><a>${esc(p.link)}</a><p>${esc(p.bio)}</p></div></div>`).join('')}</div></div>` : ''}
      <div class="block"><h3>Headers</h3><div class="hdrs">${S.headers.map(h => `<div>${frame(h.file, h.label)}<div class="caption"><b>${esc(h.label)}</b><span>${esc(h.size)}</span></div></div>`).join('')}</div>
        <p class="note">${esc(S.bannerNote || '')}</p></div>
      ${(M.pfp || []).length ? `<div class="block"><h3>Profile pictures</h3><div class="pfps">${M.pfp.map(p => `<a class="pfp ${p.colour === H.marks.defaultField ? 'def' : ''}" href="${A(p.png)}" download><img src="${A(p.png)}" alt="">${esc(p.name)}</a>`).join('')}</div>
        ${(M.avatars || []).length ? `<div class="avs">${M.avatars.map(a => `<div><img src="${A(a.file)}" alt=""><b>${esc(a.name)}</b><span>${esc(a.note)}</span><a href="${A(a.file)}" download>PNG</a></div>`).join('')}</div>` : ''}
        <p class="note">${esc(S.avatarNote || '')}</p></div>` : ''}`);
  }

  if (H.ads) {
    const av = (M.pfp || []).find(p => p.colour === H.marks.defaultField) || (M.pfp || [])[0];
    const who = p => `<div class="ad-who">${av ? `<img src="${A(av.png)}" alt="">` : ''}<div><b>${esc(H.client)}</b><span>${p === 'Instagram' ? 'Sponsored' : 'Promoted'}</span></div></div>`;
    const card = a => a.id === 'story'
      ? `<div class="ad story-ad"><span class="plat">${esc(a.platform)} · ${esc(a.format)}</span><div class="phone">${frame(a.file, a.text)}</div><div class="caption"><span>${esc(a.size)}. The top 250px and bottom 340px stay clear for the platform.</span></div></div>`
      : `<div class="ad"><span class="plat">${esc(a.platform)} · ${esc(a.format)}</span><div class="feed">${who(a.platform)}
          ${a.intro && a.platform !== 'Instagram' ? `<p class="ad-intro">${esc(a.intro)}</p>` : ''}
          ${frame(a.file, a.text)}
          <div class="ad-bar"><div>${a.platform === 'Instagram' ? '' : `<b>${esc(a.headline || '')}</b>`}${a.platform === 'LinkedIn' ? `<span>${esc((H.site ? new URL(H.site).host : ''))}</span>` : ''}</div><span class="ad-cta">${esc(a.cta || '')}</span></div>
          ${a.intro && a.platform === 'Instagram' ? `<p class="ad-intro"><b>${esc(H.client)}</b> ${esc(a.intro)}</p>` : ''}</div>
          <div class="caption"><span>${esc(a.size)}</span></div></div>`;
    add('advertising', 'Advertising', `
      ${prose([H.ads.note])}
      <div class="block"><h3>Ad samples</h3><div class="ads">${H.ads.items.map(card).join('')}</div></div>
      ${H.ads.rules ? `<div class="block"><h3>Ad rules</h3><div class="never ok">${H.ads.rules.map(r => `<div>${esc(r)}</div>`).join('')}</div></div>` : ''}`);
  }

  // email signature: table markup with an absolute image URL, so it survives Gmail, Apple Mail and Outlook
  const sig = H.templates?.signature;
  const sigMark = sig && (mark('Symbol', H.marks.defaultField === 'orange' ? 'orange' : H.marks.colourways[1]) || mark('Symbol', H.marks.colourways[0]));
  const sigHtml = sig ? `<table cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,Helvetica,sans-serif;color:#0A0A0A;border-collapse:collapse"><tr>
<td style="padding:0 14px 0 0;vertical-align:top">${sigMark ? `<img src="${location.origin + A(sigMark.png)}" width="36" height="36" alt="${esc(H.client)}" style="display:block;border:0">` : ''}</td>
<td style="vertical-align:top;font-size:13px;line-height:1.5"><b style="font-size:14px">${esc(sig.name)}</b><br><span style="color:#7D7D7D">${esc(sig.role)}</span><br>${sig.links.map(l => `<a href="${l.url}" style="color:#0A0A0A;text-decoration:none">${esc(l.label)}</a>`).join(' &nbsp;·&nbsp; ')}</td></tr></table>` : '';
  add('templates', 'Templates', H.templates && `
    ${prose([H.templates.note])}
    ${sig ? `<div class="block"><h3>Email signature</h3>
      <div class="sig"><div class="sig-mail"><div class="sig-lines"><i></i><i></i><i style="width:40%"></i></div>${sigHtml}</div>
        <div class="actions" style="margin-top:0"><button class="btn dark" data-sig="rich">${icon.copy}Copy signature</button><button class="btn" data-sig="html">${icon.copy}Copy HTML</button></div>
        <p class="note">Copy, then paste into Gmail (Settings, Signature) or Apple Mail (Settings, Signatures). Change the name and role for each person.</p></div></div>` : ''}
    ${(H.templates.files || []).length ? `<div class="block"><h3>Posts, slides and cards</h3>
      <div class="tpls">${H.templates.files.map(t => `<div class="${/story/.test(t.id) ? 'tall' : ''}">${frame(t.file, t.label)}<div class="caption"><b>${esc(t.label)}</b><span>${esc(t.size)}</span></div></div>`).join('')}</div></div>` : ''}`);

  add('in-use', 'Brand in use', (H.applications || H.rules) && `
    ${(H.applications || []).map(a => `<div>${frame(a.file, a.title)}<div class="caption"><b>${esc(a.title)}</b><span>${esc(a.caption || '')}</span></div></div>`).join('')}
    ${prose(H.applicationsNote ? [H.applicationsNote] : [])}
    ${H.rules ? `<div class="block"><h3>Never</h3><div class="never">${H.rules.map(r => `<div>${esc(r)}</div>`).join('')}</div></div>` : ''}`);

  add('ai', 'AI brand kit', H.ai && `
    ${prose([`Give your AI tools the brand. brand.md holds everything on this page as plain text: colours, type, voice, interface rules and the never list. Drop it into a Claude Project, a custom GPT, Cursor rules or any assistant's instructions, and the copy and layouts it makes start on-brand.`,
      `The Claude skill does the same automatically. Install it once in Claude (Settings, Capabilities, Skills, Upload) and it loads whenever you ask for anything ${H.client}: a post, an email, a landing page.`])}
    <div class="actions" style="margin-top:0">
      <a class="btn dark" href="${A(H.ai.md)}" download>${icon.down}Download brand.md</a>
      <button class="btn" data-md>${icon.copy}Copy brand.md</button>
      <a class="btn" href="${A(H.ai.skill)}" download>${icon.down}Download Claude skill</a>
    </div>
    <pre class="md" data-md-preview></pre>`);

  // ---- exports: everything the manifest lists, plus fonts
  const tile = (pv, name, note, links, bg, cls = '') => `<div class="tile"><div class="pv ${cls}" style="background:${bg || 'transparent'}">${pv}</div><div class="nm">${esc(name)}</div>${note ? `<div class="nt">${esc(note)}</div>` : ''}<div class="dl">${links}</div></div>`;
  const dl = (f, label) => `<a href="${A(f)}" download>${label || f.split('.').pop().toUpperCase()}</a>`;
  const fieldFor = c => lum(pal[c].hex) > 0.6 ? (pal.ink || H.palette[0]).hex : (pal.white || pal.soft || H.palette[0]).hex;
  const groups = [];
  for (const g of ['Symbol', 'Lockup']) {
    const ms = (M.marks || []).filter(m => m.group === g);
    if (ms.length) groups.push([g, ms.map(m => tile(`<img src="${A(m.png)}" alt="">`, m.name, '', dl(m.svg) + dl(m.png) + `<button data-svg="${A(m.svg)}">Copy</button>`, fieldFor(m.colour))).join('')]);
  }
  if ((M.pfp || []).length) groups.push(['Profile pictures', M.pfp.map(p => tile(`<img src="${A(p.png)}" alt="">`, p.name, '1000 × 1000', dl(p.svg) + dl(p.png), '#fff', 'round')).join('')]);
  if ((M.icons || []).length) groups.push(['Favicons and app icons', M.icons.map(i => tile(`<img src="${A(i.file)}" alt="" style="max-height:${/512|192|180/.test(i.note) ? '80%' : '40px'};border-radius:${/apple|PWA/i.test(i.name) ? '22%' : '0'}">`, i.name, i.note, dl(i.file), '#fff')).join('')]);
  if ((M.motion || []).length) groups.push(['Logo animation', M.motion.map(m => tile(`<img src="${A(m.svg)}" alt="">`, m.name, m.note, dl(m.mp4) + dl(m.svg) + dl(m.lottie, 'LOTTIE'), '#fff')).join('')]);
  if ((M.social || []).length) groups.push(['Social media headers', M.social.map(s => tile(`<img src="${A(s.file)}" alt="">`, s.name, s.note, dl(s.file), '', 'cover')).join('')]);
  if ((M.avatars || []).length) groups.push(['Avatars by platform', M.avatars.map(a => tile(`<img src="${A(a.file)}" alt="">`, a.name, a.note, dl(a.file), '#fff', 'round')).join('')]);
  if ((M.ads || []).length) groups.push(['Ads', M.ads.map(a => tile(`<img src="${A(a.file)}" alt="">`, a.name, a.note, dl(a.file), '', 'cover')).join('')]);
  if ((M.templates || []).length) groups.push(['Templates', M.templates.map(s => tile(`<img src="${A(s.file)}" alt="">`, s.name, s.note, dl(s.file), '', 'cover')).join('')]);
  if ((M.imagery || []).length) groups.push(['Photography', M.imagery.map(s => tile(`<img src="${A(s.file)}" alt="">`, s.name, '', dl(s.file), '', 'cover')).join('')]);
  if ((M.applications || []).length) groups.push(['Applications', M.applications.map(s => tile(`<img src="${A(s.file)}" alt="">`, s.name, s.note || '', dl(s.file), '', 'cover')).join('')]);
  if (H.ai) groups.push(['AI brand kit', tile('<div class="md-ico">.md</div>', 'brand.md', 'Any AI assistant', dl(H.ai.md, 'MD'), '#fff') + tile('<div class="md-ico">skill</div>', 'Claude skill', 'Install in Claude', dl(H.ai.skill, 'SKILL'), '#fff')]);
  groups.push(['Typefaces', H.fonts.map(f => tile(`<div style="font-family:${f.family};font-size:56px;line-height:1">Aa</div>`, f.name, f.licence ? 'Free, OFL' : '', f.url ? `<a href="${f.url}" target="_blank" rel="noopener">Get font</a>` : '', '#fff')).join('')]);
  add('exports', 'Export assets', `
    <div class="actions" style="margin-top:0">
      ${H.zip ? `<a class="btn dark" href="${H.base}${H.zip}" download>${icon.down}Download all assets</a>` : ''}
      <button class="btn" data-copy="tokens">${icon.copy}Copy CSS tokens</button>
      <button class="btn" data-print>${icon.doc}Save guidelines as PDF</button>
    </div>
    ${groups.map(([t, h]) => `<div class="egroup"><h3>${esc(t)}</h3><div class="tiles">${h}</div></div>`).join('')}`);

  const date = d => new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  if (H.support) {
    const S = H.support, c = S.contact || {};
    add('updates', 'Updates and support', `
      ${prose([S.note])}
      ${S.changelog ? `<div class="block"><h3>What changed</h3><div class="log">${S.changelog.map(l => `<div><span>${date(l.date)}</span><p>${esc(l.note)}</p></div>`).join('')}</div></div>` : ''}
      ${S.sources ? `<div class="block"><h3>Source files</h3><div class="srcs">${S.sources.map(s => `<a href="${s.url}" target="_blank" rel="noopener">${esc(s.label)} <em>↗</em></a>`).join('')}</div></div>` : ''}
      ${c.booking ? `<div class="contact"><div><b>${esc(c.line || '')}</b><p>${esc(c.by || '')} made this system and can extend it.</p></div><a class="btn dark" href="${c.booking}" target="_blank" rel="noopener">Book a call</a></div>` : ''}`);
  }

  // ---- page
  const sym = mark('Symbol', (H.marks && H.marks.colourways.reduce((a, b) => lum(pal[a].hex) < lum(pal[b].hex) ? a : b)) || '');
  const brand = `<a class="brand" href="#top">${sym ? `<img src="${A(sym.svg)}" alt="">` : ''}${esc(H.client)}</a>`;
  document.getElementById('app').innerHTML = `
    <aside class="side">
      ${brand}
      <nav class="toc"></nav>
      <div class="side-actions">
        ${H.zip ? `<a href="${H.base}${H.zip}" download>${icon.down}Download all assets</a>` : ''}
        <button data-copy="tokens">${icon.copy}Copy CSS tokens</button>
        <button data-print>${icon.doc}Save as PDF</button>
      </div>
      <a class="by" href="https://crucial.design" target="_blank" rel="noopener">Made by Crucial.Design</a>
    </aside>
    <header class="mbar">${brand}<button class="menu" aria-label="Open navigation" aria-expanded="false"><span></span><span></span></button></header>
    <div class="scrim"></div>
    <main id="top">
      <div class="hero"><h1>${esc(H.client)} Guidelines</h1><p>${esc(H.tagline || '')}</p>
        <div class="meta"><span>${esc(H.version || '')}</span><span>Updated ${date(H.updated)}</span>${H.site ? `<a href="${H.site}" target="_blank" rel="noopener">${new URL(H.site).host}</a>` : ''}</div></div>
      ${sections.map(s => `<section class="s" id="${s.id}"><h2>${esc(s.title)}</h2><div class="body">${s.html}</div></section>`).join('')}
      <footer><p>Live brand system made by <a href="https://crucial.design" target="_blank" rel="noopener">Crucial.Design</a> for ${esc(H.client)}. This page is kept up to date, so bookmark it rather than saving copies.
        <small>Typefaces are licensed by their foundries, not by this page. Check each licence before you use a font in a product or for distribution.</small></p>
        <span>Updated ${date(H.updated)}</span></footer>
    </main>`;

  // sidebar: one entry per section, its sub-headings listed under it and opened while it is active
  const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const secs = [...document.querySelectorAll('section.s')];
  const subs = new Map(secs.map(sec => [sec, [...sec.querySelectorAll('.block > h3, .egroup > h3')].map(h => {
    h.id = sec.id + '-' + slug(h.firstChild.textContent);
    return h;
  })]));
  document.querySelector('.toc').innerHTML = secs.map(sec => {
    const hs = subs.get(sec);
    return `<div class="grp"><a href="#${sec.id}">${esc(sec.querySelector('h2').textContent)}</a>${hs.length > 1 ? `<div class="sub"><div>${hs.map(h => `<a href="#${h.id}">${esc(h.firstChild.textContent.trim())}</a>`).join('')}</div></div>` : ''}</div>`;
  }).join('');

  // ---- behaviour
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-v],[data-svg],[data-copy],[data-print]');
    if (!t) return;
    if (t.dataset.v) copy(t.dataset.v, `Copied ${t.dataset.v}`);
    else if (t.dataset.svg) copySvg(t.dataset.svg);
    else if (t.dataset.copy === 'tokens') copy(tokensCss(), 'CSS tokens copied');
    else if ('print' in t.dataset) window.print();
  });
  document.addEventListener('click', async e => {
    const t = e.target.closest('[data-comp],[data-sig],[data-md]');
    if (!t) return;
    if (t.dataset.comp) copy(H.ui.components[+t.dataset.comp].html, 'Component HTML copied');
    else if (t.dataset.sig === 'html') copy(sigHtml, 'Signature HTML copied');
    else if (t.dataset.sig === 'rich') {
      // rich copy pastes as a formatted signature, not as code
      try { await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([sigHtml], { type: 'text/html' }), 'text/plain': new Blob([document.querySelector('.sig-mail table').innerText], { type: 'text/plain' }) })]); say('Signature copied. Paste it into your mail settings'); }
      catch (err) { copy(sigHtml, 'Signature HTML copied'); }
    } else if ('md' in t.dataset) copy(await (await fetch(A(H.ai.md))).text(), 'brand.md copied');
  });
  const pre = document.querySelector('[data-md-preview]');
  if (pre) fetch(A(H.ai.md)).then(r => r.text()).then(t => { pre.textContent = t.split('\n').slice(0, 40).join('\n') + '\n…'; });
  // the active entry is the last section (and sub-heading) whose top has passed the upper third of the screen
  const grps = [...document.querySelectorAll('.toc .grp')], line = () => innerHeight * 0.3;
  let current, ticking = false;
  const setActive = () => {
    ticking = false;
    const i = secs.reduce((n, s, k) => s.getBoundingClientRect().top < line() ? k : n, 0);
    const hs = subs.get(secs[i]);
    const h = hs.filter(x => x.getBoundingClientRect().top < line()).pop();
    const key = secs[i].id + (h ? '#' + h.id : '');
    if (key === current) return;
    current = key;
    grps.forEach((g, k) => g.classList.toggle('on', k === i));
    document.querySelectorAll('.toc .sub a').forEach(a => a.classList.toggle('on', !!h && a.getAttribute('href') === '#' + h.id));
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(setActive); } }, { passive: true });
  addEventListener('resize', setActive);
  setActive();

  // small screens: the sidebar becomes a drawer behind the menu button
  const menu = document.querySelector('.menu');
  const open = on => { document.body.classList.toggle('menu-open', on); menu.setAttribute('aria-expanded', on); };
  menu.addEventListener('click', () => open(!document.body.classList.contains('menu-open')));
  document.querySelector('.scrim').addEventListener('click', () => open(false));
  document.querySelector('.side').addEventListener('click', e => { if (e.target.closest('a[href^="#"]')) open(false); });
  addEventListener('keydown', e => { if (e.key === 'Escape') open(false); });
})();
