import React, { useRef, useState, type MouseEvent, type ReactNode } from 'react';

export interface TiltedCardProps {
  children: ReactNode;
  className?: string;
  maxTilt?: number; // max tilt angle in degrees (default 12)
  scale?: number; // scale on hover (default 1.02)
  perspective?: number; // perspective in px (default 1000)
  glare?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export const TiltedCard: React.FC<TiltedCardProps> = ({
  children,
  className = '',
  maxTilt = 10,
  scale = 1.02,
  perspective = 900,
  glare = true,
  onClick,
  style,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50 });

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const rY = ((mouseX - width / 2) / (width / 2)) * maxTilt;
    const rX = -((mouseY - height / 2) / (height / 2)) * maxTilt;

    setRotateX(rX);
    setRotateY(rY);

    if (glare) {
      setGlarePos({
        x: (mouseX / width) * 100,
        y: (mouseY / height) * 100,
      });
    }
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotateX(0);
    setRotateY(0);
  };

  return (
    <div
      style={{
        perspective: `${perspective}px`,
        display: 'inline-block',
        width: '100%',
      }}
    >
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={onClick}
        className={className}
        style={{
          transformStyle: 'preserve-3d',
          transform: isHovered
            ? `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(${scale}, ${scale}, 1)`
            : 'rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
          transition: isHovered ? 'transform 0.1s ease-out' : 'transform 0.45s cubic-bezier(0.25, 1, 0.5, 1)',
          position: 'relative',
          borderRadius: 16,
          ...style,
        }}
      >
        {children}
        {glare && isHovered && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 'inherit',
              pointerEvents: 'none',
              background: `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0) 70%)`,
              zIndex: 10,
            }}
          />
        )}
      </div>
    </div>
  );
};
