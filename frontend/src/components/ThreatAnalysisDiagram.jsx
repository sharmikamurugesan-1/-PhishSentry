import React, { useState } from 'react';
import { ShieldCheck, Search, Cpu, AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function ThreatAnalysisDiagram() {
  const [activeStage, setActiveStage] = useState(1);

  const stages = [
    {
      id: 0,
      title: "1. Message Ingestion",
      tag: "Raw Communication",
      icon: Search,
      metric: "In-Memory Parsing",
      detail: "The incoming text is received in client-controlled RAM. Text strings and embedded web addresses are parsed without executing code or resolving DNS records."
    },
    {
      id: 1,
      title: "2. Signal Extraction",
      tag: "Heuristic & Structural",
      icon: Cpu,
      metric: "Multi-Signal Extraction",
      detail: "Identifies behavioral urgency hooks ('suspended', 'immediate cutoff') and cross-references extracted domain tokens against spoofed brand patterns (e.g. sbi-kyc.xyz)."
    },
    {
      id: 2,
      title: "3. ML Classification",
      tag: "TF-IDF + Logistic Regression",
      icon: ShieldCheck,
      metric: "Trained Statistical Model",
      detail: "Evaluates token n-gram vectors against trained weights. Outputs calibrated probability scores distinguishing legitimate notices from deceptive phishing templates."
    },
    {
      id: 3,
      title: "4. Actionable Verdict",
      tag: "Decision Support",
      icon: AlertTriangle,
      metric: "Clear Risk Report",
      detail: "Synthesizes ML confidence and domain syntax into an unambiguous risk classification with step-by-step guidance on how to safely respond."
    }
  ];

  return (
    <div className="w-full panel-dark p-5 sm:p-6 space-y-5 border border-[var(--border-dark)] relative overflow-hidden shadow-xl">
      {/* Visual Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[var(--border-dark)] text-xs text-[var(--color-sandalwood)]">
        <span className="font-mono tracking-wider uppercase font-semibold text-[var(--color-sandalwood-light)]">
          Threat Evaluation Pipeline
        </span>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--color-amber-muted)]">
          <span className="w-2 h-2 rounded-full bg-[var(--color-amber-muted)] animate-pulse" />
          Interactive Diagram
        </span>
      </div>

      {/* Geometric SVG Flow Pipeline */}
      <div className="relative py-2">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {stages.map((stg) => {
            const Icon = stg.icon;
            const isSelected = activeStage === stg.id;

            return (
              <button
                key={stg.id}
                type="button"
                onClick={() => setActiveStage(stg.id)}
                className={`p-3 rounded-lg border text-left transition-all cursor-pointer relative ${
                  isSelected
                    ? 'border-[var(--color-amber-muted)] bg-[var(--color-chocolate-warm)] shadow-md ring-1 ring-[var(--color-amber-muted)]'
                    : 'border-[var(--border-dark)] bg-[var(--color-chocolate-dark)]/70 hover:border-[var(--color-sandalwood)]'
                }`}
              >
                <div className="flex items-center justify-between pb-1.5">
                  <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${
                    isSelected ? 'text-[var(--color-amber-muted)]' : 'text-[var(--color-sandalwood)]'
                  }`}>
                    Stage {stg.id + 1}
                  </span>
                  <Icon size={14} className={isSelected ? 'text-[var(--color-amber-muted)]' : 'text-[var(--color-sandalwood)]'} />
                </div>
                <p className="text-xs font-bold text-[var(--color-cream)] leading-snug">
                  {stg.tag}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Stage Detail Panel */}
      <div className="p-4 rounded-lg bg-[var(--color-chocolate-dark)] border border-[var(--border-dark)] space-y-2 animate-editorial-fade">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-bold text-[var(--color-cream)] flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-amber-muted)]" />
            <span>{stages[activeStage].title}</span>
          </h4>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--color-chocolate-warm)] text-[var(--color-amber-muted)] border border-[var(--border-dark)]">
            {stages[activeStage].metric}
          </span>
        </div>
        <p className="text-xs sm:text-sm text-[var(--color-sandalwood-light)] leading-relaxed">
          {stages[activeStage].detail}
        </p>
      </div>

      {/* Reassurance Footer */}
      <div className="pt-2 border-t border-[var(--border-dark)]/60 flex items-center justify-between text-[11px] text-[var(--color-sandalwood)]">
        <span>Zero external link fetching</span>
        <span>Client RAM ephemeral processing</span>
      </div>
    </div>
  );
}
