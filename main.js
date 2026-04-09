/* ========================================
   Scroll-triggered fade-in animations
   ======================================== */
const observer = new IntersectionObserver(function(entries) {
  entries.forEach(function(entry) {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, {
  threshold: 0.1,
  rootMargin: '0px 0px -40px 0px'
});

document.querySelectorAll('.fade-in').forEach(function(el) {
  observer.observe(el);
});

/* ========================================
   Hide nav when pricing or contact section is in view
   ======================================== */
var nav = document.getElementById('nav');
var pricingSection = document.getElementById('pricing');
var pricingCtaSection = document.getElementById('pricing-cta');
var contactSection = document.getElementById('contact');
var navHideSections = new Set();

var navObserver = new IntersectionObserver(function(entries) {
  entries.forEach(function(entry) {
    if (entry.isIntersecting) {
      navHideSections.add(entry.target.id);
    } else {
      navHideSections.delete(entry.target.id);
    }
  });
  if (navHideSections.size > 0) {
    nav.classList.add('nav-hidden');
  } else {
    nav.classList.remove('nav-hidden');
  }
}, {
  threshold: 0.05
});

if (pricingSection) navObserver.observe(pricingSection);
if (pricingCtaSection) navObserver.observe(pricingCtaSection);
if (contactSection) navObserver.observe(contactSection);

/* ========================================
   Nav Panel (Menu + Say hi) open/close + tabs
   ======================================== */
(function() {
  var pod = document.getElementById('nav-pod');
  if (!pod) return;

  function openPod() {
    pod.classList.add('is-open');
    pod.setAttribute('aria-expanded', 'true');
  }
  function closePod() {
    pod.classList.remove('is-open');
    pod.setAttribute('aria-expanded', 'false');
  }
  function togglePod() {
    if (pod.classList.contains('is-open')) closePod();
    else openPod();
  }

  pod.addEventListener('click', function(e) {
    // Don't intercept clicks on links inside the open pod
    if (e.target.closest && e.target.closest('a')) return;
    if (pod.classList.contains('is-open')) return;
    e.preventDefault();
    e.stopPropagation();
    togglePod();
  });

  pod.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      togglePod();
    }
  });

  // Click anywhere outside the pod closes it
  document.addEventListener('click', function(e) {
    if (!pod.classList.contains('is-open')) return;
    if (pod.contains(e.target)) return;
    closePod();
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && pod.classList.contains('is-open')) closePod();
  });
})();

/* ========================================
   Hero: user journey animation
   5 users take 5 different randomized journeys through the mess
   to the same clean path. Loops.
   ======================================== */
