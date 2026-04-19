// ============================================================
// api/sheets.js — Vercel Serverless Function (v2.0)
// Proxy Google Sheets API agar tidak kena CORS dari browser
// Deploy ke Vercel, URL: https://yourdomain.vercel.app/api/sheets
// ============================================================
const { google } = require("googleapis");

// ── Konfigurasi dari Environment Variables Vercel ──
const SHEET_ID = process.env.SPREADSHEET_ID;
const CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
const PRIVATE_KEY = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

// ── Validasi Environment Variables ──
function validateEnv() {
  const missing = [];
  if (!SHEET_ID) missing.push("SPREADSHEET_ID");
  if (!CLIENT_EMAIL) missing.push("GOOGLE_CLIENT_EMAIL");
  if (!PRIVATE_KEY || PRIVATE_KEY.length < 10) missing.push("GOOGLE_PRIVATE_KEY");
  
  if (missing.length > 0) {
    const msg = `Missing environment variables: ${missing.join(", ")}`;
    console.error(`[ERROR] ${msg}`);
    throw new Error(msg);
  }
}

// ── Inisialisasi Google Auth ──
function getAuth() {
  return new google.auth.JWT(CLIENT_EMAIL, null, PRIVATE_KEY, [
    "https://www.googleapis.com/auth/spreadsheets",
  ]);
}

// ── CORS Headers ──
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// ============================================================
// MAIN HANDLER
// ============================================================
module.exports = async function handler(req, res) {
  // ── Set CORS headers untuk semua response ──
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));

  // ── Handle preflight OPTIONS ──
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    // ── Validasi env var saat startup ──
    validateEnv();

    const auth = getAuth();
    const sheets = google.sheets({ version: "v4", auth });

    // ── GET: Baca data dari sheet ──
    if (req.method === "GET") {
      const range = req.query.range;
      if (!range) {
        return res.status(400).json({
          ok: false,
          error: "Parameter 'range' wajib ada (contoh: 'Product!A:N')"
        });
      }

      try {
        const resp = await sheets.spreadsheets.values.get({
          spreadsheetId: SHEET_ID,
          range,
          valueRenderOption: "UNFORMATTED_VALUE",
          dateTimeRenderOption: "FORMATTED_STRING",
        });

        const rows = resp.data.values || [];
        const headers = rows[0] || [];
        const data = rows.slice(1).map((row) =>
          Object.fromEntries(headers.map((h, i) => [h, row[i] ?? ""]))
        );

        return res.status(200).json({
          ok: true,
          data,
          headers,
          count: data.length
        });
      } catch (sheetErr) {
        console.error(`[Sheets GET Error] ${sheetErr.message}`);
        return res.status(400).json({
          ok: false,
          error: `Tidak bisa baca sheet: ${sheetErr.message}`
        });
      }
    }

    // ── POST: Tulis data ke sheet ──
    if (req.method === "POST") {
      const { range, values, append } = req.body;
      if (!range || !values) {
        return res.status(400).json({
          ok: false,
          error: "Parameter 'range' dan 'values' wajib ada"
        });
      }

      try {
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

        return res.status(200).json({
          ok: true,
          updatedRange: result.data.updatedRange || result.data.tableRange,
          mode: append ? "append" : "update"
        });
      } catch (sheetErr) {
        console.error(`[Sheets POST Error] ${sheetErr.message}`);
        return res.status(400).json({
          ok: false,
          error: `Tidak bisa tulis sheet: ${sheetErr.message}`
        });
      }
    }

    // ── Method tidak didukung ──
    return res.status(405).json({
      ok: false,
      error: `Method ${req.method} tidak didukung (gunakan GET atau POST)`
    });

  } catch (err) {
    console.error(`[Sheets API Fatal Error] ${err.message}`);
    const statusCode = err.message.includes("Missing environment") ? 500 : 500;
    return res.status(statusCode).json({
      ok: false,
      error: err.message,
      hint: "Cek environment variables di Vercel Dashboard"
    });
  }
};

// ✅ VERCEL V2 COMPATIBILITY: Export default untuk serverless functions
module.exports.default = module.exports;
