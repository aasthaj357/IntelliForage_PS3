/* ═══════════════════════════════════════════
   MicroLens — script.js
═══════════════════════════════════════════ */

// ─── State ────────────────────────────────
let selectedFiles = [];
let lastBatchData = null;
let barChartInst = null;
let pieChartInst = null;

// ─── DOM refs ─────────────────────────────
const dropZone      = document.getElementById("dropZone");
const fileInput     = document.getElementById("fileInput");
const thumbRow      = document.getElementById("thumbRow");
const thumbGrid     = document.getElementById("thumbGrid");
const fileCount     = document.getElementById("fileCount");
const clearBtn      = document.getElementById("clearBtn");
const runBtn        = document.getElementById("runBtn");
const loadingOverlay = document.getElementById("loadingOverlay");
const resultsSection = document.getElementById("resultsSection");
const imageTabs     = document.getElementById("imageTabs");
const resultCards   = document.getElementById("resultCards");

// ─── Health check ─────────────────────────
async function checkHealth() {
  const pill = document.getElementById("statusPill");
  const txt  = document.getElementById("statusText");
  try {
    const r = await fetch("/health");
    const d = await r.json();
    if (d.status === "ok") {
      pill.className = "status-pill ok";
      txt.textContent = d.model_loaded ? "Model Ready" : "Simulation Mode";
    } else {
      throw new Error("not ok");
    }
  } catch {
    pill.className = "status-pill err";
    txt.textContent = "Backend Offline";
  }
}
checkHealth();
setInterval(checkHealth, 15000);

// ─── Tabs ─────────────────────────────────
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("tab-" + btn.dataset.tab).classList.add("active");
  });
});

// ─── Drop zone ────────────────────────────
dropZone.addEventListener("click", () => fileInput.click());
dropZone.addEventListener("dragover", e => { e.preventDefault(); dropZone.classList.add("over"); });
dropZone.addEventListener("dragleave", () => dropZone.classList.remove("over"));
dropZone.addEventListener("drop", e => {
  e.preventDefault();
  dropZone.classList.remove("over");
  addFiles([...e.dataTransfer.files]);
});
fileInput.addEventListener("change", () => addFiles([...fileInput.files]));

function addFiles(newFiles) {
  const imgs = newFiles.filter(f => f.type.startsWith("image/"));
  selectedFiles = [...selectedFiles, ...imgs];
  renderThumbs();
}

function renderThumbs() {
  thumbGrid.innerHTML = "";
  if (selectedFiles.length === 0) {
    thumbRow.style.display = "none";
    runBtn.disabled = true;
    return;
  }
  thumbRow.style.display = "block";
  runBtn.disabled = false;
  fileCount.textContent = `${selectedFiles.length} image${selectedFiles.length > 1 ? "s" : ""} selected`;
  selectedFiles.forEach((f, i) => {
    const wrap = document.createElement("div");
    wrap.className = "thumb-item";
    const img = document.createElement("img");
    img.src = URL.createObjectURL(f);
    const name = document.createElement("div");
    name.className = "thumb-name";
    name.textContent = f.name;
    wrap.append(img, name);
    thumbGrid.appendChild(wrap);
  });
}

clearBtn.addEventListener("click", () => {
  selectedFiles = [];
  fileInput.value = "";
  renderThumbs();
  resultsSection.style.display = "none";
});

// ─── Run detection ────────────────────────
runBtn.addEventListener("click", async () => {
  if (!selectedFiles.length) return;

  runBtn.disabled = true;
  loadingOverlay.style.display = "flex";
  resultsSection.style.display = "none";

  const form = new FormData();
  selectedFiles.forEach(f => form.append("files", f));

  try {
    const res = await fetch("/analyze-batch", { method: "POST", body: form });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err);
    }
    const data = await res.json();
    console.log("[MicroLens] API response:", data);
    lastBatchData = data;
    renderResults(data);
    renderAnalytics(data);
    renderReport(data);
  } catch (err) {
    alert("Detection failed: " + err.message);
    console.error(err);
  } finally {
    loadingOverlay.style.display = "none";
    runBtn.disabled = selectedFiles.length === 0;
  }
});

