import React, { useCallback, useEffect, useRef } from 'react';
import { useInView, useMotionValue, useSpring } from 'framer-motion';

export interface CountUpProps {
  to: number;
  from?: number;
  direction?: 'up' | 'down';
  delay?: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  separator?: string;
}

export const CountUp: React.FC<CountUpProps> = ({
  to,
  from = 0,
  delay = 0,
  duration = 1.6,
  className = '',
  prefix = '',
  suffix = '',
  decimals = 0,
  separator = ',',
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(from);

  const damping = 20 + 40 * (1 / Math.max(duration, 0.5));
  const stiffness = 100 * (1 / Math.max(duration, 0.5));

  const springValue = useSpring(motionValue, {
    damping,
    stiffness,
  });

  const isInView = useInView(ref, { once: true, margin: '0px' });

  const formatNumber = useCallback(
    (num: number) => {
      const fixed = num.toFixed(decimals);
      const parts = fixed.split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, separator);
      return `${prefix}${parts.join('.')}${suffix}`;
    },
    [decimals, prefix, separator, suffix],
  );

  useEffect(() => {
    if (isInView) {
      const timer = setTimeout(() => {
        motionValue.set(to);
      }, delay * 1000);
      return () => clearTimeout(timer);
    }
  }, [isInView, motionValue, to, delay]);

  useEffect(() => {
    const unsubscribe = springValue.on('change', (latest) => {
      if (ref.current) {
        ref.current.textContent = formatNumber(latest);
      }
    });
    return () => unsubscribe();
  }, [springValue, formatNumber]);

  return <span ref={ref} className={className}>{formatNumber(from)}</span>;
};
