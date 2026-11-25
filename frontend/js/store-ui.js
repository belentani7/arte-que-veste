/**
 * ═══════════════════════════════════════════════════════════════
 * ARTE QUE VESTE — UI Progresiva (Zero-CDN)
 * Navegación móvil accesible, revelación con IntersectionObserver
 * y helpers compartidos seguros contra XSS.
 * ═══════════════════════════════════════════════════════════════
 */
(function () {
  'use strict';

  function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function safeImageUrl(value, fallback) {
    var defaultFallback = fallback || 'assets/img/produtos/placeholder.svg';
    var src = String(value ?? '');
    if (!src || /[\u0000-\u001f]/.test(src)) return defaultFallback;
    try {
      var u = new URL(src, location.href);
      if (u.protocol === 'https:' || (u.protocol === 'http:' && u.origin === location.origin)) {
        return u.href;
      }
      return defaultFallback;
    } catch {
      return defaultFallback;
    }
  }

  function formatBRL(amount) {
    var n = Number(amount);
    if (!Number.isFinite(n)) n = 0;
    return 'R$ ' + n.toFixed(2).replace('.', ',');
  }

  function initMobileMenu() {
    var toggle = document.querySelector('[data-menu-toggle]');
    var menu = document.getElementById('mobile-menu');
    if (!toggle || !menu) return;

    function setOpen(open) {
      menu.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Fechar menu de navegação' : 'Abrir menu de navegação');
    }

    toggle.addEventListener('click', function () {
      setOpen(!menu.classList.contains('open'));
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && menu.classList.contains('open')) {
        setOpen(false);
        toggle.focus();
      }
    });
  }

  function initReveal() {
    var nodes = document.querySelectorAll('[data-reveal]');
    if (!nodes.length) return;
    var prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced || typeof IntersectionObserver === 'undefined') {
      nodes.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }
    document.documentElement.classList.add('js-ready');
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });
    nodes.forEach(function (el) { observer.observe(el); });
  }

  window.AQV = {
    escapeHTML: escapeHTML,
    safeImageUrl: safeImageUrl,
    formatBRL: formatBRL
  };

  document.addEventListener('DOMContentLoaded', function () {
    initMobileMenu();
    initReveal();
  });
})();
