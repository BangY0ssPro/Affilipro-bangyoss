/**
 * js/app.js — AffiliPRO Main Application Logic
 * Versi: 2.0 | Safe & Tested
 * 
 * Fungsi:
 * - Load data dari API (sheets.js & drive.js)
 * - Render ke HTML
 * - Handle errors gracefully
 * 
 * Requires: config.js (harus di-include duluan)
 */

(function () {
  'use strict';

  // Debug helper
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

  /**
   * Safely get nested object value
   * Usage: getNestedValue(obj, 'key1.key2.key3')
   */
  function getNestedValue(obj, path, defaultVal = '') {
    try {
      const value = path.split('.').reduce((o, k) => o?.[k], obj);
      return value ?? defaultVal;
    } catch {
      return defaultVal;
    }
  }

  /**
   * Format currency (IDR)
   */
  function formatCurrency(num) {
    if (!num || isNaN(num)) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  }

  /**
   * Format number dengan separator
   */
  function formatNumber(num) {
    if (!num || isNaN(num)) return '0';
    return parseInt(num).toLocaleString('id-ID');
  }

  /**
   * Parse percentage
   */
  function parsePercent(val) {
    if (!val) return 0;
    const num = parseFloat(val);
    return isNaN(num) ? 0 : num;
  }

  // ============================================================
  // PAGE DETECTION
  // ============================================================

  /**
   * Detect halaman mana yang sedang dibuka
   */
  function getCurrentPage() {
    const path = window.location.pathname;
    if (path.includes('products')) return 'products';
    if (path.includes('analytics')) return 'analytics';
    if (path.includes('raport')) return 'raport';
    return 'dashboard'; // default index.html
  }

  // ============================================================
  // DASHBOARD (index.html) — Load stat cards & charts
  // ============================================================

  async function loadDashboard() {
    log('Loading dashboard...');

    try {
      // Get products data untuk stat cards
      const prodResp = await window.API.read(
        window.AFFILIPRO_CONFIG.ranges.products
      );
      if (!prodResp.ok) throw new Error(prodResp.error);

      const products = prodResp.data || [];
      log(`Loaded ${products.length} products`);

      // Get sosial klik data
      const sosialResp = await window.API.read(
        window.AFFILIPRO_CONFIG.ranges.sosialKlik
      );
      const sosialData = sosialResp.ok ? sosialResp.data : [];

      // Get analisa data
      const analisaResp = await window.API.read(
        window.AFFILIPRO_CONFIG.ranges.analisa
      );
      const analisaData = analisaResp.ok ? analisaResp.data : [];

      // Update stat cards
      updateStatCard('total-produk', products.length, 'Produk Aktif');
      updateStatCard('total-penjualan', 
        products.reduce((sum, p) => sum + (parseInt(p.Penjualan) || 0), 0),
        'Total Penjualan',
        'currency'
      );
      updateStatCard('total-klik',
        sosialData.reduce((sum, s) => sum + (parseInt(s.Klik) || 0), 0),
        'Total Klik',
        'number'
      );
      updateStatCard('conversion-rate',
        products.length > 0
          ? Math.round(
              (products.reduce((sum, p) => sum + (parseInt(p['Konversi']) || 0), 0) /
                products.length) * 100
            )
          : 0,
        'Conversion Rate',
        'percent'
      );

      // Update charts if Chart.js available
      if (window.Chart && products.length > 0) {
        updateCharts(products, sosialData, analisaData);
      }

      log('Dashboard loaded successfully');
    } catch (err) {
      error('Failed to load dashboard', err.message);
      showErrorMessage('Gagal load dashboard. Periksa console.');
    }
  }

  /**
   * Update single stat card
   */
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

    // Update value
    const valEl = el.querySelector('.stat-val');
    if (valEl) valEl.textContent = displayValue;

    // Update label jika ada
    const lblEl = el.querySelector('.stat-lbl');
    if (lblEl) lblEl.textContent = label;

    log(`Updated ${elementId}: ${displayValue}`);
  }

  /**
   * Update charts (jika ada chart.js)
   */
  function updateCharts(products, sosialData, analisaData) {
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
            data: topProducts.map(p => parseInt(p.Penjualan) || 0),
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

    // Chart 2: Traffic Sources (jika ada sosial data)
    const trafficCtx = document.getElementById('chartTraffic');
    if (trafficCtx && sosialData.length > 0) {
      const sources = sosialData.slice(0, 5);
      
      if (window.trafficChart) window.trafficChart.destroy();
      window.trafficChart = new Chart(trafficCtx, {
        type: 'doughnut',
        data: {
          labels: sources.map(s => s.Sumber || 'N/A'),
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
  // PRODUCTS PAGE — Load product grid
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
      const drivResp = await window.API.driveImages();
      const imageMap = {};
      if (drivResp.ok && drivResp.files) {
        drivResp.files.forEach(f => {
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
        const imgUrl = imageMap[p['GambarID']] || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ccc" width="200" height="200"/%3E%3Ctext x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%23999"%3ENo Image%3C/text%3E%3C/svg%3E';
        
        return `
          <div class="prod-card">
            <div class="prod-img" style="background-image:url('${imgUrl}')"></div>
            <div class="prod-info">
              <h3 class="prod-name">${p.Produk || 'N/A'}</h3>
              <p class="prod-desc">${(p.Deskripsi || 'No description').substring(0, 60)}...</p>
              <div class="prod-footer">
                <span class="prod-price">${formatCurrency(parseInt(p.Harga) || 0)}</span>
                <span class="prod-stock">${parseInt(p.Stok) || 0} stk</span>
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
  // ANALYTICS PAGE — Load analytics data
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
  // RAPORT PAGE — Load & submit raport
  // ============================================================

  async function loadRaport() {
    log('Loading raport page...');

    try {
      const raportResp = await window.API.read(
        window.AFFILIPRO_CONFIG.ranges.raport
      );
      if (!raportResp.ok) {
        warn('Could not load existing raports:', raportResp.error);
      } else {
        const raports = raportResp.data || [];
        log(`Loaded ${raports.length} existing raports`);
        // Bisa ditampilkan di tabel jika ada
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

  /**
   * Submit raport ke spreadsheet
   */
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

  /**
   * Show error message
   */
  function showErrorMessage(msg) {
    console.error(msg);
    // Tambahkan toast atau alert jika ada UI component
    const toast = document.querySelector('.toast-error');
    if (toast) {
      toast.textContent = msg;
      toast.style.display = 'block';
      setTimeout(() => toast.style.display = 'none', 3000);
    }
  }

  /**
   * Show success message
   */
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
  // BOOTSTRAP — Run on page load
  // ============================================================

  function boot() {
    log('AffiliPRO app starting...');

    // Check config
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

    // Load page-specific data
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
