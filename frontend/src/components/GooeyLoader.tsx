import React from 'react';
import { motion } from 'framer-motion';

const GooeyLoader: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const dimensions = {
    sm:  { container: 80,  ball: 20, distance: 24 },
    md:  { container: 120, ball: 30, distance: 36 },
    lg:  { container: 200, ball: 50, distance: 58 },
  }[size];

  const coreDot    = dimensions.ball;
  const orbitDot   = dimensions.ball * 0.55;
  const orbitR     = dimensions.distance;
  const numDots    = 3;

  return (
    <div className="flex items-center justify-center w-full h-full">
      <div
        className="relative"
        style={{ width: dimensions.container, height: dimensions.container }}
      >
        {/* Gooey SVG filter */}
        <svg style={{ position: 'absolute', width: 0, height: 0 }}>
          <defs>
            <filter id="goo">
              <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
              <feColorMatrix
                in="blur"
                mode="matrix"
                values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10"
                result="goo"
              />
              <feComposite in="SourceGraphic" in2="goo" operator="atop" />
            </filter>
          </defs>
        </svg>

        {/* Gooey container */}
        <div
          style={{
            width: '100%',
            height: '100%',
            filter: 'url(#goo)',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Core dot */}
          <motion.div
            style={{
              width: coreDot,
              height: coreDot,
              borderRadius: '50%',
              backgroundColor: '#A32D2D',
              position: 'absolute',
            }}
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* Orbiting dots — spaced evenly, rotate around center */}
          {Array.from({ length: numDots }).map((_, i) => {
            const baseAngle = (i * 360) / numDots; // degrees
            return (
              <motion.div
                key={i}
                style={{
                  width: orbitDot,
                  height: orbitDot,
                  borderRadius: '50%',
                  backgroundColor: '#E24B4A',
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  marginTop: -(orbitDot / 2),
                  marginLeft: -(orbitDot / 2),
                }}
                animate={{
                  rotate: [baseAngle, baseAngle + 360],
                  x: Array.from({ length: 37 }).map((_, t) => {
                    const angle = ((baseAngle + (t / 36) * 360) * Math.PI) / 180;
                    return Math.cos(angle) * orbitR;
                  }),
                  y: Array.from({ length: 37 }).map((_, t) => {
                    const angle = ((baseAngle + (t / 36) * 360) * Math.PI) / 180;
                    return Math.sin(angle) * orbitR;
                  }),
                  scale: [1, 0.75, 1, 0.75, 1],
                }}
                transition={{
                  duration: 1.8,
                  repeat: Infinity,
                  ease: 'linear',
                  delay: i * (1.8 / numDots),
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default GooeyLoader;