/**
 * Js/motion.js — AffiliPRO Motion Engine
 * Remotion-style entrance + Live animated background
 * Tidak mengubah fungsi bisnis yang sudah ada.
 * ============================================================
 */

(function () {
  'use strict';

  /* ─────────────────────────────────────────────
     1. THEME INIT (fallback jika config.js tidak load lebih awal)
  ───────────────────────────────────────────── */
  if (!document.documentElement.getAttribute('data-theme')) {
    const saved = localStorage.getItem('affilipro_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
  }

  // Expose toggleTheme globally if not already done
  if (typeof window.toggleTheme === 'undefined') {
    window.toggleTheme = function () {
      const cur  = document.documentElement.getAttribute('data-theme') || 'dark';
      const next = cur === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('affilipro_theme', next);
      const btn = document.getElementById('themeToggleBtn');
      if (btn) btn.title = next === 'dark' ? 'Mode Terang' : 'Mode Gelap';
    };
  }

  /* ─────────────────────────────────────────────
     2. ANIMATED CANVAS BACKGROUND
     Slow-motion floating orb aurora effect
  ───────────────────────────────────────────── */
  function initCanvas() {
    const canvas = document.getElementById('motionBg');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let W, H, orbs, raf;

    function resize() {
      W = canvas.width  = window.innerWidth;
      H = canvas.height = window.innerHeight;
    }

    // Generate slow-moving gradient orbs
    function createOrbs() {
      const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
      orbs = [
        {
          x: W * 0.15, y: H * 0.25, r: Math.min(W, H) * 0.38,
          vx: 0.12, vy: 0.08,
          color: isDark
            ? 'rgba(0, 184, 122, 0.055)'
            : 'rgba(0, 184, 122, 0.09)',
        },
        {
          x: W * 0.75, y: H * 0.65, r: Math.min(W, H) * 0.45,
          vx: -0.09, vy: -0.06,
          color: isDark
            ? 'rgba(0, 232, 154, 0.035)'
            : 'rgba(0, 232, 154, 0.06)',
        },
        {
          x: W * 0.55, y: H * 0.15, r: Math.min(W, H) * 0.28,
          vx: 0.06, vy: 0.14,
          color: isDark
            ? 'rgba(16, 185, 129, 0.04)'
            : 'rgba(16, 185, 129, 0.07)',
        },
        {
          x: W * 0.85, y: H * 0.2, r: Math.min(W, H) * 0.22,
          vx: -0.14, vy: 0.1,
          color: isDark
            ? 'rgba(5, 150, 105, 0.03)'
            : 'rgba(5, 150, 105, 0.05)',
        },
      ];
    }

    function drawOrb(orb) {
      const grad = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.r);
      grad.addColorStop(0, orb.color);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    }

    function tick() {
      ctx.clearRect(0, 0, W, H);

      orbs.forEach(o => {
        o.x += o.vx;
        o.y += o.vy;
        // Bounce gently at bounds
        if (o.x - o.r < -o.r * 0.6 || o.x + o.r > W + o.r * 0.6) o.vx *= -1;
        if (o.y - o.r < -o.r * 0.6 || o.y + o.r > H + o.r * 0.6) o.vy *= -1;
        drawOrb(o);
      });

      raf = requestAnimationFrame(tick);
    }

    resize();
    createOrbs();
    tick();

    window.addEventListener('resize', () => {
      cancelAnimationFrame(raf);
      resize();
      createOrbs();
      tick();
    });

    // Re-create orbs when theme changes
    const observer = new MutationObserver(() => {
      cancelAnimationFrame(raf);
      createOrbs();
      tick();
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }

  /* ─────────────────────────────────────────────
     3. SPLASH SCREEN (hanya di index / dashboard)
  ───────────────────────────────────────────── */
  function initSplash() {
    const splash = document.getElementById('splashScreen');
    if (!splash) return;

    // Cegah muncul lagi jika sessionStorage sudah set
    if (sessionStorage.getItem('ap_splash_done')) {
      splash.remove();
      revealContent();
      return;
    }

    // Tunggu progress bar selesai, lalu hide splash
    setTimeout(() => {
      splash.classList.add('hide');
      setTimeout(() => {
        splash.remove();
        sessionStorage.setItem('ap_splash_done', '1');
        revealContent();
      }, 800);
    }, 2600);
  }

  /* ─────────────────────────────────────────────
     4. STAGGER CONTENT REVEAL (semua halaman)
  ───────────────────────────────────────────── */
  function revealContent() {
    const targets = document.querySelectorAll(
      '.stat-card, .ccard, .raport-card, .page-head, .stats-row, ' +
      '.charts-row, .charts-grid, .bot-row, .page-wrap, .prod-grid-wrap'
    );

    targets.forEach((el, i) => {
      el.classList.add('motion-fade-in');
      setTimeout(() => el.classList.add('visible'), i * 60 + 80);
    });
  }

  /* ─────────────────────────────────────────────
     5. SMOOTH BUTTON RIPPLE
  ───────────────────────────────────────────── */
  function initRipple() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('button, .nav-item, .s-icon, .back-btn, .tab-btn');
      if (!btn) return;

      // Don't add ripple to dropdown/menu toggles
      const ripple = document.createElement('span');
      const rect   = btn.getBoundingClientRect();
      const size   = Math.max(rect.width, rect.height);
      ripple.style.cssText = `
        position:absolute;
        width:${size}px;height:${size}px;
        left:${e.clientX - rect.left - size / 2}px;
        top:${e.clientY - rect.top - size / 2}px;
        background:rgba(0,184,122,0.18);
        border-radius:50%;
        transform:scale(0);
        animation:rippleAnim 0.5s ease-out forwards;
        pointer-events:none;
        z-index:999;
      `;

      // Ensure parent is positioned
      if (getComputedStyle(btn).position === 'static') {
        btn.style.position = 'relative';
      }
      btn.style.overflow = 'hidden';

      btn.appendChild(ripple);
      setTimeout(() => ripple.remove(), 550);
    });

    // Inject ripple keyframes once
    if (!document.getElementById('rippleStyle')) {
      const s = document.createElement('style');
      s.id = 'rippleStyle';
      s.textContent = `
        @keyframes rippleAnim {
          to { transform: scale(2.5); opacity: 0; }
        }
      `;
      document.head.appendChild(s);
    }
  }

  /* ─────────────────────────────────────────────
     6. PAGE NAVIGATION TRANSITION
  ───────────────────────────────────────────── */
  function initPageTransition() {
    document.querySelectorAll('a[href]').forEach(link => {
      const href = link.getAttribute('href');
      // Only intercept internal HTML links
      if (!href || href.startsWith('#') || href.startsWith('http') ||
          href.startsWith('javascript') || link.target === '_blank') return;
      if (!href.endsWith('.html')) return;

      link.addEventListener('click', (e) => {
        e.preventDefault();
        document.body.style.opacity = '0';
        document.body.style.transition = 'opacity 0.25s ease';
        setTimeout(() => { window.location.href = href; }, 260);
      });
    });
  }

  /* ─────────────────────────────────────────────
     BOOTSTRAP — run on DOMContentLoaded
  ───────────────────────────────────────────── */
  function boot() {
    initCanvas();
    initSplash();

    // If no splash (sub-pages), reveal content immediately
    if (!document.getElementById('splashScreen')) {
      revealContent();
    }

    initRipple();
    initPageTransition();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
