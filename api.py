import os
import uuid
import random
import math
from pathlib import Path
from typing import List

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, ImageDraw, ImageFont
import io

app = FastAPI(title="MicroLens API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).parent
UPLOADS_DIR = BASE_DIR / "uploads"
ANNOTATED_DIR = BASE_DIR / "annotated"
UPLOADS_DIR.mkdir(exist_ok=True)
ANNOTATED_DIR.mkdir(exist_ok=True)

app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")
app.mount("/annotated", StaticFiles(directory=str(ANNOTATED_DIR)), name="annotated")

# ─────────────────────────────────────────────
# Model loading (with graceful fallback)
# ─────────────────────────────────────────────
model = None
MODEL_PATH = BASE_DIR.parent / "runs" / "detect" / "train" / "weights" / "best.pt"

try:
    from ultralytics import YOLO
    if MODEL_PATH.exists():
        model = YOLO(str(MODEL_PATH))
        print(f"[MicroLens] YOLO model loaded from {MODEL_PATH}")
    else:
        print(f"[MicroLens] Model not found at {MODEL_PATH} — using simulation mode")
except ImportError:
    print("[MicroLens] Ultralytics not installed — using simulation mode")

# ─────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────
PARTICLE_TYPES = ["fiber", "fragment", "film", "pellet"]
BASE_RISK = {"fiber": 35, "fragment": 45, "film": 30, "pellet": 55}
COLORS = {
    "fiber":    (255, 100,  60),
    "fragment": ( 60, 180, 255),
    "film":     (120, 255, 120),
    "pellet":   (255, 220,  40),
}


def compute_risk(label: str, size: int, confidence: float) -> float:
    base = BASE_RISK.get(label, 40)
    size_factor = min(size / 500.0, 1.0) * 20
    conf_factor = confidence * 15
    risk = base + size_factor + conf_factor
    return round(min(risk, 100.0), 2)


def simulate_detections(image: Image.Image, filename: str):
    """Generate synthetic detections when no real model is available."""
    w, h = image.size
    n = random.randint(3, 12)
    detections = []
    for _ in range(n):
        label = random.choice(PARTICLE_TYPES)
        confidence = round(random.uniform(0.55, 0.98), 3)
        size = random.randint(30, 400)
        risk = compute_risk(label, size, confidence)
        x1 = random.randint(10, w - 80)
        y1 = random.randint(10, h - 80)
        x2 = x1 + random.randint(20, 70)
        y2 = y1 + random.randint(20, 70)
        detections.append({
            "label": label,
            "confidence": confidence,
            "size": size,
            "risk": risk,
            "bbox": [x1, y1, x2, y2],
        })
    return detections


def run_model_detections(image: Image.Image, filename: str):
    """Run actual YOLO inference."""
    import tempfile, shutil
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
        image.save(tmp.name)
        tmp_path = tmp.name
    try:
        results = model(tmp_path)[0]
    finally:
        os.unlink(tmp_path)

    detections = []
    for box in results.boxes:
        cls_id = int(box.cls[0])
        label = PARTICLE_TYPES[cls_id % len(PARTICLE_TYPES)]
        confidence = round(float(box.conf[0]), 3)
        x1, y1, x2, y2 = [int(v) for v in box.xyxy[0]]
        size = int(math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2))
        risk = compute_risk(label, size, confidence)
        detections.append({
            "label": label,
            "confidence": confidence,
            "size": size,
            "risk": risk,
            "bbox": [x1, y1, x2, y2],
        })
    return detections


def annotate_image(image: Image.Image, detections: list) -> Image.Image:
    annotated = image.convert("RGB").copy()
    draw = ImageDraw.Draw(annotated)

    try:
        font = ImageFont.truetype("arial.ttf", 14)
    except Exception:
        font = ImageFont.load_default()

    for det in detections:
        x1, y1, x2, y2 = det["bbox"]
        color = COLORS.get(det["label"], (255, 255, 255))
        draw.rectangle([x1, y1, x2, y2], outline=color, width=2)
        label_text = f'{det["label"]} {det["confidence"]:.0%}'
        draw.rectangle([x1, y1 - 18, x1 + len(label_text) * 8, y1], fill=color)
        draw.text((x1 + 2, y1 - 16), label_text, fill=(0, 0, 0), font=font)

    return annotated


def process_image(file_bytes: bytes, original_filename: str, base_url: str = "http://localhost:5050"):
    uid = uuid.uuid4().hex[:10]
    ext = Path(original_filename).suffix or ".jpg"
    safe_name = f"{uid}{ext}"

    image = Image.open(io.BytesIO(file_bytes)).convert("RGB")

    # Save original
    orig_path = UPLOADS_DIR / safe_name
    image.save(str(orig_path))

    # Detections
    detections_raw = run_model_detections(image, safe_name) if model else simulate_detections(image, safe_name)

    # Annotate & save
    annotated_img = annotate_image(image, detections_raw)
    ann_path = ANNOTATED_DIR / safe_name
    annotated_img.save(str(ann_path))

    # Build response detections (strip bbox)
    detections_out = [
        {
            "label": d["label"],
            "confidence": d["confidence"],
            "size": d["size"],
            "risk": d["risk"],
        }
        for d in detections_raw
    ]

    distribution = {"fiber": 0, "fragment": 0, "film": 0, "pellet": 0}
    for d in detections_out:
        distribution[d["label"]] = distribution.get(d["label"], 0) + 1

    return {
        "filename": original_filename,
        "detections": detections_out,
        "image_url": f"{base_url}/uploads/{safe_name}",
        "annotated_url": f"{base_url}/annotated/{safe_name}",
        "summary": {
            "total_particles": len(detections_out),
            "distribution": distribution,
        },
    }


# ─────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": model is not None}


@app.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    contents = await file.read()
    result = process_image(contents, file.filename)
    return result


@app.post("/analyze-batch")
async def analyze_batch(files: List[UploadFile] = File(...)):
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    results = []
    for f in files:
        contents = await f.read()
        r = process_image(contents, f.filename)
        results.append(r)

    # Aggregate summary
    total_particles = sum(r["summary"]["total_particles"] for r in results)
    agg_dist = {"fiber": 0, "fragment": 0, "film": 0, "pellet": 0}
    all_risks = []
    for r in results:
        for k in agg_dist:
            agg_dist[k] += r["summary"]["distribution"].get(k, 0)
        for d in r["detections"]:
            all_risks.append(d["risk"])

    avg_risk = round(sum(all_risks) / len(all_risks), 2) if all_risks else 0.0

    if avg_risk < 35:
        risk_level = "LOW"
    elif avg_risk < 65:
        risk_level = "MODERATE"
    else:
        risk_level = "HIGH"

    return {
        "results": results,
        "summary": {
            "total_images": len(results),
            "total_particles": total_particles,
            "avg_risk": avg_risk,
            "risk_level": risk_level,
            "distribution": agg_dist,
        },
    }
