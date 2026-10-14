import React from 'react';

export const StrataVisual: React.FC = () => {
  return (
    <div className="strata-hero-visual" role="img" aria-label="Geological code strata">
      <div className="strata-line amber" />
      <div className="strata-line violet" />

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', zIndex: 2 }}>
        <span className="strata-badge">STRATUM I: SYNTAX & REPO MAP</span>
        <span style={{ color: 'var(--color-border-bright)' }}>›</span>
        <span className="strata-badge" style={{ borderColor: 'rgba(139, 124, 255, 0.4)', color: 'var(--color-violet-primary)' }}>
          STRATUM II: CAUSAL FORENSICS
        </span>
        <span style={{ color: 'var(--color-border-bright)' }}>›</span>
        <span className="strata-badge" style={{ borderColor: 'rgba(69, 201, 165, 0.4)', color: 'var(--color-teal-primary)' }}>
          STRATUM III: REPAIR VERIFICATION
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', zIndex: 2 }}>
        <span className="trench-badge" style={{ color: 'var(--color-text-muted)' }}>
          TRENCH REF: EX-80F4A7A
        </span>
        <span className="trench-badge" style={{ color: 'var(--color-amber-primary)' }}>
          DEPTH: 5 STRATA
        </span>
      </div>
    </div>
  );
};
