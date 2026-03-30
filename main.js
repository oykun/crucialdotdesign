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