// ─── Results ──────────────────────────────
function renderResults(data) {
  const results = data.results || [];
  imageTabs.innerHTML = "";
  resultCards.innerHTML = "";

  if (!results.length) {
    resultsSection.style.display = "none";
    return;
  }

  results.forEach((r, i) => {
    // Tab button
    const tabBtn = document.createElement("button");
    tabBtn.className = "img-tab-btn" + (i === 0 ? " active" : "");
    tabBtn.textContent = `IMG ${i + 1}`;
    tabBtn.addEventListener("click", () => {
      document.querySelectorAll(".img-tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".result-card").forEach(c => c.classList.remove("active"));
      tabBtn.classList.add("active");
      document.getElementById("card-" + i).classList.add("active");
    });
    imageTabs.appendChild(tabBtn);

    // Card
    const card = document.createElement("div");
    card.className = "result-card" + (i === 0 ? " active" : "");
    card.id = "card-" + i;

    const dist = r.summary?.distribution || {};
    const total = r.summary?.total_particles ?? r.detections?.length ?? 0;

    card.innerHTML = `
      <div class="card-grid">
        <div class="img-panel">
          <div class="img-panel-label">Original — ${escHtml(r.filename || "")}</div>
          <img src="${escHtml(r.image_url || "")}" alt="Original" onerror="this.style.display='none'" />
        </div>
        <div class="img-panel">
          <div class="img-panel-label">Annotated · ${total} particles detected</div>
          <img src="${escHtml(r.annotated_url || "")}" alt="Annotated" onerror="this.style.display='none'" />
        </div>
      </div>
      <div class="det-list">
        <div class="det-list-header">
          <span>Detections (${r.detections?.length || 0})</span>
          <span>Fiber: ${dist.fiber||0} · Fragment: ${dist.fragment||0} · Film: ${dist.film||0} · Pellet: ${dist.pellet||0}</span>
        </div>
        ${(r.detections || []).map(d => `
          <div class="det-item">
            <span class="det-label-badge badge-${d.label}">${escHtml(d.label)}</span>
            <span class="det-conf">conf ${(d.confidence * 100).toFixed(1)}%</span>
            <span class="det-conf">sz ${d.size}px</span>
            <span class="det-risk ${riskClass(d.risk)}">risk ${d.risk}</span>
          </div>
        `).join("")}
        ${!r.detections?.length ? '<div class="det-item" style="color:var(--text-dim)">No particles detected</div>' : ""}
      </div>
    `;
    resultCards.appendChild(card);
  });

  resultsSection.style.display = "block";
  resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ─── Analytics ────────────────────────────
function renderAnalytics(data) {
  const s = data.summary || {};
  const dist = s.distribution || {};

  document.getElementById("analyticsEmpty").style.display = "none";
  document.getElementById("analyticsDash").style.display = "block";

  document.getElementById("statTotal").textContent    = s.total_particles ?? 0;
  document.getElementById("statImages").textContent   = s.total_images ?? 0;
  document.getElementById("statAvgRisk").textContent  = s.avg_risk ?? 0;
  document.getElementById("statRiskLevel").textContent = s.risk_level ?? "—";

  const riskCard = document.getElementById("riskCard");
  riskCard.className = "stat-card risk-card " + (s.risk_level || "").toLowerCase();

  document.getElementById("cntFiber").textContent    = dist.fiber    ?? 0;
  document.getElementById("cntFragment").textContent = dist.fragment ?? 0;
  document.getElementById("cntFilm").textContent     = dist.film     ?? 0;
  document.getElementById("cntPellet").textContent   = dist.pellet   ?? 0;

  // Bar chart
  const barCtx = document.getElementById("barChart").getContext("2d");
  if (barChartInst) barChartInst.destroy();
  barChartInst = new Chart(barCtx, {
    type: "bar",
    data: {
      labels: ["Fiber", "Fragment", "Film", "Pellet"],
      datasets: [{
        label: "Count",
        data: [dist.fiber||0, dist.fragment||0, dist.film||0, dist.pellet||0],
        backgroundColor: ["rgba(255,100,56,0.7)","rgba(58,180,255,0.7)","rgba(82,232,138,0.7)","rgba(255,217,61,0.7)"],
        borderColor:     ["#ff6438","#3ab4ff","#52e88a","#ffd93d"],
        borderWidth: 1,
        borderRadius: 4,
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: "#5c7a8a" }, grid: { color: "#1e2d3d" } },
        y: { ticks: { color: "#5c7a8a" }, grid: { color: "#1e2d3d" }, beginAtZero: true }
      }
    }
  });

  // Pie chart
  const pieCtx = document.getElementById("pieChart").getContext("2d");
  if (pieChartInst) pieChartInst.destroy();
  pieChartInst = new Chart(pieCtx, {
    type: "doughnut",
    data: {
      labels: ["Fiber", "Fragment", "Film", "Pellet"],
      datasets: [{
        data: [dist.fiber||0, dist.fragment||0, dist.film||0, dist.pellet||0],
        backgroundColor: ["rgba(255,100,56,0.8)","rgba(58,180,255,0.8)","rgba(82,232,138,0.8)","rgba(255,217,61,0.8)"],
        borderColor: "#0d1318",
        borderWidth: 3,
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "bottom", labels: { color: "#5c7a8a", padding: 12 } }
      }
    }
  });

  // Gauge
  drawGauge(s.avg_risk || 0);

  // Highest risk
  let highestRisk = null;
  let highestImg = null;
  (data.results || []).forEach(r => {
    (r.detections || []).forEach(d => {
      if (!highestRisk || d.risk > highestRisk.risk) {
        highestRisk = d;
        highestImg = r.filename;
      }
    });
  });

  const hrBox = document.getElementById("highRiskBox");
  if (highestRisk) {
    hrBox.style.display = "block";
    document.getElementById("highRiskBody").innerHTML =
      `<strong class="${riskClass(highestRisk.risk)}">${escHtml(highestRisk.label)}</strong> · ` +
      `Risk: <strong>${highestRisk.risk}</strong> · ` +
      `Confidence: ${(highestRisk.confidence * 100).toFixed(1)}% · ` +
      `Size: ${highestRisk.size}px · ` +
      `Found in: <em>${escHtml(highestImg || "")}</em>`;
  } else {
    hrBox.style.display = "none";
  }
}

function drawGauge(value) {
  const canvas = document.getElementById("gaugeChart");
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const cx = canvas.width / 2;
  const cy = canvas.height - 20;
  const r  = 110;

  // Background arc
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI, 0);
  ctx.lineWidth = 18;
  ctx.strokeStyle = "#1e2d3d";
  ctx.stroke();

  // Colored arc
  const pct = Math.min(value / 100, 1);
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI, Math.PI + Math.PI * pct);
  ctx.lineWidth = 18;
  const grd = ctx.createLinearGradient(cx - r, cy, cx + r, cy);
  grd.addColorStop(0,   "#00c896");
  grd.addColorStop(0.5, "#ffd93d");
  grd.addColorStop(1,   "#ff6b35");
  ctx.strokeStyle = grd;
  ctx.lineCap = "round";
  ctx.stroke();

  // Labels
  ctx.fillStyle = "#5c7a8a";
  ctx.font = "11px 'Space Mono'";
  ctx.textAlign = "left";
  ctx.fillText("0", cx - r - 8, cy + 4);
  ctx.textAlign = "right";
  ctx.fillText("100", cx + r + 8, cy + 4);

  document.getElementById("gaugeLabel").textContent = value.toFixed(1);
}

