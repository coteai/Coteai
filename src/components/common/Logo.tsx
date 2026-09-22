import React from 'react';
import logoImg from '../../assets/cote-ai-logo-transparente.png';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'light' | 'dark';
}

const Logo: React.FC<LogoProps> = ({ className = '', size = 'md' }) => {
  const sizeClasses = {
    sm: 'h-6 max-h-6',
    md: 'h-8 sm:h-9 max-h-9',
    lg: 'h-10 sm:h-11 max-h-11',
    xl: 'h-14 sm:h-16 max-h-16',
  };

  return (
    <div className={`inline-flex items-center justify-center select-none bg-transparent ${className}`}>
      <img
        src={logoImg}
        alt="Cote AI"
        className={`w-auto object-contain max-h-full ${sizeClasses[size] || 'h-8 sm:h-9'}`}
        style={{
          backgroundColor: 'transparent',
        }}
      />
    </div>
  );
};

export default Logo;
