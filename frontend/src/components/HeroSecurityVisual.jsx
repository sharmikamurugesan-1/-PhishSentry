import React from 'react';
import heroArtwork from '../assets/hero-shield-artwork.png';

export default function HeroSecurityVisual() {
  return (
    <div className="w-full relative flex flex-col items-center justify-center">
      {/* Artwork with calm saturation and smooth edge dissolving into the background */}
      <div className="relative w-full aspect-[16/10] sm:aspect-[16/9] flex items-center justify-center overflow-hidden">
        <img
          src={heroArtwork}
          alt="Visual representation of secure message verification"
          className="w-full h-full object-cover object-center select-none"
          style={{ filter: 'saturate(0.85) brightness(0.95)' }}
          loading="eager"
        />

        {/* Multi-layered feathering & radial fade to seamlessly dissolve image edges into background */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at center, transparent 35%, var(--color-bg) 92%)'
          }}
        />
        {/* Left edge blend towards text */}
        <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[var(--color-bg)] via-[var(--color-bg)]/70 to-transparent pointer-events-none" />
        {/* Right edge blend */}
        <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[var(--color-bg)] via-[var(--color-bg)]/60 to-transparent pointer-events-none" />
        {/* Top edge blend */}
        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[var(--color-bg)] via-[var(--color-bg)]/70 to-transparent pointer-events-none" />
        {/* Bottom edge blend */}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[var(--color-bg)] via-[var(--color-bg)]/80 to-transparent pointer-events-none" />
      </div>

      {/* Seamless Status Line with exact simple-English phrases (sentence-case sans) */}
      <div className="w-full pt-2 flex items-center justify-between text-[13px] sm:text-[14px] text-[var(--color-text-muted)] font-normal select-none px-2">
        <span className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]" />
          <span>Links are never opened</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-muted)]" />
          <span>Nothing is saved</span>
        </span>
      </div>
    </div>
  );
}
