import React from 'react';

interface LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
  glowing?: boolean;
  animate?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  className = '',
  onClick,
  glowing = false,
  animate = false,
}) => {
  const sizeMap = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20',
  };

  return (
    <div
      onClick={onClick}
      className={`relative inline-flex items-center justify-center select-none transition-transform duration-200 ${
        onClick ? 'cursor-pointer hover:scale-105 active:scale-95' : ''
      } ${sizeMap[size]} ${className}`}
      title="Colaus Logo"
    >
      {/* Optional glow behind the logo */}
      {glowing && (
        <div
          className={`absolute inset-0 rounded-full bg-cyan-500/20 blur-lg pointer-events-none ${
            animate ? 'animate-pulse' : ''
          }`}
        />
      )}

      {/* The logo image — transparent PNG */}
      <img
        src="/tejas-logo-transparent.png"
        alt="Colaus Logo"
        className="w-full h-full object-contain relative z-10"
        draggable={false}
      />
    </div>
  );
};