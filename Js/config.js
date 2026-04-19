// ============================================================
// js/config.js — Konfigurasi Global AffiliPRO (v2.0)
// Pastikan file ini di-include di semua HTML SEBELUM script utama
// <script src="js/config.js"></script>
// ============================================================

window.AFFILIPRO_CONFIG = {

  // ── PILIH MODE BACKEND ──
  // "appscript" → Apps Script Web App (lebih mudah, tanpa Vercel)
  // "vercel"    → Vercel + Service Account (direkomendasikan untuk produksi)
  backendMode: "vercel",

  // ── Apps Script Web App URL ──
  // Setelah deploy Apps Script, paste URL-nya di sini
  // Contoh: https://script.google.com/macros/s/AKfycb.../exec
  appscriptUrl: "https://script.google.com/macros/s/AKfycbw42wUGkAzjzYal5HR_s4mgeAPuFt0BA8EqLaQJ3fOFmS50SS_RHXs9N2N1OlKblv0jdw/exec",

  // ── Vercel Proxy Base URL ──
  // ✅ PENTING: Harus dengan protocol https://
  // Setelah deploy ke Vercel, paste domain-nya di sini
  // Contoh: https://affilipro.vercel.app
  // SALAH:  affilipro.vercel.app (tanpa https://)
  // BENAR:  https://affilipro.vercel.app
  vercelBase: "https://affilipro-bangyoss.vercel.app",

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
  driveFolderId: "1cnAQkxA56od9m_IsvyZEh9cFWqED9eue",

  // ── Debug Mode (set false di production) ──
  debug: false,
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

  // Validasi URL
  _validateUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      console.error(`[API] Invalid URL: ${url}`);
      return false;
    }
  },

  // Baca data dari sheet dengan error handling
  async read(action_or_range) {
    const cfg = window.AFFILIPRO_CONFIG;
    try {
      if (cfg.backendMode === "appscript") {
        const url = `${this._base()}?action=${action_or_range}`;
        if (!this._validateUrl(url)) throw new Error(`Invalid URL: ${url}`);
        
        const r = await fetch(url);
        if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`);
        return await r.json();
      } else {
        const url = `${this._base()}/api/sheets?range=${encodeURIComponent(action_or_range)}`;
        if (!this._validateUrl(url)) throw new Error(`Invalid URL: ${url}`);
        
        const r = await fetch(url);
        if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`);
        return await r.json();
      }
    } catch (err) {
      console.error(`[API.read] Error: ${err.message}`);
      return { error: err.message, data: [], headers: [] };
    }
  },

  // Tulis / append data ke sheet dengan error handling
  async write(body) {
    const cfg = window.AFFILIPRO_CONFIG;
    try {
      if (cfg.backendMode === "appscript") {
        const url = this._base();
        if (!this._validateUrl(url)) throw new Error(`Invalid URL: ${url}`);
        
        const r = await fetch(url, {
          method: "POST",
          body: JSON.stringify(body),
          headers: { "Content-Type": "application/json" },
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`);
        return await r.json();
      } else {
        const url = `${this._base()}/api/sheets`;
        if (!this._validateUrl(url)) throw new Error(`Invalid URL: ${url}`);
        
        const r = await fetch(url, {
          method: "POST",
          body: JSON.stringify(body),
          headers: { "Content-Type": "application/json" },
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`);
        return await r.json();
      }
    } catch (err) {
      console.error(`[API.write] Error: ${err.message}`);
      return { error: err.message };
    }
  },

  // Ambil list gambar dari Google Drive dengan error handling
  async driveImages(folderId) {
    const cfg = window.AFFILIPRO_CONFIG;
    try {
      const folder = folderId || cfg.driveFolderId;
      if (cfg.backendMode === "appscript") {
        // Tidak tersedia via Apps Script — kembalikan kosong
        return { files: [] };
      }
      
      const url = `${this._base()}/api/drive?folderId=${folder}`;
      if (!this._validateUrl(url)) throw new Error(`Invalid URL: ${url}`);
      
      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`);
      return await r.json();
    } catch (err) {
      console.error(`[API.driveImages] Error: ${err.message}`);
      return { files: [], error: err.message };
    }
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
  const next = current === "dark" ? "light" : "dark";
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

// ============================================================
// Logging Helper (untuk debug)
// ============================================================
window.debugLog = function(msg, data) {
  if (window.AFFILIPRO_CONFIG.debug) {
    console.log(`[AFFILIPRO] ${msg}`, data || "");
  }
};
