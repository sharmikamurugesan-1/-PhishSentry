import React, { useState } from 'react';
import { 
  PhoneCall, 
  ExternalLink, 
  AlertCircle,
  Clock,
  HelpCircle,
  CheckCircle2
} from 'lucide-react';
import { COPY } from '../copy';

export default function HelpScreen() {
  const [selectedScenarioId, setSelectedScenarioId] = useState('funds');

  const scenario = COPY.help.scenarios.find(s => s.id === selectedScenarioId) || COPY.help.scenarios[0];

  return (
    <div className="section-dark py-12 sm:py-20 text-left min-h-[calc(100vh-120px)]" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="content-container max-w-3xl space-y-10">
        
        {/* Header */}
        <div className="space-y-3 pb-8" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            <HelpCircle size={15} style={{ color: 'var(--color-accent)' }} aria-hidden="true" />
            <span>Immediate guidance</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight" style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-text)', lineHeight: 1.05 }}>
            {COPY.help.title}
          </h1>
          <p className="text-base sm:text-lg max-w-xl leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
            {COPY.help.subtitle}
          </p>
        </div>

        {/* Priority 1930 Callout */}
        <div className="p-6 rounded-xl border space-y-4" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'rgba(180, 83, 9, 0.4)' }}>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium px-2.5 py-1 rounded" style={{ backgroundColor: '#B45309', color: '#FFFFFF' }}>
              Time sensitive
            </span>
            <span className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>
              Acting early can help stop transfers
            </span>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl sm:text-2xl font-semibold" style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-text)' }}>
              Dial 1930 within 2 hours if you sent money to a scammer
            </h2>
            <p className="text-sm leading-relaxed max-w-2xl" style={{ color: 'var(--color-text-muted)' }}>
              The Indian National Cyber Crime Helpline coordinates directly with banks to freeze fund transfers before scammers can withdraw them.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <a
              href="tel:1930"
              className="btn-primary inline-flex items-center gap-2 px-4 py-2.5 text-sm"
            >
              <PhoneCall size={15} aria-hidden="true" />
              <span>Call Helpline 1930</span>
            </a>
            <a
              href="https://cybercrime.gov.in"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary inline-flex items-center gap-1.5 px-4 py-2.5 text-sm"
            >
              <span>Visit cybercrime.gov.in</span>
              <ExternalLink size={13} aria-hidden="true" />
            </a>
          </div>
        </div>

        {/* Situation Selector */}
        <div className="space-y-3">
          <span className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
            Select what happened
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {COPY.help.scenarios.map((sc) => {
              const isSelected = selectedScenarioId === sc.id;
              return (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => setSelectedScenarioId(sc.id)}
                  className="card-flat p-4 text-left cursor-pointer flex flex-col justify-between transition-colors"
                  style={{
                    borderColor: isSelected ? 'var(--color-accent)' : 'var(--color-border)',
                    backgroundColor: isSelected ? 'var(--color-surface)' : 'var(--color-bg)',
                    outline: isSelected ? '1px solid var(--color-accent)' : 'none'
                  }}
                >
                  <span className="text-xs font-medium pb-2 block" style={{ color: 'var(--color-accent)' }}>
                    {sc.urgency}
                  </span>
                  <h3 className="text-sm sm:text-base font-semibold" style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-text)' }}>
                    {sc.label}
                  </h3>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Situation Steps */}
        <div className="card-flat p-6 sm:p-8 space-y-6">
          <div className="space-y-1.5 pb-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <h3 className="text-lg sm:text-xl font-semibold" style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-text)' }}>
              {scenario.label}
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
              {scenario.summary}
            </p>
          </div>

          <div className="space-y-3">
            {scenario.actions.map((act, idx) => (
              <div 
                key={idx} 
                className="flex items-start gap-4 p-4 rounded-lg border"
                style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)' }}
              >
                <span 
                  className="w-6 h-6 rounded flex items-center justify-center shrink-0 mt-0.5 text-xs font-semibold"
                  style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-accent)', border: '1px solid var(--color-border)' }}
                >
                  {idx + 1}
                </span>
                <div className="space-y-1 flex-1">
                  <h4 className="text-sm sm:text-base font-medium" style={{ color: 'var(--color-text)' }}>
                    {act.highlight}
                  </h4>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                    {act.detail}
                  </p>
                  {act.linkUrl && (
                    <div className="pt-2">
                      <a
                        href={act.linkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm font-medium hover:underline"
                        style={{ color: 'var(--color-accent)' }}
                      >
                        <span>{act.linkLabel}</span>
                        <ExternalLink size={13} aria-hidden="true" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
