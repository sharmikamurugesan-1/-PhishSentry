import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  AlertTriangle, 
  ShieldAlert, 
  Copy, 
  Check, 
  RotateCcw, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  Lock, 
  Layers 
} from 'lucide-react';
import { COPY } from '../copy';
import EvidenceExplorer from '../components/EvidenceExplorer';

export default function ResultScreen({ resultData }) {
  const location = useLocation();
  const navigate = useNavigate();

  const currentResult = location.state?.result || resultData?.result || {
    verdict: 'not_sure',
    severity_level: 'medium',
    model_score: 0.50,
    model_type: 'Model check',
    reason: 'No message content provided to check.',
    noticed: [],
    todo: ['Go to the check screen and paste a message to see if it is safe.'],
    links: []
  };

  const originalText = location.state?.originalText || resultData?.originalText || '';

  const [copied, setCopied] = useState(false);
  const [isEvidenceOpen, setIsEvidenceOpen] = useState(true);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  const verdict = currentResult.verdict || 'not_sure';
  const severityLevel = currentResult.severity_level || (verdict === 'likely_scam' ? 'critical' : verdict === 'not_sure' ? 'medium' : 'low');

  const getVerdictTheme = () => {
    switch (verdict) {
      case 'likely_scam':
        return {
          icon: ShieldAlert,
          bgClass: 'bg-[var(--result-danger-bg)] border-[var(--result-danger-border)]',
          badgeText: 'Likely a Scam',
          badgeClass: 'bg-[var(--result-danger-border)]/40 text-[var(--result-danger-text)] border border-[var(--result-danger-border)]',
          titleColor: 'text-[var(--result-danger-text)]',
          accent: 'text-[var(--result-danger-text)]'
        };
      case 'not_sure':
        return {
          icon: AlertTriangle,
          bgClass: 'bg-[var(--result-caution-bg)] border-[var(--result-caution-border)]',
          badgeText: 'Needs Caution',
          badgeClass: 'bg-[var(--result-caution-border)]/40 text-[var(--result-caution-text)] border border-[var(--result-caution-border)]',
          titleColor: 'text-[var(--result-caution-text)]',
          accent: 'text-[var(--result-caution-text)]'
        };
      case 'no_signs':
      default:
        return {
          icon: ShieldCheck,
          bgClass: 'bg-[var(--result-safe-bg)] border-[var(--result-safe-border)]',
          badgeText: 'Looks Safe',
          badgeClass: 'bg-[var(--result-safe-border)]/40 text-[var(--result-safe-text)] border border-[var(--result-safe-border)]',
          titleColor: 'text-[var(--result-safe-text)]',
          accent: 'text-[var(--result-safe-text)]'
        };
    }
  };

  const vTheme = getVerdictTheme();
  const IconComp = vTheme.icon;

  const handleCopySummary = async () => {
    try {
      const summaryText = `PhishShift Security Check Result
Verdict: ${vTheme.badgeText}
Why: ${currentResult.reason}
What to do:
${(currentResult.todo || []).map((t) => `• ${t}`).join('\n')}
Safe Link Inspection: Processed strictly as text, zero external calls.
Checked securely at https://phishsentry.onrender.com`;

      await navigator.clipboard.writeText(summaryText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  const totalWarnings = (currentResult.noticed?.length || 0) + (currentResult.links?.length || 0);

  return (
    <div className="py-8 sm:py-12 min-h-screen bg-[var(--color-bg)] text-left overflow-y-visible">
      <div className="content-container max-w-4xl space-y-8">
        
        {/* Step Indicator Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4 text-[13px] text-[var(--color-text-muted)]">
          <span className="flex items-center gap-1.5 font-normal">
            <Lock size={12} className="text-[var(--color-accent)]" />
            <span>Check Complete</span>
          </span>
          <span className="text-[13px]">
            We don't save your messages.
          </span>
        </div>

        {/* 1. THE VERDICT: One clear, prominent conclusion */}
        <div className={`p-6 sm:p-8 rounded-xl border ${vTheme.bgClass} space-y-5 transition-all`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center shrink-0">
                <IconComp size={24} className={vTheme.accent} aria-hidden="true" />
              </div>
              <div>
                <span className={`text-[12px] font-medium px-2.5 py-0.5 rounded-full ${vTheme.badgeClass}`}>
                  {vTheme.badgeText}
                </span>
                <h1 className={`text-2xl sm:text-3xl font-semibold font-serif tracking-tight mt-1 ${vTheme.titleColor}`}>
                  {COPY.result.verdictLabels[verdict]?.title || "Check Complete"}
                </h1>
              </div>
            </div>

            <span className="hidden sm:inline-block text-[13px] px-2.5 py-1 rounded border border-[var(--color-border)] text-[var(--color-text-muted)] bg-[var(--color-surface)]">
              {severityLevel === 'critical' ? 'High Risk' : severityLevel === 'high' ? 'High Risk' : severityLevel === 'medium' ? 'Caution Needed' : 'Low Risk'}
            </span>
          </div>

          {/* 2. THE REASON: One concise sentence explaining the main evidence */}
          <p className="text-[16px] font-medium leading-relaxed pt-2 border-t border-[var(--color-border)] text-[var(--color-text)]">
            {currentResult.reason}
          </p>

          {/* 3. THE NEXT ACTION: What the user should do right now */}
          <div className="p-4 sm:p-5 card-flat space-y-2.5">
            <h2 className="text-[14px] font-semibold text-[var(--color-text)] flex items-center gap-2">
              <CheckCircle2 size={16} className="text-[#8AE3A6] shrink-0" aria-hidden="true" />
              <span>{COPY.result.actionsTitle}</span>
            </h2>
            <ul className="space-y-1.5 text-[14px] text-[var(--color-text-muted)] list-disc list-inside">
              {(currentResult.todo && currentResult.todo.length > 0 ? currentResult.todo : [
                "Do not click any links or download attached files.",
                "Do not share OTPs, passwords, or personal details.",
                "Verify with the real company using their verified phone number."
              ]).map((action, idx) => (
                <li key={idx} className="leading-relaxed">
                  <span className="text-[var(--color-text)]">{action}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Main Action Buttons */}
          <div id="primary-actions" className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => navigate('/check')}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              <RotateCcw size={15} aria-hidden="true" />
              <span>{COPY.result.scanAnotherButton}</span>
            </button>

            <button
              type="button"
              onClick={handleCopySummary}
              className="btn-secondary flex-1 flex items-center justify-center gap-2 text-[14px]"
            >
              {copied ? (
                <>
                  <Check size={15} className="text-emerald-400" aria-hidden="true" />
                  <span>{COPY.result.copiedText}</span>
                </>
              ) : (
                <>
                  <Copy size={15} aria-hidden="true" />
                  <span>{COPY.result.copyButton}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 4. PROGRESSIVE DISCLOSURE: Interactive Evidence Explorer */}
        <div className="space-y-4 pt-2">
          {/* Disclosure Trigger Bar */}
          <button
            type="button"
            onClick={() => setIsEvidenceOpen(!isEvidenceOpen)}
            className="w-full p-4 card-flat flex items-center justify-between text-left transition-all cursor-pointer hover:bg-[var(--color-surface-hover)]"
            aria-expanded={isEvidenceOpen}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--color-surface-hover)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-accent)]">
                <Layers size={16} />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-[var(--color-text)] font-serif">
                  Evidence Explorer
                </h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">
                  {totalWarnings > 0 
                    ? `${totalWarnings} warning sign${totalWarnings === 1 ? '' : 's'} identified across 6 visual tools`
                    : "Inspect message details across 6 visual tools"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[13px] text-[var(--color-text-muted)]">
              <span className="hidden sm:inline">{isEvidenceOpen ? 'Hide Explorer' : 'Open Explorer'}</span>
              {isEvidenceOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </button>

          {/* Expanded Evidence Explorer */}
          {isEvidenceOpen && (
            <div className="space-y-6 pt-1 fade-up-subtle">
              <EvidenceExplorer
                verdict={verdict}
                severityLevel={severityLevel}
                modelScore={currentResult.model_score ?? 0.5}
                modelType={currentResult.model_type || 'Logistic Regression'}
                noticed={currentResult.noticed || []}
                links={currentResult.links || []}
                todo={currentResult.todo || []}
                originalText={originalText}
              />

              {/* Discreet Telemetry */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                  className="text-[13px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <span>{showTechnicalDetails ? '▾ Hide' : '▸ View'} score details</span>
                </button>

                {showTechnicalDetails && (
                  <div className="mt-2 p-3.5 card-flat text-[13px] text-[var(--color-text-muted)] space-y-1.5">
                    <div className="flex justify-between">
                      <span>Check method:</span>
                      <span className="text-[var(--color-text)]">Pattern comparison</span>
                    </div>
                    <div className="flex justify-between">
                      <span>How sure the check is:</span>
                      <span className="text-[var(--color-accent)]">
                        {currentResult.model_score !== undefined ? `${Math.round(currentResult.model_score * 100)}%` : 'Not available'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>External links:</span>
                      <span className="text-emerald-400">Never opened or visited</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Disclaimer */}
        <p className="text-[13px] text-[var(--color-text-muted)] text-center leading-relaxed max-w-xl mx-auto pt-4 border-t border-[var(--color-border)]">
          {COPY.result.disclaimer}
        </p>

      </div>
    </div>
  );
}
