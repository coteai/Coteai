import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'light' | 'dark';
}

const Logo: React.FC<LogoProps> = ({ className = '' }) => {
  const accentColor = '#3b82f6';
  const accentLight = '#60a5fa';

  return (
    <div
      className={`inline-flex items-baseline select-none ${className}`}
      aria-label="Cote AI"
    >
      {/* COTE — white luminous glow */}
      <span
        style={{
          fontFamily: "'Montserrat', 'Outfit', sans-serif",
          fontWeight: 900,
          fontSize: '1.15rem',
          letterSpacing: '0.06em',
          lineHeight: 1,
          color: '#ffffff',
          textShadow: `
            0 0 8px  rgba(255, 255, 255, 0.95),
            0 0 20px rgba(255, 255, 255, 0.60),
            0 0 45px rgba(255, 255, 255, 0.25)
          `,
        }}
      >
        COTE
      </span>

      {/* Spacer */}
      <span style={{ display: 'inline-block', width: '0.4em' }} aria-hidden="true" />

      {/* AI — blue gradient + electric glow */}
      <span
        style={{
          fontFamily: "'Montserrat', 'Outfit', sans-serif",
          fontWeight: 900,
          fontSize: '1.15rem',
          letterSpacing: '0.06em',
          lineHeight: 1,
          background: `linear-gradient(135deg, ${accentColor} 0%, ${accentLight} 55%, #93c5fd 100%)`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          filter: `drop-shadow(0 0 8px ${accentColor}cc) drop-shadow(0 0 22px ${accentColor}80)`,
        }}
      >
        AI
      </span>
    </div>
  );
};

export default Logo;
