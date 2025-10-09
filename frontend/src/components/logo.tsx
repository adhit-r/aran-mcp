import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'icon' | 'text';
  className?: string;
}

export function Logo({ size = 'md', variant = 'full', className = '' }: LogoProps) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl'
  };

  const icon = (
    <div className={`${sizeClasses[size]} ${className} relative`}>
      {/* Main brutalist square */}
      <div className="absolute inset-0 bg-aran-orange border-2 border-aran-black shadow-brutal"></div>
      
      {/* Overlapping geometric shapes */}
      <div className="absolute top-1 left-1 w-6 h-6 bg-aran-black"></div>
      <div className="absolute top-3 left-3 w-4 h-4 bg-aran-white border border-aran-black"></div>
      
      {/* MCP text overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-display font-black text-aran-white text-xs leading-none">MCP</span>
      </div>
      
      {/* Sentinel indicator */}
      <div className="absolute bottom-1 right-1 w-2 h-2 bg-aran-black"></div>
    </div>
  );

  const text = (
    <span className={`font-display font-bold text-aran-black ${textSizes[size]} ${className}`}>
      MCP Sentinel
    </span>
  );

  if (variant === 'icon') {
    return icon;
  }

  if (variant === 'text') {
    return text;
  }

  return (
    <div className="flex items-center gap-2">
      {icon}
      {text}
    </div>
  );
}

// Alternative minimalist logo
export function LogoMinimal({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  };

  return (
    <div className={`${sizeClasses[size]} ${className} flex items-center justify-center bg-aran-orange border-2 border-aran-black shadow-brutal`}>
      <span className="font-display font-black text-aran-white text-xs">M</span>
    </div>
  );
}

// Ultra-brutalist geometric logo
export function LogoUltraBrutal({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  };

  return (
    <div className={`${sizeClasses[size]} ${className} relative`}>
      {/* Main brutalist square */}
      <div className="absolute inset-0 bg-aran-orange border-2 border-aran-black shadow-brutal"></div>
      
      {/* Layered brutalist shapes */}
      <div className="absolute top-0 left-0 w-3/4 h-3/4 bg-aran-black"></div>
      <div className="absolute top-1 left-1 w-1/2 h-1/2 bg-aran-white border border-aran-black"></div>
      <div className="absolute top-2 left-2 w-1/4 h-1/4 bg-aran-black"></div>
      
      {/* MCP text with ultra-bold styling */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-display font-black text-aran-white text-xs leading-none tracking-tighter">MCP</span>
      </div>
      
      {/* Corner indicators */}
      <div className="absolute top-0 right-0 w-1 h-1 bg-aran-black"></div>
      <div className="absolute bottom-0 left-0 w-1 h-1 bg-aran-black"></div>
    </div>
  );
}

// Brutalist geometric logo
export function LogoBrutal({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  };

  return (
    <div className={`${sizeClasses[size]} ${className} relative`}>
      {/* Main brutalist square with multiple layers */}
      <div className="absolute inset-0 bg-aran-orange border-2 border-aran-black shadow-brutal"></div>
      
      {/* Layered geometric shapes for depth */}
      <div className="absolute top-1 left-1 w-6 h-6 bg-aran-black border border-aran-black"></div>
      <div className="absolute top-2 left-2 w-4 h-4 bg-aran-white border border-aran-black"></div>
      <div className="absolute top-3 left-3 w-2 h-2 bg-aran-black"></div>
      
      {/* MCP text with brutalist styling */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-display font-black text-aran-white text-xs leading-none tracking-tight">MCP</span>
      </div>
      
      {/* Sentinel corner indicator */}
      <div className="absolute bottom-0 right-0 w-2 h-2 bg-aran-black border-l border-t border-aran-black"></div>
    </div>
  );
}
