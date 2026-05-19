import React from 'react';
import { useAssociation } from '../../contexts/AssociationContext';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'light' | 'dark';
}

const Logo: React.FC<LogoProps> = ({ className = '' }) => {
  const { associationData } = useAssociation();

  const fullName = (associationData?.nome || 'Cote AI').trim();
  const words = fullName.split(' ');
  const firstWord = words[0] || '';
  const restWords = words.slice(1).join(' ');

  // Accent fixed to system blue
  const accentColor = '#3b82f6';
  const accentLight = '#60a5fa';

  return (
    <div
      className={`inline-flex items-baseline select-none ${className}`}
      aria-label={fullName}
    >
      {/* First word — white luminous glow */}
      <span
        style={{
          fontFamily: "'Montserrat', 'Outfit', sans-serif",
          fontWeight: 800,
          fontSize: '1.05rem',
          letterSpacing: '0.04em',
          lineHeight: 1,
          color: '#ffffff',
          textShadow: `
            0 0 8px  rgba(255, 255, 255, 0.95),
            0 0 20px rgba(255, 255, 255, 0.60),
            0 0 40px rgba(255, 255, 255, 0.25)
          `,
        }}
      >
        {firstWord.toUpperCase()}
      </span>

      {/* Second word — blue gradient + electric glow */}
      {restWords && (
        <>
          {/* Spacer */}
          <span style={{ display: 'inline-block', width: '0.45em' }} aria-hidden="true" />

          <span
            style={{
              fontFamily: "'Montserrat', 'Outfit', sans-serif",
              fontWeight: 800,
              fontSize: '1.05rem',
              letterSpacing: '0.04em',
              lineHeight: 1,
              background: `linear-gradient(135deg, ${accentColor} 0%, ${accentLight} 60%, #93c5fd 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              filter: `drop-shadow(0 0 8px ${accentColor}cc) drop-shadow(0 0 20px ${accentColor}80)`,
            }}
          >
            {restWords.toUpperCase()}
          </span>
        </>
      )}
    </div>
  );
};

export default Logo;
