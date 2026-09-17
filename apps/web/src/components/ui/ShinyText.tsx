import React, { type CSSProperties, type ReactNode } from 'react';
import './shiny.css';

export interface ShinyTextProps {
  children: ReactNode;
  speed?: number; // in seconds
  className?: string;
  style?: CSSProperties;
}

export const ShinyText: React.FC<ShinyTextProps> = ({
  children,
  speed = 4,
  className = '',
  style,
}) => {
  return (
    <span
      className={`shiny-text ${className}`}
      style={{
        '--shine-speed': `${speed}s`,
        ...style,
      } as CSSProperties}
    >
      {children}
    </span>
  );
};
