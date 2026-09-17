import React, { useRef, useState, type MouseEvent, type ReactNode } from 'react';

interface Spark {
  id: number;
  x: number;
  y: number;
  angle: number;
}

export interface ClickSparkProps {
  children: ReactNode;
  sparkColor?: string;
  sparkCount?: number;
  sparkSize?: number;
  className?: string;
}

export const ClickSpark: React.FC<ClickSparkProps> = ({
  children,
  sparkColor = 'var(--leaf, #238d5b)',
  sparkCount = 8,
  sparkSize = 12,
  className = '',
}) => {
  const [sparks, setSparks] = useState<Spark[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newSparks: Spark[] = Array.from({ length: sparkCount }).map((_, i) => ({
      id: Date.now() + i,
      x,
      y,
      angle: (i * 360) / sparkCount,
    }));

    setSparks((prev) => [...prev, ...newSparks]);

    setTimeout(() => {
      setSparks((prev) => prev.filter((s) => !newSparks.some((ns) => ns.id === s.id)));
    }, 600);
  };

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      className={className}
      style={{ position: 'relative', overflow: 'hidden' }}
    >
      {children}
      {sparks.map((spark) => (
        <span
          key={spark.id}
          style={{
            position: 'absolute',
            left: spark.x,
            top: spark.y,
            width: 3,
            height: sparkSize,
            backgroundColor: sparkColor,
            borderRadius: 2,
            transformOrigin: 'bottom center',
            transform: `rotate(${spark.angle}deg) translateY(-${sparkSize * 1.5}px)`,
            opacity: 0,
            animation: 'spark-fly 0.5s ease-out forwards',
            pointerEvents: 'none',
            zIndex: 99,
          }}
        />
      ))}
      <style>{`
        @keyframes spark-fly {
          0% {
            opacity: 1;
            transform: rotate(var(--angle, 0deg)) translateY(0px) scaleY(1);
          }
          100% {
            opacity: 0;
            transform: rotate(var(--angle, 0deg)) translateY(-24px) scaleY(0.4);
          }
        }
      `}</style>
    </div>
  );
};
