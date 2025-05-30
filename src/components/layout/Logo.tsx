
import React from 'react';
import { Link } from 'react-router-dom';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  linkToHome?: boolean;
}

const Logo: React.FC<LogoProps> = ({ size = 'md', linkToHome = false }) => {
  const sizeClasses = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-3xl',
  };

  const LogoContent = (
    <div className="flex items-center font-bold">
      <div className="bg-black text-white rounded p-1 mr-1">
        <span className={`${sizeClasses[size]}`}>C</span>
      </div>
      <span className={`${sizeClasses[size]}`}>Wonderwave</span>
    </div>
  );

  // Always link to dashboard instead of home
  return <Link to="/dashboard">{LogoContent}</Link>;
};

export default Logo;
