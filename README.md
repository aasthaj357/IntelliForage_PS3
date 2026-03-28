#IntelliForage

---

# 🔬 MicroLens — Microplastic Detection & Risk Analysis System

---

## 📌 Problem Statement (PS3)

### **Microplastic Morphology Classifier**

**Theme:** Marine Ecosystem Protection & Water Quality Monitoring

Microplastics (<5mm) are widespread in oceans, rivers, and drinking water. Traditional detection methods like FTIR are:

* Expensive
* Lab-dependent
* Not scalable

👉 More importantly, **environmental impact depends on morphology**:

* **Fibers** → entangle organisms
* **Fragments** → release toxins
* **Films** → smother ecosystems

Without automated classification, **ecological risk cannot be assessed at scale**.

---

## 🎯 Objective

Build a system that:

* Detects microplastics from images
* Classifies morphology
* Estimates particle size
* Computes an **Ecological Threat Index (0–100)**

---

## 🚀 Overview

**MicroLens** is a full-stack AI system that transforms microscope images into **actionable environmental insights**.

It:

* Detects microplastics using YOLOv8
* Classifies them into morphology categories
* Computes ecological risk scores
* Provides analytics dashboards & reports
* Supports **single + batch image processing**

---

## 🌟 Unique Selling Points (USP)

* 🧠 Morphology-based **risk intelligence** (not just detection)
* ⚡ Real-time, field-ready system (no lab dependency)
* 🎯 High accuracy (~96%) with YOLOv8
* 📊 End-to-end pipeline (Detection → Analytics → Report)
* 📦 Batch processing for scalability
* ⚠️ Intelligent ecological risk scoring
* 🌐 Full-stack deployable system
* 🔬 Scientifically aligned (size + morphology analysis)

---

## 🎯 Key Features

* 🔍 **YOLOv8 Detection**

  * Classes: `Fiber`, `Fragment`, `Film`, `Pellet`

* 📦 **Batch Processing**

  * Multi-image upload
  * Aggregated insights

* 📊 **Analytics Dashboard**

  * Particle distribution (bar + pie charts)
  * Risk visualization

* ⚠️ **Risk Scoring System**

  * Based on type, size, confidence

* 📄 **Report Generation**

  * Summary + detailed output

* 🌐 **Full Stack Integration**

  * FastAPI + Node.js + Frontend

---

## 📂 Repository Structure

```bash
synapse_clean/
│
├── synapse_frontend/
│   ├── public/
│   │   ├── index.html
│   │   ├── script.js
│   │   └── style.css
│   │
│   ├── server.js
│   ├── api.py
│   ├── requirements.txt
│   ├── data.yaml
│   ├── train.ipynb
```

---

## 📊 Dataset & Preprocessing ✅

### 📁 Dataset

* Custom + public microplastic datasets
* Annotated in YOLO format

**Classes:**

* Fiber
* Fragment
* Film
* Pellet

---

### 🧹 Preprocessing

* Image resizing → **640×640**

* Bounding box normalization

* Data augmentation:

  * Flip
  * Rotation
  * Brightness/contrast

* Dataset split:

  * Training
  * Validation
  * Testing

---

### 💡 Why This Matters

* Improves robustness
* Handles real-world variations
* Enhances small object detection

---

## 🤖 Model & Performance ✅

### 🧠 Model: **YOLOv8 (Ultralytics)**

---

### ⚙️ Why YOLOv8?

* Real-time detection
* High small-object accuracy
* Multi-object detection
* Efficient & scalable

---

### 🔍 Comparison

| Model        | Limitation      |
| ------------ | --------------- |
| CNN          | No localization |
| Faster R-CNN | Slow            |
| SSD          | Lower accuracy  |
| YOLOv8       | ✅ Best balance  |

---

### 📈 Performance Metrics

| Metric       | Value   |
| ------------ | ------- |
| Accuracy     | ~96%    |
| Precision    | 85–92%  |
| Recall       | 80–88%  |
| mAP@0.5      | ~87%    |
| mAP@0.5:0.95 | ~65–75% |

---

### 📌 Metric Meaning

* **Precision** → Correct detections
* **Recall** → Coverage of actual particles
* **mAP** → Overall performance

---

## 🧠 System Architecture

```text
Frontend (HTML/CSS/JS)
        ↓
Node.js (Express)
        ↓
FastAPI Backend
        ↓
YOLOv8 Model
        ↓
Detection + Risk Engine
        ↓
Analytics + Reports
```

---

## 🧪 Detection Pipeline

1. User uploads image(s)

2. Node.js forwards request

3. FastAPI processes input

4. YOLOv8 detects particles

5. Extract:

   * Bounding boxes
   * Labels
   * Confidence

6. Risk score computed

7. Batch aggregation

8. Results sent to frontend

9. Dashboard + report generated

---

## ⚠️ Risk Analysis System

Risk score is based on:

* **Particle Type**

  * Fiber > Fragment > Film > Pellet

* **Particle Size**

  * Smaller → Higher risk

* **Confidence Score**

---

### 📊 Output

* Total particle count
* Type distribution
* Average risk score
* Risk Level:

  * LOW
  * MODERATE
  * HIGH

---

## 📊 Sample Output

**Detection:**

* Fiber (0.95)
* Pellet (0.84)
* Fragment (0.79)

**Analytics:**

* Total Particles: 12
* Risk Score: 83 (HIGH)

---

## 🏗️ Design Decisions

### 🔍 Why Object Detection?

* Classification → only presence
* Detection → location + type + count

✔ Required for environmental analysis

---

### 🌐 Why Full Stack?

* Real-world usability
* Scalable architecture
* Interactive UI

---

## 🚀 How to Run

### Backend

```bash
cd synapse_frontend
pip install -r requirements.txt
uvicorn api:app --reload --port 5050
```

---

### Frontend

```bash
npm install
node server.js
```

---

### Open App

```
http://localhost:3000
```

---

## ⚠️ Limitations

* Dataset-dependent performance
* Very small/blurred particles may be missed
* Requires similar imaging conditions

---

## 🔮 Future Improvements

* Real-time video detection
* Cloud deployment (AWS/GCP)
* Mobile app integration
* Larger dataset training

---

## 💼 Business Potential

* Target Users:

  * Environmental agencies
  * Research labs
  * NGOs

* Revenue Model:

  * SaaS subscription
  * API access
  * Institutional licensing

---

## 👩‍💻 Team Details

* **Team Name:** IntelliForage
* **Problem Statement:** PS3

**Members:**

* Aastha Jadhav
* Siddhi Agrawal
* Anushree Chatur

---

## 🌍 Impact

MicroLens enables:

* Faster environmental monitoring
* Data-driven policy decisions
* Scalable scientific analysis

---

# 🏁 Final Statement

**MicroLens transforms microscopic data into actionable environmental intelligence.**

---


