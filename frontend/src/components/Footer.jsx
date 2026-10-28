import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Lock } from 'lucide-react';
import { COPY } from '../copy';

export default function Footer() {
  const [isBigText, setIsBigText] = useState(() => {
    return localStorage.getItem('phishshift_big_text') === 'true';
  });

  useEffect(() => {
    if (isBigText) {
      document.documentElement.classList.add('big-text');
    } else {
      document.documentElement.classList.remove('big-text');
    }
    localStorage.setItem('phishshift_big_text', isBigText.toString());
  }, [isBigText]);

  const toggleBigText = () => setIsBigText((prev) => !prev);

  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] py-12 transition-colors">
      <div className="content-container space-y-8">
        
        {/* Main Footer Row */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          
          {/* Brand & Purpose */}
          <div className="md:col-span-5 space-y-3">
            <Link to="/" className="inline-flex items-center gap-2.5 group">
              <div className="w-7 h-7 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] group-hover:border-[var(--color-accent)] transition-colors">
                <ShieldCheck size={16} aria-hidden="true" />
              </div>
              <span className="font-bold text-lg text-[var(--color-text)] tracking-tight font-serif">
                {COPY.brand.name}
              </span>
            </Link>
            <p className="text-[14px] text-[var(--color-text-muted)] leading-relaxed max-w-sm">
              Tells ordinary people whether a message is safe and what to do next.
            </p>
          </div>

          {/* Section 1: Explore */}
          <div className="md:col-span-3 space-y-2.5">
            <h3 className="text-[13px] font-medium text-[var(--color-text-muted)]">
              Explore
            </h3>
            <ul className="space-y-2 text-[14px]">
              <li>
                <Link to="/" className="text-[var(--color-text)] hover:text-[var(--color-accent)] transition-colors">
                  Overview
                </Link>
              </li>
              <li>
                <Link to="/check" className="text-[var(--color-text)] hover:text-[var(--color-accent)] transition-colors">
                  Check a message
                </Link>
              </li>
              <li>
                <Link to="/email-protection" className="text-[var(--color-text)] hover:text-[var(--color-accent)] transition-colors">
                  Email protection
                </Link>
              </li>
            </ul>
          </div>

          {/* Section 2: Help & Trust */}
          <div className="md:col-span-4 space-y-2.5">
            <h3 className="text-[13px] font-medium text-[var(--color-text-muted)]">
              Help & Trust
            </h3>
            <ul className="space-y-2 text-[14px]">
              <li>
                <Link to="/help" className="text-[var(--color-text)] hover:text-[var(--color-accent)] transition-colors">
                  Already clicked?
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-[var(--color-text)] hover:text-[var(--color-accent)] transition-colors">
                  Privacy & architecture
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-[var(--color-text)] hover:text-[var(--color-accent)] transition-colors">
                  How your data is handled
                </Link>
              </li>
              <li className="pt-1">
                <button
                  type="button"
                  onClick={toggleBigText}
                  className="text-[13px] text-[var(--color-text-muted)] hover:text-[var(--color-accent)] cursor-pointer inline-flex items-center gap-1 transition-colors"
                >
                  <span>Larger text</span>
                  <span className="text-[11px] px-1 py-0.5 rounded border border-[var(--color-border)]">
                    {isBigText ? 'On' : 'Off'}
                  </span>
                </button>
              </li>
            </ul>
          </div>

        </div>

        {/* Subtle Single Divider & Small Closing Line */}
        <div className="pt-6 border-t border-[var(--color-border)] flex flex-col sm:flex-row items-center justify-between gap-3 text-[13px] text-[var(--color-text-muted)]">
          <p>© {new Date().getFullYear()} PhishShift. Plain-English safety advice.</p>
          <div className="flex items-center gap-1.5 text-[13px]">
            <Lock size={12} className="text-[var(--color-accent)]" />
            <span>Links are analyzed strictly as text and never opened.</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
