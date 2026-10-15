# CardioTwin 3D: Multimodal AI Cardiovascular Risk & Hemodynamic Digital Twin
### Track A: Cardiovascular Risk Visualization & Prediction • Multimodal AI Hackathon 2026

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fpriyanshu-sarjan%2FFull-Stack-3D-Cardiac-ML-Multimodal.git)
[![Python 3.11](https://img.shields.io/badge/Python-3.11-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg)](https://fastapi.tiangolo.com/)
[![React 19](https://img.shields.io/badge/Frontend-React_19-61dafb.svg)](https://react.dev/)
[![Three.js / R3F](https://img.shields.io/badge/3D-Three.js_%26_R3F-black.svg)](https://docs.pmnd.rs/react-three-fiber/)
[![Dataset](https://img.shields.io/badge/Dataset-UCI_Z--Alizadeh_Sani_%23411-orange.svg)](https://archive.ics.uci.edu/dataset/411/extention+of+z+alizadeh+sani+dataset)
[![CAD ROC-AUC](https://img.shields.io/badge/CAD_5--Fold_ROC--AUC-0.9035-success.svg)](#-predictive-modeling--validation-performance)
[![Zero Target Leakage](https://img.shields.io/badge/Target_Leakage-STRICT_ZERO-emerald.svg)](#-target-leakage-prevention-audit)

---

## 🫀 Executive Summary

Cardiovascular Disease (CVD) remains the leading cause of death worldwide. While traditional tabular statistical models output abstract risk percentages, raw numbers fail to give clinicians or patients an intuitive understanding of **where, how, and why** coronary arterial pathology develops inside the body.

**CardioTwin 3D** bridges the critical gap between tabular clinical machine learning and interactive 3D simulation by focusing on **clinical relevance, dynamic 3D hemodynamics, and actionable interpretability**:
* **Dynamic Hemodynamic Flow Simulation (Shader-Based)**: Replaces static color-coding with custom GLSL vertex and fragment pulse shaders that modulate flow velocity, turbulence, and localized vertex displacement luminal narrowing based on predicted vessel stenosis.
* **Correlated Myocardial Wall Motion (Integrating Echo Findings)**: Maps predicted stenosis and echocardiographic Regional Wall Motion Abnormalities (`Region RWMA`) to myocardial territories (LAD $\leftrightarrow$ Anterior Wall/Septum; RCA $\leftrightarrow$ Inferior Wall; LCX $\leftrightarrow$ Lateral Wall) to dynamically simulate **hypokinesia** and **akinesia** (ischemic pump impairment).
* **Actionable "What-If" Counterfactual Simulator ("Digital Twin" Mode)**: Interactive modifiable factor sliders (BP, LDL, FBS, Smoking, TG, Weight) demonstrate real-time therapeutic risk reduction live on the 3D beating heart.
* **Vessel-Specific Feature Attribution Mapping (SHAP)**: Isolated multivariable decomposition explaining why the **LAD** was specifically flagged (e.g., anterior ST elevation, anterior RWMA) vs. the **RCA** (inferior lead changes, conduction blocks).
* **Calibrated Conformal Uncertainty**: Calibrated confidence intervals (e.g., `87.3% ± 7.9%`) and automated borderline diagnostic warning badges.
* **Exportable 3D Clinical PDF Diagnostic Report**: Captures WebGL canvas snapshots from the culprit lesion angle, compiled alongside SHAP waterfalls and mandatory clinical disclaimers.

---

## 🚀 Key Innovations Across Evaluation Pillars

### 1. 3D Visualization: Beyond Static Color-Coding (25% Weight)
* **Custom GLSL Pulsating Flow Shader (`CoronaryPulseShader.js`)**:
  * Real-time systolic wave velocity dynamically modulated by stenosis probability ($v = 4.2\text{ cm/s}$ laminar down to $1.0\text{ cm/s}$ sluggish/turbulent).
  * Lesion-specific vertex displacement narrows vessel caliber at the stenosis site.
  * Downstream ischemic tissue discoloration (cyanotic deoxygenated tissue hues).
* **Correlated Myocardial Wall Motion (`Heart3DModel.jsx`)**:
  * Couples predicted vessel stenosis with echocardiographic findings (`Region RWMA`).
  * Normal territory maintains full systolic pump amplitude; high stenosis or RWMA triggers localized **hypokinesia** or **akinesia** (anterior/septal, inferior, or lateral).
* **Interactive 3-Layer Anatomical Peeling**:
  * **Layer 1 (Thoracic Context):** Translucent holographic ribcage and thoracic silhouette (`ThoraxContext.jsx`).
  * **Layer 2 (Epicardial Flow):** Full 3D heart with segmented myocardial chambers and glowing coronary arteries (`CoronaryVessels.jsx`).
  * **Layer 3 (Lumen Plaque):** Intravascular cross-section view showing tunica adventitia, smooth muscle media, lipid atheroma core, calcification nodules, and minimum lumen diameter (`LumenCrossSection.jsx`).

### 2. Clinical Interpretability: Actionable "What-If" Engine (20% Weight)
* **Real-Time Digital Twin Simulator (`CounterfactualSimulator.jsx`)**:
  * Sliders for Blood Pressure, LDL, Fasting Sugar, Triglycerides, HDL, Smoking, Weight.
  * Instant recalculation of risk reduction delta applied live to the 3D heart.
  * **"1-Click GDMT Target"**: Instantly applies AHA/ACC Guideline-Directed Medical Therapy targets with immediate feedback (e.g., $-28.4\%$ CAD Risk Reduction).
* **Vessel-Specific Feature Attribution Mapping (`ShapWaterfall.jsx`)**:
  * Isolated decomposition for CAD, LAD, LCX, and RCA explaining *why* LAD was flagged (anterior ST changes, anterior RWMA) vs. RCA (inferior lead changes, conduction blocks).
* **Clinician Diagnostic Copilot (`ClinicalCopilot.jsx`)**:
  * Automated diagnostic summary, hemodynamic status assessment, and recommended imaging (CCTA vs Invasive Coronary Angiography).

### 3. Predictive Modeling: Domain-Aware Architecture (30% Weight)
* **Multi-Task Calibrated Machine Learning Pipeline (`backend/ml_pipeline.py`)**:
  * Joint classification of overall CAD and target vessel stenosis: LAD, LCX, and RCA.
  * Enforces **Biological Consistency**: $CAD \iff \max(LAD, LCX, RCA) \ge 50\%$.
  * **Calibrated Conformal Uncertainty**: Platt scaling with confidence intervals and borderline diagnostic badges.
* **Target Leakage Prevention Audit**:
  * `Cath`, `LAD`, `LCX`, and `RCA` are strictly excluded from model feature inputs.

### 4. Implementation & System Integration (15-10% Weight)
* **FHIR / Synthetic EHR Importer (`PatientEhrModal.jsx`)**:
  * 5 Pre-configured clinical edge-case archetypes (Triple Vessel Disease, Isolated LAD "Widowmaker", Isolated RCA Stenosis, Normal Control, Borderline Uncertainty).
  * Direct FHIR Release 4 JSON bundle import and inspection.
* **Exportable 3D Clinical PDF Report (`generatePdfReport.js`)**:
  * Captures high-res WebGL canvas snapshot of the 3D heart from the culprit lesion angle.
  * Formatted alongside SHAP waterfalls, vitals, confidence intervals, and mandatory clinical disclaimers.
* **Zero-Downtime Vercel Hybrid Architecture**:
  * Embedded client-side `CardioEngine` ensures instant rendering, offline resilience, and zero build failures on Vercel edge deployment.

---

## 📈 Predictive Modeling & Validation Performance

Evaluated using **Stratified 5-Fold Cross-Validation** on the **UCI Extension of Z-Alizadeh Sani Dataset** (303 records, 55 features):

| Target Variable | Anatomical Territory | 5-Fold ROC-AUC | Accuracy | F1-Score | Precision | Recall |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Overall CAD** | Global Coronary Arteries | **0.9035 ± 0.045** | **84.5%** | **0.895** | **86.8%** | **92.6%** |
| **LAD** | Anterior Myocardium & Septum | **0.8367 ± 0.049** | **78.9%** | **0.825** | **80.0%** | **85.3%** |
| **LCX** | Lateral Ventricular Wall | **0.7331 ± 0.053** | **70.0%** | **0.580** | **64.5%** | **52.9%** |
| **RCA** | Inferior & Diaphragmatic Wall | **0.7101 ± 0.049** | **68.6%** | **0.532** | **61.8%** | **48.3%** |

---

## 🏗️ Architecture & Repository Structure

```
Full-Stack-3D-Cardiac-ML-Multimodal/
├── backend/                        # FastAPI Machine Learning Service
│   ├── main.py                     # REST API (Inference, Counterfactuals, Copilot)
│   ├── ml_pipeline.py              # 5-Fold CV training, calibration & SHAP
│   ├── requirements.txt            # Python dependencies
│   └── models/                     # Saved artifacts (pkl, metrics, presets, SHAP)
│       ├── model_artifacts.pkl
│       ├── metrics.json
│       ├── presets.json
│       └── feature_importances.json
├── data/                           # UCI Z-Alizadeh Sani Dataset #411
│   └── extention of Z-Alizadeh sani dataset.xlsx
├── frontend/                       # React 19 + Vite + Three.js / R3F
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── vercel.json                 # Vercel SPA routing configuration
│   ├── public/
│   │   └── models/
│   │       └── heart.glb           # High-resolution anatomical 3D human heart
│   └── src/
│       ├── App.jsx                 # Luxury Crimson/Wine UI & master application controller
│       ├── index.css               # Design system, glassmorphic tokens & leader lines
│       ├── components/
│       │   ├── HeartCanvas.jsx     # Three.js 3D WebGL viewport, leader lines & floating badges
│       │   ├── Heart3DModel.jsx    # Real 3D heart pumping, ventricular torsion & Echo RWMA
│       │   ├── CoronaryVessels.jsx # LAD, LCX, RCA tube branches with pulse shaders
│       │   ├── CoronaryPulseShader.js # Custom GLSL flow velocity & narrowing shader
│       │   ├── ThoraxContext.jsx   # Layer 1 holographic ribcage & sternum
│       │   ├── LumenCrossSection.jsx # Layer 3 intravascular plaque cross-section
│       │   ├── VesselRiskCards.jsx # Multi-vessel risk gauges & calibrated CI
│       │   ├── CounterfactualSimulator.jsx # Digital Twin What-If sliders & GDMT
│       │   ├── ShapWaterfall.jsx   # Vessel-isolated SHAP attribution bars
│       │   ├── ClinicalCopilot.jsx # AI structured diagnostic report generator
│       │   ├── Header.jsx          # Branding, safety banner, preset selector
│       │   └── PatientEhrModal.jsx # FHIR bundle viewer & feature editor
│       ├── utils/
│       │   ├── cardioEngine.js     # Embedded client-side deterministic inference engine
│       │   └── generatePdfReport.js # 3D WebGL snapshot PDF export utility
│       └── data/
│           └── cardioData.json     # Precomputed model weights, presets & SHAP
├── package.json                    # Root monorepo configuration
├── vercel.json                     # Root Vercel deployment specification
└── README.md                       # Comprehensive documentation
```

---

## ⚡ Quickstart & Deployment Guide

### Option A: 1-Click Deploy on Vercel
1. Fork or push this repository to GitHub.
2. Import the repository in [Vercel](https://vercel.com).
3. Vercel automatically detects `vercel.json` and builds `frontend/dist`.
4. The application includes the embedded **CardioEngine**, guaranteeing **100% operational functionality with zero external runtime dependencies**.
*(Optional: If running the FastAPI backend on Railway / Render / Fly.io, set `VITE_API_URL=https://your-backend.railway.app` in Vercel Environment Variables).*

---

### Option B: Local Development

#### 1. Clone the repository
```bash
git clone https://github.com/priyanshu-sarjan/Full-Stack-3D-Cardiac-ML-Multimodal.git
cd Full-Stack-3D-Cardiac-ML-Multimodal
```

#### 2. Backend Setup (FastAPI + Python 3.11)
```bash
# Create and activate virtual environment
python -m venv backend_venv
# Windows:
backend_venv\Scripts\activate
# Linux/macOS:
source backend_venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# (Optional) Retrain models and recompute SHAP
python backend/ml_pipeline.py

# Launch FastAPI server
uvicorn backend.main:app --host 127.0.0.1 --port 8000
```
Backend API will be live at `http://127.0.0.1:8000`. Interactive OpenAPI documentation: `http://127.0.0.1:8000/docs`.

#### 3. Frontend Setup (React + Vite + Three.js)
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 🛡️ Clinical Safety Disclaimer
**CardioTwin 3D is an investigational decision-support and educational simulation tool grounded in multimodal machine learning. This software is NOT a substitute for formal diagnostic coronary angiography, invasive hemodynamic assessment, or independent clinical physician judgment. All risk estimates are calibrated statistical approximations for educational research.**

---

## 👥 Authors & Acknowledgments
* **Developer:** Priyanshu Sarjan
* **Hackathon:** Multimodal AI Hackathon 2026 — Track A (Cardiovascular Risk Visualization & Prediction)
* **Dataset Reference:** Extension of Z-Alizadeh Sani Dataset, UCI Machine Learning Repository (Dataset ID: 411).
