import React from 'react';
import logoImg from '../../assets/cote-ai-logo-transparente.png';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'light' | 'dark';
}

const Logo: React.FC<LogoProps> = ({ className = '', size = 'md' }) => {
  const sizeClasses = {
    sm: 'h-8 max-h-8',
    md: 'h-10 sm:h-11 max-h-11',
    lg: 'h-12 sm:h-14 max-h-14',
    xl: 'h-16 sm:h-20 max-h-20',
  };

  return (
    <div className={`inline-flex items-center justify-center select-none bg-transparent ${className}`}>
      <img
        src={logoImg}
        alt="Cote AI"
        className={`w-auto object-contain max-h-full ${sizeClasses[size] || 'h-10 sm:h-11'}`}
        style={{
          backgroundColor: 'transparent',
        }}
      />
    </div>
  );
};

export default Logo;
