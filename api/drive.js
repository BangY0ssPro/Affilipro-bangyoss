// ============================================================
// api/drive.js — Vercel Serverless Function (v2.0)
// Proxy Google Drive API untuk ambil list gambar & signed URL
// ============================================================

const { google } = require("googleapis");

// ── Konfigurasi dari Environment Variables Vercel ──
const CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
const PRIVATE_KEY = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
const FOLDER_ID = process.env.DRIVE_FOLDER_ID;

// ── CORS Headers ──
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// ── Validasi Environment Variables ──
function validateEnv() {
  const missing = [];
  if (!CLIENT_EMAIL) missing.push("GOOGLE_CLIENT_EMAIL");
  if (!PRIVATE_KEY || PRIVATE_KEY.length < 10) missing.push("GOOGLE_PRIVATE_KEY");
  if (!FOLDER_ID) missing.push("DRIVE_FOLDER_ID");
  
  if (missing.length > 0) {
    const msg = `Missing environment variables: ${missing.join(", ")}`;
    console.error(`[ERROR] ${msg}`);
    throw new Error(msg);
  }
}

// ── Inisialisasi Google Auth ──
function getAuth() {
  return new google.auth.JWT(CLIENT_EMAIL, null, PRIVATE_KEY, [
    "https://www.googleapis.com/auth/drive.readonly",
  ]);
}

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
    const drive = google.drive({ version: "v3", auth });
    const fileId = req.query.fileId;

    // ── GET: List file dalam folder ──
    if (!fileId) {
      const folderId = req.query.folderId || FOLDER_ID;
      
      if (!folderId) {
        return res.status(400).json({
          ok: false,
          error: "Parameter 'folderId' wajib ada atau set DRIVE_FOLDER_ID di env",
          files: []
        });
      }

      try {
        const resp = await drive.files.list({
          q: `'${folderId}' in parents and mimeType contains 'image/' and trashed=false`,
          fields: "files(id,name,webContentLink,webViewLink,thumbnailLink,createdTime,modifiedTime,size)",
          pageSize: 200,
          orderBy: "createdTime desc",
        });

        const files = (resp.data.files || []).map((f) => ({
          id: f.id,
          name: f.name,
          // URL publik (file harus dibagikan "Anyone with the link")
          url: `https://drive.google.com/uc?export=view&id=${f.id}`,
          thumbnail: f.thumbnailLink || `https://drive.google.com/thumbnail?id=${f.id}&sz=w200`,
          createdTime: f.createdTime,
          modifiedTime: f.modifiedTime,
          size: f.size
        }));

        return res.status(200).json({
          ok: true,
          files,
          count: files.length,
          folderId
        });
      } catch (driveErr) {
        console.error(`[Drive LIST Error] ${driveErr.message}`);
        return res.status(400).json({
          ok: false,
          error: `Tidak bisa list folder: ${driveErr.message}`,
          files: []
        });
      }
    }

    // ── GET: Redirect ke URL file langsung (untuk embed gambar) ──
    if (fileId) {
      try {
        const directUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
        return res.redirect(302, directUrl);
      } catch (err) {
        console.error(`[Drive REDIRECT Error] ${err.message}`);
        return res.status(400).json({
          ok: false,
          error: `Tidak bisa akses file: ${err.message}`
        });
      }
    }

    // ── Method tidak didukung ──
    return res.status(405).json({
      ok: false,
      error: `Method ${req.method} tidak didukung (gunakan GET)`
    });

  } catch (err) {
    console.error(`[Drive API Fatal Error] ${err.message}`);
    const statusCode = err.message.includes("Missing environment") ? 500 : 500;
    return res.status(statusCode).json({
      ok: false,
      error: err.message,
      hint: "Cek environment variables di Vercel Dashboard",
      files: []
    });
  }
};
