import React, { useState } from 'react';
import { X, Upload, Download, FileCode, Check, AlertCircle, RefreshCw } from 'lucide-react';

export function PatientEhrModal({
  isOpen,
  onClose,
  currentPreset,
  currentFeatures,
  onApplyFeatures
}) {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState('fhir');
  const [jsonInput, setJsonInput] = useState(() => {
    return JSON.stringify({
      resourceType: "Bundle",
      type: "collection",
      entry: [
        {
          resource: currentPreset?.fhir_summary || {
            resourceType: "Patient",
            id: currentPreset?.id || "CAD-EHR-001",
            condition: "Coronary Artery Disease Risk Assessment"
          }
        },
        {
          resource: {
            resourceType: "Observation",
            category: "vital-signs",
            bloodPressure: currentFeatures?.BP,
            heartRate: currentFeatures?.PR,
            bmi: currentFeatures?.BMI,
            ldl: currentFeatures?.LDL,
            hdl: currentFeatures?.HDL,
            ejectionFraction: currentFeatures?.['EF-TTE'],
            echoRWMA: currentFeatures?.['Region RWMA']
          }
        }
      ]
    }, null, 2);
  });

  const [jsonError, setJsonError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const handleApplyJson = () => {
    try {
      setJsonError(null);
      const parsed = JSON.parse(jsonInput);
      let extractedFeatures = {};
      
      // Look for features object directly or in bundle
      if (parsed.features) {
        extractedFeatures = parsed.features;
      } else if (parsed.entry) {
        parsed.entry.forEach((entry) => {
          if (entry.resource?.resourceType === 'Observation') {
            const obs = entry.resource;
            if (obs.bloodPressure) extractedFeatures.BP = obs.bloodPressure;
            if (obs.heartRate) extractedFeatures.PR = obs.heartRate;
            if (obs.ldl) extractedFeatures.LDL = obs.ldl;
            if (obs.hdl) extractedFeatures.HDL = obs.hdl;
            if (obs.ejectionFraction) extractedFeatures['EF-TTE'] = obs.ejectionFraction;
            if (obs.echoRWMA) extractedFeatures['Region RWMA'] = obs.echoRWMA;
          }
        });
      } else {
        extractedFeatures = parsed;
      }

      onApplyFeatures(extractedFeatures);
      setSuccessMsg('Synthetic EHR profile imported successfully!');
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 1200);
    } catch (err) {
      setJsonError('Invalid JSON format: ' + err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-3xl glass-panel-glow border border-cyan-500/40 p-6 text-white shadow-2xl relative max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300">
              <FileCode size={18} />
            </div>
            <div>
              <h3 className="font-heading font-bold text-lg text-white">
                FHIR / Synthetic EHR Importer
              </h3>
              <p className="text-xs text-gray-400">
                Inspect, import, or upload standardized FHIR patient records and clinical feature payloads.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Tabs */}
        <div className="flex items-center gap-2 mt-4 mb-3 border-b border-white/10 pb-2">
          <button
            onClick={() => setActiveTab('fhir')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'fhir'
                ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-400/40'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            FHIR JSON Bundle
          </button>
          <button
            onClick={() => setActiveTab('features')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'features'
                ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-400/40'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Active 55 Features Dictionary
          </button>
        </div>

        {/* JSON Editor / Viewer */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeTab === 'fhir' ? (
            <textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              className="flex-1 w-full p-4 rounded-xl bg-slate-950 font-mono text-xs text-cyan-200 border border-white/10 focus:outline-none focus:ring-1 focus:ring-cyan-400 resize-none overflow-y-auto leading-relaxed"
              rows={16}
            />
          ) : (
            <div className="flex-1 p-4 rounded-xl bg-slate-950 border border-white/10 overflow-y-auto max-h-96">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono">
                {Object.entries(currentFeatures || {}).map(([key, val]) => (
                  <div key={key} className="p-2 rounded bg-slate-900 border border-white/5 flex justify-between">
                    <span className="text-gray-400 truncate mr-2">{key}:</span>
                    <span className="text-cyan-300 font-bold">{val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Feedback message */}
        {jsonError && (
          <div className="mt-3 p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle size={15} />
            <span>{jsonError}</span>
          </div>
        )}
        {successMsg && (
          <div className="mt-3 p-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <Check size={15} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-4 border-t border-white/10 mt-3">
          <span className="text-[11px] text-gray-400 font-mono">
            Compliant with HL7 FHIR Release 4 & Z-Alizadeh Sani Schema
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApplyJson}
              className="btn-action text-xs font-semibold"
            >
              <Upload size={14} /> Import & Recalculate
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
