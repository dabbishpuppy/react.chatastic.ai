
import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
}

const Logo: React.FC<LogoProps> = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-3xl',
  };

  return (
    <div className="flex items-center font-bold">
      <div className="bg-black text-white rounded p-1 mr-1">
        <span className={`${sizeClasses[size]}`}>C</span>
      </div>
      <span className={`${sizeClasses[size]}`}>SaasBase</span>
    </div>
  );
};

export default Logo;
