// ============================================================
// api/drive.js — Vercel Serverless Function
// Proxy Google Drive API untuk ambil list gambar & signed URL
// ============================================================

const { google } = require("googleapis");

const CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
const PRIVATE_KEY  = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
const FOLDER_ID    = process.env.DRIVE_FOLDER_ID; // ID folder Google Drive untuk gambar produk

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function getAuth() {
  return new google.auth.JWT(CLIENT_EMAIL, null, PRIVATE_KEY, [
    "https://www.googleapis.com/auth/drive.readonly",
  ]);
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(200).set(CORS).end();
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));

  try {
    const auth  = getAuth();
    const drive = google.drive({ version: "v3", auth });
    const fileId = req.query.fileId;

    // ── List file dalam folder ──
    if (!fileId) {
      const folderId = req.query.folderId || FOLDER_ID;
      const resp = await drive.files.list({
        q: `'${folderId}' in parents and mimeType contains 'image/' and trashed=false`,
        fields: "files(id,name,webContentLink,webViewLink,thumbnailLink)",
        pageSize: 200,
      });
      const files = (resp.data.files || []).map((f) => ({
        id:        f.id,
        name:      f.name,
        // URL publik (file harus dibagikan "Anyone with the link")
        url:       `https://drive.google.com/uc?export=view&id=${f.id}`,
        thumbnail: f.thumbnailLink || `https://drive.google.com/thumbnail?id=${f.id}&sz=w200`,
      }));
      return res.status(200).json({ ok: true, files });
    }

    // ── Redirect ke URL file langsung (untuk embed gambar) ──
    const directUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
    return res.redirect(302, directUrl);

  } catch (err) {
    console.error("[Drive API Error]", err.message);
    return res.status(500).json({ error: err.message });
  }
};
