import { useAssociation } from '../../contexts/AssociationContext';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'light' | 'dark';
}

const Logo: React.FC<LogoProps> = ({ 
  className = '',
}) => {
  const { theme } = useAssociation();

  return (
    <div className={`inline-flex items-center justify-center relative w-full ${className}`}>
      {/* Brilho de fundo suave e centralizado */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-10 bg-white/20 blur-[25px] rounded-full pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-16 blur-[40px] rounded-full pointer-events-none" style={{ backgroundColor: `${theme.colors.glowHex}1A` }} />
      
      {/* Fonte 'Outfit' (premium-title) com tracking ajustado para igualar ao VISÃO GLOBAL */}
      <span className="relative font-syne font-black text-[1.8rem] uppercase tracking-tighter text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]"
            style={{ textShadow: '0 0 20px rgba(255,255,255,0.3)' }}>
        Cote AI
      </span>
    </div>
  );
};

export default Logo;
