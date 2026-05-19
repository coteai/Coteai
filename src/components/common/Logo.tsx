import React from 'react';
import { useAssociation } from '../../contexts/AssociationContext';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'light' | 'dark';
}

const Logo: React.FC<LogoProps> = ({ className = '' }) => {
  const { theme } = useAssociation();

  return (
    <div className={`inline-flex items-center justify-center relative w-full overflow-hidden mix-blend-lighten ${className}`}>
      <img
        src="/coteai_logo_sidebar.png"
        alt="Cote AI"
        className="w-auto object-contain scale-110"
        style={{ height: '52px', maxWidth: '180px', filter: 'contrast(1.2) brightness(1.1)' }}
        draggable={false}
      />
    </div>
  );
};

export default Logo;
