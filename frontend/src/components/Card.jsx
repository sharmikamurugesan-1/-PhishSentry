import React from 'react';

export default function Card({ children, className = '', highlight = null, ...props }) {
  let borderClass = 'border-[var(--card-border)]';
  let bgClass = 'bg-[var(--card-bg)]';

  if (highlight === 'safe') {
    borderClass = 'border-[var(--color-safe-border)]';
    bgClass = 'bg-[var(--color-safe-bg)]';
  } else if (highlight === 'caution') {
    borderClass = 'border-[var(--color-caution-border)]';
    bgClass = 'bg-[var(--color-caution-bg)]';
  } else if (highlight === 'scam') {
    borderClass = 'border-[var(--color-scam-border)]';
    bgClass = 'bg-[var(--color-scam-bg)]';
  }

  return (
    <div
      className={`card-theme ${bgClass} border ${borderClass} transition-colors ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