(function() {
  var canvas = document.querySelector('.hero-anim');
  if (!canvas) return;

  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var ctx = canvas.getContext('2d');
  var dpr = window.devicePixelRatio || 1;
  var W = 0, H = 0;
  var state = null;

  function seeded(seed) {
    var x = Math.sin(seed * 9301 + 49297) * 233280;
    return x - Math.floor(x);
  }

  function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  // Ring-scatter layout around a given center
  function layoutMessyRing(cx, cy, rx, ry, N) {
    var nodes = [];
    for (var i = 0; i < N; i++) {
      var ang = (i / N) * Math.PI * 2 + seeded(i + 31) * 0.6;
      var rr = 0.55 + seeded(i + 61) * 0.5;
      nodes.push({
        x: cx + Math.cos(ang) * rx * rr,
        y: cy + Math.sin(ang) * ry * rr
      });
    }
    return nodes;
  }

  var NUM_DOTS = 5;
  var MESSY_HOPS = 7; // each dot visits this many messy nodes, then the clean path
  var loopIndex = 0;  // bumped every cycle so the mess reshuffles

  // Mouse repel state
  var mouseX = null, mouseY = null;
  canvas.addEventListener('mousemove', function(e) {
    var rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
  });
  canvas.addEventListener('mouseleave', function() {
    mouseX = null; mouseY = null;
  });

  // Ring-scatter layout that varies per loop
  function layoutMessyRingSeeded(cx, cy, rx, ry, N, loopSeed) {
    var nodes = [];
    for (var i = 0; i < N; i++) {
      var ang = (i / N) * Math.PI * 2 + seeded(i + 31 + loopSeed * 911) * 0.9;
      var rr = 0.45 + seeded(i + 61 + loopSeed * 613) * 0.55;
      nodes.push({
        x: cx + Math.cos(ang) * rx * rr,
        y: cy + Math.sin(ang) * ry * rr
      });
    }
    return nodes;
  }

  function layout() {
    var M = 9;
    var C = 4;

    // Proportional allocation so the animation scales down cleanly on
    // mobile. Messy ring on the left, gap, clean path on the right.
    // On mobile the mess gets more room and the clean path is tighter.
    var isMobile = W < 600;
    var PAD_L = isMobile ? 2 : 14;  // left edge padding
    var PAD_R = 14;                  // right edge padding
    var totalW = Math.max(220, W - PAD_L - PAD_R);
    var messyFrac = isMobile ? 0.55 : 0.38;
    var gapFrac   = isMobile ? 0.10 : 0.12;
    var messyW = totalW * messyFrac;
    var gapW   = totalW * gapFrac;
    var cleanW = totalW - messyW - gapW;

    var ringRx = Math.min(140, messyW / 2);
    var ringRy = Math.min(110, Math.min(ringRx * 0.85, H * 0.40));
    var cyMid = H / 2;
    var cxRing = PAD_L + ringRx;
    var messyNodes = layoutMessyRingSeeded(cxRing, cyMid, ringRx, ringRy, M, loopIndex);

    // Clean path on the right
    var cleanLeft  = PAD_L + messyW + gapW;
    var cleanRight = W - PAD_R;
    var cleanNodes = [];
    for (var i = 0; i < C; i++) {
      cleanNodes.push({
        x: cleanLeft + (cleanRight - cleanLeft) * (i / (C - 1)),
        y: cyMid
      });
    }
    var allNodes = messyNodes.concat(cleanNodes);

    // Generate NUM_DOTS randomized paths. Each visits MESSY_HOPS messy
    // nodes (shuffled), then walks the clean path to the final node.
    var paths = [];
    for (var p = 0; p < NUM_DOTS; p++) {
      var idx = [];
      for (var k = 0; k < M; k++) idx.push(k);
      for (var j = idx.length - 1; j > 0; j--) {
        var r = Math.floor(seeded(p * 137 + j + 7 + loopIndex * 2029) * (j + 1));
        var tmp = idx[j]; idx[j] = idx[r]; idx[r] = tmp;
      }
      var path = idx.slice(0, MESSY_HOPS);
      for (var cc = 0; cc < C; cc++) path.push(M + cc);
      paths.push(path);
    }

    // Ghost edges — only messy-internal segments. Never draw any line
    // that crosses between the messy and clean sides.
    var ghostEdges = [];
    var seen = {};
    for (var pi = 0; pi < paths.length; pi++) {
      var pa = paths[pi];
      for (var ei = 0; ei < pa.length - 1; ei++) {
        var aKey = pa[ei], bKey = pa[ei + 1];
        if (aKey >= M || bKey >= M) continue; // skip anything touching clean
        var key = aKey < bKey ? aKey + '-' + bKey : bKey + '-' + aKey;
        if (!seen[key]) {
          seen[key] = true;
          ghostEdges.push([aKey, bKey]);
        }
      }
    }

    // Per-messy-node smoothed repel offset
    var messyOffsets = [];
    for (var mo = 0; mo < M; mo++) messyOffsets.push({ x: 0, y: 0 });

    state = {
      M: M, C: C,
      messyNodes: messyNodes, cleanNodes: cleanNodes, allNodes: allNodes,
      paths: paths, ghostEdges: ghostEdges,
      messyOffsets: messyOffsets
    };
  }

  function resize() {
    var rect = canvas.getBoundingClientRect();
    W = rect.width;
    H = rect.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    layout();
  }

  // Disney hop: anticipation → C¹-smooth arc → brief landing squash.
  // `bridgeSeg` gets an extended anticipation (frustrated wait + shake).
  function hopPosMs(nodes, path, elapsedMs, antMs, jumpMs, holdMs, arcHeight, bridgeSeg, bridgeExtraAnt) {
    if (arcHeight == null) arcHeight = 18;
    var segs = path.length - 1;
    // Build cumulative offsets since the bridge segment is longer
    var offsets = new Array(segs + 1);
    offsets[0] = 0;
    for (var si = 0; si < segs; si++) {
      var segAnt = antMs + (si === bridgeSeg ? (bridgeExtraAnt || 0) : 0);
      offsets[si + 1] = offsets[si] + segAnt + jumpMs + holdMs;
    }
    var totalDur = offsets[segs];
    var t = Math.min(elapsedMs, Math.max(0, totalDur - 1));
    var seg = segs - 1;
    for (var sj = 0; sj < segs; sj++) {
      if (t < offsets[sj + 1]) { seg = sj; break; }
    }
    var inSeg = t - offsets[seg];
    var thisAnt = antMs + (seg === bridgeSeg ? (bridgeExtraAnt || 0) : 0);
    var a = nodes[path[seg]];
    var b = nodes[path[seg + 1]];
    var x, y, scaleX = 1, scaleY = 1, moveT = 0, landPulse = 0, shakeT = 0;

    if (inSeg < thisAnt) {
      var aT = inSeg / thisAnt;
      if (seg === bridgeSeg && bridgeExtraAnt > 0) {
        // Frustrated wait: shake the whole time, crouch hard at the very end
        var crouchPhase = Math.max(0, (aT - 0.85) / 0.15);
        var crouchB = Math.sin(crouchPhase * Math.PI * 0.5);
        scaleX = 1 + crouchB * 0.45;
        scaleY = 1 - crouchB * 0.55;
        shakeT = 1 - crouchPhase; // full shake, tapers into the crouch
      } else {
        var crouch = Math.sin(aT * Math.PI);
        scaleX = 1 + crouch * 0.35;
        scaleY = 1 - crouch * 0.45;
      }
      x = a.x; y = a.y;
    } else if (inSeg < thisAnt + jumpMs) {
      moveT = (inSeg - thisAnt) / jumpMs;
      var u = 1 - Math.pow(1 - moveT, 1.8);
      var h = Math.sin(u * Math.PI);
      x = a.x + (b.x - a.x) * u;
      y = a.y + (b.y - a.y) * u - h * arcHeight;
      scaleY = 1 + h * 0.16;
      scaleX = 1 - h * 0.09;
    } else {
      var hT = (inSeg - thisAnt - jumpMs) / holdMs;
      x = b.x; y = b.y; moveT = 1;
      var squash = Math.max(0, 1 - hT * 3);
      scaleX = 1 + squash * 0.35;
      scaleY = 1 - squash * 0.4;
      landPulse = squash;
    }
    return { x: x, y: y, scaleX: scaleX, scaleY: scaleY, seg: seg, moveT: moveT, landPulse: landPulse, shakeT: shakeT, totalDur: totalDur };
  }

  function moodForSeg(seg, totalSegs, messyHops) {
    // Final clean segment → green (arrived)
    if (seg >= totalSegs - 1) return { dot: '#3fa24a', halo: 'rgba(63,162,74,0.22)', trail: '#3fa24a' };
    // On the clean path but not at the end → calm black
    if (seg >= messyHops)     return { dot: '#1A1A18', halo: 'rgba(26,26,24,0.12)', trail: '#1A1A18' };
    // Second half of messy hops → frustrated red
    if (seg >= Math.floor(messyHops / 2))
      return { dot: '#C8451B', halo: 'rgba(200,69,27,0.22)', trail: 'rgba(200,69,27,0.9)' };
    // First half → still exploring (black)
    return { dot: '#1A1A18', halo: 'rgba(26,26,24,0.12)', trail: 'rgba(26,26,24,0.85)' };
  }

  var cycleStart = performance.now();
  var lastLoopDur = 0;

  function frame(now) {
    // When a cycle finishes, reshuffle the mess and start fresh
    if (lastLoopDur > 0 && (now - cycleStart) >= lastLoopDur) {
      loopIndex++;
      layout();
      cycleStart = now;
    }
    var elapsed = now - cycleStart;
    var s = state;
    ctx.clearRect(0, 0, W, H);

    // ---- Magnetic repel: nudge messy nodes away from the cursor ----
    var REPEL_R = 95;    // influence radius
    var MIN_GAP = 22;    // cursor never gets closer than this to a node
    var SOFT_PUSH = 0.45; // extra springiness outside MIN_GAP
    var LERP = 0.22;     // catch-up speed (higher = snappier)
    for (var mi0 = 0; mi0 < s.M; mi0++) {
      var origX0 = s.messyNodes[mi0].x;
      var origY0 = s.messyNodes[mi0].y;
      var tgtX = 0, tgtY = 0;
      if (mouseX != null) {
        var dx0 = origX0 - mouseX;
        var dy0 = origY0 - mouseY;
        var dist0 = Math.sqrt(dx0 * dx0 + dy0 * dy0);
        if (dist0 < REPEL_R) {
          var dirX = dist0 < 0.01 ? 1 : dx0 / dist0;
          var dirY = dist0 < 0.01 ? 0 : dy0 / dist0;
          var softPush = (REPEL_R - dist0) * SOFT_PUSH;
          var targetDist = Math.max(MIN_GAP, dist0 + softPush);
          tgtX = dirX * targetDist - dx0;
          tgtY = dirY * targetDist - dy0;
        }
      }
      s.messyOffsets[mi0].x += (tgtX - s.messyOffsets[mi0].x) * LERP;
      s.messyOffsets[mi0].y += (tgtY - s.messyOffsets[mi0].y) * LERP;
    }
    // Build a displaced node array used for ALL rendering + hopPosMs
    var displacedNodes = new Array(s.allNodes.length);
    for (var dn = 0; dn < s.M; dn++) {
      displacedNodes[dn] = {
        x: s.messyNodes[dn].x + s.messyOffsets[dn].x,
        y: s.messyNodes[dn].y + s.messyOffsets[dn].y
      };
    }
    for (var dn2 = s.M; dn2 < s.allNodes.length; dn2++) {
      displacedNodes[dn2] = s.allNodes[dn2];
    }

    // Per-segment timing
    var antMs = 120, jumpMs = 400, holdMs = 240;
    var bridgeExtraAnt = 1400; // frustrated pause at the last messy node
    var segTime = antMs + jumpMs + holdMs;
    var segCount = s.paths[0].length - 1; // all paths same length
    var journeyDur = segCount * segTime + bridgeExtraAnt;
    // Next dot starts when the previous one is ~75% through its journey
    var stagger = journeyDur * 0.72;
    var endHold = 900;   // pause to savour the finished state
    var wipeDur = 850;   // left→right sweep that clears the scene
    var endPause = endHold + wipeDur;
    var loopDur = (NUM_DOTS - 1) * stagger + journeyDur + endPause;
    lastLoopDur = loopDur;
    var cycleT = Math.min(elapsed, loopDur);

    // Smart end transition: a vertical wipe that sweeps left→right,
    // erasing the mess so the loop can restart cleanly. Anything whose
    // x lies to the LEFT of wipeX is hidden.
    var wipeStart = (NUM_DOTS - 1) * stagger + journeyDur + endHold;
    var wipeT = 0;
    if (cycleT >= wipeStart) {
      wipeT = Math.min(1, (cycleT - wipeStart) / wipeDur);
    }
    // Ease-in-out the wipe and extend slightly past both edges
    var wipeEased = wipeT < 0.5 ? 2 * wipeT * wipeT : 1 - Math.pow(-2 * wipeT + 2, 2) / 2;
    var wipeX = -20 + wipeEased * (W + 40);
    // Soft edge so elements don't pop — anything within softEdge of wipeX fades
    var softEdge = 36;
    function visibleAlpha(x) {
      if (wipeT <= 0) return 1;
      var d = x - wipeX;
      if (d >= softEdge) return 1;
      if (d <= 0) return 0;
      return d / softEdge;
    }

    // ---- Ghost edges: thin dashed, only on the messy side ----
    ctx.setLineDash([3, 4]);
    ctx.lineWidth = 0.7;
    for (var g = 0; g < s.ghostEdges.length; g++) {
      var ga = displacedNodes[s.ghostEdges[g][0]];
      var gb = displacedNodes[s.ghostEdges[g][1]];
      var gAlpha = visibleAlpha((ga.x + gb.x) / 2);
      if (gAlpha <= 0) continue;
      ctx.strokeStyle = 'rgba(160,160,160,' + (0.5 * gAlpha) + ')';
      ctx.beginPath();
      ctx.moveTo(ga.x, ga.y);
      ctx.lineTo(gb.x, gb.y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // ---- Messy nodes ----
    for (var mi = 0; mi < s.messyNodes.length; mi++) {
      var mn = displacedNodes[mi];
      var mAlpha = visibleAlpha(mn.x);
      if (mAlpha <= 0) continue;
      ctx.fillStyle = 'rgba(187,187,187,' + mAlpha + ')';
      ctx.beginPath();
      ctx.arc(mn.x, mn.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    // ---- Clean nodes ----
    for (var ci = 0; ci < s.cleanNodes.length; ci++) {
      var cn = s.cleanNodes[ci];
      var cAlpha = visibleAlpha(cn.x);
      if (cAlpha <= 0) continue;
      ctx.fillStyle = 'rgba(26,26,24,' + cAlpha + ')';
      ctx.beginPath();
      ctx.arc(cn.x, cn.y, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // ---- Each of the 5 dots ----
    ctx.lineCap = 'round';
    ctx.lineWidth = 1.6;
    var BRIDGE_SEG = MESSY_HOPS - 1; // segment connecting messy ↔ clean
    for (var d = 0; d < NUM_DOTS; d++) {
      var localT = cycleT - d * stagger;
      if (localT < 0) continue;

      var path = s.paths[d];
      var finished = localT >= journeyDur;
      var clampedT = finished ? journeyDur - 1 : localT;
      var pos = hopPosMs(displacedNodes, path, clampedT, antMs, jumpMs, holdMs, 18, BRIDGE_SEG, bridgeExtraAnt);
      var lastCompleted = finished
        ? segCount - 1
        : (pos.moveT >= 1 ? pos.seg : pos.seg - 1);

      // Walked path — solid, straight lines. Never draw the bridge
      // segment that would visually connect the messy and clean sides.
      for (var ti = 0; ti <= lastCompleted; ti++) {
        if (ti === BRIDGE_SEG) continue;
        var segMood = moodForSeg(ti, segCount, MESSY_HOPS);
        var pa = displacedNodes[path[ti]];
        var pb = displacedNodes[path[ti + 1]];
        var tAlpha = visibleAlpha((pa.x + pb.x) / 2);
        if (tAlpha <= 0) continue;
        ctx.save();
        ctx.globalAlpha = tAlpha;
        ctx.strokeStyle = segMood.trail;
        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
        ctx.stroke();
        ctx.restore();
      }

      // Active dot — always visible, including on the bridge hop
      // (mess → clean). We only suppress the *trail line* on that
      // bridge so the two sides stay visually unconnected.
      // Persistent "arrived" marker at the final clean node once a dot
      // has finished its journey. Stays visible until the end-wipe.
      if (finished) {
        var finalNode = displacedNodes[path[path.length - 1]];
        var fAlpha = visibleAlpha(finalNode.x);
        if (fAlpha > 0) {
          ctx.save();
          ctx.globalAlpha = fAlpha;
          ctx.fillStyle = 'rgba(63,162,74,0.22)';
          ctx.beginPath();
          ctx.arc(finalNode.x, finalNode.y, 11, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#3fa24a';
          ctx.beginPath();
          ctx.arc(finalNode.x, finalNode.y, 5.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      if (!finished) {
        // Frustration shake: strong horizontal jitter while waiting
        // at the last messy node, tapers out as the dot crouches to jump.
        var shakeX = 0, shakeY = 0;
        if (pos.shakeT > 0) {
          var amp = 3.5 * pos.shakeT;
          shakeX = Math.sin(now * 0.075 + d * 1.3) * amp;
          shakeY = Math.cos(now * 0.091 + d * 0.7) * amp * 0.35;
        }
        var dx = pos.x + shakeX;
        var dy = pos.y + shakeY;
        var dAlpha = visibleAlpha(dx);
        if (dAlpha > 0) {
          var mood = moodForSeg(pos.seg, segCount, MESSY_HOPS);
          ctx.save();
          ctx.globalAlpha = dAlpha;
          ctx.fillStyle = mood.halo;
          ctx.beginPath();
          ctx.arc(dx, dy, 11, 0, Math.PI * 2);
          ctx.fill();
          ctx.translate(dx, dy);
          ctx.scale(pos.scaleX, pos.scaleY);
          ctx.fillStyle = mood.dot;
          ctx.beginPath();
          ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
    }

    requestAnimationFrame(frame);
  }

  resize();
  window.addEventListener('resize', resize);
  requestAnimationFrame(frame);
})();

/* ========================================
   Nav trigger: mini dot animation
   A tiny echo of the hero story — messy dots on the left, a single
   dot hopping through them to a clean target on the right.
   ======================================== */
(function() {
  var canvas = document.getElementById('nav-trigger-canvas');
  if (!canvas) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var ctx = canvas.getContext('2d');
  var dpr = window.devicePixelRatio || 1;
  var W = 0, H = 0;

  function rand(seed) {
    var x = Math.sin(seed * 9301 + 49297) * 233280;
    return x - Math.floor(x);
  }

  var M = 3;           // messy dots
  var messy = [];
  var target = { x: 0, y: 0 };
  var loopSeed = 0;

  function layout() {
    // Left cluster center
    var cxL = W * 0.32;
    var cyM = H * 0.5;
    var rx = W * 0.22;
    var ry = H * 0.28;
    messy = [];
    for (var i = 0; i < M; i++) {
      var ang = (i / M) * Math.PI * 2 + rand(i + 11 + loopSeed * 97) * 1.1;
      var rr = 0.55 + rand(i + 31 + loopSeed * 53) * 0.5;
      messy.push({
        x: cxL + Math.cos(ang) * rx * rr,
        y: cyM + Math.sin(ang) * ry * rr
      });
    }
    target = { x: W * 0.82, y: cyM };
  }

  function resize() {
    var rect = canvas.getBoundingClientRect();
    W = rect.width;
    H = rect.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    layout();
  }

  // Build a shuffled path through the messy dots, ending at target
  var path = [];
  function buildPath() {
    var idx = [];
    for (var k = 0; k < M; k++) idx.push(k);
    for (var j = idx.length - 1; j > 0; j--) {
      var r = Math.floor(rand(j * 7 + loopSeed * 131) * (j + 1));
      var tmp = idx[j]; idx[j] = idx[r]; idx[r] = tmp;
    }
    path = idx.concat([M]); // M = target index
  }
  buildPath();

  var antMs = 110, jumpMs = 500, holdMs = 260;
  var endHoldMs = 1200;
  var fadeDur = 300; // fade out before reshuffle, fade in after

  function getNode(i) {
    return i < M ? messy[i] : target;
  }

  // Hover gating — animation only runs while the pod is hovered.
  var podEl = document.getElementById('nav-pod');
  var isHover = false;
  var hoverStart = 0;
  var lastT = 0;
  if (podEl) {
    podEl.addEventListener('mouseenter', function() {
      isHover = true;
      hoverStart = performance.now();
    });
    podEl.addEventListener('mouseleave', function() {
      isHover = false;
    });
  }

  function drawStatic() {
    ctx.clearRect(0, 0, W, H);
    // Messy nodes
    for (var i = 0; i < M; i++) {
      var mn = messy[i];
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath();
      ctx.arc(mn.x, mn.y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    // Target
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.beginPath();
    ctx.arc(target.x, target.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  function frame(now) {
    if (!isHover) {
      drawStatic();
      requestAnimationFrame(frame);
      return;
    }
    ctx.clearRect(0, 0, W, H);

    var segs = path.length - 1;
    var segTime = antMs + jumpMs + holdMs;
    var journey = segs * segTime;
    var loopDur = journey + endHoldMs;
    var t = (now - hoverStart) % loopDur;

    // Reshuffle on loop boundary
    if (t < 50 && lastT > loopDur - 200) {
      loopSeed++;
      layout();
      buildPath();
    }
    lastT = t;

    // Global fade: fade out near end, fade in at start
    var globalAlpha = 1;
    if (t > loopDur - fadeDur) {
      globalAlpha = Math.max(0, (loopDur - t) / fadeDur);
    } else if (t < fadeDur) {
      globalAlpha = t / fadeDur;
    }
    ctx.globalAlpha = globalAlpha;

    // ---- Draw messy nodes ----
    for (var i = 0; i < M; i++) {
      var mn = messy[i];
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath();
      ctx.arc(mn.x, mn.y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    // Target dot
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.beginPath();
    ctx.arc(target.x, target.y, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // ---- Active dot ----
    var finished = t >= journey;
    var clamped = finished ? journey - 1 : t;
    var seg = Math.min(segs - 1, Math.floor(clamped / segTime));
    var inSeg = clamped - seg * segTime;
    var a = getNode(path[seg]);
    var b = getNode(path[seg + 1]);
    var x, y, sx = 1, sy = 1;

    if (inSeg < antMs) {
      var aT = inSeg / antMs;
      var crouch = Math.sin(aT * Math.PI);
      sx = 1 + crouch * 0.3;
      sy = 1 - crouch * 0.4;
      x = a.x; y = a.y;
    } else if (inSeg < antMs + jumpMs) {
      var mT = (inSeg - antMs) / jumpMs;
      var u = 1 - Math.pow(1 - mT, 1.8);
      var h = Math.sin(u * Math.PI);
      x = a.x + (b.x - a.x) * u;
      y = a.y + (b.y - a.y) * u - h * 5;
      sy = 1 + h * 0.15;
      sx = 1 - h * 0.08;
    } else {
      var hT = (inSeg - antMs - jumpMs) / holdMs;
      x = b.x; y = b.y;
      var squash = Math.max(0, 1 - hT * 3);
      sx = 1 + squash * 0.3;
      sy = 1 - squash * 0.35;
    }

    // If finished, park on target with a gentle green glow
    var onTarget = finished || (seg === segs - 1 && inSeg >= antMs + jumpMs);
    var color = onTarget ? '#3fa24a' : '#1A1A18';
    var haloColor = onTarget ? 'rgba(63,162,74,0.25)' : 'rgba(0,0,0,0.12)';

    if (finished) {
      x = target.x; y = target.y; sx = 1; sy = 1;
    }

    ctx.save();
    ctx.fillStyle = haloColor;
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.translate(x, y);
    ctx.scale(sx, sy);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.globalAlpha = 1;
    requestAnimationFrame(frame);
  }

  resize();
  window.addEventListener('resize', resize);
  requestAnimationFrame(frame);
})();

/* ========================================
   Chat Widget
   ======================================== */
(function() {
  var avatarSrc = document.querySelector('.hero-avatar img, .footer-avatar img, .nav-avatar');
  var avatarPath = '/images/avatar.jpg';

  // Build DOM
  var trigger = document.createElement('div');
  trigger.className = 'chat-trigger';
  trigger.innerHTML = '<img src="' + avatarPath + '" alt="" class="chat-trigger-avatar"><span class="chat-trigger-label">Ask me anything</span>';

  var panel = document.createElement('div');
  panel.className = 'chat-panel';
  panel.innerHTML = ''
    + '<div class="chat-header">'
    +   '<span class="chat-header-title">Ask about pricing, process, or anything</span>'
    +   '<button class="chat-close" aria-label="Close chat">&times;</button>'
    + '</div>'
    + '<div class="chat-messages" id="chat-messages"></div>'
    + '<div class="chat-suggestions" id="chat-suggestions">'
    +   '<button class="chat-suggestion">What do you do?</button>'
    +   '<button class="chat-suggestion">How much does it cost?</button>'
    +   '<button class="chat-suggestion">How does it work?</button>'
    + '</div>'
    + '<form class="chat-input-wrap" id="chat-form">'
    +   '<input class="chat-input" id="chat-input" type="text" placeholder="Type a message..." autocomplete="off">'
    +   '<button class="chat-send" type="submit" aria-label="Send"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button>'
    + '</form>';

  document.body.appendChild(trigger);
  document.body.appendChild(panel);

  var messagesEl = document.getElementById('chat-messages');
  var formEl = document.getElementById('chat-form');
  var inputEl = document.getElementById('chat-input');
  var suggestionsEl = document.getElementById('chat-suggestions');
  var closeBtn = panel.querySelector('.chat-close');
  var isOpen = false;
  var isLoading = false;
  var chatMessages = [];

  // Greeting
  var greeting = 'Hi! I can help with questions about pricing, process, or what it\'s like working with Crucial.Design. What would you like to know?';

  function renderMessages() {
    var html = '<div class="chat-msg chat-msg-assistant">' + escapeHtml(greeting) + '</div>';
    for (var i = 0; i < chatMessages.length; i++) {
      var msg = chatMessages[i];
      var cls = msg.role === 'user' ? 'chat-msg-user' : 'chat-msg-assistant';
      var content = msg.role === 'assistant' ? linkify(escapeHtml(msg.content)) : escapeHtml(msg.content);
      html += '<div class="chat-msg ' + cls + '">' + content + '</div>';
    }
    messagesEl.innerHTML = html;
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  // Render greeting immediately
  renderMessages();

  function showTyping() {
    var el = document.createElement('div');
    el.className = 'chat-typing';
    el.id = 'chat-typing';
    el.innerHTML = '<span class="chat-typing-dot"></span><span class="chat-typing-dot"></span><span class="chat-typing-dot"></span>';
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function hideTyping() {
    var el = document.getElementById('chat-typing');
    if (el) el.remove();
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function linkify(text) {
    return text.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>')
               .replace(/([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/g, '<a href="mailto:$1">$1</a>');
  }

  function toggleChat() {
    isOpen = !isOpen;
    if (isOpen) {
      panel.classList.add('chat-panel-open');
      trigger.classList.add('chat-trigger-hidden');
      inputEl.focus();
    } else {
      panel.classList.remove('chat-panel-open');
      trigger.classList.remove('chat-trigger-hidden');
    }
  }

  function hideSuggestions() {
    if (suggestionsEl) suggestionsEl.style.display = 'none';
  }

  async function sendMessage(text) {
    if (isLoading || !text.trim()) return;
    isLoading = true;
    hideSuggestions();

    chatMessages.push({ role: 'user', content: text.trim() });
    renderMessages();
    showTyping();

    try {
      var res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: chatMessages })
      });

      hideTyping();

      if (!res.ok) {
        var errData = await res.json().catch(function() { return {}; });
        throw new Error(errData.error || 'Request failed');
      }

      var data = await res.json();
      chatMessages.push({ role: 'assistant', content: data.response });
      renderMessages();
    } catch (err) {
      hideTyping();
      var errorEl = document.createElement('div');
      errorEl.className = 'chat-error';
      errorEl.textContent = 'Something went wrong. Try again.';
      messagesEl.appendChild(errorEl);
      messagesEl.scrollTop = messagesEl.scrollHeight;
      // Remove the failed user message so they can retry
      chatMessages.pop();
    }

    isLoading = false;
  }

  // Events
  trigger.addEventListener('click', toggleChat);
  closeBtn.addEventListener('click', toggleChat);

  formEl.addEventListener('submit', function(e) {
    e.preventDefault();
    var text = inputEl.value;
    inputEl.value = '';
    sendMessage(text);
  });

  suggestionsEl.addEventListener('click', function(e) {
    if (e.target.classList.contains('chat-suggestion')) {
      sendMessage(e.target.textContent);
    }
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && isOpen) toggleChat();
  });

  // Hide trigger when nav hides (pricing/contact in view)
  var chatNavObserver = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting && !isOpen) {
        trigger.classList.add('chat-trigger-hidden');
      } else if (!isOpen) {
        trigger.classList.remove('chat-trigger-hidden');
      }
    });
  }, { threshold: 0.05 });

  var pricingEl = document.getElementById('pricing');
  var contactEl = document.getElementById('contact');
  if (pricingEl) chatNavObserver.observe(pricingEl);
  if (contactEl) chatNavObserver.observe(contactEl);
})();
