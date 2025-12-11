'use client';

import { useEffect, useState } from 'react';

interface CircularProgressBadgeProps {
  current: number;
  total: number;
  size?: number;
}

/**
 * Circular progress badge showing count in center
 * - Clean, prominent display
 * - Animated progress ring
 * - Pulse on value change
 */
export default function CircularProgressBadge({
  current,
  total,
  size = 140,
}: CircularProgressBadgeProps) {
  const percentage = total > 0 ? (current / total) * 100 : 0;
  const [animate, setAnimate] = useState(false);

  // Trigger animation when current changes
  useEffect(() => {
    setAnimate(true);
    const timer = setTimeout(() => setAnimate(false), 300);
    return () => clearTimeout(timer);
  }, [current]);

  // SVG circle calculations
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  const center = size / 2;

  return (
    <div className="flex justify-center">
      <div
        className={`relative transition-transform duration-300 ${animate ? 'scale-105' : 'scale-100'}`}
        style={{ width: size, height: size }}
      >
        {/* SVG Progress Ring */}
        <svg
          className="w-full h-full -rotate-90"
          viewBox={`0 0 ${size} ${size}`}
        >
          {/* Background circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            stroke="#e2e8f0"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Progress circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            stroke="hsl(var(--primary))"
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-500 ease-out"
          />
        </svg>

        {/* Count in center */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold text-slate-900 tabular-nums">
            {current}
          </span>
          <span className="text-sm text-slate-500 font-medium">
            / {total}
          </span>
        </div>
      </div>
    </div>
  );
}
