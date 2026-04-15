// ============================================================
// appscript.gs — Google Apps Script
// CARA DEPLOY: Buka Google Sheets → Extensions → Apps Script
// Paste seluruh isi file ini, lalu Deploy sebagai Web App
// ============================================================

/* ── ID Sheet ── */
const SS          = openById("1X1dbDPXniV8ycIkQ6bue_PSbFieBAxpRYav1Hg68cPo");
const SH_PRODUCT  = () => SS.getSheetByName("Product");
const SH_SOC      = () => SS.getSheetByName("SOSIAL KLIK");
const SH_ANALISA  = () => SS.getSheetByName("ANALISA");
const SH_RAPORT   = () => SS.getSheetByName("RAPORT");

// ============================================================
// doGet — Handle GET request (baca data)
// ============================================================
function doGet(e) {
  const action = e.parameter.action || "products";
  let result;

  try {
    switch (action) {
      case "products":  result = getProducts();  break;
      case "sosial":    result = getSosialKlik(); break;
      case "analisa":   result = getAnalisa();    break;
      case "summary":   result = getSummary();    break;
      default:          result = { error: "Action tidak dikenal" };
    }
  } catch (err) {
    result = { error: err.message };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// doPost — Handle POST request (tulis data)
// ============================================================
function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonOut({ error: "Body tidak valid JSON" });
  }

  const action = body.action;
  let result;

  try {
    switch (action) {
      case "track_click":  result = trackClick(body);  break;
      case "save_raport":  result = saveRaport(body);  break;
      case "add_product":  result = addProduct(body);  break;
      default:             result = { error: "Action tidak dikenal" };
    }
  } catch (err) {
    result = { error: err.message };
  }

  return jsonOut(result);
}

// ============================================================
// BACA: Produk dari Sheet "Product"
// ============================================================
function getProducts() {
  const sh   = SH_PRODUCT();
  const data = sh.getDataRange().getValues();
  const headers = data[0];
  const rows  = data.slice(1).map(r => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = r[i]);
    return obj;
  });
  return { ok: true, data: rows };
}

// ============================================================
// BACA: Data Sosial Klik dari Sheet "SOSIAL KLIK"
// ============================================================
function getSosialKlik() {
  const sh   = SH_SOC();
  const data = sh.getDataRange().getValues();
  const headers = data[0];
  const rows  = data.slice(1).map(r => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = r[i]);
    return obj;
  });
  return { ok: true, data: rows };
}

// ============================================================
// BACA: Data Analisa dari Sheet "ANALISA"
// ============================================================
function getAnalisa() {
  const sh   = SH_ANALISA();
  const data = sh.getDataRange().getValues();
  const headers = data[0];
  const rows  = data.slice(1).map(r => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = r[i]);
    return obj;
  });
  return { ok: true, data: rows };
}

// ============================================================
// BACA: Summary (total produk, total klik, total penjualan)
// ============================================================
function getSummary() {
  const prods = getProducts().data;
  const soc   = getSosialKlik().data;

  const totalProduk    = prods.length;
  const totalKlik      = soc.reduce((s, r) => s + (Number(r.KLIK) || 0), 0);
  const totalPenjualan = soc.reduce((s, r) => s + (Number(r.PENJUALAN) || 0), 0);
  const totalCVR       = totalKlik > 0 ? ((totalPenjualan / totalKlik) * 100).toFixed(2) : "0.00";

  return { ok: true, totalProduk, totalKlik, totalPenjualan, totalCVR };
}

// ============================================================
// TULIS: Track klik dari sosial media (dipanggil oleh tracking pixel / redirect link)
// POST body: { action:"track_click", product_id:"PROD_001", platform:"facebook", source_url:"...", ref_code:"..." }
// ============================================================
function trackClick(body) {
  const sh = SH_SOC();
  const now = new Date();
  sh.appendRow([
    now.toISOString(),        // A: timestamp
    body.product_id || "",    // B: product_id
    body.platform   || "",    // C: PLATFORM
    body.source_url || "",    // D: source_url
    body.user_agent || "",    // E: user_agent
    body.ref_code   || "",    // F: ref_code
    1,                        // G: KLIK (1 per event)
    0,                        // H: PENJUALAN (diupdate via Shopee webhook)
  ]);

  // Update CVR & STATUS di Sheet Product
  updateProductStats(body.product_id);
  return { ok: true, message: "Klik tercatat" };
}

// ============================================================
// TULIS: Simpan Raport ke Sheet "RAPORT"
// POST body: { action:"save_raport", nama:"...", sosmed:"...", pesan:"...", ... }
// ============================================================
function saveRaport(body) {
  const sh  = SH_RAPORT();
  const now = new Date();
  sh.appendRow([
    now.toISOString(),       // A: timestamp
    body.nama      || "",    // B: nama
    body.sosmed    || "",    // C: sosmed
    body.kategori  || "",    // D: kategori
    body.produk    || "",    // E: produk
    body.pesan     || "",    // F: pesan
    body.rating    || "",    // G: rating
  ]);
  return { ok: true, message: "Raport berhasil disimpan" };
}

// ============================================================
// TULIS: Tambah produk baru ke Sheet "Product"
// ============================================================
function addProduct(body) {
  const sh = SH_PRODUCT();
  const now = new Date().toISOString().split("T")[0];
  const id  = "PROD_" + String(sh.getLastRow()).padStart(3, "0");
  sh.appendRow([
    id,
    body.KATEGORI       || "",
    body.PRODUK         || "",
    body.PLATFORM       || "Shopee",
    body.AFFILIATE_link || "",
    body.image_url      || "",
    body.HARGA          || 0,
    body.TERJUAL        || 0,
    0,          // KLIK — akan diisi dari SOSIAL KLIK
    0,          // CVR
    "Baru",     // STATUS
    body.DESKRIPSI || "",
    now,
    "",         // TOTAL PRODUK (formula)
  ]);
  return { ok: true, id, message: "Produk berhasil ditambah" };
}

