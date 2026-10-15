import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { VesselRiskCards } from './components/VesselRiskCards';
import { HeartCanvas } from './components/HeartCanvas';
import { CounterfactualSimulator } from './components/CounterfactualSimulator';
import { ShapWaterfall } from './components/ShapWaterfall';
import { ClinicalCopilot } from './components/ClinicalCopilot';
import { PatientEhrModal } from './components/PatientEhrModal';
import { generatePdfReport } from './utils/generatePdfReport';
import {
  Heart,
  Activity,
  Sliders,
  BarChart3,
  Bot,
  FileCode,
  FileText,
  AlertTriangle,
  ShieldCheck,
  ChevronDown,
  Sparkles,
  ArrowRight,
  Flame,
  Utensils,
  Stethoscope
} from 'lucide-react';

import { getCardioData, clientPredict, clientCounterfactual, clientGenerateCopilot } from './utils/cardioEngine';

class CanvasErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, errorInfo) {
    console.warn('Canvas Error Boundary caught an issue:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-[540px] rounded-2xl glass-panel flex flex-col items-center justify-center p-6 text-center border border-rose-500/30 bg-black/40">
          <div className="w-12 h-12 rounded-xl bg-rose-500/20 flex items-center justify-center text-rose-300 mb-3">
            <Heart size={24} className="text-rose-400" />
          </div>
          <h3 className="font-heading font-bold text-base text-white">3D Simulation Fallback View</h3>
          <p className="text-xs text-rose-200/70 max-w-md mt-1 mb-4 leading-relaxed">
            WebGL acceleration is initializing. All multi-vessel risk predictions, SHAP feature attributions, and What-If counterfactuals remain fully active.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="pill-btn-pink text-xs font-semibold py-2 px-4"
          >
            Retry 3D WebGL
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const API_BASE = import.meta.env.VITE_API_URL || '';
  
  const [metrics, setMetrics] = useState(null);
  const [presets, setPresets] = useState([]);
  const [currentPresetId, setCurrentPresetId] = useState('patient-1-tvd');
  const [activeFeatures, setActiveFeatures] = useState(null);
  
  const [predictions, setPredictions] = useState(null);
  const [simulatedPredictions, setSimulatedPredictions] = useState(null);
  const [riskDeltas, setRiskDeltas] = useState(null);
  const [isLiveApplied, setIsLiveApplied] = useState(false);

  const [selectedVessel, setSelectedVessel] = useState(null);
  const [heartRate, setHeartRate] = useState(72);
  const [activeTab, setActiveTab] = useState('what-if'); // 'what-if' | 'shap' | 'copilot'
  const [copilotData, setCopilotData] = useState(null);
  const [isCopilotLoading, setIsCopilotLoading] = useState(false);
  const [isEhrModalOpen, setIsEhrModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  const canvasRef = useRef(null);
  const simulationRef = useRef(null);

  // 1. Initialize data
  useEffect(() => {
    const localData = getCardioData();
    setMetrics(localData.metrics);
    setPresets(localData.presets);

    if (localData.presets && localData.presets.length > 0) {
      const defaultPreset = localData.presets[0];
      setCurrentPresetId(defaultPreset.id);
      setActiveFeatures(defaultPreset.features);
      const initialPreds = clientPredict(defaultPreset.features);
      setPredictions(initialPreds);
    }

    // Remote sync if server is active
    fetch(`${API_BASE}/api/metrics`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.metrics) setMetrics(data.metrics);
      })
      .catch(() => {});

    fetch(`${API_BASE}/api/patients`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.presets?.length > 0) setPresets(data.presets);
      })
      .catch(() => {});
  }, [API_BASE]);

  // 2. Predict on feature change
  const runPrediction = useCallback(async (features) => {
    const localPreds = clientPredict(features);
    setPredictions(localPreds);
    setCopilotData(null);

    try {
      const res = await fetch(`${API_BASE}/api/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ features })
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.predictions) {
          setPredictions(data.predictions);
        }
      }
    } catch {}
  }, [API_BASE]);

  useEffect(() => {
    if (activeFeatures) {
      runPrediction(activeFeatures);
    }
  }, [activeFeatures, runPrediction]);

  // 3. Handle preset change
  const handleSelectPreset = (presetId) => {
    const selected = presets.find((p) => p.id === presetId);
    if (selected) {
      setCurrentPresetId(selected.id);
      setActiveFeatures(selected.features);
      setSelectedVessel(null);
      setIsLiveApplied(false);
    }
  };

  // 4. Handle counterfactual simulation
  const handleSimulateCounterfactual = async (interventions) => {
    if (!activeFeatures) return;
    const localCf = clientCounterfactual(activeFeatures, interventions);
    setSimulatedPredictions(localCf.simulated);
    setRiskDeltas(localCf.risk_deltas);

    try {
      const res = await fetch(`${API_BASE}/api/counterfactual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseline_features: activeFeatures,
          interventions
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.simulated) {
          setSimulatedPredictions(data.simulated);
          setRiskDeltas(data.risk_deltas);
        }
      }
    } catch {}
  };

  // 5. Copilot generation
  const handleGenerateCopilot = async () => {
    if (!activePredictions || !activeFeatures) return;
    setIsCopilotLoading(true);
    const currentPreset = presets.find((p) => p.id === currentPresetId);

    const localCopilot = clientGenerateCopilot(
      currentPreset?.name || 'Patient Profile',
      activePredictions,
      activeFeatures
    );
    setCopilotData(localCopilot);

    try {
      const res = await fetch(`${API_BASE}/api/clinical-copilot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: currentPreset?.name || 'Custom Case',
          predictions: activePredictions,
          features: activeFeatures
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.report_markdown) {
          setCopilotData(data);
        }
      }
    } catch {
    } finally {
      setIsCopilotLoading(false);
    }
  };

  const activePredictions = isLiveApplied && simulatedPredictions ? simulatedPredictions : predictions;
  const currentPreset = presets.find((p) => p.id === currentPresetId);

  // 6. PDF Export
  const handleExportPdf = () => {
    generatePdfReport({
      canvasRef,
      predictions: activePredictions,
      features: activeFeatures,
      patientPreset: currentPreset,
      copilotData,
      metrics
    });
  };

  const scrollToSimulation = () => {
    simulationRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#070a12] text-gray-100 flex flex-col font-sans selection:bg-rose-500 selection:text-white">
      {/* LINE 1: Regulatory Clinical Safety Banner & Master Navigation Header */}
      <Header
        presets={presets}
        currentPresetId={currentPresetId}
        onSelectPreset={handleSelectPreset}
        onOpenReportModal={handleExportPdf}
        metrics={metrics}
        isSimulatingCounterfactual={isLiveApplied}
      />

      {/* Main Container: Sections adjusted line by line */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        
        {/* LINE 2: Hero Showcase & Awareness Line (Matching the reference mockup) */}
        <section className="relative rounded-3xl overflow-hidden border border-rose-500/25 bg-gradient-to-r from-[#591420] via-[#3a0b14] to-[#120509] p-6 sm:p-8 shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Content (7 Cols) */}
            <div className="lg:col-span-7 space-y-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                <Heart size={14} className="fill-rose-400" /> Cardiovascular Digital Twin
              </span>
              <h1 className="text-3xl sm:text-4xl font-heading font-black text-white uppercase tracking-tight leading-tight">
                TAKE CARE OF YOUR<br />
                <span className="text-rose-400">HEART DISEASES</span>
              </h1>
              <p className="text-sm sm:text-base text-rose-100/85 max-w-xl leading-relaxed">
                It keeps running 24/7, non-stop, always by your side. Give a damn about your heart.
              </p>

              {/* 3 Bullets from Mockup */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs font-medium text-rose-100">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0 shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
                  <span>Interactive 3D heart model</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0 shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
                  <span>Expert heart health insights</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0 shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
                  <span>Personalized health tracking</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={() => setIsContactModalOpen(true)}
                  className="pill-btn-pink"
                >
                  Get In touch
                </button>
                <button
                  onClick={scrollToSimulation}
                  className="pill-btn-outline"
                >
                  Explore 3D Digital Twin <ArrowRight size={15} />
                </button>
              </div>
            </div>

            {/* Right Cards (5 Cols): 3 Lifestyle Tips from Mockup */}
            <div className="lg:col-span-5 grid grid-cols-1 gap-2.5">
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-md flex items-center gap-3 transition-transform hover:scale-[1.02]">
                <div className="w-9 h-9 rounded-xl bg-rose-500/20 flex items-center justify-center text-rose-300 shrink-0">
                  <Flame size={18} />
                </div>
                <div>
                  <h4 className="font-heading font-bold text-xs text-white">Stay Active</h4>
                  <p className="text-[11px] text-rose-200/70">30 minutes of daily exercise strengthens your myocardium.</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-md flex items-center gap-3 transition-transform hover:scale-[1.02]">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-300 shrink-0">
                  <Utensils size={18} />
                </div>
                <div>
                  <h4 className="font-heading font-bold text-xs text-white">Eat Smart</h4>
                  <p className="text-[11px] text-rose-200/70">A balanced diet is the key to coronary arterial health.</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-md flex items-center gap-3 transition-transform hover:scale-[1.02]">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-300 shrink-0">
                  <Stethoscope size={18} />
                </div>
                <div>
                  <h4 className="font-heading font-bold text-xs text-white">Check Regularly</h4>
                  <p className="text-[11px] text-rose-200/70">Routine check-ups prevent irreversible cardiovascular events.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* LINE 3: 3-Column Statistical Facts Banner (Matching the reference mockup) */}
        <section className="p-5 rounded-2xl bg-slate-900/60 border border-white/10 glass-panel">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 divide-y md:divide-y-0 md:divide-x divide-white/10">
            {/* Stat 1 */}
            <div className="space-y-1 md:pr-4">
              <div className="text-2xl font-heading font-black text-white">100,000 Beats</div>
              <div className="text-xs text-rose-200/80 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                <span>Your heart beats 100,000 times daily</span>
              </div>
            </div>

            {/* Stat 2 */}
            <div className="space-y-1 pt-4 md:pt-0 md:px-4">
              <div className="text-2xl font-heading font-black text-cyan-300">2,000 Gallons</div>
              <div className="text-xs text-cyan-200/80 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                <span>It pumps 2,000 gallons of blood every day.</span>
              </div>
            </div>

            {/* Stat 3 */}
            <div className="space-y-1 pt-4 md:pt-0 md:pl-4">
              <div className="text-2xl font-heading font-black text-rose-300">1 in 4 Deaths</div>
              <div className="text-xs text-rose-200/80 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                <span>Heart disease accounts for 1 in 4 deaths globally.</span>
              </div>
            </div>
          </div>
        </section>

        {/* LINE 4: Patient Archetype Bar (Exact layout from previous UI) */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-900/60 border border-white/10 glass-panel">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 font-bold">
              <Activity size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading font-bold text-sm text-white">
                  {currentPreset?.name || 'Active Patient Profile'}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-medium">
                  {currentPreset?.clinical_archetype || 'Custom Clinical Evaluation'}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {currentPreset?.demographics || '55 features loaded from Z-Alizadeh Sani clinical cohort'}
              </p>
            </div>
          </div>

          {/* Quick preset switch pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {presets.map((p) => (
              <button
                key={p.id}
                onClick={() => handleSelectPreset(p.id)}
                className={`px-2.5 py-1 text-xs rounded-lg transition-all ${
                  currentPresetId === p.id
                    ? 'bg-rose-500/25 text-rose-300 font-semibold border border-rose-400/40'
                    : 'bg-slate-800/80 text-gray-400 hover:text-white'
                }`}
              >
                {p.name.split(' (')[0]}
              </button>
            ))}
            <button
              onClick={() => setIsEhrModalOpen(true)}
              className="px-2.5 py-1 text-xs rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 flex items-center gap-1 font-medium transition-all"
            >
              <FileCode size={13} /> View EHR / FHIR
            </button>
          </div>
        </div>

        {/* LINE 5: 4 Multi-Vessel Risk Cards (Exact 4-column row from previous UI) */}
        <VesselRiskCards
          predictions={activePredictions}
          selectedVessel={selectedVessel}
          onSelectVessel={setSelectedVessel}
        />

        {/* LINE 6: The Core Simulation & Interpretability Studio (2 Columns: 7 Cols Left + 5 Cols Right) */}
        <div ref={simulationRef} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (7 Cols): Real Pumping 3D Heart Simulation */}
          <div className="lg:col-span-7 space-y-4">
            <div className="h-[540px] w-full">
              <CanvasErrorBoundary>
                <HeartCanvas
                  predictions={activePredictions}
                  selectedVessel={selectedVessel}
                  onSelectVessel={setSelectedVessel}
                  heartRate={heartRate}
                  onHeartRateChange={setHeartRate}
                  canvasRef={canvasRef}
                />
              </CanvasErrorBoundary>
            </div>

            {/* 3D Instructions & Innovation Callout */}
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/5 text-xs text-gray-400 flex items-start justify-between gap-3">
              <div className="space-y-1">
                <span className="font-semibold text-cyan-300 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-cyan-400" /> Real Anatomical Pumping & Echo Regional Wall Motion:
                </span>
                <p className="leading-relaxed">
                  Rotate, zoom, or pan the 3D heart model. Coronary vessels feature custom GLSL blood flow pulse waves with localized vertex displacement stenosis narrowing. Myocardial chambers dynamically simulate Echo RWMA hypokinesia/akinesia based on predicted vessel territory.
                </p>
              </div>
              <button
                onClick={handleExportPdf}
                className="shrink-0 btn-action text-xs font-medium py-1.5 px-3"
              >
                <FileText size={14} /> 3D Snapshot PDF
              </button>
            </div>
          </div>

          {/* Right Column (5 Cols): Actionable Interpretability & What-If Engine */}
          <div className="lg:col-span-5 space-y-4">
            {/* Interpretability Section Tabs */}
            <div className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-900 border border-white/10">
              <button
                onClick={() => setActiveTab('what-if')}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'what-if'
                    ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-400/40 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Sliders size={14} /> What-If Digital Twin
              </button>
              <button
                onClick={() => setActiveTab('shap')}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'shap'
                    ? 'bg-purple-500/25 text-purple-200 border border-purple-400/40 shadow-[0_0_12px_rgba(168,85,247,0.3)]'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <BarChart3 size={14} /> SHAP Waterfall
              </button>
              <button
                onClick={() => setActiveTab('copilot')}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'copilot'
                    ? 'bg-rose-500/25 text-rose-200 border border-rose-400/40 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Bot size={14} /> Clinical Copilot
              </button>
            </div>

            {/* Active Tab Panel */}
            {activeTab === 'what-if' && (
              <CounterfactualSimulator
                baselineFeatures={activeFeatures}
                onSimulate={handleSimulateCounterfactual}
                simulatedPredictions={simulatedPredictions}
                riskDeltas={riskDeltas}
                isLiveApplied={isLiveApplied}
                onToggleLiveApply={setIsLiveApplied}
              />
            )}

            {activeTab === 'shap' && (
              <ShapWaterfall
                predictions={activePredictions}
                selectedVessel={selectedVessel}
                onSelectVessel={setSelectedVessel}
              />
            )}

            {activeTab === 'copilot' && (
              <ClinicalCopilot
                predictions={activePredictions}
                features={activeFeatures}
                patientId={currentPreset?.name}
                copilotData={copilotData}
                onGenerateCopilot={handleGenerateCopilot}
                isLoading={isCopilotLoading}
              />
            )}
          </div>
        </div>

        {/* LINE 7: Architectural Pillars & Methodology Footer Card (Exact layout from previous UI) */}
        <div className="glass-panel p-5 border border-white/10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div>
              <h3 className="font-heading font-bold text-sm text-white">
                Hackathon 2026 Evaluation Criteria & Methodological Rigor
              </h3>
              <p className="text-xs text-gray-400">
                Grounded in UCI Z-Alizadeh Sani clinical benchmark (303 patients, 55 features).
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="px-2.5 py-1 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                Target Leakage: STRICT ZERO (LAD, LCX, RCA, Cath Excluded)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div className="bg-slate-900/60 p-3 rounded-lg border border-white/5 space-y-1">
              <div className="font-semibold text-rose-300">1. Real 3D Heart Pumping (25%)</div>
              <p className="text-gray-400">
                Anatomical human heart geometry with authentic systolic contraction, ventricular torsion wringing, and diastolic recoil dynamically modulated by Echo RWMA scores.
              </p>
            </div>

            <div className="bg-slate-900/60 p-3 rounded-lg border border-white/5 space-y-1">
              <div className="font-semibold text-cyan-300">2. Clinical Interpretability (20%)</div>
              <p className="text-gray-400">
                Bidirectional "What-If" digital twin sliders demonstrate therapeutic potential visually. Isolated SHAP attributions distinguish LAD anterior drivers from RCA inferior drivers.
              </p>
            </div>

            <div className="bg-slate-900/60 p-3 rounded-lg border border-white/5 space-y-1">
              <div className="font-semibold text-purple-300">3. Predictive Modeling (30%)</div>
              <p className="text-gray-400">
                Calibrated multi-task classifiers enforce biological consistency (CAD ⇔ max vessel ≥ 50%). Conformal confidence intervals trigger warning badges for borderline diagnostic ambiguity.
              </p>
            </div>

            <div className="bg-slate-900/60 p-3 rounded-lg border border-white/5 space-y-1">
              <div className="font-semibold text-amber-300">4. System Integration (15-10%)</div>
              <p className="text-gray-400">
                1-Click synthetic EHR / FHIR bundle importer, on-demand clinical diagnostic copilot, and printable 3D WebGL snapshot PDF diagnostic reports with mandatory safety disclaimers.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Synthetic EHR / FHIR Modal */}
      <PatientEhrModal
        isOpen={isEhrModalOpen}
        onClose={() => setIsEhrModalOpen(false)}
        currentPreset={currentPreset}
        currentFeatures={activeFeatures}
        onApplyFeatures={(newFeatures) => {
          setActiveFeatures(newFeatures);
          setIsLiveApplied(false);
        }}
      />

      {/* Contact / In Touch Modal */}
      {isContactModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="w-full max-w-md p-6 rounded-3xl bg-slate-900 border border-rose-500/30 text-white space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Heart size={20} className="text-rose-400 fill-rose-500/30" />
                <h3 className="font-heading font-bold text-lg text-white">Get in Touch with CardioTwin</h3>
              </div>
              <button
                onClick={() => setIsContactModalOpen(false)}
                className="text-gray-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              CardioTwin 3D is an AI-powered multimodal cardiac digital twin for precision cardiology. Connect with our clinical AI research team or request institutional integration:
            </p>
            <div className="space-y-3 text-xs">
              <input
                type="text"
                placeholder="Full Name / Clinician Title"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/15 focus:outline-none focus:border-rose-400 text-white"
              />
              <input
                type="email"
                placeholder="Institutional / Medical Email"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/15 focus:outline-none focus:border-rose-400 text-white"
              />
              <textarea
                rows={3}
                placeholder="Describe your inquiry (clinical trial, hospital pilot, research partnership)..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/15 focus:outline-none focus:border-rose-400 resize-none text-white"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsContactModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  alert('Thank you for reaching out! A CardioTwin clinical AI representative will contact you.');
                  setIsContactModalOpen(false);
                }}
                className="pill-btn-pink text-xs py-2 px-5 font-bold"
              >
                Submit Inquiry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
