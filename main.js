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
   Hide nav when flow or contact section is in view
   ======================================== */
var nav = document.getElementById('nav');
var flowSection = document.getElementById('flow');
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

navObserver.observe(flowSection);
navObserver.observe(contactSection);