// ============================================================
// HELPER: Hitung ulang KLIK, PENJUALAN, CVR, STATUS untuk satu produk
// ============================================================
function updateProductStats(productId) {
  const socSh  = SH_SOC();
  const prodSh = SH_PRODUCT();

  const socData  = socSh.getDataRange().getValues();
  const socHead  = socData[0];
  const idIdx    = socHead.indexOf("product_id");
  const klikIdx  = socHead.indexOf("KLIK");
  const jualIdx  = socHead.indexOf("PENJUALAN");

  let totalKlik = 0, totalJual = 0;
  socData.slice(1).forEach(row => {
    if (row[idIdx] === productId) {
      totalKlik += Number(row[klikIdx]) || 0;
      totalJual += Number(row[jualIdx]) || 0;
    }
  });
  const cvr = totalKlik > 0 ? ((totalJual / totalKlik) * 100).toFixed(2) : 0;
  const status = totalJual > 0 ? "Naik" : (totalKlik > 0 ? "Proses" : "Baru");

  // Cari baris produk dan update kolom I (KLIK), J (CVR), K (STATUS)
  const prodData = prodSh.getDataRange().getValues();
  const prodHead = prodData[0];
  const pidIdx   = prodHead.indexOf("ID");
  prodData.slice(1).forEach((row, i) => {
    if (row[pidIdx] === productId) {
      const rowNum = i + 2;
      prodSh.getRange(rowNum, prodHead.indexOf("KLIK") + 1).setValue(totalKlik);
      prodSh.getRange(rowNum, prodHead.indexOf("CVR") + 1).setValue(cvr);
      prodSh.getRange(rowNum, prodHead.indexOf("STATUS") + 1).setValue(status);
    }
  });

  // Update ANALISA sheet
  updateAnalisa();
}

// ============================================================
// HELPER: Rekap ke Sheet ANALISA
// ============================================================
function updateAnalisa() {
  const analSh = SH_ANALISA();
  const socSh  = SH_SOC();

  const socData = socSh.getDataRange().getValues();
  const socHead = socData[0];
  const platIdx = socHead.indexOf("PLATFORM");
  const klikIdx = socHead.indexOf("KLIK");
  const jualIdx = socHead.indexOf("PENJUALAN");
  const tsIdx   = socHead.indexOf("timestamp");

  // Agregasi per platform
  const agg = {};
  socData.slice(1).forEach(row => {
    const plat = (row[platIdx] || "Unknown").toLowerCase();
    if (!agg[plat]) agg[plat] = { klik: 0, jual: 0 };
    agg[plat].klik += Number(row[klikIdx]) || 0;
    agg[plat].jual += Number(row[jualIdx]) || 0;
  });

  // Tulis ke ANALISA, mulai baris 2 (baris 1 = header)
  analSh.clearContents();
  analSh.appendRow(["PLATFORM", "TOTAL_KLIK", "TOTAL_PENJUALAN", "CVR", "UPDATE"]);
  const now = new Date().toISOString();
  Object.entries(agg).forEach(([plat, v]) => {
    const cvr = v.klik > 0 ? ((v.jual / v.klik) * 100).toFixed(2) : "0.00";
    analSh.appendRow([plat, v.klik, v.jual, cvr, now]);
  });
}

// ============================================================
// HELPER: Output JSON
// ============================================================
function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// TRIGGER: Jalankan updateAnalisa setiap jam (opsional)
// Pasang via: Triggers → Add Trigger → updateAnalisa, Time-driven, 1 hour
// ============================================================
function scheduledUpdate() {
  updateAnalisa();
}

// ============================================================
// SETUP: Buat header di semua sheet jika belum ada
// Jalankan sekali via: Run → setupSheets
// ============================================================
function setupSheets() {
  const setup = [
    {
      name: "Product",
      headers: ["ID","KATEGORI","PRODUK","PLATFORM","AFFILIATE_link","image_url",
                "HARGA","TERJUAL","KLIK","CVR","STATUS","DESKRIPSI","TANGGAL","TOTAL PRODUK"],
    },
    {
      name: "SOSIAL KLIK",
      headers: ["timestamp","product_id","PLATFORM","source_url","user_agent","ref_code","KLIK","PENJUALAN"],
    },
    {
      name: "ANALISA",
      headers: ["PLATFORM","TOTAL_KLIK","TOTAL_PENJUALAN","CVR","UPDATE"],
    },
    {
      name: "RAPORT",
      headers: ["timestamp","nama","sosmed","kategori","produk","pesan","rating"],
    },
  ];

  setup.forEach(({ name, headers }) => {
    let sh = SS.getSheetByName(name);
    if (!sh) sh = SS.insertSheet(name);
    if (sh.getLastRow() === 0) {
      sh.appendRow(headers);
      sh.getRange(1, 1, 1, headers.length)
        .setBackground("#1a2a1a")
        .setFontColor("#00b87a")
        .setFontWeight("bold");
    }
  });

  // Formula TOTAL PRODUK di Product!N2
  const prodSh = SS.getSheetByName("Product");
  prodSh.getRange("N2").setFormula('=COUNTA(C2:C)');

  SpreadsheetApp.getUi().alert("✅ Setup selesai! Semua sheet sudah siap.");
}
