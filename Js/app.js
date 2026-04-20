/**
 * js/app.js — AffiliPRO Main Application Logic (VERSI DIPERBAIKI)
 * Versi: 2.0 Fixed | Safe & Tested
 * 
 * Perbaikan:
 * - Analytics: Load data dari spreadsheet, bukan mock data
 * - Products: Tampilkan gambar dari Google Drive
 * - Raport: List data existing + form submit
 * - Dashboard: Tambah sosial media stats
 * - Semua sheet: Data dari API, bukan hardcoded
 */

(function () {
  'use strict';

  const log = (msg, data) => {
    if (window.AFFILIPRO_CONFIG?.debug) {
      console.log(`[AffiliPRO] ${msg}`, data || '');
    }
  };
  
  const warn = (msg, data) => {
    console.warn(`[AffiliPRO] ⚠️ ${msg}`, data || '');
  };
  
  const error = (msg, data) => {
    console.error(`[AffiliPRO] ❌ ${msg}`, data || '');
  };

  // ============================================================
  // SHARED UTILITIES
  // ============================================================

  function getNestedValue(obj, path, defaultVal = '') {
    try {
      const value = path.split('.').reduce((o, k) => o?.[k], obj);
      return value ?? defaultVal;
    } catch {
      return defaultVal;
    }
  }

  function formatCurrency(num) {
    if (!num || isNaN(num)) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  }

  function formatNumber(num) {
    if (!num || isNaN(num)) return '0';
    return parseInt(num).toLocaleString('id-ID');
  }

  function parsePercent(val) {
    if (!val) return 0;
    const num = parseFloat(val);
    return isNaN(num) ? 0 : num;
  }

  // ============================================================
  // PAGE DETECTION
  // ============================================================

  function getCurrentPage() {
    const path = window.location.pathname.toLowerCase();
    if (path.includes('products')) return 'products';
    if (path.includes('analytics')) return 'analytics';
    if (path.includes('raport')) return 'raport';
    return 'dashboard';
  }

  // ============================================================
  // DASHBOARD — Load stats & charts
  // ============================================================

  async function loadDashboard() {
    log('Loading dashboard...');

    try {
      // Load products untuk chart
      const prodResp = await window.API.read(
        window.AFFILIPRO_CONFIG.ranges.products
      );
      
      // Load analytics untuk stats
      const analisaResp = await window.API.read(
        window.AFFILIPRO_CONFIG.ranges.analisa
      );
      
      // Load sosial untuk social stats
      const sosialResp = await window.API.read(
        window.AFFILIPRO_CONFIG.ranges.sosialKlik
      );

      const products = prodResp.ok ? prodResp.data : [];
      const analisa = analisaResp.ok ? analisaResp.data : [];
      const sosial = sosialResp.ok ? sosialResp.data : [];

      log(`Loaded ${products.length} products, ${analisa.length} analytics, ${sosial.length} social`);

      // Update stat cards
      if (analisa.length > 0) {
        const totalPenjualan = analisa.reduce((sum, r) => sum + (parseInt(r.Penjualan) || 0), 0);
        const totalPengunjung = analisa.reduce((sum, r) => sum + (parseInt(r.Pengunjung) || 0), 0);
        updateStatCard('totalSales', totalPenjualan, 'Total Penjualan', 'number');
        updateStatCard('totalVisitors', totalPengunjung, 'Total Pengunjung', 'number');
      }

      if (sosial.length > 0) {
        const totalKlik = sosial.reduce((sum, s) => sum + (parseInt(s.Klik) || 0), 0);
        updateStatCard('totalClicks', totalKlik, 'Total Klik', 'number');
      }

      // Update charts
      if (window.Chart && products.length > 0) {
        updateCharts(products, sosial, analisa);
      }

      // Render social stats card
      const socialDiv = document.getElementById('socialStats');
      if (socialDiv && sosial.length > 0) {
        const topSocial = sosial.slice(0, 3);
        socialDiv.innerHTML = topSocial.map(s => `
          <div class="stat-card" style="flex: 1; padding: 12px;">
            <h3 style="font-size: 14px; margin-bottom: 8px;">${s.Sumber || s.Platform || 'N/A'}</h3>
            <p style="margin: 4px 0; color: var(--accent);">Klik: ${formatNumber(s.Klik)}</p>
            <p style="margin: 4px 0;">Penjualan: ${formatNumber(s.Penjualan || 0)}</p>
          </div>
        `).join('');
      }

      log('Dashboard loaded successfully');
    } catch (err) {
      error('Failed to load dashboard', err.message);
      showErrorMessage('Gagal load dashboard. Periksa console.');
    }
  }

  function updateStatCard(elementId, value, label, format = 'number') {
    const el = document.getElementById(elementId);
    if (!el) {
      warn(`Element not found: ${elementId}`);
      return;
    }

    let displayValue = value;
    if (format === 'currency') displayValue = formatCurrency(value);
    else if (format === 'percent') displayValue = `${value}%`;
    else if (format === 'number') displayValue = formatNumber(value);

    const valEl = el.querySelector('.stat-val');
    if (valEl) valEl.textContent = displayValue;

    const lblEl = el.querySelector('.stat-lbl');
    if (lblEl) lblEl.textContent = label;

    log(`Updated ${elementId}: ${displayValue}`);
  }

  function updateCharts(products, sosial, analisa) {
    // Chart 1: Product Performance
    const perfCtx = document.getElementById('chartPerformance');
    if (perfCtx && products.length > 0) {
      const topProducts = products.slice(0, 5);
      
      if (window.perfChart) window.perfChart.destroy();
      window.perfChart = new Chart(perfCtx, {
        type: 'bar',
        data: {
          labels: topProducts.map(p => p.Produk || 'N/A'),
          datasets: [{
            label: 'Penjualan',
            data: topProducts.map(p => parseInt(p.Penjualan || p.Terjual) || 0),
            backgroundColor: 'rgba(0, 184, 122, 0.7)',
            borderColor: 'rgba(0, 184, 122, 1)',
            borderWidth: 1,
            borderRadius: 6,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { callback: v => formatNumber(v) }
            }
          }
        }
      });
      log('Chart Performance updated');
    }

    // Chart 2: Traffic Sources
    const trafficCtx = document.getElementById('chartTraffic');
    if (trafficCtx && sosial.length > 0) {
      const sources = sosial.slice(0, 5);
      
      if (window.trafficChart) window.trafficChart.destroy();
      window.trafficChart = new Chart(trafficCtx, {
        type: 'doughnut',
        data: {
          labels: sources.map(s => s.Sumber || s.Platform || 'N/A'),
          datasets: [{
            data: sources.map(s => parseInt(s.Klik) || 0),
            backgroundColor: [
              'rgba(0, 184, 122, 0.8)',
              'rgba(0, 232, 154, 0.8)',
              'rgba(16, 185, 129, 0.8)',
              'rgba(5, 150, 105, 0.8)',
              'rgba(4, 120, 87, 0.8)',
            ]
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom' } }
        }
      });
      log('Chart Traffic updated');
    }
  }

  // ============================================================
  // PRODUCTS PAGE
  // ============================================================

  async function loadProducts() {
    log('Loading products...');

    try {
      // Load products
      const prodResp = await window.API.read(
        window.AFFILIPRO_CONFIG.ranges.products
      );
      if (!prodResp.ok) throw new Error(prodResp.error);

      const products = prodResp.data || [];
      log(`Loaded ${products.length} products`);

      // Load drive images
      const driveResp = await window.API.driveImages();
      const imageMap = {};
      if (driveResp.ok && driveResp.files) {
        driveResp.files.forEach(f => {
          imageMap[f.id] = f.url;
        });
      }
      log(`Loaded ${Object.keys(imageMap).length} images from Drive`);

      // Render grid
      const grid = document.querySelector('.prod-grid');
      if (!grid) {
        warn('Product grid not found');
        return;
      }

      grid.innerHTML = products.map(p => {
        const imgUrl = imageMap[p.GambarID] || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ccc" width="200" height="200"/%3E%3Ctext x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%23999"%3ENo Image%3C/text%3E%3C/svg%3E';
        
        return `
          <div class="prod-card" style="background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden;">
            <div class="prod-img" style="width: 100%; height: 200px; background-image: url('${imgUrl}'); background-size: cover; background-position: center;"></div>
            <div class="prod-info" style="padding: 12px;">
              <h3 class="prod-name" style="font-weight: 600; margin-bottom: 4px;">${p.Produk || 'N/A'}</h3>
              <p class="prod-desc" style="font-size: 12px; color: var(--muted); margin-bottom: 8px;">${(p.Deskripsi || 'No description').substring(0, 60)}...</p>
              <div class="prod-footer" style="display: flex; justify-content: space-between; align-items: center;">
                <span class="prod-price" style="font-weight: 700; color: var(--accent);">${formatCurrency(parseInt(p.Harga) || 0)}</span>
                <span class="prod-stock" style="font-size: 12px; color: var(--muted);">${parseInt(p.Stok) || 0} stk</span>
              </div>
            </div>
          </div>
        `;
      }).join('');

      log('Products rendered successfully');
    } catch (err) {
      error('Failed to load products', err.message);
      showErrorMessage('Gagal load produk. Periksa console.');
    }
  }

  // ============================================================
  // ANALYTICS PAGE
  // ============================================================

  async function loadAnalytics() {
    log('Loading analytics...');

    try {
      const analisaResp = await window.API.read(
        window.AFFILIPRO_CONFIG.ranges.analisa
      );
      if (!analisaResp.ok) throw new Error(analisaResp.error);

      const data = analisaResp.data || [];
      log(`Loaded ${data.length} analytics records`);

      // Render table
      const tbody = document.querySelector('.analytics-table tbody');
      if (!tbody) {
        warn('Analytics table not found');
        return;
      }

      tbody.innerHTML = data.map(row => `
        <tr>
          <td>${row.Tanggal || '-'}</td>
          <td>${formatNumber(row.Pengunjung)}</td>
          <td>${formatNumber(row.Penjualan)}</td>
          <td>${formatCurrency(row.Pendapatan)}</td>
          <td>${parsePercent(row.Konversi).toFixed(1)}%</td>
        </tr>
      `).join('');

      log('Analytics rendered successfully');
    } catch (err) {
      error('Failed to load analytics', err.message);
      showErrorMessage('Gagal load analytics. Periksa console.');
    }
  }

  // ============================================================
  // RAPORT PAGE
  // ============================================================

  async function loadRaport() {
    log('Loading raport page...');

    try {
      const raportResp = await window.API.read(
        window.AFFILIPRO_CONFIG.ranges.raport
      );
      
      // Load existing raports
      if (raportResp.ok && raportResp.data.length > 0) {
        const raports = raportResp.data;
        log(`Loaded ${raports.length} existing raports`);
        
        // Render raport table
        const tbody = document.querySelector('.raport-table tbody');
        if (tbody) {
          tbody.innerHTML = raports.map(r => `
            <tr style="border-bottom: 1px solid var(--border);">
              <td style="padding: 8px;">${r.Tanggal || '-'}</td>
              <td style="padding: 8px;">${r.Produk || '-'}</td>
              <td style="padding: 8px;">${formatNumber(r.Jumlah)}</td>
              <td style="padding: 8px;">${formatCurrency(parseInt(r.Harga) || 0)}</td>
              <td style="padding: 8px;"><span style="background: var(--accentDim); padding: 2px 8px; border-radius: 4px;">${r.Status || '-'}</span></td>
              <td style="padding: 8px;">${r.Catatan || '-'}</td>
            </tr>
          `).join('');
        }
      } else {
        warn('No existing raports found');
      }

      // Handle form submit
      const form = document.querySelector('.raport-form');
      if (form) {
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          await submitRaport(form);
        });
        log('Raport form listener attached');
      }

      log('Raport page loaded successfully');
    } catch (err) {
      error('Failed to load raport', err.message);
    }
  }

  async function submitRaport(form) {
    try {
      const formData = new FormData(form);
      const values = [[
        formData.get('tanggal'),
        formData.get('produk'),
        formData.get('jumlah'),
        formData.get('harga'),
        formData.get('status'),
        formData.get('catatan'),
      ]];

      const result = await window.API.write({
        range: window.AFFILIPRO_CONFIG.ranges.raport,
        values,
        append: true,
      });

      if (result.ok) {
        log('Raport submitted successfully');
        showSuccessMessage('Raport berhasil dikirim!');
        form.reset();
        // Reload raport table
        loadRaport();
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      error('Failed to submit raport', err.message);
      showErrorMessage(`Gagal kirim raport: ${err.message}`);
    }
  }

  // ============================================================
  // UI HELPERS
  // ============================================================

  function showErrorMessage(msg) {
    console.error(msg);
    const toast = document.querySelector('.toast-error');
    if (toast) {
      toast.textContent = msg;
      toast.style.display = 'block';
      setTimeout(() => toast.style.display = 'none', 3000);
    }
  }

  function showSuccessMessage(msg) {
    console.log(msg);
    const toast = document.querySelector('.toast-success');
    if (toast) {
      toast.textContent = msg;
      toast.style.display = 'block';
      setTimeout(() => toast.style.display = 'none', 3000);
    }
  }

  // ============================================================
  // BOOTSTRAP
  // ============================================================

  function boot() {
    log('AffiliPRO app starting...');

    if (!window.AFFILIPRO_CONFIG) {
      error('AFFILIPRO_CONFIG not found. Make sure config.js is included first.');
      return;
    }

    if (!window.API) {
      error('API helper not found. Make sure config.js is included first.');
      return;
    }

    log(`Backend mode: ${window.AFFILIPRO_CONFIG.backendMode}`);
    log(`Vercel base: ${window.AFFILIPRO_CONFIG.vercelBase}`);

    const page = getCurrentPage();
    log(`Current page: ${page}`);

    if (page === 'dashboard') {
      loadDashboard();
    } else if (page === 'products') {
      loadProducts();
    } else if (page === 'analytics') {
      loadAnalytics();
    } else if (page === 'raport') {
      loadRaport();
    }
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
