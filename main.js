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
    var link = e.target.closest && e.target.closest('a');
    if (link) {
      if (link.getAttribute('href').startsWith('#')) closePod();
      return;
    }
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
