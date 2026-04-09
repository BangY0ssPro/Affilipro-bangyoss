// ============================================================
// api/sheets.js — Vercel Serverless Function
// Proxy Google Sheets API agar tidak kena CORS dari browser
// Deploy ke Vercel, URL: https://yourdomain.vercel.app/api/sheets
// ============================================================

const { google } = require("googleapis");

// ── Konfigurasi dari Environment Variables Vercel ──
const SHEET_ID     = process.env.SPREADSHEET_ID;        // ID Google Spreadsheet
const CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;   // Service Account email
const PRIVATE_KEY  = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

// ── Inisialisasi Google Auth ──
function getAuth() {
  return new google.auth.JWT(CLIENT_EMAIL, null, PRIVATE_KEY, [
    "https://www.googleapis.com/auth/spreadsheets",
  ]);
}

// ── CORS Headers ──
const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// ============================================================
// MAIN HANDLER
// ============================================================
module.exports = async function handler(req, res) {
  // Handle preflight OPTIONS
  if (req.method === "OPTIONS") {
    return res.status(200).set(CORS).end();
  }
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));

  try {
    const auth   = getAuth();
    const sheets = google.sheets({ version: "v4", auth });
    const action = req.query.action || req.body?.action;

    // ── GET: Baca data dari sheet ──
    if (req.method === "GET") {
      const range = req.query.range; // contoh: "Product!A:N"
      if (!range) return res.status(400).json({ error: "Parameter 'range' wajib ada" });

      const resp = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range,
        valueRenderOption: "UNFORMATTED_VALUE",
        dateTimeRenderOption: "FORMATTED_STRING",
      });

      const rows    = resp.data.values || [];
      const headers = rows[0] || [];
      const data    = rows.slice(1).map((row) =>
        Object.fromEntries(headers.map((h, i) => [h, row[i] ?? ""]))
      );
      return res.status(200).json({ ok: true, data, headers });
    }

    // ── POST: Tulis data ke sheet ──
    if (req.method === "POST") {
      const { range, values, append } = req.body;
      if (!range || !values) return res.status(400).json({ error: "range dan values wajib ada" });

      let result;
      if (append) {
        // Tambah baris baru di bawah data yang ada
        result = await sheets.spreadsheets.values.append({
          spreadsheetId: SHEET_ID,
          range,
          valueInputOption: "USER_ENTERED",
          insertDataOption: "INSERT_ROWS",
          requestBody: { values },
        });
      } else {
        // Update / overwrite range tertentu
        result = await sheets.spreadsheets.values.update({
          spreadsheetId: SHEET_ID,
          range,
          valueInputOption: "USER_ENTERED",
          requestBody: { values },
        });
      }
      return res.status(200).json({ ok: true, updatedRange: result.data.updatedRange || result.data.tableRange });
    }

    return res.status(405).json({ error: "Method tidak didukung" });
  } catch (err) {
    console.error("[Sheets API Error]", err.message);
    return res.status(500).json({ error: err.message });
  }
};
