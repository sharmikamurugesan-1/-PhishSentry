import React, { useState } from 'react';
import { ShieldCheck, Lock, EyeOff, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { COPY } from '../copy';

export default function PrivacyScreen() {
  const [openIndex, setOpenIndex] = useState(0);

  const toggleAccordion = (idx) => {
    setOpenIndex(openIndex === idx ? -1 : idx);
  };

  const icons = [Lock, EyeOff, ShieldCheck, AlertTriangle];

  return (
    <div className="section-dark py-12 sm:py-20 text-left min-h-[calc(100vh-120px)]" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="content-container max-w-3xl space-y-10">
        
        {/* Header */}
        <div className="space-y-3 pb-8" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            <Lock size={15} style={{ color: 'var(--color-accent)' }} aria-hidden="true" />
            <span>Architecture & trust</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight" style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-text)', lineHeight: 1.05 }}>
            {COPY.privacy.title}
          </h1>
          <p className="text-base sm:text-lg max-w-xl leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
            {COPY.privacy.subtitle}
          </p>
        </div>

        {/* Core Principles Accordion */}
        <div className="space-y-3">
          {COPY.privacy.principles.map((p, idx) => {
            const Icon = icons[idx] || Lock;
            const isOpen = openIndex === idx;

            return (
              <div
                key={idx}
                className="card-flat overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggleAccordion(idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 cursor-pointer hover:opacity-90 transition-opacity"
                  aria-expanded={isOpen}
                >
                  <div className="flex items-center gap-3.5">
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-accent)' }}
                    >
                      <Icon size={16} aria-hidden="true" />
                    </div>
                    <h2 className="text-base font-semibold" style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-text)' }}>
                      {p.title}
                    </h2>
                  </div>

                  {isOpen ? (
                    <ChevronUp size={16} style={{ color: 'var(--color-text-muted)' }} className="shrink-0" />
                  ) : (
                    <ChevronDown size={16} style={{ color: 'var(--color-text-muted)' }} className="shrink-0" />
                  )}
                </button>

                {isOpen && (
                  <div 
                    className="px-5 pb-5 pt-2 text-sm leading-relaxed"
                    style={{ borderTop: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}
                  >
                    <p>{p.description}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Verification Checklist */}
        <div className="card-flat p-6 sm:p-8 space-y-4">
          <h3 className="text-base font-semibold" style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-text)' }}>
            System privacy rules
          </h3>
          <ul className="space-y-3 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            <li className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#10B981' }} />
              <span>Links are never opened or visited online.</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#10B981' }} />
              <span>Messages are processed only in memory and never saved to a database.</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#10B981' }} />
              <span>No user accounts, advertising trackers, or persistent cookies.</span>
            </li>
          </ul>
        </div>

      </div>
    </div>
  );
}
