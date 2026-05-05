import React from 'react';
import { motion } from 'framer-motion';

const GooeyLoader: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const dimensions = {
    sm: { container: 80, ball: 20, distance: 20 },
    md: { container: 120, ball: 30, distance: 30 },
    lg: { container: 200, ball: 50, distance: 50 },
  }[size];

  const colors = ["#c0392b", "#1e293b", "#3b82f6"]; // Rose, Slate, Blue

  return (
    <div className="flex items-center justify-center w-full h-full">
      <div className="relative" style={{ width: dimensions.container, height: dimensions.container }}>
        {/* SVG Filter Definition */}
        <svg style={{ position: 'absolute', width: 0, height: 0 }}>
          <defs>
            <filter id="goo">
              <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
              <feColorMatrix 
                in="blur" 
                mode="matrix" 
                values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10" 
                result="goo" 
              />
              <feComposite in="SourceGraphic" in2="goo" operator="atop" />
            </filter>
          </defs>
        </svg>

        {/* The Gooey Container */}
        <div 
          style={{ 
            width: '100%', 
            height: '100%', 
            filter: 'url(#goo)',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {/* Main Central Ball */}
          <motion.div
            style={{
              width: dimensions.ball,
              height: dimensions.ball,
              backgroundColor: colors[0],
              borderRadius: '50%',
              position: 'absolute',
            }}
            animate={{
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />

          {/* Orbiting Balls */}
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              style={{
                width: dimensions.ball * 0.7,
                height: dimensions.ball * 0.7,
                backgroundColor: colors[i % colors.length],
                borderRadius: '50%',
                position: 'absolute',
              }}
              animate={{
                x: [
                  Math.cos((i * 120 * Math.PI) / 180) * dimensions.distance,
                  Math.cos((i * 120 * Math.PI) / 180 + Math.PI) * dimensions.distance,
                  Math.cos((i * 120 * Math.PI) / 180) * dimensions.distance,
                ],
                y: [
                  Math.sin((i * 120 * Math.PI) / 180) * dimensions.distance,
                  Math.sin((i * 120 * Math.PI) / 180 + Math.PI) * dimensions.distance,
                  Math.sin((i * 120 * Math.PI) / 180) * dimensions.distance,
                ],
                scale: [1, 0.8, 1],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.2,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default GooeyLoader;
