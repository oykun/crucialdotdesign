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
   Floating actions: circular icon buttons that blip in once the topline
   scrolls out of view (scale + fade pop, staggered — handled in CSS).
   ======================================== */
(function() {
  var floatCta = document.getElementById('float-cta');
  var topline = document.querySelector('.topline');
  if (!floatCta || !topline) return;

  // Single rAF-throttled scroll check drives both reveals:
  //  - call + email blip in once the topline has scrolled past
  //  - the avatar joins only once the in-page hero avatar has scrolled past,
  //    so we never show two of the same avatar at once
  var heroAvatar = document.querySelector('.hero-avatar');
  var ticking = false;

  function update() {
    ticking = false;
    floatCta.classList.toggle('is-visible', topline.getBoundingClientRect().bottom <= 0);
    if (heroAvatar) {
      floatCta.classList.toggle('show-avatar', heroAvatar.getBoundingClientRect().bottom < 0);
    }
  }

  window.addEventListener('scroll', function() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }, { passive: true });

  update();
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

/* ========================================
   Hero deck: shuffling stack of work cards
   A continuous loop where the front card slides away, the rest
   promote forward, and a fresh card eases in at the back —
   the "intelligent canvas" stacked-card feel.
   ======================================== */
(function() {
  var deck = document.getElementById('hero-deck');
  if (!deck) return;

  // Cards in the deck. Ordered to alternate landscape / portrait / square shapes.
  var IMAGES = [
    'images/motion/motion07.jpg',
    'images/motion/motion02.jpg',
    'images/motion/motion04.jpg',
    'images/motion/motion10.jpg',
    'images/motion/motion15.jpg',
    'images/motion/motion12.jpg',
    'images/motion/motion08.jpg',
    'images/motion/motion03.jpg',
    'images/motion/motion05.jpg',
    'images/motion/motion11.jpg',
    'images/motion/motion14.jpg',
    'images/motion/motion06.jpg',
    'images/motion/motion09.jpg',
    'images/motion/motion13.jpg',
    'images/motion/motion01.jpg'
  ];

  var heroImage = deck.closest('.hero-image');
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // No motion (or too few images): fall back to the static still.
  if (reduceMotion || IMAGES.length < 2) {
    if (heroImage) heroImage.classList.add('no-deck');
    return;
  }

  // Slots, front (0) to back. Pure 2D depth with NO opacity fade — every card is
  // fully opaque; depth reads from scale alone. Newest at full size in front.
  var SLOTS = [
    { s: 1.00, o: 1, z: 60 },
    { s: 0.87, o: 1, z: 50 },
    { s: 0.76, o: 1, z: 40 },
    { s: 0.66, o: 1, z: 30 },
    { s: 0.58, o: 1, z: 20 }
  ];
  var GONE = { s: 0.12, o: 1, z: 10 };   // shrinks away behind the stack (no fade)
  var VISIBLE = SLOTS.length;
  var SETTLE_MS = 480;                    // recycle delay (>= CSS transition)

  function rand(min, max) { return min + Math.random() * (max - min); }

  // Snappy, uneven rhythm: some land sooner, some later.
  function nextDelay() {
    return Math.random() < 0.45 ? rand(560, 900) : rand(1100, 1700);
  }

  // Entrance: starts just below the visible area and slides up into front —
  // full opacity, no fade.
  function randomEnter() {
    return { y: deck.clientHeight / 2 + 240, s: 1.0, o: 1, z: 70 };
  }
  // A small persistent scatter each card keeps for its whole life, so the stack
  // sits around the centre rather than perfectly concentric.
  function randomJitter() {
    return { jx: rand(-46, 46), jy: rand(-20, 20) };
  }

  function transformFor(slot, jit) {
    var x = jit ? jit.jx : 0;
    var y = (slot.y || 0) + (jit ? jit.jy : 0);
    return 'translate(calc(-50% + ' + x + 'px), calc(-50% + ' + y + 'px)) scale(' + slot.s + ')';
  }

  function place(card, slot, animate) {
    if (!animate) card.classList.add('no-anim');
    card.style.transform = transformFor(slot, card.jit);
    card.style.opacity = slot.o;
    card.style.zIndex = slot.z;
    if (!animate) {
      // Force reflow so the snap takes effect before re-enabling transitions.
      void card.offsetWidth;
      card.classList.remove('no-anim');
    }
  }

  // Cache each image's natural aspect ratio so cards keep exact proportions.
  var ratios = {};
  function applyAspect(card, src) {
    if (ratios[src]) { card.style.aspectRatio = ratios[src]; return; }
    var probe = new Image();
    probe.onload = function() {
      ratios[src] = probe.naturalWidth + ' / ' + probe.naturalHeight;
      if (card.dataset.src === src) card.style.aspectRatio = ratios[src];
    };
    probe.src = src;
  }

  // Preload (also warms the ratio cache).
  IMAGES.forEach(function(src) {
    var im = new Image();
    im.onload = function() { ratios[src] = im.naturalWidth + ' / ' + im.naturalHeight; };
    im.src = src;
  });

  var order = [];        // visible cards, front -> back, length VISIBLE
  var pointer = 0;       // next image index to deal
  var timer = null;

  function setImage(card, src) {
    card.dataset.src = src;
    card.querySelector('img').src = src;
    applyAspect(card, src);
  }

  function createCard() {
    var card = document.createElement('div');
    card.className = 'hero-deck-card';
    var inner = document.createElement('div');
    inner.className = 'hero-deck-inner';
    var img = document.createElement('img');
    img.alt = '';
    inner.appendChild(img);
    card.appendChild(inner);
    deck.appendChild(card);
    // Desynced, randomised vertical drift so no two cards move in lockstep —
    // always running, so cards are never completely still.
    inner.style.setProperty('--fdur', rand(5, 8).toFixed(2) + 's');
    inner.style.setProperty('--fdelay', (-rand(0, 7)).toFixed(2) + 's');
    inner.style.setProperty('--fy', ((Math.random() < 0.5 ? -1 : 1) * rand(18, 32)).toFixed(0) + 'px');
    return card;
  }

  function nextSrc() {
    var src = IMAGES[pointer % IMAGES.length];
    pointer++;
    return src;
  }

  // Park a card off-stage at a fresh entrance, ready to become the next front.
  function arm(card) {
    card.jit = randomJitter();
    setImage(card, nextSrc());
    place(card, randomEnter(), false);
  }

  // Build the visible stack (front -> back).
  for (var i = 0; i < VISIBLE; i++) {
    var c = createCard();
    c.jit = randomJitter();
    setImage(c, nextSrc());
    place(c, SLOTS[i], false);
    order.push(c);
  }
  // One parked spare, ready to drop in as the next front card.
  var enterCard = createCard();
  arm(enterCard);

  function tick() {
    var leaving = order.pop();          // back card fades away
    var fresh = enterCard;              // the parked spare becomes the new front
    order.unshift(fresh);

    place(fresh, SLOTS[0], true);       // rises from below into the front slot
    for (var i = 1; i < order.length; i++) {
      place(order[i], SLOTS[i], true);  // everyone else recedes one slot
    }
    place(leaving, GONE, true);         // oldest fades away

    // Recycle the faded card into the parked position with a fresh image.
    enterCard = leaving;
    setTimeout(function() { arm(leaving); }, SETTLE_MS);
  }

  var running = false;
  function schedule() {
    timer = setTimeout(function() {
      if (!running) return;
      tick();
      schedule();
    }, nextDelay());
  }
  function start() {
    if (running) return;
    running = true;
    schedule();
  }
  function stop() {
    running = false;
    if (timer) { clearTimeout(timer); timer = null; }
  }

  // Start right away — the observers below only pause/resume, so the deck can
  // never get stuck waiting on an observer callback that fires out-of-view.
  start();

  // Pause while the tab is hidden.
  document.addEventListener('visibilitychange', function() {
    if (document.hidden) stop(); else start();
  });

  // Pause when the hero scrolls fully out of view, resume when it returns.
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function(entries) {
      entries.forEach(function(e) {
        if (e.isIntersecting) start(); else stop();
      });
    }, { threshold: 0 }).observe(deck);
  }
})();