// ─── Report ───────────────────────────────
function renderReport(data) {
  const s = data.summary || {};
  const dist = s.distribution || {};

  document.getElementById("reportEmpty").style.display   = "none";
  document.getElementById("reportContent").style.display = "block";

  // Summary
  document.getElementById("reportSummary").innerHTML = `
    <div class="report-stat"><div class="report-stat-label">Images</div><div class="report-stat-value">${s.total_images ?? 0}</div></div>
    <div class="report-stat"><div class="report-stat-label">Total Particles</div><div class="report-stat-value">${s.total_particles ?? 0}</div></div>
    <div class="report-stat"><div class="report-stat-label">Avg Risk</div><div class="report-stat-value">${s.avg_risk ?? 0}</div></div>
    <div class="report-stat"><div class="report-stat-label">Risk Level</div><div class="report-stat-value ${riskClass(s.avg_risk)}">${s.risk_level ?? "—"}</div></div>
    <div class="report-stat"><div class="report-stat-label">Fibers</div><div class="report-stat-value">${dist.fiber ?? 0}</div></div>
    <div class="report-stat"><div class="report-stat-label">Fragments</div><div class="report-stat-value">${dist.fragment ?? 0}</div></div>
    <div class="report-stat"><div class="report-stat-label">Films</div><div class="report-stat-value">${dist.film ?? 0}</div></div>
    <div class="report-stat"><div class="report-stat-label">Pellets</div><div class="report-stat-value">${dist.pellet ?? 0}</div></div>
  `;

  // Insight
  const level = (s.risk_level || "LOW").toUpperCase();
  const insightMap = {
    LOW:      "Analysis indicates a low microplastic burden across the samples. Particle concentrations and risk scores are within acceptable thresholds. Continued monitoring is advised, but no immediate remediation is required.",
    MODERATE: "A moderate level of microplastic contamination has been detected. Fragment and fiber particles were most prevalent. Consider investigating potential contamination sources and scheduling follow-up analysis within 30 days.",
    HIGH:     "HIGH contamination levels detected. The sample shows elevated pellet and fragment counts with significant risk scores. Immediate investigation of the contamination source is strongly recommended. This sample should be flagged for priority remediation."
  };
  document.getElementById("riskInsight").textContent = insightMap[level] || insightMap["LOW"];

  // Table
  const tbody = document.getElementById("detTableBody");
  tbody.innerHTML = "";
  (data.results || []).forEach(r => {
    (r.detections || []).forEach(d => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escHtml(r.filename || "")}</td>
        <td><span class="det-label-badge badge-${d.label}">${escHtml(d.label)}</span></td>
        <td>${(d.confidence * 100).toFixed(1)}%</td>
        <td>${d.size}</td>
        <td class="${riskClass(d.risk)}">${d.risk}</td>
      `;
      tbody.appendChild(tr);
    });
  });
}

// ─── Downloads ────────────────────────────
document.getElementById("dlTxt").addEventListener("click", () => {
  if (!lastBatchData) return;
  const s = lastBatchData.summary || {};
  const dist = s.distribution || {};
  let out = "=== MicroLens Analysis Report ===\n";
  out += `Date: ${new Date().toLocaleString()}\n\n`;
  out += `Images Analyzed: ${s.total_images}\n`;
  out += `Total Particles: ${s.total_particles}\n`;
  out += `Average Risk Score: ${s.avg_risk}\n`;
  out += `Risk Level: ${s.risk_level}\n\n`;
  out += "Distribution:\n";
  out += `  Fiber: ${dist.fiber}\n  Fragment: ${dist.fragment}\n  Film: ${dist.film}\n  Pellet: ${dist.pellet}\n\n`;
  out += "=== Detections ===\n";
  (lastBatchData.results || []).forEach(r => {
    out += `\n[${r.filename}]\n`;
    (r.detections || []).forEach(d => {
      out += `  ${d.label} | conf: ${(d.confidence*100).toFixed(1)}% | size: ${d.size}px | risk: ${d.risk}\n`;
    });
  });
  downloadText(out, "microlens_report.txt");
});

document.getElementById("dlPdf").addEventListener("click", () => {
  if (!lastBatchData) return;
  // Build a printable HTML page and trigger print-to-PDF
  const s = lastBatchData.summary || {};
  const dist = s.distribution || {};
  let rows = "";
  (lastBatchData.results || []).forEach(r => {
    (r.detections || []).forEach(d => {
      rows += `<tr><td>${escHtml(r.filename||"")}</td><td>${escHtml(d.label)}</td><td>${(d.confidence*100).toFixed(1)}%</td><td>${d.size}</td><td>${d.risk}</td></tr>`;
    });
  });

  const html = `<!DOCTYPE html><html><head><title>MicroLens Report</title>
  <style>
    body{font-family:monospace;margin:40px;color:#000}
    h1{font-size:22px;margin-bottom:4px}
    .meta{color:#555;font-size:13px;margin-bottom:24px}
    .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}
    .card{border:1px solid #ddd;border-radius:6px;padding:12px;text-align:center}
    .card .val{font-size:28px;font-weight:700;margin-bottom:4px}
    .card .lbl{font-size:11px;color:#777;text-transform:uppercase}
    table{width:100%;border-collapse:collapse;font-size:13px}
    th{background:#f0f0f0;padding:8px;text-align:left;border-bottom:1px solid #ddd}
    td{padding:8px;border-bottom:1px solid #eee}
    .insight{border-left:3px solid #00c896;padding:12px;background:#f8fffc;margin:16px 0;font-size:14px}
  </style></head><body>
  <h1>MicroLens — Analysis Report</h1>
  <div class="meta">Generated: ${new Date().toLocaleString()}</div>
  <div class="grid">
    <div class="card"><div class="val">${s.total_images}</div><div class="lbl">Images</div></div>
    <div class="card"><div class="val">${s.total_particles}</div><div class="lbl">Particles</div></div>
    <div class="card"><div class="val">${s.avg_risk}</div><div class="lbl">Avg Risk</div></div>
    <div class="card"><div class="val">${s.risk_level}</div><div class="lbl">Risk Level</div></div>
  </div>
  <div class="grid">
    <div class="card"><div class="val">${dist.fiber}</div><div class="lbl">Fiber</div></div>
    <div class="card"><div class="val">${dist.fragment}</div><div class="lbl">Fragment</div></div>
    <div class="card"><div class="val">${dist.film}</div><div class="lbl">Film</div></div>
    <div class="card"><div class="val">${dist.pellet}</div><div class="lbl">Pellet</div></div>
  </div>
  <table><thead><tr><th>Image</th><th>Label</th><th>Confidence</th><th>Size</th><th>Risk</th></tr></thead>
  <tbody>${rows}</tbody></table>
  </body></html>`;

  const w = window.open("", "_blank");
  w.document.write(html);
  w.document.close();
  setTimeout(() => w.print(), 400);
});

// ─── Helpers ──────────────────────────────
function riskClass(r) {
  if (r == null) return "";
  if (r < 35) return "risk-low";
  if (r < 65) return "risk-moderate";
  return "risk-high";
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function downloadText(text, filename) {
  const blob = new Blob([text], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}
