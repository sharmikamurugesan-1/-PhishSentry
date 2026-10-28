import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ArrowRight, 
  Lock, 
  AlertTriangle,
  Globe,
  EyeOff
} from 'lucide-react';
import { COPY } from '../copy';
import HeroSecurityVisual from '../components/HeroSecurityVisual';

export default function HomeScreen() {
  const navigate = useNavigate();
  const pillarIcons = [AlertTriangle, Globe, EyeOff];

  return (
    <div className="space-y-0 text-left bg-[var(--color-bg)]">
      {/* 1. HERO SECTION */}
      <section className="section-spacious border-b border-[var(--color-border)] relative bg-[var(--color-bg)]">
        <div className="content-container grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          
          {/* Left Column: Calm, clean editorial content */}
          <div className="lg:col-span-6 space-y-6 fade-up-subtle">
            {/* Plain sentence-case sans label (13-14px) */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[13px] text-[var(--color-text-muted)] font-normal">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]" />
              <span>{COPY.home.heroKicker}</span>
            </div>

            {/* Big Editorial Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-semibold text-[var(--color-text)] tracking-tight leading-[1.05] font-serif">
              Is that message<br />
              genuine, or is it a<br />
              trap?
            </h1>

            {/* Minimized Supporting Sentence with ~60ch width */}
            <p className="text-[16px] sm:text-[17px] text-[var(--color-text-muted)] leading-[1.6] max-w-[60ch]">
              {COPY.home.heroSubtitle}
            </p>

            {/* Flat Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-1">
              <button
                type="button"
                onClick={() => navigate('/check')}
                className="btn-primary"
              >
                <span>{COPY.home.ctaScan}</span>
                <ArrowRight size={16} className="ml-2" aria-hidden="true" />
              </button>

              <Link
                to="/help"
                className="btn-secondary"
              >
                <span>{COPY.home.ctaHelp}</span>
              </Link>
            </div>

            {/* Subtle Trust Line */}
            <div className="flex items-center gap-2 text-[13px] text-[var(--color-text-muted)] pt-1">
              <Lock size={13} className="text-[var(--color-accent)] shrink-0" aria-hidden="true" />
              <span>{COPY.home.trustNote}</span>
            </div>
          </div>

          {/* Right Column: Calmer visual blending into background */}
          <div className="lg:col-span-6 fade-up-subtle">
            <HeroSecurityVisual />
          </div>
        </div>
      </section>

      {/* 2. THREE SPACIOUS PILLARS SECTION */}
      <section className="section-spacious border-b border-[var(--color-border)] bg-[var(--color-bg)]">
        <div className="content-container space-y-12">
          <div className="max-w-xl space-y-2">
            <span className="text-[13px] text-[var(--color-text-muted)] font-normal">
              Built for everyday communication
            </span>
            <h2 className="text-2xl sm:text-3xl font-semibold text-[var(--color-text)] font-serif tracking-tight leading-[1.1]">
              {COPY.home.pillarsTitle}
            </h2>
            <p className="text-[15px] sm:text-[16px] text-[var(--color-text-muted)] leading-relaxed max-w-[60ch]">
              {COPY.home.pillarsSubtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {COPY.home.pillars.map((pillar, idx) => {
              const Icon = pillarIcons[idx] || AlertTriangle;
              return (
                <div
                  key={pillar.id}
                  className="card-flat p-6 space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="w-8 h-8 rounded-lg bg-[var(--color-surface-hover)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-accent)]">
                      <Icon size={16} aria-hidden="true" />
                    </div>
                    <h3 className="text-base font-semibold text-[var(--color-text)] font-serif">
                      {pillar.title}
                    </h3>
                    <p className="text-[14px] text-[var(--color-text-muted)] leading-[1.6]">
                      {pillar.summary}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. FINAL CALL-TO-ACTION SECTION */}
      <section className="section-spacious border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="content-container text-center space-y-6">
          <h2 className="text-2xl sm:text-3xl font-semibold text-[var(--color-text)] font-serif tracking-tight leading-[1.1]">
            {COPY.home.finalCtaTitle}
          </h2>
          <p className="text-[15px] sm:text-[16px] text-[var(--color-text-muted)] max-w-lg mx-auto leading-relaxed">
            {COPY.home.finalCtaSubtitle}
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => navigate('/check')}
              className="btn-primary px-8 py-3.5 text-base"
            >
              <span>{COPY.home.finalCtaButton}</span>
              <ArrowRight size={17} className="ml-2" aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
