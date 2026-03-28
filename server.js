const express = require("express");
const multer = require("multer");
const FormData = require("form-data");
const fetch = require("node-fetch");
const path = require("path");

const app = express();
const PORT = 3000;
const FASTAPI_URL = "http://localhost:5050";

// Serve static frontend
app.use(express.static(path.join(__dirname, "public")));

// multer: store in memory
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ─── Helper: forward multipart files to FastAPI ────────────────────────────
async function forwardFiles(files, endpoint) {
  const form = new FormData();
  for (const file of files) {
    form.append("files", file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });
  }

  const response = await fetch(`${FASTAPI_URL}${endpoint}`, {
    method: "POST",
    body: form,
    headers: form.getHeaders(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`FastAPI error ${response.status}: ${text}`);
  }

  const data = await response.json();

  // Rewrite image URLs so browser can reach FastAPI static files
  function rewriteUrls(obj) {
    if (typeof obj === "string") {
      return obj.replace(/http:\/\/localhost:5050/g, FASTAPI_URL);
    }
    if (Array.isArray(obj)) return obj.map(rewriteUrls);
    if (obj && typeof obj === "object") {
      const out = {};
      for (const k of Object.keys(obj)) out[k] = rewriteUrls(obj[k]);
      return out;
    }
    return obj;
  }

  return rewriteUrls(data);
}

// ─── Single image ──────────────────────────────────────────────────────────
app.post("/analyze", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const form = new FormData();
    form.append("file", req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    const response = await fetch(`${FASTAPI_URL}/analyze`, {
      method: "POST",
      body: form,
      headers: form.getHeaders(),
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: text });
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("/analyze error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Batch images ──────────────────────────────────────────────────────────
app.post("/analyze-batch", upload.array("files"), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0)
      return res.status(400).json({ error: "No files uploaded" });

    const data = await forwardFiles(req.files, "/analyze-batch");
    res.json(data);
  } catch (err) {
    console.error("/analyze-batch error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Health proxy ──────────────────────────────────────────────────────────
app.get("/health", async (req, res) => {
  try {
    const r = await fetch(`${FASTAPI_URL}/health`);
    const d = await r.json();
    res.json(d);
  } catch {
    res.status(503).json({ status: "FastAPI unreachable" });
  }
});

app.listen(PORT, () => {
  console.log(`\n🔬 MicroLens Node proxy running → http://localhost:${PORT}`);
  console.log(`   FastAPI backend expected at  → ${FASTAPI_URL}\n`);
});
