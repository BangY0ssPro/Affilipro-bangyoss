// ============================================================
// js/config.js — Konfigurasi Global AffiliPRO
// Pastikan file ini di-include di semua HTML SEBELUM script utama
// <script src="js/config.js"></script>
// ============================================================

window.AFFILIPRO_CONFIG = {

  // ── PILIH MODE BACKEND ──
  // "appscript" → Apps Script Web App (lebih mudah, tanpa Vercel)
  // "vercel"    → Vercel + Service Account (direkomendasikan untuk produksi)
  backendMode: "appscript",

  // ── Apps Script Web App URL ──
  // Setelah deploy Apps Script, paste URL-nya di sini
  // Contoh: https://script.google.com/macros/s/AKfycb.../exec
  appscriptUrl: "https://script.google.com/macros/s/AKfycbw42wUGkAzjzYal5HR_s4mgeAPuFt0BA8EqLaQJ3fOFmS50SS_RHXs9N2N1OlKblv0jdw/exec",

  // ── Vercel Proxy Base URL ──
  // Setelah deploy ke Vercel, paste domain-nya di sini
  // Contoh: https://affilipro.vercel.app
  vercelBase: "PASTE_VERCEL_URL_DISINI",

  // ── Google Spreadsheet ID ──
  // Ambil dari URL spreadsheet: docs.google.com/spreadsheets/d/[INI_ID]/edit
  spreadsheetId: "1X1dbDPXniV8ycIkQ6bue_PSbFieBAxpRYav1Hg68cPo",

  // ── Range Sheet ──
  ranges: {
    products:   "Product!A:N",
    sosialKlik: "SOSIAL KLIK!A:H",
    analisa:    "ANALISA!A:E",
    raport:     "RAPORT!A:G",
  },

  // ── Google Drive Folder ID untuk gambar produk ──
  // Ambil dari URL folder Drive
  driveFolderId: "15z6wzHSBnP43YsjKV9K59Wax-R7zuU3Q",
};

// ============================================================
// API Helper — panggil dari mana saja dengan window.API.*
// ============================================================
window.API = {

  // Tentukan base URL sesuai backendMode
  _base() {
    const cfg = window.AFFILIPRO_CONFIG;
    return cfg.backendMode === "appscript" ? cfg.appscriptUrl : cfg.vercelBase;
  },

  // Baca data dari sheet
  async read(action_or_range) {
    const cfg = window.AFFILIPRO_CONFIG;
    if (cfg.backendMode === "appscript") {
      const url = `${this._base()}?action=${action_or_range}`;
      const r   = await fetch(url);
      return r.json();
    } else {
      const url = `${this._base()}/api/sheets?range=${encodeURIComponent(action_or_range)}`;
      const r   = await fetch(url);
      return r.json();
    }
  },

  // Tulis / append data ke sheet
  async write(body) {
    const cfg = window.AFFILIPRO_CONFIG;
    if (cfg.backendMode === "appscript") {
      const r = await fetch(this._base(), {
        method: "POST",
        body:   JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
      });
      return r.json();
    } else {
      const r = await fetch(`${this._base()}/api/sheets`, {
        method: "POST",
        body:   JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
      });
      return r.json();
    }
  },

  // Ambil list gambar dari Google Drive
  async driveImages(folderId) {
    const cfg = window.AFFILIPRO_CONFIG;
    const folder = folderId || cfg.driveFolderId;
    if (cfg.backendMode === "appscript") {
      // Tidak tersedia via Apps Script — kembalikan kosong
      return { files: [] };
    }
    const r = await fetch(`${this._base()}/api/drive?folderId=${folder}`);
    return r.json();
  },
};

// ============================================================
// Dark / Light Mode
// ============================================================
(function initTheme() {
  const saved = localStorage.getItem("affilipro_theme") || "dark";
  document.documentElement.setAttribute("data-theme", saved);
})();

window.toggleTheme = function () {
  const current = document.documentElement.getAttribute("data-theme") || "dark";
  const next    = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("affilipro_theme", next);
  // Update ikon tombol jika ada
  const btn = document.getElementById("themeToggleBtn");
  if (btn) btn.title = next === "dark" ? "Mode Terang" : "Mode Gelap";
};

// ============================================================
// Responsive Helper
// ============================================================
window.isMobile = () => window.innerWidth < 768;
window.isTablet = () => window.innerWidth >= 768 && window.innerWidth < 1024;
