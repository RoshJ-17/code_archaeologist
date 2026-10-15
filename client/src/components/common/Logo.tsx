import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 32, className = '' }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      width={size}
      height={size}
      fill="none"
      className={className}
      aria-label="Code Archaeologist Emblem"
    >
      {/* Background Reticle */}
      <circle cx="22" cy="22" r="18" stroke="#BDCEBA" strokeWidth="1.5" strokeDasharray="3 3" />
      <circle cx="22" cy="22" r="14" stroke="#D3DED0" strokeWidth="1" />

      {/* Code Bracket Motif Left */}
      <path
        d="M 8 16 L 4 22 L 8 28"
        stroke="#397A47"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Code Bracket Motif Right */}
      <path
        d="M 36 16 L 40 22 L 36 28"
        stroke="#397A47"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Magnifying Glass Outer Rim */}
      <circle cx="22" cy="22" r="11" stroke="#397A47" strokeWidth="2.5" fill="#FFFFFF" />

      {/* Geological Excavation Strata (Layers) */}
      <path d="M 14 18 Q 22 17 30 19" stroke="#718574" strokeWidth="1.8" strokeLinecap="round" opacity="0.9" />
      <path d="M 13 22 Q 22 24 31 22" stroke="#397A47" strokeWidth="1.8" strokeLinecap="round" opacity="0.85" />
      <path d="M 15 26 Q 22 25 29 27" stroke="#718574" strokeWidth="1.8" strokeLinecap="round" opacity="0.9" />

      {/* Forensic Reticle Center */}
      <circle cx="22" cy="22" r="1.5" fill="#397A47" />

      {/* Excavator Tool Handle */}
      <path d="M 30 30 L 42 42" stroke="#397A47" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M 36 36 L 43 43" stroke="#718574" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
};
